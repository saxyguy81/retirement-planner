import { describe, it, expect } from 'vitest';
import { getSourceCode, grepCodebase, SOURCE_CODE } from './sourceCodeProvider';

describe('sourceCodeProvider', () => {
  describe('getSourceCode', () => {
    it('returns federal tax source and explanation', () => {
      const result = getSourceCode('federal_tax');
      expect(result.code).toContain('calculateFederalTax');
      expect(result.explanation).toContain('progressively');
      expect(result.file).toBe('src/lib/calculations.js');
    });

    it('returns LTCG tax with stacking explanation', () => {
      const result = getSourceCode('ltcg_tax');
      expect(result.code).toContain('stackedIncome');
      expect(result.explanation).toContain('stack');
    });

    it('returns social security taxation info', () => {
      const result = getSourceCode('social_security_taxation');
      expect(result.code).toContain('combinedIncome');
      expect(result.explanation).toContain('combined income');
    });

    it('returns RMD calculation info', () => {
      const result = getSourceCode('rmd');
      expect(result.code).toContain('RMD_TABLE');
      expect(result.explanation).toContain('life expectancy');
    });

    it('returns heir value calculation info', () => {
      const result = getSourceCode('heir_value');
      expect(result.code).toContain('step-up');
      expect(result.explanation).toContain('step-up');
    });

    it('returns IRMAA calculation info', () => {
      const result = getSourceCode('irmaa');
      expect(result.code).toContain('IRMAA');
      expect(result.explanation).toContain('2 YEARS AGO');
    });

    it('returns NIIT calculation info', () => {
      const result = getSourceCode('niit');
      expect(result.code).toContain('NIIT');
      expect(result.explanation).toContain('3.8%');
    });

    it('returns projections info', () => {
      const result = getSourceCode('projections');
      expect(result.code).toContain('generateProjections');
      expect(result.explanation).toContain('Projection flow for each year');
    });

    it('returns tax tables info', () => {
      const result = getSourceCode('tax_tables');
      expect(result.code).toContain('FEDERAL_BRACKETS');
      expect(result.explanation).toContain('brackets');
    });

    it('returns all taxes orchestration info', () => {
      const result = getSourceCode('all_taxes');
      expect(result.code).toContain('calculateAllTaxes');
      expect(result.explanation).toContain('calculation order');
    });

    it('returns risk allocation info', () => {
      const result = getSourceCode('risk_allocation');
      expect(result.code).toContain('targetStockPercent');
      expect(result.explanation).toContain('BONDS in IRA');
    });

    it('returns error for unknown target', () => {
      const result = getSourceCode('invalid_target');
      expect(result.error).toContain('Unknown target');
      expect(result.error).toContain('Available:');
    });

    it('covers all calculation types', () => {
      const targets = [
        'federal_tax',
        'ltcg_tax',
        'niit',
        'social_security_taxation',
        'irmaa',
        'rmd',
        'heir_value',
        'projections',
        'tax_tables',
        'all_taxes',
        'risk_allocation',
      ];

      for (const target of targets) {
        const result = getSourceCode(target);
        expect(result.code).toBeDefined();
        expect(result.explanation).toBeDefined();
        expect(result.file).toBeDefined();
        expect(result.lines).toBeDefined();
        expect(result.description).toBeDefined();
      }
    });
  });

  describe('grepCodebase', () => {
    it('finds bracket-related code', () => {
      const results = grepCodebase('bracket', 'taxes');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.target === 'federal_tax')).toBe(true);
    });

    it('finds IRMAA references', () => {
      const results = grepCodebase('IRMAA');
      expect(results.some(r => r.target === 'irmaa')).toBe(true);
    });

    it('finds RMD references', () => {
      const results = grepCodebase('RMD');
      expect(results.some(r => r.target === 'rmd')).toBe(true);
    });

    it('finds Social Security references', () => {
      const results = grepCodebase('Social Security');
      expect(results.some(r => r.target === 'social_security_taxation')).toBe(true);
    });

    it('returns message for no matches', () => {
      const results = grepCodebase('xyznonexistent123');
      expect(results.message).toContain('No matches');
    });

    it('filters by tax context', () => {
      const results = grepCodebase('calculate', 'taxes');
      expect(Array.isArray(results)).toBe(true);
      // Should only search in tax-related targets
      const validTargets = ['federal_tax', 'ltcg_tax', 'niit', 'social_security_taxation', 'irmaa'];
      results.forEach(r => {
        expect(validTargets).toContain(r.target);
      });
    });

    it('searches all context by default', () => {
      const results = grepCodebase('calculate');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('SOURCE_CODE structure', () => {
    it('has all required fields for each entry', () => {
      Object.entries(SOURCE_CODE).forEach(([key, entry]) => {
        expect(entry.file).toBeDefined();
        expect(entry.lines).toBeDefined();
        expect(entry.description).toBeDefined();
        expect(entry.code).toBeDefined();
        expect(entry.explanation).toBeDefined();
        expect(typeof entry.code).toBe('string');
        expect(typeof entry.explanation).toBe('string');
      });
    });

    it('has non-empty code snippets', () => {
      Object.entries(SOURCE_CODE).forEach(([key, entry]) => {
        expect(entry.code.trim().length).toBeGreaterThan(50);
      });
    });

    it('has non-empty explanations', () => {
      Object.entries(SOURCE_CODE).forEach(([key, entry]) => {
        expect(entry.explanation.trim().length).toBeGreaterThan(50);
      });
    });
  });
});
