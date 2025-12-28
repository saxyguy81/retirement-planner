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

import React, { useState, useCallback } from 'react';
import { Calculator, Table, LineChart, Shield, Users, RefreshCw, GitCompare, Zap, Download } from 'lucide-react';

import { useProjections } from './hooks/useProjections';
import { InputPanel } from './components/InputPanel';
import { ProjectionsTable } from './components/ProjectionsTable';
import { ChartsView } from './components/ChartsView';
import { RiskAllocation } from './components/RiskAllocation';
import { HeirAnalysis } from './components/HeirAnalysis';
import { ScenarioComparison } from './components/ScenarioComparison';
import { Optimization } from './components/Optimization';
import { exportToExcel } from './lib/excelExport';

const TABS = [
  { id: 'projections', icon: Table, label: 'Projections' },
  { id: 'charts', icon: LineChart, label: 'Charts' },
  { id: 'risk', icon: Shield, label: 'Risk Allocation' },
  { id: 'heir', icon: Users, label: 'Heir Analysis' },
  { id: 'scenarios', icon: GitCompare, label: 'Scenarios' },
  { id: 'optimize', icon: Zap, label: 'Optimize' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('projections');
  const [riskYear, setRiskYear] = useState(2028);

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

  // Excel export handler
  const handleExport = useCallback(() => {
    exportToExcel({
      projections,
      summary,
      params,
      filename: 'retirement-projections',
    });
  }, [projections, summary, params]);
  
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

          {/* Export button */}
          <button
            onClick={handleExport}
            className="ml-4 px-2 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1 hover:bg-blue-500"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
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
          <div className="h-9 bg-slate-900 border-b border-slate-700 flex items-center px-1 shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-full px-3 flex items-center gap-1.5 border-b-2 text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'projections' && (
              <ProjectionsTable 
                projections={projections} 
                options={options}
              />
            )}
            
            {activeTab === 'charts' && (
              <ChartsView projections={projections} />
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
          </div>
        </main>
      </div>
    </div>
  );
}
