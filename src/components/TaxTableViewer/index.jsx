/**
 * TaxTableViewer - Modal showing tax reference tables with "you are here" indicators
 *
 * Features:
 * - Tabbed interface for different tax tables
 * - "You are here" bracket highlighting based on user's values
 * - Distance to next bracket indicator
 * - Year selector for inflation-adjusted brackets
 * - Source citations and external links
 */

import { ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CapitalGainsTable } from './CapitalGainsTable';
import { FederalBracketsTable } from './FederalBracketsTable';
import { IRMAATable } from './IRMAATable';
import { RMDTable } from './RMDTable';
import { SocialSecurityTaxTable } from './SocialSecurityTaxTable';
import { StateTaxTable } from './StateTaxTable';

const TAX_TABLE_TABS = [
  { id: 'federal', label: 'Federal Income' },
  { id: 'ltcg', label: 'Capital Gains' },
  { id: 'irmaa', label: 'IRMAA' },
  { id: 'rmd', label: 'RMD' },
  { id: 'ss', label: 'Social Security' },
  { id: 'state', label: 'State Tax' },
];

/**
 * TaxTableViewer component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.context - Context data for "you are here" indicators
 * @param {number} props.context.year - Current projection year
 * @param {number} props.context.age - User's age for RMD
 * @param {string} props.context.filingStatus - 'mfj' or 'single'
 * @param {number} props.context.taxableIncome - For federal/LTCG bracket lookup
 * @param {number} props.context.magi - For IRMAA (2-year lookback applied)
 * @param {number} props.context.iraBalance - For RMD calculation
 * @param {number} props.context.ssIncome - For SS taxation
 * @param {number} props.context.combinedIncome - For SS taxation threshold
 * @param {number} props.context.stateIncome - For state tax
 * @param {string} props.initialTab - Optional initial tab to display
 */
export function TaxTableViewer({ isOpen, onClose, context, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'federal');
  const [viewYear, setViewYear] = useState(context?.year || new Date().getFullYear());

  // Update view year when context changes
  useEffect(() => {
    if (context?.year) {
      setViewYear(context.year);
    }
  }, [context?.year]);

  // Update active tab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { filingStatus = 'mfj', taxableIncome, magi, age, iraBalance, ssIncome, combinedIncome, stateIncome } =
    context || {};

  // Generate year options from 2024 to 2054
  const yearOptions = Array.from({ length: 31 }, (_, i) => 2024 + i);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg w-[900px] max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        role="dialog"
        aria-labelledby="tax-table-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 id="tax-table-title" className="text-lg font-medium text-slate-100">
            Tax Reference Tables
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={viewYear}
              onChange={e => setViewYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
              aria-label="Select year"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 overflow-x-auto">
          {TAX_TABLE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'federal' && (
            <FederalBracketsTable
              taxableIncome={taxableIncome}
              filingStatus={filingStatus}
              projectionYear={viewYear}
            />
          )}
          {activeTab === 'ltcg' && (
            <CapitalGainsTable taxableIncome={taxableIncome} filingStatus={filingStatus} projectionYear={viewYear} />
          )}
          {activeTab === 'irmaa' && <IRMAATable magi={magi} filingStatus={filingStatus} />}
          {activeTab === 'rmd' && <RMDTable age={age} iraBalance={iraBalance} />}
          {activeTab === 'ss' && (
            <SocialSecurityTaxTable combinedIncome={combinedIncome} ssIncome={ssIncome} filingStatus={filingStatus} />
          )}
          {activeTab === 'state' && <StateTaxTable stateIncome={stateIncome} />}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 flex gap-4 text-xs text-slate-500">
          <a
            href="https://www.irs.gov/pub/irs-pdf/p17.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-slate-400 transition-colors"
          >
            IRS Publication 17
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.irs.gov/pub/irs-pdf/p590b.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-slate-400 transition-colors"
          >
            IRS Publication 590-B (RMDs)
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.medicare.gov/basics/costs/medicare-costs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-slate-400 transition-colors"
          >
            Medicare.gov
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default TaxTableViewer;
