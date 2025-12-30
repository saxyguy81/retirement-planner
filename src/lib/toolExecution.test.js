/**
 * Tool Execution Validation Tests
 *
 * Tests that tool calls are properly executed and errors are handled gracefully.
 * These tests validate the executeToolCall logic used by the Chat component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webSearch, fetchPage } from './aiService.js';

// =============================================================================
// Tool Execution Error Handling Tests
// =============================================================================
describe('Tool Execution Error Handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('web_search tool', () => {
    it('provides actionable error message on rate limit', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const result = await webSearch('2025 Roth IRA limits');

      expect(result).toContain('Web search');
      // Error message should be informative
      expect(result.length).toBeGreaterThan(20);
    });

    it('provides actionable error message on invalid API key', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      });

      const result = await webSearch('test');

      expect(result).toContain('Web search');
      expect(result).toContain('401');
    });

    it('provides actionable error message on service unavailable', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      });

      const result = await webSearch('test');

      expect(result).toContain('Web search');
    });

    it('handles timeout gracefully', async () => {
      globalThis.fetch.mockRejectedValueOnce(new Error('timeout'));

      const result = await webSearch('test');

      expect(result).toContain('Web search');
      expect(result).toContain('timeout');
    });

    it('handles JSON parse errors', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await webSearch('test');

      expect(result).toContain('Web search');
    });
  });

  describe('fetch_page tool', () => {
    it('provides actionable error message on blocked URL', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      const result = await fetchPage('https://blocked-site.com');

      // 403 errors return user-friendly message about access issues
      expect(result).toContain('could not be accessed');
    });

    it('provides actionable error message on not found', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      });

      const result = await fetchPage('https://example.com/missing');

      expect(result).toContain('Failed to fetch page');
      expect(result).toContain('404');
    });

    it('handles connection refused', async () => {
      globalThis.fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await fetchPage('https://localhost:9999');

      expect(result).toContain('Failed to fetch page');
    });
  });
});

// =============================================================================
// Tool Input Validation Tests
// =============================================================================
describe('Tool Input Validation', () => {
  describe('web_search validation', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('handles empty query', async () => {
      const result = await webSearch('');
      // Should still make the request, API will handle validation
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('handles very long query', async () => {
      const longQuery = 'A'.repeat(1000);
      const result = await webSearch(longQuery);
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('handles special characters in query', async () => {
      const result = await webSearch('2025 IRA limits $7,000 & 401(k)');
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  describe('fetch_page validation', () => {
    it('rejects non-URL strings', async () => {
      const result = await fetchPage('not a url');
      expect(result).toContain('Only HTTPS URLs are supported');
    });

    it('rejects javascript: URLs', async () => {
      const result = await fetchPage('javascript:alert(1)');
      expect(result).toContain('Only HTTPS URLs are supported');
    });

    it('rejects data: URLs', async () => {
      const result = await fetchPage('data:text/html,<h1>test</h1>');
      expect(result).toContain('Only HTTPS URLs are supported');
    });

    it('rejects file: URLs', async () => {
      const result = await fetchPage('file:///etc/passwd');
      expect(result).toContain('Only HTTPS URLs are supported');
    });
  });
});
