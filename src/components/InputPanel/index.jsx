/**
 * InputPanel Component
 * 
 * Left sidebar containing all model inputs organized in collapsible sections:
 * - Starting Accounts (AT, IRA, Roth, Cost Basis)
 * - Roth Conversions (by year)
 * - Returns & Risk (account-based or risk-based)
 * - Income (Social Security, COLA)
 * - Expenses (Annual, Inflation)
 * - Tax Parameters (State rate, bracket inflation, MAGI history)
 * - Survivor Scenario
 * - Heir Parameters
 * 
 * Features:
 * - Collapsible sections with icons
 * - Real-time validation
 * - Currency/percentage formatting on blur
 * - Calculated totals displayed
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, DollarSign, TrendingUp,
  Zap, BarChart3, Percent, Heart, Users, Plus, X, Calendar
} from 'lucide-react';
import { fmt$, fmtPct } from '../../lib/formatters';

// Collapsible section wrapper
function InputSection({ title, icon: Icon, expanded, onToggle, color, children }) {
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    cyan: 'text-cyan-400 bg-cyan-400/10',
    rose: 'text-rose-400 bg-rose-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
    pink: 'text-pink-400 bg-pink-400/10',
    indigo: 'text-indigo-400 bg-indigo-400/10',
  };
  
  return (
    <div className="border-b border-slate-800">
      <button 
        onClick={onToggle} 
        className="w-full px-2 py-1.5 flex items-center gap-1.5 hover:bg-slate-800/50"
      >
        {expanded 
          ? <ChevronDown className="w-3 h-3 text-slate-400" /> 
          : <ChevronRight className="w-3 h-3 text-slate-400" />
        }
        <div className={`p-0.5 rounded ${colorClasses[color]}`}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-slate-300 text-xs">{title}</span>
      </button>
      {expanded && <div className="px-2 pb-2 pl-6">{children}</div>}
    </div>
  );
}

// Individual parameter input
function ParamInput({ label, value, onChange, format = '$', min, max }) {
  const [localValue, setLocalValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const displayValue = format === '$' 
    ? `$${value.toLocaleString()}`
    : format === '%' 
      ? `${(value * 100).toFixed(1)}%`
      : value;
  
  const handleFocus = () => {
    setIsEditing(true);
    setLocalValue(format === '%' ? (value * 100).toString() : value.toString());
  };
  
  const handleBlur = () => {
    setIsEditing(false);
    let parsed = parseFloat(localValue.replace(/[,$%]/g, ''));
    if (!isNaN(parsed)) {
      if (format === '%') parsed = parsed / 100;
      if (min !== undefined) parsed = Math.max(min, parsed);
      if (max !== undefined) parsed = Math.min(max, parsed);
      onChange(parsed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-400 text-xs">{label}</span>
      <input
        type="text"
        value={isEditing ? localValue : displayValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-24 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

export function InputPanel({ params, updateParam, updateRothConversion, updateExpenseOverride, updateATHarvest }) {
  const [expanded, setExpanded] = useState(['accounts', 'conversions']);
  const [newExpenseYear, setNewExpenseYear] = useState('');
  const [newHarvestYear, setNewHarvestYear] = useState('');
  
  const toggle = (section) => {
    setExpanded(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) 
        : [...prev, section]
    );
  };
  
  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0 overflow-hidden">
      <div className="p-2 border-b border-slate-700 text-xs font-medium text-slate-300">
        Model Inputs
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Starting Accounts */}
        <InputSection 
          title="Starting Accounts" 
          icon={DollarSign} 
          expanded={expanded.includes('accounts')} 
          onToggle={() => toggle('accounts')} 
          color="emerald"
        >
          <ParamInput 
            label="After-Tax" 
            value={params.afterTaxStart} 
            onChange={(v) => updateParam('afterTaxStart', v)} 
          />
          <ParamInput 
            label="Traditional IRA" 
            value={params.iraStart} 
            onChange={(v) => updateParam('iraStart', v)} 
          />
          <ParamInput 
            label="Roth IRA" 
            value={params.rothStart} 
            onChange={(v) => updateParam('rothStart', v)} 
          />
          <ParamInput 
            label="AT Cost Basis" 
            value={params.afterTaxCostBasis} 
            onChange={(v) => updateParam('afterTaxCostBasis', v)} 
          />
          <div className="mt-1 pt-1 border-t border-slate-700 flex justify-between text-xs">
            <span className="text-slate-400">Total</span>
            <span className="text-emerald-400 font-medium">
              {fmt$(params.afterTaxStart + params.iraStart + params.rothStart)}
            </span>
          </div>
        </InputSection>
        
        {/* Roth Conversions */}
        <InputSection 
          title="Roth Conversions" 
          icon={Zap} 
          expanded={expanded.includes('conversions')} 
          onToggle={() => toggle('conversions')} 
          color="blue"
        >
          {[2026, 2027, 2028, 2029, 2030].map(year => (
            <ParamInput 
              key={year}
              label={year.toString()} 
              value={params.rothConversions[year] || 0} 
              onChange={(v) => updateRothConversion(year, v)} 
            />
          ))}
        </InputSection>
        
        {/* Returns & Risk */}
        <InputSection 
          title="Returns & Risk" 
          icon={TrendingUp} 
          expanded={expanded.includes('returns')} 
          onToggle={() => toggle('returns')} 
          color="purple"
        >
          <div className="mb-2 p-1.5 bg-slate-800 rounded flex items-center gap-1">
            <span className="text-slate-400 text-xs">Mode:</span>
            <select 
              value={params.returnMode} 
              onChange={(e) => updateParam('returnMode', e.target.value)}
              className="bg-slate-700 text-xs rounded px-1 py-0.5 flex-1"
            >
              <option value="account">Account-Based</option>
              <option value="blended">Risk-Based</option>
            </select>
          </div>
          
          {params.returnMode === 'account' ? (
            <>
              <ParamInput label="AT Return" value={params.atReturn} onChange={(v) => updateParam('atReturn', v)} format="%" />
              <ParamInput label="IRA Return" value={params.iraReturn} onChange={(v) => updateParam('iraReturn', v)} format="%" />
              <ParamInput label="Roth Return" value={params.rothReturn} onChange={(v) => updateParam('rothReturn', v)} format="%" />
            </>
          ) : (
            <>
              <ParamInput label="Low Risk Target" value={params.lowRiskTarget} onChange={(v) => updateParam('lowRiskTarget', v)} />
              <ParamInput label="Mod Risk Target" value={params.modRiskTarget} onChange={(v) => updateParam('modRiskTarget', v)} />
              <div className="mt-1 pt-1 border-t border-slate-700">
                <ParamInput label="Low Return" value={params.lowRiskReturn} onChange={(v) => updateParam('lowRiskReturn', v)} format="%" />
                <ParamInput label="Mod Return" value={params.modRiskReturn} onChange={(v) => updateParam('modRiskReturn', v)} format="%" />
                <ParamInput label="High Return" value={params.highRiskReturn} onChange={(v) => updateParam('highRiskReturn', v)} format="%" />
              </div>
            </>
          )}
        </InputSection>
        
        {/* Income */}
        <InputSection 
          title="Social Security" 
          icon={DollarSign} 
          expanded={expanded.includes('income')} 
          onToggle={() => toggle('income')} 
          color="cyan"
        >
          <ParamInput label="Monthly (2026)" value={params.socialSecurityMonthly} onChange={(v) => updateParam('socialSecurityMonthly', v)} />
          <ParamInput label="COLA" value={params.ssCOLA} onChange={(v) => updateParam('ssCOLA', v)} format="%" />
        </InputSection>
        
        {/* Expenses */}
        <InputSection
          title="Expenses"
          icon={BarChart3}
          expanded={expanded.includes('expenses')}
          onToggle={() => toggle('expenses')}
          color="rose"
        >
          <ParamInput label="Annual" value={params.annualExpenses} onChange={(v) => updateParam('annualExpenses', v)} />
          <ParamInput label="Inflation" value={params.expenseInflation} onChange={(v) => updateParam('expenseInflation', v)} format="%" />
        </InputSection>

        {/* Expense Overrides */}
        <InputSection
          title="Expense Overrides"
          icon={Calendar}
          expanded={expanded.includes('expenseOverrides')}
          onToggle={() => toggle('expenseOverrides')}
          color="rose"
        >
          {Object.keys(params.expenseOverrides || {}).length === 0 ? (
            <div className="text-slate-500 text-xs mb-2">No year-specific overrides</div>
          ) : (
            Object.entries(params.expenseOverrides || {})
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([year, amount]) => (
                <div key={year} className="flex items-center gap-1 py-0.5">
                  <span className="text-slate-400 text-xs w-10">{year}</span>
                  <input
                    type="text"
                    value={`$${amount.toLocaleString()}`}
                    onFocus={(e) => e.target.value = amount.toString()}
                    onBlur={(e) => {
                      const parsed = parseFloat(e.target.value.replace(/[,$]/g, ''));
                      if (!isNaN(parsed) && parsed > 0) {
                        updateExpenseOverride(Number(year), parsed);
                      }
                      e.target.value = `$${(parsed || amount).toLocaleString()}`;
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    className="flex-1 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => updateExpenseOverride(Number(year), null)}
                    className="p-0.5 text-slate-500 hover:text-red-400"
                    title="Remove override"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
          )}
          {/* Add new year */}
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-700">
            <input
              type="text"
              value={newExpenseYear}
              onChange={(e) => setNewExpenseYear(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const year = parseInt(newExpenseYear);
                  if (year >= 2026 && year <= 2060 && !params.expenseOverrides?.[year]) {
                    updateExpenseOverride(year, params.annualExpenses);
                    setNewExpenseYear('');
                  }
                }
              }}
              placeholder="Year"
              className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => {
                const year = parseInt(newExpenseYear);
                if (year >= 2026 && year <= 2060 && !params.expenseOverrides?.[year]) {
                  updateExpenseOverride(year, params.annualExpenses);
                  setNewExpenseYear('');
                }
              }}
              className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
            >
              <Plus className="w-3 h-3" />
              Add Year
            </button>
          </div>
          <div className="text-slate-600 text-xs mt-1">
            Override annual expense (in today's dollars)
          </div>
        </InputSection>

        {/* AT Harvest Overrides */}
        <InputSection
          title="AT Harvest (Cap Gains)"
          icon={TrendingUp}
          expanded={expanded.includes('atHarvest')}
          onToggle={() => toggle('atHarvest')}
          color="purple"
        >
          {Object.keys(params.atHarvestOverrides || {}).length === 0 ? (
            <div className="text-slate-500 text-xs mb-2">No year-specific harvests</div>
          ) : (
            Object.entries(params.atHarvestOverrides || {})
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([year, amount]) => (
                <div key={year} className="flex items-center gap-1 py-0.5">
                  <span className="text-slate-400 text-xs w-10">{year}</span>
                  <input
                    type="text"
                    value={`$${amount.toLocaleString()}`}
                    onFocus={(e) => e.target.value = amount.toString()}
                    onBlur={(e) => {
                      const parsed = parseFloat(e.target.value.replace(/[,$]/g, ''));
                      if (!isNaN(parsed) && parsed > 0) {
                        updateATHarvest(Number(year), parsed);
                      }
                      e.target.value = `$${(parsed || amount).toLocaleString()}`;
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    className="flex-1 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => updateATHarvest(Number(year), null)}
                    className="p-0.5 text-slate-500 hover:text-red-400"
                    title="Remove harvest"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
          )}
          {/* Add new year */}
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-700">
            <input
              type="text"
              value={newHarvestYear}
              onChange={(e) => setNewHarvestYear(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const year = parseInt(newHarvestYear);
                  if (year >= 2026 && year <= 2060 && !params.atHarvestOverrides?.[year]) {
                    updateATHarvest(year, 50000); // Default $50K harvest
                    setNewHarvestYear('');
                  }
                }
              }}
              placeholder="Year"
              className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => {
                const year = parseInt(newHarvestYear);
                if (year >= 2026 && year <= 2060 && !params.atHarvestOverrides?.[year]) {
                  updateATHarvest(year, 50000);
                  setNewHarvestYear('');
                }
              }}
              className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
            >
              <Plus className="w-3 h-3" />
              Add Year
            </button>
          </div>
          <div className="text-slate-600 text-xs mt-1">
            Extra AT liquidation for capital gains harvesting
          </div>
        </InputSection>

        {/* Tax Parameters */}
        <InputSection 
          title="Tax Parameters" 
          icon={Percent} 
          expanded={expanded.includes('tax')} 
          onToggle={() => toggle('tax')} 
          color="orange"
        >
          <ParamInput label="IL State Tax" value={params.stateTaxRate} onChange={(v) => updateParam('stateTaxRate', v)} format="%" />
          <ParamInput label="Cap Gains %" value={params.capitalGainsPercent} onChange={(v) => updateParam('capitalGainsPercent', v)} format="%" />
          <ParamInput label="Bracket Inflation" value={params.bracketInflation} onChange={(v) => updateParam('bracketInflation', v)} format="%" />
          <div className="mt-1 pt-1 border-t border-slate-700">
            <ParamInput label="2024 MAGI" value={params.magi2024} onChange={(v) => updateParam('magi2024', v)} />
            <ParamInput label="2025 MAGI" value={params.magi2025} onChange={(v) => updateParam('magi2025', v)} />
          </div>
        </InputSection>
        
        {/* Survivor Scenario */}
        <InputSection 
          title="Survivor Scenario" 
          icon={Heart} 
          expanded={expanded.includes('survivor')} 
          onToggle={() => toggle('survivor')} 
          color="pink"
        >
          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-400 text-xs">Death Year</span>
            <input
              type="text"
              value={params.survivorDeathYear || ''}
              onChange={(e) => updateParam('survivorDeathYear', e.target.value ? parseInt(e.target.value) : null)}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              placeholder="none"
              className="w-20 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs"
            />
          </div>
          <ParamInput label="Survivor SS %" value={params.survivorSSPercent} onChange={(v) => updateParam('survivorSSPercent', v)} format="%" />
          <ParamInput label="Survivor Exp %" value={params.survivorExpensePercent} onChange={(v) => updateParam('survivorExpensePercent', v)} format="%" />
        </InputSection>
        
        {/* Heir Parameters - Now configured in Settings */}
        <InputSection
          title="Heir Parameters"
          icon={Users}
          expanded={expanded.includes('heir')}
          onToggle={() => toggle('heir')}
          color="indigo"
        >
          <div className="text-slate-400 text-xs">
            Heirs are now configured in the <span className="text-purple-400 font-medium">Settings</span> tab.
            <div className="mt-2 text-slate-500">
              Configure heir names, states, AGI, and split percentages to compute accurate tax rates for inheritance calculations.
            </div>
          </div>
        </InputSection>
      </div>
    </aside>
  );
}

export default InputPanel;
