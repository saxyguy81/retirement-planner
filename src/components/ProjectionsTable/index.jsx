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

import {
  ChevronDown,
  ChevronRight,
  Info,
  Table,
  LineChart,
  LayoutDashboard,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useState, useMemo, useCallback, Fragment } from 'react';

import { useInspectorNavigation } from '../../hooks/useInspectorNavigation';
import { CELL_DEPENDENCIES, getDependencySign } from '../../lib/calculationDependencies';
import { VALUE_COLORS, ROW_SEMANTICS } from '../../lib/colors';
import { fmt$, fmtPct } from '../../lib/formatters';
import { CalculationInspector } from '../CalculationInspector';
import { CustomViewModal } from '../CustomViewModal';
import { YearSelector } from '../YearSelector';

// Define row sections following the logical "story of a retirement year":
// 1. What do I have? (Starting Position)
// 2. What money is coming in? (Income)
// 3. What money is going out? (Cash Needs)
// 4. What am I required/choosing to distribute? (RMD & Conversions)
// 5. Where does the withdrawal come from? (Withdrawals)
// 6. How much tax do I owe? (Tax Detail)
// 7. IRMAA breakdown (IRMAA Detail)
// 8. What do I have left? (Ending Position)
// 9. What's it worth to heirs? (Heir Value)
// 10. Performance metrics (Analysis & Metrics)
//
// Note: PV transformation is applied dynamically at render time for all $ format fields
const SECTIONS = [
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

// Helper function to apply Present Value discount factor
// PV = FV / (1 + r)^n where r = discount rate and n = years from start
const applyPV = (value, yearsFromStart, discountRate) => {
  if (typeof value !== 'number' || isNaN(value)) return value;
  const pvFactor = Math.pow(1 + discountRate, yearsFromStart);
  return value / pvFactor;
};

function formatValue(value, format) {
  if (value == null || (typeof value === 'number' && isNaN(value))) return '-';

  switch (format) {
    case '$':
      return fmt$(value);
    case '%':
      return fmtPct(value);
    case 'n':
      return value > 0 ? value.toFixed(1) : '-';
    default:
      return value.toString();
  }
}

// Default collapsed state for sections
// Primary flow stays expanded: STARTING POSITION, INCOME, CASH NEEDS,
// RMD & CONVERSIONS, WITHDRAWALS, ENDING POSITION, HEIR VALUE
const DEFAULT_COLLAPSED = {
  'TAX DETAIL': true,
  'IRMAA DETAIL': true,
  'ANALYSIS & METRICS': true,
};

// Fields that have calculation inspections available
const INSPECTABLE_FIELDS = [
  // Beginning of Year
  'atBOY',
  'iraBOY',
  'rothBOY',
  'totalBOY',
  'costBasisBOY',
  // Income
  'ssAnnual',
  // Cash Needs
  'expenses',
  'irmaaTotal',
  // RMD & Conversions
  'rmdFactor',
  'rmdRequired',
  'rothConversion',
  // Withdrawals
  'atWithdrawal',
  'iraWithdrawal',
  'rothWithdrawal',
  'totalWithdrawal',
  // Tax Detail
  'taxableSS',
  'ordinaryIncome',
  'capitalGains',
  'taxableOrdinary',
  'standardDeduction',
  'federalTax',
  'ltcgTax',
  'niit',
  'stateTax',
  'totalTax',
  // IRMAA Detail
  'irmaaMAGI',
  'irmaaPartB',
  'irmaaPartD',
  // Ending Position
  'atEOY',
  'iraEOY',
  'rothEOY',
  'totalEOY',
  'costBasisEOY',
  'rothPercent',
  // Heir Value
  'heirValue',
  // Analysis & Metrics
  'effectiveAtReturn',
  'effectiveIraReturn',
  'effectiveRothReturn',
  'cumulativeTax',
  'cumulativeIRMAA',
  'cumulativeCapitalGains',
  'cumulativeATTax',
  'atLiquidationPercent',
];

// Helper to get semantic color class for a cell based on row key
function getCellColorClass(rowKey, row) {
  // If row has explicit highlight or dim, use legacy styling
  if (row.highlight) return 'text-emerald-400 font-medium';
  if (row.dim) return 'text-slate-500';

  // Use semantic coloring from ROW_SEMANTICS
  const semantic = ROW_SEMANTICS[rowKey];
  if (!semantic) return 'text-slate-300';

  const colors = VALUE_COLORS[semantic];
  return colors?.text || 'text-slate-300';
}

export function ProjectionsTable({ projections, options, params, showPV = true }) {
  const [yearMode, setYearMode] = useState('moderate');
  const [customYears, setCustomYears] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState(DEFAULT_COLLAPSED);

  // Navigation hook for CalculationInspector
  const navigation = useInspectorNavigation();

  // Cell highlighting state for dependency visualization
  const [highlightedCells, setHighlightedCells] = useState([]); // Array of { year, field, sign }

  // Row selection state for custom views
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [customViewType, setCustomViewType] = useState(null); // 'table' | 'chart' | 'dashboard' | null

  // Multi-column sorting state
  // Array of sort configs: [{key: 'year', direction: 'asc'}, {key: 'totalEOY', direction: 'desc'}]
  const [sortConfigs, setSortConfigs] = useState([]);

  // Handle cell hover to show calculation dependencies
  const handleCellHover = useCallback(
    (field, year, data) => {
      const getDeps = CELL_DEPENDENCIES[field];
      if (getDeps) {
        const deps = getDeps(year, data, projections);
        const withSigns = deps.map(d => ({
          ...d,
          sign: getDependencySign(d.field, field),
        }));
        setHighlightedCells(withSigns);
      } else {
        setHighlightedCells([]);
      }
    },
    [projections]
  );

  // Clear highlights when mouse leaves cell
  const handleCellLeave = useCallback(() => {
    setHighlightedCells([]);
  }, []);

  // Check if a cell should be highlighted and return its type
  const getCellHighlight = useCallback(
    (field, year) => {
      const match = highlightedCells.find(h => h.field === field && h.year === year);
      if (!match) return null;
      return match.sign === '-' ? 'negative' : 'positive';
    },
    [highlightedCells]
  );

  const toggleSection = title => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Toggle individual row selection
  const toggleRowSelection = useCallback(rowKey => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }, []);

  // Select/deselect all rows in a section
  const toggleSectionSelection = useCallback(
    section => {
      const sectionKeys = section.rows.map(r => r.key);
      const allSelected = sectionKeys.every(k => selectedRows.has(k));

      setSelectedRows(prev => {
        const next = new Set(prev);
        sectionKeys.forEach(k => {
          if (allSelected) {
            next.delete(k);
          } else {
            next.add(k);
          }
        });
        return next;
      });
    },
    [selectedRows]
  );

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  // Multi-sort handler - Shift+click adds secondary sort, regular click sets primary
  const handleSort = useCallback((key, event) => {
    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(s => s.key === key);

      if (event?.shiftKey) {
        // Shift+click: Add as secondary sort or toggle existing
        if (existingIndex >= 0) {
          // Toggle direction of existing sort
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            direction: updated[existingIndex].direction === 'asc' ? 'desc' : 'asc',
          };
          return updated;
        } else {
          // Add new secondary sort
          return [...prev, { key, direction: 'asc' }];
        }
      } else {
        // Regular click: Set as single primary sort or toggle
        if (existingIndex === 0 && prev.length === 1) {
          // Toggle direction of single sort
          return [{ key, direction: prev[0].direction === 'asc' ? 'desc' : 'asc' }];
        } else {
          // Reset to single sort on this column
          return [{ key, direction: 'asc' }];
        }
      }
    });
  }, []);

  // Clear all sorts
  const clearSort = useCallback(() => setSortConfigs([]), []);

  // Get sort indicator for a column
  const getSortIndicator = useCallback(
    key => {
      const sortIndex = sortConfigs.findIndex(s => s.key === key);
      if (sortIndex === -1) return null;
      const config = sortConfigs[sortIndex];
      const priority = sortConfigs.length > 1 ? sortIndex + 1 : null;
      return { direction: config.direction, priority };
    },
    [sortConfigs]
  );

  // Open custom view modal
  const openCustomView = useCallback(viewType => {
    setCustomViewType(viewType);
  }, []);

  // Close custom view modal
  const closeCustomView = useCallback(() => {
    setCustomViewType(null);
  }, []);

  // Sections are now static - PV is applied dynamically at render time
  const sections = SECTIONS;

  const expandAll = () => setCollapsedSections({});
  const collapseAll = () => {
    const allCollapsed = {};
    sections.forEach(s => {
      allCollapsed[s.title] = true;
    });
    setCollapsedSections(allCollapsed);
  };

  // All available years
  const allYears = useMemo(() => projections.map(p => p.year), [projections]);

  // Get years based on mode (for non-custom modes)
  const getYearsForMode = mode => {
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
  const handleYearsChange = newYears => {
    setCustomYears(newYears);
  };

  // Handle mode change
  const handleModeChange = newMode => {
    setYearMode(newMode);
    if (newMode !== 'custom') {
      setCustomYears(getYearsForMode(newMode));
    }
  };

  // Filter projections to selected years
  const displayData = useMemo(() => {
    return projections.filter(p => selectedYears.includes(p.year));
  }, [projections, selectedYears]);

  // Apply multi-sort to displayData
  const sortedDisplayData = useMemo(() => {
    if (sortConfigs.length === 0) return displayData;

    return [...displayData].sort((a, b) => {
      for (const { key, direction } of sortConfigs) {
        const aVal = a[key];
        const bVal = b[key];

        // Null handling: nulls always sort to the end
        if (aVal == null && bVal == null) continue;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Numeric comparison
        const compare = Number(aVal) - Number(bVal);
        if (compare !== 0) {
          return direction === 'asc' ? compare : -compare;
        }
        // If equal, continue to next sort key
      }
      return 0;
    });
  }, [displayData, sortConfigs]);

  return (
    <div data-testid="projections-table" className="flex-1 flex flex-col overflow-hidden text-xs">
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
          {/* PV toggle removed - now controlled globally from App.jsx */}
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
      </div>

      {/* Selection Action Toolbar - shown when rows are selected */}
      {selectedRows.size > 0 && (
        <div className="h-10 bg-blue-900/30 border-b border-blue-700 flex items-center px-3 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-blue-300 text-xs">
              {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openCustomView('table')}
              className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 flex items-center gap-1"
            >
              <Table className="w-3 h-3" />
              Custom Table
            </button>
            <button
              onClick={() => openCustomView('chart')}
              className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 flex items-center gap-1"
            >
              <LineChart className="w-3 h-3" />
              Chart
            </button>
            <button
              onClick={() => openCustomView('dashboard')}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center gap-1"
            >
              <LayoutDashboard className="w-3 h-3" />
              Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto p-2">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-950 z-10">
            <tr className="text-slate-400">
              <th className="text-left py-1.5 px-2 sticky left-0 bg-slate-950 min-w-40 z-20 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-slate-700 after:shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-2">
                  Metric
                  {sortConfigs.length > 0 && (
                    <button
                      onClick={clearSort}
                      className="text-xs text-slate-500 hover:text-slate-300"
                      title="Clear all sorting"
                    >
                      Clear sort
                    </button>
                  )}
                </div>
              </th>
              {sortedDisplayData.map(d => {
                const yearSort = getSortIndicator('year');
                return (
                  <th
                    key={d.year}
                    onClick={e => handleSort('year', e)}
                    className="text-right py-1.5 px-2 min-w-24 cursor-pointer hover:bg-slate-800/50 select-none"
                    title="Click to sort, Shift+click to add secondary sort"
                  >
                    <div className="flex items-center justify-end gap-1">
                      {d.year}
                      {yearSort && (
                        <span className="text-blue-400 flex items-center">
                          {yearSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                          {yearSort.priority && (
                            <sup className="text-[10px]">{yearSort.priority}</sup>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 font-normal text-xs">Age {d.age}</div>
                    {d.isSurvivor && (
                      <div className="text-pink-400 font-normal text-xs">Survivor</div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sections.map((section, sectionIdx) => {
              const isCollapsed = collapsedSections[section.title];
              return (
                <Fragment key={sectionIdx}>
                  {/* Section header */}
                  <tr className="border-t border-slate-800">
                    <td
                      colSpan={sortedDisplayData.length + 1}
                      className="py-1.5 px-2 text-slate-500 font-medium bg-slate-900/30 select-none z-20"
                    >
                      <span className="flex items-center gap-2">
                        {/* Section select-all checkbox */}
                        <input
                          type="checkbox"
                          checked={section.rows.every(r => selectedRows.has(r.key))}
                          onChange={e => {
                            e.stopPropagation();
                            toggleSectionSelection(section);
                          }}
                          className="w-3 h-3 rounded border-slate-600 bg-slate-800
                                     checked:bg-blue-600 checked:border-blue-600
                                     focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
                        />
                        <span
                          className="flex items-center gap-1 cursor-pointer hover:text-slate-300 flex-1"
                          onClick={() => toggleSection(section.title)}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          {section.title}
                          {isCollapsed && (
                            <span className="text-slate-600 text-xs ml-2">
                              ({section.rows.length} rows)
                            </span>
                          )}
                        </span>
                      </span>
                    </td>
                  </tr>

                  {/* Section rows - only render if not collapsed */}
                  {!isCollapsed &&
                    section.rows.map(row => {
                      // Check if this field has calculation inspection available
                      const isInspectable = INSPECTABLE_FIELDS.includes(row.key);

                      return (
                        <tr
                          key={row.key}
                          className={`hover:bg-slate-900/50 ${row.highlight ? 'bg-slate-800/20' : ''} ${selectedRows.has(row.key) ? 'bg-blue-900/20' : ''}`}
                        >
                          <td
                            className={`py-1 px-2 sticky left-0 bg-slate-950 z-20 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-slate-700 ${row.dim ? 'text-slate-500' : 'text-slate-300'}`}
                          >
                            <div className="flex items-center gap-2">
                              {/* Row selection checkbox */}
                              <input
                                type="checkbox"
                                checked={selectedRows.has(row.key)}
                                onChange={() => toggleRowSelection(row.key)}
                                className="w-3 h-3 rounded border-slate-600 bg-slate-800
                                         checked:bg-blue-600 checked:border-blue-600
                                         focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
                              />
                              <span className="flex items-center gap-1">
                                {row.label}
                                {isInspectable && (
                                  <Info
                                    className="w-3 h-3 text-blue-400/50 cursor-help"
                                    title="Click any value in this row to see calculation details"
                                  />
                                )}
                              </span>
                            </div>
                          </td>
                          {sortedDisplayData.map(d => {
                            // Check if this cell should be highlighted as a dependency
                            const highlight = getCellHighlight(row.key, d.year);
                            const highlightClass =
                              highlight === 'positive'
                                ? 'ring-2 ring-emerald-400 rounded bg-emerald-400/10'
                                : highlight === 'negative'
                                  ? 'ring-2 ring-rose-400 rounded bg-rose-400/10'
                                  : '';

                            // Get semantic color class for cells
                            const cellColorClass = getCellColorClass(row.key, row);

                            // Apply PV transformation for monetary values when showPV is enabled
                            const rawValue = d[row.key];
                            const displayValue =
                              row.format === '$' && showPV
                                ? applyPV(rawValue, d.yearsFromStart, params.discountRate || 0.03)
                                : rawValue;

                            return (
                              <td
                                key={d.year}
                                onClick={() =>
                                  isInspectable && navigation.navigateTo(row.key, d.year, d)
                                }
                                onMouseEnter={() => handleCellHover(row.key, d.year, d)}
                                onMouseLeave={handleCellLeave}
                                className={`text-right py-1 px-2 tabular-nums ${cellColorClass} ${isInspectable ? 'cursor-pointer hover:bg-blue-900/30' : ''} ${highlightClass}`}
                              >
                                {formatValue(displayValue, row.format)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Calculation Inspector Modal with Navigation */}
      {navigation.current && (
        <CalculationInspector
          current={navigation.current}
          params={params}
          projections={projections}
          onNavigate={navigation.navigateTo}
          onBack={navigation.goBack}
          onForward={navigation.goForward}
          onClose={navigation.close}
          canGoBack={navigation.canGoBack}
          canGoForward={navigation.canGoForward}
        />
      )}

      {/* Custom View Modal */}
      {customViewType && (
        <CustomViewModal
          viewType={customViewType}
          selectedRows={selectedRows}
          projections={projections}
          sections={sections}
          onClose={closeCustomView}
        />
      )}
    </div>
  );
}

export default ProjectionsTable;
