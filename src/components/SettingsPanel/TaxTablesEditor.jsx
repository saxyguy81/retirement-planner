/**
 * TaxTablesEditor Component
 *
 * Unified tax tables editor with tabbed interface combining:
 * - Federal Income Tax Brackets
 * - Capital Gains Tax Brackets
 * - IRMAA Brackets
 */

import { useState } from 'react';

import { IRMAAEditor } from './IRMAAEditor';
import { TaxBracketEditor } from './TaxBracketEditor';

const TABS = [
  { id: 'income', label: 'Federal Income' },
  { id: 'capgains', label: 'Capital Gains' },
  { id: 'irmaa', label: 'IRMAA' },
];

export function TaxTablesEditor({
  customBrackets,
  customCapGainsBrackets,
  customIRMAA,
  onUpdateBrackets,
  onUpdateCapGainsBrackets,
  onUpdateIRMAA,
  taxYear,
}) {
  const [activeTab, setActiveTab] = useState('income');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-3 p-1 bg-slate-800 rounded">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'income' && (
          <TaxBracketEditor
            brackets={customBrackets}
            onUpdate={onUpdateBrackets}
            taxYear={taxYear}
            bracketType="income"
          />
        )}
        {activeTab === 'capgains' && (
          <TaxBracketEditor
            brackets={customCapGainsBrackets}
            onUpdate={onUpdateCapGainsBrackets}
            taxYear={taxYear}
            bracketType="capgains"
          />
        )}
        {activeTab === 'irmaa' && (
          <IRMAAEditor brackets={customIRMAA} onUpdate={onUpdateIRMAA} taxYear={taxYear} />
        )}
      </div>
    </div>
  );
}

export default TaxTablesEditor;
