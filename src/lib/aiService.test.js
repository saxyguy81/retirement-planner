/**
 * Unit Tests for AI Service
 *
 * Tests message formatting to prevent empty content errors with Anthropic API.
 * Error: "messages: text content blocks must contain non-whitespace text"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService, webSearch, fetchPage } from './aiService.js';

// =============================================================================
// formatRequest Tests - Anthropic format message content handling
// =============================================================================
describe('AIService.formatRequest', () => {
  const createService = (provider = 'anthropic', customFormat = null) => {
    const service = new AIService({
      provider,
      apiKey: 'test-key',
      model: 'claude-sonnet-4-20250514',
    });
    if (customFormat) {
      service.customFormat = customFormat;
    }
    return service;
  };

  describe('Anthropic format - empty content handling', () => {
    it('filters out messages with empty string content', () => {
      const service = createService('anthropic');
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '' }, // Empty content
        { role: 'user', content: 'Follow up' },
      ];

      const request = service.formatRequest(messages, []);

      // Should filter out the empty message
      const msgContents = request.messages.map(m => m.content);
      expect(msgContents).not.toContain('');
      expect(msgContents).not.toContain(' '); // Also should not have whitespace-only
    });

    it('filters out messages with undefined content', () => {
      const service = createService('anthropic');
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: undefined }, // Undefined content
        { role: 'user', content: 'Follow up' },
      ];

      const request = service.formatRequest(messages, []);

      // Should filter out the undefined content message
      expect(request.messages.every(m => m.content && m.content.trim())).toBe(true);
    });

    it('filters out messages with whitespace-only content', () => {
      const service = createService('anthropic');
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '   ' }, // Whitespace only
        { role: 'user', content: 'Follow up' },
      ];

      const request = service.formatRequest(messages, []);

      // Should filter out whitespace-only message
      expect(request.messages.every(m => m.content.trim().length > 0)).toBe(true);
    });

    it('preserves valid messages with content', () => {
      const service = createService('anthropic');
      const messages = [
        { role: 'user', content: 'Hello AI' },
        { role: 'assistant', content: 'Hello! How can I help?' },
        { role: 'user', content: 'Tell me about retirement' },
      ];

      const request = service.formatRequest(messages, []);

      expect(request.messages).toHaveLength(3);
      expect(request.messages[0].content).toBe('Hello AI');
      expect(request.messages[1].content).toBe('Hello! How can I help?');
      expect(request.messages[2].content).toBe('Tell me about retirement');
    });

    it('handles persisted chat history with empty messages on reload', () => {
      const service = createService('anthropic');
      // Simulates what might be loaded from localStorage with corrupted data
      const messages = [
        { role: 'user', content: 'How much will my accounts be worth if I die at 91?' },
        { role: 'assistant', content: '' }, // Tool-only response that saved empty content
      ];

      const request = service.formatRequest(messages, []);

      // Should only have the user message
      expect(request.messages.length).toBeLessThan(2);
      expect(request.messages.some(m => !m.content || !m.content.trim())).toBe(false);
    });
  });

  describe('Custom endpoint with Anthropic format', () => {
    it('filters empty content for custom anthropic-style endpoints', () => {
      const service = createService('custom');
      service.customBaseUrl = 'http://localhost:4000/v1/messages';
      service.customFormat = 'anthropic';

      const messages = [
        { role: 'user', content: 'Test' },
        { role: 'assistant', content: '' },
      ];

      const request = service.formatRequest(messages, []);

      expect(request.messages.every(m => m.content && m.content.trim())).toBe(true);
    });
  });

  describe('OpenAI format - empty content handling', () => {
    it('handles empty content appropriately for OpenAI format', () => {
      const service = createService('openai');
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '' },
        { role: 'user', content: 'Follow up' },
      ];

      const request = service.formatRequest(messages, []);

      // OpenAI is more lenient but we should still filter empty messages
      // to avoid sending unnecessary API calls
      expect(request.messages).toBeDefined();
    });
  });

  describe('Google format - empty content handling', () => {
    it('handles empty content appropriately for Google format', () => {
      const service = createService('google');
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '' },
        { role: 'user', content: 'Follow up' },
      ];

      const request = service.formatRequest(messages, []);

      // Google should also filter out empty content
      expect(request.contents).toBeDefined();
    });
  });
});

// =============================================================================
// detectCustomFormat Tests
// =============================================================================
describe('AIService.detectCustomFormat', () => {
  it('detects anthropic format from /messages URL', () => {
    const service = new AIService({
      provider: 'custom',
      customBaseUrl: 'http://localhost:4000/v1/messages',
      apiKey: '',
      model: 'test',
    });

    expect(service.customFormat).toBe('anthropic');
  });

  it('detects openai format from /chat/completions URL', () => {
    const service = new AIService({
      provider: 'custom',
      customBaseUrl: 'http://localhost:4000/v1/chat/completions',
      apiKey: '',
      model: 'test',
    });

    expect(service.customFormat).toBe('openai');
  });

  it('defaults to openai for ambiguous URLs', () => {
    const service = new AIService({
      provider: 'custom',
      customBaseUrl: 'http://localhost:4000/api',
      apiKey: '',
      model: 'test',
    });

    expect(service.customFormat).toBe('openai');
  });
});

// =============================================================================
// webSearch Tests
// =============================================================================
describe('webSearch', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns formatted results for successful search', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: 'The 2025 Roth IRA contribution limit is $7,000.',
        results: [
          {
            title: 'IRS 2025 Limits',
            url: 'https://irs.gov/limits',
            content: 'The contribution limit for 2025 is $7,000...',
          },
        ],
      }),
    });

    const result = await webSearch('2025 Roth IRA limits');

    expect(result).toContain('$7,000');
    expect(result).toContain('**Summary:**');
    expect(result).toContain('**Sources:**');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('2025 Roth IRA limits'),
      })
    );
  });

  it('handles API errors gracefully', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    });

    const result = await webSearch('test query');

    expect(result).toContain('Web search');
    expect(result).toContain('429');
  });

  it('handles network errors gracefully', async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await webSearch('test query');

    expect(result).toContain('Web search');
    expect(result).toContain('Network error');
  });

  it('handles empty results', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [],
      }),
    });

    const result = await webSearch('obscure query');

    expect(result).toBe('No results found.');
  });

  it('handles malformed API response', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // Missing expected fields
    });

    const result = await webSearch('test query');

    expect(result).toBe('No results found.');
  });

  it('truncates long content in results', async () => {
    const longContent = 'A'.repeat(300);
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'Test',
            url: 'https://test.com',
            content: longContent,
          },
        ],
      }),
    });

    const result = await webSearch('test');

    expect(result).toContain('...');
    expect(result.length).toBeLessThan(longContent.length);
  });
});

// =============================================================================
// fetchPage Tests
// =============================================================================
describe('fetchPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns page content for valid HTTPS URL', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            raw_content: 'This is the page content about retirement planning.',
          },
        ],
      }),
    });

    const result = await fetchPage('https://example.com/article');

    expect(result).toContain('**Source:**');
    expect(result).toContain('retirement planning');
  });

  it('rejects HTTP URLs for security', async () => {
    const result = await fetchPage('http://insecure.com/page');

    expect(result).toContain('Only HTTPS URLs are supported');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal server error',
    });

    const result = await fetchPage('https://example.com');

    // 500 errors return user-friendly message about service unavailability
    expect(result).toContain('temporarily unavailable');
  });

  it('truncates very long content', async () => {
    const longContent = 'B'.repeat(10000);
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            raw_content: longContent,
          },
        ],
      }),
    });

    const result = await fetchPage('https://example.com');

    expect(result).toContain('[Content truncated...]');
    expect(result.length).toBeLessThan(longContent.length);
  });

  it('handles empty extraction results', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [],
      }),
    });

    const result = await fetchPage('https://example.com');

    expect(result).toContain('No content could be extracted');
  });
});
