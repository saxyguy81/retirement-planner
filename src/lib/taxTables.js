/**
 * Tax Tables and Constants for Retirement Planning
 * Base year: 2024 (inflate for future years using bracketInflation rate)
 */

// =============================================================================
// FEDERAL INCOME TAX BRACKETS (2024 Married Filing Jointly)
// =============================================================================
export const FEDERAL_BRACKETS_MFJ_2024 = [
  { rate: 0.10, threshold: 0 },
  { rate: 0.12, threshold: 23200 },
  { rate: 0.22, threshold: 94300 },
  { rate: 0.24, threshold: 201050 },
  { rate: 0.32, threshold: 383900 },
  { rate: 0.35, threshold: 487450 },
  { rate: 0.37, threshold: 731200 },
];

// Federal brackets for Single filer (survivor scenario)
export const FEDERAL_BRACKETS_SINGLE_2024 = [
  { rate: 0.10, threshold: 0 },
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
  { rate: 0.00, threshold: 0 },
  { rate: 0.15, threshold: 94050 },
  { rate: 0.20, threshold: 583750 },
];

export const LTCG_BRACKETS_SINGLE_2024 = [
  { rate: 0.00, threshold: 0 },
  { rate: 0.15, threshold: 47025 },
  { rate: 0.20, threshold: 518900 },
];

// =============================================================================
// STANDARD DEDUCTION (2024)
// =============================================================================
export const STANDARD_DEDUCTION_MFJ_2024 = 29200;
export const STANDARD_DEDUCTION_SINGLE_2024 = 14600;
export const SENIOR_BONUS_MFJ_2024 = 3100; // Both 65+
export const SENIOR_BONUS_SINGLE_2024 = 1950;

// =============================================================================
// IRMAA BRACKETS (2024) - Based on MAGI from 2 years prior
// Monthly amounts that get multiplied by 12 for annual
// =============================================================================
export const IRMAA_BRACKETS_MFJ_2024 = [
  { threshold: 0,      partB: 174.70, partD: 0 },
  { threshold: 206000, partB: 244.60, partD: 12.90 },
  { threshold: 258000, partB: 349.40, partD: 33.30 },
  { threshold: 322000, partB: 454.20, partD: 53.80 },
  { threshold: 386000, partB: 559.00, partD: 74.20 },
  { threshold: 750000, partB: 594.00, partD: 81.00 },
];

export const IRMAA_BRACKETS_SINGLE_2024 = [
  { threshold: 0,      partB: 174.70, partD: 0 },
  { threshold: 103000, partB: 244.60, partD: 12.90 },
  { threshold: 129000, partB: 349.40, partD: 33.30 },
  { threshold: 161000, partB: 454.20, partD: 53.80 },
  { threshold: 193000, partB: 559.00, partD: 74.20 },
  { threshold: 500000, partB: 594.00, partD: 81.00 },
];

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
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
  112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3,
  120: 2.0,
};

// RMD starting age (SECURE 2.0 rules)
export const RMD_START_AGE = 73;

// =============================================================================
// SOCIAL SECURITY TAXATION THRESHOLDS (Combined Income method)
// These are NOT indexed for inflation
// =============================================================================
export const SS_TAX_THRESHOLDS_MFJ = {
  tier1: 32000,  // 0% taxable below this
  tier2: 44000,  // Up to 50% taxable between tier1 and tier2
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
  startYear: 2026,
  endYear: 2055,
  birthYear: 1955, // Ira's birth year for age calculations
  
  // Starting Account Balances
  afterTaxStart: 474000,
  iraStart: 6121000,
  rothStart: 2612000,
  afterTaxCostBasis: 119000, // For capital gains calculations
  
  // Return Assumptions
  returnMode: 'blended', // 'account' or 'blended' (risk-based)
  atReturn: 0.04,        // Used in 'account' mode
  iraReturn: 0.06,       // Used in 'account' mode
  rothReturn: 0.08,      // Used in 'account' mode
  
  // Risk-Based Returns (used in 'blended' mode)
  lowRiskTarget: 3500000,   // First $3.5M at low risk
  modRiskTarget: 3000000,   // Next $3M at moderate risk
  lowRiskReturn: 0.04,      // Bonds, CDs, money market
  modRiskReturn: 0.06,      // Balanced funds
  highRiskReturn: 0.08,     // Stocks, growth funds
  
  // Social Security
  socialSecurityMonthly: 5800, // Combined monthly in 2026
  ssCOLA: 0.025,               // Annual cost-of-living adjustment
  
  // Expenses
  annualExpenses: 180000,   // Starting annual expenses
  expenseInflation: 0.03,   // Annual expense growth
  
  // Tax Parameters
  stateTaxRate: 0.0495,     // Illinois flat rate
  capitalGainsPercent: 0.75, // % of AT withdrawal that's gains vs basis
  bracketInflation: 0.03,    // Annual bracket inflation assumption
  
  // Roth Conversions (year -> amount)
  rothConversions: {
    2026: 700000,
    2027: 700000,
  },
  
  // MAGI History (for IRMAA 2-year lookback)
  magi2024: 600000,
  magi2025: 600000,
  
  // Survivor Scenario
  survivorDeathYear: null,     // Year Ira dies (null = no death modeled)
  survivorSSPercent: 0.72,     // Carol gets 72% of combined SS
  survivorExpensePercent: 0.70, // Expenses drop to 70%
  
  // Heir Parameters
  heirFedRate: 0.37,      // Heirs' federal marginal rate on inherited IRA
  heirStateRate: 0.0495,  // Heirs' state rate
  
  // Calculation Options
  iterativeTax: true,     // Use iterative tax calculation
  maxIterations: 5,       // Max iterations for convergence
};
