/**
 * Excel Export Utility
 *
 * Exports retirement projections to Excel format with:
 * - Full projections worksheet
 * - Summary statistics
 * - Multiple scenarios (if provided)
 * - Formatted headers and styling
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { DEFAULT_PARAMS } from './taxTables.js';

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

  const ws = XLSX.utils.aoa_to_array
    ? XLSX.utils.aoa_to_sheet(data)
    : XLSX.utils.aoa_to_sheet(data);

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
export function exportToExcel({
  projections,
  summary,
  params,
  scenarios = [],
  filename = 'retirement-projections',
}) {
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
export function exportScenarioComparison({
  baseProjections,
  baseSummary,
  scenarios,
  params,
  filename = 'scenario-comparison',
}) {
  const wb = XLSX.utils.book_new();

  // Create comparison summary sheet
  const comparisonData = [
    ['SCENARIO COMPARISON SUMMARY'],
    [],
    ['Metric', 'Base Case', ...scenarios.map(s => s.name)],
    [
      'Ending Portfolio',
      baseSummary.endingPortfolio,
      ...scenarios.map(s => s.summary.endingPortfolio),
    ],
    ['Heir Value', baseSummary.endingHeirValue, ...scenarios.map(s => s.summary.endingHeirValue)],
    ['Total Tax Paid', baseSummary.totalTaxPaid, ...scenarios.map(s => s.summary.totalTaxPaid)],
    ['Total IRMAA', baseSummary.totalIRMAAPaid, ...scenarios.map(s => s.summary.totalIRMAAPaid)],
    [
      'Final Roth %',
      baseSummary.finalRothPercent,
      ...scenarios.map(s => s.summary.finalRothPercent),
    ],
    [],
    ['Difference from Base'],
    [
      'Ending Portfolio',
      0,
      ...scenarios.map(s => s.summary.endingPortfolio - baseSummary.endingPortfolio),
    ],
    [
      'Heir Value',
      0,
      ...scenarios.map(s => s.summary.endingHeirValue - baseSummary.endingHeirValue),
    ],
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
    const name = (scenario.name || `Scenario ${idx + 1}`)
      .substring(0, 31)
      .replace(/[/\\?*[\]]/g, '');
    XLSX.utils.book_append_sheet(wb, sheet, name);
  });

  // Add parameters
  const paramsSheet = createParamsSheet(params);
  XLSX.utils.book_append_sheet(wb, paramsSheet, 'Parameters');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${timestamp}.xlsx`);
}

/**
 * Import parameters from JSON file
 *
 * @param {File} file - The JSON file to import
 * @returns {Promise<Object>} - The imported parameters merged with defaults
 */
export async function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const json = JSON.parse(e.target.result);
        // Merge with defaults to ensure all required params exist
        const params = { ...DEFAULT_PARAMS, ...json };
        resolve(params);
      } catch (err) {
        reject(new Error('Invalid JSON file: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Import parameters from Excel file (reads the Parameters sheet)
 *
 * @param {File} file - The Excel file to import
 * @returns {Promise<Object>} - The imported parameters merged with defaults
 */
export async function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });

        // Try to find Parameters sheet
        const paramsSheet = wb.Sheets['Parameters'];
        if (!paramsSheet) {
          reject(new Error('No Parameters sheet found in Excel file'));
          return;
        }

        // Convert sheet to array of arrays
        const rows = XLSX.utils.sheet_to_json(paramsSheet, { header: 1 });

        // Parse parameters from rows (format: [key, value, description])
        const imported = {};
        let inRothConversions = false;
        const rothConversions = {};

        for (const row of rows) {
          if (!row || row.length < 2) continue;

          const key = String(row[0]).trim();
          const value = row[1];

          // Skip headers and section titles
          if (key === 'PARAMETER' || !key || value === undefined) continue;
          if (
            [
              'Timeline',
              'Starting Balances',
              'Return Assumptions',
              'Income',
              'Expenses',
              'Tax Parameters',
              'Survivor Scenario',
              'Heir Parameters',
            ].includes(key)
          ) {
            inRothConversions = false;
            continue;
          }

          if (key === 'Roth Conversions') {
            inRothConversions = true;
            continue;
          }

          if (inRothConversions && /^\d{4}$/.test(key)) {
            rothConversions[parseInt(key)] = parseFloat(value) || 0;
          } else if (key in DEFAULT_PARAMS) {
            // Parse value based on expected type
            if (typeof DEFAULT_PARAMS[key] === 'number') {
              imported[key] = parseFloat(value) || 0;
            } else if (typeof DEFAULT_PARAMS[key] === 'boolean') {
              imported[key] = value === true || value === 'true' || value === 1;
            } else {
              imported[key] = value;
            }
          }
        }

        if (Object.keys(rothConversions).length > 0) {
          imported.rothConversions = rothConversions;
        }

        const params = { ...DEFAULT_PARAMS, ...imported };
        resolve(params);
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export current parameters to JSON for saving/sharing
 *
 * @param {Object} params - The parameters to export
 * @param {string} filename - Output filename
 */
export function exportParamsToJSON(params, filename = 'retirement-params') {
  const json = JSON.stringify(params, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export full data to JSON (projections, summary, and params)
 */
export function exportToJSON({
  projections,
  summary,
  params,
  filename = 'retirement-projections',
}) {
  const data = {
    exportDate: new Date().toISOString(),
    params,
    summary,
    projections,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().slice(0, 10);
  a.download = `${filename}-${timestamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// PDF export column definitions (subset for readability)
const PDF_COLUMNS = [
  { key: 'year', header: 'Year', width: 12 },
  { key: 'age', header: 'Age', width: 10 },
  { key: 'totalBOY', header: 'Portfolio BOY', width: 25, format: '$' },
  { key: 'ssAnnual', header: 'Soc Sec', width: 20, format: '$' },
  { key: 'expenses', header: 'Expenses', width: 20, format: '$' },
  { key: 'rothConversion', header: 'Roth Conv', width: 20, format: '$' },
  { key: 'totalWithdrawal', header: 'Withdrawal', width: 22, format: '$' },
  { key: 'totalTax', header: 'Total Tax', width: 20, format: '$' },
  { key: 'totalEOY', header: 'Portfolio EOY', width: 25, format: '$' },
  { key: 'heirValue', header: 'Heir Value', width: 25, format: '$' },
];

function formatPDFValue(value, format) {
  if (value == null || (typeof value === 'number' && isNaN(value))) return '-';
  if (format === '$') {
    return '$' + Math.round(value).toLocaleString();
  }
  if (format === '%') {
    return (value * 100).toFixed(1) + '%';
  }
  return String(value);
}

/**
 * Export projections to PDF
 */
export function exportToPDF({ projections, summary, params, filename = 'retirement-projections' }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const timestamp = new Date().toISOString().slice(0, 10);

  // Title
  doc.setFontSize(18);
  doc.text('Retirement Projection Report', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${timestamp}`, 40, 55);

  // Summary section
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Summary', 40, 80);

  doc.setFontSize(9);
  const summaryData = [
    ['Starting Portfolio', '$' + Math.round(summary.startingPortfolio).toLocaleString()],
    ['Ending Portfolio', '$' + Math.round(summary.endingPortfolio).toLocaleString()],
    ['Ending Heir Value', '$' + Math.round(summary.endingHeirValue).toLocaleString()],
    ['Total Tax Paid', '$' + Math.round(summary.totalTaxPaid).toLocaleString()],
    ['Total IRMAA Paid', '$' + Math.round(summary.totalIRMAAPaid).toLocaleString()],
    ['Final Roth %', (summary.finalRothPercent * 100).toFixed(1) + '%'],
  ];

  autoTable(doc, {
    startY: 90,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: 100 },
    },
    margin: { left: 40 },
  });

  // Projections table
  const tableStartY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text('Year-by-Year Projections', 40, tableStartY);

  const headers = PDF_COLUMNS.map(c => c.header);
  const rows = projections.map(p => PDF_COLUMNS.map(c => formatPDFValue(p[c.key], c.format)));

  autoTable(doc, {
    startY: tableStartY + 10,
    head: [headers],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });

  // Parameters page
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Model Parameters', 40, 40);

  const paramRows = [
    ['Timeline', ''],
    ['Start Year', params.startYear],
    ['End Year', params.endYear],
    ['Birth Year', params.birthYear],
    ['', ''],
    ['Starting Balances', ''],
    ['After-Tax', '$' + Math.round(params.afterTaxStart).toLocaleString()],
    ['Traditional IRA', '$' + Math.round(params.iraStart).toLocaleString()],
    ['Roth IRA', '$' + Math.round(params.rothStart).toLocaleString()],
    ['Cost Basis', '$' + Math.round(params.afterTaxCostBasis).toLocaleString()],
    ['', ''],
    ['Income & Expenses', ''],
    ['Social Security (monthly)', '$' + Math.round(params.socialSecurityMonthly).toLocaleString()],
    ['SS COLA', (params.ssCOLA * 100).toFixed(1) + '%'],
    ['Annual Expenses', '$' + Math.round(params.annualExpenses).toLocaleString()],
    ['Expense Inflation', (params.expenseInflation * 100).toFixed(1) + '%'],
    ['', ''],
    ['Tax Rates', ''],
    ['State Tax Rate', (params.stateTaxRate * 100).toFixed(2) + '%'],
    ['Heir Federal Rate', (params.heirFedRate * 100).toFixed(0) + '%'],
    ['Heir State Rate', (params.heirStateRate * 100).toFixed(2) + '%'],
  ];

  autoTable(doc, {
    startY: 55,
    head: [],
    body: paramRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 150 },
      1: { cellWidth: 120 },
    },
    margin: { left: 40 },
    didParseCell: data => {
      // Style section headers
      if (data.row.raw[1] === '' && data.row.raw[0] !== '') {
        data.cell.styles.fillColor = [226, 232, 240];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Roth conversions if any
  const rothEntries = Object.entries(params.rothConversions || {}).filter(([_, v]) => v > 0);
  if (rothEntries.length > 0) {
    const rothY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.text('Roth Conversions', 40, rothY);

    const rothRows = rothEntries.map(([year, amt]) => [
      year,
      '$' + Math.round(amt).toLocaleString(),
    ]);

    autoTable(doc, {
      startY: rothY + 10,
      head: [['Year', 'Amount']],
      body: rothRows,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [51, 65, 85] },
      margin: { left: 40 },
      tableWidth: 200,
    });
  }

  doc.save(`${filename}-${timestamp}.pdf`);
}

export default {
  exportToExcel,
  exportToJSON,
  exportToPDF,
  exportScenarioComparison,
  importFromJSON,
  importFromExcel,
  exportParamsToJSON,
};
