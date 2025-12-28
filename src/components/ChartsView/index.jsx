/**
 * ChartsView Component
 * 
 * Visualization panel with selectable charts
 */

import React, { useState } from 'react';
import { Plus, X, LineChart, Layers, BarChart3, Shield, Users, TrendingUp } from 'lucide-react';
import { 
  LineChart as RLineChart, Line, 
  AreaChart, Area,
  BarChart, Bar,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const CHART_CONFIGS = [
  { id: 'balances', name: 'Account Balances', icon: LineChart },
  { id: 'withdrawals', name: 'Withdrawal Sources', icon: Layers },
  { id: 'taxes', name: 'Tax Burden', icon: BarChart3 },
  { id: 'irmaa', name: 'IRMAA Impact', icon: Shield },
  { id: 'heir', name: 'Heir Value', icon: Users },
  { id: 'cashflow', name: 'Cash Flow', icon: TrendingUp },
];

export function ChartsView({ projections }) {
  const [activeCharts, setActiveCharts] = useState(['balances', 'taxes']);
  const [showPicker, setShowPicker] = useState(false);
  
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
  
  const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', fontSize: '11px' };
  
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
                <button onClick={() => setActiveCharts(a => a.filter(c => c !== id))} className="hover:text-red-400">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
        <button onClick={() => setShowPicker(!showPicker)} className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      
      {showPicker && (
        <div className="bg-slate-900 border-b border-slate-800 p-3">
          <div className="grid grid-cols-3 gap-2">
            {CHART_CONFIGS.map(c => (
              <button
                key={c.id}
                onClick={() => { if (!activeCharts.includes(c.id)) setActiveCharts(a => [...a, c.id]); setShowPicker(false); }}
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
                  <Area type="monotone" dataKey="AT" stackId="1" fill="#10b981" stroke="#10b981" name="After-Tax" />
                  <Area type="monotone" dataKey="IRA" stackId="1" fill="#f59e0b" stroke="#f59e0b" name="IRA" />
                  <Area type="monotone" dataKey="Roth" stackId="1" fill="#3b82f6" stroke="#3b82f6" name="Roth" />
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
                  <Line type="monotone" dataKey="Heir" stroke="#10b981" strokeWidth={2} dot={false} name="Heir Value" />
                  <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Portfolio" />
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
                  <Area type="monotone" dataKey="ATW" stackId="1" fill="#10b981" stroke="#10b981" name="After-Tax" />
                  <Area type="monotone" dataKey="IRAW" stackId="1" fill="#f59e0b" stroke="#f59e0b" name="IRA" />
                  <Area type="monotone" dataKey="RothW" stackId="1" fill="#3b82f6" stroke="#3b82f6" name="Roth" />
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
                  <Line type="monotone" dataKey="Exp" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                  <Line type="monotone" dataKey="Tax" stroke="#f97316" strokeWidth={2} name="Taxes" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChartsView;
