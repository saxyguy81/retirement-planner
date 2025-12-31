/**
 * Tax Tables and Constants for Retirement Planning
 * Base year: 2024 (inflate for future years using bracketInflation rate)
 */

// =============================================================================
// FEDERAL INCOME TAX BRACKETS (2024 Married Filing Jointly)
// =============================================================================
export const FEDERAL_BRACKETS_MFJ_2024 = [
  { rate: 0.1, threshold: 0 },
  { rate: 0.12, threshold: 23200 },
  { rate: 0.22, threshold: 94300 },
  { rate: 0.24, threshold: 201050 },
  { rate: 0.32, threshold: 383900 },
  { rate: 0.35, threshold: 487450 },
  { rate: 0.37, threshold: 731200 },
];

// Federal brackets for Single filer (survivor scenario)
export const FEDERAL_BRACKETS_SINGLE_2024 = [
  { rate: 0.1, threshold: 0 },
  { rate: 0.12, threshold: 11600 },
  { rate: 0.22, threshold: 47150 },
  { rate: 0.24, threshold: 100525 },
  { rate: 0.32, threshold: 191950 },
  { rate: 0.35, threshold: 243725 },
  { rate: 0.37, threshold: 609350 },
];

// =============================================================================
// LONG-TERM CAPITAL GAINS TAX BRACKETS (2024)
// =============================================================================
export const LTCG_BRACKETS_MFJ_2024 = [
  { rate: 0.0, threshold: 0 },
  { rate: 0.15, threshold: 94050 },
  { rate: 0.2, threshold: 583750 },
];

export const LTCG_BRACKETS_SINGLE_2024 = [
  { rate: 0.0, threshold: 0 },
  { rate: 0.15, threshold: 47025 },
  { rate: 0.2, threshold: 518900 },
];

// =============================================================================
// STANDARD DEDUCTION (2024)
// =============================================================================
export const STANDARD_DEDUCTION_MFJ_2024 = 29200;
export const STANDARD_DEDUCTION_SINGLE_2024 = 14600;
export const SENIOR_BONUS_MFJ_2024 = 3100; // Both 65+
export const SENIOR_BONUS_SINGLE_2024 = 1950;

// =============================================================================
// IRMAA BRACKETS (2026) - Based on MAGI from 2 years prior (2024 income)
// Monthly amounts that get multiplied by 12 for annual
// Source: CMS/SSA official 2026 IRMAA brackets
// =============================================================================
export const IRMAA_BRACKETS_MFJ_2026 = [
  { threshold: 0, partB: 202.9, partD: 0 }, // Standard premium
  { threshold: 218000, partB: 284.1, partD: 14.5 }, // 1.4x
  { threshold: 274000, partB: 405.8, partD: 37.4 }, // 2.0x
  { threshold: 342000, partB: 527.5, partD: 60.3 }, // 2.6x
  { threshold: 410000, partB: 649.2, partD: 83.2 }, // 3.2x
  { threshold: 750000, partB: 689.9, partD: 91.0 }, // 3.4x (frozen until 2028)
];

export const IRMAA_BRACKETS_SINGLE_2026 = [
  { threshold: 0, partB: 202.9, partD: 0 }, // Standard premium
  { threshold: 109000, partB: 284.1, partD: 14.5 }, // 1.4x
  { threshold: 137000, partB: 405.8, partD: 37.4 }, // 2.0x
  { threshold: 171000, partB: 527.5, partD: 60.3 }, // 2.6x
  { threshold: 205000, partB: 649.2, partD: 83.2 }, // 3.2x
  { threshold: 500000, partB: 689.9, partD: 91.0 }, // 3.4x (frozen until 2028)
];

// Aliases for backwards compatibility
export const IRMAA_BRACKETS_MFJ_2024 = IRMAA_BRACKETS_MFJ_2026;
export const IRMAA_BRACKETS_SINGLE_2024 = IRMAA_BRACKETS_SINGLE_2026;

// =============================================================================
// NIIT (Net Investment Income Tax) Thresholds
// =============================================================================
export const NIIT_RATE = 0.038;
export const NIIT_THRESHOLD_MFJ = 250000;
export const NIIT_THRESHOLD_SINGLE = 200000;

// =============================================================================
// RMD (Required Minimum Distribution) Table - Uniform Lifetime Table
// Key: Age, Value: Distribution Period (divisor)
// =============================================================================
export const RMD_TABLE = {
  72: 27.4,
  73: 26.5,
  74: 25.5,
  75: 24.6,
  76: 23.7,
  77: 22.9,
  78: 22.0,
  79: 21.1,
  80: 20.2,
  81: 19.4,
  82: 18.5,
  83: 17.7,
  84: 16.8,
  85: 16.0,
  86: 15.2,
  87: 14.4,
  88: 13.7,
  89: 12.9,
  90: 12.2,
  91: 11.5,
  92: 10.8,
  93: 10.1,
  94: 9.5,
  95: 8.9,
  96: 8.4,
  97: 7.8,
  98: 7.3,
  99: 6.8,
  100: 6.4,
  101: 6.0,
  102: 5.6,
  103: 5.2,
  104: 4.9,
  105: 4.6,
  106: 4.3,
  107: 4.1,
  108: 3.9,
  109: 3.7,
  110: 3.5,
  111: 3.4,
  112: 3.3,
  113: 3.1,
  114: 3.0,
  115: 2.9,
  116: 2.8,
  117: 2.7,
  118: 2.5,
  119: 2.3,
  120: 2.0,
};

// RMD starting age (SECURE 2.0 rules)
export const RMD_START_AGE = 73;

// =============================================================================
// BENEFICIARY SINGLE LIFE EXPECTANCY TABLE (IRS Publication 590-B)
// Used for inherited IRA RMDs when owner died AFTER RBD (age 73+).
// Key: Age of beneficiary, Value: Life expectancy divisor
// Each subsequent year, subtract 1 from the initial factor.
// =============================================================================
export const BENEFICIARY_SLE_TABLE = {
  20: 63.0,
  21: 62.1,
  22: 61.1,
  23: 60.1,
  24: 59.2,
  25: 58.2,
  26: 57.2,
  27: 56.3,
  28: 55.3,
  29: 54.3,
  30: 53.3,
  31: 52.4,
  32: 51.4,
  33: 50.4,
  34: 49.4,
  35: 48.5,
  36: 47.5,
  37: 46.5,
  38: 45.6,
  39: 44.6,
  40: 43.6,
  41: 42.7,
  42: 41.7,
  43: 40.7,
  44: 39.8,
  45: 38.8,
  46: 37.9,
  47: 36.9,
  48: 35.9,
  49: 35.0,
  50: 34.0,
  51: 33.1,
  52: 32.1,
  53: 31.2,
  54: 30.2,
  55: 29.3,
  56: 28.3,
  57: 27.4,
  58: 26.5,
  59: 25.5,
  60: 24.6,
  61: 23.7,
  62: 22.8,
  63: 21.8,
  64: 20.9,
  65: 20.0,
  66: 19.1,
  67: 18.2,
  68: 17.4,
  69: 16.5,
  70: 15.6,
  71: 14.8,
  72: 13.9,
  73: 13.1,
  74: 12.3,
  75: 11.5,
  76: 10.7,
  77: 9.9,
  78: 9.2,
  79: 8.4,
  80: 7.7,
  81: 7.0,
  82: 6.3,
  83: 5.7,
  84: 5.1,
  85: 4.5,
  86: 4.0,
  87: 3.5,
  88: 3.0,
  89: 2.6,
  90: 2.2,
};

/**
 * Get the Single Life Expectancy factor for a beneficiary
 * @param {number} age - Beneficiary's age
 * @returns {number} SLE factor (divisor for RMD calculation)
 */
export function getBeneficiarySLEFactor(age) {
  if (age < 20) return BENEFICIARY_SLE_TABLE[20];
  if (age > 90) return BENEFICIARY_SLE_TABLE[90];
  return BENEFICIARY_SLE_TABLE[age] || BENEFICIARY_SLE_TABLE[90];
}

/**
 * Determine if owner died after Required Beginning Date (RBD = age 73)
 * @param {number} ownerDeathYear - Year of owner's death
 * @param {number} ownerBirthYear - Owner's birth year
 * @returns {boolean} True if owner died at age 73 or older
 */
export function ownerDiedAfterRBD(ownerDeathYear, ownerBirthYear) {
  const deathAge = ownerDeathYear - ownerBirthYear;
  return deathAge >= 73;
}

// =============================================================================
// SOCIAL SECURITY TAXATION THRESHOLDS (Combined Income method)
// These are NOT indexed for inflation
// =============================================================================
export const SS_TAX_THRESHOLDS_MFJ = {
  tier1: 32000, // 0% taxable below this
  tier2: 44000, // Up to 50% taxable between tier1 and tier2
  // Above tier2: up to 85% taxable
};

export const SS_TAX_THRESHOLDS_SINGLE = {
  tier1: 25000,
  tier2: 34000,
};

// =============================================================================
// ILLINOIS STATE TAX (Flat rate, doesn't tax retirement income)
// =============================================================================
export const IL_TAX_RATE = 0.0495;
// Note: IL exempts Social Security, pension, IRA, 401k distributions
// Only investment income (capital gains, dividends, interest) is taxed

// =============================================================================
// HELPER: Inflate brackets for a given year
// =============================================================================
export function inflateBrackets(brackets, inflationRate, years) {
  const factor = Math.pow(1 + inflationRate, years);
  return brackets.map(b => ({
    rate: b.rate,
    threshold: Math.round(b.threshold * factor),
  }));
}

export function inflateIRMAA(brackets, inflationRate, years) {
  const factor = Math.pow(1 + inflationRate, years);
  return brackets.map(b => ({
    threshold: Math.round(b.threshold * factor),
    partB: b.partB, // Monthly amounts stay fixed (CMS adjusts annually)
    partD: b.partD,
  }));
}

// =============================================================================
// DEFAULT MODEL PARAMETERS
// =============================================================================
export const DEFAULT_PARAMS = {
  // Timeline
  startYear: 2025,
  endYear: 2054,
  birthYear: 1960, // Age 65 in 2025
  taxYear: 2025, // Base year for tax brackets (updated to current year)

  // Starting Account Balances
  afterTaxStart: 1500000,
  iraStart: 3000000,
  rothStart: 2000000,
  afterTaxCostBasis: 500000, // For capital gains calculations

  // Return Assumptions
  returnMode: 'blended', // 'account' or 'blended' (risk-based)
  atReturn: 0.04, // Used in 'account' mode
  iraReturn: 0.06, // Used in 'account' mode
  rothReturn: 0.08, // Used in 'account' mode

  // Risk-Based Returns (used in 'blended' mode)
  lowRiskTarget: 2500000, // First $2.5M at low risk
  modRiskTarget: 2500000, // Next $2.5M at moderate risk
  lowRiskReturn: 0.04, // Bonds, CDs, money market
  modRiskReturn: 0.06, // Balanced funds
  highRiskReturn: 0.08, // Stocks, growth funds

  // Social Security
  socialSecurityMonthly: 4000, // Combined monthly
  ssCOLA: 0.025, // Annual cost-of-living adjustment

  // Expenses
  annualExpenses: 120000, // Starting annual expenses
  expenseInflation: 0.03, // Annual expense growth
  expenseOverrides: {}, // Year-specific expense overrides (year -> amount)

  // Tax Parameters
  stateTaxRate: 0.0495, // Illinois flat rate
  capitalGainsPercent: 0.75, // % of AT withdrawal that's gains vs basis
  bracketInflation: 0.03, // Annual bracket inflation assumption
  exemptSSFromTax: false, // Trump's proposal: exempt Social Security from federal taxation

  // Roth Conversions (year -> amount)
  rothConversions: {},

  // AT Harvest Overrides (year -> amount) - extra AT liquidation for capital gains harvesting
  atHarvestOverrides: {},

  // MAGI History (for IRMAA 2-year lookback)
  magi2024: 0,
  magi2025: 0,

  // Survivor Scenario
  survivorDeathYear: null, // Year primary dies (null = no death modeled)
  survivorSSPercent: 0.67, // Survivor gets 67% of combined SS
  survivorExpensePercent: 0.7, // Expenses drop to 70%

  // Heir Parameters (legacy - kept for backward compatibility)
  heirFedRate: 0.32, // Heirs' federal marginal rate on inherited IRA
  heirStateRate: 0.0495, // Heirs' state rate

  // Heir Configuration (multi-heir with per-heir settings)
  heirs: [],
  heirDistributionStrategy: 'rmd_based', // 'rmd_based' (auto-determine from owner death age) or 'lump_sum_year0' (immediate)
  heirNormalizationYears: 10, // Years to project forward for normalized comparison

  // Property Taxes & SALT
  annualPropertyTax: 0, // Annual property tax (user enters $, default disabled)
  saltCapMarried: 10000, // SALT cap for MFJ (2024 law)
  saltCapSingle: 10000, // SALT cap for single filers (2024 law)

  // Calculation Options
  iterativeTax: true, // Use iterative tax calculation
  maxIterations: 5, // Max iterations for convergence
  discountRate: 0.03, // Discount rate for present value calculations
};
