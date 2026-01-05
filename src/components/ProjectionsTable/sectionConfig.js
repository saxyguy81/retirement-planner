/**
 * Story-Centric Section Configuration (Phase 6)
 *
 * Reorganizes sections into 5 logical groups that tell the story of a retirement year:
 * 1. ACCOUNTS - What do you have?
 * 2. INCOME & WITHDRAWALS - What's coming in?
 * 3. EXPENSES & TAXES - What's going out?
 * 4. LEGACY - What's left for heirs?
 * 5. METRICS - How is it trending?
 *
 * Row types:
 * - summaryRows: Bold, highlighted rows that show totals
 * - detailRows: Normal rows with standard styling
 * - nestedRows: Indented rows that expand/collapse under a parent
 * - advancedRows: Dim rows for technical details
 */

export const STORY_SECTIONS = [
  {
    id: 'accounts',
    title: 'ACCOUNTS',
    description: 'What do you have?',
    collapsed: false,
    summaryRows: [
      { key: 'totalBOY', label: 'Total Start', format: '$' },
      { key: 'totalEOY', label: 'Total End', format: '$', showDelta: true },
    ],
    detailRows: [
      { key: 'atBOY', label: 'Taxable', format: '$', pairKey: 'atEOY' },
      { key: 'iraBOY', label: 'Traditional IRA', format: '$', pairKey: 'iraEOY' },
      { key: 'rothBOY', label: 'Roth IRA', format: '$', pairKey: 'rothEOY' },
    ],
    advancedRows: [
      { key: 'costBasisBOY', label: 'Cost Basis', format: '$', pairKey: 'costBasisEOY' },
      { key: 'rothPercent', label: 'Roth %', format: '%' },
    ],
  },
  {
    id: 'income',
    title: 'INCOME & WITHDRAWALS',
    description: "What's coming in?",
    collapsed: false,
    summaryRows: [{ key: 'totalWithdrawal', label: 'Total Cash In', format: '$' }],
    detailRows: [
      { key: 'ssAnnual', label: 'Social Security', format: '$' },
      { key: 'rmdRequired', label: 'RMD Required', format: '$' },
    ],
    nestedRows: {
      totalWithdrawal: [
        { key: 'atWithdrawal', label: 'From Taxable', format: '$' },
        { key: 'iraWithdrawal', label: 'From IRA', format: '$' },
        { key: 'rothWithdrawal', label: 'From Roth', format: '$' },
      ],
    },
    advancedRows: [
      { key: 'rothConversion', label: 'Roth Conversion', format: '$', highlight: true },
      { key: 'rmdFactor', label: 'RMD Factor', format: 'n' },
    ],
  },
  {
    id: 'expenses',
    title: 'EXPENSES & TAXES',
    description: "What's going out?",
    collapsed: false,
    summaryRows: [],
    detailRows: [
      { key: 'expenses', label: 'Living Expenses', format: '$' },
      { key: 'totalTax', label: 'Total Tax', format: '$', expandable: true },
      { key: 'irmaaTotal', label: 'Medicare/IRMAA', format: '$', expandable: true },
    ],
    nestedRows: {
      totalTax: [
        { key: 'federalTax', label: 'Federal Tax', format: '$' },
        { key: 'ltcgTax', label: 'LTCG Tax', format: '$' },
        { key: 'niit', label: 'NIIT', format: '$' },
        { key: 'stateTax', label: 'State Tax', format: '$' },
      ],
      irmaaTotal: [
        { key: 'irmaaPartB', label: 'Part B', format: '$' },
        { key: 'irmaaPartD', label: 'Part D', format: '$' },
      ],
    },
    advancedRows: [
      { key: 'taxableSS', label: 'Taxable SS', format: '$' },
      { key: 'ordinaryIncome', label: 'Ordinary Income', format: '$' },
      { key: 'capitalGains', label: 'Capital Gains', format: '$' },
      { key: 'taxableOrdinary', label: 'Taxable Income', format: '$' },
      { key: 'irmaaMAGI', label: 'MAGI (2yr prior)', format: '$' },
    ],
  },
  {
    id: 'legacy',
    title: 'LEGACY',
    description: "What's left for heirs?",
    collapsed: false,
    summaryRows: [{ key: 'heirValue', label: 'After-Tax to Heirs', format: '$', highlight: true }],
    detailRows: [],
    advancedRows: [],
  },
  {
    id: 'metrics',
    title: 'METRICS',
    description: 'How is it trending?',
    collapsed: true, // Start collapsed
    summaryRows: [],
    detailRows: [
      { key: 'cumulativeTax', label: 'Cumulative Tax', format: '$' },
      { key: 'cumulativeIRMAA', label: 'Cumulative IRMAA', format: '$' },
      { key: 'cumulativeCapitalGains', label: 'Cumulative Cap Gains', format: '$' },
    ],
    advancedRows: [
      { key: 'effectiveAtReturn', label: 'AT Return Rate', format: '%' },
      { key: 'effectiveIraReturn', label: 'IRA Return Rate', format: '%' },
      { key: 'effectiveRothReturn', label: 'Roth Return Rate', format: '%' },
      { key: 'atLiquidationPercent', label: 'AT Liquidation %', format: '%' },
    ],
  },
];

/**
 * Legacy SECTIONS constant for backward compatibility
 * Maps new structure to old flat array format
 */
export const LEGACY_SECTIONS = [
  {
    title: 'STARTING POSITION',
    rows: [
      { key: 'atBOY', label: 'After-Tax', format: '$' },
      { key: 'iraBOY', label: 'Traditional IRA', format: '$' },
      { key: 'rothBOY', label: 'Roth IRA', format: '$' },
      { key: 'totalBOY', label: 'Total', format: '$', highlight: true },
      { key: 'costBasisBOY', label: 'Cost Basis', format: '$', dim: true },
    ],
  },
  {
    title: 'INCOME',
    rows: [{ key: 'ssAnnual', label: 'Social Security', format: '$' }],
  },
  {
    title: 'CASH NEEDS',
    rows: [
      { key: 'expenses', label: 'Annual Expenses', format: '$' },
      { key: 'irmaaTotal', label: 'IRMAA Surcharges', format: '$' },
    ],
  },
  {
    title: 'RMD & CONVERSIONS',
    rows: [
      { key: 'rmdFactor', label: 'RMD Factor', format: 'n', dim: true },
      { key: 'rmdRequired', label: 'RMD Required', format: '$' },
      { key: 'rothConversion', label: 'Roth Conversion', format: '$', highlight: true },
    ],
  },
  {
    title: 'WITHDRAWALS',
    rows: [
      { key: 'atWithdrawal', label: 'From After-Tax', format: '$' },
      { key: 'iraWithdrawal', label: 'From IRA', format: '$' },
      { key: 'rothWithdrawal', label: 'From Roth', format: '$' },
      { key: 'totalWithdrawal', label: 'Total Withdrawal', format: '$', highlight: true },
    ],
  },
  {
    title: 'TAX DETAIL',
    rows: [
      { key: 'taxableSS', label: 'Taxable Soc Sec', format: '$', dim: true },
      { key: 'ordinaryIncome', label: 'Ordinary Income', format: '$', dim: true },
      { key: 'capitalGains', label: 'Capital Gains', format: '$', dim: true },
      { key: 'taxableOrdinary', label: 'Taxable Income', format: '$', dim: true },
      { key: 'federalTax', label: 'Federal Tax', format: '$' },
      { key: 'ltcgTax', label: 'LTCG Tax', format: '$' },
      { key: 'niit', label: 'NIIT (3.8%)', format: '$' },
      { key: 'stateTax', label: 'State Tax', format: '$' },
      { key: 'totalTax', label: 'Total Tax', format: '$', highlight: true },
    ],
  },
  {
    title: 'IRMAA DETAIL',
    rows: [
      { key: 'irmaaMAGI', label: 'MAGI (2yr prior)', format: '$', dim: true },
      { key: 'irmaaPartB', label: 'Part B Surcharge', format: '$', dim: true },
      { key: 'irmaaPartD', label: 'Part D Surcharge', format: '$', dim: true },
    ],
  },
  {
    title: 'ENDING POSITION',
    rows: [
      { key: 'atEOY', label: 'After-Tax', format: '$' },
      { key: 'iraEOY', label: 'Traditional IRA', format: '$' },
      { key: 'rothEOY', label: 'Roth IRA', format: '$' },
      { key: 'totalEOY', label: 'Total', format: '$', highlight: true },
      { key: 'costBasisEOY', label: 'Cost Basis', format: '$', dim: true },
      { key: 'rothPercent', label: 'Roth %', format: '%', dim: true },
    ],
  },
  {
    title: 'HEIR VALUE',
    rows: [{ key: 'heirValue', label: 'After-Tax to Heirs', format: '$', highlight: true }],
  },
  {
    title: 'ANALYSIS & METRICS',
    rows: [
      { key: 'effectiveAtReturn', label: 'AT Return Rate', format: '%', dim: true },
      { key: 'effectiveIraReturn', label: 'IRA Return Rate', format: '%', dim: true },
      { key: 'effectiveRothReturn', label: 'Roth Return Rate', format: '%', dim: true },
      { key: 'cumulativeTax', label: 'Cumulative Tax Paid', format: '$' },
      { key: 'cumulativeIRMAA', label: 'Cumulative IRMAA', format: '$' },
      { key: 'cumulativeCapitalGains', label: 'Cumulative Cap Gains', format: '$' },
      { key: 'atLiquidationPercent', label: 'AT Liquidation %', format: '%', highlight: true },
    ],
  },
];

/**
 * Get all row keys from a section (for validation/lookup)
 */
export function getAllRowKeys(section) {
  const keys = [];
  if (section.summaryRows) keys.push(...section.summaryRows.map(r => r.key));
  if (section.detailRows) keys.push(...section.detailRows.map(r => r.key));
  if (section.advancedRows) keys.push(...section.advancedRows.map(r => r.key));
  if (section.nestedRows) {
    Object.values(section.nestedRows).forEach(rows => {
      keys.push(...rows.map(r => r.key));
    });
  }
  return keys;
}

/**
 * Validate that all keys in STORY_SECTIONS exist in projection data
 */
export function validateSectionConfig(projectionSample) {
  const allKeys = STORY_SECTIONS.flatMap(getAllRowKeys);
  const missing = allKeys.filter(k => !(k in projectionSample));
  if (missing.length > 0) {
    console.warn('Missing projection fields for story sections:', missing);
  }
  return missing.length === 0;
}

/**
 * Convert STORY_SECTIONS to flat row array (for compatibility)
 */
export function flattenSections(sections = STORY_SECTIONS) {
  return sections.flatMap(section => {
    const rows = [];

    // Summary rows first
    if (section.summaryRows) {
      rows.push(
        ...section.summaryRows.map(r => ({
          ...r,
          type: 'summary',
          sectionId: section.id,
        }))
      );
    }

    // Detail rows
    if (section.detailRows) {
      section.detailRows.forEach(row => {
        rows.push({
          ...row,
          type: row.expandable ? 'expandable' : 'detail',
          sectionId: section.id,
        });

        // Add nested rows if this is an expandable row
        if (row.expandable && section.nestedRows?.[row.key]) {
          rows.push(
            ...section.nestedRows[row.key].map(r => ({
              ...r,
              type: 'nested',
              parentKey: row.key,
              sectionId: section.id,
            }))
          );
        }
      });
    }

    // Advanced rows
    if (section.advancedRows) {
      rows.push(
        ...section.advancedRows.map(r => ({
          ...r,
          type: 'advanced',
          sectionId: section.id,
        }))
      );
    }

    return rows;
  });
}

export default STORY_SECTIONS;
