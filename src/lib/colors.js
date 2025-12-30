/**
 * Accessible Color System
 *
 * Uses blue-orange as primary semantic pair (colorblind-safe)
 * Based on Okabe-Ito palette: https://siegal.bio.nyu.edu/color-palette/
 * WCAG 2.1 AA compliant (4.5:1 contrast for text)
 */

// Cell value colors by semantic meaning
export const VALUE_COLORS = {
  // Positive flows (additions, income) - Blue (Okabe-Ito)
  positive: {
    text: 'text-blue-400', // #0072B2
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    ring: 'ring-blue-500',
  },
  // Negative flows (subtractions, withdrawals, taxes) - Orange/Vermillion (Okabe-Ito)
  negative: {
    text: 'text-orange-400', // #D55E00
    bg: 'bg-orange-500/10',
    border: 'border-orange-500',
    ring: 'ring-orange-500',
  },
  // Neutral/calculated values
  neutral: {
    text: 'text-slate-300',
    bg: 'bg-slate-800/50',
    border: 'border-slate-600',
    ring: 'ring-slate-400',
  },
  // Highlighted totals - Teal (Okabe-Ito Blue-Green)
  highlight: {
    text: 'text-teal-400', // #009E73
    bg: 'bg-teal-400/10',
    border: 'border-teal-400',
    ring: 'ring-teal-400',
  },
  // Dim/secondary
  dim: {
    text: 'text-slate-500',
    bg: 'bg-slate-900/30',
    border: 'border-slate-700',
    ring: 'ring-slate-600',
  },
};

// Formula variable colors (for inspector) - All from Okabe-Ito palette
export const FORMULA_COLORS = {
  // Beginning of Year balances
  iraBOY: { color: '#E69F00', label: 'IRA BOY', key: 'iraBOY' }, // Okabe-Ito Orange
  rothBOY: { color: '#009E73', label: 'Roth BOY', key: 'rothBOY' }, // Okabe-Ito Blue-Green
  atBOY: { color: '#56B4E9', label: 'AT BOY', key: 'atBOY' }, // Okabe-Ito Sky Blue
  totalBOY: { color: '#a855f7', label: 'Total BOY', key: 'totalBOY' }, // Purple

  // End of Year balances
  iraEOY: { color: '#E69F00', label: 'IRA EOY', key: 'iraEOY' }, // Okabe-Ito Orange
  rothEOY: { color: '#009E73', label: 'Roth EOY', key: 'rothEOY' }, // Okabe-Ito Blue-Green
  atEOY: { color: '#56B4E9', label: 'AT EOY', key: 'atEOY' }, // Okabe-Ito Sky Blue
  totalEOY: { color: '#a855f7', label: 'Total EOY', key: 'totalEOY' }, // Purple

  // Withdrawals
  atWithdrawal: { color: '#D55E00', label: 'AT W', key: 'atWithdrawal' }, // Okabe-Ito Vermillion
  iraWithdrawal: { color: '#D55E00', label: 'IRA W', key: 'iraWithdrawal' }, // Okabe-Ito Vermillion
  rothWithdrawal: { color: '#D55E00', label: 'Roth W', key: 'rothWithdrawal' }, // Okabe-Ito Vermillion
  totalWithdrawal: { color: '#D55E00', label: 'Total W', key: 'totalWithdrawal' }, // Okabe-Ito Vermillion

  // Roth Conversion
  rothConversion: { color: '#CC79A7', label: 'Roth Conv', key: 'rothConversion' }, // Okabe-Ito Pink

  // Taxes
  federalTax: { color: '#CC79A7', label: 'Fed Tax', key: 'federalTax' }, // Okabe-Ito Pink
  ltcgTax: { color: '#CC79A7', label: 'LTCG Tax', key: 'ltcgTax' }, // Okabe-Ito Pink
  niit: { color: '#CC79A7', label: 'NIIT', key: 'niit' }, // Okabe-Ito Pink
  stateTax: { color: '#CC79A7', label: 'State Tax', key: 'stateTax' }, // Okabe-Ito Pink
  totalTax: { color: '#CC79A7', label: 'Total Tax', key: 'totalTax' }, // Okabe-Ito Pink

  // Income & Expenses
  ssAnnual: { color: '#0072B2', label: 'SS', key: 'ssAnnual' }, // Okabe-Ito Blue
  taxableSS: { color: '#0072B2', label: 'Taxable SS', key: 'taxableSS' }, // Okabe-Ito Blue
  expenses: { color: '#F0E442', label: 'Expenses', key: 'expenses' }, // Okabe-Ito Yellow
  irmaaTotal: { color: '#F0E442', label: 'IRMAA', key: 'irmaaTotal' }, // Okabe-Ito Yellow
  propertyTax: { color: '#F0E442', label: 'Property Tax', key: 'propertyTax' }, // Okabe-Ito Yellow
  deductiblePropertyTax: { color: '#F0E442', label: 'SALT Ded', key: 'deductiblePropertyTax' }, // Okabe-Ito Yellow
  saltCap: { color: '#94a3b8', label: 'SALT Cap', key: 'saltCap' }, // Slate

  // RMD
  rmdRequired: { color: '#E69F00', label: 'RMD', key: 'rmdRequired' }, // Okabe-Ito Orange
  rmdFactor: { color: '#94a3b8', label: 'RMD Factor', key: 'rmdFactor' }, // Slate

  // Returns
  effectiveAtReturn: { color: '#10b981', label: 'AT Return', key: 'effectiveAtReturn' }, // Emerald
  effectiveIraReturn: { color: '#10b981', label: 'IRA Return', key: 'effectiveIraReturn' }, // Emerald
  effectiveRothReturn: { color: '#10b981', label: 'Roth Return', key: 'effectiveRothReturn' }, // Emerald

  // Capital Gains
  capitalGains: { color: '#f59e0b', label: 'Cap Gains', key: 'capitalGains' }, // Amber

  // Heir
  heirValue: { color: '#a855f7', label: 'Heir Value', key: 'heirValue' }, // Purple

  // Taxable Income
  ordinaryIncome: { color: '#0072B2', label: 'Ord Inc', key: 'ordinaryIncome' }, // Okabe-Ito Blue
  taxableOrdinary: { color: '#0072B2', label: 'Taxable Inc', key: 'taxableOrdinary' }, // Okabe-Ito Blue
  standardDeduction: { color: '#94a3b8', label: 'Std Ded', key: 'standardDeduction' }, // Slate
};

// Row semantic categories
export const ROW_SEMANTICS = {
  // Beginning of year - neutral (calculated from prior)
  atBOY: 'neutral',
  iraBOY: 'neutral',
  rothBOY: 'neutral',
  totalBOY: 'highlight',
  costBasisBOY: 'dim',

  // Income - positive (money in)
  ssAnnual: 'positive',

  // Expenses - negative (money out)
  expenses: 'negative',
  pvExpenses: 'negative',
  rothConversion: 'neutral',
  propertyTax: 'negative',
  deductiblePropertyTax: 'dim',
  saltCap: 'dim',

  // RMD
  rmdFactor: 'dim',
  rmdRequired: 'neutral',

  // Withdrawals - negative (money leaving accounts)
  atWithdrawal: 'negative',
  iraWithdrawal: 'negative',
  rothWithdrawal: 'negative',
  totalWithdrawal: 'negative',

  // Tax detail - dim for intermediate, negative for actual taxes
  taxableSS: 'dim',
  ordinaryIncome: 'dim',
  capitalGains: 'dim',
  taxableOrdinary: 'dim',
  federalTax: 'negative',
  ltcgTax: 'negative',
  niit: 'negative',
  stateTax: 'negative',
  totalTax: 'negative',

  // IRMAA - negative (money out)
  irmaaMAGI: 'dim',
  irmaaPartB: 'dim',
  irmaaPartD: 'dim',
  irmaaTotal: 'negative',

  // End of year - neutral/highlight
  atEOY: 'neutral',
  iraEOY: 'neutral',
  rothEOY: 'neutral',
  totalEOY: 'highlight',
  pvAtEOY: 'neutral',
  pvIraEOY: 'neutral',
  pvRothEOY: 'neutral',
  pvTotalEOY: 'highlight',
  costBasisEOY: 'dim',
  rothPercent: 'dim',

  // Heir value
  heirValue: 'highlight',
  pvHeirValue: 'highlight',

  // Returns - positive (growth)
  effectiveAtReturn: 'positive',
  effectiveIraReturn: 'positive',
  effectiveRothReturn: 'positive',

  // Cumulative
  cumulativeTax: 'negative',
  cumulativeIRMAA: 'negative',

  // Capital Gains Analysis
  cumulativeCapitalGains: 'neutral',
  cumulativeATTax: 'negative',
  atLiquidationPercent: 'highlight',
};

// Helper function to get color classes for a row key
export function getRowColors(rowKey, rowConfig = {}) {
  // If row has explicit highlight or dim, use that
  if (rowConfig.highlight) {
    return VALUE_COLORS.highlight;
  }
  if (rowConfig.dim) {
    return VALUE_COLORS.dim;
  }

  // Otherwise use semantic mapping
  const semantic = ROW_SEMANTICS[rowKey] || 'neutral';
  return VALUE_COLORS[semantic];
}

// Accessibility note: Always pair color with secondary indicator
// - Prefix signs: +/- for positive/negative values
// - Directional icons: up/down arrows where appropriate
// - Pattern/weight: bold for totals, lighter for dim
