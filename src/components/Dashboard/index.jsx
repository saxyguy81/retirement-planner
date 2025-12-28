/**
 * Dashboard Component
 *
 * Configurable dashboard with sub-tabs for different visualization categories.
 * Replaces the Charts tab with a more comprehensive view.
 *
 * Features:
 * - Sub-tabs for different chart categories
 * - Configurable chart layouts (grid vs stacked)
 * - Drag and drop reordering (future)
 * - Chart resize capability
 */

import React, { useState, useMemo } from 'react';
import {
  LineChart as LineIcon,
  BarChart3,
  PieChart,
  TrendingUp,
  Shield,
  Users,
  Wallet,
  Settings,
  Grid,
  Rows,
} from 'lucide-react';
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
  ScatterChart,
  Scatter,
  ZAxis,
  Brush,
} from 'recharts';

// Dashboard sub-tabs
const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview', icon: Grid },
  { id: 'balances', label: 'Balances', icon: TrendingUp },
  { id: 'income', label: 'Income & Tax', icon: Wallet },
  { id: 'withdrawals', label: 'Withdrawals', icon: BarChart3 },
  { id: 'healthcare', label: 'Healthcare', icon: Shield },
  { id: 'legacy', label: 'Legacy', icon: Users },
  { id: 'advanced', label: 'Advanced', icon: PieChart },
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

// Custom tooltip formatter
const formatTooltipValue = (value, unit = '$K') => {
  if (typeof value !== 'number') return value;
  if (unit === '$M') return `$${value.toFixed(2)}M`;
  if (unit === '$K') return `$${value.toFixed(0)}K`;
  if (unit === '%') return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(2);
};

export function Dashboard({ projections, params }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [layout, setLayout] = useState('grid'); // 'grid' or 'stack'

  // Transform projection data for charts
  const chartData = useMemo(
    () =>
      projections.map((p) => ({
        year: p.year,
        age: p.age,
        // Balances in millions
        atEOY: p.atEOY / 1e6,
        iraEOY: p.iraEOY / 1e6,
        rothEOY: p.rothEOY / 1e6,
        totalEOY: p.totalEOY / 1e6,
        // PV balances
        pvAtEOY: (p.pvAtEOY || p.atEOY) / 1e6,
        pvIraEOY: (p.pvIraEOY || p.iraEOY) / 1e6,
        pvRothEOY: (p.pvRothEOY || p.rothEOY) / 1e6,
        pvTotalEOY: (p.pvTotalEOY || p.totalEOY) / 1e6,
        // Taxes in thousands
        federalTax: p.federalTax / 1e3,
        stateTax: p.stateTax / 1e3,
        ltcgTax: p.ltcgTax / 1e3,
        niit: p.niit / 1e3,
        totalTax: p.totalTax / 1e3,
        // Income in thousands
        ssAnnual: p.ssAnnual / 1e3,
        expenses: p.expenses / 1e3,
        rothConversion: p.rothConversion / 1e3,
        // Withdrawals in thousands
        atWithdrawal: p.atWithdrawal / 1e3,
        iraWithdrawal: p.iraWithdrawal / 1e3,
        rothWithdrawal: p.rothWithdrawal / 1e3,
        totalWithdrawal: p.totalWithdrawal / 1e3,
        // IRMAA in thousands
        irmaaTotal: p.irmaaTotal / 1e3,
        // Heir value in millions
        heirValue: p.heirValue / 1e6,
        pvHeirValue: (p.pvHeirValue || p.heirValue) / 1e6,
        // Percentages
        rothPercent: p.rothPercent || 0,
        // Cumulative
        cumulativeTax: p.cumulativeTax / 1e6,
        cumulativeIRMAA: p.cumulativeIRMAA / 1e3,
      })),
    [projections]
  );

  // Get current year allocation for pie chart
  const currentAllocation = useMemo(() => {
    if (!chartData.length) return [];
    const current = chartData[0];
    return [
      { name: 'After-Tax', value: current.atEOY, color: COLORS.at },
      { name: 'Traditional IRA', value: current.iraEOY, color: COLORS.ira },
      { name: 'Roth IRA', value: current.rothEOY, color: COLORS.roth },
    ].filter((d) => d.value > 0);
  }, [chartData]);

  // Final year allocation
  const finalAllocation = useMemo(() => {
    if (!chartData.length) return [];
    const final = chartData[chartData.length - 1];
    return [
      { name: 'After-Tax', value: final.atEOY, color: COLORS.at },
      { name: 'Traditional IRA', value: final.iraEOY, color: COLORS.ira },
      { name: 'Roth IRA', value: final.rothEOY, color: COLORS.roth },
    ].filter((d) => d.value > 0);
  }, [chartData]);

  // Chart wrapper with consistent styling
  const ChartCard = ({ title, children, span = 1 }) => (
    <div
      className={`bg-slate-900 rounded-lg border border-slate-800 p-4 ${
        span === 2 ? 'col-span-2' : ''
      }`}
    >
      <div className="text-sm font-medium text-slate-200 mb-3">{title}</div>
      <ResponsiveContainer width="100%" height={layout === 'stack' ? 300 : 200}>
        {children}
      </ResponsiveContainer>
    </div>
  );

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div
            className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <ChartCard title="Portfolio Growth ($M)">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
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
            </ChartCard>

            <ChartCard title="Annual Tax Burden ($K)">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="federalTax" stackId="1" fill={COLORS.federal} name="Federal" />
                <Bar dataKey="stateTax" stackId="1" fill={COLORS.state} name="State" />
                <Bar dataKey="ltcgTax" stackId="1" fill={COLORS.ltcg} name="LTCG" />
              </BarChart>
            </ChartCard>

            <ChartCard title="Heir Value vs Portfolio ($M)">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
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
                  name="Total Portfolio"
                />
              </LineChart>
            </ChartCard>

            <ChartCard title="Roth Percentage Over Time">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${(v * 100).toFixed(1)}%`, 'Roth %']}
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
            </ChartCard>
          </div>
        );

      case 'balances':
        return (
          <div
            className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <ChartCard title="Account Balances - Nominal ($M)" span={2}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
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
            </ChartCard>

            <ChartCard title="Current Allocation">
              <RPieChart>
                <Pie
                  data={currentAllocation}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#64748b' }}
                >
                  {currentAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v.toFixed(2)}M`} />
              </RPieChart>
            </ChartCard>

            <ChartCard title="Final Allocation">
              <RPieChart>
                <Pie
                  data={finalAllocation}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#64748b' }}
                >
                  {finalAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v.toFixed(2)}M`} />
              </RPieChart>
            </ChartCard>

            <ChartCard title="Present Value Balances ($M)" span={2}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="pvAtEOY"
                  stackId="1"
                  fill={COLORS.at}
                  stroke={COLORS.at}
                  fillOpacity={0.5}
                  name="After-Tax (PV)"
                />
                <Area
                  type="monotone"
                  dataKey="pvIraEOY"
                  stackId="1"
                  fill={COLORS.ira}
                  stroke={COLORS.ira}
                  fillOpacity={0.5}
                  name="IRA (PV)"
                />
                <Area
                  type="monotone"
                  dataKey="pvRothEOY"
                  stackId="1"
                  fill={COLORS.roth}
                  stroke={COLORS.roth}
                  fillOpacity={0.5}
                  name="Roth (PV)"
                />
              </AreaChart>
            </ChartCard>
          </div>
        );

      case 'income':
        return (
          <div
            className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <ChartCard title="Tax Breakdown ($K)">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="federalTax" stackId="1" fill={COLORS.federal} name="Federal" />
                <Bar dataKey="stateTax" stackId="1" fill={COLORS.state} name="State" />
                <Bar dataKey="ltcgTax" stackId="1" fill={COLORS.ltcg} name="LTCG" />
                <Bar dataKey="niit" stackId="1" fill={COLORS.niit} name="NIIT" />
              </BarChart>
            </ChartCard>

            <ChartCard title="Cumulative Tax Paid ($M)">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="cumulativeTax"
                  fill={COLORS.federal}
                  stroke={COLORS.federal}
                  fillOpacity={0.3}
                  name="Cumulative Tax"
                />
              </AreaChart>
            </ChartCard>

            <ChartCard title="Income Sources ($K)">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="ssAnnual" fill={COLORS.ss} name="Social Security" />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke={COLORS.federal}
                  strokeWidth={2}
                  dot={false}
                  name="Expenses"
                />
              </ComposedChart>
            </ChartCard>

            <ChartCard title="Roth Conversions ($K)">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="rothConversion" fill={COLORS.roth} name="Roth Conversion" />
              </BarChart>
            </ChartCard>
          </div>
        );

      case 'withdrawals':
        return (
          <div
            className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <ChartCard title="Withdrawal Sources ($K)" span={2}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
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
            </ChartCard>

            <ChartCard title="Total Annual Withdrawals ($K)">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="totalWithdrawal" fill={COLORS.total} name="Total Withdrawal" />
                <ReferenceLine y={0} stroke="#64748b" />
              </BarChart>
            </ChartCard>

            <ChartCard title="Cash Flow Analysis ($K)">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="ssAnnual" fill={COLORS.ss} name="Social Security" />
                <Bar dataKey="totalWithdrawal" fill={COLORS.total} name="Withdrawals" />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke={COLORS.federal}
                  strokeWidth={2}
                  dot={false}
                  name="Expenses"
                />
              </ComposedChart>
            </ChartCard>
          </div>
        );

      case 'healthcare':
        return (
          <div
            className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <ChartCard title="Annual IRMAA Surcharge ($K)" span={2}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="irmaaTotal" fill={COLORS.irmaa} name="IRMAA Total" />
              </BarChart>
            </ChartCard>

            <ChartCard title="Cumulative IRMAA Paid ($K)">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="cumulativeIRMAA"
                  fill={COLORS.irmaa}
                  stroke={COLORS.irmaa}
                  fillOpacity={0.3}
                  name="Cumulative IRMAA"
                />
              </AreaChart>
            </ChartCard>

            <ChartCard title="IRMAA vs Total Tax ($K)">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="irmaaTotal" fill={COLORS.irmaa} name="IRMAA" />
                <Line
                  type="monotone"
                  dataKey="totalTax"
                  stroke={COLORS.federal}
                  strokeWidth={2}
                  dot={false}
                  name="Total Tax"
                />
              </ComposedChart>
            </ChartCard>
          </div>
        );

      case 'legacy':
        return (
          <div
            className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <ChartCard title="Heir Value Over Time ($M)" span={2}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="heirValue"
                  stroke={COLORS.heir}
                  strokeWidth={2}
                  name="Heir Value (FV)"
                />
                <Line
                  type="monotone"
                  dataKey="pvHeirValue"
                  stroke={COLORS.heir}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Heir Value (PV)"
                />
                <Line
                  type="monotone"
                  dataKey="totalEOY"
                  stroke={COLORS.total}
                  strokeWidth={1}
                  dot={false}
                  name="Portfolio"
                />
              </LineChart>
            </ChartCard>

            <ChartCard title="Portfolio vs Heir Value ($M)">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalEOY"
                  fill={COLORS.total}
                  stroke={COLORS.total}
                  fillOpacity={0.3}
                  name="Portfolio"
                />
                <Area
                  type="monotone"
                  dataKey="heirValue"
                  fill={COLORS.heir}
                  stroke={COLORS.heir}
                  fillOpacity={0.5}
                  name="Heir Value"
                />
              </AreaChart>
            </ChartCard>

            <ChartCard title="Tax-Adjusted Legacy Composition ($M)">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="atEOY"
                  stackId="1"
                  fill={COLORS.at}
                  stroke={COLORS.at}
                  name="After-Tax (100%)"
                />
                <Area
                  type="monotone"
                  dataKey="rothEOY"
                  stackId="1"
                  fill={COLORS.roth}
                  stroke={COLORS.roth}
                  name="Roth (100%)"
                />
              </AreaChart>
            </ChartCard>
          </div>
        );

      case 'advanced':
        // Prepare data for radar chart - compare first, middle, and last years
        const radarData = [
          { metric: 'Portfolio', first: chartData[0]?.totalEOY || 0, mid: chartData[Math.floor(chartData.length / 2)]?.totalEOY || 0, last: chartData[chartData.length - 1]?.totalEOY || 0, fullMark: Math.max(...chartData.map(d => d.totalEOY || 0)) },
          { metric: 'Roth %', first: (chartData[0]?.rothPercent || 0) * 100, mid: (chartData[Math.floor(chartData.length / 2)]?.rothPercent || 0) * 100, last: (chartData[chartData.length - 1]?.rothPercent || 0) * 100, fullMark: 100 },
          { metric: 'Tax/Year', first: chartData[0]?.totalTax || 0, mid: chartData[Math.floor(chartData.length / 2)]?.totalTax || 0, last: chartData[chartData.length - 1]?.totalTax || 0, fullMark: Math.max(...chartData.map(d => d.totalTax || 0)) },
          { metric: 'Heir Value', first: chartData[0]?.heirValue || 0, mid: chartData[Math.floor(chartData.length / 2)]?.heirValue || 0, last: chartData[chartData.length - 1]?.heirValue || 0, fullMark: Math.max(...chartData.map(d => d.heirValue || 0)) },
        ];

        // Prepare scatter data for portfolio vs tax efficiency
        const scatterData = chartData.map(d => ({
          x: d.totalEOY,
          y: d.totalTax,
          z: d.year,
          name: `Year ${d.year}`,
        }));

        return (
          <div
            className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <ChartCard title="Portfolio Timeline with Zoom" span={2}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalEOY"
                  fill={COLORS.total}
                  stroke={COLORS.total}
                  fillOpacity={0.2}
                  name="Portfolio ($M)"
                />
                <Line
                  type="monotone"
                  dataKey="heirValue"
                  stroke={COLORS.heir}
                  strokeWidth={2}
                  dot={false}
                  name="Heir Value ($M)"
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeTax"
                  stroke={COLORS.federal}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Cumulative Tax ($M)"
                />
                <Brush
                  dataKey="year"
                  height={20}
                  stroke="#64748b"
                  fill="#1e293b"
                  travellerWidth={10}
                />
              </ComposedChart>
            </ChartCard>

            <ChartCard title="Metrics Comparison: Start vs Mid vs End">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" stroke="#64748b" fontSize={10} />
                <PolarRadiusAxis stroke="#64748b" fontSize={8} />
                <Radar
                  name={`Year ${chartData[0]?.year || 'Start'}`}
                  dataKey="first"
                  stroke={COLORS.at}
                  fill={COLORS.at}
                  fillOpacity={0.3}
                />
                <Radar
                  name="Mid"
                  dataKey="mid"
                  stroke={COLORS.ira}
                  fill={COLORS.ira}
                  fillOpacity={0.3}
                />
                <Radar
                  name={`Year ${chartData[chartData.length - 1]?.year || 'End'}`}
                  dataKey="last"
                  stroke={COLORS.roth}
                  fill={COLORS.roth}
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ChartCard>

            <ChartCard title="Portfolio vs Annual Tax (Scatter)">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Portfolio"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(v) => `$${v.toFixed(1)}M`}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Tax"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(v) => `$${v.toFixed(0)}K`}
                />
                <ZAxis type="number" dataKey="z" range={[50, 200]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => {
                    if (name === 'Portfolio') return [`$${value.toFixed(2)}M`, name];
                    if (name === 'Tax') return [`$${value.toFixed(0)}K`, name];
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => payload[0]?.payload?.name || label}
                />
                <Scatter data={scatterData} fill={COLORS.total}>
                  {scatterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index < scatterData.length / 3 ? COLORS.at : index < (scatterData.length * 2) / 3 ? COLORS.ira : COLORS.roth}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ChartCard>

            <ChartCard title="Year-over-Year Growth Rates (%)" span={2}>
              <BarChart
                data={chartData.slice(1).map((d, i) => ({
                  year: d.year,
                  portfolioGrowth: chartData[i].totalEOY > 0
                    ? ((d.totalEOY - chartData[i].totalEOY) / chartData[i].totalEOY) * 100
                    : 0,
                  heirGrowth: chartData[i].heirValue > 0
                    ? ((d.heirValue - chartData[i].heirValue) / chartData[i].heirValue) * 100
                    : 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value.toFixed(1)}%`, '']}
                />
                <Legend />
                <Bar dataKey="portfolioGrowth" fill={COLORS.total} name="Portfolio Growth" />
                <Bar dataKey="heirGrowth" fill={COLORS.heir} name="Heir Value Growth" />
                <ReferenceLine y={0} stroke="#64748b" />
              </BarChart>
            </ChartCard>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Dashboard toolbar */}
      <div className="h-9 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-3 shrink-0">
        {/* Sub-tabs */}
        <div className="flex items-center gap-1">
          {DASHBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Layout toggle */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Layout:</span>
          <button
            onClick={() => setLayout('grid')}
            className={`p-1 rounded ${
              layout === 'grid' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Grid layout"
          >
            <Grid className="w-3 h-3" />
          </button>
          <button
            onClick={() => setLayout('stack')}
            className={`p-1 rounded ${
              layout === 'stack' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
            title="Stacked layout"
          >
            <Rows className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="flex-1 overflow-auto p-3">{renderTabContent()}</div>
    </div>
  );
}

export default Dashboard;
