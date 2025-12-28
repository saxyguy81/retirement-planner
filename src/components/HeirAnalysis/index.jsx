/**
 * HeirAnalysis Component
 * 
 * Analyzes the after-tax value to heirs:
 * - Final year heir value vs gross portfolio
 * - Account-by-account breakdown
 * - Tax impact calculation
 * - Heir value over time chart
 * - Roth conversion strategy impact
 */

import React from 'react';
import { Info } from 'lucide-react';
import { fmt$, fmtPct } from '../../lib/formatters';
import { 
  LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export function HeirAnalysis({ projections, params }) {
  const last = projections[projections.length - 1];
  const heirTaxRate = params.heirFedRate + params.heirStateRate;
  
  const chartData = projections.map(p => ({
    year: p.year,
    Heir: p.heirValue / 1e6,
    Total: p.totalEOY / 1e6,
  }));
  
  const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', fontSize: '11px' };
  
  return (
    <div className="flex-1 overflow-auto p-4 text-xs">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm font-medium mb-4">Heir Value Analysis</h2>
        
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900 rounded border border-slate-800 p-4">
            <div className="text-slate-400 mb-1">Final Year ({last.year})</div>
            <div className="text-2xl font-bold text-emerald-400">{fmt$(last.heirValue)}</div>
            <div className="text-slate-500 mt-1">After-tax value to heirs</div>
          </div>
          <div className="bg-slate-900 rounded border border-slate-800 p-4">
            <div className="text-slate-400 mb-1">Gross Portfolio</div>
            <div className="text-2xl font-bold text-blue-400">{fmt$(last.totalEOY)}</div>
            <div className="text-slate-500 mt-1">Pre-tax portfolio value</div>
          </div>
        </div>
        
        {/* Chart */}
        <div className="bg-slate-900 rounded border border-slate-800 p-4 mb-4">
          <div className="text-slate-300 font-medium mb-3">Heir Value Over Time ($M)</div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="Total" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" name="Portfolio" />
              <Line type="monotone" dataKey="Heir" stroke="#10b981" strokeWidth={2} name="Heir Value" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Breakdown */}
        <div className="bg-slate-900 rounded border border-slate-800 p-4 mb-4">
          <div className="text-slate-300 font-medium mb-3">Breakdown ({last.year})</div>
          <div className="font-mono text-sm space-y-2">
            <div className="text-slate-400">
              Heir Value = IRA × (1 - {fmtPct(heirTaxRate)}) + Roth + AT
            </div>
            <div className="text-slate-300">
              = {fmt$(last.iraEOY)} × {fmtPct(1 - heirTaxRate)} + {fmt$(last.rothEOY)} + {fmt$(last.atEOY)}
            </div>
            <div className="text-emerald-400 font-bold">
              = {fmt$(last.heirValue)}
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-800 rounded p-3">
              <div className="text-lg font-bold text-emerald-400">{fmt$(last.atEOY)}</div>
              <div className="text-slate-400">After-Tax</div>
              <div className="text-slate-500 text-xs">100% to heirs (step-up)</div>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <div className="text-lg font-bold text-blue-400">{fmt$(last.rothEOY)}</div>
              <div className="text-slate-400">Roth</div>
              <div className="text-slate-500 text-xs">100% to heirs (tax-free)</div>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <div className="text-lg font-bold text-amber-400">{fmt$(last.iraEOY)}</div>
              <div className="text-slate-400">IRA</div>
              <div className="text-slate-500 text-xs">{fmtPct(1 - heirTaxRate)} to heirs</div>
            </div>
          </div>
        </div>
        
        {/* Insight box */}
        <div className="bg-amber-900/20 border border-amber-700/50 rounded p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-amber-300 font-medium mb-1">Key Insight</div>
              <div className="text-slate-300">
                Your Roth accounts ({fmt$(last.rothEOY)}) represent {fmtPct(last.rothPercent)} of your portfolio 
                and will pass completely tax-free to heirs. The IRA ({fmt$(last.iraEOY)}) will be taxed 
                at {fmtPct(heirTaxRate)}, reducing its value to heirs by {fmt$(last.iraEOY * heirTaxRate)}.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeirAnalysis;
