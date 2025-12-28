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

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Calculator, Table, LineChart, Shield, Users, RefreshCw, GitCompare, Zap, Download, Upload, ChevronDown, Columns, Square } from 'lucide-react';

import { useProjections } from './hooks/useProjections';
import { InputPanel } from './components/InputPanel';
import { ProjectionsTable } from './components/ProjectionsTable';
import { Dashboard } from './components/Dashboard';
import { RiskAllocation } from './components/RiskAllocation';
import { HeirAnalysis } from './components/HeirAnalysis';
import { ScenarioComparison } from './components/ScenarioComparison';
import { Optimization } from './components/Optimization';
import { SplitPanel } from './components/SplitPanel';
import { exportToExcel, exportToJSON, exportToPDF, importFromJSON, importFromExcel } from './lib/excelExport';

const TABS = [
  { id: 'projections', icon: Table, label: 'Projections' },
  { id: 'dashboard', icon: LineChart, label: 'Dashboard' },
  { id: 'risk', icon: Shield, label: 'Risk Allocation' },
  { id: 'heir', icon: Users, label: 'Heir Analysis' },
  { id: 'scenarios', icon: GitCompare, label: 'Scenarios' },
  { id: 'optimize', icon: Zap, label: 'Optimize' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('projections');
  const [riskYear, setRiskYear] = useState(2028);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
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
    toggleIterative,
    setMaxIterations,
  } = useProjections();

  // Import handler
  const handleImport = useCallback(async (e) => {
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
  }, [updateParams]);

  // Export handlers
  const handleExport = useCallback((format) => {
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
  }, [projections, summary, params]);

  // Split panel view configurations
  const splitPanelViews = useMemo(() => [
    {
      id: 'projections',
      label: 'Projections',
      component: (
        <ProjectionsTable
          projections={projections}
          options={options}
          params={params}
        />
      )
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      component: <Dashboard projections={projections} params={params} />
    },
    {
      id: 'risk',
      label: 'Risk Allocation',
      component: (
        <RiskAllocation
          projections={projections}
          params={params}
          selectedYear={riskYear}
          onYearChange={setRiskYear}
        />
      )
    },
    {
      id: 'heir',
      label: 'Heir Analysis',
      component: (
        <HeirAnalysis
          projections={projections}
          params={params}
        />
      )
    },
  ], [projections, options, params, riskYear]);

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
          {/* Iterative tax toggle */}
          <div className="flex items-center gap-1.5 bg-slate-800 rounded px-2 py-1">
            <RefreshCw className={`w-3 h-3 ${options.iterativeTax ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-xs text-slate-400">Iterative Tax:</span>
            <button
              onClick={toggleIterative}
              className={`px-2 py-0.5 rounded text-xs ${
                options.iterativeTax 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {options.iterativeTax ? 'ON' : 'OFF'}
            </button>
            {options.iterativeTax && (
              <select
                value={options.maxIterations}
                onChange={(e) => setMaxIterations(+e.target.value)}
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
              Final: <span className="text-emerald-400 font-medium">${(summary.endingPortfolio / 1e6).toFixed(1)}M</span>
            </div>
            <div className="text-slate-400">
              Heir: <span className="text-blue-400 font-medium">${(summary.endingHeirValue / 1e6).toFixed(1)}M</span>
            </div>
            <div className="text-slate-400">
              Tax: <span className="text-rose-400 font-medium">${(summary.totalTaxPaid / 1e6).toFixed(1)}M</span>
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
          updateParam={updateParam}
          updateRothConversion={updateRothConversion}
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
                    if (splitView && (tab.id === 'scenarios' || tab.id === 'optimize')) {
                      setSplitView(false);
                    }
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
          <div className="flex-1 overflow-hidden">
            {splitView ? (
              <SplitPanel
                views={splitPanelViews}
                defaultLeftView="projections"
                defaultRightView="dashboard"
              />
            ) : (
              <>
                {activeTab === 'projections' && (
                  <ProjectionsTable
                    projections={projections}
                    options={options}
                    params={params}
                  />
                )}

                {activeTab === 'dashboard' && (
                  <Dashboard projections={projections} params={params} />
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
                  <HeirAnalysis
                    projections={projections}
                    params={params}
                  />
                )}

                {activeTab === 'scenarios' && (
                  <ScenarioComparison
                    params={params}
                    projections={projections}
                    summary={summary}
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
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
