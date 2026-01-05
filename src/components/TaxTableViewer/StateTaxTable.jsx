/**
 * StateTaxTable - Illinois state tax information
 */

import { IL_TAX_RATE } from '../../lib/taxTables';
import { fmt$ } from '../../lib/formatters';

/**
 * StateTaxTable component
 *
 * @param {Object} props
 * @param {number} props.stateIncome - User's state taxable income (capital gains only in IL)
 */
export function StateTaxTable({ stateIncome }) {
  const ratePercent = (IL_TAX_RATE * 100).toFixed(2);
  const taxOwed = stateIncome ? stateIncome * IL_TAX_RATE : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-slate-200 font-medium">Illinois State Income Tax</h3>

      {/* Rate display */}
      <div className="bg-slate-800 rounded p-4 text-center">
        <div className="text-4xl font-mono text-amber-400">{ratePercent}%</div>
        <div className="text-slate-400 text-sm mt-1">Flat rate on taxable income</div>
      </div>

      {/* User's tax */}
      {stateIncome > 0 && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <span className="text-slate-400">Your IL tax:</span>
          <span className="text-amber-400 ml-2 font-mono">
            {fmt$(stateIncome)} × {ratePercent}% = {fmt$(taxOwed)}
          </span>
        </div>
      )}

      {/* Exemptions */}
      <div className="space-y-2">
        <div className="text-emerald-400 text-sm font-medium flex items-center gap-2">
          <span className="text-lg">✓</span>
          Illinois exempts retirement income from state tax:
        </div>
        <ul className="text-slate-400 text-sm list-none pl-6 space-y-1">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Social Security benefits
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            IRA/401(k) distributions
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Pension income
          </li>
        </ul>
      </div>

      {/* What is taxed */}
      <div className="bg-slate-800/50 rounded p-3">
        <div className="text-amber-400 text-sm font-medium mb-2">What IS taxed in Illinois:</div>
        <ul className="text-slate-400 text-sm list-none space-y-1">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Capital gains from investments
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Dividend income
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Interest income
          </li>
        </ul>
      </div>

      {/* Property tax credit note */}
      <div className="text-slate-500 text-xs space-y-1">
        <div>
          <span className="text-slate-400">Property Tax Credit:</span> Illinois offers a 5% credit on property taxes paid,
          limited by your state income tax liability.
        </div>
        <div>
          <span className="text-slate-400">SALT Cap:</span> Federal deduction for state/local taxes capped at $10,000.
        </div>
      </div>
    </div>
  );
}

export default StateTaxTable;
