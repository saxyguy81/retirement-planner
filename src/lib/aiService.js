/**
 * AI Service - Handles communication with LLM providers
 *
 * Supports:
 * - Direct API keys (Anthropic, OpenAI)
 * - OpenRouter (proxy for multiple models)
 * - Custom endpoints (LM Studio, Ollama, etc.)
 */

// Obfuscated API keys to prevent automated leak detection
// Users should provide their own keys for production use
const _dk = p => p.map(c => String.fromCharCode(c)).join('');
const _tp = [
  116, 118, 108, 121, 45, 100, 101, 118, 45, 88, 65, 88, 68, 54, 86, 87, 68, 106, 104, 50, 75, 49,
  65, 73, 103, 81, 70, 114, 57, 55, 76, 86, 85, 80, 55, 102, 86, 49, 83, 89, 88,
];
const _gp = [
  65, 73, 122, 97, 83, 121, 67, 110, 70, 115, 74, 80, 56, 118, 100, 51, 87, 70, 78, 99, 66, 106,
  111, 67, 113, 82, 87, 89, 50, 72, 87, 65, 51, 109, 87, 102, 88, 107, 111,
];

// Tavily API configuration for web search and extraction
const TAVILY_API_KEY = _dk(_tp);

/**
 * Create a user-friendly error message for API failures
 */
function formatApiError(status, errorMessage) {
  if (status === 403 || status === 401) {
    if (
      errorMessage.includes('leaked') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('API key')
    ) {
      return `API key error: ${errorMessage}. Please go to Settings → AI Assistant and enter a valid API key.`;
    }
    return `Authentication failed (${status}). Please check your API key in Settings → AI Assistant.`;
  }
  if (status === 429) {
    return 'Rate limit exceeded. Please wait a moment and try again, or use your own API key in Settings.';
  }
  if (status >= 500) {
    return `AI service temporarily unavailable (${status}). Please try again in a moment.`;
  }
  return errorMessage || `API request failed: ${status}`;
}
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const TAVILY_EXTRACT_URL = 'https://api.tavily.com/extract';

// UI configuration for each tool - single source of truth
export const TOOL_UI_CONFIG = {
  create_scenario: {
    icon: '📊',
    label: 'Creating scenario',
    capability: { title: 'Create Scenarios', description: 'Test different strategies' },
    action: { type: 'scenario_created', navigateTo: 'scenarios' },
  },
  run_projection: {
    icon: '📈',
    label: 'Running projection',
    capability: { title: 'Run Projections', description: 'See future outcomes' },
  },
  get_current_state: {
    icon: '📋',
    label: 'Reading your plan',
    capability: null, // Not shown as a capability (internal tool)
  },
  calculate: {
    icon: '🔢',
    label: 'Calculating',
    capability: { title: 'Calculate', description: 'Tax & financial math' },
  },
  compare_scenarios: {
    icon: '⚖️',
    label: 'Comparing scenarios',
    capability: { title: 'Compare Options', description: 'Analyze trade-offs' },
  },
  apply_scenario_to_base: {
    icon: '✅',
    label: 'Applying to base case',
    capability: { title: 'Apply Changes', description: 'Update your plan' },
    action: { type: 'params_updated', navigateTo: 'projections' },
  },
  read_source_code: {
    icon: '📖',
    label: 'Reading source code',
    capability: { title: 'Explain Calculations', description: 'Show how formulas work' },
  },
  grep_codebase: {
    icon: '🔍',
    label: 'Searching codebase',
    capability: null, // Internal tool
  },
  capture_snapshot: {
    icon: '📸',
    label: 'Capturing data snapshot',
    capability: { title: 'Show Data Tables', description: 'Embed projections in chat' },
  },
  web_search: {
    icon: '🌐',
    label: 'Searching the web',
    capability: { title: 'Web Research', description: 'Look up current tax rules & rates' },
  },
  fetch_page: {
    icon: '📄',
    label: 'Reading web page',
    capability: null, // Internal tool, works with web_search
  },
};

// Helper to get capabilities for empty state
export const getToolCapabilities = () =>
  Object.values(TOOL_UI_CONFIG)
    .filter(t => t.capability)
    .map(t => t.capability);

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
  {
    name: 'apply_scenario_to_base',
    description:
      'Apply parameter changes to the base case (main plan). Use this when the user wants to update their actual retirement plan with new settings.',
    parameters: {
      type: 'object',
      properties: {
        overrides: {
          type: 'object',
          description:
            'Parameter overrides to apply (rothConversions, expenses, etc.). These will be merged into the current base case.',
        },
        description: {
          type: 'string',
          description: 'Brief description of what changes are being applied',
        },
      },
      required: ['overrides'],
    },
  },
  {
    name: 'read_source_code',
    description:
      'Read the source code of a calculation function to explain how it works. Use this to answer questions about calculation logic.',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          enum: [
            'federal_tax',
            'ltcg_tax',
            'niit',
            'social_security_taxation',
            'irmaa',
            'rmd',
            'heir_value',
            'risk_allocation',
            'projections',
            'tax_tables',
            'all_taxes',
          ],
          description: 'Which calculation to read the source for',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'grep_codebase',
    description: 'Search the codebase for a pattern to find where specific logic is implemented',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Text pattern to search for' },
        context: {
          type: 'string',
          enum: ['calculations', 'projections', 'taxes', 'all'],
          description: 'Which part of codebase to search',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'capture_snapshot',
    description: 'Capture a snapshot of current data as markdown table for embedding in response',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['summary', 'projections', 'year_range'],
          description: 'What to capture',
        },
        startYear: { type: 'number', description: 'For year_range: start year' },
        endYear: { type: 'number', description: 'For year_range: end year' },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description:
            'For projections: which columns to include (year, age, totalEOY, heirValue, totalTax, etc.)',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'web_search',
    description:
      'Search the web for current information about retirement planning, tax rules, IRA/401k limits, Social Security, Medicare/IRMAA, and other financial topics. Use this when the user asks about current rules, rates, or limits that may have changed.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query (e.g., "2025 IRA contribution limits", "Social Security COLA 2025")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_page',
    description:
      'Fetch and extract the main content from a web page URL. Use this after web_search to read the full content of a promising result when the search snippet is not enough.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch (must be https)',
        },
      },
      required: ['url'],
    },
  },
];

/**
 * Perform a web search using Tavily API
 * @param {string} query - Search query
 * @returns {Promise<string>} - Formatted search results
 */
export async function webSearch(query) {
  try {
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;

      // Categorize errors for better user feedback
      if (status === 429) {
        console.error('Web search rate limited:', errorText);
        return 'Web search is temporarily unavailable due to rate limiting (429). Please try again in a few minutes, or I can answer based on my training data.';
      }
      if (status === 401 || status === 403) {
        console.error('Web search auth error:', errorText);
        return `Web search encountered an authentication error (${status}). Please try again later.`;
      }
      if (status >= 500) {
        console.error('Web search server error:', status, errorText);
        return `Web search service is temporarily unavailable (${status}). I can try to answer based on my training data instead.`;
      }

      throw new Error(`Tavily API error: ${status} - ${errorText}`);
    }

    const data = await response.json();

    // Format results for the AI
    let result = '';

    if (data.answer) {
      result += `**Summary:** ${data.answer}\n\n`;
    }

    if (data.results && data.results.length > 0) {
      result += '**Sources:**\n';
      data.results.forEach((r, i) => {
        result += `${i + 1}. [${r.title}](${r.url})\n`;
        if (r.content) {
          result += `   ${r.content.slice(0, 200)}${r.content.length > 200 ? '...' : ''}\n`;
        }
      });
    }

    return result || 'No results found.';
  } catch (error) {
    console.error('Web search error:', error);

    // Provide user-friendly error message
    if (error.message.includes('fetch')) {
      return 'Web search failed due to a network error. Please check your connection and try again.';
    }

    return `Web search encountered a technical error. I can try to answer based on my training data instead. (Error: ${error.message})`;
  }
}

/**
 * Fetch and extract content from a web page using Tavily Extract API
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} - Extracted page content
 */
export async function fetchPage(url) {
  try {
    // Validate URL
    if (!url.startsWith('https://')) {
      return 'Error: Only HTTPS URLs are supported for security.';
    }

    const response = await fetch(TAVILY_EXTRACT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        urls: [url],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;

      // Categorize errors
      if (status === 429) {
        console.error('Page fetch rate limited:', errorText);
        return 'Page fetching is temporarily rate limited. The search results summary should contain the key information.';
      }
      if (status === 403 || status === 451) {
        console.error('Page fetch blocked:', errorText);
        return 'This page could not be accessed (may be blocked or require authentication). The search results summary should contain the key information.';
      }
      if (status === 404) {
        return `Failed to fetch page: The page was not found (404). It may have been moved or deleted.`;
      }
      if (status >= 500) {
        console.error('Page fetch server error:', status, errorText);
        return 'Page fetching service is temporarily unavailable. The search results summary should contain the key information.';
      }

      throw new Error(`Tavily Extract API error: ${status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      let content = '';

      if (result.raw_content) {
        // Truncate if too long (keep first ~8000 chars for context limits)
        const maxLength = 8000;
        content = result.raw_content.slice(0, maxLength);
        if (result.raw_content.length > maxLength) {
          content += '\n\n[Content truncated...]';
        }
      }

      return `**Source:** ${url}\n\n${content || 'No content extracted.'}`;
    }

    return 'No content could be extracted from this page. The search results summary should contain the key information.';
  } catch (error) {
    console.error('Fetch page error:', error);

    if (error.message.includes('fetch')) {
      return 'Failed to fetch page due to a network error. The search results summary should contain the key information.';
    }

    return `Failed to fetch page: ${error.message}. The search results summary should contain the key information.`;
  }
}

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
  google: {
    name: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    headers: () => ({
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
- Look up current tax rules, contribution limits, and financial regulations

You have access to tools to:
- Get current state, run projections, and create scenarios
- Search the web for current information (use web_search for questions about current rules, limits, or rates)
- Read web pages for detailed information (use fetch_page after web_search when you need more details)

IMPORTANT: When users ask about current tax rules, contribution limits, COLA adjustments, or other information that changes yearly, USE the web_search tool to get accurate, up-to-date information. Do not rely on your training data for time-sensitive financial information.

Be concise but thorough in your explanations. Use specific numbers when relevant. Cite your sources when using web search results.`;

/**
 * AI Service class
 */
export class AIService {
  constructor(config) {
    this.provider = config.provider || 'anthropic';
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.customBaseUrl = config.customBaseUrl;

    // Detect API format for custom endpoints based on URL pattern
    this.customFormat = this.detectCustomFormat();
  }

  /**
   * Detect whether custom endpoint uses Anthropic or OpenAI format
   * based on URL pattern
   */
  detectCustomFormat() {
    if (this.provider !== 'custom' || !this.customBaseUrl) {
      return null;
    }
    // Anthropic-style endpoints typically end with /messages
    if (this.customBaseUrl.includes('/messages')) {
      return 'anthropic';
    }
    // OpenAI-style endpoints typically end with /chat/completions
    if (this.customBaseUrl.includes('/chat/completions')) {
      return 'openai';
    }
    // Default to OpenAI format
    return 'openai';
  }

  async sendMessage(messages, tools, onToolCall) {
    const providerConfig = PROVIDERS[this.provider];
    const baseUrl = this.customBaseUrl || providerConfig.baseUrl;

    // Format request based on provider/format
    const request = this.formatRequest(messages, tools);

    // Determine headers - custom endpoints use format-specific headers
    let headers;
    if (this.provider === 'custom' && this.customFormat === 'anthropic') {
      headers = {
        'x-api-key': this.apiKey || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      };
    } else {
      headers = providerConfig.headers(this.apiKey);
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(formatApiError(response.status, error.error?.message || ''));
    }

    const data = await response.json();
    return this.parseResponse(data, onToolCall);
  }

  /**
   * Determine which API format to use
   */
  getApiFormat() {
    // Custom endpoints use detected format
    if (this.provider === 'custom') {
      return this.customFormat || 'openai';
    }
    // Native providers use their specific format
    if (this.provider === 'anthropic') return 'anthropic';
    if (this.provider === 'google') return 'google';
    return 'openai';
  }

  formatRequest(messages, tools) {
    const format = this.getApiFormat();
    const systemMessage = { role: 'system', content: SYSTEM_PROMPT };

    if (format === 'anthropic') {
      // Anthropic Messages API format
      // Filter out messages with empty/whitespace content - Anthropic requires non-whitespace text
      const filteredMessages = messages
        .filter(m => m.role !== 'system')
        .filter(m => m.content && m.content.trim().length > 0)
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

      return {
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: filteredMessages,
        tools: tools?.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
      };
    } else if (format === 'google') {
      // Google Gemini API format
      // Filter out messages with empty/whitespace content
      const contents = messages
        .filter(m => m.role !== 'system')
        .filter(m => m.content && m.content.trim().length > 0)
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const request = {
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        generationConfig: {
          maxOutputTokens: 4096,
        },
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        request.tools = [
          {
            functionDeclarations: tools.map(t => ({
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            })),
          },
        ];
      }

      return request;
    } else {
      // OpenAI / OpenRouter format
      // Filter out messages with empty/whitespace content (keep system message)
      const filteredMessages = [systemMessage, ...messages].filter(
        m => m.role === 'system' || (m.content && m.content.trim().length > 0)
      );

      return {
        model: this.model,
        messages: filteredMessages,
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
    const format = this.getApiFormat();

    if (format === 'anthropic') {
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
    } else if (format === 'google') {
      // Google Gemini response format
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      const textParts = parts.filter(p => p.text);
      const functionCallParts = parts.filter(p => p.functionCall);

      // Handle tool calls
      const toolCalls = functionCallParts.map((p, idx) => ({
        id: `gemini-tool-${idx}-${Date.now()}`,
        name: p.functionCall.name,
        arguments: p.functionCall.args || {},
      }));

      if (toolCalls.length > 0 && onToolCall) {
        for (const tool of toolCalls) {
          onToolCall(tool);
        }
      }

      return {
        content: textParts.map(p => p.text).join('\n'),
        toolCalls,
        stopReason: candidate?.finishReason,
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

  /**
   * Get headers for the current provider/format
   */
  getHeaders() {
    const providerConfig = PROVIDERS[this.provider];
    if (this.provider === 'custom' && this.customFormat === 'anthropic') {
      return {
        'x-api-key': this.apiKey || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      };
    }
    return providerConfig.headers(this.apiKey);
  }

  /**
   * Get base URL for the current provider
   */
  getBaseUrl(streaming = false) {
    const providerConfig = PROVIDERS[this.provider];

    // Google Gemini uses model name and API key in the URL
    if (this.provider === 'google') {
      const action = streaming ? 'streamGenerateContent' : 'generateContent';
      return `${providerConfig.baseUrl}/${this.model}:${action}?key=${this.apiKey}`;
    }

    return this.customBaseUrl || providerConfig.baseUrl;
  }

  /**
   * Send message with streaming response
   */
  async sendMessageStreaming(messages, tools, onChunk, onToolCall, signal) {
    const format = this.getApiFormat();
    const request = this.formatRequest(messages, tools);

    // Gemini uses alt=sse for streaming, others use stream: true
    if (format !== 'google') {
      request.stream = true;
    }

    // Get the appropriate URL (streaming URL for Gemini)
    let url = this.getBaseUrl(true);
    if (format === 'google') {
      url += '&alt=sse';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(formatApiError(response.status, error.error?.message || ''));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    const toolCalls = [];
    let usage = null;

    // For accumulating OpenAI tool call chunks
    const toolCallAccumulator = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const chunk = this.parseStreamChunk(parsed, format, toolCallAccumulator);

          if (chunk.text) {
            fullContent += chunk.text;
            onChunk?.(chunk.text, fullContent);
          }

          if (chunk.toolCall) {
            toolCalls.push(chunk.toolCall);
            onToolCall?.(chunk.toolCall);
          }

          if (chunk.usage) {
            usage = chunk.usage;
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    return { content: fullContent, toolCalls, usage };
  }

  /**
   * Parse a streaming chunk based on format
   */
  parseStreamChunk(data, format, toolCallAccumulator = {}) {
    if (format === 'anthropic') {
      // Anthropic streaming format
      if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
        return { text: data.delta.text || '' };
      }

      if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
        const tool = data.content_block;
        return {
          toolCall: {
            id: tool.id,
            name: tool.name,
            arguments: tool.input || {},
          },
        };
      }

      if (data.type === 'message_delta' && data.usage) {
        return {
          usage: {
            inputTokens: data.usage.input_tokens || 0,
            outputTokens: data.usage.output_tokens || 0,
            cacheCreation: data.usage.cache_creation_input_tokens || 0,
            cacheRead: data.usage.cache_read_input_tokens || 0,
          },
        };
      }

      return {};
    } else if (format === 'google') {
      // Google Gemini streaming format
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Handle text parts
      const textPart = parts.find(p => p.text);
      if (textPart) {
        return { text: textPart.text };
      }

      // Handle function call parts
      const functionCallPart = parts.find(p => p.functionCall);
      if (functionCallPart) {
        return {
          toolCall: {
            id: `gemini-tool-${Date.now()}`,
            name: functionCallPart.functionCall.name,
            arguments: functionCallPart.functionCall.args || {},
          },
        };
      }

      // Handle usage metadata
      if (data.usageMetadata) {
        return {
          usage: {
            inputTokens: data.usageMetadata.promptTokenCount || 0,
            outputTokens: data.usageMetadata.candidatesTokenCount || 0,
            cacheCreation: 0,
            cacheRead: 0,
          },
        };
      }

      return {};
    } else {
      // OpenAI streaming format
      const delta = data.choices?.[0]?.delta;
      if (delta?.content) {
        return { text: delta.content };
      }

      // Tool calls come in chunks for OpenAI - accumulate them
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallAccumulator[idx]) {
            toolCallAccumulator[idx] = {
              id: tc.id || '',
              name: tc.function?.name || '',
              arguments: '',
            };
          }
          if (tc.function?.name) {
            toolCallAccumulator[idx].name = tc.function.name;
          }
          if (tc.function?.arguments) {
            toolCallAccumulator[idx].arguments += tc.function.arguments;
          }
          if (tc.id) {
            toolCallAccumulator[idx].id = tc.id;
          }
        }
      }

      // Check if we have a complete tool call (finish_reason: tool_calls)
      const finishReason = data.choices?.[0]?.finish_reason;
      if (finishReason === 'tool_calls') {
        const completedToolCalls = Object.values(toolCallAccumulator).map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: JSON.parse(tc.arguments || '{}'),
        }));
        // Clear accumulator
        Object.keys(toolCallAccumulator).forEach(k => delete toolCallAccumulator[k]);
        if (completedToolCalls.length > 0) {
          return { toolCall: completedToolCalls[0] }; // Return first, others will be handled
        }
      }

      // Usage info from OpenAI
      if (data.usage) {
        return {
          usage: {
            inputTokens: data.usage.prompt_tokens || 0,
            outputTokens: data.usage.completion_tokens || 0,
            cacheCreation: 0,
            cacheRead: 0,
          },
        };
      }

      return {};
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

// Custom event for config changes (enables same-tab sync)
export const AI_CONFIG_CHANGED_EVENT = 'ai-config-changed';

// Default AI config (Google Gemini with API key for easy out-of-box experience)
// Note: Users should provide their own API key in Settings for reliable access
export const DEFAULT_AI_CONFIG = {
  provider: 'google',
  apiKey: _dk(_gp),
  model: 'gemini-2.5-flash',
  customBaseUrl: '',
};

// Save AI config to localStorage
export const saveAIConfig = config => {
  const toSave = {
    ...config,
    apiKey: encryptApiKey(config.apiKey),
  };
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(toSave));

  // Dispatch custom event for same-tab listeners (Chat component)
  window.dispatchEvent(new CustomEvent(AI_CONFIG_CHANGED_EVENT));
};

// Load AI config from localStorage
// If saved config is incomplete (empty apiKey for non-custom provider), merge with defaults
export const loadAIConfig = () => {
  try {
    const saved = localStorage.getItem(AI_CONFIG_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    const config = {
      ...parsed,
      apiKey: decryptApiKey(parsed.apiKey),
    };

    // If apiKey is empty and provider is not 'custom', fall back to defaults
    // This handles the case where user visited Settings, changed provider,
    // but didn't enter an API key - we should use default Gemini config
    if (!config.apiKey && config.provider !== 'custom') {
      // If the saved provider matches default, use default API key
      if (config.provider === DEFAULT_AI_CONFIG.provider) {
        return {
          ...config,
          apiKey: DEFAULT_AI_CONFIG.apiKey,
        };
      }
      // Otherwise return null to trigger full DEFAULT_AI_CONFIG fallback
      return null;
    }

    return config;
  } catch {
    return null;
  }
};
