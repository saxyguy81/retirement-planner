import { describe, it, expect } from 'vitest';

import {
  FEDERAL_BRACKETS_MFJ_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
  LTCG_BRACKETS_MFJ_2024,
  LTCG_BRACKETS_SINGLE_2024,
  IRMAA_BRACKETS_MFJ_2024,
  IRMAA_BRACKETS_SINGLE_2024,
  RMD_TABLE,
  RMD_START_AGE,
  STANDARD_DEDUCTION_MFJ_2024,
  STANDARD_DEDUCTION_SINGLE_2024,
  NIIT_RATE,
  NIIT_THRESHOLD_MFJ,
  NIIT_THRESHOLD_SINGLE,
  SS_TAX_THRESHOLDS_MFJ,
  SS_TAX_THRESHOLDS_SINGLE,
  inflateBrackets,
  inflateIRMAA,
  DEFAULT_PARAMS,
} from './taxTables';

describe('Federal Tax Bracket Structure', () => {
  describe('MFJ Brackets', () => {
    it('has 7 brackets', () => {
      expect(FEDERAL_BRACKETS_MFJ_2024).toHaveLength(7);
    });

    it('starts at 0 threshold', () => {
      expect(FEDERAL_BRACKETS_MFJ_2024[0].threshold).toBe(0);
      expect(FEDERAL_BRACKETS_MFJ_2024[0].rate).toBe(0.1);
    });

    it('ends at 37% rate', () => {
      const lastBracket = FEDERAL_BRACKETS_MFJ_2024[FEDERAL_BRACKETS_MFJ_2024.length - 1];
      expect(lastBracket.rate).toBe(0.37);
    });

    it('has thresholds in ascending order', () => {
      for (let i = 1; i < FEDERAL_BRACKETS_MFJ_2024.length; i++) {
        expect(FEDERAL_BRACKETS_MFJ_2024[i].threshold).toBeGreaterThan(
          FEDERAL_BRACKETS_MFJ_2024[i - 1].threshold
        );
      }
    });

    it('has rates in ascending order', () => {
      for (let i = 1; i < FEDERAL_BRACKETS_MFJ_2024.length; i++) {
        expect(FEDERAL_BRACKETS_MFJ_2024[i].rate).toBeGreaterThan(
          FEDERAL_BRACKETS_MFJ_2024[i - 1].rate
        );
      }
    });

    it('matches 2024 IRS brackets', () => {
      expect(FEDERAL_BRACKETS_MFJ_2024).toMatchSnapshot('federal-mfj-2024');
    });
  });

  describe('Single Brackets', () => {
    it('has 7 brackets', () => {
      expect(FEDERAL_BRACKETS_SINGLE_2024).toHaveLength(7);
    });

    it('has thresholds approximately half of MFJ', () => {
      // 12% bracket comparison
      const mfj12 = FEDERAL_BRACKETS_MFJ_2024[1].threshold;
      const single12 = FEDERAL_BRACKETS_SINGLE_2024[1].threshold;
      expect(single12).toBeWithinPercent(mfj12 / 2, 0.05);
    });

    it('matches 2024 IRS brackets', () => {
      expect(FEDERAL_BRACKETS_SINGLE_2024).toMatchSnapshot('federal-single-2024');
    });
  });
});

describe('LTCG Bracket Structure', () => {
  it('MFJ has 3 brackets (0%, 15%, 20%)', () => {
    expect(LTCG_BRACKETS_MFJ_2024).toHaveLength(3);
    expect(LTCG_BRACKETS_MFJ_2024[0].rate).toBe(0.0);
    expect(LTCG_BRACKETS_MFJ_2024[1].rate).toBe(0.15);
    expect(LTCG_BRACKETS_MFJ_2024[2].rate).toBe(0.2);
  });

  it('Single has 3 brackets', () => {
    expect(LTCG_BRACKETS_SINGLE_2024).toHaveLength(3);
  });

  it('Single thresholds are approximately half of MFJ', () => {
    expect(LTCG_BRACKETS_SINGLE_2024[1].threshold).toBeWithinPercent(
      LTCG_BRACKETS_MFJ_2024[1].threshold / 2,
      0.05
    );
  });
});

describe('RMD Table', () => {
  it('RMD starts at age 73', () => {
    expect(RMD_START_AGE).toBe(73);
  });

  it('covers ages 72-120', () => {
    expect(RMD_TABLE[72]).toBeDefined();
    expect(RMD_TABLE[120]).toBeDefined();
  });

  it('has decreasing factors with age (higher RMD percentage)', () => {
    expect(RMD_TABLE[73]).toBeGreaterThan(RMD_TABLE[80]);
    expect(RMD_TABLE[80]).toBeGreaterThan(RMD_TABLE[90]);
    expect(RMD_TABLE[90]).toBeGreaterThan(RMD_TABLE[100]);
  });

  it('age 73 factor is 26.5', () => {
    expect(RMD_TABLE[73]).toBe(26.5);
  });

  it('age 75 factor is 24.6', () => {
    expect(RMD_TABLE[75]).toBe(24.6);
  });

  it('extreme age 120 factor is 2.0', () => {
    expect(RMD_TABLE[120]).toBe(2.0);
  });
});

describe('IRMAA Brackets', () => {
  it('MFJ has 6 brackets', () => {
    expect(IRMAA_BRACKETS_MFJ_2024).toHaveLength(6);
  });

  it('base Part B premium is $202.90 (2026)', () => {
    expect(IRMAA_BRACKETS_MFJ_2024[0].partB).toBe(202.9);
  });

  it('base Part D has no surcharge', () => {
    expect(IRMAA_BRACKETS_MFJ_2024[0].partD).toBe(0);
  });

  it('has increasing thresholds', () => {
    for (let i = 1; i < IRMAA_BRACKETS_MFJ_2024.length; i++) {
      expect(IRMAA_BRACKETS_MFJ_2024[i].threshold).toBeGreaterThan(
        IRMAA_BRACKETS_MFJ_2024[i - 1].threshold
      );
    }
  });

  it('matches 2024 CMS brackets', () => {
    expect(IRMAA_BRACKETS_MFJ_2024).toMatchSnapshot('irmaa-mfj-2024');
  });
});

describe('Standard Deductions', () => {
  it('MFJ deduction is $29,200 in 2024', () => {
    expect(STANDARD_DEDUCTION_MFJ_2024).toBe(29200);
  });

  it('Single deduction is $14,600 in 2024', () => {
    expect(STANDARD_DEDUCTION_SINGLE_2024).toBe(14600);
  });

  it('Single is approximately half of MFJ', () => {
    expect(STANDARD_DEDUCTION_SINGLE_2024).toBeWithinPercent(STANDARD_DEDUCTION_MFJ_2024 / 2, 0.01);
  });
});

describe('NIIT Constants', () => {
  it('NIIT rate is 3.8%', () => {
    expect(NIIT_RATE).toBe(0.038);
  });

  it('MFJ threshold is $250,000', () => {
    expect(NIIT_THRESHOLD_MFJ).toBe(250000);
  });

  it('Single threshold is $200,000', () => {
    expect(NIIT_THRESHOLD_SINGLE).toBe(200000);
  });
});

describe('Social Security Tax Thresholds', () => {
  it('MFJ tier1 is $32,000', () => {
    expect(SS_TAX_THRESHOLDS_MFJ.tier1).toBe(32000);
  });

  it('MFJ tier2 is $44,000', () => {
    expect(SS_TAX_THRESHOLDS_MFJ.tier2).toBe(44000);
  });

  it('Single tier1 is $25,000', () => {
    expect(SS_TAX_THRESHOLDS_SINGLE.tier1).toBe(25000);
  });

  it('Single tier2 is $34,000', () => {
    expect(SS_TAX_THRESHOLDS_SINGLE.tier2).toBe(34000);
  });
});

describe('inflateBrackets', () => {
  it('inflates thresholds by correct factor', () => {
    const inflated = inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, 0.03, 1);

    // First bracket threshold should still be 0
    expect(inflated[0].threshold).toBe(0);

    // Second bracket should be inflated by 3%
    const expectedThreshold = Math.round(FEDERAL_BRACKETS_MFJ_2024[1].threshold * 1.03);
    expect(inflated[1].threshold).toBe(expectedThreshold);
  });

  it('preserves rates', () => {
    const inflated = inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, 0.03, 5);

    inflated.forEach((bracket, i) => {
      expect(bracket.rate).toBe(FEDERAL_BRACKETS_MFJ_2024[i].rate);
    });
  });

  it('compounds inflation over multiple years', () => {
    const inflated = inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, 0.03, 10);
    const factor = Math.pow(1.03, 10);

    const expectedThreshold = Math.round(FEDERAL_BRACKETS_MFJ_2024[1].threshold * factor);
    expect(inflated[1].threshold).toBe(expectedThreshold);
  });

  it('handles 0 years (no inflation)', () => {
    const inflated = inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, 0.03, 0);

    expect(inflated).toEqual(FEDERAL_BRACKETS_MFJ_2024);
  });
});

describe('inflateIRMAA', () => {
  it('inflates thresholds but keeps premiums fixed', () => {
    const inflated = inflateIRMAA(IRMAA_BRACKETS_MFJ_2024, 0.03, 1);

    // Premiums should be unchanged (2026 base: $202.90)
    expect(inflated[0].partB).toBe(202.9);
    expect(inflated[0].partD).toBe(0);

    // Thresholds should be inflated (except 0)
    const expectedThreshold = Math.round(IRMAA_BRACKETS_MFJ_2024[1].threshold * 1.03);
    expect(inflated[1].threshold).toBe(expectedThreshold);
  });
});

describe('DEFAULT_PARAMS', () => {
  it('has all required parameters', () => {
    const requiredKeys = [
      'startYear',
      'endYear',
      'birthYear',
      'afterTaxStart',
      'iraStart',
      'rothStart',
      'socialSecurityMonthly',
      'annualExpenses',
      'expenseInflation',
      'heirFedRate',
      'heirStateRate',
    ];

    requiredKeys.forEach(key => {
      expect(DEFAULT_PARAMS).toHaveProperty(key);
    });
  });

  it('has valid year range', () => {
    expect(DEFAULT_PARAMS.endYear).toBeGreaterThan(DEFAULT_PARAMS.startYear);
  });

  it('has reasonable defaults', () => {
    // Check bracketInflation is a reasonable rate
    expect(DEFAULT_PARAMS.bracketInflation).toBeGreaterThan(0);
    expect(DEFAULT_PARAMS.bracketInflation).toBeLessThan(0.1);
    // Check expense inflation is reasonable
    expect(DEFAULT_PARAMS.expenseInflation).toBeGreaterThan(0);
    expect(DEFAULT_PARAMS.expenseInflation).toBeLessThan(0.1);
  });

  it('matches baseline', () => {
    expect(DEFAULT_PARAMS).toMatchSnapshot('default-params');
  });
});
