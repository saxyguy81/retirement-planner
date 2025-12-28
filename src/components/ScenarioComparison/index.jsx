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

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Trash2, Copy, GitCompare, Save, FolderOpen, Download, Upload, Edit3, Check, X, AlertTriangle } from 'lucide-react';
import { generateProjections, calculateSummary } from '../../lib';
import { fmt$, fmtPct } from '../../lib/formatters';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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
    overrides: { lowRiskReturn: 0.05, modRiskReturn: 0.075, highRiskReturn: 0.10 },
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
const saveScenarios = (scenarios) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch (e) {
    console.error('Failed to save scenarios:', e);
  }
};

export function ScenarioComparison({ params, projections, summary }) {
  const [scenarios, setScenarios] = useState([]);
  const [savedScenarioSets, setSavedScenarioSets] = useState(() => loadSavedScenarios());
  const [showPresets, setShowPresets] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveSetName, setSaveSetName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('totalEOY');

  // Calculate all scenario projections
  const scenarioResults = useMemo(() => {
    const results = scenarios.map(scenario => {
      const mergedParams = { ...params, ...scenario.overrides };
      const proj = generateProjections(mergedParams);
      const sum = calculateSummary(proj);
      return { ...scenario, projections: proj, summary: sum };
    });
    return results;
  }, [params, scenarios]);

  // Comparison chart data
  const comparisonData = useMemo(() => {
    if (scenarioResults.length === 0) return projections.map(p => ({ year: p.year, Base: p[selectedMetric] / 1e6 }));

    return projections.map((p, idx) => {
      const row = { year: p.year, Base: p[selectedMetric] / 1e6 };
      scenarioResults.forEach((s, i) => {
        row[s.name] = s.projections[idx]?.[selectedMetric] / 1e6 || 0;
      });
      return row;
    });
  }, [projections, scenarioResults, selectedMetric]);

  // Summary metrics for comparison
  const comparisonMetrics = [
    { key: 'endingPortfolio', label: 'Final Portfolio', format: '$' },
    { key: 'endingHeirValue', label: 'Heir Value', format: '$' },
    { key: 'totalTaxPaid', label: 'Total Tax Paid', format: '$' },
    { key: 'totalIRMAAPaid', label: 'Total IRMAA', format: '$' },
    { key: 'finalRothPercent', label: 'Final Roth %', format: '%' },
  ];

  const addScenario = (preset) => {
    const newScenario = {
      id: Date.now(),
      name: preset ? preset.name : `Scenario ${scenarios.length + 1}`,
      description: preset?.description || '',
      overrides: preset?.overrides || {},
    };
    setScenarios([...scenarios, newScenario]);
    setShowPresets(false);
  };

  const removeScenario = (id) => {
    setScenarios(scenarios.filter(s => s.id !== id));
  };

  const duplicateScenario = (scenario) => {
    const newScenario = {
      id: Date.now(),
      name: `${scenario.name} (Copy)`,
      description: scenario.description,
      overrides: { ...scenario.overrides },
    };
    setScenarios([...scenarios, newScenario]);
  };

  const updateScenario = (id, field, value) => {
    setScenarios(scenarios.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  // Start editing scenario name inline
  const startEditing = (scenario) => {
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
  const loadScenarioSet = (set) => {
    const loadedScenarios = set.scenarios.map((s, idx) => ({
      ...s,
      id: Date.now() + idx,
    }));
    setScenarios(loadedScenarios);
    setShowLoadDialog(false);
  };

  // Delete a saved scenario set
  const deleteSavedSet = (id) => {
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
  const importScenarios = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.scenarios && Array.isArray(data.scenarios)) {
          const imported = data.scenarios.map((s, idx) => ({
            ...s,
            id: Date.now() + idx,
          }));
          setScenarios([...scenarios, ...imported]);
        }
      } catch (err) {
        alert('Failed to import scenarios: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [scenarios]);

  const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', fontSize: '11px' };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-purple-400" />
          <span className="text-slate-200 font-medium">Scenario Comparison</span>
          <span className="text-slate-500">({scenarios.length} scenarios)</span>
        </div>
        <div className="flex items-center gap-2">
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

          <label className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600 cursor-pointer"
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
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Plus className="w-3 h-3 text-blue-400" />
                    <span>Custom Scenario</span>
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {SCENARIO_PRESETS.map((preset, i) => (
                    <button
                      key={i}
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
              onChange={(e) => setSaveSetName(e.target.value)}
              placeholder="Enter a name for this scenario set"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm mb-3 focus:border-purple-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveScenarioSet()}
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
              {savedScenarioSets.map((set) => (
                <div
                  key={set.id}
                  className="bg-slate-900 border border-slate-700 rounded p-3 hover:border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">{set.name}</div>
                      <div className="text-slate-500 text-xs">
                        {set.scenarios.length} scenarios - {new Date(set.createdAt).toLocaleDateString()}
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

      <div className="flex-1 overflow-auto p-4">
        {scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <GitCompare className="w-12 h-12 mb-3 opacity-50" />
            <div className="text-lg mb-2">No scenarios created</div>
            <div className="text-sm mb-4">Create scenarios to compare different retirement strategies</div>
            <button
              onClick={() => setShowPresets(true)}
              className="px-3 py-2 bg-purple-600 text-white rounded flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Your First Scenario
            </button>
          </div>
        ) : (
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
                    <span className="text-emerald-400 font-medium">{fmt$(summary.endingPortfolio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Heir Value</span>
                    <span className="text-blue-400">{fmt$(summary.endingHeirValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Tax</span>
                    <span className="text-rose-400">{fmt$(summary.totalTaxPaid)}</span>
                  </div>
                </div>
              </div>

              {/* Scenario Cards */}
              {scenarioResults.map((scenario, idx) => {
                const diff = scenario.summary.endingPortfolio - summary.endingPortfolio;
                const diffPercent = diff / summary.endingPortfolio;
                const isPositive = diff >= 0;
                const isEditing = editingId === scenario.id;

                return (
                  <div key={scenario.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }}
                        ></div>
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedName();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="font-medium bg-slate-800 border border-blue-500 rounded px-1 py-0.5 outline-none text-slate-200 w-full"
                              autoFocus
                            />
                            <button onClick={saveEditedName} className="text-emerald-400 hover:text-emerald-300">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEditing} className="text-slate-500 hover:text-slate-300">
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
                          <span className="text-slate-200 font-medium">{fmt$(scenario.summary.endingPortfolio)}</span>
                          <span className={`ml-2 text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? '+' : ''}{fmtPct(diffPercent)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Heir Value</span>
                        <span className="text-blue-400">{fmt$(scenario.summary.endingHeirValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Tax</span>
                        <span className="text-rose-400">{fmt$(scenario.summary.totalTaxPaid)}</span>
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
                  onChange={(e) => setSelectedMetric(e.target.value)}
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
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${v.toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`$${value.toFixed(2)}M`, '']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Base" stroke="#10b981" strokeWidth={2} dot={false} />
                  {scenarioResults.map((s, idx) => (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.name}
                      stroke={SCENARIO_COLORS[idx % SCENARIO_COLORS.length]}
                      strokeWidth={2}
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
                      <th className="text-right py-2 px-3 text-emerald-400 font-normal">Base</th>
                      {scenarioResults.map((s, idx) => (
                        <th
                          key={s.id}
                          className="text-right py-2 px-3 font-normal"
                          style={{ color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }}
                        >
                          {s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonMetrics.map(metric => (
                      <tr key={metric.key} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-2 px-3 text-slate-300">{metric.label}</td>
                        <td className="py-2 px-3 text-right text-slate-200 font-mono">
                          {metric.format === '$' ? fmt$(summary[metric.key]) : fmtPct(summary[metric.key])}
                        </td>
                        {scenarioResults.map((s) => {
                          const value = s.summary[metric.key];
                          const baseValue = summary[metric.key];
                          const diff = metric.format === '$' ? value - baseValue : (value - baseValue);
                          const isBetter = metric.key === 'totalTaxPaid' || metric.key === 'totalIRMAAPaid'
                            ? diff < 0 : diff > 0;

                          return (
                            <td key={s.id} className="py-2 px-3 text-right font-mono">
                              <div className="text-slate-200">
                                {metric.format === '$' ? fmt$(value) : fmtPct(value)}
                              </div>
                              {diff !== 0 && (
                                <div className={`text-xs ${isBetter ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {diff > 0 ? '+' : ''}{metric.format === '$' ? fmt$(diff) : fmtPct(diff)}
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
          </div>
        )}
      </div>
    </div>
  );
}

export default ScenarioComparison;
