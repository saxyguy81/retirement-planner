/**
 * FederalBracketsTable - Federal income tax brackets with "you are here" indicator
 */

import {
  FEDERAL_BRACKETS_MFJ_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
  inflateBrackets,
  SENIOR_BONUS_MFJ_2024,
  SENIOR_BONUS_SINGLE_2024,
  STANDARD_DEDUCTION_MFJ_2024,
  STANDARD_DEDUCTION_SINGLE_2024,
} from '../../lib/taxTables';
import { fmt$ } from '../../lib/formatters';

/**
 * FederalBracketsTable component
 *
 * @param {Object} props
 * @param {number} props.taxableIncome - User's taxable income
 * @param {string} props.filingStatus - 'mfj' or 'single'
 * @param {number} props.projectionYear - Year to show brackets for
 */
export function FederalBracketsTable({ taxableIncome, filingStatus = 'mfj', projectionYear = 2025 }) {
  // Get inflated brackets for the projection year
  const baseYear = 2024;
  const yearsToInflate = projectionYear - baseYear;
  const inflationRate = 0.028; // ~2.8% bracket inflation

  const baseBrackets = filingStatus === 'single' ? FEDERAL_BRACKETS_SINGLE_2024 : FEDERAL_BRACKETS_MFJ_2024;
  const brackets = inflateBrackets(baseBrackets, inflationRate, Math.max(0, yearsToInflate));

  // Find user's bracket
  const userBracketIndex =
    taxableIncome != null
      ? brackets.findIndex((b, i) => {
          const nextThreshold = brackets[i + 1]?.threshold || Infinity;
          return taxableIncome >= b.threshold && taxableIncome < nextThreshold;
        })
      : -1;

  // Calculate tax at each bracket boundary
  let cumulativeTax = 0;
  const bracketsWithTax = brackets.map((bracket, i) => {
    const result = { ...bracket, taxAtBottom: cumulativeTax };
    if (i > 0) {
      const prevBracket = brackets[i - 1];
      const incomeInBracket = bracket.threshold - prevBracket.threshold;
      cumulativeTax += incomeInBracket * prevBracket.rate;
    }
    result.taxAtBottom = cumulativeTax;
    return result;
  });

  // Calculate standard deduction
  const baseDeduction = filingStatus === 'single' ? STANDARD_DEDUCTION_SINGLE_2024 : STANDARD_DEDUCTION_MFJ_2024;
  const seniorBonus = filingStatus === 'single' ? SENIOR_BONUS_SINGLE_2024 : SENIOR_BONUS_MFJ_2024;
  const inflatedDeduction = Math.round(baseDeduction * Math.pow(1 + inflationRate, Math.max(0, yearsToInflate)));
  const inflatedSeniorBonus = Math.round(seniorBonus * Math.pow(1 + inflationRate, Math.max(0, yearsToInflate)));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-slate-200 font-medium">
          Federal Income Tax Brackets ({projectionYear}, {filingStatus === 'single' ? 'Single' : 'MFJ'})
        </h3>
        <span className="text-slate-500 text-xs">Source: IRS Rev. Proc. 2024-40 + inflation adjustment</span>
      </div>

      {/* Visual bracket indicator */}
      {taxableIncome != null && (
        <div className="bg-slate-800 rounded p-3">
          <div className="text-slate-400 text-sm mb-2">Your Position:</div>
          <div className="flex h-6 rounded overflow-hidden">
            {bracketsWithTax.map((bracket, i) => {
              const nextThreshold = bracketsWithTax[i + 1]?.threshold || bracket.threshold * 1.5;
              const maxWidth = 120; // Max segment width
              const scaleFactor = 600000; // Scale for visualization
              const width = Math.min(((nextThreshold - bracket.threshold) / scaleFactor) * 100, maxWidth);
              const isUserBracket = i === userBracketIndex;

              return (
                <div
                  key={i}
                  className={`relative border-r border-slate-600 last:border-r-0 ${
                    isUserBracket ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                  style={{ width: `${Math.max(width, 30)}px` }}
                  title={`${(bracket.rate * 100).toFixed(0)}% bracket`}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white">
                    {(bracket.rate * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-emerald-400 text-sm mt-2">
            Taxable income: {fmt$(taxableIncome)} {userBracketIndex >= 0 ? '→' : ''}{' '}
            {userBracketIndex >= 0
              ? `${(bracketsWithTax[userBracketIndex]?.rate * 100).toFixed(0)}% marginal bracket`
              : ''}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-700">
              <th className="py-2 pr-4">Taxable Income Range</th>
              <th className="py-2 text-right pr-4">Rate</th>
              <th className="py-2 text-right">Tax at Bottom of Bracket</th>
            </tr>
          </thead>
          <tbody>
            {bracketsWithTax.map((bracket, i) => {
              const nextThreshold = bracketsWithTax[i + 1]?.threshold;
              const isUserBracket = i === userBracketIndex;

              return (
                <tr
                  key={i}
                  className={`border-b border-slate-800 ${isUserBracket ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'}`}
                >
                  <td className="py-2 pr-4">
                    {fmt$(bracket.threshold)}
                    {nextThreshold ? ` - ${fmt$(nextThreshold - 1)}` : '+'}
                    {isUserBracket && <span className="ml-2 text-blue-400 text-xs font-medium">◄ You</span>}
                  </td>
                  <td className="py-2 text-right font-mono pr-4">{(bracket.rate * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right font-mono text-slate-400">{fmt$(bracket.taxAtBottom)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Standard deduction note */}
      <div className="text-slate-500 text-xs space-y-1">
        <div>
          Standard Deduction ({projectionYear} {filingStatus === 'single' ? 'Single' : 'MFJ'}): {fmt$(inflatedDeduction)}
        </div>
        <div>Additional for 65+: {fmt$(inflatedSeniorBonus)} per spouse</div>
      </div>

      {/* Distance to next bracket */}
      {taxableIncome != null && userBracketIndex >= 0 && userBracketIndex < bracketsWithTax.length - 1 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Distance to next bracket:</span>
          <span className="text-amber-400 ml-2 font-mono">
            {fmt$(bracketsWithTax[userBracketIndex + 1].threshold - taxableIncome)}
          </span>
          <span className="text-slate-500 ml-2">
            more taxable income to reach {(bracketsWithTax[userBracketIndex + 1].rate * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default FederalBracketsTable;
