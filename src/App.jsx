/**
 * Retirement Planner Application
 *
 * Main application component that orchestrates:
 * - Input panel for model parameters
 * - Tab-based content area for projections, charts, risk, heir analysis
 * - Scenario comparison for what-if analysis
 * - Optimization tools for finding optimal strategies
 * - Excel export functionality
 * - Header with iterative tax toggle and scenario management
 */

import {
  Calculator,
  Table,
  LineChart,
  Shield,
  Users,
  RefreshCw,
  GitCompare,
  Zap,
  Download,
  Upload,
  ChevronDown,
  Columns,
  Square,
  Save,
  FolderOpen,
  RotateCcw,
  Trash2,
  Settings,
  DollarSign,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect, useMemo, Suspense, lazy } from 'react';

// Static imports - always needed
import { InputPanel } from './components/InputPanel';
import { LazyErrorBoundary } from './components/LazyErrorBoundary';
import { LazyLoadingFallback } from './components/LazyLoadingFallback';

// ProjectionsTable stays static since it's the default tab
import { ProjectionsTable } from './components/ProjectionsTable';
import { SplitPanel } from './components/SplitPanel';

// Lazy imports - loaded on demand
const Dashboard = lazy(() =>
  import('./components/Dashboard').then(m => ({ default: m.Dashboard }))
);
const RiskAllocation = lazy(() =>
  import('./components/RiskAllocation').then(m => ({ default: m.RiskAllocation }))
);
const HeirAnalysis = lazy(() =>
  import('./components/HeirAnalysis').then(m => ({ default: m.HeirAnalysis }))
);
const ScenarioComparison = lazy(() =>
  import('./components/ScenarioComparison').then(m => ({ default: m.ScenarioComparison }))
);
const Optimization = lazy(() =>
  import('./components/Optimization').then(m => ({ default: m.Optimization }))
);
const SettingsPanel = lazy(() =>
  import('./components/SettingsPanel').then(m => ({ default: m.SettingsPanel }))
);

// Preload functions - trigger chunk loading without rendering
const preloadDashboard = () => import('./components/Dashboard');
const preloadRisk = () => import('./components/RiskAllocation');
const preloadHeir = () => import('./components/HeirAnalysis');
const preloadScenarios = () => import('./components/ScenarioComparison');
const preloadOptimize = () => import('./components/Optimization');
const preloadSettings = () => import('./components/SettingsPanel');

// Map tab IDs to preload functions
const preloadMap = {
  dashboard: preloadDashboard,
  risk: preloadRisk,
  heir: preloadHeir,
  scenarios: preloadScenarios,
  optimize: preloadOptimize,
  settings: preloadSettings,
};
import { useProjections } from './hooks/useProjections';
import {
  exportToExcel,
  exportToJSON,
  exportToPDF,
  importFromJSON,
  importFromExcel,
} from './lib/excelExport';
import { setGlobalPrecision } from './lib/formatters';

const TABS = [
  { id: 'projections', icon: Table, label: 'Projections' },
  { id: 'dashboard', icon: LineChart, label: 'Dashboard' },
  { id: 'risk', icon: Shield, label: 'Risk Allocation' },
  { id: 'heir', icon: Users, label: 'Heir Analysis' },
  { id: 'scenarios', icon: GitCompare, label: 'Scenarios' },
  { id: 'optimize', icon: Zap, label: 'Optimize' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('projections');
  const [riskYear, setRiskYear] = useState(2028);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showPV, setShowPV] = useState(true); // Global Present Value toggle
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);
  const loadMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
      if (loadMenuRef.current && !loadMenuRef.current.contains(e.target)) {
        setShowLoadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    params,
    options,
    projections,
    summary,
    updateParam,
    updateParams,
    updateRothConversion,
    updateExpenseOverride,
    updateATHarvest,
    toggleIterative,
    setMaxIterations,
    setOptions,
    savedStates,
    saveState,
    loadState,
    deleteState,
    resetToDefaults,
    settings,
    updateSettings,
    resetSettings,
  } = useProjections();

  // Apply global display precision setting
  useEffect(() => {
    setGlobalPrecision(settings.displayPrecision || 'abbreviated');
  }, [settings.displayPrecision]);

  // Save handler
  const handleSave = useCallback(() => {
    saveState(saveName);
    setSaveName('');
    setShowSaveDialog(false);
  }, [saveState, saveName]);

  // Import handler
  const handleImport = useCallback(
    async e => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        let importedParams;
        if (file.name.endsWith('.json')) {
          importedParams = await importFromJSON(file);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          importedParams = await importFromExcel(file);
        } else {
          alert('Please select a .json or .xlsx file');
          return;
        }
        updateParams(importedParams);
      } catch (err) {
        alert('Import failed: ' + err.message);
      }

      // Reset file input
      e.target.value = '';
    },
    [updateParams]
  );

  // Export handlers
  const handleExport = useCallback(
    format => {
      const exportData = {
        projections,
        summary,
        params,
        filename: 'retirement-projections',
      };

      switch (format) {
        case 'xlsx':
          exportToExcel(exportData);
          break;
        case 'json':
          exportToJSON(exportData);
          break;
        case 'pdf':
          exportToPDF(exportData);
          break;
      }
      setShowExportMenu(false);
    },
    [projections, summary, params]
  );

  // Split panel view configurations - use render functions for lazy loading
  const splitPanelViews = useMemo(
    () => [
      {
        id: 'projections',
        label: 'Projections',
        render: () => (
          <ProjectionsTable
            projections={projections}
            options={options}
            params={params}
            showPV={showPV}
          />
        ),
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        render: () => (
          <Suspense fallback={<LazyLoadingFallback />}>
            <Dashboard projections={projections} params={params} showPV={showPV} />
          </Suspense>
        ),
      },
      {
        id: 'risk',
        label: 'Risk Allocation',
        render: () => (
          <Suspense fallback={<LazyLoadingFallback />}>
            <RiskAllocation
              projections={projections}
              params={params}
              selectedYear={riskYear}
              onYearChange={setRiskYear}
            />
          </Suspense>
        ),
      },
      {
        id: 'heir',
        label: 'Heir Analysis',
        render: () => (
          <Suspense fallback={<LazyLoadingFallback />}>
            <HeirAnalysis projections={projections} params={params} showPV={showPV} />
          </Suspense>
        ),
      },
    ],
    [projections, options, params, riskYear, showPV]
  );

  return (
    <div
      className="h-screen w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Monaco, Consolas, monospace' }}
    >
      {/* Header */}
      <header className="h-11 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm">Retirement Planner</span>
          <span className="text-xs text-slate-500">v2.0</span>
        </div>

        <div className="flex items-center gap-2">
          {/* PV/FV Toggle - visible on all tabs except Settings */}
          {activeTab !== 'settings' && (
            <button
              onClick={() => setShowPV(!showPV)}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                showPV ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title={
                showPV
                  ? "Showing Present Value (today's dollars)"
                  : 'Showing Future Value (nominal dollars)'
              }
            >
              <DollarSign className="w-3 h-3" />
              {showPV ? 'PV' : 'FV'}
            </button>
          )}

          {/* Iterative tax toggle */}
          <div className="flex items-center gap-1.5 bg-slate-800 rounded px-2 py-1">
            <RefreshCw
              className={`w-3 h-3 ${options.iterativeTax ? 'text-emerald-400' : 'text-slate-500'}`}
            />
            <span className="text-xs text-slate-400">Iterative Tax:</span>
            <button
              onClick={toggleIterative}
              className={`px-2 py-0.5 rounded text-xs ${
                options.iterativeTax ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              {options.iterativeTax ? 'ON' : 'OFF'}
            </button>
            {options.iterativeTax && (
              <select
                value={options.maxIterations}
                onChange={e => setMaxIterations(+e.target.value)}
                className="bg-slate-700 text-xs rounded px-1 py-0.5 ml-1"
              >
                <option value={3}>3 iter</option>
                <option value={5}>5 iter</option>
                <option value={10}>10 iter</option>
              </select>
            )}
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-3 ml-4 text-xs">
            <div className="text-slate-400">
              Final:{' '}
              <span className="text-emerald-400 font-medium">
                ${(summary.endingPortfolio / 1e6).toFixed(1)}M
              </span>
            </div>
            <div className="text-slate-400">
              Heir:{' '}
              <span className="text-blue-400 font-medium">
                ${(summary.endingHeirValue / 1e6).toFixed(1)}M
              </span>
            </div>
            <div className="text-slate-400">
              Tax:{' '}
              <span className="text-rose-400 font-medium">
                ${(summary.totalTaxPaid / 1e6).toFixed(1)}M
              </span>
            </div>
          </div>

          {/* Import/Export buttons */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ml-4 px-2 py-1 bg-slate-700 text-white rounded text-xs flex items-center gap-1 hover:bg-slate-600"
          >
            <Upload className="w-3 h-3" />
            Import
          </button>

          {/* State Management Buttons */}
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-2 py-1 bg-slate-700 text-white rounded text-xs flex items-center gap-1 hover:bg-slate-600"
            title="Save current state"
          >
            <Save className="w-3 h-3" />
            Save
          </button>

          <div className="relative" ref={loadMenuRef}>
            <button
              onClick={() => setShowLoadMenu(!showLoadMenu)}
              className="px-2 py-1 bg-slate-700 text-white rounded text-xs flex items-center gap-1 hover:bg-slate-600"
              title="Load saved state"
            >
              <FolderOpen className="w-3 h-3" />
              Load
              <ChevronDown className="w-3 h-3" />
            </button>
            {showLoadMenu && (
              <div className="absolute right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                {savedStates.length === 0 ? (
                  <div className="px-3 py-2 text-slate-400 text-xs">No saved states</div>
                ) : (
                  savedStates.map(state => (
                    <div
                      key={state.id}
                      className="px-3 py-2 hover:bg-slate-700 flex items-center justify-between group"
                    >
                      <button
                        onClick={() => {
                          loadState(state.id);
                          setShowLoadMenu(false);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="text-slate-200 text-xs">{state.name}</div>
                        <div className="text-slate-500 text-xs">
                          {new Date(state.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteState(state.id);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={resetToDefaults}
            className="px-2 py-1 bg-amber-600 text-white rounded text-xs flex items-center gap-1 hover:bg-amber-500"
            title="Start fresh with defaults"
          >
            <RotateCcw className="w-3 h-3" />
            Fresh
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="ml-1 px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1 hover:bg-blue-500"
            >
              <Download className="w-3 h-3" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-slate-800 border border-slate-700 rounded shadow-lg z-50">
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2"
                >
                  <span className="text-emerald-400">XLSX</span>
                  <span className="text-slate-400">Excel</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2"
                >
                  <span className="text-amber-400">JSON</span>
                  <span className="text-slate-400">Data</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2"
                >
                  <span className="text-rose-400">PDF</span>
                  <span className="text-slate-400">Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Inputs */}
        <InputPanel
          params={params}
          settings={settings}
          updateParam={updateParam}
          updateParams={updateParams}
          updateRothConversion={updateRothConversion}
          updateExpenseOverride={updateExpenseOverride}
          updateATHarvest={updateATHarvest}
          options={options}
          setOptions={setOptions}
          updateSettings={updateSettings}
        />

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Tab bar */}
          <div className="h-9 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-1 shrink-0">
            <div className="flex items-center">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (
                      splitView &&
                      (tab.id === 'scenarios' || tab.id === 'optimize' || tab.id === 'settings')
                    ) {
                      setSplitView(false);
                    }
                  }}
                  onMouseEnter={() => {
                    // Preload component on hover for faster tab switching
                    const preload = preloadMap[tab.id];
                    if (preload) preload();
                  }}
                  className={`h-full px-3 flex items-center gap-1.5 border-b-2 text-xs transition-colors ${
                    activeTab === tab.id && !splitView
                      ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Split view toggle */}
            <button
              onClick={() => setSplitView(!splitView)}
              className={`mr-2 px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                splitView
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title={splitView ? 'Single view' : 'Split view'}
            >
              {splitView ? (
                <>
                  <Square className="w-3 h-3" />
                  Single
                </>
              ) : (
                <>
                  <Columns className="w-3 h-3" />
                  Split
                </>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {splitView ? (
              <SplitPanel
                views={splitPanelViews}
                defaultLeftView="projections"
                defaultRightView="dashboard"
              />
            ) : (
              <LazyErrorBoundary>
                {activeTab === 'projections' && (
                  <ProjectionsTable
                    projections={projections}
                    options={options}
                    params={params}
                    showPV={showPV}
                  />
                )}

                <Suspense fallback={<LazyLoadingFallback />}>
                  {activeTab === 'dashboard' && (
                    <Dashboard projections={projections} params={params} showPV={showPV} />
                  )}

                  {activeTab === 'risk' && (
                    <RiskAllocation
                      projections={projections}
                      params={params}
                      selectedYear={riskYear}
                      onYearChange={setRiskYear}
                    />
                  )}

                  {activeTab === 'heir' && (
                    <HeirAnalysis projections={projections} params={params} showPV={showPV} />
                  )}

                  {activeTab === 'scenarios' && (
                    <ScenarioComparison
                      params={params}
                      projections={projections}
                      summary={summary}
                      showPV={showPV}
                    />
                  )}

                  {activeTab === 'optimize' && (
                    <Optimization
                      params={params}
                      projections={projections}
                      summary={summary}
                      updateParams={updateParams}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsPanel
                      settings={settings}
                      updateSettings={updateSettings}
                      resetSettings={resetSettings}
                    />
                  )}
                </Suspense>
              </LazyErrorBoundary>
            )}
          </div>
        </main>
      </div>

      {/* Save Dialog Modal */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-80">
            <div className="text-slate-200 font-medium mb-3">Save Current State</div>
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Optional name (or leave blank)"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm mb-3 focus:border-blue-500 focus:outline-none"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName('');
                }}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
