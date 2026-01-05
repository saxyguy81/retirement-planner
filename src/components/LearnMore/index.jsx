/**
 * LearnMore Component
 *
 * Expandable contextual help for complex concepts.
 * Better than tooltips because:
 * - Works on mobile (no hover needed)
 * - User-initiated (no tooltip fatigue)
 * - Can contain detailed explanations
 * - Includes source citations where applicable
 */

import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useState } from 'react';

// Topic content with summaries, details, and optional sources
const TOPICS = {
  'roth-conversion': {
    summary: 'Moving money from Traditional IRA to Roth IRA',
    detail: `A Roth conversion moves money from your tax-deferred Traditional IRA to a tax-free Roth IRA. You pay income tax on the conversion amount THIS year, but future growth and withdrawals are tax-free.

This can be advantageous if:
- You expect to be in a higher tax bracket later
- You want to reduce Required Minimum Distributions (RMDs)
- You want to leave tax-free money to heirs`,
    source: 'IRS Publication 590-A',
  },
  'present-value': {
    summary: "Amounts in today's dollars",
    detail: `Present Value (PV) converts future dollars to today's equivalent using a discount rate. $100,000 in 2045 isn't the same as $100,000 today due to inflation.

PV helps you compare amounts across different years fairly. Toggle PV/FV in the header to switch between viewing everything in today's dollars (PV) or nominal future dollars (FV).`,
    source: null,
  },
  'cost-basis': {
    summary: 'Original purchase price of investments',
    detail: `Cost basis is what you originally paid for your investments. When you sell, you pay capital gains tax on the difference between sale price and cost basis.

Higher cost basis = lower taxable gain = less tax when you sell.

If you inherited investments, the cost basis is typically "stepped up" to the value at the date of inheritance.`,
    source: 'IRS Publication 550',
  },
  magi: {
    summary: 'Modified Adjusted Gross Income',
    detail: `MAGI is your adjusted gross income (AGI) with certain deductions added back. It's used to determine:

- Medicare premium surcharges (IRMAA)
- Roth IRA contribution eligibility
- Social Security taxation
- Investment income surtax

Your 2024 MAGI affects your 2026 Medicare premiums (2-year lookback).`,
    source: 'IRS Publication 17',
  },
  irmaa: {
    summary: 'Medicare premium surcharges for higher incomes',
    detail: `IRMAA (Income-Related Monthly Adjustment Amount) is an additional premium for Medicare Parts B and D if your income exceeds certain thresholds.

It's based on your MAGI from 2 years prior. For example, 2024 income affects 2026 premiums.

Large Roth conversions or one-time income spikes can trigger IRMAA surcharges.`,
    source: 'Medicare.gov',
  },
  cola: {
    summary: 'Cost of Living Adjustment',
    detail: `COLA is the annual increase applied to Social Security benefits to keep pace with inflation. The SSA calculates COLA based on the Consumer Price Index.

Recent COLAs have ranged from 0% to 8.7% annually. The default assumption of 2.5% is based on historical averages.`,
    source: 'Social Security Administration',
  },
  'capital-gains': {
    summary: 'Tax on investment profits',
    detail: `When you sell investments for more than you paid, the profit is a capital gain. Long-term gains (held > 1 year) are taxed at preferential rates: 0%, 15%, or 20% depending on income.

The "Capital Gains %" parameter estimates what portion of your after-tax account withdrawals will be taxable gains (vs. return of principal).`,
    source: 'IRS Publication 550',
  },
  rmd: {
    summary: 'Required Minimum Distributions',
    detail: `RMDs are mandatory annual withdrawals from Traditional IRAs and 401(k)s starting at age 73 (as of SECURE 2.0). The amount is based on your account balance and life expectancy.

Roth IRAs have no RMDs during the owner's lifetime. This is one benefit of Roth conversions before RMDs begin.`,
    source: 'IRS Publication 590-B',
  },
  'iterative-tax': {
    summary: 'Refining tax calculations over multiple passes',
    detail: `Retirement tax calculations have circular dependencies: your withdrawal amount affects your tax, which affects how much you need to withdraw.

Iterative tax calculation runs multiple passes to converge on accurate numbers. More iterations = more accuracy but slower calculations.

For most scenarios, 3-5 iterations is sufficient.`,
    source: null,
  },
  'discount-rate': {
    summary: 'Rate used to calculate present values',
    detail: `The discount rate converts future dollars to present value. A 3% discount rate means $103 in one year equals $100 today.

Higher discount rate = future dollars are worth less today.

Typical rates:
- 2-3%: Conservative (near inflation)
- 4-5%: Moderate
- 6%+: Aggressive`,
    source: null,
  },
  'survivor-scenario': {
    summary: 'What happens after first spouse passes',
    detail: `The survivor scenario models financial changes when the first spouse passes:

- Survivor SS %: Survivor keeps the higher of the two benefits (typically ~72% of combined)
- Survivor Expense %: Living expenses often decrease (typically ~70% of couple expenses)
- Filing status changes from MFJ to Single (higher tax brackets)`,
    source: null,
  },
  'heir-distribution': {
    summary: 'How inherited IRAs must be distributed',
    detail: `Under the SECURE Act, most non-spouse heirs must withdraw all inherited IRA funds within 10 years.

The distribution strategy affects the heir's tax burden:
- Even: Spread withdrawals evenly over 10 years
- Defer to Year 10: Take everything in the final year
- RMD-Based: Annual RMDs if deceased was taking RMDs

The optimal strategy depends on the heir's income trajectory.`,
    source: 'SECURE Act 2.0',
  },
};

export function LearnMore({ topic }) {
  const [expanded, setExpanded] = useState(false);

  const content = TOPICS[topic];
  if (!content) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300"
        aria-expanded={expanded}
        aria-controls={`learn-more-${topic}`}
      >
        <HelpCircle className="w-3 h-3" aria-hidden="true" />
        <span>{content.summary}</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        )}
      </button>
      {expanded && (
        <div
          id={`learn-more-${topic}`}
          className="mt-2 p-2 bg-slate-800 rounded text-slate-300 text-xs leading-relaxed whitespace-pre-line"
        >
          {content.detail}
          {content.source && (
            <p className="mt-2 text-slate-500 text-[10px]">Source: {content.source}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default LearnMore;
