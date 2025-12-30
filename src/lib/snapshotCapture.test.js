import { describe, it, expect } from 'vitest';
import {
  captureTableAsMarkdown,
  captureSummaryAsMarkdown,
  captureYearRange,
  captureTaxBreakdown,
  captureBalanceSummary,
  compareScenarios,
} from './snapshotCapture';

describe('snapshotCapture', () => {
  describe('captureTableAsMarkdown', () => {
    const mockProjections = [
      { year: 2026, age: 66, totalEOY: 3500000, heirValue: 3200000, totalTax: 45000 },
      { year: 2027, age: 67, totalEOY: 3600000, heirValue: 3350000, totalTax: 48000 },
    ];

    it('generates markdown table with default columns', () => {
      const result = captureTableAsMarkdown(mockProjections);
      expect(result).toContain('| year | age |');
      expect(result).toContain('| 2026 |'); // Year is NOT formatted as currency
      expect(result).toContain('$3,500,000');
    });

    it('respects custom columns', () => {
      const result = captureTableAsMarkdown(mockProjections, ['year', 'totalTax']);
      expect(result).toContain('| year | totalTax |');
      expect(result).not.toContain('age');
    });

    it('formats percentages correctly', () => {
      const projWithPercent = [{ year: 2026, rothPercent: 0.35 }];
      const result = captureTableAsMarkdown(projWithPercent, ['year', 'rothPercent']);
      expect(result).toContain('35.0%');
    });

    it('handles empty projections', () => {
      const result = captureTableAsMarkdown([]);
      expect(result).toBe('No projection data available');
    });

    it('handles null projections', () => {
      const result = captureTableAsMarkdown(null);
      expect(result).toBe('No projection data available');
    });

    it('handles undefined values', () => {
      const projWithUndefined = [{ year: 2026, age: undefined, totalEOY: 3000000 }];
      const result = captureTableAsMarkdown(projWithUndefined, ['year', 'age', 'totalEOY']);
      expect(result).toContain('| 2026 | - |');
    });
  });

  describe('captureSummaryAsMarkdown', () => {
    const mockSummary = {
      startingPortfolio: 3000000,
      endingPortfolio: 4500000,
      endingHeirValue: 4200000,
      totalTaxPaid: 850000,
      totalIRMAAPaid: 25000,
      finalRothPercent: 0.45,
    };

    it('generates summary table', () => {
      const result = captureSummaryAsMarkdown(mockSummary);
      expect(result).toContain('Starting Portfolio');
      expect(result).toContain('$3,000,000');
      expect(result).toContain('45.0%');
    });

    it('includes all summary metrics', () => {
      const result = captureSummaryAsMarkdown(mockSummary);
      expect(result).toContain('Ending Portfolio');
      expect(result).toContain('Ending Heir Value');
      expect(result).toContain('Total Tax Paid');
      expect(result).toContain('Total IRMAA Paid');
      expect(result).toContain('Final Roth %');
    });

    it('handles null summary', () => {
      const result = captureSummaryAsMarkdown(null);
      expect(result).toBe('No summary data available');
    });

    it('formats header correctly', () => {
      const result = captureSummaryAsMarkdown(mockSummary);
      expect(result).toContain('## Projection Summary');
    });
  });

  describe('captureYearRange', () => {
    const mockProjections = [
      { year: 2025, age: 65, totalEOY: 3400000 },
      { year: 2026, age: 66, totalEOY: 3500000 },
      { year: 2027, age: 67, totalEOY: 3600000 },
      { year: 2028, age: 68, totalEOY: 3700000 },
      { year: 2029, age: 69, totalEOY: 3800000 },
    ];

    it('filters to specified year range', () => {
      const result = captureYearRange(mockProjections, 2026, 2028);
      expect(result).toContain('2026');
      expect(result).toContain('2027');
      expect(result).toContain('2028');
      expect(result).not.toContain('2025');
      expect(result).not.toContain('2029');
    });

    it('respects custom columns', () => {
      const result = captureYearRange(mockProjections, 2026, 2027, ['year', 'totalEOY']);
      expect(result).toContain('| year | totalEOY |');
      expect(result).not.toContain('age');
    });
  });

  describe('captureTaxBreakdown', () => {
    const mockProjection = {
      year: 2026,
      federalTax: 45000,
      stateTax: 12000,
      ltcgTax: 8000,
      niit: 3000,
      irmaa: 5000,
      totalTax: 73000,
      socialSecurity: 36000,
      taxableSS: 30600,
      iraWithdrawal: 100000,
      rothConversion: 50000,
      capitalGains: 80000,
    };

    it('generates tax breakdown table', () => {
      const result = captureTaxBreakdown(mockProjection);
      expect(result).toContain('## Tax Breakdown for 2026');
      expect(result).toContain('Federal Tax');
      expect(result).toContain('$45,000');
    });

    it('includes all tax types', () => {
      const result = captureTaxBreakdown(mockProjection);
      expect(result).toContain('Federal Tax');
      expect(result).toContain('State Tax');
      expect(result).toContain('LTCG Tax');
      expect(result).toContain('NIIT');
      expect(result).toContain('IRMAA');
      expect(result).toContain('Total Tax');
    });

    it('includes income details', () => {
      const result = captureTaxBreakdown(mockProjection);
      expect(result).toContain('Social Security');
      expect(result).toContain('IRA Withdrawal');
      expect(result).toContain('Roth Conversion');
      expect(result).toContain('Capital Gains');
    });

    it('handles null projection', () => {
      const result = captureTaxBreakdown(null);
      expect(result).toBe('No projection data for specified year');
    });
  });

  describe('captureBalanceSummary', () => {
    const mockProjection = {
      year: 2026,
      atEOY: 1000000,
      iraEOY: 1500000,
      rothEOY: 1000000,
      totalEOY: 3500000,
      heirValue: 3200000,
    };

    it('generates balance summary table', () => {
      const result = captureBalanceSummary(mockProjection);
      expect(result).toContain('## Account Balances for 2026');
      expect(result).toContain('After-Tax');
      expect(result).toContain('Traditional IRA');
      expect(result).toContain('Roth IRA');
    });

    it('includes percentages', () => {
      const result = captureBalanceSummary(mockProjection);
      expect(result).toContain('%');
    });

    it('includes heir value', () => {
      const result = captureBalanceSummary(mockProjection);
      expect(result).toContain('Heir Value');
      expect(result).toContain('$3,200,000');
    });

    it('handles null projection', () => {
      const result = captureBalanceSummary(null);
      expect(result).toBe('No projection data available');
    });
  });

  describe('compareScenarios', () => {
    const scenario1 = {
      endingPortfolio: 4000000,
      endingHeirValue: 3600000,
      totalTaxPaid: 800000,
      totalIRMAAPaid: 20000,
    };

    const scenario2 = {
      endingPortfolio: 4200000,
      endingHeirValue: 3800000,
      totalTaxPaid: 850000,
      totalIRMAAPaid: 25000,
    };

    it('generates comparison table', () => {
      const result = compareScenarios(scenario1, scenario2, 'Base Case', 'Alternative');
      expect(result).toContain('## Scenario Comparison');
      expect(result).toContain('Base Case');
      expect(result).toContain('Alternative');
    });

    it('shows differences', () => {
      const result = compareScenarios(scenario1, scenario2);
      expect(result).toContain('+$200,000'); // Portfolio difference
    });

    it('uses default names', () => {
      const result = compareScenarios(scenario1, scenario2);
      expect(result).toContain('Scenario 1');
      expect(result).toContain('Scenario 2');
    });

    it('handles missing scenarios', () => {
      const result = compareScenarios(null, scenario2);
      expect(result).toBe('Missing scenario data for comparison');
    });

    it('includes all comparison metrics', () => {
      const result = compareScenarios(scenario1, scenario2);
      expect(result).toContain('Ending Portfolio');
      expect(result).toContain('Ending Heir Value');
      expect(result).toContain('Total Tax Paid');
      expect(result).toContain('Total IRMAA');
    });
  });
});
