/**
 * HeirAnalysis Component
 *
 * Analyzes the after-tax value to heirs:
 * - Strategy comparison (even vs year10 distribution)
 * - Final year heir value vs gross portfolio
 * - Per-heir breakdown with gross vs normalized values
 * - IRA distribution details
 * - Per-heir taxable RoR display
 * - Account-by-account breakdown
 * - Heir value over time chart
 */

import { Info, Users, ArrowRight, TrendingUp } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { fmt$, fmtPct } from '../../lib/formatters';

// Helper function to apply Present Value discount factor
// PV = FV / (1 + r)^n where r = discount rate and n = years from start
const applyPV = (value, yearsFromStart, discountRate, shouldApply) => {
  if (!shouldApply || typeof value !== 'number' || isNaN(value)) return value;
  const pvFactor = Math.pow(1 + discountRate, yearsFromStart);
  return value / pvFactor;
};

export function HeirAnalysis({ projections, params, showPV = true }) {
  const last = projections[projections.length - 1];
  const hasMultiHeir = last.heirDetails && last.heirDetails.length > 0;
  const hasStrategyDetails = last.heirStrategyDetails !== null;

  // Legacy single-heir rate (fallback)
  const legacyHeirTaxRate = (params.heirFedRate || 0.37) + (params.heirStateRate || 0.0495);
  const discountRate = params.discountRate || 0.03;

  // Helper for applying PV to last year values
  const pv = val => applyPV(val, last.yearsFromStart || 0, discountRate, showPV);

  // Chart data with PV applied
  const chartData = useMemo(
    () =>
      projections.map(p => {
        const pvVal = val => applyPV(val, p.yearsFromStart || 0, discountRate, showPV);
        return {
          year: p.year,
          Heir: pvVal(p.heirValue) / 1e6,
          Gross: pvVal(p.heirGross || p.totalEOY) / 1e6,
          Total: pvVal(p.totalEOY) / 1e6,
        };
      }),
    [projections, showPV, discountRate]
  );

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    fontSize: '11px',
  };

  // Calculate total tax impact on IRA across all heirs
  const totalIraTax =
    hasMultiHeir && last.heirDetails[0]?.iraDetails
      ? last.heirDetails.reduce(
          (sum, h) =>
            sum + (h.iraGross - (h.iraDetails?.afterTax || h.iraGross * (1 - h.rates.combined))),
          0
        )
      : hasMultiHeir
        ? last.heirDetails.reduce((sum, h) => sum + (h.taxOnIra || 0), 0)
        : last.iraEOY * legacyHeirTaxRate;

  // Get strategy comparison values (with PV applied)
  const currentStrategy = last.heirStrategyDetails?.strategy || 'even';
  const currentStrategyValue = pv(last.heirNormalized || last.heirValue);
  const alternateStrategy = last.heirStrategyDetails?.alternateStrategy || 'year10';
  const alternateStrategyValue = pv(
    last.heirStrategyDetails?.alternateStrategyValue || last.heirValue
  );
  const evenValue = currentStrategy === 'even' ? currentStrategyValue : alternateStrategyValue;
  const year10Value = currentStrategy === 'year10' ? currentStrategyValue : alternateStrategyValue;
  const evenBetter = evenValue >= year10Value;
  const strategyDifference = Math.abs(evenValue - year10Value);
  const normalizationYears = last.heirStrategyDetails?.normalizationYears || 10;

  return (
    <div className="flex-1 overflow-auto p-4 text-xs">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm font-medium mb-4">Heir Value Analysis</h2>

        {/* Summary cards - with PV applied to monetary values */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-900 rounded border border-slate-800 p-4">
            <div className="text-slate-400 mb-1">Final Year ({last.year})</div>
            <div className="text-2xl font-bold text-emerald-400">
              {fmt$(pv(last.heirNormalized || last.heirValue))}
            </div>
            <div className="text-slate-500 mt-1">Normalized heir value{showPV ? ' (PV)' : ''}</div>
          </div>
          <div className="bg-slate-900 rounded border border-slate-800 p-4">
            <div className="text-slate-400 mb-1">Gross Inheritance</div>
            <div className="text-2xl font-bold text-amber-400">
              {fmt$(pv(last.heirGross || last.totalEOY))}
            </div>
            <div className="text-slate-500 mt-1">Before taxes & growth{showPV ? ' (PV)' : ''}</div>
          </div>
          <div className="bg-slate-900 rounded border border-slate-800 p-4">
            <div className="text-slate-400 mb-1">Portfolio Value</div>
            <div className="text-2xl font-bold text-blue-400">{fmt$(pv(last.totalEOY))}</div>
            <div className="text-slate-500 mt-1">Total account balances{showPV ? ' (PV)' : ''}</div>
          </div>
        </div>

        {/* Strategy Comparison Card */}
        {hasStrategyDetails && (
          <div className="bg-slate-900 rounded border border-slate-800 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <div className="text-slate-300 font-medium">Distribution Strategy Comparison</div>
              <span className="text-slate-500 text-xs ml-auto">
                Normalized over {normalizationYears} years
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Even Strategy */}
              <div
                className={`p-3 rounded border ${
                  currentStrategy === 'even'
                    ? 'border-emerald-500 bg-emerald-900/20'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-200 font-medium">Spread Evenly</span>
                  {currentStrategy === 'even' && (
                    <span className="px-1.5 py-0.5 bg-emerald-600 rounded text-xs text-white">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-emerald-400">{fmt$(evenValue)}</div>
                <div className="text-slate-500 text-xs mt-1">Lower tax bracket impact</div>
              </div>

              {/* Year 10 Strategy */}
              <div
                className={`p-3 rounded border ${
                  currentStrategy === 'year10'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-200 font-medium">Lump Sum Year 10</span>
                  {currentStrategy === 'year10' && (
                    <span className="px-1.5 py-0.5 bg-blue-600 rounded text-xs text-white">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-blue-400">{fmt$(year10Value)}</div>
                <div className="text-slate-500 text-xs mt-1">Maximum growth, higher tax hit</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Difference:{' '}
                <span className={evenBetter ? 'text-emerald-400' : 'text-blue-400'}>
                  {fmt$(strategyDifference)}
                </span>{' '}
                in favor of {evenBetter ? 'even distribution' : 'lump sum'}
              </div>
              <div className="text-xs text-slate-500">
                {fmtPct(strategyDifference / Math.max(evenValue, year10Value))} difference
              </div>
            </div>
          </div>
        )}

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
              <Area
                type="monotone"
                dataKey="Total"
                fill="#3b82f6"
                fillOpacity={0.2}
                stroke="#3b82f6"
                strokeDasharray="3 3"
                name="Portfolio"
              />
              <Area
                type="monotone"
                dataKey="Gross"
                fill="#f59e0b"
                fillOpacity={0.2}
                stroke="#f59e0b"
                name="Gross Inheritance"
              />
              <Line
                type="monotone"
                dataKey="Heir"
                stroke="#10b981"
                strokeWidth={2}
                name="Normalized Heir Value"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Multi-Heir Breakdown with Strategy Details */}
        {hasMultiHeir && (
          <div className="bg-slate-900 rounded border border-slate-800 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-purple-400" />
              <div className="text-slate-300 font-medium">Per-Heir Breakdown ({last.year})</div>
            </div>

            <div className="space-y-3">
              {last.heirDetails.map((heir, idx) => (
                <div key={idx} className="bg-slate-800 rounded p-3">
                  {/* Heir Name and Split */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-medium">{heir.name}</span>
                      <span className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                        {fmtPct(heir.split)} split
                      </span>
                      {heir.taxableRoR !== undefined && (
                        <span className="px-1.5 py-0.5 bg-blue-900/50 rounded text-xs text-blue-300">
                          {fmtPct(heir.taxableRoR)} taxable RoR
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Gross vs Normalized Values */}
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Gross Inheritance</div>
                      <div className="text-lg font-bold text-amber-400">
                        {fmt$(heir.grossInheritance)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        Normalized ({heir.normalizationYears || normalizationYears}yr)
                      </div>
                      <div className="text-lg font-bold text-emerald-400">
                        {fmt$(heir.netNormalized || heir.netValue)}
                      </div>
                    </div>
                  </div>

                  {/* Account Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div className="bg-slate-700/50 rounded p-2">
                      <span className="text-slate-500 block">AT: </span>
                      <span className="text-slate-300">
                        {fmt$(heir.atNormalized || heir.atValue || 0)}
                      </span>
                    </div>
                    <div className="bg-slate-700/50 rounded p-2">
                      <span className="text-slate-500 block">Roth: </span>
                      <span className="text-slate-300">
                        {fmt$(heir.rothNormalized || heir.rothGross || 0)}
                      </span>
                    </div>
                    <div className="bg-slate-700/50 rounded p-2">
                      <span className="text-slate-500 block">IRA: </span>
                      <span className="text-slate-300">{fmt$(heir.iraNormalized || 0)}</span>
                    </div>
                  </div>

                  {/* Tax Rate Info */}
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-slate-500">Fed Rate: </span>
                      <span className="text-amber-400">{fmtPct(heir.rates.federal)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">State Rate: </span>
                      <span className="text-blue-400">{fmtPct(heir.rates.state)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Combined: </span>
                      <span className="text-rose-400">{fmtPct(heir.rates.combined)}</span>
                    </div>
                  </div>

                  {/* IRA Distribution Details */}
                  {heir.iraDetails && (
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-400">
                          IRA Distribution (
                          {heir.iraDetails.strategy === 'even'
                            ? '10-year spread'
                            : 'Year 10 lump sum'}
                          )
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block">Gross IRA</span>
                          <span className="text-slate-300">{fmt$(heir.iraGross)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Tax Rate</span>
                          <span className="text-rose-400">
                            {fmtPct(heir.iraDetails.taxRate || heir.rates.combined)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Taxable RoR</span>
                          <span className="text-blue-400">
                            {fmtPct(heir.iraDetails.taxableRoR || heir.taxableRoR)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Net Normalized</span>
                          <span className="text-emerald-400">{fmt$(heir.iraNormalized)}</span>
                        </div>
                      </div>

                      {/* Show distribution schedule for even strategy */}
                      {heir.iraDetails.strategy === 'even' && heir.iraDetails.distributions && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                            View 10-year distribution schedule
                          </summary>
                          <div className="mt-2 bg-slate-900 rounded p-2 text-xs">
                            <div className="grid grid-cols-5 gap-1 text-slate-500 mb-1 pb-1 border-b border-slate-700">
                              <span>Year</span>
                              <span>Dist.</span>
                              <span>Tax</span>
                              <span>After-Tax</span>
                              <span>Norm.</span>
                            </div>
                            {heir.iraDetails.distributions.map((d, i) => (
                              <div key={i} className="grid grid-cols-5 gap-1 text-slate-400">
                                <span>Yr {d.year}</span>
                                <span>{fmt$(d.distribution)}</span>
                                <span className="text-rose-400">{fmt$(d.tax)}</span>
                                <span>{fmt$(d.afterTax)}</span>
                                <span className="text-emerald-400">{fmt$(d.normalized)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Show lump sum details for year10 strategy */}
                      {heir.iraDetails.strategy === 'year10' && (
                        <div className="mt-2 text-xs text-slate-500">
                          Future Value at Year 10: {fmt$(heir.iraDetails.futureValue)} → After Tax:{' '}
                          {fmt$(heir.iraDetails.afterTax)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Gross:</span>
                <span className="text-amber-400 font-bold">{fmt$(last.heirGross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Normalized:</span>
                <span className="text-emerald-400 font-bold">
                  {fmt$(last.heirNormalized || last.heirValue)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Account Breakdown */}
        <div className="bg-slate-900 rounded border border-slate-800 p-4 mb-4">
          <div className="text-slate-300 font-medium mb-3">Account Breakdown ({last.year})</div>

          <div className="grid grid-cols-3 gap-4 text-center">
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
              <div className="text-slate-500 text-xs">
                {hasMultiHeir
                  ? '10-year rule applies'
                  : `${fmtPct(1 - legacyHeirTaxRate)} to heirs`}
              </div>
            </div>
          </div>

          {!hasMultiHeir && (
            <div className="mt-4 font-mono text-sm space-y-2">
              <div className="text-slate-400">
                Heir Value = IRA × (1 - {fmtPct(legacyHeirTaxRate)}) + Roth + AT
              </div>
              <div className="text-slate-300">
                = {fmt$(last.iraEOY)} × {fmtPct(1 - legacyHeirTaxRate)} + {fmt$(last.rothEOY)} +{' '}
                {fmt$(last.atEOY)}
              </div>
              <div className="text-emerald-400 font-bold">= {fmt$(last.heirValue)}</div>
            </div>
          )}
        </div>

        {/* Insight box */}
        <div className="bg-amber-900/20 border border-amber-700/50 rounded p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-amber-300 font-medium mb-1">Key Insights</div>
              <div className="text-slate-300 space-y-2">
                <p>
                  Your Roth accounts ({fmt$(last.rothEOY)}) represent {fmtPct(last.rothPercent)} of
                  your portfolio and will pass completely tax-free to heirs under the 10-year rule.
                </p>

                {hasStrategyDetails && (
                  <p>
                    <span className="text-amber-200">Strategy Impact:</span>{' '}
                    {evenBetter ? 'Spreading' : 'Deferring'} IRA distributions saves approximately{' '}
                    {fmt$(strategyDifference)} in normalized value due to
                    {evenBetter
                      ? ' lower marginal tax rates from spreading'
                      : ' additional tax-deferred growth'}
                    .
                  </p>
                )}

                {hasMultiHeir && last.heirDetails.length >= 2 && (
                  <p className="text-amber-200">
                    Heir Comparison: {last.heirDetails[0].name} receives{' '}
                    {fmt$(last.heirDetails[0].netNormalized || last.heirDetails[0].netValue)}{' '}
                    normalized vs {last.heirDetails[1].name}'s{' '}
                    {fmt$(last.heirDetails[1].netNormalized || last.heirDetails[1].netValue)}
                    {last.heirDetails[0].taxableRoR !== last.heirDetails[1].taxableRoR && (
                      <span> (different taxable RoR assumptions)</span>
                    )}
                    .
                  </p>
                )}

                <p className="text-slate-400 text-xs mt-2">
                  Note: Normalized values account for taxes, distribution timing, and each heir's
                  taxable reinvestment rate over a {normalizationYears}-year horizon, discounted to
                  present value for fair comparison.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeirAnalysis;
