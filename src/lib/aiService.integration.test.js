/**
 * AI Service Integration Tests
 *
 * These tests make actual API calls to validate connectivity.
 * Skip in CI (no API keys), run locally for validation.
 *
 * Run with: npm test -- --grep "AI Service Integration"
 */

import { describe, it, expect } from 'vitest';
import { webSearch, fetchPage } from './aiService.js';

// Skip in CI environment
const SKIP_INTEGRATION = process.env.CI === 'true' || process.env.SKIP_INTEGRATION === 'true';

describe.skipIf(SKIP_INTEGRATION)('AI Service Integration', () => {
  describe('webSearch - actual API', () => {
    it('can search for 2025 Roth IRA income limits', async () => {
      const result = await webSearch('2025 Roth IRA income limits married filing jointly');

      // Should contain actual information
      expect(result).not.toContain('Web search failed');
      // Should have sources or summary
      expect(result.length).toBeGreaterThan(100);
    }, 30000); // 30s timeout for API call

    it('can search for current year IRA contribution limits', async () => {
      const year = new Date().getFullYear();
      const result = await webSearch(`${year} IRA contribution limits`);

      expect(result).not.toContain('Web search failed');
    }, 30000);

    it('can search for IRMAA brackets', async () => {
      const result = await webSearch('2025 Medicare IRMAA brackets');

      expect(result).not.toContain('Web search failed');
    }, 30000);
  });

  describe('fetchPage - actual API', () => {
    it('can fetch IRS page content', async () => {
      const result = await fetchPage(
        'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-ira-contribution-limits'
      );

      expect(result).toContain('**Source:**');
      // Should have actual content
      expect(result.length).toBeGreaterThan(500);
    }, 30000);

    it('can fetch SSA page content', async () => {
      const result = await fetchPage('https://www.ssa.gov/cola/');

      expect(result).toContain('**Source:**');
    }, 30000);
  });

  describe('API error scenarios', () => {
    it('handles non-existent page gracefully', async () => {
      const result = await fetchPage('https://www.irs.gov/this-page-does-not-exist-12345');

      // Should not throw, should return error message
      expect(typeof result).toBe('string');
    }, 30000);
  });
});
