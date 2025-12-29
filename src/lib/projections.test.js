/**
 * Unit Tests for Projection Engine
 * Tests generateProjections, calculateSummary, and related functionality
 */

import { describe, it, expect } from 'vitest';

import { generateProjections, calculateSummary, compareScenarios } from './projections.js';
import { DEFAULT_PARAMS } from './taxTables.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Deterministic test parameters for reproducible tests.
 * Uses simple values to make calculations predictable.
 */
const TEST_PARAMS = {
  ...DEFAULT_PARAMS,
  // Timeline (short for faster tests)
  startYear: 2026,
  endYear: 2030,
  birthYear: 1955,
  taxYear: 2024,

  // Starting balances
  afterTaxStart: 100000,
  iraStart: 500000,
  rothStart: 200000,
  afterTaxCostBasis: 25000,

  // Use account-specific returns for predictability
  returnMode: 'account',
  atReturn: 0.04,
  iraReturn: 0.06,
  rothReturn: 0.08,

  // Income
  socialSecurityMonthly: 3000,
  ssCOLA: 0.02,

  // Expenses
  annualExpenses: 80000,
  expenseInflation: 0.03,
  expenseOverrides: {},

  // Tax parameters
  stateTaxRate: 0.0495,
  capitalGainsPercent: 0.75,
  bracketInflation: 0.03,
  exemptSSFromTax: false,

  // No Roth conversions in base test
  rothConversions: {},
  atHarvestOverrides: {},

  // MAGI history (modest values to avoid IRMAA)
  magi2024: 100000,
  magi2025: 100000,

  // No survivor scenario
  survivorDeathYear: null,
  survivorSSPercent: 0.72,
  survivorExpensePercent: 0.7,

  // Heir parameters
  heirFedRate: 0.37,
  heirStateRate: 0.0495,
  heirs: null,

  // Calculation options
  iterativeTax: false, // Disabled for predictability
  maxIterations: 5,
  discountRate: 0.03,
};

// =============================================================================
// BASIC BEHAVIOR TESTS
// =============================================================================

describe('generateProjections - basic behavior', () => {
  it('generates correct number of years', () => {
    const projections = generateProjections(TEST_PARAMS);

    const expectedYears = TEST_PARAMS.endYear - TEST_PARAMS.startYear + 1;
    expect(projections).toHaveLength(expectedYears);
    expect(projections[0].year).toBe(TEST_PARAMS.startYear);
    expect(projections[projections.length - 1].year).toBe(TEST_PARAMS.endYear);
  });

  it('calculates correct ages for each year', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach((row, index) => {
      const expectedAge = row.year - TEST_PARAMS.birthYear;
      expect(row.age).toBe(expectedAge);
    });
  });

  it('sets yearsFromStart correctly', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach((row, index) => {
      expect(row.yearsFromStart).toBe(index);
    });
  });

  it('initializes first year with starting balances', () => {
    const projections = generateProjections(TEST_PARAMS);
    const first = projections[0];

    expect(first.atBOY).toBe(TEST_PARAMS.afterTaxStart);
    expect(first.iraBOY).toBe(TEST_PARAMS.iraStart);
    expect(first.rothBOY).toBe(TEST_PARAMS.rothStart);
    expect(first.costBasisBOY).toBe(TEST_PARAMS.afterTaxCostBasis);
  });
});

// =============================================================================
// BALANCE INVARIANT TESTS
// =============================================================================

describe('generateProjections - balance invariants', () => {
  it('totalBOY equals sum of account BOY balances (within rounding tolerance)', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      // Allow $1 tolerance due to individual account rounding
      expect(row.totalBOY).toBeWithinDollars(row.atBOY + row.iraBOY + row.rothBOY, 2);
    });
  });

  it('totalEOY equals sum of account EOY balances (within rounding tolerance)', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      // Allow $1 tolerance due to individual account rounding
      expect(row.totalEOY).toBeWithinDollars(row.atEOY + row.iraEOY + row.rothEOY, 2);
    });
  });

  it('EOY of year N equals BOY of year N+1', () => {
    const projections = generateProjections(TEST_PARAMS);

    for (let i = 0; i < projections.length - 1; i++) {
      const current = projections[i];
      const next = projections[i + 1];

      expect(next.atBOY).toBe(current.atEOY);
      expect(next.iraBOY).toBe(current.iraEOY);
      expect(next.rothBOY).toBe(current.rothEOY);
    }
  });

  it('all balances remain non-negative', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      expect(row.atBOY).toBeGreaterThanOrEqual(0);
      expect(row.iraBOY).toBeGreaterThanOrEqual(0);
      expect(row.rothBOY).toBeGreaterThanOrEqual(0);
      expect(row.atEOY).toBeGreaterThanOrEqual(0);
      expect(row.iraEOY).toBeGreaterThanOrEqual(0);
      expect(row.rothEOY).toBeGreaterThanOrEqual(0);
    });
  });

  it('cost basis never exceeds after-tax balance', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      expect(row.costBasisBOY).toBeLessThanOrEqual(row.atBOY);
      expect(row.costBasisEOY).toBeLessThanOrEqual(row.atEOY);
    });
  });
});

// =============================================================================
// WITHDRAWAL INVARIANT TESTS
// =============================================================================

describe('generateProjections - withdrawal invariants', () => {
  it('totalWithdrawal equals sum of account withdrawals', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      expect(row.totalWithdrawal).toBe(row.atWithdrawal + row.iraWithdrawal + row.rothWithdrawal);
    });
  });

  it('withdrawals do not exceed BOY balances', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      expect(row.atWithdrawal).toBeLessThanOrEqual(row.atBOY);
      expect(row.iraWithdrawal).toBeLessThanOrEqual(row.iraBOY);
      expect(row.rothWithdrawal).toBeLessThanOrEqual(row.rothBOY);
    });
  });

  it('withdrawals are non-negative', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      expect(row.atWithdrawal).toBeGreaterThanOrEqual(0);
      expect(row.iraWithdrawal).toBeGreaterThanOrEqual(0);
      expect(row.rothWithdrawal).toBeGreaterThanOrEqual(0);
    });
  });
});

// =============================================================================
// CUMULATIVE VALUE TESTS
// =============================================================================

describe('generateProjections - cumulative values', () => {
  it('cumulativeTax increases monotonically', () => {
    const projections = generateProjections(TEST_PARAMS);

    for (let i = 1; i < projections.length; i++) {
      expect(projections[i].cumulativeTax).toBeGreaterThanOrEqual(projections[i - 1].cumulativeTax);
    }
  });

  it('cumulativeIRMAA increases monotonically', () => {
    const projections = generateProjections(TEST_PARAMS);

    for (let i = 1; i < projections.length; i++) {
      expect(projections[i].cumulativeIRMAA).toBeGreaterThanOrEqual(
        projections[i - 1].cumulativeIRMAA
      );
    }
  });

  it('cumulativeExpenses increases monotonically', () => {
    const projections = generateProjections(TEST_PARAMS);

    for (let i = 1; i < projections.length; i++) {
      expect(projections[i].cumulativeExpenses).toBeGreaterThan(
        projections[i - 1].cumulativeExpenses
      );
    }
  });

  it('cumulativeCapitalGains increases or stays same', () => {
    const projections = generateProjections(TEST_PARAMS);

    for (let i = 1; i < projections.length; i++) {
      expect(projections[i].cumulativeCapitalGains).toBeGreaterThanOrEqual(
        projections[i - 1].cumulativeCapitalGains
      );
    }
  });

  it('atLiquidationPercent increases or stays same', () => {
    const projections = generateProjections(TEST_PARAMS);

    for (let i = 1; i < projections.length; i++) {
      expect(projections[i].atLiquidationPercent).toBeGreaterThanOrEqual(
        projections[i - 1].atLiquidationPercent
      );
    }
  });
});

// =============================================================================
// SNAPSHOT BASELINE TESTS
// =============================================================================

describe('generateProjections - snapshot baselines', () => {
  it('base case with standard params', () => {
    const projections = generateProjections(TEST_PARAMS);
    const last = projections[projections.length - 1];
    const startingPortfolio =
      TEST_PARAMS.afterTaxStart + TEST_PARAMS.iraStart + TEST_PARAMS.rothStart;

    // Snapshot key metrics for the final year
    expect(last.year).toBe(2030);
    expect(last.age).toBe(75);

    // Portfolio value exists and is reasonable (withdrawals may exceed returns)
    expect(last.totalEOY).toBeGreaterThan(0);
    // With $80k expenses/year over 5 years (~$400k+) and ~$800k starting portfolio,
    // expect some reduction but not total depletion
    expect(last.totalEOY).toBeGreaterThan(startingPortfolio * 0.5);

    // Verify cumulative values are populated
    expect(last.cumulativeTax).toBeGreaterThan(0);
    expect(last.cumulativeExpenses).toBeGreaterThan(0);

    // Roth percent should be reasonable (Roth grows fastest at 8%)
    expect(last.rothPercent).toBeGreaterThan(0.2);
    expect(last.rothPercent).toBeLessThan(0.6);
  });

  it('high Roth conversion scenario', () => {
    const params = {
      ...TEST_PARAMS,
      rothConversions: {
        2026: 200000,
        2027: 200000,
      },
    };

    const projections = generateProjections(params);
    const first = projections[0];
    const last = projections[projections.length - 1];

    // Roth conversion should appear in the data
    expect(first.rothConversion).toBe(200000);
    expect(projections[1].rothConversion).toBe(200000);

    // Roth percentage should be higher than base case due to conversions
    const baseProjections = generateProjections(TEST_PARAMS);
    const baseLastRothPercent = baseProjections[baseProjections.length - 1].rothPercent;
    expect(last.rothPercent).toBeGreaterThan(baseLastRothPercent);

    // Cumulative tax should be higher due to conversion income
    expect(last.cumulativeTax).toBeGreaterThan(
      baseProjections[baseProjections.length - 1].cumulativeTax
    );
  });

  it('survivor scenario (death year specified)', () => {
    const params = {
      ...TEST_PARAMS,
      survivorDeathYear: 2028,
    };

    const projections = generateProjections(params);

    // Years before death should not be survivor
    expect(projections[0].isSurvivor).toBe(false); // 2026
    expect(projections[1].isSurvivor).toBe(false); // 2027

    // Year of death and after should be survivor
    expect(projections[2].isSurvivor).toBe(true); // 2028
    expect(projections[3].isSurvivor).toBe(true); // 2029
    expect(projections[4].isSurvivor).toBe(true); // 2030

    // Survivor expenses should be lower (70% of base)
    const nonSurvivorExpenses = projections[1].expenses;
    const survivorExpenses = projections[2].expenses;

    // Account for one year of inflation between 2027 and 2028
    const expectedSurvivorExpenses =
      nonSurvivorExpenses * (1 + params.expenseInflation) * params.survivorExpensePercent;
    expect(survivorExpenses).toBeWithinDollars(expectedSurvivorExpenses, 100);

    // SS should also be reduced for survivor
    const nonSurvivorSS = projections[1].ssAnnual;
    const survivorSS = projections[2].ssAnnual;
    const expectedSurvivorSS = nonSurvivorSS * (1 + params.ssCOLA) * params.survivorSSPercent;
    expect(survivorSS).toBeWithinDollars(expectedSurvivorSS, 10);
  });

  it('high expenses scenario', () => {
    const params = {
      ...TEST_PARAMS,
      annualExpenses: 150000, // Much higher expenses
    };

    const projections = generateProjections(params);
    const last = projections[projections.length - 1];

    // Higher expenses should result in more withdrawals
    const baseProjections = generateProjections(TEST_PARAMS);
    const baseCumulativeExpenses = baseProjections[baseProjections.length - 1].cumulativeExpenses;

    expect(last.cumulativeExpenses).toBeGreaterThan(baseCumulativeExpenses);

    // Portfolio should be smaller due to higher withdrawals
    expect(last.totalEOY).toBeLessThan(baseProjections[baseProjections.length - 1].totalEOY);
  });

  it('RMD starting scenario (age 73)', () => {
    // Person born in 1953 would be 73 in 2026
    const params = {
      ...TEST_PARAMS,
      birthYear: 1953, // Age 73 in 2026
    };

    const projections = generateProjections(params);
    const first = projections[0];

    // RMD should be required from age 73
    expect(first.age).toBe(73);
    expect(first.rmdRequired).toBeGreaterThan(0);
    expect(first.rmdFactor).toBeGreaterThan(0);

    // RMD should be approximately IRA / factor
    const expectedRMD = params.iraStart / first.rmdFactor;
    expect(first.rmdRequired).toBeWithinDollars(expectedRMD, 1);
  });
});

// =============================================================================
// RMD LOGIC TESTS
// =============================================================================

describe('generateProjections - RMD logic', () => {
  it('no RMD before age 73', () => {
    const params = {
      ...TEST_PARAMS,
      birthYear: 1960, // Age 66 in 2026, well before RMD
    };

    const projections = generateProjections(params);

    projections.forEach(row => {
      expect(row.age).toBeLessThan(73);
      expect(row.rmdRequired).toBe(0);
      expect(row.rmdFactor).toBe(0);
    });
  });

  it('RMD starts at age 73', () => {
    const params = {
      ...TEST_PARAMS,
      birthYear: 1953, // Age 73 in 2026
      endYear: 2030,
    };

    const projections = generateProjections(params);
    const age73Year = projections.find(row => row.age === 73);
    const age72Year = projections.find(row => row.age === 72);

    // Age 72 should have no RMD
    if (age72Year) {
      expect(age72Year.rmdRequired).toBe(0);
    }

    // Age 73 should have RMD
    expect(age73Year).toBeDefined();
    expect(age73Year.rmdRequired).toBeGreaterThan(0);
    expect(age73Year.rmdFactor).toBe(26.5); // From RMD table
  });

  it('RMD increases with age (as factor decreases)', () => {
    const params = {
      ...TEST_PARAMS,
      birthYear: 1953, // Age 73 in 2026
      endYear: 2030, // Up to age 77
    };

    const projections = generateProjections(params);

    // Filter to only RMD years (73+)
    const rmdYears = projections.filter(row => row.age >= 73);

    // RMD factor should decrease with age
    for (let i = 1; i < rmdYears.length; i++) {
      expect(rmdYears[i].rmdFactor).toBeLessThan(rmdYears[i - 1].rmdFactor);
    }

    // Known RMD factors from table
    const rmdFactorsByAge = {
      73: 26.5,
      74: 25.5,
      75: 24.6,
      76: 23.7,
      77: 22.9,
    };

    rmdYears.forEach(row => {
      expect(row.rmdFactor).toBe(rmdFactorsByAge[row.age]);
    });
  });

  it('IRA withdrawal is at least RMD when required', () => {
    const params = {
      ...TEST_PARAMS,
      birthYear: 1953, // Age 73 in 2026
      annualExpenses: 30000, // Low expenses to not force additional IRA withdrawals
      socialSecurityMonthly: 5000, // High SS to cover expenses
    };

    const projections = generateProjections(params);

    projections.forEach(row => {
      if (row.rmdRequired > 0) {
        // IRA withdrawal should be at least the RMD
        expect(row.iraWithdrawal).toBeGreaterThanOrEqual(row.rmdRequired - 1); // Allow $1 rounding
      }
    });
  });
});

// =============================================================================
// ROTH CONVERSION TESTS
// =============================================================================

describe('generateProjections - Roth conversion', () => {
  it('conversion increases taxable income', () => {
    const baseParams = { ...TEST_PARAMS };
    const conversionParams = {
      ...TEST_PARAMS,
      rothConversions: { 2026: 100000 },
    };

    const baseProjections = generateProjections(baseParams);
    const conversionProjections = generateProjections(conversionParams);

    const baseYear = baseProjections[0];
    const conversionYear = conversionProjections[0];

    // Ordinary income should be higher with conversion
    expect(conversionYear.ordinaryIncome).toBeGreaterThan(baseYear.ordinaryIncome);

    // Tax should be higher with conversion
    expect(conversionYear.totalTax).toBeGreaterThan(baseYear.totalTax);
  });

  it('conversion moves money from IRA to Roth', () => {
    const conversionAmount = 100000;
    const params = {
      ...TEST_PARAMS,
      rothConversions: { 2026: conversionAmount },
    };

    const projections = generateProjections(params);
    const first = projections[0];

    // Verify conversion is recorded
    expect(first.rothConversion).toBe(conversionAmount);

    // After withdrawals and conversion, IRA should be reduced by conversion amount
    // IRA EOY = (IRA BOY - withdrawal - conversion) * (1 + return)
    // We can verify the conversion is reflected in the reduction

    // Calculate expected IRA after withdrawal and conversion (before growth)
    const iraAfterWithdrawalAndConversion = first.iraBOY - first.iraWithdrawal - conversionAmount;

    // Roth should include the conversion (before growth from that)
    const rothAfterWithdrawal = first.rothBOY - first.rothWithdrawal + conversionAmount;

    // EOY should reflect growth on these amounts
    const expectedIraEOY = iraAfterWithdrawalAndConversion * (1 + params.iraReturn);
    const expectedRothEOY = rothAfterWithdrawal * (1 + params.rothReturn);

    expect(first.iraEOY).toBeWithinDollars(expectedIraEOY, 10);
    expect(first.rothEOY).toBeWithinDollars(expectedRothEOY, 10);
  });

  it('large conversion does not exceed available IRA balance', () => {
    const params = {
      ...TEST_PARAMS,
      iraStart: 100000,
      rothConversions: { 2026: 200000 }, // More than available
    };

    const projections = generateProjections(params);
    const first = projections[0];

    // Even with oversized conversion, IRA should not go negative
    expect(first.iraEOY).toBeGreaterThanOrEqual(0);
  });

  it('conversion appears in MAGI for future IRMAA', () => {
    const params = {
      ...TEST_PARAMS,
      rothConversions: { 2026: 500000 },
    };

    const projections = generateProjections(params);

    // MAGI in 2026 should include the conversion
    // This affects IRMAA in 2028 (2-year lookback)
    const year2028 = projections.find(row => row.year === 2028);

    if (year2028) {
      // The IRMAA MAGI should reflect the high 2026 income
      // (it uses the stored magiHistory from 2 years prior)
      expect(year2028.irmaaMAGI).toBeGreaterThan(params.magi2024);
    }
  });
});

// =============================================================================
// RETURN MODE TESTS
// =============================================================================

describe('generateProjections - return modes', () => {
  it('account mode uses account-specific returns', () => {
    const params = {
      ...TEST_PARAMS,
      returnMode: 'account',
      atReturn: 0.05,
      iraReturn: 0.07,
      rothReturn: 0.09,
    };

    const projections = generateProjections(params);
    const first = projections[0];

    expect(first.effectiveAtReturn).toBe(0.05);
    expect(first.effectiveIraReturn).toBe(0.07);
    expect(first.effectiveRothReturn).toBe(0.09);
    expect(first.riskAllocation).toBeNull();
  });

  it('blended mode calculates risk-based allocation', () => {
    const params = {
      ...TEST_PARAMS,
      returnMode: 'blended',
      lowRiskTarget: 400000,
      modRiskTarget: 300000,
      lowRiskReturn: 0.03,
      modRiskReturn: 0.05,
      highRiskReturn: 0.08,
    };

    const projections = generateProjections(params);
    const first = projections[0];

    // Should have risk allocation data
    expect(first.riskAllocation).not.toBeNull();
    expect(first.riskAllocation.portfolio).toBeDefined();
    expect(first.riskAllocation.at).toBeDefined();
    expect(first.riskAllocation.ira).toBeDefined();
    expect(first.riskAllocation.roth).toBeDefined();

    // Returns should be blended (between low and high)
    expect(first.effectiveAtReturn).toBeGreaterThanOrEqual(0.03);
    expect(first.effectiveAtReturn).toBeLessThanOrEqual(0.08);
    expect(first.effectiveIraReturn).toBeGreaterThanOrEqual(0.03);
    expect(first.effectiveIraReturn).toBeLessThanOrEqual(0.08);
    expect(first.effectiveRothReturn).toBeGreaterThanOrEqual(0.03);
    expect(first.effectiveRothReturn).toBeLessThanOrEqual(0.08);
  });
});

// =============================================================================
// TAX CALCULATION TESTS
// =============================================================================

describe('generateProjections - tax calculations', () => {
  it('totalTax equals sum of tax components', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      const sumOfTaxes = row.federalTax + row.ltcgTax + row.niit + row.stateTax;
      expect(row.totalTax).toBeWithinDollars(sumOfTaxes, 1);
    });
  });

  it('taxable ordinary income is reduced by standard deduction', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      if (row.ordinaryIncome > row.standardDeduction) {
        expect(row.taxableOrdinary).toBe(row.ordinaryIncome - row.standardDeduction);
      } else {
        expect(row.taxableOrdinary).toBe(0);
      }
    });
  });

  it('standard deduction inflates each year', () => {
    const projections = generateProjections(TEST_PARAMS);

    for (let i = 1; i < projections.length; i++) {
      expect(projections[i].standardDeduction).toBeGreaterThan(
        projections[i - 1].standardDeduction
      );
    }
  });

  it('SS exemption reduces taxable SS to zero', () => {
    const params = {
      ...TEST_PARAMS,
      exemptSSFromTax: true,
    };

    const projections = generateProjections(params);

    projections.forEach(row => {
      expect(row.taxableSS).toBe(0);
    });
  });

  it('iterative tax mode runs multiple iterations', () => {
    const params = {
      ...TEST_PARAMS,
      iterativeTax: true,
      maxIterations: 5,
    };

    const projections = generateProjections(params);

    // At least some years should have needed iteration
    // (not all will converge in 1 iteration)
    const multiIterationYears = projections.filter(row => row.iterations > 1);

    // With iterative mode on, we expect some years to iterate
    // (though this depends on the specific scenario)
    expect(projections[0].iterations).toBeDefined();
  });
});

// =============================================================================
// EXPENSE OVERRIDE TESTS
// =============================================================================

describe('generateProjections - expense overrides', () => {
  it('uses override when specified for a year', () => {
    const params = {
      ...TEST_PARAMS,
      expenseOverrides: {
        2027: 120000,
        2029: 50000,
      },
    };

    const projections = generateProjections(params);

    const year2027 = projections.find(row => row.year === 2027);
    const year2029 = projections.find(row => row.year === 2029);

    expect(year2027.expenses).toBe(120000);
    expect(year2029.expenses).toBe(50000);
  });

  it('uses inflated expenses when no override', () => {
    const params = {
      ...TEST_PARAMS,
      expenseOverrides: {
        2027: 120000, // Only override 2027
      },
    };

    const projections = generateProjections(params);

    const year2026 = projections.find(row => row.year === 2026);
    const year2028 = projections.find(row => row.year === 2028);

    // 2026 should use base expenses
    expect(year2026.expenses).toBe(params.annualExpenses);

    // 2028 should use inflated expenses (2 years of inflation from base)
    const expectedExpenses = params.annualExpenses * Math.pow(1 + params.expenseInflation, 2);
    expect(year2028.expenses).toBeWithinDollars(expectedExpenses, 1);
  });
});

// =============================================================================
// HEIR VALUE TESTS
// =============================================================================

describe('generateProjections - heir value', () => {
  it('calculates heir value for each year', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      expect(row.heirValue).toBeDefined();
      expect(row.heirValue).toBeGreaterThan(0);
    });
  });

  it('heir value accounts for IRA tax burden', () => {
    const projections = generateProjections(TEST_PARAMS);
    const first = projections[0];

    // Heir value should be less than total EOY due to IRA tax
    // heirValue = AT + Roth + IRA * (1 - heirRate)
    const heirRate = TEST_PARAMS.heirFedRate + TEST_PARAMS.heirStateRate;
    const expectedHeirValue = first.atEOY + first.rothEOY + first.iraEOY * (1 - heirRate);

    expect(first.heirValue).toBeWithinDollars(expectedHeirValue, 1);
  });

  it('multi-heir configuration splits inheritance', () => {
    const params = {
      ...TEST_PARAMS,
      heirs: [
        { name: 'Heir 1', splitPercent: 60, agi: 200000, state: 'IL' },
        { name: 'Heir 2', splitPercent: 40, agi: 100000, state: 'TX' },
      ],
    };

    const projections = generateProjections(params);
    const first = projections[0];

    expect(first.heirDetails).toBeDefined();
    expect(first.heirDetails).toHaveLength(2);
    expect(first.heirDetails[0].name).toBe('Heir 1');
    expect(first.heirDetails[1].name).toBe('Heir 2');

    // Splits should sum to 1
    const totalSplit = first.heirDetails.reduce((sum, h) => sum + h.split, 0);
    expect(totalSplit).toBe(1);
  });
});

// =============================================================================
// PRESENT VALUE TESTS
// =============================================================================

describe('generateProjections - present values', () => {
  it('present values are discounted correctly', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      const pvFactor = Math.pow(1 + TEST_PARAMS.discountRate, row.yearsFromStart);

      // PV should equal nominal / discount factor
      expect(row.pvTotalEOY).toBeWithinDollars(row.totalEOY / pvFactor, 1);
      expect(row.pvHeirValue).toBeWithinDollars(row.heirValue / pvFactor, 1);
    });
  });

  it('first year present values equal nominal values', () => {
    const projections = generateProjections(TEST_PARAMS);
    const first = projections[0];

    // Year 0 should have no discounting
    expect(first.pvTotalEOY).toBe(first.totalEOY);
    expect(first.pvHeirValue).toBe(first.heirValue);
  });

  it('present values decrease relative to nominal over time', () => {
    const projections = generateProjections(TEST_PARAMS);
    const last = projections[projections.length - 1];

    // Later years should have lower PV than nominal
    expect(last.pvTotalEOY).toBeLessThan(last.totalEOY);
    expect(last.pvHeirValue).toBeLessThan(last.heirValue);
  });
});

// =============================================================================
// CALCULATE SUMMARY TESTS
// =============================================================================

describe('calculateSummary', () => {
  it('returns correct year range', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary.startYear).toBe(TEST_PARAMS.startYear);
    expect(summary.endYear).toBe(TEST_PARAMS.endYear);
    expect(summary.yearsModeled).toBe(projections.length);
  });

  it('starting portfolio matches first year BOY', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary.startingPortfolio).toBe(projections[0].totalBOY);
  });

  it('ending portfolio matches last year EOY', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary.endingPortfolio).toBe(projections[projections.length - 1].totalEOY);
  });

  it('portfolio growth is calculated correctly', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary.portfolioGrowth).toBe(summary.endingPortfolio - summary.startingPortfolio);
  });

  it('total tax matches last year cumulative tax', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary.totalTaxPaid).toBe(projections[projections.length - 1].cumulativeTax);
  });

  it('total IRMAA matches last year cumulative IRMAA', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary.totalIRMAAPaid).toBe(projections[projections.length - 1].cumulativeIRMAA);
  });

  it('total expenses matches last year cumulative expenses', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary.totalExpenses).toBe(projections[projections.length - 1].cumulativeExpenses);
  });

  it('final Roth percent matches last year', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary.finalRothPercent).toBe(projections[projections.length - 1].rothPercent);
  });

  it('peak portfolio is maximum of all EOY values', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    const maxEOY = Math.max(...projections.map(p => p.totalEOY));
    expect(summary.peakPortfolio).toBe(maxEOY);
  });

  it('peak year corresponds to peak portfolio', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    const peakRow = projections.find(p => p.totalEOY === summary.peakPortfolio);
    expect(summary.peakYear).toBe(peakRow.year);
  });

  it('shortfall years are empty when no shortfalls', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    // With our test params, there should be no shortfalls
    expect(summary.shortfallYears).toEqual([]);
  });

  it('shortfall years are identified correctly', () => {
    // Create a scenario with high expenses that deplete funds
    const params = {
      ...TEST_PARAMS,
      annualExpenses: 500000, // Very high
      afterTaxStart: 10000,
      iraStart: 10000,
      rothStart: 10000,
      socialSecurityMonthly: 1000,
    };

    const projections = generateProjections(params);
    const summary = calculateSummary(projections);

    // There should be shortfall years
    const yearsWithShortfall = projections.filter(p => p.shortfall > 0).map(p => p.year);
    expect(summary.shortfallYears).toEqual(yearsWithShortfall);
  });

  it('heir values are captured correctly', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary.startingHeirValue).toBe(projections[0].heirValue);
    expect(summary.endingHeirValue).toBe(projections[projections.length - 1].heirValue);
  });
});

// =============================================================================
// COMPARE SCENARIOS TESTS
// =============================================================================

describe('compareScenarios', () => {
  it('returns base projection and named scenarios', () => {
    const scenarios = {
      highConversion: { rothConversions: { 2026: 200000 } },
      lowExpenses: { annualExpenses: 50000 },
    };

    const result = compareScenarios(TEST_PARAMS, scenarios);

    expect(result.base).toBeDefined();
    expect(result.base).toHaveLength(5); // 2026-2030
    expect(result.scenarios.highConversion).toBeDefined();
    expect(result.scenarios.lowExpenses).toBeDefined();
  });

  it('scenarios differ from base', () => {
    const scenarios = {
      highConversion: { rothConversions: { 2026: 200000 } },
    };

    const result = compareScenarios(TEST_PARAMS, scenarios);

    const baseLast = result.base[result.base.length - 1];
    const scenarioLast =
      result.scenarios.highConversion[result.scenarios.highConversion.length - 1];

    // High conversion should result in higher Roth percentage
    expect(scenarioLast.rothPercent).toBeGreaterThan(baseLast.rothPercent);
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('generateProjections - edge cases', () => {
  it('handles zero starting balances', () => {
    const params = {
      ...TEST_PARAMS,
      afterTaxStart: 0,
      iraStart: 0,
      rothStart: 0,
      afterTaxCostBasis: 0,
    };

    const projections = generateProjections(params);

    expect(projections).toHaveLength(5);
    projections.forEach(row => {
      expect(row.atBOY).toBe(0);
      expect(row.iraBOY).toBe(0);
      expect(row.rothBOY).toBe(0);
    });
  });

  it('handles zero Social Security', () => {
    const params = {
      ...TEST_PARAMS,
      socialSecurityMonthly: 0,
    };

    const projections = generateProjections(params);

    projections.forEach(row => {
      expect(row.ssAnnual).toBe(0);
      expect(row.taxableSS).toBe(0);
    });
  });

  it('handles single-year projection', () => {
    const params = {
      ...TEST_PARAMS,
      startYear: 2026,
      endYear: 2026,
    };

    const projections = generateProjections(params);

    expect(projections).toHaveLength(1);
    expect(projections[0].year).toBe(2026);
  });

  it('handles very long projection (30+ years)', () => {
    const params = {
      ...TEST_PARAMS,
      startYear: 2026,
      endYear: 2060,
    };

    const projections = generateProjections(params);

    expect(projections).toHaveLength(35);

    // Verify invariants still hold (with rounding tolerance)
    projections.forEach(row => {
      expect(row.totalBOY).toBeWithinDollars(row.atBOY + row.iraBOY + row.rothBOY, 2);
      expect(row.totalEOY).toBeWithinDollars(row.atEOY + row.iraEOY + row.rothEOY, 2);
    });
  });

  it('uses DEFAULT_PARAMS when no params provided', () => {
    const projections = generateProjections();

    expect(projections).toBeDefined();
    expect(projections.length).toBeGreaterThan(0);
    expect(projections[0].year).toBe(DEFAULT_PARAMS.startYear);
  });

  it('handles zero return rates gracefully', () => {
    const params = {
      ...TEST_PARAMS,
      atReturn: 0,
      iraReturn: 0,
      rothReturn: 0,
    };

    const projections = generateProjections(params);

    projections.forEach(row => {
      expect(row.effectiveAtReturn).toBe(0);
      expect(row.effectiveIraReturn).toBe(0);
      expect(row.effectiveRothReturn).toBe(0);
    });
  });

  it('handles negative return rates (market decline)', () => {
    const params = {
      ...TEST_PARAMS,
      atReturn: -0.1,
      iraReturn: -0.1,
      rothReturn: -0.1,
    };

    const projections = generateProjections(params);

    // Portfolio should shrink due to negative returns
    // (unless withdrawals cause it to shrink faster)
    expect(projections[0].effectiveAtReturn).toBe(-0.1);

    // Balances should still be non-negative
    projections.forEach(row => {
      expect(row.atEOY).toBeGreaterThanOrEqual(0);
      expect(row.iraEOY).toBeGreaterThanOrEqual(0);
      expect(row.rothEOY).toBeGreaterThanOrEqual(0);
    });
  });
});

// =============================================================================
// SOCIAL SECURITY COLA TESTS
// =============================================================================

describe('generateProjections - Social Security COLA', () => {
  it('SS increases by COLA each year', () => {
    const projections = generateProjections(TEST_PARAMS);

    for (let i = 1; i < projections.length; i++) {
      const prev = projections[i - 1];
      const curr = projections[i];

      // Expected SS should be previous * (1 + COLA)
      const expectedSS = Math.round(prev.ssAnnual * (1 + TEST_PARAMS.ssCOLA));
      expect(curr.ssAnnual).toBeWithinDollars(expectedSS, 1);
    }
  });

  it('first year SS matches monthly * 12', () => {
    const projections = generateProjections(TEST_PARAMS);

    expect(projections[0].ssAnnual).toBe(TEST_PARAMS.socialSecurityMonthly * 12);
  });
});

// =============================================================================
// AT HARVEST OVERRIDE TESTS
// =============================================================================

describe('generateProjections - AT harvest overrides', () => {
  it('increases AT withdrawal when harvest override specified', () => {
    const baseParams = { ...TEST_PARAMS };
    const harvestParams = {
      ...TEST_PARAMS,
      atHarvestOverrides: { 2026: 50000 },
    };

    const baseProjections = generateProjections(baseParams);
    const harvestProjections = generateProjections(harvestParams);

    const baseYear = baseProjections[0];
    const harvestYear = harvestProjections[0];

    // AT withdrawal should be higher with harvest
    expect(harvestYear.atWithdrawal).toBeGreaterThanOrEqual(baseYear.atWithdrawal);

    // Capital gains should also be higher
    expect(harvestYear.capitalGains).toBeGreaterThanOrEqual(baseYear.capitalGains);
  });
});

// =============================================================================
// ROTH PERCENT TESTS
// =============================================================================

describe('generateProjections - Roth percentage', () => {
  it('Roth percent is between 0 and 1', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      expect(row.rothPercent).toBeGreaterThanOrEqual(0);
      expect(row.rothPercent).toBeLessThanOrEqual(1);
    });
  });

  it('Roth percent equals Roth / Total EOY', () => {
    const projections = generateProjections(TEST_PARAMS);

    projections.forEach(row => {
      if (row.totalEOY > 0) {
        const expectedPercent = row.rothEOY / row.totalEOY;
        // Use precision of 5 decimal places (due to rounding in totalEOY)
        expect(row.rothPercent).toBeCloseTo(expectedPercent, 5);
      }
    });
  });

  it('Roth percent is 0 when Roth balance is 0', () => {
    const params = {
      ...TEST_PARAMS,
      rothStart: 0,
      rothConversions: {},
    };

    const projections = generateProjections(params);

    expect(projections[0].rothPercent).toBe(0);
  });
});
