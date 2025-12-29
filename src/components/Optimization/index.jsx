/**
 * Optimization Component
 *
 * Provides optimization tools for retirement planning:
 * - Optimal Roth conversion finder (maximize heir value, minimize taxes, etc.)
 * - Withdrawal strategy optimization
 * - Risk allocation recommendations
 */

import {
  Zap,
  Play,
  Loader2,
  CheckCircle2,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  BarChart2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { generateProjections, calculateSummary } from '../../lib';
import { fmt$, fmtPct } from '../../lib/formatters';

// Optimization objectives
const OBJECTIVES = [
  {
    id: 'maxHeir',
    name: 'Maximize Heir Value',
    description: 'Find conversions that maximize after-tax value to heirs',
    icon: Users,
    metric: 'endingHeirValue',
    better: 'higher',
  },
  {
    id: 'minTax',
    name: 'Minimize Lifetime Tax',
    description: 'Find conversions that minimize total tax paid',
    icon: DollarSign,
    metric: 'totalTaxPaid',
    better: 'lower',
  },
  {
    id: 'maxPortfolio',
    name: 'Maximize Portfolio',
    description: 'Find conversions that maximize ending portfolio value',
    icon: TrendingUp,
    metric: 'endingPortfolio',
    better: 'higher',
  },
  {
    id: 'balanceRoth',
    name: 'Balance Roth Ratio',
    description: 'Target a specific Roth percentage (e.g., 50%)',
    icon: BarChart2,
    metric: 'finalRothPercent',
    better: 'target',
    target: 0.5,
  },
];

// Generate Roth conversion scenarios to test
function generateConversionScenarios(baseParams, years, amounts) {
  const scenarios = [];

  // No conversions
  scenarios.push({ conversions: {}, label: 'No Conversions' });

  // Single year conversions
  years.forEach(year => {
    amounts.forEach(amount => {
      scenarios.push({
        conversions: { [year]: amount },
        label: `${year}: $${(amount / 1000).toFixed(0)}K`,
      });
    });
  });

  // Multi-year even distribution
  amounts.forEach(amount => {
    const conversions = {};
    years.forEach(year => {
      conversions[year] = amount;
    });
    scenarios.push({
      conversions,
      label: `All Years: $${(amount / 1000).toFixed(0)}K/yr`,
    });
  });

  // Graduated strategies (high to low)
  const totalAmounts = [1500000, 2000000, 2500000, 3000000];
  totalAmounts.forEach(total => {
    const perYear = total / years.length;
    const conversions = {};
    years.forEach((year, idx) => {
      // Front-loaded
      const multiplier = 1 + (years.length - idx - 1) * 0.2;
      conversions[year] = Math.round(perYear * multiplier);
    });
    scenarios.push({
      conversions,
      label: `Front-loaded: $${(total / 1e6).toFixed(1)}M total`,
    });
  });

  return scenarios;
}

export function Optimization({ params, summary, updateParams }) {
  const [selectedObjective, setSelectedObjective] = useState('maxHeir');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [conversionYears, setConversionYears] = useState([2026, 2027, 2028, 2029, 2030]);
  const [targetRoth, setTargetRoth] = useState(0.5);

  const objective = OBJECTIVES.find(o => o.id === selectedObjective);

  const runOptimization = useCallback(() => {
    // Test amounts
    const testAmounts = [0, 200000, 400000, 600000, 800000, 1000000, 1200000];
    setIsRunning(true);
    setResults(null);

    // Run asynchronously to not block UI
    setTimeout(() => {
      const scenarios = generateConversionScenarios(params, conversionYears, testAmounts);
      const evaluated = scenarios.map(scenario => {
        const testParams = { ...params, rothConversions: scenario.conversions };
        const proj = generateProjections(testParams);
        const sum = calculateSummary(proj);

        // Calculate actual conversion label for infeasible strategies
        const actualLabel = sum.isFullyFeasible
          ? scenario.label
          : `${scenario.label} → Actual: ${fmt$(sum.totalConversionActual)}`;

        return {
          ...scenario,
          projections: proj,
          summary: sum,
          score: sum[objective.metric],
          // Feasibility tracking
          actualLabel,
          isFullyFeasible: sum.isFullyFeasible,
          feasibilityPercent: sum.conversionFeasibilityPercent,
          firstCappedYear: sum.firstConversionCappedYear,
          totalRequested: sum.totalConversionRequested,
          totalActual: sum.totalConversionActual,
        };
      });

      // Sort by objective
      evaluated.sort((a, b) => {
        if (objective.better === 'higher') return b.score - a.score;
        if (objective.better === 'lower') return a.score - b.score;
        if (objective.better === 'target') {
          return Math.abs(a.score - targetRoth) - Math.abs(b.score - targetRoth);
        }
        return 0;
      });

      setResults({
        objective,
        scenarios: evaluated,
        best: evaluated[0],
        worst: evaluated[evaluated.length - 1],
        current: {
          summary,
          score: summary[objective.metric],
          conversions: params.rothConversions,
        },
      });
      setIsRunning(false);
    }, 100);
  }, [params, summary, objective, conversionYears, targetRoth]);

  const applyOptimal = useCallback(() => {
    if (results?.best) {
      updateParams({ rothConversions: results.best.conversions });
    }
  }, [results, updateParams]);

  // Chart data for top scenarios
  const chartData = useMemo(() => {
    if (!results) return [];
    return results.scenarios.slice(0, 10).map((s, i) => ({
      name: s.label.length > 20 ? s.label.substring(0, 20) + '...' : s.label,
      fullName: s.label,
      value: objective.metric.includes('Percent') ? s.score * 100 : s.score / 1e6,
      isBest: i === 0,
    }));
  }, [results, objective]);

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    fontSize: '11px',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-slate-200 font-medium">Optimization</span>
        </div>
        <button
          onClick={runOptimization}
          disabled={isRunning}
          className={`px-3 py-1.5 rounded flex items-center gap-2 ${
            isRunning ? 'bg-slate-700 text-slate-400' : 'bg-amber-600 text-white hover:bg-amber-500'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Run Optimization
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Objective Selection */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="text-slate-200 font-medium mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              Optimization Objective
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {OBJECTIVES.map(obj => (
                <button
                  key={obj.id}
                  onClick={() => setSelectedObjective(obj.id)}
                  className={`p-3 rounded border text-left transition-colors ${
                    selectedObjective === obj.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <obj.icon
                    className={`w-4 h-4 mb-1 ${
                      selectedObjective === obj.id ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <div
                    className={selectedObjective === obj.id ? 'text-amber-200' : 'text-slate-200'}
                  >
                    {obj.name}
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">{obj.description}</div>
                </button>
              ))}
            </div>

            {selectedObjective === 'balanceRoth' && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-slate-400">Target Roth %:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={targetRoth * 100}
                  onChange={e => setTargetRoth(e.target.value / 100)}
                  className="flex-1"
                />
                <span className="text-amber-400 font-medium w-12">{fmtPct(targetRoth)}</span>
              </div>
            )}
          </div>

          {/* Conversion Years Selection */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="text-slate-200 font-medium mb-3">Conversion Years to Test</div>
            <div className="flex flex-wrap gap-2">
              {[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map(year => (
                <button
                  key={year}
                  onClick={() => {
                    setConversionYears(prev =>
                      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort()
                    );
                  }}
                  className={`px-2 py-1 rounded border ${
                    conversionYears.includes(year)
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="text-slate-200 font-medium mb-3">Current Configuration</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-slate-400 mb-1">Ending Portfolio</div>
                <div className="text-lg font-bold text-emerald-400">
                  {fmt$(summary.endingPortfolio)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">Heir Value</div>
                <div className="text-lg font-bold text-blue-400">
                  {fmt$(summary.endingHeirValue)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">Total Tax</div>
                <div className="text-lg font-bold text-rose-400">{fmt$(summary.totalTaxPaid)}</div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">Final Roth %</div>
                <div className="text-lg font-bold text-purple-400">
                  {fmtPct(summary.finalRothPercent)}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="text-slate-400 mb-1">Current Conversions:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(params.rothConversions || {}).map(([year, amount]) => (
                  <span key={year} className="px-2 py-1 bg-slate-800 rounded text-slate-300">
                    {year}: {fmt$(amount)}
                  </span>
                ))}
                {Object.keys(params.rothConversions || {}).length === 0 && (
                  <span className="text-slate-500">None configured</span>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          {results && (
            <>
              {/* Best Result */}
              <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">Optimal Strategy Found</span>
                  </div>
                  <button
                    onClick={applyOptimal}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Apply This Strategy
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div>
                    <div className="text-slate-400 text-xs mb-1">Strategy</div>
                    <div className="text-emerald-200 font-medium">{results.best.label}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs mb-1">Ending Portfolio</div>
                    <div className="text-slate-200">
                      {fmt$(results.best.summary.endingPortfolio)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs mb-1">Heir Value</div>
                    <div className="text-slate-200">
                      {fmt$(results.best.summary.endingHeirValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs mb-1">Total Tax</div>
                    <div className="text-slate-200">{fmt$(results.best.summary.totalTaxPaid)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs mb-1">Improvement</div>
                    <div className="text-emerald-400 font-medium">
                      {objective.better === 'higher'
                        ? `+${fmt$(results.best.score - results.current.score)}`
                        : objective.better === 'lower'
                          ? `-${fmt$(results.current.score - results.best.score)}`
                          : `${fmtPct(Math.abs(results.best.score - targetRoth))} from target`}
                    </div>
                  </div>
                </div>

                {/* Feasibility warning for capped strategies */}
                {!results.best.isFullyFeasible && (
                  <div className="mt-3 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded text-amber-300 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <div>
                        <span className="font-medium">Strategy capped by IRA balance: </span>
                        Requested {fmt$(results.best.totalRequested)}, actual{' '}
                        {fmt$(results.best.totalActual)} ({fmtPct(results.best.feasibilityPercent)}{' '}
                        feasible)
                        {results.best.firstCappedYear &&
                          ` - IRA depleted starting ${results.best.firstCappedYear}`}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-emerald-700/30">
                  <div className="text-slate-400 text-xs mb-2">Recommended Conversions:</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(results.best.conversions || {}).map(([year, amount]) => (
                      <span
                        key={year}
                        className="px-2 py-1 bg-emerald-800/30 rounded text-emerald-200"
                      >
                        {year}: {fmt$(amount)}
                      </span>
                    ))}
                    {Object.keys(results.best.conversions || {}).length === 0 && (
                      <span className="text-slate-400">No conversions (keep IRA)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Results Chart */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <div className="text-slate-200 font-medium mb-3">
                  Top 10 Strategies by {objective.name}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#64748b"
                      fontSize={10}
                      width={150}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name, props) => [
                        objective.metric.includes('Percent')
                          ? `${value.toFixed(1)}%`
                          : `$${value.toFixed(2)}M`,
                        props.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Results Table */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                <div className="p-3 border-b border-slate-700">
                  <div className="text-slate-200 font-medium">All Tested Strategies</div>
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr className="text-left">
                        <th className="py-2 px-3 text-slate-400 font-normal">Rank</th>
                        <th className="py-2 px-3 text-slate-400 font-normal">Strategy</th>
                        <th className="py-2 px-3 text-slate-400 font-normal text-center">
                          Feasible
                        </th>
                        <th className="py-2 px-3 text-slate-400 font-normal text-right">
                          End Portfolio
                        </th>
                        <th className="py-2 px-3 text-slate-400 font-normal text-right">
                          Heir Value
                        </th>
                        <th className="py-2 px-3 text-slate-400 font-normal text-right">
                          Total Tax
                        </th>
                        <th className="py-2 px-3 text-slate-400 font-normal text-right">Roth %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.scenarios.slice(0, 20).map((s, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-slate-800 ${idx === 0 ? 'bg-emerald-900/20' : 'hover:bg-slate-800/50'}`}
                        >
                          <td className="py-2 px-3">
                            {idx === 0 ? (
                              <span className="text-emerald-400 font-medium">Best</span>
                            ) : (
                              <span className="text-slate-500">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-300">
                            {s.isFullyFeasible ? (
                              s.label
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="text-amber-400">⚠</span>
                                <span className="text-amber-200">{s.actualLabel}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {s.isFullyFeasible ? (
                              <span className="text-emerald-400">✓</span>
                            ) : (
                              <span
                                className="text-amber-400"
                                title={`${fmtPct(s.feasibilityPercent)} feasible - IRA capped${s.firstCappedYear ? ` starting ${s.firstCappedYear}` : ''}`}
                              >
                                {fmtPct(s.feasibilityPercent)}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-200">
                            {fmt$(s.summary.endingPortfolio)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-200">
                            {fmt$(s.summary.endingHeirValue)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-200">
                            {fmt$(s.summary.totalTaxPaid)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-200">
                            {fmtPct(s.summary.finalRothPercent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Insights */}
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-amber-300 font-medium mb-1">Optimization Insights</div>
                    <ul className="text-slate-300 space-y-1 list-disc list-inside">
                      <li>Tested {results.scenarios.length} different conversion strategies</li>
                      <li>
                        Best strategy improves {objective.name.toLowerCase()} by{' '}
                        {objective.better === 'higher'
                          ? fmt$(results.best.score - results.current.score)
                          : objective.better === 'lower'
                            ? fmt$(results.current.score - results.best.score)
                            : fmtPct(Math.abs(results.best.score - targetRoth))}
                      </li>
                      <li>
                        Range of outcomes: {fmt$(results.worst.summary.endingHeirValue)} to{' '}
                        {fmt$(results.best.summary.endingHeirValue)} heir value
                      </li>
                      {results.best.summary.shortfallYears?.length > 0 && (
                        <li className="text-amber-400">
                          Warning: Optimal strategy has shortfall in{' '}
                          {results.best.summary.shortfallYears.length} years
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Optimization;
