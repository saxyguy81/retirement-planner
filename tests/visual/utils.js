/**
 * Visual Test Utilities
 *
 * Mock data and helpers for visual regression testing
 */

// Mock projection data for consistent visual tests
export const MOCK_PROJECTIONS = [
  {
    year: 2026,
    age: 71,
    yearsFromStart: 0,
    atBOY: 100000,
    iraBOY: 500000,
    rothBOY: 200000,
    totalBOY: 800000,
    costBasisBOY: 25000,
    ssAnnual: 36000,
    expenses: 80000,
    rothConversion: 0,
    rmdFactor: 0,
    rmdRequired: 0,
    atWithdrawal: 20000,
    iraWithdrawal: 30000,
    rothWithdrawal: 0,
    totalWithdrawal: 50000,
    taxableSS: 30600,
    ordinaryIncome: 60600,
    capitalGains: 15000,
    taxableOrdinary: 31400,
    federalTax: 3768,
    ltcgTax: 0,
    niit: 0,
    stateTax: 743,
    totalTax: 4511,
    irmaaMAGI: 0,
    irmaaPartB: 0,
    irmaaPartD: 0,
    irmaaTotal: 0,
    atEOY: 83200,
    iraEOY: 498200,
    rothEOY: 216000,
    totalEOY: 797400,
    costBasisEOY: 20000,
    heirValue: 700000,
    effectiveAtReturn: 0.04,
    effectiveIraReturn: 0.06,
    effectiveRothReturn: 0.08,
    cumulativeTax: 4511,
    cumulativeIRMAA: 0,
    cumulativeExpenses: 80000,
    rothPercent: 27.1,
    pvAtEOY: 80777,
    pvIraEOY: 483689,
    pvRothEOY: 209709,
    pvTotalEOY: 774175,
    pvHeirValue: 679612,
    pvExpenses: 77670,
  },
  {
    year: 2027,
    age: 72,
    yearsFromStart: 1,
    atBOY: 83200,
    iraBOY: 498200,
    rothBOY: 216000,
    totalBOY: 797400,
    costBasisBOY: 20000,
    ssAnnual: 36720,
    expenses: 82400,
    rothConversion: 0,
    rmdFactor: 0,
    rmdRequired: 0,
    atWithdrawal: 22000,
    iraWithdrawal: 32000,
    rothWithdrawal: 0,
    totalWithdrawal: 54000,
    taxableSS: 31212,
    ordinaryIncome: 63212,
    capitalGains: 16500,
    taxableOrdinary: 34012,
    federalTax: 4081,
    ltcgTax: 0,
    niit: 0,
    stateTax: 817,
    totalTax: 4898,
    irmaaMAGI: 0,
    irmaaPartB: 0,
    irmaaPartD: 0,
    irmaaTotal: 0,
    atEOY: 63648,
    iraEOY: 494372,
    rothEOY: 233280,
    totalEOY: 791300,
    costBasisEOY: 14706,
    heirValue: 695000,
    effectiveAtReturn: 0.04,
    effectiveIraReturn: 0.06,
    effectiveRothReturn: 0.08,
    cumulativeTax: 9409,
    cumulativeIRMAA: 0,
    cumulativeExpenses: 162400,
    rothPercent: 29.5,
    pvAtEOY: 60000,
    pvIraEOY: 466000,
    pvRothEOY: 220000,
    pvTotalEOY: 746000,
    pvHeirValue: 655000,
    pvExpenses: 77670,
  },
  {
    year: 2028,
    age: 73,
    yearsFromStart: 2,
    atBOY: 63648,
    iraBOY: 494372,
    rothBOY: 233280,
    totalBOY: 791300,
    costBasisBOY: 14706,
    ssAnnual: 37454,
    expenses: 84872,
    rothConversion: 0,
    rmdFactor: 26.5,
    rmdRequired: 18656,
    atWithdrawal: 18000,
    iraWithdrawal: 35000,
    rothWithdrawal: 0,
    totalWithdrawal: 53000,
    taxableSS: 31836,
    ordinaryIncome: 66836,
    capitalGains: 14000,
    taxableOrdinary: 37636,
    federalTax: 4516,
    ltcgTax: 0,
    niit: 0,
    stateTax: 693,
    totalTax: 5209,
    irmaaMAGI: 0,
    irmaaPartB: 0,
    irmaaPartD: 0,
    irmaaTotal: 0,
    atEOY: 47434,
    iraEOY: 487134,
    rothEOY: 251942,
    totalEOY: 786510,
    costBasisEOY: 10544,
    heirValue: 690000,
    effectiveAtReturn: 0.04,
    effectiveIraReturn: 0.06,
    effectiveRothReturn: 0.08,
    cumulativeTax: 14618,
    cumulativeIRMAA: 0,
    cumulativeExpenses: 247272,
    rothPercent: 32.0,
    pvAtEOY: 43000,
    pvIraEOY: 442000,
    pvRothEOY: 229000,
    pvTotalEOY: 714000,
    pvHeirValue: 627000,
    pvExpenses: 75500,
  },
];

// Mock params for testing
export const MOCK_PARAMS = {
  startYear: 2026,
  endYear: 2030,
  birthYear: 1955,
  annualExpenses: 80000,
  expenseInflation: 0.03,
  socialSecurityMonthly: 3000,
  ssCOLA: 0.02,
  afterTaxStart: 100000,
  iraStart: 500000,
  rothStart: 200000,
  afterTaxCostBasis: 25000,
  atReturn: 0.04,
  iraReturn: 0.06,
  rothReturn: 0.08,
  discountRate: 0.03,
  heirFedRate: 0.24,
  heirStateRate: 0.05,
  rothConversions: {},
  iterativeTax: false,
};

// Mock summary for dashboard testing
export const MOCK_SUMMARY = {
  totalTaxPaid: 150000,
  finalHeirValue: 700000,
  totalExpenses: 400000,
  averageEffectiveRate: 0.18,
  peakIRMAA: 0,
  totalIRMAA: 0,
  finalRothPercent: 35,
};

/**
 * Render helper that wraps component with necessary providers
 */
export function renderWithProviders(ui, options = {}) {
  // For now, just return the UI since we don't have complex providers
  // This can be extended to add context providers, theme, etc.
  return ui;
}

/**
 * Wait for charts to render (Recharts has async rendering)
 */
export async function waitForCharts(page) {
  await page.waitForTimeout(500);
}

/**
 * Disable animations for stable screenshots
 */
export function disableAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `;
  document.head.appendChild(style);
}
