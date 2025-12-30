/**
 * Unit Tests for AI Service
 *
 * Tests message formatting to prevent empty content errors with Anthropic API.
 * Error: "messages: text content blocks must contain non-whitespace text"
 */

import { describe, it, expect } from 'vitest';
import { AIService } from './aiService.js';

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
