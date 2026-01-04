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
        <span className="text-emerald-400 text-xs">Base Case</span>
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
  const [selectedScenarioId, setSelectedScenarioId] = useState(null); // For detailed/diff views

  // Handle incoming scenario from optimizer
  useEffect(() => {
    if (pendingScenario) {
      const newScenario = {
        id: pendingScenario.createdAt || Date.now(),
        name: pendingScenario.name || 'From Optimizer',
        description: pendingScenario.description || '',
        overrides: pendingScenario.overrides || {},
      };
      setScenarios(prev => [...prev, newScenario]);
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

  // Get selected scenario for detailed/diff views
  const selectedScenario = useMemo(() => {
    if (!selectedScenarioId && scenarioResults.length > 0) {
      return scenarioResults[0];
    }
    return scenarioResults.find(s => s.id === selectedScenarioId) || null;
  }, [selectedScenarioId, scenarioResults]);

  // Get color for selected scenario
  const selectedScenarioColor = useMemo(() => {
    if (!selectedScenario) return SCENARIO_COLORS[0];
    const idx = scenarioResults.findIndex(s => s.id === selectedScenario.id);
    return SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
  }, [selectedScenario, scenarioResults]);

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
    if (scenarioResults.length === 0)
      return projections.map(p => ({ year: p.year, Base: p[metricKey] / 1e6 }));

    return projections.map((p, pIdx) => {
      const row = { year: p.year, Base: p[metricKey] / 1e6 };
      scenarioResults.forEach(s => {
        row[s.name] = s.projections[pIdx]?.[metricKey] / 1e6 || 0;
      });
      return row;
    });
  }, [projections, scenarioResults, selectedMetric, getMetricKey]);

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
      const newScenario = {
        id: Date.now(),
        name: customName || (preset ? preset.name : getDefaultScenarioName('custom')),
        description: preset?.description || '',
        overrides: preset?.overrides || {},
      };
      setScenarios(prev => [...prev, newScenario]);
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
    // Reset selected scenario if it was removed
    if (selectedScenarioId === id) {
      setSelectedScenarioId(null);
    }
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
          {/* Scenario Selector for Detailed/Diff views */}
          {scenarios.length > 0 && (viewMode === 'detailed' || viewMode === 'diff') && (
            <>
              <select
                value={selectedScenarioId || scenarioResults[0]?.id || ''}
                onChange={e => setSelectedScenarioId(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs"
              >
                {scenarioResults.map((s, _idx) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
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
                  {/* Base Scenario */}
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

                  {/* Scenario Cards */}
                  {scenarioResults.map((scenario, scenarioIdx) => {
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
                                  SCENARIO_COLORS[scenarioIdx % SCENARIO_COLORS.length],
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
                      />
                      {scenarioResults.map((s, sIdx) => (
                        <Line
                          key={s.id}
                          type="monotone"
                          dataKey={s.name}
                          stroke={SCENARIO_COLORS[sIdx % SCENARIO_COLORS.length]}
                          strokeWidth={2.5}
                          dot={false}
                        />
                      ))}
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
                          <th className="text-right py-2 px-3 text-emerald-400 font-normal">
                            Base
                          </th>
                          {scenarioResults.map((s, sIdx) => (
                            <th
                              key={s.id}
                              className="text-right py-2 px-3 font-normal"
                              style={{ color: SCENARIO_COLORS[sIdx % SCENARIO_COLORS.length] }}
                            >
                              {s.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonMetrics.map(metric => {
                          const baseValue = getMetricValue(projections, summary, metric);
                          return (
                            <tr
                              key={metric.key}
                              className="border-b border-slate-800 hover:bg-slate-800/50"
                            >
                              <td className="py-2 px-3 text-slate-300">{metric.label}</td>
                              <td className="py-2 px-3 text-right text-slate-200 font-mono">
                                {metric.format === '$' ? fmt$(baseValue) : fmtPct(baseValue)}
                              </td>
                              {scenarioResults.map(s => {
                                const value = getMetricValue(s.projections, s.summary, metric);
                                const diff =
                                  metric.format === '$' ? value - baseValue : value - baseValue;
                                const isBetter =
                                  metric.key === 'totalTaxPaid' || metric.key === 'totalIRMAAPaid'
                                    ? diff < 0
                                    : diff > 0;

                                return (
                                  <td key={s.id} className="py-2 px-3 text-right font-mono">
                                    <div className="text-slate-200">
                                      {metric.format === '$' ? fmt$(value) : fmtPct(value)}
                                    </div>
                                    {diff !== 0 && (
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Base Case Mini Table */}
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

                  {/* Selected Scenario Mini Table */}
                  {selectedScenario && (
                    <div
                      className="bg-slate-900 border-2 rounded-lg overflow-hidden"
                      style={{ borderColor: `${selectedScenarioColor}80` }}
                    >
                      <div
                        className="p-2 border-b"
                        style={{
                          borderColor: `${selectedScenarioColor}50`,
                          backgroundColor: `${selectedScenarioColor}10`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: selectedScenarioColor }}
                          />
                          <span
                            className="font-medium text-sm"
                            style={{ color: selectedScenarioColor }}
                          >
                            {selectedScenario.name}
                          </span>
                        </div>
                      </div>
                      <MiniProjectionsTable
                        projections={selectedScenario.projections}
                        label="Metric"
                        color={selectedScenarioColor}
                        showPV={showPV}
                      />
                    </div>
                  )}
                </div>

                {/* Comparison Chart in Detailed View */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-200 font-medium">Side-by-Side Trend</div>
                  </div>
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
                      <Line
                        type="monotone"
                        dataKey="Base"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={false}
                        name="Base Case"
                      />
                      {selectedScenario && (
                        <Line
                          type="monotone"
                          dataKey={selectedScenario.name}
                          stroke={selectedScenarioColor}
                          strokeWidth={3}
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Diff View Mode */}
            {viewMode === 'diff' && selectedScenario && (
              <div className="space-y-4">
                {/* Diff Table */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                  <DiffTable
                    baseProjections={projections}
                    scenarioProjections={selectedScenario.projections}
                    scenarioName={selectedScenario.name}
                    scenarioColor={selectedScenarioColor}
                    showPV={showPV}
                  />
                </div>

                {/* Summary Diff Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Final Portfolio',
                      base: showPV
                        ? projections[projections.length - 1]?.pvTotalEOY
                        : summary.endingPortfolio,
                      scenario: showPV
                        ? selectedScenario.projections[selectedScenario.projections.length - 1]
                            ?.pvTotalEOY
                        : selectedScenario.summary.endingPortfolio,
                      higherIsBetter: true,
                      format: '$',
                    },
                    {
                      label: 'Heir Value',
                      base: showPV
                        ? projections[projections.length - 1]?.pvHeirValue
                        : summary.endingHeirValue,
                      scenario: showPV
                        ? selectedScenario.projections[selectedScenario.projections.length - 1]
                            ?.pvHeirValue
                        : selectedScenario.summary.endingHeirValue,
                      higherIsBetter: true,
                      format: '$',
                    },
                    {
                      label: 'Total Tax Paid',
                      base: summary.totalTaxPaid,
                      scenario: selectedScenario.summary.totalTaxPaid,
                      higherIsBetter: false,
                      format: '$',
                    },
                    {
                      label: 'Final Roth %',
                      base: projections[projections.length - 1]?.rothPercent,
                      scenario:
                        selectedScenario.projections[selectedScenario.projections.length - 1]
                          ?.rothPercent,
                      higherIsBetter: true,
                      format: '%',
                    },
                  ].map(item => {
                    const diff = item.scenario - item.base;
                    const isBetter = item.higherIsBetter ? diff > 0 : diff < 0;
                    const diffFormatted = item.format === '%' ? fmtPct(diff) : fmt$(diff);

                    return (
                      <div
                        key={item.label}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-3"
                      >
                        <div className="text-slate-400 text-xs mb-2">{item.label}</div>
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-lg font-medium ${
                              diff === 0
                                ? 'text-slate-400'
                                : isBetter
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                            }`}
                          >
                            {diff > 0 ? '+' : ''}
                            {diffFormatted}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mt-2 text-slate-500">
                          <span>
                            Base: {item.format === '%' ? fmtPct(item.base) : fmt$(item.base)}
                          </span>
                          <span>
                            {selectedScenario.name}:{' '}
                            {item.format === '%' ? fmtPct(item.scenario) : fmt$(item.scenario)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Difference Bar Chart */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="text-slate-200 font-medium mb-4">
                    Portfolio Difference Over Time
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={projections
                        .filter((_, pIdx) => pIdx % 3 === 0 || pIdx === projections.length - 1)
                        .map(p => {
                          const baseVal = showPV ? p.pvTotalEOY : p.totalEOY;
                          const scenarioRow = selectedScenario.projections.find(
                            sp => sp.year === p.year
                          );
                          const scenarioVal = scenarioRow
                            ? showPV
                              ? scenarioRow.pvTotalEOY
                              : scenarioRow.totalEOY
                            : 0;
                          return {
                            year: p.year,
                            diff: (scenarioVal - baseVal) / 1e6,
                          };
                        })}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={v => `${v >= 0 ? '+' : ''}$${v.toFixed(1)}M`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          fontSize: '11px',
                        }}
                        formatter={value => [
                          `${value >= 0 ? '+' : ''}$${value.toFixed(2)}M`,
                          'Difference',
                        ]}
                      />
                      <Bar dataKey="diff" fill={selectedScenarioColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Fallback for diff view without scenario */}
            {viewMode === 'diff' && !selectedScenario && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <GitMerge className="w-12 h-12 mb-3 opacity-50" />
                <div className="text-lg mb-2">No scenario selected</div>
                <div className="text-sm">Select a scenario to compare with the base case</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ScenarioComparison;
