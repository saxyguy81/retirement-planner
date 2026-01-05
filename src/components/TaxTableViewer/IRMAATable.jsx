/**
 * IRMAATable - IRMAA Medicare premium brackets with "you are here" indicator
 */

import { IRMAA_BRACKETS_MFJ_2026, IRMAA_BRACKETS_SINGLE_2026 } from '../../lib/taxTables';
import { fmt$ } from '../../lib/formatters';

/**
 * IRMAATable component
 *
 * @param {Object} props
 * @param {number} props.magi - User's MAGI (from 2 years prior)
 * @param {string} props.filingStatus - 'mfj' or 'single'
 */
export function IRMAATable({ magi, filingStatus = 'mfj' }) {
  const brackets = filingStatus === 'single' ? IRMAA_BRACKETS_SINGLE_2026 : IRMAA_BRACKETS_MFJ_2026;

  // Find user's tier
  const userTierIndex =
    magi != null
      ? brackets.findIndex((b, i) => {
          const nextThreshold = brackets[i + 1]?.threshold || Infinity;
          return magi >= b.threshold && magi < nextThreshold;
        })
      : -1;

  // Calculate tier descriptions
  const tierLabels = ['Standard', '1.4x', '2.0x', '2.6x', '3.2x', '3.4x'];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-slate-200 font-medium">IRMAA Medicare Premium Brackets (2026)</h3>
        <span className="text-slate-500 text-xs">Based on 2024 MAGI (2-year lookback)</span>
      </div>

      {/* User's position */}
      {magi != null && userTierIndex >= 0 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Your 2024 MAGI:</span>
          <span className="text-amber-400 ml-2 font-mono">{fmt$(magi)}</span>
          <span className="text-slate-500 ml-2">
            → Tier {userTierIndex} ({tierLabels[userTierIndex] || 'Standard'})
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-700">
              <th className="py-2 pr-4">MAGI Threshold ({filingStatus === 'single' ? 'Single' : 'MFJ'})</th>
              <th className="py-2 text-right pr-4">Part B (/mo)</th>
              <th className="py-2 text-right pr-4">Part D (/mo)</th>
              <th className="py-2 text-right">Annual Total</th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((bracket, i) => {
              const isUserTier = i === userTierIndex;
              const annualTotal = (bracket.partB + bracket.partD) * 12;
              const nextThreshold = brackets[i + 1]?.threshold;

              return (
                <tr
                  key={i}
                  className={`border-b border-slate-800 ${isUserTier ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'}`}
                >
                  <td className="py-2 pr-4">
                    {i === 0
                      ? `≤ ${fmt$(brackets[1]?.threshold - 1 || 0)}`
                      : nextThreshold
                        ? `${fmt$(bracket.threshold)} - ${fmt$(nextThreshold - 1)}`
                        : `≥ ${fmt$(bracket.threshold)}`}
                    {isUserTier && <span className="ml-2 text-blue-400 text-xs font-medium">◄ You</span>}
                  </td>
                  <td className="py-2 text-right font-mono pr-4">${bracket.partB.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono pr-4">${bracket.partD.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono text-amber-400">{fmt$(annualTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Distance to next tier */}
      {magi != null && userTierIndex >= 0 && userTierIndex < brackets.length - 1 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Distance to next tier:</span>
          <span className="text-amber-400 ml-2 font-mono">
            {fmt$(brackets[userTierIndex + 1].threshold - magi)}
          </span>
          <span className="text-slate-500 ml-2">below Tier {userTierIndex + 1} threshold</span>
        </div>
      )}

      <div className="text-slate-500 text-xs space-y-1">
        <div>IRMAA is based on MAGI from 2 years prior. Your 2026 premiums are based on your 2024 tax return.</div>
        <div>Part B = medical insurance, Part D = prescription drug coverage</div>
      </div>
    </div>
  );
}

export default IRMAATable;
