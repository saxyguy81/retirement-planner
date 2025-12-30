/**
 * Input Source Tracking
 *
 * Maps computed projection fields to the user model inputs they derive from.
 * Used by the Calculation Inspector to show which user inputs feed into each value.
 */

/**
 * Maps computed projection fields to their ultimate input parameters.
 * Each entry lists the params keys and describes how they're used.
 */
export const INPUT_SOURCES = {
  // =============================================================================
  // EXPENSES - computed from annualExpenses × inflation^years + overrides
  // =============================================================================
  expenses: {
    sources: [
      { param: 'annualExpenses', label: 'Annual Expenses', transform: 'base' },
      { param: 'expenseInflation', label: 'Expense Inflation', transform: 'growth' },
      { param: 'expenseOverrides', label: 'Year Overrides', transform: 'yearly' },
    ],
    formula: 'annualExpenses × (1 + expenseInflation)^yearsFromStart + overrides[year]',
  },

  // =============================================================================
  // SOCIAL SECURITY - computed from monthly × 12 × COLA
  // =============================================================================
  ssAnnual: {
    sources: [
      { param: 'socialSecurityMonthly', label: 'SS Monthly (combined)', transform: '×12' },
      { param: 'ssCOLA', label: 'SS COLA', transform: 'growth' },
    ],
    formula: 'socialSecurityMonthly × 12 × (1 + ssCOLA)^yearsFromStart',
  },

  // =============================================================================
  // STANDARD DEDUCTION - from filing status + age bonus (inflated)
  // =============================================================================
  standardDeduction: {
    sources: [
      { param: 'filingStatus', label: 'Filing Status', transform: 'lookup', defaultValue: 'MFJ' },
      { param: 'bracketInflation', label: 'Bracket Inflation', transform: 'growth' },
    ],
    formula: 'baseDeduction(MFJ) + seniorBonus × (1 + bracketInflation)^years',
  },

  // =============================================================================
  // FIRST YEAR BALANCES - direct from inputs (only shows for first year)
  // =============================================================================
  atBOY: {
    firstYearOnly: true,
    sources: [{ param: 'afterTaxStart', label: 'Starting AT Balance', transform: 'direct' }],
    formula: 'afterTaxStart (first year only)',
  },

  iraBOY: {
    firstYearOnly: true,
    sources: [{ param: 'iraStart', label: 'Starting IRA Balance', transform: 'direct' }],
    formula: 'iraStart (first year only)',
  },

  rothBOY: {
    firstYearOnly: true,
    sources: [{ param: 'rothStart', label: 'Starting Roth Balance', transform: 'direct' }],
    formula: 'rothStart (first year only)',
  },

  costBasisBOY: {
    firstYearOnly: true,
    sources: [{ param: 'afterTaxCostBasis', label: 'Starting Cost Basis', transform: 'direct' }],
    formula: 'afterTaxCostBasis (first year only)',
  },

  // =============================================================================
  // RETURNS - based on return mode
  // =============================================================================
  effectiveAtReturn: {
    sources: [
      { param: 'returnMode', label: 'Return Mode', transform: 'lookup' },
      { param: 'atReturn', label: 'AT Return (account mode)', transform: 'rate' },
      { param: 'lowRiskReturn', label: 'Low Risk Return', transform: 'rate' },
      { param: 'modRiskReturn', label: 'Mod Risk Return', transform: 'rate' },
      { param: 'highRiskReturn', label: 'High Risk Return', transform: 'rate' },
    ],
    formula: 'Based on returnMode: account-specific or risk-weighted blend',
  },

  effectiveIraReturn: {
    sources: [
      { param: 'returnMode', label: 'Return Mode', transform: 'lookup' },
      { param: 'iraReturn', label: 'IRA Return (account mode)', transform: 'rate' },
      { param: 'lowRiskReturn', label: 'Low Risk Return', transform: 'rate' },
      { param: 'modRiskReturn', label: 'Mod Risk Return', transform: 'rate' },
      { param: 'highRiskReturn', label: 'High Risk Return', transform: 'rate' },
    ],
    formula: 'Based on returnMode: account-specific or risk-weighted blend',
  },

  effectiveRothReturn: {
    sources: [
      { param: 'returnMode', label: 'Return Mode', transform: 'lookup' },
      { param: 'rothReturn', label: 'Roth Return (account mode)', transform: 'rate' },
      { param: 'lowRiskReturn', label: 'Low Risk Return', transform: 'rate' },
      { param: 'modRiskReturn', label: 'Mod Risk Return', transform: 'rate' },
      { param: 'highRiskReturn', label: 'High Risk Return', transform: 'rate' },
    ],
    formula: 'Based on returnMode: account-specific or risk-weighted blend',
  },

  // =============================================================================
  // ROTH CONVERSION - from yearly schedule
  // =============================================================================
  rothConversion: {
    sources: [{ param: 'rothConversions', label: 'Roth Conversion Schedule', transform: 'yearly' }],
    formula: 'rothConversions[year] or 0',
  },

  // =============================================================================
  // IRMAA MAGI LOOKBACK - from historical MAGI inputs
  // =============================================================================
  irmaaMAGI: {
    sources: [
      { param: 'magi2024', label: 'MAGI 2024', transform: 'lookback' },
      { param: 'magi2025', label: 'MAGI 2025', transform: 'lookback' },
    ],
    formula: 'MAGI from 2 years prior (for IRMAA calculation)',
  },

  // =============================================================================
  // STATE TAX - uses state rate parameter
  // =============================================================================
  stateTax: {
    sources: [{ param: 'stateTaxRate', label: 'IL State Tax Rate', transform: 'rate' }],
    formula: 'capitalGains × stateTaxRate (IL exempts retirement income)',
  },

  // =============================================================================
  // CAPITAL GAINS - uses capital gains percent
  // =============================================================================
  capitalGains: {
    sources: [{ param: 'capitalGainsPercent', label: 'Gains % of AT', transform: 'percent' }],
    formula: 'atWithdrawal × capitalGainsPercent (portion that is gains vs basis)',
  },

  // =============================================================================
  // HEIR VALUE - uses heir tax rate parameters
  // =============================================================================
  heirValue: {
    sources: [
      { param: 'heirFedRate', label: 'Heir Federal Rate', transform: 'rate' },
      { param: 'heirStateRate', label: 'Heir State Rate', transform: 'rate' },
      { param: 'heirs', label: 'Heir Configuration', transform: 'config' },
    ],
    formula: 'AT + Roth + IRA × (1 - heirRate) per heir',
  },

  // =============================================================================
  // PROPERTY TAX - direct input
  // =============================================================================
  propertyTax: {
    sources: [{ param: 'propertyTax', label: 'Annual Property Tax', transform: 'direct' }],
    formula: 'propertyTax (fixed annual amount)',
  },

  // =============================================================================
  // AGE - computed from year and birth year
  // =============================================================================
  age: {
    sources: [{ param: 'birthYear', label: 'Birth Year', transform: 'direct' }],
    formula: 'year - birthYear',
  },
};

/**
 * Format a parameter value for display in the inspector.
 *
 * @param {string} param - Parameter key name
 * @param {*} value - The parameter value
 * @returns {string} Formatted display string
 */
function formatParamValue(param, value) {
  if (value === undefined || value === null) return 'N/A';

  // Handle objects (schedules, overrides, configs)
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `${value.length} items`;
    }
    const keys = Object.keys(value);
    if (keys.length === 0) return 'None set';
    if (keys.length <= 3) {
      return keys.map(k => `${k}: $${(value[k] / 1000).toFixed(0)}K`).join(', ');
    }
    return `${keys.length} years`;
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle strings
  if (typeof value === 'string') {
    return value;
  }

  // Handle numbers
  if (typeof value === 'number') {
    // Rate/percentage params
    if (
      param.includes('Rate') ||
      param.includes('Return') ||
      param.includes('Inflation') ||
      param.includes('Percent') ||
      param.includes('COLA')
    ) {
      return (value * 100).toFixed(1) + '%';
    }

    // Year params
    if (param.includes('Year') || param === 'year') {
      return String(value);
    }

    // Dollar amounts
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
    return '$' + Math.round(value).toLocaleString();
  }

  return String(value);
}

/**
 * Get input sources for a field, if any.
 * Returns null if field doesn't have direct input sources or if conditions aren't met.
 *
 * @param {string} field - The projection field name
 * @param {number} year - The projection year
 * @param {number} yearsFromStart - Years since projection start
 * @param {Object} params - The user parameters object
 * @returns {Object|null} Input sources info or null
 */
export function getInputSources(field, year, yearsFromStart, params) {
  const config = INPUT_SOURCES[field];
  if (!config) return null;

  // Handle first-year-only fields
  if (config.firstYearOnly && yearsFromStart > 0) return null;

  // Filter sources to only those with values in params
  const sourcesWithValues = config.sources
    .map(s => {
      // Handle special lookups for yearly schedules
      const value = params[s.param];

      // Special handling for yearly schedules - show the value for this year
      if (s.transform === 'yearly' && typeof value === 'object') {
        const yearValue = value[year];
        if (yearValue !== undefined && yearValue !== null && yearValue !== 0) {
          return {
            ...s,
            value: yearValue,
            formatted: formatParamValue(s.param, yearValue),
          };
        }
        // No value for this year - still show the param exists but with "None this year"
        return {
          ...s,
          value: value,
          formatted: Object.keys(value).length > 0 ? 'None this year' : 'None set',
        };
      }

      return {
        ...s,
        value,
        formatted: formatParamValue(s.param, value),
      };
    })
    .filter(s => {
      // Keep if value is set (not undefined/null, or is 0 which is valid)
      if (s.value === undefined || s.value === null) return false;
      // For objects with no keys and not yearly, hide
      if (typeof s.value === 'object' && !Array.isArray(s.value)) {
        return Object.keys(s.value).length > 0 || s.transform === 'yearly';
      }
      return true;
    });

  // If no sources have values, return null
  if (sourcesWithValues.length === 0) return null;

  return {
    formula: config.formula,
    sources: sourcesWithValues,
  };
}

export default INPUT_SOURCES;
