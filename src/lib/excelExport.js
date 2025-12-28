/**
 * Excel Export Utility
 *
 * Exports retirement projections to Excel format with:
 * - Full projections worksheet
 * - Summary statistics
 * - Multiple scenarios (if provided)
 * - Formatted headers and styling
 */

import * as XLSX from 'xlsx';

// Column definitions for projections export
const PROJECTION_COLUMNS = [
  { key: 'year', header: 'Year', width: 8 },
  { key: 'age', header: 'Age', width: 6 },

  // Beginning of Year Balances
  { key: 'atBOY', header: 'AT (BOY)', width: 14, format: '$' },
  { key: 'iraBOY', header: 'IRA (BOY)', width: 14, format: '$' },
  { key: 'rothBOY', header: 'Roth (BOY)', width: 14, format: '$' },
  { key: 'totalBOY', header: 'Total (BOY)', width: 14, format: '$' },
  { key: 'costBasisBOY', header: 'Cost Basis', width: 14, format: '$' },

  // Income & Expenses
  { key: 'ssAnnual', header: 'Social Security', width: 14, format: '$' },
  { key: 'expenses', header: 'Expenses', width: 14, format: '$' },
  { key: 'rothConversion', header: 'Roth Conv.', width: 14, format: '$' },

  // RMD
  { key: 'rmdFactor', header: 'RMD Factor', width: 10, format: 'n' },
  { key: 'rmdRequired', header: 'RMD Required', width: 14, format: '$' },

  // Withdrawals
  { key: 'atWithdrawal', header: 'AT Withdrawal', width: 14, format: '$' },
  { key: 'iraWithdrawal', header: 'IRA Withdrawal', width: 14, format: '$' },
  { key: 'rothWithdrawal', header: 'Roth Withdrawal', width: 14, format: '$' },
  { key: 'totalWithdrawal', header: 'Total Withdrawal', width: 14, format: '$' },

  // Tax Detail
  { key: 'taxableSS', header: 'Taxable SS', width: 14, format: '$' },
  { key: 'ordinaryIncome', header: 'Ordinary Income', width: 14, format: '$' },
  { key: 'capitalGains', header: 'Cap Gains', width: 14, format: '$' },
  { key: 'taxableOrdinary', header: 'Taxable Income', width: 14, format: '$' },
  { key: 'federalTax', header: 'Federal Tax', width: 14, format: '$' },
  { key: 'ltcgTax', header: 'LTCG Tax', width: 14, format: '$' },
  { key: 'niit', header: 'NIIT', width: 12, format: '$' },
  { key: 'stateTax', header: 'State Tax', width: 12, format: '$' },
  { key: 'totalTax', header: 'Total Tax', width: 14, format: '$' },

  // IRMAA
  { key: 'irmaaMAGI', header: 'IRMAA MAGI', width: 14, format: '$' },
  { key: 'irmaaTotal', header: 'IRMAA Total', width: 12, format: '$' },

  // End of Year Balances
  { key: 'atEOY', header: 'AT (EOY)', width: 14, format: '$' },
  { key: 'iraEOY', header: 'IRA (EOY)', width: 14, format: '$' },
  { key: 'rothEOY', header: 'Roth (EOY)', width: 14, format: '$' },
  { key: 'totalEOY', header: 'Total (EOY)', width: 14, format: '$' },

  // Heir Value
  { key: 'heirValue', header: 'Heir Value', width: 14, format: '$' },
  { key: 'rothPercent', header: 'Roth %', width: 10, format: '%' },

  // Effective Returns
  { key: 'effectiveAtReturn', header: 'AT Return', width: 10, format: '%' },
  { key: 'effectiveIraReturn', header: 'IRA Return', width: 10, format: '%' },
  { key: 'effectiveRothReturn', header: 'Roth Return', width: 10, format: '%' },

  // Cumulative
  { key: 'cumulativeTax', header: 'Cumul. Tax', width: 14, format: '$' },
  { key: 'cumulativeIRMAA', header: 'Cumul. IRMAA', width: 14, format: '$' },
];

// Format cell value based on type
function formatCellValue(value, format) {
  if (value == null || (typeof value === 'number' && isNaN(value))) return '';

  switch (format) {
    case '$':
      return typeof value === 'number' ? value : 0;
    case '%':
      return typeof value === 'number' ? value : 0;
    case 'n':
      return typeof value === 'number' ? value : 0;
    default:
      return value;
  }
}

// Create projections worksheet
function createProjectionsSheet(projections, scenarioName = '') {
  const headers = PROJECTION_COLUMNS.map(col => col.header);
  const data = [headers];

  projections.forEach(proj => {
    const row = PROJECTION_COLUMNS.map(col => formatCellValue(proj[col.key], col.format));
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_array ? XLSX.utils.aoa_to_sheet(data) : XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = PROJECTION_COLUMNS.map(col => ({ wch: col.width }));

  // Set number formats for cells
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let col = 0; col <= range.e.c; col++) {
    const colDef = PROJECTION_COLUMNS[col];
    if (!colDef) continue;

    for (let row = 1; row <= range.e.r; row++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellRef];
      if (!cell) continue;

      if (colDef.format === '$') {
        cell.z = '$#,##0';
      } else if (colDef.format === '%') {
        cell.z = '0.0%';
      } else if (colDef.format === 'n') {
        cell.z = '0.0';
      }
    }
  }

  return ws;
}

// Create summary worksheet
function createSummarySheet(summary, params) {
  const data = [
    ['RETIREMENT PROJECTION SUMMARY'],
    [],
    ['Timeline'],
    ['Start Year', summary.startYear],
    ['End Year', summary.endYear],
    ['Years Modeled', summary.yearsModeled],
    [],
    ['Portfolio'],
    ['Starting Portfolio', summary.startingPortfolio],
    ['Ending Portfolio', summary.endingPortfolio],
    ['Portfolio Growth', summary.portfolioGrowth],
    ['Peak Portfolio', summary.peakPortfolio],
    ['Peak Year', summary.peakYear],
    [],
    ['Heir Value'],
    ['Starting Heir Value', summary.startingHeirValue],
    ['Ending Heir Value', summary.endingHeirValue],
    ['Final Roth %', summary.finalRothPercent],
    [],
    ['Taxes & Costs'],
    ['Total Tax Paid', summary.totalTaxPaid],
    ['Total IRMAA Paid', summary.totalIRMAAPaid],
    ['Total Expenses', summary.totalExpenses],
    [],
    ['Model Parameters'],
    ['Starting AT Balance', params.afterTaxStart],
    ['Starting IRA Balance', params.iraStart],
    ['Starting Roth Balance', params.rothStart],
    ['Annual Expenses', params.annualExpenses],
    ['Expense Inflation', params.expenseInflation],
    ['Social Security (Monthly)', params.socialSecurityMonthly],
    ['SS COLA', params.ssCOLA],
    ['Heir Federal Rate', params.heirFedRate],
    ['Heir State Rate', params.heirStateRate],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [{ wch: 25 }, { wch: 18 }];

  // Format currency cells
  const currencyRows = [8, 9, 10, 11, 15, 16, 19, 20, 21, 24, 25, 26, 27];
  currencyRows.forEach(row => {
    const cellRef = `B${row}`;
    const cell = ws[cellRef];
    if (cell && typeof cell.v === 'number') {
      cell.z = '$#,##0';
    }
  });

  // Format percentage cells
  const pctRows = [17, 28, 29, 30, 31];
  pctRows.forEach(row => {
    const cellRef = `B${row}`;
    const cell = ws[cellRef];
    if (cell && typeof cell.v === 'number') {
      cell.z = '0.0%';
    }
  });

  return ws;
}

// Create parameters worksheet
function createParamsSheet(params) {
  const data = [
    ['PARAMETER', 'VALUE', 'DESCRIPTION'],
    [],
    ['Timeline'],
    ['startYear', params.startYear, 'First year of projection'],
    ['endYear', params.endYear, 'Last year of projection'],
    ['birthYear', params.birthYear, 'Birth year for age calculation'],
    [],
    ['Starting Balances'],
    ['afterTaxStart', params.afterTaxStart, 'After-tax account starting balance'],
    ['iraStart', params.iraStart, 'Traditional IRA starting balance'],
    ['rothStart', params.rothStart, 'Roth IRA starting balance'],
    ['afterTaxCostBasis', params.afterTaxCostBasis, 'Cost basis in after-tax account'],
    [],
    ['Return Assumptions'],
    ['returnMode', params.returnMode, 'account or blended'],
    ['lowRiskReturn', params.lowRiskReturn, 'Return for low-risk allocation'],
    ['modRiskReturn', params.modRiskReturn, 'Return for moderate-risk allocation'],
    ['highRiskReturn', params.highRiskReturn, 'Return for high-risk allocation'],
    ['lowRiskTarget', params.lowRiskTarget, 'Target allocation for low risk'],
    ['modRiskTarget', params.modRiskTarget, 'Target allocation for moderate risk'],
    [],
    ['Income'],
    ['socialSecurityMonthly', params.socialSecurityMonthly, 'Monthly SS benefit in start year'],
    ['ssCOLA', params.ssCOLA, 'Annual SS cost-of-living adjustment'],
    [],
    ['Expenses'],
    ['annualExpenses', params.annualExpenses, 'Annual expenses in start year'],
    ['expenseInflation', params.expenseInflation, 'Annual expense inflation rate'],
    [],
    ['Tax Parameters'],
    ['stateTaxRate', params.stateTaxRate, 'State tax rate (IL)'],
    ['capitalGainsPercent', params.capitalGainsPercent, 'Fraction of AT withdrawal as gains'],
    ['bracketInflation', params.bracketInflation, 'Annual tax bracket inflation'],
    ['magi2024', params.magi2024, 'MAGI for 2024 (IRMAA lookback)'],
    ['magi2025', params.magi2025, 'MAGI for 2025 (IRMAA lookback)'],
    [],
    ['Survivor Scenario'],
    ['survivorDeathYear', params.survivorDeathYear || 'null', 'Year of first death'],
    ['survivorSSPercent', params.survivorSSPercent, 'Survivor SS as fraction of combined'],
    ['survivorExpensePercent', params.survivorExpensePercent, 'Survivor expenses as fraction'],
    [],
    ['Heir Parameters'],
    ['heirFedRate', params.heirFedRate, 'Heir federal marginal rate'],
    ['heirStateRate', params.heirStateRate, 'Heir state tax rate'],
    [],
    ['Roth Conversions'],
    ...Object.entries(params.rothConversions || {}).map(([year, amt]) => [year, amt, '']),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 40 }];

  return ws;
}

/**
 * Export projections to Excel file
 *
 * @param {Object} options
 * @param {Array} options.projections - Array of projection objects
 * @param {Object} options.summary - Summary statistics
 * @param {Object} options.params - Model parameters
 * @param {Array} [options.scenarios] - Optional array of scenario results for comparison
 * @param {string} [options.filename] - Output filename (without extension)
 */
export function exportToExcel({ projections, summary, params, scenarios = [], filename = 'retirement-projections' }) {
  const wb = XLSX.utils.book_new();

  // Add main projections sheet
  const projSheet = createProjectionsSheet(projections);
  XLSX.utils.book_append_sheet(wb, projSheet, 'Projections');

  // Add summary sheet
  const summarySheet = createSummarySheet(summary, params);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Add parameters sheet
  const paramsSheet = createParamsSheet(params);
  XLSX.utils.book_append_sheet(wb, paramsSheet, 'Parameters');

  // Add scenario sheets if provided
  scenarios.forEach((scenario, idx) => {
    const scenarioSheet = createProjectionsSheet(scenario.projections, scenario.name);
    const sheetName = scenario.name.substring(0, 31).replace(/[/\\?*[\]]/g, ''); // Excel sheet name limits
    XLSX.utils.book_append_sheet(wb, scenarioSheet, sheetName || `Scenario ${idx + 1}`);
  });

  // Write file
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${timestamp}.xlsx`);
}

/**
 * Export comparison of multiple scenarios
 */
export function exportScenarioComparison({ baseProjections, baseSummary, scenarios, params, filename = 'scenario-comparison' }) {
  const wb = XLSX.utils.book_new();

  // Create comparison summary sheet
  const comparisonData = [
    ['SCENARIO COMPARISON SUMMARY'],
    [],
    ['Metric', 'Base Case', ...scenarios.map(s => s.name)],
    ['Ending Portfolio', baseSummary.endingPortfolio, ...scenarios.map(s => s.summary.endingPortfolio)],
    ['Heir Value', baseSummary.endingHeirValue, ...scenarios.map(s => s.summary.endingHeirValue)],
    ['Total Tax Paid', baseSummary.totalTaxPaid, ...scenarios.map(s => s.summary.totalTaxPaid)],
    ['Total IRMAA', baseSummary.totalIRMAAPaid, ...scenarios.map(s => s.summary.totalIRMAAPaid)],
    ['Final Roth %', baseSummary.finalRothPercent, ...scenarios.map(s => s.summary.finalRothPercent)],
    [],
    ['Difference from Base'],
    ['Ending Portfolio', 0, ...scenarios.map(s => s.summary.endingPortfolio - baseSummary.endingPortfolio)],
    ['Heir Value', 0, ...scenarios.map(s => s.summary.endingHeirValue - baseSummary.endingHeirValue)],
    ['Total Tax Paid', 0, ...scenarios.map(s => s.summary.totalTaxPaid - baseSummary.totalTaxPaid)],
  ];

  const compSheet = XLSX.utils.aoa_to_sheet(comparisonData);
  compSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, ...scenarios.map(() => ({ wch: 15 }))];
  XLSX.utils.book_append_sheet(wb, compSheet, 'Comparison');

  // Add base case projections
  const baseSheet = createProjectionsSheet(baseProjections);
  XLSX.utils.book_append_sheet(wb, baseSheet, 'Base Case');

  // Add each scenario
  scenarios.forEach((scenario, idx) => {
    const sheet = createProjectionsSheet(scenario.projections);
    const name = (scenario.name || `Scenario ${idx + 1}`).substring(0, 31).replace(/[/\\?*[\]]/g, '');
    XLSX.utils.book_append_sheet(wb, sheet, name);
  });

  // Add parameters
  const paramsSheet = createParamsSheet(params);
  XLSX.utils.book_append_sheet(wb, paramsSheet, 'Parameters');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${timestamp}.xlsx`);
}

export default { exportToExcel, exportScenarioComparison };
