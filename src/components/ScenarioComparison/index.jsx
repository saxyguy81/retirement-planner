/**
 * ScenarioComparison Component
 *
 * Allows users to create, compare, and analyze multiple retirement scenarios:
 * - Base scenario with current parameters
 * - Configurable alternative scenarios (with custom naming)
 * - Side-by-side comparison metrics
 * - Visual comparison charts
 * - Save/load scenarios to localStorage
 * - Duplicate existing scenarios
 */

import {
  Plus,
  Trash2,
  Copy,
  GitCompare,
  Save,
  FolderOpen,
  Download,
  Upload,
  Edit3,
  Check,
  X,
  AlertTriangle,
  LayoutList,
  Columns,
  GitMerge,
  ChevronDown,
} from 'lucide-react';
import { useState, useMemo, useCallback, Fragment, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { ScenarioNameModal } from './ScenarioNameModal';
import { generateProjections, calculateSummary } from '../../lib';
import { fmt$, fmtPct } from '../../lib/formatters';

// LocalStorage key for saved scenarios
const STORAGE_KEY = 'retirement-planner-scenarios';

// Preset scenario templates
const SCENARIO_PRESETS = [
  {
    name: 'Conservative Returns',
    description: 'Lower investment returns',
    overrides: { lowRiskReturn: 0.03, modRiskReturn: 0.045, highRiskReturn: 0.06 },
  },
  {
    name: 'Aggressive Returns',
    description: 'Higher investment returns',
    overrides: { lowRiskReturn: 0.05, modRiskReturn: 0.075, highRiskReturn: 0.1 },
  },
  {
    name: 'No Roth Conversions',
    description: 'Skip all Roth conversions',
    overrides: { rothConversions: {} },
  },
  {
    name: 'High Roth Conversions',
    description: '$1M conversions in 2026-2028',
    overrides: { rothConversions: { 2026: 1000000, 2027: 1000000, 2028: 1000000 } },
  },
  {
    name: 'Lower Expenses',
    description: '20% reduction in spending',
    overrides: { annualExpenses: 144000 },
  },
  {
    name: 'Higher Expenses',
    description: '20% increase in spending',
    overrides: { annualExpenses: 216000 },
  },
  {
    name: 'Survivor at 2035',
    description: 'Single survivor after 2035',
    overrides: { survivorDeathYear: 2035 },
  },
  {
    name: 'High Inflation',
    description: '4% expense growth',
    overrides: { expenseInflation: 0.04 },
  },
];

// Colors for scenarios
const SCENARIO_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// View modes for enhanced comparison
const VIEW_MODES = [
  { id: 'summary', label: 'Summary', icon: LayoutList },
  { id: 'detailed', label: 'Detailed', icon: Columns },
  { id: 'diff', label: 'Diff', icon: GitMerge },
];

// Helper function to apply Present Value discount factor
// PV = FV / (1 + r)^n where r = discount rate and n = years from start
const applyPV = (value, yearsFromStart, discountRate, shouldApply) => {
  if (!shouldApply || typeof value !== 'number' || isNaN(value)) return value;
  const pvFactor = Math.pow(1 + discountRate, yearsFromStart);
  return value / pvFactor;
};

/**
 * MiniProjectionsTable - Compact projection table for side-by-side comparison
 * Now applies PV dynamically to all monetary values
 */
function MiniProjectionsTable({ projections, label, color, showPV, discountRate = 0.03 }) {
  // Get subset of years for display
  const displayYears = useMemo(() => {
    if (!projections || projections.length === 0) return [];
    const years = projections.map(p => p.year);
    const result = [years[0], years[1], years[2]];
    for (let i = 5; i < years.length; i += 5) {
      if (!result.includes(years[i])) result.push(years[i]);
    }
    if (!result.includes(years[years.length - 1])) {
      result.push(years[years.length - 1]);
    }
    return result;
  }, [projections]);

  const displayData = useMemo(() => {
    return projections.filter(p => displayYears.includes(p.year));
  }, [projections, displayYears]);

  // Metrics to display (all use base keys - PV applied dynamically)
  const metrics = [
    { key: 'totalEOY', label: 'Total', format: '$', highlight: true },
    { key: 'heirValue', label: 'Heir', format: '$' },
    { key: 'totalTax', label: 'Tax', format: '$' },
    { key: 'rothPercent', label: 'Roth%', format: '%' },
  ];

  const formatValue = (value, format, yearsFromStart) => {
    if (value == null || isNaN(value)) return '-';
    // Apply PV for monetary values
    const displayVal =
      format === '$' ? applyPV(value, yearsFromStart, discountRate, showPV) : value;
    return format === '%' ? fmtPct(displayVal) : fmt$(displayVal);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-slate-950">
          <tr>
            <th className="text-left py-1.5 px-2 font-medium" style={{ color }}>
              {label}
            </th>
            {displayData.map(d => (
              <th key={d.year} className="text-right py-1.5 px-2 font-normal text-slate-400">
                {d.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => (
            <tr key={metric.key} className="border-t border-slate-800">
              <td
                className={`py-1 px-2 ${metric.highlight ? 'text-slate-200 font-medium' : 'text-slate-400'}`}
              >
                {metric.label}
              </td>
              {displayData.map(d => (
                <td
                  key={d.year}
                  className={`text-right py-1 px-2 tabular-nums ${metric.highlight ? 'text-slate-200' : 'text-slate-300'}`}
                >
                  {formatValue(d[metric.key], metric.format, d.yearsFromStart || 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * DiffTable - Shows differences between base and scenario with color coding
 *
 * Features:
 * - Year-by-year comparison of key metrics
 * - Absolute difference AND percentage change
 * - Color coding: emerald (better), rose (worse), gray (insignificant < 1%)
 * - Dynamic PV application to all monetary values
 */
function DiffTable({
  baseProjections,
  scenarioProjections,
  scenarioName,
  scenarioColor,
  showPV,
  discountRate = 0.03,
  baseName = 'Base Case',
}) {
  // Threshold for considering a change "insignificant" (1%)
  const INSIGNIFICANT_THRESHOLD = 0.01;

  const displayYears = useMemo(() => {
    if (!baseProjections || baseProjections.length === 0) return [];
    const years = baseProjections.map(p => p.year);
    const result = [years[0], years[1], years[2]];
    for (let i = 5; i < years.length; i += 5) {
      if (!result.includes(years[i])) result.push(years[i]);
    }
    if (!result.includes(years[years.length - 1])) {
      result.push(years[years.length - 1]);
    }
    return result;
  }, [baseProjections]);

  // Metrics to display (all use base keys - PV applied dynamically)
  const metrics = [
    { key: 'totalEOY', label: 'Total Portfolio', format: '$', higherIsBetter: true },
    { key: 'heirValue', label: 'Heir Value', format: '$', higherIsBetter: true },
    { key: 'totalTax', label: 'Annual Tax', format: '$', higherIsBetter: false },
    { key: 'rothPercent', label: 'Roth %', format: '%', higherIsBetter: true },
  ];

  // Helper to get value with PV applied for monetary values
  const getValue = (data, key, format) => {
    const rawVal = data[key];
    if (format === '$') {
      return applyPV(rawVal, data.yearsFromStart || 0, discountRate, showPV);
    }
    return rawVal;
  };

  /**
   * Format difference with absolute value and percentage change
   * Returns: { absValue, pctValue, isBetter, isInsignificant }
   */
  const formatDiff = (baseVal, scenarioVal, format, higherIsBetter) => {
    const diff = scenarioVal - baseVal;

    // Handle zero or invalid values
    if (diff == null || isNaN(diff)) {
      return { absValue: '-', pctValue: null, isBetter: null, isInsignificant: true };
    }

    // Calculate percentage change (avoid division by zero)
    const pctChange = baseVal !== 0 ? diff / Math.abs(baseVal) : 0;
    const isInsignificant = Math.abs(pctChange) < INSIGNIFICANT_THRESHOLD && diff !== 0;

    // No change at all
    if (diff === 0) {
      return { absValue: '-', pctValue: null, isBetter: null, isInsignificant: true };
    }

    const isPositive = diff > 0;
    const isBetter = higherIsBetter ? isPositive : !isPositive;
    const sign = isPositive ? '+' : '';

    // Format absolute value
    const absValue = format === '%' ? `${sign}${fmtPct(diff)}` : `${sign}${fmt$(diff)}`;

    // Format percentage change (only for non-percentage metrics to avoid confusion)
    const pctValue = format !== '%' ? `${sign}${fmtPct(pctChange)}` : null;

    return { absValue, pctValue, isBetter, isInsignificant };
  };

  /**
   * Get CSS class for difference value based on better/worse/insignificant
   */
  const getDiffColorClass = (isBetter, isInsignificant) => {
    if (isInsignificant) return 'text-slate-500';
    if (isBetter === null) return 'text-slate-500';
    return isBetter ? 'text-emerald-400' : 'text-rose-400';
  };

  return (
    <div className="overflow-x-auto">
      {/* Header with comparison indicator */}
      <div className="p-2 border-b border-slate-700 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="text-emerald-400 text-xs">{baseName}</span>
        <span className="text-slate-500 mx-1">vs</span>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scenarioColor }} />
        <span className="text-xs" style={{ color: scenarioColor }}>
          {scenarioName}
        </span>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-slate-950">
          <tr>
            <th className="text-left py-1.5 px-2 text-slate-400 font-normal">Metric</th>
            {displayYears.map(year => (
              <th
                key={year}
                className="text-center py-1.5 px-2 text-slate-400 font-normal"
                colSpan={1}
              >
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => (
            <Fragment key={metric.key}>
              {/* Main row with absolute difference */}
              <tr className="border-t border-slate-800">
                <td className="py-1.5 px-2 text-slate-300 font-medium">{metric.label}</td>
                {displayYears.map(year => {
                  const baseRow = baseProjections.find(p => p.year === year);
                  const scenarioRow = scenarioProjections?.find(p => p.year === year);
                  // Apply PV to monetary values
                  const baseVal = baseRow ? getValue(baseRow, metric.key, metric.format) : 0;
                  const scenarioVal = scenarioRow
                    ? getValue(scenarioRow, metric.key, metric.format)
                    : 0;
                  const formatted = formatDiff(
                    baseVal,
                    scenarioVal,
                    metric.format,
                    metric.higherIsBetter
                  );

                  return (
                    <td key={year} className="text-center py-1.5 px-2">
                      <div
                        className={`tabular-nums font-medium ${getDiffColorClass(formatted.isBetter, formatted.isInsignificant)}`}
                      >
                        {formatted.absValue}
                      </div>
                      {/* Show percentage change for dollar metrics */}
                      {formatted.pctValue && (
                        <div
                          className={`text-[10px] tabular-nums ${getDiffColorClass(formatted.isBetter, formatted.isInsignificant)} opacity-75`}
                        >
                          ({formatted.pctValue})
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* Sub-row showing Base/Scenario values */}
              <tr className="bg-slate-900/50">
                <td className="py-0.5 px-2 text-slate-500 text-[10px] italic">
                  Base /{' '}
                  {scenarioName.length > 10 ? scenarioName.slice(0, 10) + '...' : scenarioName}
                </td>
                {displayYears.map(year => {
                  const baseRow = baseProjections.find(p => p.year === year);
                  const scenarioRow = scenarioProjections?.find(p => p.year === year);
                  // Apply PV to monetary values
                  const baseVal = baseRow ? getValue(baseRow, metric.key, metric.format) : 0;
                  const scenarioVal = scenarioRow
                    ? getValue(scenarioRow, metric.key, metric.format)
                    : 0;
                  const formatVal = metric.format === '%' ? fmtPct : fmt$;

                  return (
                    <td
                      key={year}
                      className="text-center py-0.5 px-2 text-[10px] text-slate-500 tabular-nums"
                    >
                      {formatVal(baseVal)} / {formatVal(scenarioVal)}
                    </td>
                  );
                })}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="p-2 border-t border-slate-700 flex items-center gap-4 text-xs">
        <span className="text-slate-500">Difference shown:</span>
        <span className="text-emerald-400">+ Better</span>
        <span className="text-rose-400">- Worse</span>
        <span className="text-slate-500">(Gray = &lt;1% change)</span>
      </div>
    </div>
  );
}

/**
 * MultiDiffSummary - Shows summary comparison cards for multiple scenarios
 * First scenario (or base if included) is the reference
 */
function MultiDiffSummary({
  baseProjections,
  baseSummary,
  scenarios,
  includeBase,
  showPV,
  scenarioColors,
}) {
  // Reference is base if included, otherwise first scenario
  const referenceProj = includeBase ? baseProjections : scenarios[0]?.projections;
  const referenceSum = includeBase ? baseSummary : scenarios[0]?.summary;
  const referenceName = includeBase ? 'Base Case' : scenarios[0]?.name;
  const referenceColor = includeBase ? '#10b981' : scenarioColors[0];

  // Scenarios to compare (exclude reference if it's from scenarios)
  const compareScenarios = includeBase ? scenarios : scenarios.slice(1);

  const metrics = [
    { label: 'Final Portfolio', key: 'endingPortfolio', pvKey: 'pvTotalEOY', higherIsBetter: true },
    { label: 'Heir Value', key: 'endingHeirValue', pvKey: 'pvHeirValue', higherIsBetter: true },
    { label: 'Total Tax', key: 'totalTaxPaid', pvKey: null, higherIsBetter: false },
  ];

  const getValue = (proj, sum, metric) => {
    if (showPV && metric.pvKey && proj?.length) {
      return proj[proj.length - 1]?.[metric.pvKey];
    }
    return sum?.[metric.key];
  };

  const refValues = metrics.map(m => getValue(referenceProj, referenceSum, m));

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Reference:</span>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: referenceColor }} />
          <span className="text-sm font-medium" style={{ color: referenceColor }}>
            {referenceName}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-slate-400 font-normal">Metric</th>
              <th className="text-right py-2 px-3 font-normal" style={{ color: referenceColor }}>
                {referenceName}
              </th>
              {compareScenarios.map((s, idx) => (
                <th
                  key={s.id}
                  className="text-right py-2 px-3 font-normal"
                  style={{ color: scenarioColors[includeBase ? idx : idx + 1] }}
                >
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, mIdx) => (
              <tr key={metric.key} className="border-b border-slate-800">
                <td className="py-2 px-3 text-slate-300">{metric.label}</td>
                <td className="py-2 px-3 text-right text-slate-200 font-mono">
                  {fmt$(refValues[mIdx])}
                </td>
                {compareScenarios.map(s => {
                  const val = getValue(s.projections, s.summary, metric);
                  const diff = val - refValues[mIdx];
                  const isBetter = metric.higherIsBetter ? diff > 0 : diff < 0;
                  return (
                    <td key={s.id} className="py-2 px-3 text-right font-mono">
                      <div className="text-slate-200">{fmt$(val)}</div>
                      {diff !== 0 && (
                        <div
                          className={`text-xs ${isBetter ? 'text-emerald-400' : 'text-rose-400'}`}
                        >
                          {diff > 0 ? '+' : ''}
                          {fmt$(diff)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Load saved scenarios from localStorage
const loadSavedScenarios = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('Failed to load saved scenarios:', e);
  }
  return [];
};

// Save scenarios to localStorage
const saveScenarios = scenarios => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch (e) {
    console.error('Failed to save scenarios:', e);
  }
};

export function ScenarioComparison({
  params,
  projections,
  summary,
  showPV = true,
  pendingScenario = null,
  onPendingScenarioConsumed = null,
  onScenariosChange = null,
  settings = {},
  options = {},
}) {
  const [scenarios, setScenarios] = useState([]);
  const [savedScenarioSets, setSavedScenarioSets] = useState(() => loadSavedScenarios());
  const [showPresets, setShowPresets] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveSetName, setSaveSetName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('totalEOY');
  const [namingScenario, setNamingScenario] = useState(null); // { type: 'custom', defaultName: '...' }

  // Phase 5: Enhanced view modes
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'detailed' | 'diff'
  // Multi-select: Set of scenario IDs to include in comparison
  const [selectedScenarioIds, setSelectedScenarioIds] = useState(new Set());
  // Toggle to include/exclude base case from comparison
  const [includeBaseCase, setIncludeBaseCase] = useState(true);
  // Dropdown visibility for scenario selector
  const [showScenarioSelector, setShowScenarioSelector] = useState(false);

  // Handle incoming scenario from optimizer
  useEffect(() => {
    if (pendingScenario) {
      const newId = pendingScenario.createdAt || Date.now();
      const newScenario = {
        id: newId,
        name: pendingScenario.name || 'From Optimizer',
        description: pendingScenario.description || '',
        overrides: pendingScenario.overrides || {},
      };
      setScenarios(prev => [...prev, newScenario]);
      // Auto-select the new scenario
      setSelectedScenarioIds(prev => new Set([...prev, newId]));
      onPendingScenarioConsumed?.();
    }
  }, [pendingScenario, onPendingScenarioConsumed]);

  // Calculate all scenario projections
  // Must match the same parameter merging as useProjections.js to get identical results
  const scenarioResults = useMemo(() => {
    // Compute exemptSSFromTax function same as useProjections
    const getExemptSSForYear = year => {
      const mode = settings.ssExemptionMode || 'disabled';
      if (mode === 'disabled') return false;
      if (mode === 'permanent') return true;
      return year >= 2025 && year <= 2028;
    };

    const results = scenarios.map(scenario => {
      // Merge settings the same way useProjections does
      const mergedParams = {
        ...params,
        ...options,
        heirs: params.heirs || [],
        discountRate: params.discountRate || 0.03,
        heirDistributionStrategy: params.heirDistributionStrategy || 'even',
        heirNormalizationYears: params.heirNormalizationYears || 10,
        getExemptSSForYear,
        exemptSSFromTax: getExemptSSForYear(params.startYear || 2026),
        birthYear: settings.primaryBirthYear || params.birthYear,
        customBrackets: settings.customBrackets || null,
        customIRMAA: settings.customIRMAA || null,
        taxYear: settings.taxYear || 2025,
        // Apply scenario overrides LAST so they take precedence
        ...scenario.overrides,
      };
      const proj = generateProjections(mergedParams);
      const sum = calculateSummary(proj);
      return { ...scenario, projections: proj, summary: sum };
    });
    return results;
  }, [params, scenarios, settings, options]);

  // Toggle a scenario in/out of selection
  const toggleScenarioSelection = useCallback(id => {
    setSelectedScenarioIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all scenarios
  const selectAllScenarios = useCallback(() => {
    setSelectedScenarioIds(new Set(scenarioResults.map(s => s.id)));
  }, [scenarioResults]);

  // Clear all selections
  const clearScenarioSelection = useCallback(() => {
    setSelectedScenarioIds(new Set());
  }, []);

  // Get selected scenarios for display
  const selectedScenarios = useMemo(() => {
    if (selectedScenarioIds.size === 0) {
      // If nothing selected, default to all scenarios
      return scenarioResults;
    }
    return scenarioResults.filter(s => selectedScenarioIds.has(s.id));
  }, [scenarioResults, selectedScenarioIds]);

  // Report scenarios to parent (for Chat access)
  useEffect(() => {
    if (onScenariosChange) {
      onScenariosChange(
        scenarioResults.map(s => ({
          name: s.name,
          overrides: s.overrides,
          summary: s.summary,
        }))
      );
    }
  }, [scenarioResults, onScenariosChange]);

  // Get the appropriate metric key based on PV toggle
  const getMetricKey = useCallback(
    baseKey => {
      if (!showPV) return baseKey;
      // Map to PV equivalents where they exist
      const pvMap = {
        totalEOY: 'pvTotalEOY',
        heirValue: 'pvHeirValue',
        rothEOY: 'pvRothEOY',
        iraEOY: 'pvIraEOY',
        atEOY: 'pvAtEOY',
      };
      return pvMap[baseKey] || baseKey;
    },
    [showPV]
  );

  // Comparison chart data
  const comparisonData = useMemo(() => {
    const metricKey = getMetricKey(selectedMetric);
    const data = projections.map((p, pIdx) => {
      const row = { year: p.year };
      if (includeBaseCase) {
        row.Base = p[metricKey] / 1e6;
      }
      selectedScenarios.forEach(s => {
        row[s.name] = s.projections[pIdx]?.[metricKey] / 1e6 || 0;
      });
      return row;
    });
    return data;
  }, [projections, selectedScenarios, selectedMetric, getMetricKey, includeBaseCase]);

  // Summary metrics for comparison - some have PV equivalents
  const comparisonMetrics = useMemo(
    () => [
      {
        key: showPV ? 'pvEndingPortfolio' : 'endingPortfolio',
        label: 'Final Portfolio',
        format: '$',
        projKey: showPV ? 'pvTotalEOY' : 'totalEOY',
      },
      {
        key: showPV ? 'pvEndingHeirValue' : 'endingHeirValue',
        label: 'Heir Value',
        format: '$',
        projKey: showPV ? 'pvHeirValue' : 'heirValue',
      },
      { key: 'totalTaxPaid', label: 'Total Tax Paid', format: '$', projKey: 'cumulativeTax' },
      { key: 'totalIRMAAPaid', label: 'Total IRMAA', format: '$', projKey: 'cumulativeIRMAA' },
      { key: 'totalLTCGTax', label: 'Total LTCG Tax', format: '$', projKey: 'cumulativeATTax' },
      { key: 'finalATValue', label: 'Final AT Value', format: '$', projKey: 'atEOY' },
      { key: 'finalRothPercent', label: 'Final Roth %', format: '%', projKey: 'rothPercent' },
    ],
    [showPV]
  );

  // Helper to get metric value from summary or projections
  const getMetricValue = useCallback((proj, sum, metric) => {
    // For PV portfolio and heir value, get from last projection
    if (metric.projKey && proj?.length > 0) {
      const last = proj[proj.length - 1];
      return last[metric.projKey];
    }
    // Otherwise use summary
    return sum[metric.key.replace('pv', '').replace('Ending', 'ending')];
  }, []);

  // Generate reasonable default name for custom scenarios
  const getDefaultScenarioName = useCallback(
    (type = 'custom') => {
      const existingNames = scenarios.map(s => s.name);
      let baseName;

      switch (type) {
        case 'noRoth':
          baseName = 'No Roth';
          break;
        case 'maxRoth':
          baseName = 'Max Roth';
          break;
        case 'delayRMD':
          baseName = 'Delay RMD';
          break;
        case 'earlyHarvest':
          baseName = 'Early Harvest';
          break;
        case 'custom':
        default:
          baseName = 'Custom';
      }

      // Add number suffix if name already exists
      if (!existingNames.includes(baseName)) {
        return baseName;
      }

      let counter = 2;
      while (existingNames.includes(`${baseName} ${counter}`)) {
        counter++;
      }
      return `${baseName} ${counter}`;
    },
    [scenarios]
  );

  // Create a scenario with given name (used by both preset and custom flows)
  const createScenario = useCallback(
    (preset, customName = null) => {
      const newId = Date.now();
      const newScenario = {
        id: newId,
        name: customName || (preset ? preset.name : getDefaultScenarioName('custom')),
        description: preset?.description || '',
        overrides: preset?.overrides || {},
      };
      setScenarios(prev => [...prev, newScenario]);
      // Auto-select the new scenario
      setSelectedScenarioIds(prev => new Set([...prev, newId]));
      setShowPresets(false);
      setNamingScenario(null);
    },
    [getDefaultScenarioName]
  );

  // Handle adding a scenario - shows dialog for custom, creates immediately for presets
  const addScenario = preset => {
    if (!preset) {
      // Custom scenario - show naming dialog
      setNamingScenario({
        type: 'custom',
        defaultName: getDefaultScenarioName('custom'),
      });
      setShowPresets(false);
    } else {
      // Preset scenario - create immediately with preset name
      createScenario(preset);
    }
  };

  const removeScenario = id => {
    setScenarios(scenarios.filter(s => s.id !== id));
    // Remove from selection
    setSelectedScenarioIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const duplicateScenario = scenario => {
    const newScenario = {
      id: Date.now(),
      name: `${scenario.name} (Copy)`,
      description: scenario.description,
      overrides: { ...scenario.overrides },
    };
    setScenarios([...scenarios, newScenario]);
  };

  const updateScenario = (id, field, value) => {
    setScenarios(scenarios.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  // Start editing scenario name inline
  const startEditing = scenario => {
    setEditingId(scenario.id);
    setEditingName(scenario.name);
  };

  // Save edited name
  const saveEditedName = () => {
    if (editingId && editingName.trim()) {
      updateScenario(editingId, 'name', editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Save current scenario set
  const saveScenarioSet = () => {
    if (!saveSetName.trim() || scenarios.length === 0) return;

    const newSet = {
      id: Date.now(),
      name: saveSetName.trim(),
      createdAt: new Date().toISOString(),
      scenarios: scenarios.map(s => ({
        name: s.name,
        description: s.description,
        overrides: s.overrides,
      })),
    };

    const updated = [...savedScenarioSets, newSet];
    setSavedScenarioSets(updated);
    saveScenarios(updated);
    setSaveSetName('');
    setShowSaveDialog(false);
  };

  // Load a saved scenario set
  const loadScenarioSet = set => {
    const loadedScenarios = set.scenarios.map((s, sIdx) => ({
      ...s,
      id: Date.now() + sIdx,
    }));
    setScenarios(loadedScenarios);
    setShowLoadDialog(false);
  };

  // Delete a saved scenario set
  const deleteSavedSet = id => {
    const updated = savedScenarioSets.filter(s => s.id !== id);
    setSavedScenarioSets(updated);
    saveScenarios(updated);
  };

  // Export scenarios to JSON file
  const exportScenarios = () => {
    if (scenarios.length === 0) return;

    const data = {
      exportedAt: new Date().toISOString(),
      scenarios: scenarios.map(s => ({
        name: s.name,
        description: s.description,
        overrides: s.overrides,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenarios-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import scenarios from JSON file
  const importScenarios = useCallback(
    e => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = event => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.scenarios && Array.isArray(data.scenarios)) {
            const imported = data.scenarios.map((s, sIdx) => ({
              ...s,
              id: Date.now() + sIdx,
            }));
            setScenarios([...scenarios, ...imported]);
          }
        } catch (err) {
          alert('Failed to import scenarios: ' + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [scenarios]
  );

  // Custom tooltip component with colored indicators
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          padding: '8px',
          fontSize: '11px',
        }}
      >
        <p style={{ color: '#94a3b8', marginBottom: '4px' }}>Year {label}</p>
        {payload.map((entry, entryIdx) => (
          <div
            key={entryIdx}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: entry.color }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                backgroundColor: entry.color,
                borderRadius: '50%',
                display: 'inline-block',
              }}
            />
            <span>
              {entry.name}: ${entry.value?.toFixed(2)}M
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-purple-400" />
          <span className="text-slate-200 font-medium">Scenario Comparison</span>
          <span className="text-slate-500">({scenarios.length} scenarios)</span>

          {/* View Mode Selector - Only show when scenarios exist */}
          {scenarios.length > 0 && (
            <>
              <div className="w-px h-4 bg-slate-700 ml-2" />
              <div className="flex items-center gap-0.5 bg-slate-800 rounded p-0.5">
                {VIEW_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      viewMode === mode.id
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                    title={mode.label}
                  >
                    <mode.icon className="w-3 h-3" />
                    {mode.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Include Base Case Toggle */}
          {scenarios.length > 0 && (
            <>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBaseCase}
                  onChange={e => setIncludeBaseCase(e.target.checked)}
                  className="w-3 h-3 rounded border-slate-600 bg-slate-800
                             checked:bg-emerald-600 checked:border-emerald-600
                             focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-slate-400">Include base</span>
              </label>
              <div className="w-px h-4 bg-slate-700" />
            </>
          )}

          {/* Scenario Multi-Select */}
          {scenarios.length > 0 && (viewMode === 'detailed' || viewMode === 'diff') && (
            <>
              <div className="relative">
                <button
                  onClick={() => setShowScenarioSelector(prev => !prev)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs
                             flex items-center gap-1 hover:bg-slate-700"
                >
                  <span>
                    {selectedScenarioIds.size === 0
                      ? 'All scenarios'
                      : `${selectedScenarioIds.size} selected`}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showScenarioSelector && (
                  <div
                    className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border
                                  border-slate-700 rounded shadow-lg z-20 py-1"
                  >
                    {/* Select All / Clear */}
                    <div className="px-2 py-1 border-b border-slate-700 flex gap-2">
                      <button
                        onClick={selectAllScenarios}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Select all
                      </button>
                      <button
                        onClick={clearScenarioSelection}
                        className="text-xs text-slate-400 hover:text-slate-300"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Scenario Checkboxes */}
                    {scenarioResults.map((s, idx) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedScenarioIds.size === 0 || selectedScenarioIds.has(s.id)}
                          onChange={() => toggleScenarioSelection(s.id)}
                          className="w-3 h-3 rounded border-slate-600 bg-slate-800
                                     checked:bg-blue-600 checked:border-blue-600"
                        />
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }}
                        />
                        <span className="text-xs text-slate-200 truncate">{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-px h-4 bg-slate-700" />
            </>
          )}

          {/* PV toggle removed - now controlled globally from App.jsx */}

          {/* Save/Load buttons */}
          {scenarios.length > 0 && (
            <>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
                title="Save scenario set"
              >
                <Save className="w-3 h-3" /> Save
              </button>
              <button
                onClick={exportScenarios}
                className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
                title="Export to JSON file"
              >
                <Download className="w-3 h-3" />
              </button>
            </>
          )}

          {savedScenarioSets.length > 0 && (
            <button
              onClick={() => setShowLoadDialog(true)}
              className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
              title="Load saved scenarios"
            >
              <FolderOpen className="w-3 h-3" /> Load
            </button>
          )}

          <label
            className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600 cursor-pointer"
            title="Import from JSON file"
          >
            <Upload className="w-3 h-3" />
            <input type="file" accept=".json" onChange={importScenarios} className="hidden" />
          </label>

          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="px-2 py-1 bg-purple-600 text-white rounded text-xs flex items-center gap-1 hover:bg-purple-500"
            >
              <Plus className="w-3 h-3" /> Add Scenario
            </button>

            {showPresets && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded shadow-lg z-20">
                <div className="p-2 border-b border-slate-700">
                  <button
                    onClick={() => addScenario(null)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-700 text-slate-200"
                  >
                    Custom Scenario
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {SCENARIO_PRESETS.map((preset, presetIdx) => (
                    <button
                      key={presetIdx}
                      onClick={() => addScenario(preset)}
                      className="w-full text-left px-2 py-1.5 hover:bg-slate-700 border-b border-slate-700/50"
                    >
                      <div className="text-slate-200">{preset.name}</div>
                      <div className="text-slate-500 text-xs">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-80">
            <div className="text-slate-200 font-medium mb-3">Save Scenario Set</div>
            <input
              type="text"
              value={saveSetName}
              onChange={e => setSaveSetName(e.target.value)}
              placeholder="Enter a name for this scenario set"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm mb-3 focus:border-purple-500 focus:outline-none"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveScenarioSet()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={saveScenarioSet}
                disabled={!saveSetName.trim()}
                className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-500 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-96 max-h-96 overflow-hidden flex flex-col">
            <div className="text-slate-200 font-medium mb-3">Load Saved Scenarios</div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {savedScenarioSets.map(set => (
                <div
                  key={set.id}
                  className="bg-slate-900 border border-slate-700 rounded p-3 hover:border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">{set.name}</div>
                      <div className="text-slate-500 text-xs">
                        {set.scenarios.length} scenarios -{' '}
                        {new Date(set.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => loadScenarioSet(set)}
                        className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-500"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteSavedSet(set.id)}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowLoadDialog(false)}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenario Naming Modal */}
      {namingScenario && (
        <ScenarioNameModal
          defaultName={namingScenario.defaultName}
          onConfirm={name => createScenario(null, name)}
          onCancel={() => setNamingScenario(null)}
        />
      )}

      <div className="flex-1 overflow-auto p-4">
        {scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <GitCompare className="w-12 h-12 mb-3 opacity-50" />
            <div className="text-lg mb-2">No scenarios created</div>
            <div className="text-sm mb-4">
              Create scenarios to compare different retirement strategies
            </div>
            <button
              onClick={() => setShowPresets(true)}
              className="px-3 py-2 bg-purple-600 text-white rounded flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Your First Scenario
            </button>
          </div>
        ) : (
          <>
            {/* Summary View Mode */}
            {viewMode === 'summary' && (
              <div className="space-y-4">
                {/* Scenario Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {/* Base Scenario Card - only show if includeBaseCase is true */}
                  {includeBaseCase && (
                    <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                          <span className="font-medium text-emerald-400">Base Case</span>
                        </div>
                      </div>
                      <div className="text-slate-400 text-xs mb-3">Current parameters</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Final Portfolio</span>
                          <span className="text-emerald-400 font-medium">
                            {fmt$(
                              showPV
                                ? projections[projections.length - 1]?.pvTotalEOY
                                : summary.endingPortfolio
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Heir Value</span>
                          <span className="text-blue-400">
                            {fmt$(
                              showPV
                                ? projections[projections.length - 1]?.pvHeirValue
                                : summary.endingHeirValue
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Tax</span>
                          <span className="text-rose-400">{fmt$(summary.totalTaxPaid)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scenario Cards */}
                  {selectedScenarios.map(scenario => {
                    const originalIdx = scenarioResults.indexOf(scenario);
                    const lastProj = scenario.projections[scenario.projections.length - 1];
                    const baseLastProj = projections[projections.length - 1];
                    const scenarioPortfolio = showPV
                      ? lastProj?.pvTotalEOY
                      : scenario.summary.endingPortfolio;
                    const basePortfolio = showPV
                      ? baseLastProj?.pvTotalEOY
                      : summary.endingPortfolio;
                    const diff = scenarioPortfolio - basePortfolio;
                    const diffPercent = diff / basePortfolio;
                    const isPositive = diff >= 0;
                    const isEditing = editingId === scenario.id;

                    return (
                      <div
                        key={scenario.id}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length],
                              }}
                            ></div>
                            {isEditing ? (
                              <div className="flex items-center gap-1 flex-1">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={e => setEditingName(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveEditedName();
                                    if (e.key === 'Escape') cancelEditing();
                                  }}
                                  className="font-medium bg-slate-800 border border-blue-500 rounded px-1 py-0.5 outline-none text-slate-200 w-full"
                                  autoFocus
                                />
                                <button
                                  onClick={saveEditedName}
                                  className="text-emerald-400 hover:text-emerald-300"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="text-slate-500 hover:text-slate-300"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span
                                className="font-medium text-slate-200 truncate cursor-pointer hover:text-blue-400"
                                onClick={() => startEditing(scenario)}
                                title="Click to edit name"
                              >
                                {scenario.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => startEditing(scenario)}
                              className="text-slate-500 hover:text-blue-400 p-0.5"
                              title="Edit name"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => duplicateScenario(scenario)}
                              className="text-slate-500 hover:text-blue-400 p-0.5"
                              title="Duplicate scenario"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeScenario(scenario.id)}
                              className="text-slate-500 hover:text-red-400 p-0.5"
                              title="Delete scenario"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-slate-500 text-xs mb-3">{scenario.description}</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Final Portfolio</span>
                            <div className="text-right">
                              <span className="text-slate-200 font-medium">
                                {fmt$(scenarioPortfolio)}
                              </span>
                              <span
                                className={`ml-2 text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
                              >
                                {isPositive ? '+' : ''}
                                {fmtPct(diffPercent)}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Heir Value</span>
                            <span className="text-blue-400">
                              {fmt$(
                                showPV ? lastProj?.pvHeirValue : scenario.summary.endingHeirValue
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Total Tax</span>
                            <span className="text-rose-400">
                              {fmt$(scenario.summary.totalTaxPaid)}
                            </span>
                          </div>
                        </div>

                        {scenario.summary.shortfallYears?.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-amber-400 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            Shortfall in {scenario.summary.shortfallYears.length} years
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Comparison Chart */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-200 font-medium">Comparison Over Time</div>
                    <select
                      value={selectedMetric}
                      onChange={e => setSelectedMetric(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
                    >
                      <option value="totalEOY">Total Portfolio</option>
                      <option value="heirValue">Heir Value</option>
                      <option value="cumulativeTax">Cumulative Tax</option>
                      <option value="rothEOY">Roth Balance</option>
                      <option value="iraEOY">IRA Balance</option>
                    </select>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={v => `$${v.toFixed(1)}M`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="line" iconSize={12} />
                      <Line
                        type="monotone"
                        dataKey="Base"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={false}
                        name="Base Case"
                        hide={!includeBaseCase}
                      />
                      {selectedScenarios.map(s => {
                        const originalIdx = scenarioResults.indexOf(s);
                        return (
                          <Line
                            key={s.id}
                            type="monotone"
                            dataKey={s.name}
                            stroke={SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length]}
                            strokeWidth={2.5}
                            dot={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary Table */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-slate-700">
                    <div className="text-slate-200 font-medium">Summary Comparison</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-400 font-normal">Metric</th>
                          {includeBaseCase && (
                            <th className="text-right py-2 px-3 text-emerald-400 font-normal">
                              Base
                            </th>
                          )}
                          {selectedScenarios.map(s => {
                            const originalIdx = scenarioResults.indexOf(s);
                            return (
                              <th
                                key={s.id}
                                className="text-right py-2 px-3 font-normal"
                                style={{
                                  color: SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length],
                                }}
                              >
                                {s.name}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonMetrics.map(metric => {
                          const baseValue = getMetricValue(projections, summary, metric);
                          // For diff calculation, use first selected scenario if no base
                          const referenceValue = includeBaseCase
                            ? baseValue
                            : getMetricValue(
                                selectedScenarios[0]?.projections,
                                selectedScenarios[0]?.summary,
                                metric
                              );

                          return (
                            <tr
                              key={metric.key}
                              className="border-b border-slate-800 hover:bg-slate-800/50"
                            >
                              <td className="py-2 px-3 text-slate-300">{metric.label}</td>
                              {includeBaseCase && (
                                <td className="py-2 px-3 text-right text-slate-200 font-mono">
                                  {metric.format === '$' ? fmt$(baseValue) : fmtPct(baseValue)}
                                </td>
                              )}
                              {selectedScenarios.map((s, sIdx) => {
                                const value = getMetricValue(s.projections, s.summary, metric);
                                // Skip diff for first scenario if it's the reference
                                const showDiff = includeBaseCase || sIdx > 0;
                                const diff = showDiff ? value - referenceValue : 0;
                                const isBetter =
                                  metric.key === 'totalTaxPaid' || metric.key === 'totalIRMAAPaid'
                                    ? diff < 0
                                    : diff > 0;

                                return (
                                  <td key={s.id} className="py-2 px-3 text-right font-mono">
                                    <div className="text-slate-200">
                                      {metric.format === '$' ? fmt$(value) : fmtPct(value)}
                                    </div>
                                    {showDiff && diff !== 0 && (
                                      <div
                                        className={`text-xs ${isBetter ? 'text-emerald-400' : 'text-rose-400'}`}
                                      >
                                        {diff > 0 ? '+' : ''}
                                        {metric.format === '$' ? fmt$(diff) : fmtPct(diff)}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed View Mode */}
            {viewMode === 'detailed' && (
              <div className="space-y-4">
                {/* Dynamic grid based on selection count */}
                <div
                  className={`grid gap-4 ${
                    (includeBaseCase ? 1 : 0) + selectedScenarios.length <= 2
                      ? 'grid-cols-1 lg:grid-cols-2'
                      : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
                  }`}
                >
                  {/* Base Case Mini Table */}
                  {includeBaseCase && (
                    <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-lg overflow-hidden">
                      <div className="p-2 border-b border-emerald-500/30 bg-emerald-500/10">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-emerald-400 font-medium text-sm">Base Case</span>
                        </div>
                      </div>
                      <MiniProjectionsTable
                        projections={projections}
                        label="Metric"
                        color="#10b981"
                        showPV={showPV}
                      />
                    </div>
                  )}

                  {/* Selected Scenario Mini Tables */}
                  {selectedScenarios.map(scenario => {
                    const originalIdx = scenarioResults.indexOf(scenario);
                    const color = SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length];
                    return (
                      <div
                        key={scenario.id}
                        className="bg-slate-900 border-2 rounded-lg overflow-hidden"
                        style={{ borderColor: `${color}80` }}
                      >
                        <div
                          className="p-2 border-b"
                          style={{ borderColor: `${color}50`, backgroundColor: `${color}10` }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-medium text-sm" style={{ color }}>
                              {scenario.name}
                            </span>
                          </div>
                        </div>
                        <MiniProjectionsTable
                          projections={scenario.projections}
                          label="Metric"
                          color={color}
                          showPV={showPV}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Comparison Chart */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="text-slate-200 font-medium mb-4">Side-by-Side Trend</div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={v => `$${v.toFixed(1)}M`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="line" iconSize={12} />
                      {includeBaseCase && (
                        <Line
                          type="monotone"
                          dataKey="Base"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={false}
                          name="Base Case"
                        />
                      )}
                      {selectedScenarios.map(s => {
                        const originalIdx = scenarioResults.indexOf(s);
                        return (
                          <Line
                            key={s.id}
                            type="monotone"
                            dataKey={s.name}
                            stroke={SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length]}
                            strokeWidth={3}
                            dot={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Diff View Mode */}
            {viewMode === 'diff' && (
              <div className="space-y-4">
                {/* Need at least 2 items to compare */}
                {(includeBaseCase ? 1 : 0) + selectedScenarios.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <GitMerge className="w-12 h-12 mb-3 opacity-50" />
                    <div className="text-lg mb-2">Need at least 2 scenarios to compare</div>
                    <div className="text-sm">
                      Select more scenarios or enable &quot;Include base&quot;
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Multi-Scenario Summary Comparison */}
                    <MultiDiffSummary
                      baseProjections={projections}
                      baseSummary={summary}
                      scenarios={selectedScenarios}
                      includeBase={includeBaseCase}
                      showPV={showPV}
                      scenarioColors={selectedScenarios.map(s => {
                        const idx = scenarioResults.indexOf(s);
                        return SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
                      })}
                    />

                    {/* Individual Diff Tables - show each scenario vs reference */}
                    {selectedScenarios.length > 0 &&
                      (includeBaseCase || selectedScenarios.length > 1) && (
                        <div className="space-y-4">
                          <div className="text-slate-400 text-xs">
                            Detailed year-by-year comparison:
                          </div>
                          {(includeBaseCase ? selectedScenarios : selectedScenarios.slice(1)).map(
                            scenario => {
                              const originalIdx = scenarioResults.indexOf(scenario);
                              const color = SCENARIO_COLORS[originalIdx % SCENARIO_COLORS.length];
                              const referenceProj = includeBaseCase
                                ? projections
                                : selectedScenarios[0].projections;
                              const referenceName = includeBaseCase
                                ? 'Base Case'
                                : selectedScenarios[0].name;

                              return (
                                <div
                                  key={scenario.id}
                                  className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden"
                                >
                                  <DiffTable
                                    baseProjections={referenceProj}
                                    scenarioProjections={scenario.projections}
                                    scenarioName={scenario.name}
                                    scenarioColor={color}
                                    showPV={showPV}
                                    baseName={referenceName}
                                  />
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}

                    {/* Multi-Scenario Bar Chart */}
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                      <div className="text-slate-200 font-medium mb-4">
                        Portfolio Comparison Over Time
                      </div>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart
                          data={projections
                            .filter((_, pIdx) => pIdx % 5 === 0 || pIdx === projections.length - 1)
                            .map(p => {
                              const row = { year: p.year };
                              if (includeBaseCase) {
                                row['Base'] = (showPV ? p.pvTotalEOY : p.totalEOY) / 1e6;
                              }
                              selectedScenarios.forEach(s => {
                                const sRow = s.projections.find(sp => sp.year === p.year);
                                row[s.name] = sRow
                                  ? (showPV ? sRow.pvTotalEOY : sRow.totalEOY) / 1e6
                                  : 0;
                              });
                              return row;
                            })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                          <YAxis
                            stroke="#64748b"
                            fontSize={10}
                            tickFormatter={v => `$${v.toFixed(1)}M`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              fontSize: '11px',
                            }}
                            formatter={value => [`$${value?.toFixed(2)}M`]}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                          {includeBaseCase && <Bar dataKey="Base" fill="#10b981" />}
                          {selectedScenarios.map(s => {
                            const idx = scenarioResults.indexOf(s);
                            return (
                              <Bar
                                key={s.id}
                                dataKey={s.name}
                                fill={SCENARIO_COLORS[idx % SCENARIO_COLORS.length]}
                              />
                            );
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ScenarioComparison;
