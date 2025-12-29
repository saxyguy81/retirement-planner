/**
 * ChartsView Component
 *
 * Visualization panel with selectable charts
 */

import {
  Plus,
  X,
  LineChart,
  Layers,
  BarChart3,
  Shield,
  Users,
  TrendingUp,
  PieChart,
  Percent,
  ArrowLeftRight,
  Wallet,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  LineChart as RLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { FEDERAL_BRACKETS_MFJ_2024, inflateBrackets } from '../../lib/taxTables.js';

const CHART_CONFIGS = [
  { id: 'balances', name: 'Account Balances', icon: LineChart },
  { id: 'withdrawals', name: 'Withdrawal Sources', icon: Layers },
  { id: 'taxes', name: 'Tax Burden', icon: BarChart3 },
  { id: 'irmaa', name: 'IRMAA Impact', icon: Shield },
  { id: 'heir', name: 'Heir Value', icon: Users },
  { id: 'cashflow', name: 'Cash Flow', icon: TrendingUp },
  { id: 'bracket', name: 'Tax Bracket Waterfall', icon: Wallet },
  { id: 'roth-analysis', name: 'Roth Conversion Analysis', icon: ArrowLeftRight },
  { id: 'composition', name: 'Portfolio Composition', icon: PieChart },
  { id: 'effective-rate', name: 'Effective Tax Rate', icon: Percent },
];

// Tax bracket colors (from lowest to highest rate)
const BRACKET_COLORS = [
  '#22c55e', // 10% - green
  '#84cc16', // 12% - lime
  '#eab308', // 22% - yellow
  '#f97316', // 24% - orange
  '#ef4444', // 32% - red
  '#dc2626', // 35% - darker red
  '#991b1b', // 37% - darkest red
];

export function ChartsView({ projections }) {
  const [activeCharts, setActiveCharts] = useState(['balances', 'taxes']);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);

  const chartData = projections.map(p => ({
    year: p.year,
    AT: p.atEOY / 1e6,
    IRA: p.iraEOY / 1e6,
    Roth: p.rothEOY / 1e6,
    Total: p.totalEOY / 1e6,
    Federal: p.federalTax / 1e3,
    State: p.stateTax / 1e3,
    LTCG: p.ltcgTax / 1e3,
    IRMAA: p.irmaaTotal / 1e3,
    Heir: p.heirValue / 1e6,
    ATW: p.atWithdrawal / 1e3,
    IRAW: p.iraWithdrawal / 1e3,
    RothW: p.rothWithdrawal / 1e3,
    SS: p.ssAnnual / 1e3,
    Exp: p.expenses / 1e3,
    Tax: p.totalTax / 1e3,
  }));

  // Data for composition chart (percentages)
  const compositionData = useMemo(
    () =>
      projections.map(p => {
        const total = p.totalEOY || 1;
        return {
          year: p.year,
          AT: (p.atEOY / total) * 100,
          IRA: (p.iraEOY / total) * 100,
          Roth: (p.rothEOY / total) * 100,
        };
      }),
    [projections]
  );

  // Data for effective tax rate chart
  const effectiveRateData = useMemo(
    () =>
      projections.map(p => {
        const grossIncome = p.ordinaryIncome + p.capitalGains;
        const effectiveRate = grossIncome > 0 ? p.totalTax / grossIncome : 0;
        return {
          year: p.year,
          rate: effectiveRate * 100, // As percentage
          federalRate: grossIncome > 0 ? (p.federalTax / grossIncome) * 100 : 0,
        };
      }),
    [projections]
  );

  // Data for tax bracket waterfall - shows how income fills each bracket for selected year
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
      .filter(b => b.bracketSize > 0 || b.filled > 0); // Filter out infinite top bracket if not filled
  }, [projections, selectedYear]);

  // Data for Roth conversion analysis - shows bracket space available
  const rothAnalysisData = useMemo(
    () =>
      projections.map(p => {
        const yearsFromBase = p.yearsFromStart || 0;
        const brackets = inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, 0.03, yearsFromBase);
        const taxableIncome = p.taxableOrdinary || 0;

        // Find current bracket and space remaining in 22% and 24% brackets
        const bracket22 = brackets.find(b => b.rate === 0.22);
        const bracket24 = brackets.find(b => b.rate === 0.24);
        const bracket32 = brackets.find(b => b.rate === 0.32);

        const spaceTo24 = bracket24 ? Math.max(0, bracket24.threshold - taxableIncome) : 0;
        const spaceTo32 = bracket32 ? Math.max(0, bracket32.threshold - taxableIncome) : 0;

        return {
          year: p.year,
          taxableIncome: taxableIncome / 1e3,
          rothConversion: (p.rothConversion || 0) / 1e3,
          spaceTo24: spaceTo24 / 1e3,
          spaceTo32: spaceTo32 / 1e3,
          bracket22Threshold: bracket22 ? bracket22.threshold / 1e3 : 0,
          bracket24Threshold: bracket24 ? bracket24.threshold / 1e3 : 0,
        };
      }),
    [projections]
  );

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    fontSize: '11px',
  };

  // Custom tooltip for bracket waterfall
  const BracketTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    return (
      <div style={tooltipStyle} className="p-2 rounded">
        <div className="font-medium text-white">{data.bracket} Bracket</div>
        <div className="text-emerald-400">Filled: ${data.filled.toFixed(0)}K</div>
        {data.remaining > 0 && (
          <div className="text-slate-400">Remaining: ${data.remaining.toFixed(0)}K</div>
        )}
      </div>
    );
  };

  // Custom tooltip for Roth analysis
  const RothTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    return (
      <div style={tooltipStyle} className="p-2 rounded">
        <div className="font-medium text-white">{label}</div>
        <div className="text-amber-400">Taxable Income: ${data.taxableIncome.toFixed(0)}K</div>
        <div className="text-blue-400">Roth Conversion: ${data.rothConversion.toFixed(0)}K</div>
        <div className="text-emerald-400">Space to 24%: ${data.spaceTo24.toFixed(0)}K</div>
        <div className="text-purple-400">Space to 32%: ${data.spaceTo32.toFixed(0)}K</div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      <div className="h-8 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400">Charts:</span>
          {activeCharts.map(id => {
            const config = CHART_CONFIGS.find(c => c.id === id);
            return (
              <span key={id} className="px-1.5 py-0.5 bg-slate-800 rounded flex items-center gap-1">
                {config?.name}
                <button
                  onClick={() => setActiveCharts(a => a.filter(c => c !== id))}
                  className="hover:text-red-400"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {showPicker && (
        <div className="bg-slate-900 border-b border-slate-800 p-3">
          <div className="grid grid-cols-3 gap-2">
            {CHART_CONFIGS.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  if (!activeCharts.includes(c.id)) setActiveCharts(a => [...a, c.id]);
                  setShowPicker(false);
                }}
                disabled={activeCharts.includes(c.id)}
                className={`p-2 rounded border text-left ${activeCharts.includes(c.id) ? 'opacity-50' : 'hover:border-blue-500'} border-slate-700`}
              >
                <c.icon className="w-4 h-4 text-blue-400 mb-1" />
                <div className="text-slate-200">{c.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-2 gap-4">
          {activeCharts.includes('balances') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">Account Balances ($M)</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="AT"
                    stackId="1"
                    fill="#10b981"
                    stroke="#10b981"
                    name="After-Tax"
                  />
                  <Area
                    type="monotone"
                    dataKey="IRA"
                    stackId="1"
                    fill="#f59e0b"
                    stroke="#f59e0b"
                    name="IRA"
                  />
                  <Area
                    type="monotone"
                    dataKey="Roth"
                    stackId="1"
                    fill="#3b82f6"
                    stroke="#3b82f6"
                    name="Roth"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeCharts.includes('taxes') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">Tax Burden ($K)</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="Federal" stackId="1" fill="#ef4444" />
                  <Bar dataKey="State" stackId="1" fill="#f97316" />
                  <Bar dataKey="LTCG" stackId="1" fill="#eab308" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeCharts.includes('irmaa') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">IRMAA ($K)</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="IRMAA" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeCharts.includes('heir') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">Heir Value ($M)</div>
              <ResponsiveContainer width="100%" height={200}>
                <RLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Heir"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Heir Value"
                  />
                  <Line
                    type="monotone"
                    dataKey="Total"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                    name="Portfolio"
                  />
                </RLineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeCharts.includes('withdrawals') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">Withdrawals ($K)</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="ATW"
                    stackId="1"
                    fill="#10b981"
                    stroke="#10b981"
                    name="After-Tax"
                  />
                  <Area
                    type="monotone"
                    dataKey="IRAW"
                    stackId="1"
                    fill="#f59e0b"
                    stroke="#f59e0b"
                    name="IRA"
                  />
                  <Area
                    type="monotone"
                    dataKey="RothW"
                    stackId="1"
                    fill="#3b82f6"
                    stroke="#3b82f6"
                    name="Roth"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeCharts.includes('cashflow') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">Cash Flow ($K)</div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="SS" fill="#22c55e" name="Soc Sec" />
                  <Line
                    type="monotone"
                    dataKey="Exp"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Expenses"
                  />
                  <Line
                    type="monotone"
                    dataKey="Tax"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="Taxes"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tax Bracket Waterfall Chart */}
          {activeCharts.includes('bracket') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-200">Tax Bracket Waterfall ($K)</div>
                <select
                  value={selectedYear || projections[0]?.year || ''}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="bg-slate-800 text-xs rounded px-2 py-1 border border-slate-700"
                >
                  {projections.map(p => (
                    <option key={p.year} value={p.year}>
                      {p.year}
                    </option>
                  ))}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bracketWaterfallData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
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
                    width={40}
                  />
                  <Tooltip content={<BracketTooltip />} />
                  <Bar dataKey="filled" stackId="stack" name="Filled">
                    {bracketWaterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BRACKET_COLORS[index] || '#64748b'} />
                    ))}
                  </Bar>
                  <Bar dataKey="remaining" stackId="stack" fill="#334155" name="Remaining" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-slate-400 text-center">
                Shows how taxable income fills each federal tax bracket
              </div>
            </div>
          )}

          {/* Roth Conversion Analysis Chart */}
          {activeCharts.includes('roth-analysis') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">
                Roth Conversion Analysis ($K)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={rothAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 'auto']} />
                  <Tooltip content={<RothTooltip />} />
                  <Legend />
                  <Bar dataKey="taxableIncome" fill="#f59e0b" name="Taxable Income" />
                  <Bar dataKey="rothConversion" fill="#3b82f6" name="Roth Conversion" />
                  <Line
                    type="monotone"
                    dataKey="spaceTo24"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Space to 24%"
                  />
                  <Line
                    type="monotone"
                    dataKey="spaceTo32"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Space to 32%"
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-slate-400 text-center">
                Dashed lines show remaining space before hitting higher brackets
              </div>
            </div>
          )}

          {/* Portfolio Composition Chart */}
          {activeCharts.includes('composition') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">
                Portfolio Composition (%)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={compositionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={value => `${value.toFixed(1)}%`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="AT"
                    stackId="1"
                    fill="#10b981"
                    stroke="#10b981"
                    name="After-Tax"
                  />
                  <Area
                    type="monotone"
                    dataKey="IRA"
                    stackId="1"
                    fill="#f59e0b"
                    stroke="#f59e0b"
                    name="IRA"
                  />
                  <Area
                    type="monotone"
                    dataKey="Roth"
                    stackId="1"
                    fill="#3b82f6"
                    stroke="#3b82f6"
                    name="Roth"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-slate-400 text-center">
                Shows how account mix shifts over time (target: grow Roth %)
              </div>
            </div>
          )}

          {/* Effective Tax Rate Chart */}
          {activeCharts.includes('effective-rate') && (
            <div className="bg-slate-900 rounded border border-slate-800 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">Effective Tax Rate (%)</div>
              <ResponsiveContainer width="100%" height={200}>
                <RLineChart data={effectiveRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    domain={[0, 'auto']}
                    tickFormatter={v => `${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={value => `${value.toFixed(1)}%`}
                  />
                  <Legend />
                  <ReferenceLine y={22} stroke="#f59e0b" strokeDasharray="3 3" />
                  <ReferenceLine y={24} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    name="Total Effective Rate"
                  />
                  <Line
                    type="monotone"
                    dataKey="federalRate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                    name="Federal Only"
                  />
                </RLineChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-slate-400 text-center">
                Reference lines at 22% and 24% marginal brackets
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChartsView;
