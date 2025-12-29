/**
 * CustomViewModal Component
 *
 * Displays selected rows from the projections table in custom views:
 * - Table: Shows only selected rows across all years
 * - Chart: Line/Area chart of selected metrics over time
 * - Dashboard: Combined summary cards, chart, and table
 */

import { X, Download, Copy, Check, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { fmt$, fmtPct } from '../../lib/formatters';
import { YearSelector } from '../YearSelector';

// Accessible chart colors (Okabe-Ito palette)
const CHART_COLORS = [
  '#0072B2', // Blue
  '#D55E00', // Orange/Vermillion
  '#009E73', // Teal/Blue-Green
  '#E69F00', // Amber/Orange
  '#56B4E9', // Sky Blue
  '#CC79A7', // Pink
  '#F0E442', // Yellow
  '#999999', // Gray
];

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
      return value?.toString() || '-';
  }
}

export function CustomViewModal({ viewType, selectedRows, projections, sections, onClose }) {
  const [chartType, setChartType] = useState('line'); // 'line' | 'area' | 'stacked'
  const [copied, setCopied] = useState(false);

  // Year selector state
  const [yearMode, setYearMode] = useState('all');
  const [customYears, setCustomYears] = useState([]);

  // All available years from projections
  const allYears = useMemo(() => projections.map(p => p.year), [projections]);

  // Generate years based on mode
  const getYearsForMode = useCallback(
    mode => {
      if (!allYears || allYears.length === 0) return [];
      if (mode === 'all') return allYears;
      if (mode === 'brief') {
        return [allYears[0], allYears[1], allYears[allYears.length - 1]].filter(Boolean);
      }
      if (mode === 'moderate') {
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
      if (mode === 'detailed') {
        return allYears.filter((_, i) => i < 5 || i % 5 === 0 || i === allYears.length - 1);
      }
      return customYears.length > 0 ? customYears : allYears;
    },
    [allYears, customYears]
  );

  // Selected years based on mode
  const selectedYears = useMemo(() => getYearsForMode(yearMode), [yearMode, getYearsForMode]);

  // Filter projections by selected years
  const yearFilteredProjections = useMemo(
    () => projections.filter(p => selectedYears.includes(p.year)),
    [projections, selectedYears]
  );

  // Multi-sort state
  const [sortConfigs, setSortConfigs] = useState([]);

  // Filter state
  const [filterField, setFilterField] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'above' | 'below' | 'between'
  const [filterThreshold, setFilterThreshold] = useState(0);
  const [filterThresholdMax, setFilterThresholdMax] = useState(0);

  // Get row metadata (labels and formats) from sections
  const rowMetadata = useMemo(() => {
    const metadata = {};
    sections.forEach(section => {
      section.rows.forEach(row => {
        metadata[row.key] = {
          label: row.label,
          format: row.format,
        };
      });
    });
    return metadata;
  }, [sections]);

  // Convert selectedRows Set to array
  const selectedRowsArray = useMemo(() => [...selectedRows], [selectedRows]);

  // Multi-sort handler - Shift+click adds secondary sort, regular click sets primary
  const handleSort = useCallback((key, event) => {
    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(s => s.key === key);

      if (event?.shiftKey) {
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            direction: updated[existingIndex].direction === 'asc' ? 'desc' : 'asc',
          };
          return updated;
        } else {
          return [...prev, { key, direction: 'asc' }];
        }
      } else {
        if (existingIndex === 0 && prev.length === 1) {
          return [{ key, direction: prev[0].direction === 'asc' ? 'desc' : 'asc' }];
        } else {
          return [{ key, direction: 'asc' }];
        }
      }
    });
  }, []);

  const clearSort = useCallback(() => setSortConfigs([]), []);

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

  // Filter data (applies value filter on top of year filter)
  const filteredData = useMemo(() => {
    if (filterMode === 'all' || !filterField) return yearFilteredProjections;

    return yearFilteredProjections.filter(p => {
      const val = p[filterField];
      if (val == null) return false;
      if (filterMode === 'above') return val >= filterThreshold;
      if (filterMode === 'below') return val <= filterThreshold;
      if (filterMode === 'between') return val >= filterThreshold && val <= filterThresholdMax;
      return true;
    });
  }, [yearFilteredProjections, filterMode, filterField, filterThreshold, filterThresholdMax]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (sortConfigs.length === 0) return filteredData;

    return [...filteredData].sort((a, b) => {
      for (const { key, direction } of sortConfigs) {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal == null && bVal == null) continue;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        const compare = Number(aVal) - Number(bVal);
        if (compare !== 0) {
          return direction === 'asc' ? compare : -compare;
        }
      }
      return 0;
    });
  }, [filteredData, sortConfigs]);

  const hasNoResults = filteredData.length === 0 && filterMode !== 'all';

  // Build chart data with filtered/sorted projections
  const chartData = useMemo(() => {
    return sortedData.map(p => {
      const point = { year: p.year, age: p.age };
      selectedRowsArray.forEach(key => {
        point[key] = p[key];
      });
      return point;
    });
  }, [sortedData, selectedRowsArray]);

  // Calculate summary statistics for dashboard (uses filtered data)
  const summaryStats = useMemo(() => {
    if (sortedData.length === 0) return {};

    const first = sortedData[0];
    const last = sortedData[sortedData.length - 1];

    return selectedRowsArray.reduce((acc, key) => {
      const values = sortedData.map(p => p[key]).filter(v => v != null && !isNaN(v));
      if (values.length > 0) {
        acc[key] = {
          first: first[key],
          last: last[key],
          min: Math.min(...values),
          max: Math.max(...values),
          total: values.reduce((sum, v) => sum + v, 0),
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        };
      }
      return acc;
    }, {});
  }, [sortedData, selectedRowsArray]);

  // Copy table data to clipboard
  const copyToClipboard = async () => {
    const headers = ['Year', ...selectedRowsArray.map(key => rowMetadata[key]?.label || key)];
    const rows = sortedData.map(p => [
      p.year,
      ...selectedRowsArray.map(key => {
        const val = p[key];
        return val != null && !isNaN(val) ? val : '';
      }),
    ]);

    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');

    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Export as CSV
  const exportCSV = () => {
    const headers = ['Year', ...selectedRowsArray.map(key => rowMetadata[key]?.label || key)];
    const rows = sortedData.map(p => [
      p.year,
      ...selectedRowsArray.map(key => {
        const val = p[key];
        if (val == null || isNaN(val)) return '';
        // Format based on type
        const format = rowMetadata[key]?.format;
        return format === '%' ? (val * 100).toFixed(2) : val.toString();
      }),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-view-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-slate-900 border border-slate-700 rounded p-2 text-xs">
        <div className="text-slate-400 mb-1">Year {label}</div>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-300">{entry.name}:</span>
            <span className="text-white font-medium">
              {formatValue(entry.value, rowMetadata[entry.dataKey]?.format)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render Table View with sortable headers
  const renderTableView = () => (
    <div className="overflow-auto max-h-[60vh]">
      {/* Filter controls */}
      <div className="flex items-center gap-2 mb-3 p-2 bg-slate-800 rounded flex-wrap">
        <Filter className="w-3 h-3 text-slate-400" />
        <span className="text-xs text-slate-400">Filter by:</span>
        <select
          value={filterField || ''}
          onChange={e => setFilterField(e.target.value || null)}
          className="bg-slate-700 text-xs rounded px-2 py-1 text-slate-300 border-0"
        >
          <option value="">Select field...</option>
          {selectedRowsArray.map(key => (
            <option key={key} value={key}>
              {rowMetadata[key]?.label || key}
            </option>
          ))}
        </select>

        {filterField && (
          <>
            <select
              value={filterMode}
              onChange={e => setFilterMode(e.target.value)}
              className="bg-slate-700 text-xs rounded px-2 py-1 text-slate-300 border-0"
            >
              <option value="all">Show All</option>
              <option value="above">Above</option>
              <option value="below">Below</option>
              <option value="between">Between</option>
            </select>

            {filterMode !== 'all' && (
              <input
                type="number"
                value={filterThreshold}
                onChange={e => setFilterThreshold(Number(e.target.value))}
                className="bg-slate-700 text-xs rounded px-2 py-1 w-24 text-slate-300 border-0"
                placeholder={filterMode === 'between' ? 'Min' : 'Threshold'}
              />
            )}

            {filterMode === 'between' && (
              <>
                <span className="text-xs text-slate-500">to</span>
                <input
                  type="number"
                  value={filterThresholdMax}
                  onChange={e => setFilterThresholdMax(Number(e.target.value))}
                  className="bg-slate-700 text-xs rounded px-2 py-1 w-24 text-slate-300 border-0"
                  placeholder="Max"
                />
              </>
            )}

            {filterMode !== 'all' && (
              <span className="text-xs text-slate-500">
                ({filteredData.length} of {yearFilteredProjections.length} rows)
              </span>
            )}
          </>
        )}

        {sortConfigs.length > 0 && (
          <button
            onClick={clearSort}
            className="ml-auto text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-700 rounded"
          >
            Clear sort
          </button>
        )}
      </div>

      {/* Empty results message */}
      {hasNoResults && (
        <div className="p-4 text-center bg-slate-800/50 rounded border border-slate-700 mb-3">
          <div className="text-slate-400 text-sm mb-1">No rows match your filter</div>
          <div className="text-slate-500 text-xs">
            Try adjusting the threshold or selecting "Show All"
          </div>
          <button
            onClick={() => setFilterMode('all')}
            className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
          >
            Clear Filter
          </button>
        </div>
      )}

      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-900 z-10">
          <tr>
            <th
              onClick={e => handleSort('year', e)}
              className="text-left p-2 text-slate-400 border-b border-slate-700 cursor-pointer hover:bg-slate-800/50 select-none"
              title="Click to sort, Shift+click to add secondary sort"
            >
              <span className="flex items-center gap-1">
                Year
                {getSortIndicator('year') && (
                  <span className="text-blue-400 flex items-center">
                    {getSortIndicator('year').direction === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    {getSortIndicator('year').priority && (
                      <sup className="text-[10px]">{getSortIndicator('year').priority}</sup>
                    )}
                  </span>
                )}
              </span>
            </th>
            {selectedRowsArray.map(key => {
              const sortInfo = getSortIndicator(key);
              return (
                <th
                  key={key}
                  onClick={e => handleSort(key, e)}
                  className="text-right p-2 text-slate-400 border-b border-slate-700 cursor-pointer hover:bg-slate-800/50 select-none"
                  title="Click to sort, Shift+click to add secondary sort"
                >
                  <span className="flex items-center justify-end gap-1">
                    {rowMetadata[key]?.label || key}
                    {sortInfo && (
                      <span className="text-blue-400 flex items-center">
                        {sortInfo.direction === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )}
                        {sortInfo.priority && (
                          <sup className="text-[10px]">{sortInfo.priority}</sup>
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map(p => (
            <tr key={p.year} className="hover:bg-slate-800/50">
              <td className="p-2 text-slate-300 border-b border-slate-800">
                {p.year}
                <span className="text-slate-500 ml-1">(Age {p.age})</span>
              </td>
              {selectedRowsArray.map(key => (
                <td
                  key={key}
                  className="text-right p-2 text-slate-300 tabular-nums border-b border-slate-800"
                >
                  {formatValue(p[key], rowMetadata[key]?.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render Chart View
  const renderChartView = () => {
    const ChartComponent = chartType === 'line' ? LineChart : AreaChart;
    const DataComponent = chartType === 'line' ? Line : Area;

    return (
      <div className="h-[50vh]">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="year" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={v => {
                if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
                if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
                if (Math.abs(v) < 1) return `${(v * 100).toFixed(0)}%`;
                return v.toString();
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
              formatter={value => <span className="text-slate-300">{value}</span>}
            />
            {selectedRowsArray.map((key, i) => (
              <DataComponent
                key={key}
                type="monotone"
                dataKey={key}
                name={rowMetadata[key]?.label || key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={chartType === 'stacked' ? 0.6 : 0.3}
                strokeWidth={2}
                stackId={chartType === 'stacked' ? '1' : undefined}
                dot={false}
              />
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render Dashboard View
  const renderDashboardView = () => (
    <div className="space-y-4 max-h-[70vh] overflow-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {selectedRowsArray.map(key => {
          const stats = summaryStats[key];
          const meta = rowMetadata[key];
          if (!stats) return null;

          return (
            <div key={key} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="text-slate-400 text-xs mb-1 truncate">{meta?.label || key}</div>
              <div className="text-xl font-bold text-white">
                {formatValue(stats.last, meta?.format)}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Start: {formatValue(stats.first, meta?.format)}</span>
                <span
                  className={
                    stats.last > stats.first
                      ? 'text-emerald-400'
                      : stats.last < stats.first
                        ? 'text-rose-400'
                        : ''
                  }
                >
                  {stats.first !== 0 && stats.last !== stats.first
                    ? `${(((stats.last - stats.first) / Math.abs(stats.first)) * 100).toFixed(0)}%`
                    : '-'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-slate-300 font-medium">Trend Chart</h4>
          <div className="flex gap-1">
            {['line', 'area', 'stacked'].map(type => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-2 py-1 text-xs rounded ${
                  chartType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {renderChartView()}
      </div>

      {/* Compact Table */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h4 className="text-slate-300 font-medium mb-3">Data Table</h4>
        {renderTableView()}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-lg border border-slate-700 w-[90vw] max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-slate-200">
                {viewType === 'table' && 'Custom Table'}
                {viewType === 'chart' && 'Custom Chart'}
                {viewType === 'dashboard' && 'Custom Dashboard'}
              </h3>
              <div className="text-slate-500 text-xs">
                {selectedRowsArray.length} metric{selectedRowsArray.length > 1 ? 's' : ''} selected
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Chart type selector (only for chart view) */}
              {viewType === 'chart' && (
                <div className="flex gap-1 mr-2">
                  {['line', 'area', 'stacked'].map(type => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-2 py-1 text-xs rounded ${
                        chartType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={copyToClipboard}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={exportCSV}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                title="Export as CSV"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Year Selector */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <YearSelector
              years={allYears}
              selectedYears={selectedYears}
              onChange={setCustomYears}
              mode={yearMode}
              onModeChange={setYearMode}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {viewType === 'table' && renderTableView()}
          {viewType === 'chart' && renderChartView()}
          {viewType === 'dashboard' && renderDashboardView()}
        </div>
      </div>
    </div>
  );
}

export default CustomViewModal;
