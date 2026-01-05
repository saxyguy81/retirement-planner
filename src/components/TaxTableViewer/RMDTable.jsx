/**
 * RMDTable - Required Minimum Distribution table with "you are here" indicator
 */

import { RMD_TABLE, RMD_START_AGE } from '../../lib/taxTables';
import { fmt$ } from '../../lib/formatters';

/**
 * RMDTable component
 *
 * @param {Object} props
 * @param {number} props.age - User's current age
 * @param {number} props.iraBalance - User's IRA balance (for RMD calculation)
 */
export function RMDTable({ age, iraBalance }) {
  // Show subset of table around user's age
  const startAge = Math.max(72, (age || 73) - 3);
  const endAge = Math.min(120, startAge + 15);

  const tableRows = [];
  for (let a = startAge; a <= endAge; a++) {
    if (RMD_TABLE[a]) {
      tableRows.push({
        age: a,
        factor: RMD_TABLE[a],
        rmdPercent: (100 / RMD_TABLE[a]).toFixed(2),
        rmdAmount: iraBalance ? Math.round(iraBalance / RMD_TABLE[a]) : null,
      });
    }
  }

  const isRMDAge = age >= RMD_START_AGE;
  const userAge = age || null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-slate-200 font-medium">RMD Uniform Lifetime Table</h3>
        <span className="text-slate-500 text-xs">Source: IRS Publication 590-B, Table III</span>
      </div>

      {/* Pre-RMD age note */}
      {age != null && !isRMDAge && (
        <div className="bg-slate-800 rounded p-3 mb-4 text-sm">
          <span className="text-amber-400">Note:</span>
          <span className="text-slate-300 ml-2">
            RMDs begin at age {RMD_START_AGE}. You are currently {age}. First RMD year:{' '}
            {new Date().getFullYear() + (RMD_START_AGE - age)}.
          </span>
        </div>
      )}

      {/* User's RMD summary */}
      {isRMDAge && iraBalance && RMD_TABLE[age] && (
        <div className="bg-slate-800 rounded p-3 text-sm">
          <div className="text-slate-400">Your RMD (Age {age}):</div>
          <div className="text-2xl font-mono text-amber-400 mt-1">{fmt$(Math.round(iraBalance / RMD_TABLE[age]))}</div>
          <div className="text-slate-500 text-xs mt-1">
            = {fmt$(iraBalance)} ÷ {RMD_TABLE[age]} factor
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-700">
              <th className="py-2 pr-4">Age</th>
              <th className="py-2 text-right pr-4">Life Expectancy Factor</th>
              <th className="py-2 text-right pr-4">RMD % of Balance</th>
              {iraBalance && <th className="py-2 text-right">Your RMD</th>}
            </tr>
          </thead>
          <tbody>
            {tableRows.map(row => {
              const isUserAge = row.age === userAge;
              return (
                <tr
                  key={row.age}
                  className={`border-b border-slate-800 ${isUserAge ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'}`}
                >
                  <td className="py-2 pr-4">
                    {row.age}
                    {isUserAge && <span className="ml-2 text-blue-400 text-xs font-medium">◄ You</span>}
                  </td>
                  <td className="py-2 text-right font-mono pr-4">{row.factor}</td>
                  <td className="py-2 text-right font-mono pr-4">{row.rmdPercent}%</td>
                  {iraBalance && (
                    <td className="py-2 text-right font-mono text-amber-400">{fmt$(row.rmdAmount)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-slate-500 text-xs space-y-1">
        <div>RMDs begin at age {RMD_START_AGE} (SECURE 2.0 Act).</div>
        <div>The factor decreases each year, increasing the required distribution percentage.</div>
        <div>RMD = IRA Balance ÷ Life Expectancy Factor</div>
      </div>
    </div>
  );
}

export default RMDTable;
