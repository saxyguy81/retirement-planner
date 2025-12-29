/**
 * SettingsPanel Component
 *
 * Global settings for the retirement planner:
 * - User Profile (names, birth years)
 * - Tax Settings (bonus deduction, state tax, discount rate)
 * - Display Preferences
 * - Tax Bracket Editor (for advanced users)
 */

import {
  Settings,
  User,
  Calculator,
  Eye,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Users,
  Heart,
} from 'lucide-react';
import React, { useState } from 'react';

import { IRMAAEditor } from './IRMAAEditor';
import { TaxBracketEditor } from './TaxBracketEditor';

// Collapsible section wrapper
function SettingsSection({ title, icon: Icon, expanded, onToggle, color, children }) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
    rose: 'text-rose-400 bg-rose-400/10',
  };

  return (
    <div className="border-b border-slate-800">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-slate-800/50"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
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
        onChange={e =>
          onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)
        }
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
      />
      {helpText && <div className="text-slate-500 text-xs mt-1">{helpText}</div>}
    </div>
  );
}

export function SettingsPanel({ settings, updateSettings, resetSettings }) {
  const [expanded, setExpanded] = useState(['profile', 'tax']);

  const toggle = section => {
    setExpanded(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
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
              onChange={v => updateSettings({ primaryName: v })}
              placeholder="e.g., John"
            />
            <SettingsInput
              label="Primary Birth Year"
              value={settings.primaryBirthYear || ''}
              onChange={v => updateSettings({ primaryBirthYear: parseInt(v) || 1960 })}
              type="number"
              placeholder="e.g., 1960"
            />
            <SettingsInput
              label="Spouse Name"
              value={settings.spouseName || ''}
              onChange={v => updateSettings({ spouseName: v })}
              placeholder="e.g., Jane"
            />
            <SettingsInput
              label="Spouse Birth Year"
              value={settings.spouseBirthYear || ''}
              onChange={v => updateSettings({ spouseBirthYear: parseInt(v) || 1962 })}
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
          <SettingsInput
            label="Tax Year Base"
            value={settings.taxYear || 2025}
            onChange={v => updateSettings({ taxYear: parseInt(v) || 2025 })}
            type="number"
            helpText="Base year for tax brackets"
          />

          {/* Trump SS Exemption - 3-way selector */}
          <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700">
            <div className="text-slate-300 text-sm font-medium mb-2">
              Social Security Tax Exemption
            </div>
            <div className="text-slate-500 text-xs mb-3">
              Trump's proposal: Exempt Social Security from federal taxation
            </div>
            <div className="flex gap-1">
              {[
                { value: 'disabled', label: 'Disabled' },
                { value: 'through2028', label: 'Through 2028' },
                { value: 'permanent', label: 'Permanent' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => updateSettings({ ssExemptionMode: option.value })}
                  className={`flex-1 px-2 py-1.5 rounded text-xs ${
                    (settings.ssExemptionMode || 'disabled') === option.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="text-slate-500 text-xs mt-2">
              {(settings.ssExemptionMode || 'disabled') === 'disabled' &&
                'Social Security is taxed normally'}
              {settings.ssExemptionMode === 'through2028' &&
                'SS exempt from federal tax 2025-2028 only'}
              {settings.ssExemptionMode === 'permanent' &&
                'SS exempt from federal tax for all years'}
            </div>
          </div>

          <div className="text-slate-500 text-xs mt-3 p-2 bg-slate-800/50 rounded">
            <strong>Note:</strong> Discount rate and calculation options have been moved to the
            InputPanel for easier access.
          </div>
        </SettingsSection>

        {/* Note about heirs - moved to InputPanel */}
        <SettingsSection
          title="Heirs"
          icon={Users}
          expanded={expanded.includes('heirs')}
          onToggle={() => toggle('heirs')}
          color="purple"
        >
          <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
            <div className="text-slate-400 text-sm mb-2">Heirs Moved to InputPanel</div>
            <div className="text-slate-500 text-xs">
              Heir configuration (names, states, AGI, split percentages, and distribution strategy)
              has been moved to the <span className="text-indigo-400 font-medium">Heirs</span>{' '}
              section in the InputPanel for easier access while viewing projections.
            </div>
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
                <div className="text-slate-500 text-xs">
                  Show values in today's dollars by default
                </div>
              </div>
              <button
                onClick={() => updateSettings({ defaultPV: !settings.defaultPV })}
                className={`px-3 py-1 rounded text-xs ${
                  settings.defaultPV ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
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
            onUpdate={brackets => updateSettings({ customBrackets: brackets })}
            taxYear={settings.taxYear || 2024}
          />
        </SettingsSection>

        {/* IRMAA Brackets Section */}
        <SettingsSection
          title="IRMAA Brackets (Advanced)"
          icon={Heart}
          expanded={expanded.includes('irmaa')}
          onToggle={() => toggle('irmaa')}
          color="rose"
        >
          <IRMAAEditor
            brackets={settings.customIRMAA}
            onUpdate={brackets => updateSettings({ customIRMAA: brackets })}
            taxYear={settings.taxYear || 2024}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

export default SettingsPanel;
