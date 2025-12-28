/**
 * ProjectionsTable Component
 * 
 * Main data table showing year-by-year projections.
 * Features:
 * - Transposed layout (years as columns, metrics as rows)
 * - Grouped sections matching spreadsheet structure
 * - Year display modes (brief, moderate, detailed, all)
 * - Sticky row labels
 * - Color coding for key values
 * - Click to inspect calculation
 * 
 * TODO: Implement full table with all sections from spec
 */

import React, { useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { fmt$, fmtPct } from '../../lib/formatters';

// Define row sections matching the spreadsheet
const SECTIONS = [
  {
    title: 'ACCOUNT BALANCES (BOY)',
    rows: [
      { key: 'atBOY', label: 'After-Tax', format: '$' },
      { key: 'iraBOY', label: 'Traditional IRA', format: '$' },
      { key: 'rothBOY', label: 'Roth IRA', format: '$' },
      { key: 'totalBOY', label: 'Total', format: '$', highlight: true },
      { key: 'costBasisBOY', label: 'Cost Basis', format: '$', dim: true },
    ]
  },
  {
    title: 'INCOME & EXPENSES',
    rows: [
      { key: 'ssAnnual', label: 'Social Security', format: '$' },
      { key: 'expenses', label: 'Annual Expenses', format: '$' },
      { key: 'rothConversion', label: 'Roth Conversion', format: '$', highlight: true },
    ]
  },
  {
    title: 'RMD',
    rows: [
      { key: 'rmdFactor', label: 'RMD Factor', format: 'n' },
      { key: 'rmdRequired', label: 'RMD Required', format: '$' },
    ]
  },
  {
    title: 'WITHDRAWALS',
    rows: [
      { key: 'atWithdrawal', label: 'From After-Tax', format: '$' },
      { key: 'iraWithdrawal', label: 'From IRA', format: '$' },
      { key: 'rothWithdrawal', label: 'From Roth', format: '$' },
      { key: 'totalWithdrawal', label: 'Total Withdrawal', format: '$', highlight: true },
    ]
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
      { key: 'stateTax', label: 'IL State Tax', format: '$' },
      { key: 'totalTax', label: 'Total Tax', format: '$', highlight: true },
    ]
  },
  {
    title: 'IRMAA (MEDICARE)',
    rows: [
      { key: 'irmaaMAGI', label: 'MAGI (2yr prior)', format: '$', dim: true },
      { key: 'irmaaPartB', label: 'Part B Surcharge', format: '$', dim: true },
      { key: 'irmaaPartD', label: 'Part D Surcharge', format: '$', dim: true },
      { key: 'irmaaTotal', label: 'Total IRMAA', format: '$', highlight: true },
    ]
  },
  {
    title: 'END OF YEAR BALANCES',
    rows: [
      { key: 'atEOY', label: 'After-Tax', format: '$' },
      { key: 'iraEOY', label: 'Traditional IRA', format: '$' },
      { key: 'rothEOY', label: 'Roth IRA', format: '$' },
      { key: 'totalEOY', label: 'Total', format: '$', highlight: true },
      { key: 'costBasisEOY', label: 'Cost Basis', format: '$', dim: true },
      { key: 'rothPercent', label: 'Roth %', format: '%', dim: true },
    ]
  },
  {
    title: 'HEIR VALUE',
    rows: [
      { key: 'heirValue', label: 'After-Tax to Heirs', format: '$', highlight: true },
    ]
  },
  {
    title: 'EFFECTIVE RETURNS',
    rows: [
      { key: 'effectiveAtReturn', label: 'After-Tax', format: '%' },
      { key: 'effectiveIraReturn', label: 'IRA', format: '%' },
      { key: 'effectiveRothReturn', label: 'Roth', format: '%' },
    ]
  },
  {
    title: 'CUMULATIVE',
    rows: [
      { key: 'cumulativeTax', label: 'Total Tax Paid', format: '$' },
      { key: 'cumulativeIRMAA', label: 'Total IRMAA Paid', format: '$' },
    ]
  },
];

function formatValue(value, format) {
  if (value == null || (typeof value === 'number' && isNaN(value))) return '-';
  
  switch (format) {
    case '$': return fmt$(value);
    case '%': return fmtPct(value);
    case 'n': return value > 0 ? value.toFixed(1) : '-';
    default: return value.toString();
  }
}

export function ProjectionsTable({ projections, options }) {
  const [yearMode, setYearMode] = useState('moderate');
  
  // Filter years based on display mode
  const getDisplayYears = () => {
    const allYears = projections.map(p => p.year);
    
    switch (yearMode) {
      case 'brief':
        return [allYears[0], allYears[1], allYears[allYears.length - 1]];
      case 'moderate': {
        const result = [allYears[0], allYears[1], allYears[2]];
        const idx10 = allYears.findIndex(y => y >= allYears[0] + 10);
        const idx20 = allYears.findIndex(y => y >= allYears[0] + 20);
        if (idx10 >= 0) result.push(allYears[idx10]);
        if (idx20 >= 0) result.push(allYears[idx20]);
        result.push(allYears[allYears.length - 1]);
        return [...new Set(result)];
      }
      case 'detailed':
        return allYears.filter((_, i) => i < 5 || i % 5 === 0 || i === allYears.length - 1);
      case 'all':
      default:
        return allYears;
    }
  };
  
  const displayYears = getDisplayYears();
  const displayData = projections.filter(p => displayYears.includes(p.year));
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Toolbar */}
      <div className="h-8 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-slate-400" />
          <select 
            value={yearMode} 
            onChange={(e) => setYearMode(e.target.value)}
            className="bg-slate-800 rounded px-1.5 py-0.5 border border-slate-700 text-xs"
          >
            <option value="brief">Brief (3 years)</option>
            <option value="moderate">Moderate (6 years)</option>
            <option value="detailed">Detailed</option>
            <option value="all">All Years</option>
          </select>
        </div>
        
        {options?.iterativeTax && displayData[0]?.iterations > 1 && (
          <span className="text-emerald-400 flex items-center gap-1 text-xs">
            <RefreshCw className="w-3 h-3" /> 
            Iterative ({displayData[0].iterations} iter)
          </span>
        )}
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto p-2">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-950 z-10">
            <tr className="text-slate-400">
              <th className="text-left py-1.5 px-2 sticky left-0 bg-slate-950 min-w-40">
                Metric
              </th>
              {displayData.map(d => (
                <th key={d.year} className="text-right py-1.5 px-2 min-w-24">
                  <div>{d.year}</div>
                  <div className="text-slate-600 font-normal text-xs">Age {d.age}</div>
                  {d.isSurvivor && (
                    <div className="text-pink-400 font-normal text-xs">Survivor</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section, sectionIdx) => (
              <React.Fragment key={sectionIdx}>
                {/* Section header */}
                <tr className="border-t border-slate-800">
                  <td 
                    colSpan={displayYears.length + 1} 
                    className="py-1.5 px-2 text-slate-500 font-medium bg-slate-900/30"
                  >
                    {section.title}
                  </td>
                </tr>
                
                {/* Section rows */}
                {section.rows.map(row => (
                  <tr 
                    key={row.key} 
                    className={`hover:bg-slate-900/50 ${row.highlight ? 'bg-slate-800/20' : ''}`}
                  >
                    <td className={`py-1 px-2 sticky left-0 bg-slate-950 ${row.dim ? 'text-slate-500' : 'text-slate-300'}`}>
                      {row.label}
                    </td>
                    {displayData.map(d => (
                      <td 
                        key={d.year} 
                        className={`text-right py-1 px-2 tabular-nums ${
                          row.highlight 
                            ? 'text-emerald-400 font-medium' 
                            : row.dim 
                              ? 'text-slate-500' 
                              : 'text-slate-300'
                        }`}
                      >
                        {formatValue(d[row.key], row.format)}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectionsTable;
