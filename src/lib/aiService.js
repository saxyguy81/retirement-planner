/**
 * AI Service - Handles communication with LLM providers
 *
 * Supports:
 * - Direct API keys (Anthropic, OpenAI)
 * - OpenRouter (proxy for multiple models)
 * - Custom endpoints (LM Studio, Ollama, etc.)
 */

// Tool definitions for the AI agent
export const AGENT_TOOLS = [
  {
    name: 'create_scenario',
    description: 'Create a new retirement scenario with specified parameters',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the scenario' },
        overrides: {
          type: 'object',
          description: 'Parameter overrides (rothConversions, expenses, etc.)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'run_projection',
    description: 'Run retirement projections with current or custom parameters',
    parameters: {
      type: 'object',
      properties: {
        overrides: { type: 'object', description: 'Optional parameter overrides' },
      },
    },
  },
  {
    name: 'get_current_state',
    description: 'Get current retirement plan parameters, projections, and summary',
    parameters: {
      type: 'object',
      properties: {
        include: {
          type: 'array',
          items: { type: 'string', enum: ['params', 'projections', 'summary', 'scenarios'] },
          description: 'What data to include',
        },
      },
    },
  },
  {
    name: 'calculate',
    description: 'Perform a calculation using JavaScript',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'JavaScript expression to evaluate' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'compare_scenarios',
    description: 'Compare multiple scenarios and summarize differences',
    parameters: {
      type: 'object',
      properties: {
        scenarioNames: { type: 'array', items: { type: 'string' } },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metrics to compare (endingPortfolio, heirValue, totalTax, etc.)',
        },
      },
    },
  },
];

// Provider configurations
export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    headers: apiKey => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    }),
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    headers: apiKey => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    models: ['anthropic/claude-sonnet-4', 'openai/gpt-4o', 'google/gemini-pro-1.5'],
    headers: apiKey => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
    }),
  },
  custom: {
    name: 'Custom Endpoint',
    baseUrl: '',
    models: [],
    headers: apiKey => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
};

// System prompt for the retirement planning assistant
export const SYSTEM_PROMPT = `You are a helpful retirement planning assistant. You can help users:
- Understand their retirement projections
- Create and compare different scenarios
- Explain tax implications of different strategies
- Answer questions about Roth conversions, Social Security, and other retirement topics

You have access to tools to get current state, run projections, and create scenarios.
Be concise but thorough in your explanations. Use specific numbers when relevant.`;

/**
 * AI Service class
 */
export class AIService {
  constructor(config) {
    this.provider = config.provider || 'anthropic';
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.customBaseUrl = config.customBaseUrl;
  }

  async sendMessage(messages, tools, onToolCall) {
    const providerConfig = PROVIDERS[this.provider];
    const baseUrl = this.customBaseUrl || providerConfig.baseUrl;

    // Format request based on provider
    const request = this.formatRequest(messages, tools);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: providerConfig.headers(this.apiKey),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    return this.parseResponse(data, onToolCall);
  }

  formatRequest(messages, tools) {
    const systemMessage = { role: 'system', content: SYSTEM_PROMPT };

    if (this.provider === 'anthropic') {
      return {
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        tools: tools?.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
      };
    } else {
      // OpenAI / OpenRouter format
      return {
        model: this.model,
        messages: [systemMessage, ...messages],
        tools: tools?.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
      };
    }
  }

  parseResponse(data, onToolCall) {
    if (this.provider === 'anthropic') {
      // Anthropic response format
      const content = data.content || [];
      const textBlocks = content.filter(b => b.type === 'text');
      const toolBlocks = content.filter(b => b.type === 'tool_use');

      // Handle tool calls
      if (toolBlocks.length > 0 && onToolCall) {
        for (const tool of toolBlocks) {
          onToolCall({
            id: tool.id,
            name: tool.name,
            arguments: tool.input,
          });
        }
      }

      return {
        content: textBlocks.map(b => b.text).join('\n'),
        toolCalls: toolBlocks.map(b => ({
          id: b.id,
          name: b.name,
          arguments: b.input,
        })),
        stopReason: data.stop_reason,
      };
    } else {
      // OpenAI / OpenRouter response format
      const choice = data.choices?.[0];
      const message = choice?.message;
      const toolCalls = message?.tool_calls || [];

      // Handle tool calls
      if (toolCalls.length > 0 && onToolCall) {
        for (const tool of toolCalls) {
          onToolCall({
            id: tool.id,
            name: tool.function.name,
            arguments: JSON.parse(tool.function.arguments || '{}'),
          });
        }
      }

      return {
        content: message?.content || '',
        toolCalls: toolCalls.map(t => ({
          id: t.id,
          name: t.function.name,
          arguments: JSON.parse(t.function.arguments || '{}'),
        })),
        stopReason: choice?.finish_reason,
      };
    }
  }

  // Test connection to the API
  async testConnection() {
    try {
      const messages = [{ role: 'user', content: 'Say "connected" and nothing else.' }];
      const result = await this.sendMessage(messages, null, null);
      return { success: true, message: result.content };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Simple API key obfuscation (not secure, just prevents casual viewing)
export const encryptApiKey = key => {
  if (!key) return '';
  return btoa(key);
};

export const decryptApiKey = encrypted => {
  if (!encrypted) return '';
  try {
    return atob(encrypted);
  } catch {
    return '';
  }
};

// Storage key for AI config
export const AI_CONFIG_KEY = 'rp-ai-config';

// Save AI config to localStorage
export const saveAIConfig = config => {
  const toSave = {
    ...config,
    apiKey: encryptApiKey(config.apiKey),
  };
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(toSave));
};

// Load AI config from localStorage
export const loadAIConfig = () => {
  try {
    const saved = localStorage.getItem(AI_CONFIG_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return {
      ...parsed,
      apiKey: decryptApiKey(parsed.apiKey),
    };
  } catch {
    return null;
  }
};
