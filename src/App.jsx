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
  ChevronDown,
  Columns,
  DollarSign,
  Download,
  FolderOpen,
  GitCompare,
  GripHorizontal,
  GripVertical,
  LineChart,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Square,
  Table,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Chat } from './components/Chat';
import { InputPanel } from './components/InputPanel';
import { LazyErrorBoundary } from './components/LazyErrorBoundary';
import { LazyLoadingFallback } from './components/LazyLoadingFallback';
import { ProjectionsTable } from './components/ProjectionsTable';
import { SplitPanel } from './components/SplitPanel';
import UpdatePrompt from './components/UpdatePrompt';

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
import { useChatPanelState } from './hooks/useChatPanelState';
import { useProjections } from './hooks/useProjections';
import { loadAIConfig, saveAIConfig } from './lib/aiService';
import { exportToExcel, exportToJSON, exportToPDF } from './lib/excelExport';
import { setGlobalPrecision } from './lib/formatters';

const TABS = [
  { id: 'projections', icon: Table, label: 'Projections' },
  { id: 'dashboard', icon: LineChart, label: 'Dashboard' },
  { id: 'risk', icon: Shield, label: 'Risk Allocation' },
  { id: 'heir', icon: Users, label: 'Heir Analysis' },
  { id: 'scenarios', icon: GitCompare, label: 'Scenarios' },
  { id: 'optimize', icon: Zap, label: 'Optimize' },
  { id: 'chat', icon: MessageCircle, label: 'AI Chat' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('projections');
  const [riskYear, setRiskYear] = useState(2028);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showPV, setShowPV] = useState(true); // Global Present Value toggle
  const [pendingScenario, setPendingScenario] = useState(null);
  const [chatScenarios, setChatScenarios] = useState([]); // Scenarios for Chat access

  // Chat panel state with persistence
  const chatPanel = useChatPanelState();

  const configFileInputRef = useRef(null);
  const exportMenuRef = useRef(null);
  const saveMenuRef = useRef(null);
  const loadMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target)) {
        setShowSaveMenu(false);
      }
      if (loadMenuRef.current && !loadMenuRef.current.contains(e.target)) {
        setShowLoadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+Shift+C to toggle chat panel
  useEffect(() => {
    const handleKeyDown = e => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        chatPanel.toggleVisible();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // chatPanel.toggleVisible is a stable callback from useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatPanel.toggleVisible]);

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

  // Save configuration to JSON file
  const handleSaveToFile = useCallback(async () => {
    const saveData = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      type: 'retirement-planner-config',
      params: { ...params },
      options: { ...options },
      settings: { ...settings },
      aiConfig: loadAIConfig(),
    };

    // Try native File System Access API first
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `retirement-config-${new Date().toISOString().slice(0, 10)}.json`,
          types: [
            {
              description: 'JSON Configuration',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(saveData, null, 2));
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User cancelled
        console.warn('File System Access API failed, falling back to download');
      }
    }

    // Fallback: standard download
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retirement-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [params, options, settings]);

  // Load configuration from JSON file
  const handleLoadFromFile = useCallback(async () => {
    // Try native File System Access API
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'JSON Configuration',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const file = await handle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.type !== 'retirement-planner-config') {
          // Might be an export file, try to load params anyway
          if (data.params) {
            updateParams(data.params);
            if (data.options) setOptions(prev => ({ ...prev, ...data.options }));
            if (data.settings) updateSettings(data.settings);
            if (data.aiConfig) saveAIConfig(data.aiConfig);
          } else {
            alert('Invalid configuration file');
          }
          return;
        }

        updateParams(data.params);
        if (data.options) setOptions(prev => ({ ...prev, ...data.options }));
        if (data.settings) updateSettings(data.settings);
        if (data.aiConfig) saveAIConfig(data.aiConfig);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('File System Access API failed, falling back to input');
      }
    }

    // Fallback: use file input
    configFileInputRef.current?.click();
  }, [updateParams, setOptions, updateSettings]);

  // Handle config file input (fallback for browsers without File System Access API)
  const handleConfigImport = useCallback(
    async e => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.type !== 'retirement-planner-config') {
          if (data.params) {
            updateParams(data.params);
            if (data.options) setOptions(prev => ({ ...prev, ...data.options }));
            if (data.settings) updateSettings(data.settings);
            if (data.aiConfig) saveAIConfig(data.aiConfig);
          } else {
            alert('Invalid configuration file');
          }
        } else {
          updateParams(data.params);
          if (data.options) setOptions(prev => ({ ...prev, ...data.options }));
          if (data.settings) updateSettings(data.settings);
          if (data.aiConfig) saveAIConfig(data.aiConfig);
        }
      } catch (err) {
        alert('Failed to load configuration: ' + err.message);
      }

      e.target.value = '';
    },
    [updateParams, setOptions, updateSettings]
  );

  // Handle creating scenario from optimizer results (navigates to scenarios tab)
  const handleCreateScenarioFromOptimizer = useCallback((conversions, strategyName) => {
    // Store the scenario data
    setPendingScenario({
      name: `Optimizer: ${strategyName}`,
      description: `Generated from optimization - ${strategyName}`,
      overrides: { rothConversions: conversions },
      createdAt: Date.now(),
    });
    // Switch to scenarios tab
    setActiveTab('scenarios');
  }, []);

  // Handle creating scenario from chat (does NOT navigate - stays in chat)
  const handleCreateScenarioFromChat = useCallback((overrides, scenarioName) => {
    // Store the scenario data without navigating
    setPendingScenario({
      name: scenarioName || 'AI Scenario',
      description: 'Created by AI Assistant',
      overrides: overrides || {},
      createdAt: Date.now(),
    });
    // DO NOT navigate - let user stay in chat
  }, []);

  // Callback for ScenarioComparison to report scenarios to Chat
  const handleScenariosChange = useCallback(scenarios => {
    setChatScenarios(scenarios);
  }, []);

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
      data-testid="app-loaded"
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

          {/* Hidden file input for Load fallback */}
          <input
            ref={configFileInputRef}
            type="file"
            accept=".json"
            onChange={handleConfigImport}
            className="hidden"
          />

          {/* State Management Buttons - Save Dropdown */}
          <div className="relative" ref={saveMenuRef}>
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className="px-2 py-1 bg-slate-700 text-white rounded text-xs flex items-center gap-1 hover:bg-slate-600"
              title="Save current state"
            >
              <Save className="w-3 h-3" />
              Save
              <ChevronDown className="w-3 h-3" />
            </button>
            {showSaveMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded shadow-lg z-50">
                <button
                  onClick={() => {
                    setShowSaveDialog(true);
                    setShowSaveMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2"
                >
                  <span className="text-blue-400">Browser</span>
                  <span className="text-slate-400">localStorage</span>
                </button>
                <button
                  onClick={() => {
                    handleSaveToFile();
                    setShowSaveMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2"
                >
                  <span className="text-emerald-400">JSON File</span>
                  <span className="text-slate-400">download</span>
                </button>
              </div>
            )}
          </div>

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
              <div className="absolute right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
                {/* JSON File option */}
                <button
                  onClick={() => {
                    handleLoadFromFile();
                    setShowLoadMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-slate-700 border-b border-slate-700 flex items-center gap-2"
                >
                  <span className="text-emerald-400">JSON File</span>
                  <span className="text-slate-400">from disk</span>
                </button>
                {/* Browser localStorage section */}
                <div className="px-3 py-1.5 text-slate-500 text-xs bg-slate-900/50 flex items-center gap-2">
                  <span className="text-blue-400">Browser</span>
                  <span>saved states</span>
                </div>
                {savedStates.length === 0 ? (
                  <div className="px-3 py-2 text-slate-500 text-xs italic">
                    No saved states in browser
                  </div>
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
            onClick={() => {
              if (window.confirm('Start a new session? This will clear all current data.')) {
                resetToDefaults();
              }
            }}
            className="px-2 py-1 bg-amber-600 text-white rounded text-xs flex items-center gap-1 hover:bg-amber-500"
            title="Start a new session with default values"
          >
            <RotateCcw className="w-3 h-3" />
            New
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
              {TABS.map(tab => {
                // Chat tab toggles panel visibility instead of switching tabs
                const isActive = tab.id === 'chat' ? chatPanel.visible : activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'chat') {
                        chatPanel.toggleVisible();
                      } else {
                        setActiveTab(tab.id);
                        if (
                          splitView &&
                          (tab.id === 'scenarios' || tab.id === 'optimize' || tab.id === 'settings')
                        ) {
                          setSplitView(false);
                        }
                      }
                    }}
                    onMouseEnter={() => {
                      // Preload component on hover for faster tab switching
                      const preload = preloadMap[tab.id];
                      if (preload) preload();
                    }}
                    className={`h-full px-3 flex items-center gap-1.5 border-b-2 text-xs transition-colors ${
                      isActive && !splitView
                        ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
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

          {/* Content + Chat wrapper */}
          <div
            ref={chatPanel.containerRef}
            className={`flex-1 flex overflow-hidden relative ${
              chatPanel.visible && chatPanel.position === 'top' ? 'flex-col' : 'flex-row'
            }`}
            style={{
              cursor: chatPanel.isResizing
                ? chatPanel.position === 'right'
                  ? 'col-resize'
                  : 'row-resize'
                : 'auto',
            }}
          >
            {/* Drop zone indicators */}
            {chatPanel.isDragging && (
              <>
                {/* Right drop zone */}
                <div
                  className={`absolute z-50 pointer-events-none transition-opacity duration-150 ${
                    chatPanel.dropZone === 'right' ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '120px',
                    background: 'linear-gradient(to left, rgba(59, 130, 246, 0.3), transparent)',
                    borderRight: '3px solid rgb(59, 130, 246)',
                  }}
                />
                {/* Top drop zone */}
                <div
                  className={`absolute z-50 pointer-events-none transition-opacity duration-150 ${
                    chatPanel.dropZone === 'top' ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    left: 0,
                    right: 0,
                    top: 0,
                    height: '100px',
                    background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.3), transparent)',
                    borderTop: '3px solid rgb(59, 130, 246)',
                  }}
                />
              </>
            )}

            {/* TOP POSITION: Chat panel above content */}
            {chatPanel.visible && chatPanel.position === 'top' && (
              <>
                {/* Chat panel */}
                <div
                  className="flex flex-col overflow-hidden bg-slate-950 border-b border-slate-700 shrink-0"
                  style={{
                    height: `${chatPanel.size}px`,
                    transition: chatPanel.isResizing ? 'none' : 'height 0.15s ease',
                  }}
                >
                  <Chat
                    params={params}
                    projections={projections}
                    summary={summary}
                    scenarios={chatScenarios}
                    onCreateScenario={handleCreateScenarioFromChat}
                    onUpdateParams={updateParams}
                    onNavigate={tab => setActiveTab(tab)}
                    settings={settings}
                    options={options}
                    panelMode={true}
                    onClose={chatPanel.hide}
                    onDragStart={chatPanel.startDrag}
                    isDragging={chatPanel.isDragging}
                  />
                </div>
                {/* Resize handle */}
                <div
                  className={`h-1 w-full cursor-row-resize shrink-0 flex items-center justify-center group ${
                    chatPanel.isResizing ? 'bg-blue-500' : 'bg-slate-700 hover:bg-blue-500'
                  }`}
                  onMouseDown={chatPanel.startResize}
                >
                  <GripHorizontal className="w-4 h-4 text-slate-500 group-hover:text-white" />
                </div>
              </>
            )}

            {/* Main tab content area */}
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
                        pendingScenario={pendingScenario}
                        onPendingScenarioConsumed={() => setPendingScenario(null)}
                        onScenariosChange={handleScenariosChange}
                        onApplyScenario={updateParams}
                        settings={settings}
                        options={options}
                      />
                    )}

                    {activeTab === 'optimize' && (
                      <Optimization
                        params={params}
                        projections={projections}
                        summary={summary}
                        updateParams={updateParams}
                        onCreateScenario={handleCreateScenarioFromOptimizer}
                        settings={settings}
                        options={options}
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

            {/* RIGHT POSITION: Resize handle + Chat panel */}
            {chatPanel.visible && chatPanel.position === 'right' && (
              <>
                {/* Resize handle */}
                <div
                  className={`w-1 h-full cursor-col-resize shrink-0 flex items-center justify-center group ${
                    chatPanel.isResizing ? 'bg-blue-500' : 'bg-slate-700 hover:bg-blue-500'
                  }`}
                  onMouseDown={chatPanel.startResize}
                >
                  <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-white" />
                </div>
                {/* Chat panel */}
                <div
                  className="flex flex-col overflow-hidden bg-slate-950 border-l border-slate-700 shrink-0"
                  style={{
                    width: `${chatPanel.size}px`,
                    transition: chatPanel.isResizing ? 'none' : 'width 0.15s ease',
                  }}
                >
                  <Chat
                    params={params}
                    projections={projections}
                    summary={summary}
                    scenarios={chatScenarios}
                    onCreateScenario={handleCreateScenarioFromChat}
                    onUpdateParams={updateParams}
                    onNavigate={tab => setActiveTab(tab)}
                    settings={settings}
                    options={options}
                    panelMode={true}
                    onClose={chatPanel.hide}
                    onDragStart={chatPanel.startDrag}
                    isDragging={chatPanel.isDragging}
                  />
                </div>
              </>
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

      <UpdatePrompt />
    </div>
  );
}
