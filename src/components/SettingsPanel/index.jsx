/**
 * SettingsPanel Component
 *
 * Global settings for the retirement planner:
 * - User Profile (names, birth years)
 * - Tax Settings (bonus deduction, state tax, discount rate)
 * - Display Preferences
 * - Tax Bracket Editor (for advanced users)
 */

import React, { useState } from 'react';
import { Settings, User, Calculator, Eye, ChevronDown, ChevronRight, RotateCcw, Users, Plus, Trash2 } from 'lucide-react';
import { TaxBracketEditor } from './TaxBracketEditor';
import { getFederalMarginalRate, getStateMarginalRate } from '../../lib/calculations';

// Common US states for dropdown
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

// Collapsible section wrapper
function SettingsSection({ title, icon: Icon, expanded, onToggle, color, children }) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
  };

  return (
    <div className="border-b border-slate-800">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-slate-800/50"
      >
        {expanded
          ? <ChevronDown className="w-4 h-4 text-slate-400" />
          : <ChevronRight className="w-4 h-4 text-slate-400" />
        }
        <div className={`p-1 rounded ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-slate-200 text-sm font-medium">{title}</span>
      </button>
      {expanded && <div className="px-4 pb-4 pl-10">{children}</div>}
    </div>
  );
}

// Input field component
function SettingsInput({ label, value, onChange, type = 'text', placeholder, helpText }) {
  return (
    <div className="mb-3">
      <label className="block text-slate-400 text-xs mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
      />
      {helpText && <div className="text-slate-500 text-xs mt-1">{helpText}</div>}
    </div>
  );
}

export function SettingsPanel({ settings, updateSettings, resetSettings }) {
  const [expanded, setExpanded] = useState(['profile', 'tax']);

  const toggle = (section) => {
    setExpanded(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" />
          <span className="text-slate-200 font-medium">Global Settings</span>
        </div>
        <button
          onClick={resetSettings}
          className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
          title="Reset to defaults"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {/* User Profile Section */}
        <SettingsSection
          title="User Profile"
          icon={User}
          expanded={expanded.includes('profile')}
          onToggle={() => toggle('profile')}
          color="blue"
        >
          <div className="grid grid-cols-2 gap-4">
            <SettingsInput
              label="Primary Name"
              value={settings.primaryName || ''}
              onChange={(v) => updateSettings({ primaryName: v })}
              placeholder="e.g., John"
            />
            <SettingsInput
              label="Primary Birth Year"
              value={settings.primaryBirthYear || ''}
              onChange={(v) => updateSettings({ primaryBirthYear: parseInt(v) || 1960 })}
              type="number"
              placeholder="e.g., 1960"
            />
            <SettingsInput
              label="Spouse Name"
              value={settings.spouseName || ''}
              onChange={(v) => updateSettings({ spouseName: v })}
              placeholder="e.g., Jane"
            />
            <SettingsInput
              label="Spouse Birth Year"
              value={settings.spouseBirthYear || ''}
              onChange={(v) => updateSettings({ spouseBirthYear: parseInt(v) || 1962 })}
              type="number"
              placeholder="e.g., 1962"
            />
          </div>
          <div className="text-slate-500 text-xs mt-2">
            Primary birth year is used for age and RMD calculations
          </div>
        </SettingsSection>

        {/* Tax Settings Section */}
        <SettingsSection
          title="Tax Settings"
          icon={Calculator}
          expanded={expanded.includes('tax')}
          onToggle={() => toggle('tax')}
          color="emerald"
        >
          <div className="grid grid-cols-2 gap-4">
            <SettingsInput
              label="Tax Year Base"
              value={settings.taxYear || 2024}
              onChange={(v) => updateSettings({ taxYear: parseInt(v) || 2024 })}
              type="number"
              helpText="Base year for tax brackets"
            />
            <SettingsInput
              label="Discount Rate"
              value={((settings.discountRate || 0.03) * 100).toFixed(1)}
              onChange={(v) => updateSettings({ discountRate: parseFloat(v) / 100 || 0.03 })}
              type="number"
              helpText="For present value calculations (%)"
            />
          </div>
          <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-sm font-medium">Exempt SS from Federal Tax</div>
                <div className="text-slate-500 text-xs mt-1">
                  Trump's proposal: Social Security benefits are not included in taxable income
                </div>
              </div>
              <button
                onClick={() => updateSettings({ exemptSSFromTax: !settings.exemptSSFromTax })}
                className={`px-3 py-1 rounded text-xs ${
                  settings.exemptSSFromTax
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {settings.exemptSSFromTax ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </SettingsSection>

        {/* Heirs Configuration Section */}
        <SettingsSection
          title="Heirs"
          icon={Users}
          expanded={expanded.includes('heirs')}
          onToggle={() => toggle('heirs')}
          color="purple"
        >
          <div className="space-y-4">
            <div className="text-slate-500 text-xs">
              Configure heirs for inheritance value calculations. Tax rates are computed from AGI.
            </div>

            {(settings.heirs || []).map((heir, index) => {
              const fedRate = getFederalMarginalRate(heir.agi || 0);
              const stateRate = getStateMarginalRate(heir.state || 'IL', heir.agi || 0);
              const combinedRate = fedRate + stateRate;

              return (
                <div key={index} className="p-3 bg-slate-800 rounded border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-slate-300 text-sm font-medium">
                      Heir {index + 1}: {heir.name || 'Unnamed'}
                    </div>
                    <button
                      onClick={() => {
                        const newHeirs = settings.heirs.filter((_, i) => i !== index);
                        updateSettings({ heirs: newHeirs });
                      }}
                      className="p-1 text-slate-500 hover:text-red-400"
                      title="Remove heir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Name</label>
                      <input
                        type="text"
                        value={heir.name || ''}
                        onChange={(e) => {
                          const newHeirs = [...settings.heirs];
                          newHeirs[index] = { ...heir, name: e.target.value };
                          updateSettings({ heirs: newHeirs });
                        }}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">State</label>
                      <select
                        value={heir.state || 'IL'}
                        onChange={(e) => {
                          const newHeirs = [...settings.heirs];
                          newHeirs[index] = { ...heir, state: e.target.value };
                          updateSettings({ heirs: newHeirs });
                        }}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200"
                      >
                        {US_STATES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Approx AGI ($)</label>
                      <input
                        type="number"
                        value={heir.agi || 0}
                        onChange={(e) => {
                          const newHeirs = [...settings.heirs];
                          newHeirs[index] = { ...heir, agi: parseInt(e.target.value) || 0 };
                          updateSettings({ heirs: newHeirs });
                        }}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Split %</label>
                      <input
                        type="number"
                        value={heir.splitPercent || 0}
                        onChange={(e) => {
                          const newHeirs = [...settings.heirs];
                          newHeirs[index] = { ...heir, splitPercent: parseInt(e.target.value) || 0 };
                          updateSettings({ heirs: newHeirs });
                        }}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Computed Tax Rates:</span>
                      <span>
                        Fed: <span className="text-amber-400">{(fedRate * 100).toFixed(0)}%</span>
                        {' + '}
                        State: <span className="text-blue-400">{(stateRate * 100).toFixed(1)}%</span>
                        {' = '}
                        <span className="text-rose-400">{(combinedRate * 100).toFixed(1)}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => {
                const newHeirs = [...(settings.heirs || []), {
                  name: `Heir ${(settings.heirs || []).length + 1}`,
                  state: 'IL',
                  agi: 200000,
                  splitPercent: 0,
                }];
                updateSettings({ heirs: newHeirs });
              }}
              className="w-full px-3 py-2 bg-slate-700 text-slate-300 rounded text-xs flex items-center justify-center gap-1.5 hover:bg-slate-600"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Heir
            </button>

            {(settings.heirs || []).length > 0 && (
              <div className="text-slate-500 text-xs mt-2">
                Total split: {(settings.heirs || []).reduce((sum, h) => sum + (h.splitPercent || 0), 0)}%
                {(settings.heirs || []).reduce((sum, h) => sum + (h.splitPercent || 0), 0) !== 100 && (
                  <span className="text-amber-400 ml-2">(should equal 100%)</span>
                )}
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Display Preferences Section */}
        <SettingsSection
          title="Display Preferences"
          icon={Eye}
          expanded={expanded.includes('display')}
          onToggle={() => toggle('display')}
          color="blue"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-slate-300 text-sm">Default to Present Value</div>
                <div className="text-slate-500 text-xs">Show values in today's dollars by default</div>
              </div>
              <button
                onClick={() => updateSettings({ defaultPV: !settings.defaultPV })}
                className={`px-3 py-1 rounded text-xs ${
                  settings.defaultPV
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {settings.defaultPV ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </SettingsSection>

        {/* Tax Bracket Editor Section */}
        <SettingsSection
          title="Tax Brackets (Advanced)"
          icon={Calculator}
          expanded={expanded.includes('brackets')}
          onToggle={() => toggle('brackets')}
          color="amber"
        >
          <TaxBracketEditor
            brackets={settings.customBrackets}
            onUpdate={(brackets) => updateSettings({ customBrackets: brackets })}
            taxYear={settings.taxYear || 2024}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

export default SettingsPanel;
