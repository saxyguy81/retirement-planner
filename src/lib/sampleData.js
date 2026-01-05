/**
 * Sample Data for New Users
 *
 * Realistic sample data that demonstrates the retirement planner's capabilities.
 * Represents a 62-year-old couple in Illinois with $1.8M saved, planning to retire at 65.
 *
 * EMOTIONAL DESIGN: Sample shows a realistic achievable outcome to build confidence.
 * Avoid samples that look too perfect or too dire.
 */

export const SAMPLE_PARAMS = {
  // Timeline
  startYear: 2025,
  endYear: 2055,

  // Accounts - realistic middle-class retiree
  afterTaxStart: 400000,
  iraStart: 1000000,
  rothStart: 400000,
  afterTaxCostBasis: 250000,

  // Social Security - realistic benefit
  socialSecurityMonthly: 3200,
  ssCOLA: 0.025,

  // Expenses - comfortable but not lavish
  annualExpenses: 85000,
  expenseInflation: 0.025,
  expenseOverrides: {},

  // Returns - moderate/realistic
  returnMode: 'account',
  atReturn: 0.06,
  iraReturn: 0.06,
  rothReturn: 0.07,

  // Risk-based mode defaults (not used in sample but needed)
  lowRiskTarget: 200000,
  modRiskTarget: 400000,
  lowRiskReturn: 0.03,
  modRiskReturn: 0.05,
  highRiskReturn: 0.08,

  // Tax - Illinois defaults
  stateTaxRate: 0.0495,
  capitalGainsPercent: 0.6,
  bracketInflation: 0.025,

  // Roth Conversions - show the feature exists
  rothConversions: {
    2025: { amount: 50000, isPV: true },
    2026: { amount: 50000, isPV: true },
  },

  // Capital gains harvesting - empty for sample
  atHarvestOverrides: {},

  // One heir - simple
  heirs: [
    {
      name: 'Child',
      state: 'IL',
      agi: 150000,
      splitPercent: 100,
      birthYear: 1990,
      taxableRoR: 0.06,
    },
  ],

  // Heir distribution settings
  heirDistributionStrategy: 'rmd_based',
  heirNormalizationYears: 10,

  // Reasonable defaults for everything else
  discountRate: 0.03,
  magi2024: 180000,
  magi2025: 120000,
  survivorDeathYear: null,
  survivorSSPercent: 0.72,
  survivorExpensePercent: 0.7,

  // Property tax
  annualPropertyTax: 8000,
  saltCapMarried: 10000,
  saltCapSingle: 10000,
};

export const SAMPLE_SETTINGS = {
  primaryName: 'Sample',
  primaryBirthYear: 1963,
  spouseName: 'Partner',
  spouseBirthYear: 1965,
};

// Default sample options
export const SAMPLE_OPTIONS = {
  iterativeTax: true,
  maxIterations: 5,
};
