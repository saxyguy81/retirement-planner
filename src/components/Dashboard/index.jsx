/**
 * Dashboard Component
 *
 * Configurable dashboard with drag-and-drop widgets for visualization.
 * Supports multiple widget types that can be added, removed, and arranged.
 *
 * Features:
 * - Configurable widget grid (add/remove/arrange)
 * - Multiple widget types: summary cards, charts, tables, analysis
 * - CSS grid layout with responsive sizing
 * - Widget picker for adding new widgets
 * - Persistent layout (future: localStorage)
 */

import {
  Plus,
  X,
  LayoutGrid,
  LineChart as LineIcon,
  BarChart3,
  PieChart,
  TrendingUp,
  Shield,
  Users,
  Wallet,
  Table2,
  GitCompare,
  ArrowLeftRight,
  Layers,
  CreditCard,
  GripVertical,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  PieChart as RPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { fmt$, fmtPct } from '../../lib/formatters';
import { FEDERAL_BRACKETS_MFJ_2024, inflateBrackets } from '../../lib/taxTables.js';

// Widget type definitions with default sizes
const WIDGET_TYPES = [
  {
    id: 'summary-cards',
    name: 'Summary Cards',
    icon: CreditCard,
    defaultSize: { w: 2, h: 1 },
    description: 'Key metrics at a glance',
  },
  {
    id: 'chart-balances',
    name: 'Balance Chart',
    icon: TrendingUp,
    defaultSize: { w: 2, h: 2 },
    description: 'Account balances over time',
  },
  {
    id: 'chart-taxes',
    name: 'Tax Chart',
    icon: BarChart3,
    defaultSize: { w: 2, h: 2 },
    description: 'Annual tax burden breakdown',
  },
  {
    id: 'chart-heir',
    name: 'Heir Value Chart',
    icon: Users,
    defaultSize: { w: 2, h: 2 },
    description: 'After-tax inheritance value',
  },
  {
    id: 'mini-table',
    name: 'Mini Projections',
    icon: Table2,
    defaultSize: { w: 3, h: 2 },
    description: 'Compact projections table',
  },
  {
    id: 'scenario-compare',
    name: 'Scenario Compare',
    icon: GitCompare,
    defaultSize: { w: 2, h: 2 },
    description: 'Compare scenario outcomes',
  },
  {
    id: 'roth-analysis',
    name: 'Roth Analysis',
    icon: ArrowLeftRight,
    defaultSize: { w: 2, h: 1 },
    description: 'Roth conversion insights',
  },
  {
    id: 'tax-bracket',
    name: 'Tax Bracket Visual',
    icon: Layers,
    defaultSize: { w: 2, h: 2 },
    description: 'Tax bracket utilization',
  },
  {
    id: 'chart-withdrawals',
    name: 'Withdrawals Chart',
    icon: Wallet,
    defaultSize: { w: 2, h: 2 },
    description: 'Withdrawal sources over time',
  },
  {
    id: 'chart-irmaa',
    name: 'IRMAA Chart',
    icon: Shield,
    defaultSize: { w: 2, h: 2 },
    description: 'Medicare surcharge impact',
  },
  {
    id: 'chart-composition',
    name: 'Portfolio Composition',
    icon: PieChart,
    defaultSize: { w: 2, h: 2 },
    description: 'Current vs final allocation',
  },
  {
    id: 'chart-roth-percent',
    name: 'Roth Percentage',
    icon: LineIcon,
    defaultSize: { w: 2, h: 2 },
    description: 'Roth % over time',
  },
];

// Chart colors
const COLORS = {
  at: '#10b981',
  ira: '#f59e0b',
  roth: '#3b82f6',
  federal: '#ef4444',
  state: '#f97316',
  ltcg: '#eab308',
  niit: '#a855f7',
  irmaa: '#8b5cf6',
  ss: '#22c55e',
  total: '#06b6d4',
  heir: '#14b8a6',
};

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  fontSize: '11px',
  borderRadius: '4px',
};

// Helper function to apply Present Value discount factor
// PV = FV / (1 + r)^n where r = discount rate and n = years from start
const applyPV = (value, yearsFromStart, discountRate, shouldApply) => {
  if (!shouldApply || typeof value !== 'number' || isNaN(value)) return value;
  const pvFactor = Math.pow(1 + discountRate, yearsFromStart);
  return value / pvFactor;
};

// Default widget configuration
const DEFAULT_WIDGETS = [
  { id: 1, type: 'summary-cards', x: 0, y: 0, w: 2, h: 1 },
  { id: 2, type: 'chart-balances', x: 2, y: 0, w: 2, h: 2 },
  { id: 3, type: 'chart-taxes', x: 0, y: 1, w: 2, h: 2 },
];

export function Dashboard({ projections, params, scenarios = [], showPV = true }) {
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);

  // Drag-and-drop state
  const [draggedWidgetId, setDraggedWidgetId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  // Transform projection data for charts with dynamic PV application
  const discountRate = params.discountRate || 0.03;
  const chartData = useMemo(
    () =>
      projections.map(p => {
        const yfs = p.yearsFromStart || 0;
        const pv = val => applyPV(val, yfs, discountRate, showPV);

        return {
          year: p.year,
          age: p.age,
          // Balances in millions (with PV applied)
          atEOY: pv(p.atEOY) / 1e6,
          iraEOY: pv(p.iraEOY) / 1e6,
          rothEOY: pv(p.rothEOY) / 1e6,
          totalEOY: pv(p.totalEOY) / 1e6,
          // Taxes in thousands (with PV applied)
          federalTax: pv(p.federalTax) / 1e3,
          stateTax: pv(p.stateTax) / 1e3,
          ltcgTax: pv(p.ltcgTax) / 1e3,
          niit: pv(p.niit) / 1e3,
          totalTax: pv(p.totalTax) / 1e3,
          // Income in thousands (with PV applied)
          ssAnnual: pv(p.ssAnnual) / 1e3,
          expenses: pv(p.expenses) / 1e3,
          rothConversion: pv(p.rothConversion) / 1e3,
          // Withdrawals in thousands (with PV applied)
          atWithdrawal: pv(p.atWithdrawal) / 1e3,
          iraWithdrawal: pv(p.iraWithdrawal) / 1e3,
          rothWithdrawal: pv(p.rothWithdrawal) / 1e3,
          totalWithdrawal: pv(p.totalWithdrawal) / 1e3,
          // IRMAA in thousands (with PV applied)
          irmaaTotal: pv(p.irmaaTotal) / 1e3,
          // Heir value in millions (with PV applied)
          heirValue: pv(p.heirValue) / 1e6,
          // Percentages (NOT affected by PV)
          rothPercent: p.rothPercent || 0,
          // Cumulative (with PV applied)
          cumulativeTax: pv(p.cumulativeTax) / 1e6,
          cumulativeIRMAA: pv(p.cumulativeIRMAA) / 1e3,
          // Tax bracket space (with PV applied for display consistency)
          taxableOrdinary: pv(p.taxableOrdinary),
          yearsFromStart: yfs,
        };
      }),
    [projections, showPV, discountRate]
  );

  // Get current year allocation for pie chart
  const currentAllocation = useMemo(() => {
    if (!chartData.length) return [];
    const current = chartData[0];
    return [
      { name: 'After-Tax', value: current.atEOY, color: COLORS.at },
      { name: 'Traditional IRA', value: current.iraEOY, color: COLORS.ira },
      { name: 'Roth IRA', value: current.rothEOY, color: COLORS.roth },
    ].filter(d => d.value > 0);
  }, [chartData]);

  // Final year allocation
  const finalAllocation = useMemo(() => {
    if (!chartData.length) return [];
    const final = chartData[chartData.length - 1];
    return [
      { name: 'After-Tax', value: final.atEOY, color: COLORS.at },
      { name: 'Traditional IRA', value: final.iraEOY, color: COLORS.ira },
      { name: 'Roth IRA', value: final.rothEOY, color: COLORS.roth },
    ].filter(d => d.value > 0);
  }, [chartData]);

  // Summary metrics for cards (with dynamic PV application)
  const summaryMetrics = useMemo(() => {
    if (!projections.length) return {};
    const first = projections[0];
    const last = projections[projections.length - 1];

    // Apply PV to monetary values
    const pvFirst = val => applyPV(val, first.yearsFromStart || 0, discountRate, showPV);
    const pvLast = val => applyPV(val, last.yearsFromStart || 0, discountRate, showPV);

    return {
      startingPortfolio: pvFirst(first.totalBOY),
      endingPortfolio: pvLast(last.totalEOY),
      endingHeirValue: pvLast(last.heirValue),
      totalTaxPaid: pvLast(last.cumulativeTax),
      totalIRMAA: pvLast(last.cumulativeIRMAA),
      finalRothPercent: last.rothPercent, // Percentages not affected by PV
      yearsProjected: projections.length,
    };
  }, [projections, showPV, discountRate]);

  // Tax bracket waterfall data for selected year
  const bracketWaterfallData = useMemo(() => {
    const yearIndex = selectedYear ? projections.findIndex(p => p.year === selectedYear) : 0;
    const p = projections[yearIndex] || projections[0];
    if (!p) return [];

    const yearsFromBase = p.yearsFromStart || 0;
    const brackets = inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, 0.03, yearsFromBase);
    const taxableIncome = p.taxableOrdinary || 0;

    return brackets
      .map((bracket, i) => {
        const nextThreshold = i < brackets.length - 1 ? brackets[i + 1].threshold : Infinity;
        const bracketSize = nextThreshold - bracket.threshold;
        const incomeInBracket = Math.max(
          0,
          Math.min(taxableIncome - bracket.threshold, bracketSize)
        );
        const filled = taxableIncome > bracket.threshold ? incomeInBracket : 0;
        const remaining = Math.max(0, bracketSize - filled);

        return {
          bracket: `${(bracket.rate * 100).toFixed(0)}%`,
          rate: bracket.rate,
          threshold: bracket.threshold,
          filled: filled / 1e3,
          remaining: remaining === Infinity ? 0 : remaining / 1e3,
          bracketSize: bracketSize === Infinity ? 0 : bracketSize / 1e3,
        };
      })
      .filter(b => b.bracketSize > 0 || b.filled > 0);
  }, [projections, selectedYear]);

  // Roth analysis data (with PV applied)
  const rothAnalysisData = useMemo(
    () =>
      projections.map(p => {
        const yearsFromBase = p.yearsFromStart || 0;
        const brackets = inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, 0.03, yearsFromBase);
        const taxableIncome = p.taxableOrdinary || 0;
        const pv = val => applyPV(val, yearsFromBase, discountRate, showPV);

        const bracket24 = brackets.find(b => b.rate === 0.24);
        const bracket32 = brackets.find(b => b.rate === 0.32);

        const spaceTo24 = bracket24 ? Math.max(0, bracket24.threshold - taxableIncome) : 0;
        const spaceTo32 = bracket32 ? Math.max(0, bracket32.threshold - taxableIncome) : 0;

        return {
          year: p.year,
          taxableIncome: pv(taxableIncome) / 1e3,
          rothConversion: pv(p.rothConversion || 0) / 1e3,
          spaceTo24: pv(spaceTo24) / 1e3,
          spaceTo32: pv(spaceTo32) / 1e3,
        };
      }),
    [projections, showPV, discountRate]
  );

  // Add a new widget
  const addWidget = type => {
    const widgetType = WIDGET_TYPES.find(w => w.id === type);
    if (!widgetType) return;

    const newWidget = {
      id: Date.now(),
      type,
      x: 0,
      y: Math.max(...widgets.map(w => w.y + w.h), 0),
      ...widgetType.defaultSize,
    };
    setWidgets([...widgets, newWidget]);
    setShowAddWidget(false);
  };

  // Remove a widget
  const removeWidget = id => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  // Drag-and-drop handlers
  const handleDragStart = (e, widgetId) => {
    setDraggedWidgetId(widgetId);
    e.dataTransfer.effectAllowed = 'move';
    // Set drag data for compatibility
    e.dataTransfer.setData('text/plain', widgetId.toString());
  };

  const handleDragOver = (e, widgetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (widgetId !== draggedWidgetId) {
      setDropTargetId(widgetId);
    }
  };

  const handleDragLeave = e => {
    // Only clear drop target if leaving the widget entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTargetId(null);
    }
  };

  const handleDrop = (e, targetWidgetId) => {
    e.preventDefault();
    if (draggedWidgetId && targetWidgetId && draggedWidgetId !== targetWidgetId) {
      // Swap widget positions in the array
      setWidgets(prevWidgets => {
        const newWidgets = [...prevWidgets];
        const draggedIndex = newWidgets.findIndex(w => w.id === draggedWidgetId);
        const targetIndex = newWidgets.findIndex(w => w.id === targetWidgetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Swap the widgets
          [newWidgets[draggedIndex], newWidgets[targetIndex]] = [
            newWidgets[targetIndex],
            newWidgets[draggedIndex],
          ];
        }
        return newWidgets;
      });
    }
    setDraggedWidgetId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDropTargetId(null);
  };

  // Render individual widget content
  const renderWidget = type => {
    switch (type) {
      case 'summary-cards':
        return (
          <div className="grid grid-cols-4 gap-2 h-full">
            <div className="bg-slate-800 rounded p-2 flex flex-col justify-center">
              <div className="text-slate-400 text-xs">Starting</div>
              <div className="text-emerald-400 font-medium">
                {fmt$(summaryMetrics.startingPortfolio)}
              </div>
            </div>
            <div className="bg-slate-800 rounded p-2 flex flex-col justify-center">
              <div className="text-slate-400 text-xs">Ending</div>
              <div className="text-blue-400 font-medium">
                {fmt$(summaryMetrics.endingPortfolio)}
              </div>
            </div>
            <div className="bg-slate-800 rounded p-2 flex flex-col justify-center">
              <div className="text-slate-400 text-xs">Heir Value</div>
              <div className="text-teal-400 font-medium">
                {fmt$(summaryMetrics.endingHeirValue)}
              </div>
            </div>
            <div className="bg-slate-800 rounded p-2 flex flex-col justify-center">
              <div className="text-slate-400 text-xs">Final Roth %</div>
              <div className="text-purple-400 font-medium">
                {fmtPct(summaryMetrics.finalRothPercent)}
              </div>
            </div>
          </div>
        );

      case 'chart-balances':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="atEOY"
                stackId="1"
                fill={COLORS.at}
                stroke={COLORS.at}
                name="After-Tax"
              />
              <Area
                type="monotone"
                dataKey="iraEOY"
                stackId="1"
                fill={COLORS.ira}
                stroke={COLORS.ira}
                name="IRA"
              />
              <Area
                type="monotone"
                dataKey="rothEOY"
                stackId="1"
                fill={COLORS.roth}
                stroke={COLORS.roth}
                name="Roth"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'chart-taxes':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="federalTax" stackId="1" fill={COLORS.federal} name="Federal" />
              <Bar dataKey="stateTax" stackId="1" fill={COLORS.state} name="State" />
              <Bar dataKey="ltcgTax" stackId="1" fill={COLORS.ltcg} name="LTCG" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'chart-heir':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="heirValue"
                stroke={COLORS.heir}
                strokeWidth={2}
                dot={false}
                name="Heir Value"
              />
              <Line
                type="monotone"
                dataKey="totalEOY"
                stroke={COLORS.total}
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                name="Portfolio"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'mini-table': {
        const displayYears = [0, 4, 9, 14, 19, projections.length - 1].filter(
          (i, idx, arr) => i < projections.length && arr.indexOf(i) === idx
        );
        return (
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-700">
                  <th className="text-left py-1 px-2 text-slate-400">Year</th>
                  <th className="text-right py-1 px-2 text-slate-400">Portfolio</th>
                  <th className="text-right py-1 px-2 text-slate-400">Heir</th>
                  <th className="text-right py-1 px-2 text-slate-400">Tax</th>
                  <th className="text-right py-1 px-2 text-slate-400">Roth%</th>
                </tr>
              </thead>
              <tbody>
                {displayYears.map(idx => {
                  const p = projections[idx];
                  if (!p) return null;
                  const yfs = p.yearsFromStart || 0;
                  const pv = val => applyPV(val, yfs, discountRate, showPV);
                  return (
                    <tr key={p.year} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-1 px-2 text-slate-300">{p.year}</td>
                      <td className="py-1 px-2 text-right text-emerald-400">
                        {fmt$(pv(p.totalEOY))}
                      </td>
                      <td className="py-1 px-2 text-right text-teal-400">
                        {fmt$(pv(p.heirValue))}
                      </td>
                      <td className="py-1 px-2 text-right text-rose-400">{fmt$(pv(p.totalTax))}</td>
                      <td className="py-1 px-2 text-right text-blue-400">
                        {fmtPct(p.rothPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      case 'scenario-compare':
        if (!scenarios || scenarios.length === 0) {
          return (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              <div className="text-center">
                <GitCompare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <div>No scenarios to compare</div>
                <div className="text-xs mt-1">Create scenarios in the Scenarios tab</div>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-2 h-full overflow-auto">
            {scenarios.slice(0, 3).map((s, idx) => (
              <div
                key={s.id || idx}
                className="bg-slate-800 rounded p-2 flex justify-between items-center"
              >
                <div className="text-slate-200 text-xs truncate">{s.name}</div>
                <div className="text-emerald-400 text-xs font-medium">
                  {fmt$(s.summary?.endingPortfolio)}
                </div>
              </div>
            ))}
          </div>
        );

      case 'roth-analysis': {
        const rothData = rothAnalysisData[0] || {};
        return (
          <div className="grid grid-cols-3 gap-2 h-full">
            <div className="bg-slate-800 rounded p-2 flex flex-col justify-center">
              <div className="text-slate-400 text-xs">Taxable Income</div>
              <div className="text-amber-400 font-medium text-sm">
                ${(rothData.taxableIncome || 0).toFixed(0)}K
              </div>
            </div>
            <div className="bg-slate-800 rounded p-2 flex flex-col justify-center">
              <div className="text-slate-400 text-xs">Space to 24%</div>
              <div className="text-emerald-400 font-medium text-sm">
                ${(rothData.spaceTo24 || 0).toFixed(0)}K
              </div>
            </div>
            <div className="bg-slate-800 rounded p-2 flex flex-col justify-center">
              <div className="text-slate-400 text-xs">Conversion</div>
              <div className="text-blue-400 font-medium text-sm">
                ${(rothData.rothConversion || 0).toFixed(0)}K
              </div>
            </div>
          </div>
        );
      }

      case 'tax-bracket':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Year:</span>
              <select
                value={selectedYear || projections[0]?.year}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs"
              >
                {projections.slice(0, 10).map(p => (
                  <option key={p.year} value={p.year}>
                    {p.year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bracketWaterfallData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={v => `$${v}K`}
                  />
                  <YAxis
                    type="category"
                    dataKey="bracket"
                    stroke="#64748b"
                    fontSize={10}
                    width={35}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="filled" stackId="1" fill={COLORS.roth} name="Filled" />
                  <Bar dataKey="remaining" stackId="1" fill="#334155" name="Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'chart-withdrawals':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="atWithdrawal"
                stackId="1"
                fill={COLORS.at}
                stroke={COLORS.at}
                name="After-Tax"
              />
              <Area
                type="monotone"
                dataKey="iraWithdrawal"
                stackId="1"
                fill={COLORS.ira}
                stroke={COLORS.ira}
                name="IRA"
              />
              <Area
                type="monotone"
                dataKey="rothWithdrawal"
                stackId="1"
                fill={COLORS.roth}
                stroke={COLORS.roth}
                name="Roth"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'chart-irmaa':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="irmaaTotal" fill={COLORS.irmaa} name="Annual IRMAA" />
              <Line
                type="monotone"
                dataKey="cumulativeIRMAA"
                stroke={COLORS.federal}
                strokeWidth={2}
                dot={false}
                name="Cumulative"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'chart-composition':
        return (
          <div className="grid grid-cols-2 gap-2 h-full">
            <div className="flex flex-col">
              <div className="text-xs text-slate-400 text-center mb-1">Current</div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={currentAllocation}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {currentAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={v => `$${v.toFixed(2)}M`} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-xs text-slate-400 text-center mb-1">Final</div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={finalAllocation}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {finalAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={v => `$${v.toFixed(2)}M`} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case 'chart-roth-percent':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                domain={[0, 1]}
                tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={v => [`${(v * 100).toFixed(1)}%`, 'Roth %']}
              />
              <Area
                type="monotone"
                dataKey="rothPercent"
                fill={COLORS.roth}
                stroke={COLORS.roth}
                fillOpacity={0.3}
                name="Roth %"
              />
              <ReferenceLine y={0.5} stroke="#64748b" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            Unknown widget type: {type}
          </div>
        );
    }
  };

  return (
    <div data-testid="dashboard" className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Toolbar */}
      <div className="h-8 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={() => setShowAddWidget(!showAddWidget)}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1 hover:bg-blue-500"
        >
          <Plus className="w-3 h-3" /> Add Widget
        </button>
        <span className="text-slate-400 text-xs">{widgets.length} widgets</span>
        <div className="flex-1" />
        <button
          onClick={() => setWidgets(DEFAULT_WIDGETS)}
          className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600"
        >
          Reset Layout
        </button>
      </div>

      {/* Widget picker */}
      {showAddWidget && (
        <div className="bg-slate-900 border-b border-slate-700 p-3">
          <div className="text-xs text-slate-400 mb-2">Select a widget to add:</div>
          <div className="grid grid-cols-4 gap-2">
            {WIDGET_TYPES.map(w => {
              const isAdded = widgets.some(widget => widget.type === w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => addWidget(w.id)}
                  className={`p-2 rounded border text-left transition-colors ${
                    isAdded
                      ? 'border-slate-600 bg-slate-800/50 opacity-60'
                      : 'border-slate-700 hover:border-blue-500 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <w.icon className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-200 text-xs">{w.name}</span>
                  </div>
                  <div className="text-slate-500 text-xs">{w.description}</div>
                  <div className="text-slate-600 text-xs mt-1">
                    {w.defaultSize.w}x{w.defaultSize.h}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget grid */}
      <div data-testid="dashboard-charts" className="flex-1 overflow-auto p-3">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <LayoutGrid className="w-12 h-12 mb-3 opacity-50" />
            <div className="text-lg mb-2">No widgets added</div>
            <div className="text-sm mb-4">Add widgets to customize your dashboard</div>
            <button
              onClick={() => setShowAddWidget(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Your First Widget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 auto-rows-[150px]">
            {widgets.map(widget => {
              const widgetType = WIDGET_TYPES.find(t => t.id === widget.type);
              const isDragging = draggedWidgetId === widget.id;
              const isDropTarget = dropTargetId === widget.id;

              return (
                <div
                  key={widget.id}
                  draggable="true"
                  onDragStart={e => handleDragStart(e, widget.id)}
                  onDragOver={e => handleDragOver(e, widget.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, widget.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-slate-900 rounded border overflow-hidden flex flex-col transition-all duration-200 ${
                    isDragging
                      ? 'opacity-50 border-blue-500 scale-95'
                      : isDropTarget
                        ? 'border-blue-400 ring-2 ring-blue-400/50 scale-102'
                        : 'border-slate-700'
                  }`}
                  style={{
                    gridColumn: `span ${widget.w}`,
                    gridRow: `span ${widget.h}`,
                    cursor: isDragging ? 'grabbing' : 'default',
                  }}
                >
                  {/* Widget header - drag handle */}
                  <div
                    className={`h-6 bg-slate-800 flex items-center justify-between px-2 shrink-0 ${
                      isDragging ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <GripVertical className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-xs text-slate-400 truncate">
                        {widgetType?.name || widget.type}
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeWidget(widget.id);
                      }}
                      className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                      title="Remove widget"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Widget content */}
                  <div className="p-2 flex-1 overflow-hidden">{renderWidget(widget.type)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
