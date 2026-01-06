/**
 * Term Reference - Concise definitions for financial terms (Phase 8)
 *
 * Provides brief, technical definitions for financial terminology.
 * Target: Technically-savvy users who understand concepts but need
 * quick refreshers on abbreviations and calculations.
 */

export const TERM_REFERENCE = {
  // Tax & Income Terms
  RMD: {
    full: 'Required Minimum Distribution',
    definition:
      'Minimum annual IRA withdrawal required by IRS after age 73. Calculated as: IRA balance / Uniform Lifetime Table factor.',
    source: 'IRS Publication 590-B',
  },
  IRMAA: {
    full: 'Income-Related Monthly Adjustment Amount',
    definition:
      'Medicare premium surcharge for higher earners. Based on MAGI from 2 years prior.',
    source: 'Medicare.gov',
  },
  MAGI: {
    full: 'Modified Adjusted Gross Income',
    definition:
      'AGI plus certain deductions added back. Used for IRMAA, Roth eligibility, and ACA subsidies.',
    source: 'IRS Publication 590-A',
  },
  AGI: {
    full: 'Adjusted Gross Income',
    definition:
      'Total income minus specific deductions (IRA contributions, student loan interest, etc.).',
    source: 'IRS Form 1040',
  },
  NIIT: {
    full: 'Net Investment Income Tax',
    definition:
      '3.8% surtax on investment income when MAGI exceeds $250K (MFJ) or $200K (single).',
    source: 'IRC Section 1411',
  },
  LTCG: {
    full: 'Long-Term Capital Gains',
    definition: 'Gains on assets held >1 year. Taxed at preferential rates: 0%, 15%, or 20%.',
    source: 'IRS Publication 550',
  },
  SALT: {
    full: 'State and Local Tax',
    definition: 'Deduction for state income, sales, and property taxes. Currently capped at $10,000.',
    source: 'IRS Publication 17',
  },
  COLA: {
    full: 'Cost of Living Adjustment',
    definition: 'Annual Social Security increase based on CPI-W inflation index.',
    source: 'SSA.gov',
  },

  // Filing Status
  MFJ: {
    full: 'Married Filing Jointly',
    definition: 'Tax filing status for married couples combining income and deductions.',
  },

  // Time-Based Terms
  BOY: {
    full: 'Beginning of Year',
    definition: 'Account balance on January 1.',
  },
  EOY: {
    full: 'End of Year',
    definition: 'Account balance on December 31.',
  },
  PV: {
    full: 'Present Value',
    definition: "Future amount discounted to today's dollars using the discount rate.",
  },
  FV: {
    full: 'Future Value',
    definition: 'Nominal dollar amount at the future date.',
  },

  // Social Security
  SS: {
    full: 'Social Security',
    definition: 'Federal retirement benefit program. Benefits based on 35 highest earning years.',
  },

  // Account Types
  IRA: {
    full: 'Individual Retirement Account',
    definition:
      'Tax-advantaged retirement account. Traditional IRA: tax-deferred. Roth IRA: tax-free growth.',
  },
  AT: {
    full: 'After-Tax / Taxable',
    definition: 'Non-retirement investment accounts. Gains taxed as LTCG or STCG.',
  },
};

/**
 * Rows/fields that should display term icons
 * Maps field key to the relevant term abbreviation
 */
export const ROWS_WITH_TERMS = {
  rmdRequired: 'RMD',
  rmdFactor: 'RMD',
  irmaaTotal: 'IRMAA',
  irmaaPartB: 'IRMAA',
  irmaaPartD: 'IRMAA',
  irmaaMAGI: 'MAGI',
  niit: 'NIIT',
  ltcgTax: 'LTCG',
  taxableSS: 'SS',
  ssAnnual: 'SS',
  rothConversion: 'IRA',
  iraWithdrawal: 'IRA',
  iraBOY: 'IRA',
  iraEOY: 'IRA',
  atBOY: 'AT',
  atEOY: 'AT',
  atWithdrawal: 'AT',
  totalBOY: 'BOY',
  totalEOY: 'EOY',
  costBasisBOY: 'BOY',
  costBasisEOY: 'EOY',
};

/**
 * Auto-detect patterns for terms in labels
 */
export const AUTO_TERM_PATTERNS = {
  RMD: /\bRMD\b/,
  IRMAA: /\bIRMAA\b/,
  MAGI: /\bMAGI\b/,
  NIIT: /\bNIIT\b/,
  LTCG: /\bLTCG\b|Long.?Term Capital/i,
  SS: /\bSS\b|Social Security/i,
  IRA: /\bIRA\b/,
  PV: /\bPV\b|Present Value/i,
  FV: /\bFV\b|Future Value/i,
  BOY: /\bBOY\b|Beginning of Year/i,
  EOY: /\bEOY\b|End of Year/i,
  AT: /\bAT\b|After.?Tax/i,
  MFJ: /\bMFJ\b|Married Filing/i,
  SALT: /\bSALT\b/,
  COLA: /\bCOLA\b/,
  AGI: /\bAGI\b|Adjusted Gross/i,
};

/**
 * Find the first matching term in a label
 * @param {string} label - The label text to search
 * @returns {string|null} - The term abbreviation or null
 */
export function findTermInLabel(label) {
  for (const [term, pattern] of Object.entries(AUTO_TERM_PATTERNS)) {
    if (pattern.test(label)) {
      return term;
    }
  }
  return null;
}

/**
 * Get term definition by abbreviation
 * @param {string} term - The term abbreviation (e.g., 'RMD')
 * @returns {object|null} - The term reference object or null
 */
export function getTerm(term) {
  return TERM_REFERENCE[term] || null;
}

export default TERM_REFERENCE;
