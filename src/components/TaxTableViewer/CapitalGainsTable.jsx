/**
 * CapitalGainsTable - Long-term capital gains tax brackets with "you are here" indicator
 */

import { fmt$ } from '../../lib/formatters';
import {
  LTCG_BRACKETS_MFJ_2024,
  LTCG_BRACKETS_SINGLE_2024,
  inflateBrackets,
} from '../../lib/taxTables';

/**
 * CapitalGainsTable component
 *
 * @param {Object} props
 * @param {number} props.taxableIncome - User's total taxable income
 * @param {string} props.filingStatus - 'mfj' or 'single'
 * @param {number} props.projectionYear - Year to show brackets for
 */
export function CapitalGainsTable({ taxableIncome, filingStatus = 'mfj', projectionYear = 2025 }) {
  const baseYear = 2024;
  const yearsToInflate = projectionYear - baseYear;
  const inflationRate = 0.028;

  const baseBrackets =
    filingStatus === 'single' ? LTCG_BRACKETS_SINGLE_2024 : LTCG_BRACKETS_MFJ_2024;
  const brackets = inflateBrackets(baseBrackets, inflationRate, Math.max(0, yearsToInflate));

  // Find user's bracket based on total taxable income
  const userBracketIndex =
    taxableIncome != null
      ? brackets.findIndex((b, i) => {
          const nextThreshold = brackets[i + 1]?.threshold || Infinity;
          return taxableIncome >= b.threshold && taxableIncome < nextThreshold;
        })
      : -1;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-slate-200 font-medium">
          Long-Term Capital Gains Rates ({projectionYear},{' '}
          {filingStatus === 'single' ? 'Single' : 'MFJ'})
        </h3>
        <span className="text-slate-500 text-xs">Source: IRS Rev. Proc. 2024-40</span>
      </div>

      {/* Your rate indicator */}
      {taxableIncome != null && userBracketIndex >= 0 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Your LTCG rate:</span>
          <span className="text-emerald-400 ml-2 text-lg font-mono">
            {(brackets[userBracketIndex]?.rate * 100).toFixed(0)}%
          </span>
          <span className="text-slate-500 ml-2">
            (based on {fmt$(taxableIncome)} total taxable income)
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-700">
              <th className="py-2 pr-4">Taxable Income Range</th>
              <th className="py-2 text-right">LTCG Rate</th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((bracket, i) => {
              const nextThreshold = brackets[i + 1]?.threshold;
              const isUserBracket = i === userBracketIndex;

              return (
                <tr
                  key={i}
                  className={`border-b border-slate-800 ${isUserBracket ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'}`}
                >
                  <td className="py-2 pr-4">
                    {fmt$(bracket.threshold)} - {nextThreshold ? fmt$(nextThreshold - 1) : '∞'}
                    {isUserBracket && (
                      <span className="ml-2 text-blue-400 text-xs font-medium">◄ You</span>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono">{(bracket.rate * 100).toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Distance to next bracket */}
      {taxableIncome != null && userBracketIndex >= 0 && userBracketIndex < brackets.length - 1 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Distance to next bracket:</span>
          <span className="text-amber-400 ml-2 font-mono">
            {fmt$(brackets[userBracketIndex + 1].threshold - taxableIncome)}
          </span>
          <span className="text-slate-500 ml-2">
            more income to reach {(brackets[userBracketIndex + 1].rate * 100).toFixed(0)}%
          </span>
        </div>
      )}

      <div className="text-slate-500 text-xs">
        Note: LTCG rates apply to the gain portion only. Your total taxable income determines which
        rate applies to your capital gains. Ordinary income "fills up" the lower brackets first.
      </div>
    </div>
  );
}

export default CapitalGainsTable;
