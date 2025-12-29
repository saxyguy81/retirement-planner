/**
 * Calculation Dependencies
 *
 * Maps each calculated field to its input dependencies for interactive highlighting.
 * When hovering on a cell, this data determines which other cells should be highlighted.
 */

/**
 * For each field, list the other fields that contribute to its value.
 * Functions receive (year, data, allData) and return array of { year, field }
 */
export const CELL_DEPENDENCIES = {
  // Beginning of year = prior year end of year
  atBOY: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    return priorYear ? [{ year: year - 1, field: 'atEOY' }] : [];
  },
  iraBOY: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    return priorYear ? [{ year: year - 1, field: 'iraEOY' }] : [];
  },
  rothBOY: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    return priorYear ? [{ year: year - 1, field: 'rothEOY' }] : [];
  },

  // Total BOY = sum of account BOYs
  totalBOY: year => [
    { year, field: 'atBOY' },
    { year, field: 'iraBOY' },
    { year, field: 'rothBOY' },
  ],

  // Total withdrawal = sum of account withdrawals
  totalWithdrawal: year => [
    { year, field: 'atWithdrawal' },
    { year, field: 'iraWithdrawal' },
    { year, field: 'rothWithdrawal' },
  ],

  // Total tax = sum of tax components
  totalTax: year => [
    { year, field: 'federalTax' },
    { year, field: 'ltcgTax' },
    { year, field: 'niit' },
    { year, field: 'stateTax' },
  ],

  // EOY = (BOY - withdrawals) * (1 + return)
  atEOY: year => [
    { year, field: 'atBOY' },
    { year, field: 'atWithdrawal' },
    { year, field: 'effectiveAtReturn' },
  ],
  iraEOY: year => [
    { year, field: 'iraBOY' },
    { year, field: 'iraWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'effectiveIraReturn' },
  ],
  rothEOY: year => [
    { year, field: 'rothBOY' },
    { year, field: 'rothWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'effectiveRothReturn' },
  ],

  // Total EOY = sum of account EOYs
  totalEOY: year => [
    { year, field: 'atEOY' },
    { year, field: 'iraEOY' },
    { year, field: 'rothEOY' },
  ],

  // PV versions reference the same dependencies as their base fields
  pvAtEOY: year => [
    { year, field: 'atBOY' },
    { year, field: 'atWithdrawal' },
    { year, field: 'effectiveAtReturn' },
  ],
  pvIraEOY: year => [
    { year, field: 'iraBOY' },
    { year, field: 'iraWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'effectiveIraReturn' },
  ],
  pvRothEOY: year => [
    { year, field: 'rothBOY' },
    { year, field: 'rothWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'effectiveRothReturn' },
  ],
  pvTotalEOY: year => [
    { year, field: 'atEOY' },
    { year, field: 'iraEOY' },
    { year, field: 'rothEOY' },
  ],

  // Heir value = AT + Roth + IRA*(1-rate)
  heirValue: year => [
    { year, field: 'atEOY' },
    { year, field: 'iraEOY' },
    { year, field: 'rothEOY' },
  ],
  pvHeirValue: year => [
    { year, field: 'atEOY' },
    { year, field: 'iraEOY' },
    { year, field: 'rothEOY' },
  ],

  // Federal tax depends on income components
  federalTax: year => [
    { year, field: 'taxableOrdinary' },
    { year, field: 'iraWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'taxableSS' },
  ],

  // LTCG tax depends on capital gains and income
  ltcgTax: year => [
    { year, field: 'capitalGains' },
    { year, field: 'taxableOrdinary' },
  ],

  // NIIT depends on MAGI threshold
  niit: year => [
    { year, field: 'capitalGains' },
    { year, field: 'ordinaryIncome' },
  ],

  // State tax mirrors federal structure
  stateTax: year => [
    { year, field: 'taxableOrdinary' },
    { year, field: 'capitalGains' },
  ],

  // Taxable SS depends on combined income
  taxableSS: year => [
    { year, field: 'ssAnnual' },
    { year, field: 'iraWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'capitalGains' },
  ],

  // IRMAA total = Part B + Part D
  irmaaTotal: year => [
    { year, field: 'irmaaPartB' },
    { year, field: 'irmaaPartD' },
  ],

  // IRMAA parts depend on MAGI from 2 years prior
  irmaaPartB: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 2);
    return priorYear ? [{ year: year - 2, field: 'irmaaMAGI' }] : [];
  },
  irmaaPartD: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 2);
    return priorYear ? [{ year: year - 2, field: 'irmaaMAGI' }] : [];
  },

  // RMD required depends on IRA BOY and factor
  rmdRequired: year => [
    { year, field: 'iraBOY' },
    { year, field: 'rmdFactor' },
  ],

  // Roth percent = Roth EOY / Total EOY
  rothPercent: year => [
    { year, field: 'rothEOY' },
    { year, field: 'totalEOY' },
  ],

  // Cumulative tax = prior cumulative + current total tax
  cumulativeTax: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    const deps = [{ year, field: 'totalTax' }];
    if (priorYear) {
      deps.push({ year: year - 1, field: 'cumulativeTax' });
    }
    return deps;
  },

  // Cumulative IRMAA = prior cumulative + current IRMAA
  cumulativeIRMAA: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    const deps = [{ year, field: 'irmaaTotal' }];
    if (priorYear) {
      deps.push({ year: year - 1, field: 'cumulativeIRMAA' });
    }
    return deps;
  },

  // Cumulative capital gains
  cumulativeCapitalGains: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    const deps = [{ year, field: 'capitalGains' }];
    if (priorYear) {
      deps.push({ year: year - 1, field: 'cumulativeCapitalGains' });
    }
    return deps;
  },

  // AT Liquidation percent depends on AT withdrawal and gains
  atLiquidationPercent: year => [
    { year, field: 'atWithdrawal' },
    { year, field: 'capitalGains' },
    { year, field: 'costBasisBOY' },
  ],

  // Ordinary income
  ordinaryIncome: year => [
    { year, field: 'iraWithdrawal' },
    { year, field: 'rothConversion' },
    { year, field: 'taxableSS' },
  ],

  // Taxable ordinary income
  taxableOrdinary: year => [{ year, field: 'ordinaryIncome' }],

  // Capital gains from AT withdrawal
  capitalGains: year => [
    { year, field: 'atWithdrawal' },
    { year, field: 'costBasisBOY' },
    { year, field: 'atBOY' },
  ],

  // =============================================================================
  // WITHDRAWAL FIELDS
  // =============================================================================

  // AT withdrawal depends on: need calculation + withdrawal order priority
  atWithdrawal: year => [
    { year, field: 'expenses' },
    { year, field: 'totalTax' },
    { year, field: 'irmaaTotal' },
    { year, field: 'ssAnnual' },
    { year, field: 'rmdRequired' },
    { year, field: 'atBOY' },
  ],

  // IRA withdrawal depends on: RMD requirement + overflow from AT
  iraWithdrawal: year => [
    { year, field: 'expenses' },
    { year, field: 'totalTax' },
    { year, field: 'irmaaTotal' },
    { year, field: 'ssAnnual' },
    { year, field: 'rmdRequired' },
    { year, field: 'iraBOY' },
    { year, field: 'rothConversion' },
    { year, field: 'atBOY' },
  ],

  // Roth withdrawal only when IRA+AT exhausted
  rothWithdrawal: year => [
    { year, field: 'expenses' },
    { year, field: 'totalTax' },
    { year, field: 'irmaaTotal' },
    { year, field: 'ssAnnual' },
    { year, field: 'atBOY' },
    { year, field: 'iraBOY' },
    { year, field: 'rothBOY' },
  ],

  // =============================================================================
  // COST BASIS TRACKING
  // =============================================================================

  // Cost basis BOY = prior year EOY (or initial value)
  costBasisBOY: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    return priorYear ? [{ year: year - 1, field: 'costBasisEOY' }] : [];
  },

  // Cost basis EOY = BOY minus proportional consumption from AT withdrawal
  costBasisEOY: year => [
    { year, field: 'costBasisBOY' },
    { year, field: 'atWithdrawal' },
    { year, field: 'atBOY' },
  ],

  // =============================================================================
  // IRMAA MAGI (computed income, not just lookback reference)
  // =============================================================================

  // IRMAA MAGI is computed from ordinaryIncome + capitalGains + rothConversion
  // but used 2 years later for IRMAA calculation
  irmaaMAGI: year => [
    { year, field: 'ordinaryIncome' },
    { year, field: 'capitalGains' },
    { year, field: 'rothConversion' },
  ],

  // =============================================================================
  // CUMULATIVE TRACKING
  // =============================================================================

  // Cumulative AT (LTCG) tax
  cumulativeATTax: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    const deps = [{ year, field: 'ltcgTax' }];
    if (priorYear) {
      deps.push({ year: year - 1, field: 'cumulativeATTax' });
    }
    return deps;
  },
};

/**
 * Signs indicating whether each field contributes positively or negatively
 * to the parent calculation.
 *
 * '+' = adds to result (positive contribution)
 * '-' = subtracts from result (negative contribution)
 */
export const DEPENDENCY_SIGNS = {
  // For BOY calculations (from prior EOY) - positive flow
  atEOY: '+',
  iraEOY: '+',
  rothEOY: '+',

  // For EOY calculations
  atBOY: '+',
  iraBOY: '+',
  rothBOY: '+',
  atWithdrawal: '-', // Subtracts from balance
  iraWithdrawal: '-', // Subtracts from balance
  rothWithdrawal: '-', // Subtracts from balance
  rothConversion: '+/-', // + for Roth (adds), - for IRA (subtracts)
  effectiveAtReturn: '+',
  effectiveIraReturn: '+',
  effectiveRothReturn: '+',

  // For total calculations - all positive (summing)
  federalTax: '+',
  ltcgTax: '+',
  niit: '+',
  stateTax: '+',
  totalTax: '+',
  irmaaPartB: '+',
  irmaaPartD: '+',
  irmaaTotal: '+',

  // For heir value - all positive (summing with adjustments)
  // IRA has tax applied but still contributes positively

  // For income/tax calculations
  taxableOrdinary: '+',
  taxableSS: '+',
  capitalGains: '+',
  ordinaryIncome: '+',
  ssAnnual: '+',

  // For RMD
  rmdFactor: '-', // Higher factor means lower RMD

  // For cumulative
  cumulativeTax: '+',
  cumulativeIRMAA: '+',
  cumulativeCapitalGains: '+',
  cumulativeATTax: '+',

  // Cost basis
  costBasisBOY: '+',
  costBasisEOY: '+',

  // For withdrawal calculations
  expenses: '+',
  rmdRequired: '+',
  irmaaMAGI: '+',
};

/**
 * Get the sign for a dependency in a specific context.
 * Some fields have different signs depending on which calculation they're part of.
 *
 * @param {string} field - The dependency field
 * @param {string} parentField - The field being calculated (optional context)
 * @returns {'+' | '-'} The sign for this dependency
 */
export function getDependencySign(field, parentField) {
  // Special case: rothConversion is + for Roth, - for IRA
  if (field === 'rothConversion') {
    if (parentField === 'rothEOY' || parentField === 'pvRothEOY') {
      return '+';
    }
    if (parentField === 'iraEOY' || parentField === 'pvIraEOY') {
      return '-';
    }
    return '+'; // Default to positive
  }

  return DEPENDENCY_SIGNS[field] || '+';
}

/**
 * Build reverse dependencies: for a given field/year, find all fields that use it.
 * Returns array of { year, field } representing fields that depend on this value.
 *
 * @param {string} field - The field to check
 * @param {number} year - The year of the field
 * @param {Array} allData - All projection data
 * @returns {Array<{year: number, field: string}>} Fields that use this value
 */
export function getReverseDependencies(field, year, allData) {
  const usedBy = [];

  // Check each field to see if it depends on our field
  for (const [parentField, getDeps] of Object.entries(CELL_DEPENDENCIES)) {
    // Check the same year
    const sameYearData = allData.find(d => d.year === year);
    if (sameYearData) {
      try {
        const deps = getDeps(year, sameYearData, allData);
        if (deps.some(d => d.field === field && d.year === year)) {
          usedBy.push({ year, field: parentField });
        }
      } catch (_e) {
        // Skip if dependency calculation fails
      }
    }

    // Check next year (for BOY fields that use prior EOY)
    const nextYearData = allData.find(d => d.year === year + 1);
    if (nextYearData) {
      try {
        const deps = getDeps(year + 1, nextYearData, allData);
        if (deps.some(d => d.field === field && d.year === year)) {
          usedBy.push({ year: year + 1, field: parentField });
        }
      } catch (_e) {
        // Skip if dependency calculation fails
      }
    }

    // Check 2 years later (for IRMAA lookback)
    const twoYearsLater = allData.find(d => d.year === year + 2);
    if (twoYearsLater) {
      try {
        const deps = getDeps(year + 2, twoYearsLater, allData);
        if (deps.some(d => d.field === field && d.year === year)) {
          usedBy.push({ year: year + 2, field: parentField });
        }
      } catch (_e) {
        // Skip if dependency calculation fails
      }
    }
  }

  return usedBy;
}
