/**
 * RiskAllocation Component
 * 
 * Visualizes the risk-based allocation strategy:
 * - Risk band policy display
 * - Portfolio-level allocation bars
 * - Per-account allocation breakdown
 * - Effective returns by account
 * - Year selector to see allocation changes over time
 */

import React from 'react';
import { fmt$, fmtPct } from '../../lib/formatters';
import { calculateRiskAllocation } from '../../lib/calculations';

function RiskBar({ balance, allocation }) {
  if (balance === 0) {
    return <div className="h-full bg-slate-800 rounded flex items-center justify-center text-slate-600">$0</div>;
  }
  
  const lowPct = (allocation.low / balance) * 100;
  const modPct = (allocation.mod / balance) * 100;
  const highPct = (allocation.high / balance) * 100;
  
  return (
    <div className="h-full bg-slate-800 rounded overflow-hidden flex flex-col">
      {allocation.low > 0 && (
        <div 
          className="bg-emerald-500/60 flex items-center justify-center px-1" 
          style={{ height: `${Math.max(lowPct, 15)}%` }}
        >
          <span className="text-emerald-100 text-xs">{fmt$(allocation.low)}</span>
        </div>
      )}
      {allocation.mod > 0 && (
        <div 
          className="bg-amber-500/60 flex items-center justify-center px-1" 
          style={{ height: `${Math.max(modPct, 15)}%` }}
        >
          <span className="text-amber-100 text-xs">{fmt$(allocation.mod)}</span>
        </div>
      )}
      {allocation.high > 0 && (
        <div 
          className="bg-rose-500/60 flex items-center justify-center px-1 flex-1" 
          style={{ minHeight: `${Math.max(highPct, 15)}%` }}
        >
          <span className="text-rose-100 text-xs">{fmt$(allocation.high)}</span>
        </div>
      )}
    </div>
  );
}

export function RiskAllocation({ projections, params, selectedYear, onYearChange }) {
  const yearData = projections.find(p => p.year === selectedYear);
  if (!yearData) return null;
  
  const allocation = yearData.riskAllocation || calculateRiskAllocation(
    yearData.totalBOY, yearData.atBOY, yearData.iraBOY, yearData.rothBOY,
    params.lowRiskTarget, params.modRiskTarget
  );
  
  const blendedReturn = yearData.totalBOY > 0
    ? (allocation.portfolio.low * params.lowRiskReturn + 
       allocation.portfolio.mod * params.modRiskReturn + 
       allocation.portfolio.high * params.highRiskReturn) / yearData.totalBOY
    : 0;
  
  return (
    <div className="flex-1 overflow-auto p-4 text-xs">
      <div className="max-w-4xl mx-auto">
        {/* Header with year selector */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Risk Allocation Visualization</h2>
          <select 
            value={selectedYear} 
            onChange={(e) => onYearChange(+e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1"
          >
            {projections.map(p => (
              <option key={p.year} value={p.year}>{p.year} (Age {p.age})</option>
            ))}
          </select>
        </div>
        
        {/* Risk band policy */}
        <div className="bg-blue-900/20 border border-blue-800/50 rounded p-3 mb-4">
          <div className="text-blue-300 font-medium mb-2">Risk Band Policy</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500/60" />
              <span>$0 - {fmt$(params.lowRiskTarget)} @ {fmtPct(params.lowRiskReturn)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500/60" />
              <span>{fmt$(params.lowRiskTarget)} - {fmt$(params.lowRiskTarget + params.modRiskTarget)} @ {fmtPct(params.modRiskReturn)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-rose-500/60" />
              <span>{fmt$(params.lowRiskTarget + params.modRiskTarget)}+ @ {fmtPct(params.highRiskReturn)}</span>
            </div>
          </div>
        </div>
        
        {/* Portfolio summary */}
        <div className="bg-slate-900 rounded border border-slate-800 p-3 mb-4">
          <div className="text-slate-300 font-medium mb-2">Portfolio Allocation ({selectedYear})</div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-400">{fmt$(allocation.portfolio.low)}</div>
              <div className="text-slate-400">Low Risk</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">{fmt$(allocation.portfolio.mod)}</div>
              <div className="text-slate-400">Moderate</div>
            </div>
            <div>
              <div className="text-lg font-bold text-rose-400">{fmt$(allocation.portfolio.high)}</div>
              <div className="text-slate-400">High Risk</div>
            </div>
            <div className="border-l border-slate-700 pl-3">
              <div className="text-lg font-bold">{fmt$(yearData.totalBOY)}</div>
              <div className="text-slate-400">Total</div>
              <div className="text-slate-500">{fmtPct(blendedReturn)} blended</div>
            </div>
          </div>
        </div>
        
        {/* Per-account breakdown */}
        <div className="bg-slate-900 rounded border border-slate-800 p-4 mb-4">
          <div className="text-slate-300 font-medium mb-3">Allocation by Account</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-slate-400 mb-2 flex justify-between">
                <span>After-Tax</span>
                <span className="text-slate-500">{fmt$(yearData.atBOY)}</span>
              </div>
              <div className="h-32">
                <RiskBar balance={yearData.atBOY} allocation={allocation.at} />
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-2 flex justify-between">
                <span>Traditional IRA</span>
                <span className="text-slate-500">{fmt$(yearData.iraBOY)}</span>
              </div>
              <div className="h-32">
                <RiskBar balance={yearData.iraBOY} allocation={allocation.ira} />
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-2 flex justify-between">
                <span>Roth IRA</span>
                <span className="text-slate-500">{fmt$(yearData.rothBOY)}</span>
              </div>
              <div className="h-32">
                <RiskBar balance={yearData.rothBOY} allocation={allocation.roth} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Effective returns */}
        <div className="bg-slate-900 rounded border border-slate-800 p-4">
          <div className="text-slate-300 font-medium mb-3">Effective Returns</div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-emerald-400">{fmtPct(yearData.effectiveAtReturn)}</div>
              <div className="text-slate-400">After-Tax</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-400">{fmtPct(yearData.effectiveIraReturn)}</div>
              <div className="text-slate-400">IRA</div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-400">{fmtPct(yearData.effectiveRothReturn)}</div>
              <div className="text-slate-400">Roth</div>
            </div>
            <div className="border-l border-slate-700 pl-4">
              <div className="text-xl font-bold">{fmtPct(blendedReturn)}</div>
              <div className="text-slate-400">Portfolio</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskAllocation;
