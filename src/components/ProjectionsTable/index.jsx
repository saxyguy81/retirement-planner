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

import React, { useState, useMemo } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { fmt$, fmtPct } from '../../lib/formatters';
import { YearSelector } from '../YearSelector';
import { CalculationInspector } from '../CalculationInspector';

// Define row sections matching the spreadsheet
// PV keys are used when showPV is true
const getSections = (showPV) => [
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
      { key: showPV ? 'pvExpenses' : 'expenses', label: 'Annual Expenses', format: '$' },
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
      { key: showPV ? 'pvAtEOY' : 'atEOY', label: 'After-Tax', format: '$' },
      { key: showPV ? 'pvIraEOY' : 'iraEOY', label: 'Traditional IRA', format: '$' },
      { key: showPV ? 'pvRothEOY' : 'rothEOY', label: 'Roth IRA', format: '$' },
      { key: showPV ? 'pvTotalEOY' : 'totalEOY', label: 'Total', format: '$', highlight: true },
      { key: 'costBasisEOY', label: 'Cost Basis', format: '$', dim: true },
      { key: 'rothPercent', label: 'Roth %', format: '%', dim: true },
    ]
  },
  {
    title: 'HEIR VALUE',
    rows: [
      { key: showPV ? 'pvHeirValue' : 'heirValue', label: 'After-Tax to Heirs', format: '$', highlight: true },
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

// Default collapsed state for sections
const DEFAULT_COLLAPSED = {
  'TAX DETAIL': true,
  'IRMAA (MEDICARE)': true,
  'RMD': true,
  'EFFECTIVE RETURNS': true,
  'CUMULATIVE': true,
};

// Fields that have calculation inspections available
const INSPECTABLE_FIELDS = [
  'federalTax', 'totalTax', 'ltcgTax', 'niit', 'stateTax', 'taxableSS',
  'irmaaTotal', 'rmdRequired', 'totalWithdrawal', 'rothConversion',
  'heirValue', 'pvHeirValue', 'totalEOY', 'pvTotalEOY', 'rothPercent',
  'cumulativeTax'
];

export function ProjectionsTable({ projections, options, params }) {
  const [yearMode, setYearMode] = useState('moderate');
  const [customYears, setCustomYears] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState(DEFAULT_COLLAPSED);
  const [showPV, setShowPV] = useState(true); // Default to Present Value
  const [inspecting, setInspecting] = useState(null); // { field, year, data }

  const toggleSection = (title) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  // Get sections based on current PV mode
  const sections = useMemo(() => getSections(showPV), [showPV]);

  const expandAll = () => setCollapsedSections({});
  const collapseAll = () => {
    const allCollapsed = {};
    sections.forEach(s => { allCollapsed[s.title] = true; });
    setCollapsedSections(allCollapsed);
  };

  // All available years
  const allYears = useMemo(() => projections.map(p => p.year), [projections]);

  // Get years based on mode (for non-custom modes)
  const getYearsForMode = (mode) => {
    switch (mode) {
      case 'brief':
        return [allYears[0], allYears[1], allYears[allYears.length - 1]].filter(Boolean);
      case 'moderate': {
        const result = [allYears[0], allYears[1], allYears[2]];
        const idx10 = allYears.findIndex(y => y >= allYears[0] + 10);
        const idx20 = allYears.findIndex(y => y >= allYears[0] + 20);
        const idx30 = allYears.findIndex(y => y >= allYears[0] + 30);
        if (idx10 >= 0) result.push(allYears[idx10]);
        if (idx20 >= 0) result.push(allYears[idx20]);
        if (idx30 >= 0) result.push(allYears[idx30]);
        if (!result.includes(allYears[allYears.length - 1])) {
          result.push(allYears[allYears.length - 1]);
        }
        return [...new Set(result)].filter(Boolean);
      }
      case 'detailed':
        return allYears.filter((_, i) => i < 5 || i % 5 === 0 || i === allYears.length - 1);
      case 'all':
        return allYears;
      case 'custom':
        return customYears.length > 0 ? customYears : allYears.slice(0, 3);
      default:
        return allYears;
    }
  };

  // Selected years based on mode
  const selectedYears = useMemo(() => {
    return yearMode === 'custom' ? customYears : getYearsForMode(yearMode);
  }, [yearMode, customYears, allYears]);

  // Handle year selection change
  const handleYearsChange = (newYears) => {
    setCustomYears(newYears);
  };

  // Handle mode change
  const handleModeChange = (newMode) => {
    setYearMode(newMode);
    if (newMode !== 'custom') {
      setCustomYears(getYearsForMode(newMode));
    }
  };

  // Filter projections to selected years
  const displayData = useMemo(() => {
    return projections.filter(p => selectedYears.includes(p.year));
  }, [projections, selectedYears]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Toolbar */}
      <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <YearSelector
            years={allYears}
            selectedYears={selectedYears}
            onChange={handleYearsChange}
            mode={yearMode}
            onModeChange={handleModeChange}
          />
          <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
            <button
              onClick={() => setShowPV(!showPV)}
              className={`px-1.5 py-0.5 text-xs rounded ${
                showPV
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title={showPV ? 'Showing Present Value (today\'s dollars)' : 'Showing Future Value (nominal dollars)'}
            >
              {showPV ? 'PV' : 'FV'}
            </button>
          </div>
          <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
            <button
              onClick={expandAll}
              className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
            >
              Collapse All
            </button>
          </div>
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
            {sections.map((section, sectionIdx) => {
              const isCollapsed = collapsedSections[section.title];
              return (
                <React.Fragment key={sectionIdx}>
                  {/* Section header */}
                  <tr className="border-t border-slate-800">
                    <td
                      colSpan={displayData.length + 1}
                      className="py-1.5 px-2 text-slate-500 font-medium bg-slate-900/30 cursor-pointer hover:bg-slate-800/50 select-none"
                      onClick={() => toggleSection(section.title)}
                    >
                      <span className="flex items-center gap-1">
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        {section.title}
                        {isCollapsed && (
                          <span className="text-slate-600 text-xs ml-2">({section.rows.length} rows)</span>
                        )}
                      </span>
                    </td>
                  </tr>

                  {/* Section rows - only render if not collapsed */}
                  {!isCollapsed && section.rows.map(row => {
                    // Check if this field is inspectable (strip pv prefix for matching)
                    const baseKey = row.key.startsWith('pv') ? row.key.charAt(2).toLowerCase() + row.key.slice(3) : row.key;
                    const isInspectable = INSPECTABLE_FIELDS.includes(row.key) || INSPECTABLE_FIELDS.includes(baseKey);

                    return (
                      <tr
                        key={row.key}
                        className={`hover:bg-slate-900/50 ${row.highlight ? 'bg-slate-800/20' : ''}`}
                      >
                        <td className={`py-1 px-2 sticky left-0 bg-slate-950 ${row.dim ? 'text-slate-500' : 'text-slate-300'}`}>
                          <span className="flex items-center gap-1">
                            {row.label}
                            {isInspectable && (
                              <Info className="w-3 h-3 text-blue-400/50" />
                            )}
                          </span>
                        </td>
                        {displayData.map(d => (
                          <td
                            key={d.year}
                            onClick={() => isInspectable && setInspecting({ field: row.key, year: d.year, data: d })}
                            className={`text-right py-1 px-2 tabular-nums ${
                              row.highlight
                                ? 'text-emerald-400 font-medium'
                                : row.dim
                                  ? 'text-slate-500'
                                  : 'text-slate-300'
                            } ${isInspectable ? 'cursor-pointer hover:bg-blue-900/30' : ''}`}
                          >
                            {formatValue(d[row.key], row.format)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Calculation Inspector Modal */}
      {inspecting && (
        <CalculationInspector
          field={inspecting.field}
          data={inspecting.data}
          params={params}
          onClose={() => setInspecting(null)}
        />
      )}
    </div>
  );
}

export default ProjectionsTable;
