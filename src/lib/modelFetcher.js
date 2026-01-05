/**
 * Model Fetcher - Dynamically fetch available models from LLM providers
 */

/**
 * Fetch models from OpenAI
 * GET https://api.openai.com/v1/models
 */
export async function fetchOpenAIModels(apiKey) {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  const data = await response.json();
  // Filter to chat models only (gpt-*)
  return data.data
    .filter(m => m.id.startsWith('gpt-'))
    .map(m => m.id)
    .sort()
    .reverse(); // Newest first
}

/**
 * Fetch models from Anthropic
 * GET https://api.anthropic.com/v1/models
 */
export async function fetchAnthropicModels(apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });
  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
  const data = await response.json();
  return data.data.map(m => m.id);
}

/**
 * Fetch models from Google Gemini
 * GET https://generativelanguage.googleapis.com/v1beta/models?key=<API_KEY>
 */
export async function fetchGeminiModels(apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  // Filter to generateContent-capable models
  return data.models
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace('models/', ''));
}

/**
 * Fetch models from Groq
 * GET https://api.groq.com/openai/v1/models
 */
export async function fetchGroqModels(apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
  const data = await response.json();
  return data.data.map(m => m.id);
}

/**
 * Fetch models from OpenRouter
 * GET https://openrouter.ai/api/v1/models
 */
export async function fetchOpenRouterModels(apiKey) {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
  const data = await response.json();
  return data.data.map(m => m.id);
}

/**
 * Fetch models from Ollama (local)
 * GET http://localhost:11434/api/tags
 */
export async function fetchOllamaModels(baseUrl = 'http://localhost:11434') {
  const response = await fetch(`${baseUrl}/api/tags`);
  if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
  const data = await response.json();
  return data.models.map(m => m.name);
}

/**
 * Unified model fetcher - dispatches to provider-specific function
 */
export async function fetchModelsForProvider(provider, apiKey, customBaseUrl) {
  switch (provider) {
    case 'openai':
      return fetchOpenAIModels(apiKey);
    case 'anthropic':
      return fetchAnthropicModels(apiKey);
    case 'google':
      return fetchGeminiModels(apiKey);
    case 'groq':
      return fetchGroqModels(apiKey);
    case 'openrouter':
      return fetchOpenRouterModels(apiKey);
    case 'ollama':
      return fetchOllamaModels(customBaseUrl || 'http://localhost:11434');
    case 'custom':
      return []; // Custom providers don't have model discovery
    default:
      return [];
  }
}
