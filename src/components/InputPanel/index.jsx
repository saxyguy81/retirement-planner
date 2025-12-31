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

import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Zap,
  BarChart3,
  Percent,
  Users,
  User,
  Plus,
  X,
  Calendar,
  Calculator,
  Trash2,
  Home,
} from 'lucide-react';
import { useState } from 'react';

import { SmartYearInput } from './SmartYearInput';
import { getFederalMarginalRate, getStateMarginalRate } from '../../lib/calculations';
import { fmt$ } from '../../lib/formatters';

// Common US states for heir dropdown
const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
];

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
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-slate-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-slate-400" />
        )}
        <div className={`p-0.5 rounded ${colorClasses[color]}`}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-slate-300 text-xs">{title}</span>
      </button>
      {expanded && <div className="px-2 pb-2 pl-6">{children}</div>}
    </div>
  );
}

// Individual parameter input with optional validation
function ParamInput({ label, value, onChange, format = '$', min, max, validate, helpText }) {
  const [localValue, setLocalValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);

  const displayValue =
    format === '$'
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

      // Custom validation
      if (validate) {
        const validationResult = validate(parsed);
        if (validationResult !== true && validationResult !== null) {
          setError(typeof validationResult === 'string' ? validationResult : 'Invalid value');
          return;
        }
      }

      setError(null);
      onChange(parsed);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <div className="py-0.5">
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-xs">{label}</span>
        <input
          type="text"
          value={isEditing ? localValue : displayValue}
          onChange={e => setLocalValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-24 text-right bg-slate-800 border rounded px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-slate-700 focus:border-blue-500'
          }`}
        />
      </div>
      {error && <div className="text-rose-400 text-[10px] mt-0.5 text-right">{error}</div>}
      {helpText && !error && (
        <div className="text-slate-500 text-[10px] mt-0.5 text-right">{helpText}</div>
      )}
    </div>
  );
}

export function InputPanel({
  params,
  settings,
  updateParam,
  _updateParams,
  updateRothConversion,
  updateExpenseOverride,
  updateATHarvest,
  options,
  setOptions,
  updateSettings,
}) {
  const [expanded, setExpanded] = useState(['timeline', 'profile', 'accounts']);
  const [newExpenseYear, setNewExpenseYear] = useState('');
  const [newHarvestYear, setNewHarvestYear] = useState('');
  const [newConversionYear, setNewConversionYear] = useState('');
  // Track which dollar input is being edited and its current value
  const [editingInput, setEditingInput] = useState({ key: null, value: '' });

  // Get birthYear from settings or params for SmartYearInput
  const birthYear = settings?.primaryBirthYear || params?.birthYear || 1955;

  // Helper to update a specific heir
  const updateHeir = (index, updates) => {
    const newHeirs = [...(params.heirs || [])];
    newHeirs[index] = { ...newHeirs[index], ...updates };
    updateParam('heirs', newHeirs);
  };

  // Helper to add a new heir
  const addHeir = () => {
    const newHeirs = [
      ...(params.heirs || []),
      {
        name: `Heir ${(params.heirs || []).length + 1}`,
        state: 'IL',
        agi: 200000,
        splitPercent: 0,
        taxableRoR: 0.06,
      },
    ];
    updateParam('heirs', newHeirs);
  };

  // Helper to remove an heir
  const removeHeir = index => {
    const newHeirs = (params.heirs || []).filter((_, i) => i !== index);
    updateParam('heirs', newHeirs);
  };

  const toggle = section => {
    setExpanded(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0 overflow-hidden">
      <div className="p-2 border-b border-slate-700 text-xs font-medium text-slate-300">
        Model Inputs
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Timeline Section */}
        <InputSection
          title="Timeline"
          icon={Calendar}
          expanded={expanded.includes('timeline')}
          onToggle={() => toggle('timeline')}
          color="blue"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-500 text-[10px] mb-0.5">Start Year</label>
              <input
                type="number"
                value={params.startYear || 2025}
                onChange={e => updateParam('startYear', parseInt(e.target.value) || 2025)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] mb-0.5">End Year</label>
              <input
                type="number"
                value={params.endYear || 2054}
                onChange={e => updateParam('endYear', parseInt(e.target.value) || 2054)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="text-slate-500 text-[10px] mt-1">
            Planning horizon: {(params.endYear || 2054) - (params.startYear || 2025) + 1} years
          </div>
        </InputSection>

        {/* Profile & Life Events Section */}
        <InputSection
          title="Profile & Life Events"
          icon={User}
          expanded={expanded.includes('profile')}
          onToggle={() => toggle('profile')}
          color="blue"
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 text-[10px] mb-0.5">Primary Name</label>
                <input
                  type="text"
                  value={settings?.primaryName || ''}
                  onChange={e => updateSettings?.({ primaryName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., John"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] mb-0.5">Birth Year</label>
                <input
                  type="number"
                  value={settings?.primaryBirthYear || ''}
                  onChange={e =>
                    updateSettings?.({ primaryBirthYear: parseInt(e.target.value) || 1960 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 1960"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 text-[10px] mb-0.5">Spouse Name</label>
                <input
                  type="text"
                  value={settings?.spouseName || ''}
                  onChange={e => updateSettings?.({ spouseName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Jane"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] mb-0.5">Spouse Birth</label>
                <input
                  type="number"
                  value={settings?.spouseBirthYear || ''}
                  onChange={e =>
                    updateSettings?.({ spouseBirthYear: parseInt(e.target.value) || 1962 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 1962"
                />
              </div>
            </div>
            <div className="text-slate-500 text-[10px] mt-1">
              Primary birth year is used for age and RMD calculations
            </div>

            {/* Survivor Scenario */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="text-slate-400 text-xs font-medium mb-2">Survivor Scenario</div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-400 text-xs">Death Year</span>
                <input
                  type="text"
                  value={params.survivorDeathYear || ''}
                  onChange={e =>
                    updateParam(
                      'survivorDeathYear',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                  placeholder="none"
                  className="w-20 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs"
                />
              </div>
              <ParamInput
                label="Survivor SS %"
                value={params.survivorSSPercent}
                onChange={v => updateParam('survivorSSPercent', v)}
                format="%"
              />
              <ParamInput
                label="Survivor Exp %"
                value={params.survivorExpensePercent}
                onChange={v => updateParam('survivorExpensePercent', v)}
                format="%"
              />
            </div>
          </div>
        </InputSection>

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
            onChange={v => updateParam('afterTaxStart', v)}
          />
          <ParamInput
            label="Traditional IRA"
            value={params.iraStart}
            onChange={v => updateParam('iraStart', v)}
          />
          <ParamInput
            label="Roth IRA"
            value={params.rothStart}
            onChange={v => updateParam('rothStart', v)}
          />
          <ParamInput
            label="AT Cost Basis"
            value={params.afterTaxCostBasis}
            onChange={v => updateParam('afterTaxCostBasis', v)}
          />
          <div className="mt-1 pt-1 border-t border-slate-700 flex justify-between text-xs">
            <span className="text-slate-400">Total</span>
            <span className="text-emerald-400 font-medium">
              {fmt$(params.afterTaxStart + params.iraStart + params.rothStart)}
            </span>
          </div>
        </InputSection>

        {/* Social Security */}
        <InputSection
          title="Social Security"
          icon={DollarSign}
          expanded={expanded.includes('income')}
          onToggle={() => toggle('income')}
          color="cyan"
        >
          <ParamInput
            label="Monthly (2026)"
            value={params.socialSecurityMonthly}
            onChange={v => updateParam('socialSecurityMonthly', v)}
          />
          <ParamInput
            label="COLA"
            value={params.ssCOLA}
            onChange={v => updateParam('ssCOLA', v)}
            format="%"
          />
        </InputSection>

        {/* Expenses (Combined with Overrides) */}
        <InputSection
          title="Expenses"
          icon={BarChart3}
          expanded={expanded.includes('expenses')}
          onToggle={() => toggle('expenses')}
          color="rose"
        >
          <ParamInput
            label="Annual"
            value={params.annualExpenses}
            onChange={v => updateParam('annualExpenses', v)}
          />
          <ParamInput
            label="Inflation"
            value={params.expenseInflation}
            onChange={v => updateParam('expenseInflation', v)}
            format="%"
          />

          {/* Year-specific overrides */}
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-slate-400 text-xs font-medium mb-2">Year-Specific Overrides</div>
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
                      value={
                        editingInput.key === `expense-${year}`
                          ? editingInput.value
                          : `$${amount.toLocaleString()}`
                      }
                      onFocus={() =>
                        setEditingInput({ key: `expense-${year}`, value: amount.toString() })
                      }
                      onChange={e =>
                        setEditingInput({ key: `expense-${year}`, value: e.target.value })
                      }
                      onBlur={() => {
                        const parsed = parseFloat(editingInput.value.replace(/[,$]/g, ''));
                        if (!isNaN(parsed) && parsed > 0) {
                          updateExpenseOverride(Number(year), parsed);
                        }
                        setEditingInput({ key: null, value: '' });
                      }}
                      onKeyDown={e => e.key === 'Enter' && e.target.blur()}
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
            {/* Add new year - supports age or year input */}
            <div className="mt-2 pt-2 border-t border-slate-700">
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <SmartYearInput
                    value={newExpenseYear ? parseInt(newExpenseYear) : null}
                    onChange={year => {
                      if (year && !params.expenseOverrides?.[year]) {
                        setNewExpenseYear(year.toString());
                      }
                    }}
                    birthYear={birthYear}
                    min={2026}
                    max={2060}
                    placeholder="Year or Age"
                  />
                </div>
                <button
                  onClick={() => {
                    const year = parseInt(newExpenseYear);
                    if (year >= 2026 && year <= 2060 && !params.expenseOverrides?.[year]) {
                      updateExpenseOverride(year, params.annualExpenses);
                      setNewExpenseYear('');
                    }
                  }}
                  className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              <div className="text-slate-500 text-[10px] mt-1">
                Enter year (2026-2060) or age (71-105). Overrides inflation-adjusted expense.
              </div>
            </div>
          </div>
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
              onChange={e => updateParam('returnMode', e.target.value)}
              className="bg-slate-700 text-xs rounded px-1 py-0.5 flex-1"
            >
              <option value="account">Account-Based</option>
              <option value="blended">Risk-Based</option>
            </select>
          </div>

          {params.returnMode === 'account' ? (
            <>
              <ParamInput
                label="AT Return"
                value={params.atReturn}
                onChange={v => updateParam('atReturn', v)}
                format="%"
              />
              <ParamInput
                label="IRA Return"
                value={params.iraReturn}
                onChange={v => updateParam('iraReturn', v)}
                format="%"
              />
              <ParamInput
                label="Roth Return"
                value={params.rothReturn}
                onChange={v => updateParam('rothReturn', v)}
                format="%"
              />
            </>
          ) : (
            <>
              <ParamInput
                label="Low Risk Target"
                value={params.lowRiskTarget}
                onChange={v => updateParam('lowRiskTarget', v)}
              />
              <ParamInput
                label="Mod Risk Target"
                value={params.modRiskTarget}
                onChange={v => updateParam('modRiskTarget', v)}
              />
              <div className="mt-1 pt-1 border-t border-slate-700">
                <ParamInput
                  label="Low Return"
                  value={params.lowRiskReturn}
                  onChange={v => updateParam('lowRiskReturn', v)}
                  format="%"
                />
                <ParamInput
                  label="Mod Return"
                  value={params.modRiskReturn}
                  onChange={v => updateParam('modRiskReturn', v)}
                  format="%"
                />
                <ParamInput
                  label="High Return"
                  value={params.highRiskReturn}
                  onChange={v => updateParam('highRiskReturn', v)}
                  format="%"
                />
              </div>
            </>
          )}
        </InputSection>

        {/* Tax Strategies - Combined Roth Conversions + AT Harvest */}
        <InputSection
          title="Tax Strategies"
          icon={Zap}
          expanded={expanded.includes('taxStrategies')}
          onToggle={() => toggle('taxStrategies')}
          color="blue"
        >
          {/* Roth Conversions */}
          <div className="mb-4">
            <div className="text-slate-400 text-xs font-medium mb-2">Roth Conversions</div>
            {Object.keys(params.rothConversions || {}).length === 0 ? (
              <div className="text-slate-500 text-xs mb-2">No conversions scheduled</div>
            ) : (
              Object.entries(params.rothConversions || {})
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([year, amount]) => (
                  <div key={year} className="flex items-center gap-1 py-0.5">
                    <span className="text-slate-400 text-xs w-10">{year}</span>
                    <input
                      type="text"
                      value={
                        editingInput.key === `roth-${year}`
                          ? editingInput.value
                          : `$${amount.toLocaleString()}`
                      }
                      onFocus={() =>
                        setEditingInput({ key: `roth-${year}`, value: amount.toString() })
                      }
                      onChange={e =>
                        setEditingInput({ key: `roth-${year}`, value: e.target.value })
                      }
                      onBlur={() => {
                        const parsed = parseFloat(editingInput.value.replace(/[,$]/g, ''));
                        if (!isNaN(parsed) && parsed >= 0) {
                          updateRothConversion(Number(year), parsed);
                        }
                        setEditingInput({ key: null, value: '' });
                      }}
                      onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                      className="flex-1 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => updateRothConversion(Number(year), null)}
                      className="p-0.5 text-slate-500 hover:text-red-400"
                      title="Remove conversion"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
            )}
            {/* Add new conversion */}
            <div className="mt-2 pt-2 border-t border-slate-700">
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <SmartYearInput
                    value={newConversionYear ? parseInt(newConversionYear) : null}
                    onChange={year => {
                      if (year && !params.rothConversions?.[year]) {
                        setNewConversionYear(year.toString());
                      }
                    }}
                    birthYear={birthYear}
                    min={params.startYear || 2025}
                    max={params.endYear || 2060}
                    placeholder="Year or Age"
                  />
                </div>
                <button
                  onClick={() => {
                    const year = parseInt(newConversionYear);
                    if (year && !params.rothConversions?.[year]) {
                      updateRothConversion(year, 100000); // Default to $100K
                      setNewConversionYear('');
                    }
                  }}
                  className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              <div className="text-slate-500 text-[10px] mt-1">
                Enter year or age. Conversion amount capped by available IRA balance.
              </div>
            </div>
          </div>

          {/* Capital Gains Harvesting */}
          <div className="pt-3 border-t border-slate-700">
            <div className="text-slate-400 text-xs font-medium mb-2">Capital Gains Harvesting</div>
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
                      value={
                        editingInput.key === `harvest-${year}`
                          ? editingInput.value
                          : `$${amount.toLocaleString()}`
                      }
                      onFocus={() =>
                        setEditingInput({ key: `harvest-${year}`, value: amount.toString() })
                      }
                      onChange={e =>
                        setEditingInput({ key: `harvest-${year}`, value: e.target.value })
                      }
                      onBlur={() => {
                        const parsed = parseFloat(editingInput.value.replace(/[,$]/g, ''));
                        if (!isNaN(parsed) && parsed > 0) {
                          updateATHarvest(Number(year), parsed);
                        }
                        setEditingInput({ key: null, value: '' });
                      }}
                      onKeyDown={e => e.key === 'Enter' && e.target.blur()}
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
            {/* Add new year - supports age or year input */}
            <div className="mt-2 pt-2 border-t border-slate-700">
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <SmartYearInput
                    value={newHarvestYear ? parseInt(newHarvestYear) : null}
                    onChange={year => {
                      if (year && !params.atHarvestOverrides?.[year]) {
                        setNewHarvestYear(year.toString());
                      }
                    }}
                    birthYear={birthYear}
                    min={2026}
                    max={2060}
                    placeholder="Year or Age"
                  />
                </div>
                <button
                  onClick={() => {
                    const year = parseInt(newHarvestYear);
                    if (year >= 2026 && year <= 2060 && !params.atHarvestOverrides?.[year]) {
                      updateATHarvest(year, 50000);
                      setNewHarvestYear('');
                    }
                  }}
                  className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              <div className="text-slate-500 text-[10px] mt-1">
                Enter year (2026-2060) or age (71-105). Extra AT liquidation for cap gains
                harvesting.
              </div>
            </div>
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
          <ParamInput
            label="IL State Tax"
            value={params.stateTaxRate}
            onChange={v => updateParam('stateTaxRate', v)}
            format="%"
          />
          <ParamInput
            label="Cap Gains %"
            value={params.capitalGainsPercent}
            onChange={v => updateParam('capitalGainsPercent', v)}
            format="%"
          />
          <ParamInput
            label="Bracket Inflation"
            value={params.bracketInflation}
            onChange={v => updateParam('bracketInflation', v)}
            format="%"
          />
          <div className="mt-1 pt-1 border-t border-slate-700">
            <ParamInput
              label="2024 MAGI"
              value={params.magi2024}
              onChange={v => updateParam('magi2024', v)}
            />
            <ParamInput
              label="2025 MAGI"
              value={params.magi2025}
              onChange={v => updateParam('magi2025', v)}
            />
          </div>
        </InputSection>

        {/* Property Taxes */}
        <InputSection
          title="Property Taxes"
          icon={Home}
          expanded={expanded.includes('propertyTax')}
          onToggle={() => toggle('propertyTax')}
          color="orange"
        >
          <ParamInput
            label="Annual Property Tax"
            value={params.annualPropertyTax || 0}
            onChange={v => updateParam('annualPropertyTax', v)}
          />
          <div className="text-slate-500 text-[10px] mt-1">
            Subject to SALT cap (${(params.saltCapMarried || 10000).toLocaleString()} MFJ / $
            {(params.saltCapSingle || 10000).toLocaleString()} single)
          </div>
        </InputSection>

        {/* Calculation Options */}
        <InputSection
          title="Calculation Options"
          icon={Calculator}
          expanded={expanded.includes('calc')}
          onToggle={() => toggle('calc')}
          color="purple"
        >
          <div className="space-y-3">
            {/* Iterative Tax Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-xs">Iterative Tax</div>
                <div className="text-slate-500 text-[10px]">
                  Refine tax estimate over iterations
                </div>
              </div>
              <button
                onClick={() =>
                  setOptions && setOptions(prev => ({ ...prev, iterativeTax: !prev.iterativeTax }))
                }
                className={`px-2 py-0.5 rounded text-xs ${
                  (options?.iterativeTax ?? params.iterativeTax)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {(options?.iterativeTax ?? params.iterativeTax) ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Max Iterations */}
            {(options?.iterativeTax ?? params.iterativeTax) && (
              <div>
                <label className="block text-slate-400 text-xs mb-1">Max Iterations</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 5, 10].map(n => (
                    <button
                      key={n}
                      onClick={() =>
                        setOptions && setOptions(prev => ({ ...prev, maxIterations: n }))
                      }
                      className={`px-2 py-0.5 rounded text-xs flex-1 ${
                        (options?.maxIterations ?? params.maxIterations) === n
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Discount Rate */}
            <ParamInput
              label="Discount Rate (PV)"
              value={params.discountRate ?? 0.03}
              onChange={v => updateParam('discountRate', v)}
              format="%"
              min={0}
              max={0.15}
            />
            <div className="text-slate-500 text-[10px]">Used for present value calculations</div>
          </div>
        </InputSection>

        {/* Heir Configuration */}
        <InputSection
          title="Heirs"
          icon={Users}
          expanded={expanded.includes('heir')}
          onToggle={() => toggle('heir')}
          color="indigo"
        >
          <div className="space-y-3">
            {/* Heir list */}
            {(params.heirs || []).map((heir, index) => {
              const fedRate = getFederalMarginalRate(heir.agi || 0);
              const stateRate = getStateMarginalRate(heir.state || 'IL', heir.agi || 0);
              const combinedRate = fedRate + stateRate;

              return (
                <div key={index} className="p-2 bg-slate-800 rounded border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={heir.name || ''}
                      onChange={e => updateHeir(index, { name: e.target.value })}
                      className="bg-transparent text-slate-200 text-xs font-medium w-20 focus:outline-none"
                      placeholder="Name"
                    />
                    <button
                      onClick={() => removeHeir(index)}
                      className="p-0.5 text-slate-500 hover:text-red-400"
                      title="Remove heir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-0.5">State</label>
                      <select
                        value={heir.state || 'IL'}
                        onChange={e => updateHeir(index, { state: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                      >
                        {US_STATES.map(st => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-0.5">Birth Year</label>
                      <input
                        type="number"
                        value={heir.birthYear || 1980}
                        onChange={e =>
                          updateHeir(index, { birthYear: parseInt(e.target.value) || 1980 })
                        }
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                        placeholder="e.g., 1980"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-0.5">Split %</label>
                      <input
                        type="number"
                        value={heir.splitPercent || 0}
                        onChange={e =>
                          updateHeir(index, { splitPercent: parseInt(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-0.5">AGI ($)</label>
                      <input
                        type="number"
                        value={heir.agi || 0}
                        onChange={e => updateHeir(index, { agi: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] mb-0.5">Taxable RoR</label>
                      <input
                        type="number"
                        step="0.01"
                        value={((heir.taxableRoR || 0.06) * 100).toFixed(1)}
                        onChange={e =>
                          updateHeir(index, {
                            taxableRoR: parseFloat(e.target.value) / 100 || 0.06,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="mt-2 pt-1 border-t border-slate-700 text-[10px] text-slate-400 flex justify-between">
                    <span>Tax Rate:</span>
                    <span>
                      Fed <span className="text-amber-400">{(fedRate * 100).toFixed(0)}%</span>
                      {' + '}
                      State <span className="text-blue-400">{(stateRate * 100).toFixed(1)}%</span>
                      {' = '}
                      <span className="text-rose-400">{(combinedRate * 100).toFixed(1)}%</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Add heir button */}
            <button
              onClick={addHeir}
              className="w-full px-2 py-1.5 bg-slate-700 text-slate-300 rounded text-xs flex items-center justify-center gap-1 hover:bg-slate-600"
            >
              <Plus className="w-3 h-3" />
              Add Heir
            </button>

            {/* Split total warning */}
            {(params.heirs || []).length > 0 && (
              <div className="text-[10px] text-slate-500">
                Total split:{' '}
                {(params.heirs || []).reduce((sum, h) => sum + (h.splitPercent || 0), 0)}%
                {(params.heirs || []).reduce((sum, h) => sum + (h.splitPercent || 0), 0) !==
                  100 && <span className="text-amber-400 ml-1">(should equal 100%)</span>}
              </div>
            )}

            {/* Distribution Strategy */}
            <div className="mt-2 pt-2 border-t border-slate-700">
              <label className="block text-slate-400 text-xs mb-1">IRA Distribution Strategy</label>
              <div className="text-slate-500 text-[10px] mb-2">
                RMD requirements auto-determined from owner death age (SECURE Act 2.0)
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => updateParam('heirDistributionStrategy', 'rmd_based')}
                  className={`w-full px-2 py-1.5 rounded text-left text-[10px] ${
                    (params.heirDistributionStrategy || 'rmd_based') === 'rmd_based' ||
                    params.heirDistributionStrategy === 'even' ||
                    params.heirDistributionStrategy === 'year10'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="font-medium">RMD-Based Distribution</div>
                  <div className="opacity-70 mt-0.5">
                    Owner dies &ge;73: Annual RMDs (heir&apos;s SLE) | Owner dies &lt;73: Defer to
                    yr 10
                  </div>
                </button>
                <button
                  onClick={() => updateParam('heirDistributionStrategy', 'lump_sum_year0')}
                  className={`w-full px-2 py-1.5 rounded text-left text-[10px] ${
                    params.heirDistributionStrategy === 'lump_sum_year0'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="font-medium">Lump Sum Year 0</div>
                  <div className="opacity-70 mt-0.5">
                    Immediate full distribution at inheritance
                  </div>
                </button>
              </div>
            </div>

            {/* Taxable RoR note */}
            <div className="text-slate-500 text-[10px] mt-2 p-2 bg-slate-800/50 rounded">
              <strong>Taxable RoR:</strong> Each heir&apos;s expected return after inheritance, used
              to normalize values for fair comparison.
            </div>
          </div>
        </InputSection>
      </div>
    </aside>
  );
}

export default InputPanel;
