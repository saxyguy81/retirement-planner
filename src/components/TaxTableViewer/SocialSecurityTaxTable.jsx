/**
 * SocialSecurityTaxTable - SS taxation thresholds with "you are here" indicator
 */

import { SS_TAX_THRESHOLDS_MFJ, SS_TAX_THRESHOLDS_SINGLE } from '../../lib/taxTables';
import { fmt$ } from '../../lib/formatters';

/**
 * SocialSecurityTaxTable component
 *
 * @param {Object} props
 * @param {number} props.combinedIncome - User's combined income (AGI + nontaxable interest + 50% SS)
 * @param {number} props.ssIncome - User's Social Security income
 * @param {string} props.filingStatus - 'mfj' or 'single'
 */
export function SocialSecurityTaxTable({ combinedIncome, ssIncome, filingStatus = 'mfj' }) {
  const thresholds = filingStatus === 'single' ? SS_TAX_THRESHOLDS_SINGLE : SS_TAX_THRESHOLDS_MFJ;

  // Calculate taxable portion
  let taxablePercent = 0;
  let tier = 0;
  if (combinedIncome > thresholds.tier2) {
    taxablePercent = 85;
    tier = 2;
  } else if (combinedIncome > thresholds.tier1) {
    taxablePercent = 50;
    tier = 1;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-slate-200 font-medium">
          Social Security Taxation Thresholds ({filingStatus === 'single' ? 'Single' : 'MFJ'})
        </h3>
        <span className="text-slate-500 text-xs">Source: IRS Publication 915</span>
      </div>

      {/* Formula explanation */}
      <div className="text-slate-500 text-xs bg-slate-800/50 rounded p-2">
        Combined Income = AGI + Nontaxable Interest + ½ of Social Security
      </div>

      {/* User's position */}
      {combinedIncome != null && ssIncome != null && (
        <div className="bg-slate-800 rounded p-3 text-sm space-y-2">
          <div>
            <span className="text-slate-400">Your Combined Income:</span>
            <span className="text-amber-400 ml-2 text-lg font-mono">{fmt$(combinedIncome)}</span>
          </div>
          <div className="text-emerald-400">
            → {taxablePercent}% of your {fmt$(ssIncome)} SS is taxable ={' '}
            {fmt$((ssIncome * taxablePercent) / 100)} taxable
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-700">
              <th className="py-2 pr-4">Combined Income ({filingStatus === 'single' ? 'Single' : 'MFJ'})</th>
              <th className="py-2 text-right">SS Taxable</th>
            </tr>
          </thead>
          <tbody>
            <tr
              className={`border-b border-slate-800 ${combinedIncome != null && tier === 0 ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'}`}
            >
              <td className="py-2 pr-4">
                Below {fmt$(thresholds.tier1)}
                {combinedIncome != null && tier === 0 && (
                  <span className="ml-2 text-blue-400 text-xs font-medium">◄ You</span>
                )}
              </td>
              <td className="py-2 text-right font-mono text-emerald-400">0%</td>
            </tr>
            <tr
              className={`border-b border-slate-800 ${combinedIncome != null && tier === 1 ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'}`}
            >
              <td className="py-2 pr-4">
                {fmt$(thresholds.tier1)} - {fmt$(thresholds.tier2)}
                {combinedIncome != null && tier === 1 && (
                  <span className="ml-2 text-blue-400 text-xs font-medium">◄ You</span>
                )}
              </td>
              <td className="py-2 text-right font-mono text-amber-400">Up to 50%</td>
            </tr>
            <tr
              className={`border-b border-slate-800 ${combinedIncome != null && tier === 2 ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'}`}
            >
              <td className="py-2 pr-4">
                Above {fmt$(thresholds.tier2)}
                {combinedIncome != null && tier === 2 && (
                  <span className="ml-2 text-blue-400 text-xs font-medium">◄ You</span>
                )}
              </td>
              <td className="py-2 text-right font-mono text-rose-400">Up to 85%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Distance to next tier */}
      {combinedIncome != null && tier < 2 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Distance to next tier:</span>
          <span className="text-amber-400 ml-2 font-mono">
            {fmt$((tier === 0 ? thresholds.tier1 : thresholds.tier2) - combinedIncome)}
          </span>
          <span className="text-slate-500 ml-2">below {tier === 0 ? '50%' : '85%'} threshold</span>
        </div>
      )}

      <div className="text-slate-500 text-xs">
        <div className="text-rose-400/80 font-medium">Warning: These thresholds are NOT indexed for inflation.</div>
        <div className="mt-1">As income rises over time, more retirees become subject to SS taxation.</div>
      </div>
    </div>
  );
}

export default SocialSecurityTaxTable;
