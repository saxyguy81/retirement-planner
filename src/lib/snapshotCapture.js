/**
 * Snapshot Capture Utility
 * Captures charts/tables as images or markdown for AI embedding
 */

/**
 * Capture projection table as markdown
 */
export function captureTableAsMarkdown(
  projections,
  columns = ['year', 'age', 'totalEOY', 'heirValue', 'totalTax']
) {
  if (!projections || projections.length === 0) {
    return 'No projection data available';
  }

  const headers = columns.join(' | ');
  const separator = columns.map(() => '---').join(' | ');

  const rows = projections.map(p =>
    columns
      .map(col => {
        const val = p[col];
        if (val === undefined || val === null) return '-';
        if (typeof val === 'number') {
          // Don't format year or age as currency
          if (col === 'year' || col === 'age') {
            return String(val);
          }
          if (col.toLowerCase().includes('percent') || col.toLowerCase().includes('rate')) {
            return `${(val * 100).toFixed(1)}%`;
          }
          if (Math.abs(val) >= 1000) {
            return `$${Math.round(val).toLocaleString()}`;
          }
          return val.toFixed(2);
        }
        return String(val);
      })
      .join(' | ')
  );

  return `| ${headers} |\n| ${separator} |\n${rows.map(r => `| ${r} |`).join('\n')}`;
}

/**
 * Capture summary as markdown
 */
export function captureSummaryAsMarkdown(summary) {
  if (!summary) {
    return 'No summary data available';
  }

  const formatValue = (val, isPercent = false) => {
    if (val === undefined || val === null) return '-';
    if (isPercent) return `${(val * 100).toFixed(1)}%`;
    if (typeof val === 'number') return `$${Math.round(val).toLocaleString()}`;
    return String(val);
  };

  return `
## Projection Summary

| Metric | Value |
|--------|-------|
| Starting Portfolio | ${formatValue(summary.startingPortfolio)} |
| Ending Portfolio | ${formatValue(summary.endingPortfolio)} |
| Ending Heir Value | ${formatValue(summary.endingHeirValue)} |
| Total Tax Paid | ${formatValue(summary.totalTaxPaid)} |
| Total IRMAA Paid | ${formatValue(summary.totalIRMAAPaid)} |
| Final Roth % | ${formatValue(summary.finalRothPercent, true)} |
`.trim();
}

/**
 * Capture a specific year range of projections
 */
export function captureYearRange(projections, startYear, endYear, columns) {
  const filtered = projections.filter(p => p.year >= startYear && p.year <= endYear);
  return captureTableAsMarkdown(filtered, columns);
}

/**
 * Capture tax breakdown for a specific year
 */
export function captureTaxBreakdown(projection) {
  if (!projection) {
    return 'No projection data for specified year';
  }

  const formatVal = val => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'number') return `$${Math.round(val).toLocaleString()}`;
    return String(val);
  };

  return `
## Tax Breakdown for ${projection.year}

| Tax Type | Amount |
|----------|--------|
| Federal Tax | ${formatVal(projection.federalTax)} |
| State Tax | ${formatVal(projection.stateTax)} |
| LTCG Tax | ${formatVal(projection.ltcgTax)} |
| NIIT | ${formatVal(projection.niit)} |
| IRMAA | ${formatVal(projection.irmaa)} |
| **Total Tax** | **${formatVal(projection.totalTax)}** |

### Income Details
| Source | Amount |
|--------|--------|
| Social Security | ${formatVal(projection.socialSecurity)} |
| Taxable SS | ${formatVal(projection.taxableSS)} |
| IRA Withdrawal | ${formatVal(projection.iraWithdrawal)} |
| Roth Conversion | ${formatVal(projection.rothConversion)} |
| Capital Gains | ${formatVal(projection.capitalGains)} |
`.trim();
}

/**
 * Capture account balance summary
 */
export function captureBalanceSummary(projection) {
  if (!projection) {
    return 'No projection data available';
  }

  const formatVal = val => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'number') return `$${Math.round(val).toLocaleString()}`;
    return String(val);
  };

  const formatPct = val => {
    if (val === undefined || val === null) return '-';
    return `${(val * 100).toFixed(1)}%`;
  };

  return `
## Account Balances for ${projection.year}

| Account | End of Year Balance | % of Total |
|---------|---------------------|------------|
| After-Tax | ${formatVal(projection.atEOY)} | ${formatPct(projection.atEOY / projection.totalEOY)} |
| Traditional IRA | ${formatVal(projection.iraEOY)} | ${formatPct(projection.iraEOY / projection.totalEOY)} |
| Roth IRA | ${formatVal(projection.rothEOY)} | ${formatPct(projection.rothEOY / projection.totalEOY)} |
| **Total** | **${formatVal(projection.totalEOY)}** | 100% |

### Heir Value
After-tax value to heirs: **${formatVal(projection.heirValue)}**
`.trim();
}

/**
 * Generate a comparison table between two scenarios
 */
export function compareScenarios(scenario1, scenario2, name1 = 'Scenario 1', name2 = 'Scenario 2') {
  if (!scenario1 || !scenario2) {
    return 'Missing scenario data for comparison';
  }

  const formatVal = val => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'number') return `$${Math.round(val).toLocaleString()}`;
    return String(val);
  };

  const diff = (a, b) => {
    if (typeof a !== 'number' || typeof b !== 'number') return '-';
    const d = b - a;
    const sign = d >= 0 ? '+' : '';
    return `${sign}$${Math.round(d).toLocaleString()}`;
  };

  return `
## Scenario Comparison

| Metric | ${name1} | ${name2} | Difference |
|--------|----------|----------|------------|
| Ending Portfolio | ${formatVal(scenario1.endingPortfolio)} | ${formatVal(scenario2.endingPortfolio)} | ${diff(scenario1.endingPortfolio, scenario2.endingPortfolio)} |
| Ending Heir Value | ${formatVal(scenario1.endingHeirValue)} | ${formatVal(scenario2.endingHeirValue)} | ${diff(scenario1.endingHeirValue, scenario2.endingHeirValue)} |
| Total Tax Paid | ${formatVal(scenario1.totalTaxPaid)} | ${formatVal(scenario2.totalTaxPaid)} | ${diff(scenario1.totalTaxPaid, scenario2.totalTaxPaid)} |
| Total IRMAA | ${formatVal(scenario1.totalIRMAAPaid)} | ${formatVal(scenario2.totalIRMAAPaid)} | ${diff(scenario1.totalIRMAAPaid, scenario2.totalIRMAAPaid)} |
`.trim();
}
