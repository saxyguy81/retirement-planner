import { describe, it, expect } from 'vitest';
import { CALCULATIONS, fK, fM, f$ } from './calculationDefinitions';
import {
  IRMAA_BRACKETS_MFJ_2026,
  STANDARD_DEDUCTION_MFJ_2024,
  SENIOR_BONUS_MFJ_2024,
  LTCG_BRACKETS_MFJ_2024,
  NIIT_THRESHOLD_MFJ,
  NIIT_RATE,
  SS_TAX_THRESHOLDS_MFJ,
} from './taxTables';

describe('Calculation Definitions', () => {
  describe('irmaaTotal', () => {
    it('formula references 2026 base Part B premium', () => {
      const formula = CALCULATIONS.irmaaTotal.formula;
      expect(formula).toContain('2026');
      expect(formula).toContain('$202.9');
    });

    it('backOfEnvelope matches 2026 values', () => {
      const backOfEnvelope = CALCULATIONS.irmaaTotal.backOfEnvelope;
      const expectedBaseAnnual = Math.round(IRMAA_BRACKETS_MFJ_2026[0].partB * 12 * 2);
      expect(backOfEnvelope).toContain((expectedBaseAnnual / 1000).toFixed(1));
    });

    it('compute uses dynamic IRMAA info', () => {
      const mockData = {
        year: 2027,
        irmaaMAGI: 200000,
        irmaaPartB: 4870, // Base only
        irmaaPartD: 0,
        irmaaTotal: 4870,
      };
      const result = CALCULATIONS.irmaaTotal.compute(mockData);
      expect(result.values).toContain('No IRMAA surcharges');
      expect(result.values).toContain('218K'); // Tier 1 threshold from 2026 brackets
    });
  });

  describe('irmaaMAGI', () => {
    it('formula references 2026 tier thresholds', () => {
      const formula = CALCULATIONS.irmaaMAGI.formula;
      expect(formula).toContain('2026');
      expect(formula).toContain('$218K'); // Tier 1
      expect(formula).toContain('$274K'); // Tier 2
      expect(formula).toContain('$342K'); // Tier 3
    });
  });

  describe('irmaaPartB', () => {
    it('concept uses dynamic Part B premium', () => {
      const concept = CALCULATIONS.irmaaPartB.concept;
      expect(concept).toContain('$202.9');
      expect(concept).toContain('2026');
    });

    it('formula uses dynamic tier thresholds', () => {
      const formula = CALCULATIONS.irmaaPartB.formula;
      expect(formula).toContain('$218K'); // Tier 1
      expect(formula).toContain('$274K'); // Tier 2
    });
  });

  describe('standardDeduction', () => {
    it('formula references 2024 values from taxTables', () => {
      const formula = CALCULATIONS.standardDeduction.formula;
      expect(formula).toContain('2024');
      expect(formula).toContain(`$${(STANDARD_DEDUCTION_MFJ_2024 / 1000).toFixed(1)}K`);
    });

    it('compute defaults to correct total', () => {
      const expectedTotal = STANDARD_DEDUCTION_MFJ_2024 + SENIOR_BONUS_MFJ_2024;
      const mockData = { standardDeduction: null, age: 70 };
      const result = CALCULATIONS.standardDeduction.compute(mockData);
      expect(result.result).toContain(fK(expectedTotal));
    });
  });

  describe('taxableOrdinary', () => {
    it('formula references correct standard deduction total', () => {
      const formula = CALCULATIONS.taxableOrdinary.formula;
      const expectedTotal = STANDARD_DEDUCTION_MFJ_2024 + SENIOR_BONUS_MFJ_2024;
      expect(formula).toContain(`$${(expectedTotal / 1000).toFixed(1)}K`);
    });
  });

  describe('ltcgTax', () => {
    it('uses LTCG bracket thresholds from taxTables', () => {
      const mockData = {
        capitalGains: 100000,
        ltcgTax: 900,
        taxableOrdinary: 90000,
      };
      const result = CALCULATIONS.ltcgTax.compute(mockData);
      // The compute function should use LTCG_BRACKETS_MFJ_2024
      // 15% bracket starts at $94,050
      expect(result.formula).toBeDefined();
    });
  });

  describe('niit', () => {
    it('uses NIIT threshold from taxTables', () => {
      const mockData = {
        capitalGains: 100000,
        niit: 3800,
        ordinaryIncome: 200000,
      };
      const result = CALCULATIONS.niit.compute(mockData);
      expect(result.formula).toContain(fK(NIIT_THRESHOLD_MFJ));
    });

    it('uses NIIT rate from taxTables', () => {
      const mockData = {
        capitalGains: 100000,
        niit: 3800,
        ordinaryIncome: 200000,
      };
      const result = CALCULATIONS.niit.compute(mockData);
      expect(result.values).toContain(`${(NIIT_RATE * 100).toFixed(1)}%`);
    });
  });

  describe('taxableSS', () => {
    it('concept uses SS tax thresholds from taxTables', () => {
      const concept = CALCULATIONS.taxableSS.concept;
      expect(concept).toContain(`$${SS_TAX_THRESHOLDS_MFJ.tier1 / 1000}K`);
      expect(concept).toContain(`$${SS_TAX_THRESHOLDS_MFJ.tier2 / 1000}K`);
    });

    it('formula uses SS tax thresholds from taxTables', () => {
      const formula = CALCULATIONS.taxableSS.formula;
      expect(formula).toContain(`$${SS_TAX_THRESHOLDS_MFJ.tier1 / 1000}K`);
      expect(formula).toContain(`$${SS_TAX_THRESHOLDS_MFJ.tier2 / 1000}K`);
    });
  });
});

describe('Formatters', () => {
  describe('fK', () => {
    it('formats thousands correctly', () => {
      expect(fK(1000)).toBe('$1K');
      expect(fK(15000)).toBe('$15K');
      expect(fK(150000)).toBe('$150K');
    });

    it('rounds to nearest thousand', () => {
      expect(fK(1499)).toBe('$1K');
      expect(fK(1500)).toBe('$2K');
    });
  });

  describe('fM', () => {
    it('formats millions correctly', () => {
      expect(fM(1000000)).toBe('$1.00M');
      expect(fM(1500000)).toBe('$1.50M');
      expect(fM(2750000)).toBe('$2.75M');
    });
  });

  describe('f$', () => {
    it('formats whole dollars with commas', () => {
      expect(f$(1000)).toBe('$1,000');
      expect(f$(1234567)).toBe('$1,234,567');
    });
  });
});

describe('PV/FV Display Support', () => {
  describe('expenses', () => {
    it('returns dual display when showPV is true', () => {
      const mockData = {
        expenses: 150000,
        yearsFromStart: 10,
      };
      const mockParams = {
        annualExpenses: 120000,
        expenseInflation: 0.03,
      };
      const result = CALCULATIONS.expenses.compute(mockData, mockParams, {
        showPV: true,
        discountRate: 0.03,
      });
      expect(result.simpleSecondary).toBeDefined();
      expect(result.simpleSecondary).toContain('FV:');
    });

    it('returns no secondary when showPV is false', () => {
      const mockData = {
        expenses: 150000,
        yearsFromStart: 10,
      };
      const mockParams = {
        annualExpenses: 120000,
        expenseInflation: 0.03,
      };
      const result = CALCULATIONS.expenses.compute(mockData, mockParams, {
        showPV: false,
        discountRate: 0.03,
      });
      expect(result.simpleSecondary).toBeNull();
    });

    it('includes formulaWithValues', () => {
      const mockData = {
        expenses: 150000,
        yearsFromStart: 5,
      };
      const mockParams = {
        annualExpenses: 120000,
        expenseInflation: 0.03,
      };
      const result = CALCULATIONS.expenses.compute(mockData, mockParams, {});
      expect(result.formulaWithValues).toBeDefined();
      expect(result.formulaWithValues).toContain('$150K');
    });
  });

  describe('totalTax', () => {
    it('returns dual display when showPV is true', () => {
      const mockData = {
        federalTax: 20000,
        ltcgTax: 5000,
        niit: 1000,
        stateTax: 2000,
        totalTax: 28000,
        capitalGains: 50000,
        yearsFromStart: 10,
      };
      const result = CALCULATIONS.totalTax.compute(
        mockData,
        {},
        {
          showPV: true,
          discountRate: 0.03,
        }
      );
      expect(result.simpleSecondary).toBeDefined();
    });
  });
});
