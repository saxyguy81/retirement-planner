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
  Calculator,
  Eye,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Heart,
} from 'lucide-react';
import { useState } from 'react';

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
  const [expanded, setExpanded] = useState(['tax']);

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
              Trump&apos;s proposal: Exempt Social Security from federal taxation
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

        {/* Display Preferences Section */}
        <SettingsSection
          title="Display Preferences"
          icon={Eye}
          expanded={expanded.includes('display')}
          onToggle={() => toggle('display')}
          color="blue"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-slate-300 text-sm">Default to Present Value</div>
                <div className="text-slate-500 text-xs">
                  Show values in today&apos;s dollars by default
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

            {/* Display Precision */}
            <div className="p-3 bg-slate-800 rounded border border-slate-700">
              <div className="text-slate-300 text-sm font-medium mb-2">Display Precision</div>
              <div className="text-slate-500 text-xs mb-3">
                How currency values are displayed in tables and charts
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { value: 'sig2', label: '$1.2M', desc: '2 significant figures' },
                  { value: 'sig3', label: '$1.23M', desc: '3 significant figures' },
                  { value: 'sig4', label: '$1.234M', desc: '4 significant figures' },
                  { value: 'dollars', label: '$1,234,567', desc: 'Full dollars' },
                  { value: 'cents', label: '$1,234,567.89', desc: 'Dollars and cents' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateSettings({ displayPrecision: option.value })}
                    className={`px-2 py-1.5 rounded text-xs ${
                      (settings.displayPrecision || 'sig3') === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                    title={option.desc}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="text-slate-500 text-xs mt-2">
                {(settings.displayPrecision || 'sig3') === 'sig2' && '2 significant figures'}
                {(settings.displayPrecision || 'sig3') === 'sig3' && '3 significant figures'}
                {settings.displayPrecision === 'sig4' && '4 significant figures'}
                {settings.displayPrecision === 'dollars' && 'Full dollar amounts with commas'}
                {settings.displayPrecision === 'cents' && 'Full precision with cents'}
              </div>
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
