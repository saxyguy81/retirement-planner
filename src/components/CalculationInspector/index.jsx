/**
 * CalculationInspector - Shows calculation breakdown
 *
 * Four views:
 * 1. Conceptual - What the calculation represents
 * 2. Formula - Mathematical notation with symbols
 * 3. Values - Formula with actual numbers substituted
 * 4. Simple - Back-of-envelope mental math version
 */

import React, { useState } from 'react';
import { X, BookOpen, Calculator, Hash, Lightbulb } from 'lucide-react';
import { fmt$, fmtPct } from '../../lib/formatters';

// Helper to format a number
const f$ = (v) => '$' + Math.round(v).toLocaleString();
const fK = (v) => '$' + (v / 1000).toFixed(0) + 'K';
const fM = (v) => '$' + (v / 1000000).toFixed(2) + 'M';

// Calculation definitions - maps field keys to explanations
const CALCULATIONS = {
  // Federal Tax
  federalTax: {
    name: 'Federal Income Tax',
    concept: 'Progressive tax on ordinary income after deductions. Income is taxed at increasing rates as it fills each bracket: 10% → 12% → 22% → 24% → 32% → 35% → 37%. Most retirees fall in the 22-24% brackets.',
    formula: 'Federal Tax = Σ (Income_in_bracket × Bracket_rate)\n\nTaxable Income = Ordinary Income − Standard Deduction\nOrdinary Income = Taxable SS + IRA Withdrawal + Roth Conversion',
    backOfEnvelope: 'For most retirees: ≈ (Taxable Income) × 22%',
    compute: (data, params) => {
      const { taxableOrdinary, ordinaryIncome, standardDeduction, federalTax } = data;
      const effectiveRate = ordinaryIncome > 0 ? (federalTax / ordinaryIncome * 100).toFixed(1) : 0;
      return {
        formula: `Taxable = ${fK(ordinaryIncome)} − ${fK(standardDeduction)} = ${fK(taxableOrdinary)}`,
        values: `Federal Tax = ${fK(federalTax)} (${effectiveRate}% effective rate)`,
        result: `≈ ${fK(taxableOrdinary)} × 22% = ${fK(taxableOrdinary * 0.22)}`,
        simple: `${fK(taxableOrdinary)} × 22% ≈ ${fK(taxableOrdinary * 0.22)}`
      };
    }
  },

  // Total Tax
  totalTax: {
    name: 'Total Annual Tax',
    concept: 'Sum of all taxes: Federal income tax on ordinary income, capital gains tax (LTCG), Net Investment Income Tax (NIIT), and Illinois state tax on investment income only.',
    formula: 'Total Tax = Federal + LTCG Tax + NIIT + State Tax\n\nFederal: Progressive brackets on ordinary income\nLTCG: 0%/15%/20% on capital gains (stacks on ordinary)\nNIIT: 3.8% on investment income above $250K MAGI\nIL State: 4.95% on investment income only',
    backOfEnvelope: '≈ Federal Tax + (Capital Gains × 18%)',
    compute: (data) => {
      const { federalTax, ltcgTax, niit, stateTax, totalTax, capitalGains } = data;
      return {
        formula: `Total = Federal + LTCG + NIIT + State`,
        values: `Total = ${fK(federalTax)} + ${fK(ltcgTax)} + ${fK(niit)} + ${fK(stateTax)}`,
        result: `Total Tax = ${fK(totalTax)}`,
        simple: capitalGains > 0
          ? `${fK(federalTax)} + ${fK(capitalGains)} × 18% ≈ ${fK(totalTax)}`
          : `≈ ${fK(federalTax)} (minimal cap gains)`
      };
    }
  },

  // LTCG Tax
  ltcgTax: {
    name: 'Long-Term Capital Gains Tax',
    concept: 'Tax on gains from selling investments held over 1 year. Rate depends on total income: 0% for lower incomes, 15% for middle, 20% for high. Gains "stack" on top of ordinary income to determine which bracket applies.',
    formula: 'LTCG Tax = Capital Gains × Rate\n\nRate = 0% if total income < $89K (MFJ)\nRate = 15% if total income < $553K\nRate = 20% if total income ≥ $553K\n\nGains stack on top of ordinary income.',
    backOfEnvelope: '≈ Capital Gains × 15% (most common)',
    compute: (data) => {
      const { capitalGains, ltcgTax, taxableOrdinary } = data;
      const rate = capitalGains > 0 ? (ltcgTax / capitalGains * 100).toFixed(1) : 0;
      return {
        formula: `LTCG stacks on ${fK(taxableOrdinary)} ordinary income`,
        values: `LTCG Tax = ${fK(capitalGains)} × ${rate}%`,
        result: `LTCG Tax = ${fK(ltcgTax)}`,
        simple: `${fK(capitalGains)} × 15% ≈ ${fK(capitalGains * 0.15)}`
      };
    }
  },

  // NIIT
  niit: {
    name: 'Net Investment Income Tax (NIIT)',
    concept: 'Additional 3.8% Medicare surtax on investment income when MAGI exceeds $250K (MFJ). Only applies to the lesser of: investment income OR excess over threshold.',
    formula: 'NIIT = 3.8% × min(Investment Income, MAGI − $250K)\n\nInvestment Income includes:\n- Capital gains\n- Dividends\n- Interest (not tax-exempt)',
    backOfEnvelope: '≈ 3.8% × Capital Gains (if MAGI > $250K)',
    compute: (data) => {
      const { capitalGains, niit, ordinaryIncome } = data;
      const magi = ordinaryIncome + capitalGains;
      const threshold = 250000;
      const excess = Math.max(0, magi - threshold);
      return {
        formula: `MAGI = ${fK(magi)}, Threshold = $250K`,
        values: excess > 0
          ? `NIIT = 3.8% × min(${fK(capitalGains)}, ${fK(excess)})`
          : `MAGI below threshold, no NIIT`,
        result: `NIIT = ${fK(niit)}`,
        simple: excess > 0 ? `${fK(capitalGains)} × 3.8% = ${fK(capitalGains * 0.038)}` : '$0 (below threshold)'
      };
    }
  },

  // State Tax
  stateTax: {
    name: 'Illinois State Tax',
    concept: 'Illinois taxes investment income at 4.95% flat rate. Retirement income (Social Security, IRA/401k distributions) is EXEMPT from IL tax.',
    formula: 'IL Tax = Investment Income × 4.95%\n\nTaxable: Capital gains, dividends, interest\nExempt: SS, IRA distributions, Roth, pensions',
    backOfEnvelope: '≈ Capital Gains × 5%',
    compute: (data) => {
      const { capitalGains, stateTax } = data;
      return {
        formula: `Only investment income is taxable in IL`,
        values: `IL Tax = ${fK(capitalGains)} × 4.95%`,
        result: `State Tax = ${fK(stateTax)}`,
        simple: `${fK(capitalGains)} × 5% ≈ ${fK(capitalGains * 0.05)}`
      };
    }
  },

  // Taxable Social Security
  taxableSS: {
    name: 'Taxable Social Security',
    concept: 'Up to 85% of Social Security may be taxable, based on "combined income" = AGI + 50% of SS. Below $32K (MFJ): 0% taxable. $32K-$44K: up to 50%. Above $44K: up to 85%.',
    formula: 'Combined Income = Other Income + 0.5 × SS\n\nIf Combined ≤ $32K: 0% taxable\nIf Combined ≤ $44K: up to 50% taxable\nIf Combined > $44K: up to 85% taxable',
    backOfEnvelope: '≈ 85% × Social Security (for most retirees with other income)',
    compute: (data) => {
      const { ssAnnual, taxableSS, ordinaryIncome } = data;
      const combined = ordinaryIncome + 0.5 * ssAnnual;
      const pct = ssAnnual > 0 ? (taxableSS / ssAnnual * 100).toFixed(0) : 0;
      return {
        formula: `Combined = ${fK(ordinaryIncome)} + 0.5 × ${fK(ssAnnual)}`,
        values: `Combined Income = ${fK(combined)}`,
        result: `Taxable SS = ${fK(taxableSS)} (${pct}% of SS)`,
        simple: `85% × ${fK(ssAnnual)} = ${fK(ssAnnual * 0.85)}`
      };
    }
  },

  // IRMAA Total
  irmaaTotal: {
    name: 'IRMAA Medicare Surcharge',
    concept: 'Income-Related Monthly Adjustment Amount - extra Medicare premium if MAGI from 2 years ago exceeds thresholds. Applies to both Part B (medical) and Part D (drugs). Tiers range from $0 to $12K+/year per couple.',
    formula: 'IRMAA = (Part B + Part D surcharge) × 12 months × people\n\nBased on MAGI from 2 years prior:\n< $206K: $0 (MFJ)\n$206K-$258K: ~$2K/year\n$258K-$322K: ~$5K/year\n... up to $12K+/year',
    backOfEnvelope: '$0 if prior MAGI < $206K, else $2K-$12K depending on tier',
    compute: (data) => {
      const { irmaaMAGI, irmaaPartB, irmaaPartD, irmaaTotal } = data;
      const monthlyB = irmaaPartB / 24; // per person per month
      const monthlyD = irmaaPartD / 24;
      return {
        formula: `Based on ${data.year - 2} MAGI = ${fK(irmaaMAGI)}`,
        values: irmaaTotal > 0
          ? `IRMAA = ($${monthlyB.toFixed(0)}/mo + $${monthlyD.toFixed(0)}/mo) × 12 × 2`
          : `MAGI below $206K threshold`,
        result: `Annual IRMAA = ${fK(irmaaTotal)}`,
        simple: irmaaTotal === 0
          ? '$0 (below threshold)'
          : `~${fK(irmaaTotal)}/year`
      };
    }
  },

  // RMD Required
  rmdRequired: {
    name: 'Required Minimum Distribution',
    concept: 'Annual required withdrawal from Traditional IRA starting at age 73 (SECURE 2.0). Amount = IRA Balance ÷ Life Expectancy Factor from IRS Uniform Lifetime Table.',
    formula: 'RMD = IRA Balance ÷ Distribution Factor\n\nAge 73: Factor = 26.5\nAge 75: Factor = 24.6\nAge 80: Factor = 20.2\nAge 85: Factor = 16.0\nAge 90: Factor = 12.2',
    backOfEnvelope: 'RMD % increases with age (starts ~3.8% at 73)',
    compute: (data) => {
      const { iraBOY, rmdFactor, rmdRequired, age, year } = data;
      const rmdPct = iraBOY > 0 ? ((rmdRequired / iraBOY) * 100).toFixed(1) : 0;

      // Dynamic simple based on whether RMD applies
      let simple = '';
      if (age < 73) {
        simple = `Age ${age}: No RMD required until age 73`;
      } else {
        simple = `${fK(rmdRequired)} = ${rmdPct}% of ${fK(iraBOY)} IRA (age ${age}, factor ${rmdFactor.toFixed(1)})`;
      }

      return {
        formula: age >= 73
          ? `Age ${age}: Life expectancy factor = ${rmdFactor.toFixed(1)}`
          : `Age ${age}: RMD not required (starts at 73)`,
        values: age >= 73
          ? `RMD = ${fK(iraBOY)} ÷ ${rmdFactor.toFixed(1)} = ${fK(rmdRequired)}`
          : `$0 required`,
        result: age >= 73
          ? `RMD = ${fK(rmdRequired)} (${rmdPct}% of IRA)`
          : `$0 - not yet required`,
        simple
      };
    }
  },

  // Total Withdrawal
  totalWithdrawal: {
    name: 'Total Withdrawal Needed',
    concept: 'Total cash withdrawn from accounts = Expenses + Taxes + IRMAA − Social Security. Withdrawal order: IRA first (for RMD), then After-Tax, then more IRA, finally Roth.',
    formula: 'Need = Expenses + Taxes + IRMAA − SS\n\nWithdrawal Order:\n1. IRA (at least RMD)\n2. After-Tax (preserves tax-deferred growth)\n3. More IRA (if needed)\n4. Roth (last resort, preserves tax-free growth)',
    backOfEnvelope: '≈ Expenses × 1.2 (assumes ~20% for taxes)',
    compute: (data) => {
      const { expenses, totalTax, irmaaTotal, ssAnnual, totalWithdrawal } = data;
      const need = expenses + totalTax + irmaaTotal - ssAnnual;
      const taxPct = expenses > 0 ? ((totalWithdrawal / expenses - 1) * 100).toFixed(0) : 0;
      return {
        formula: `Need = Expenses + Tax + IRMAA − SS`,
        values: `Need = ${fK(expenses)} + ${fK(totalTax)} + ${fK(irmaaTotal)} − ${fK(ssAnnual)}`,
        result: `Withdrawal = ${fK(totalWithdrawal)}`,
        simple: `${fK(expenses)} × 1.${taxPct} ≈ ${fK(totalWithdrawal)}`
      };
    }
  },

  // Roth Conversion
  rothConversion: {
    name: 'Roth Conversion',
    concept: 'Internal transfer from Traditional IRA → Roth IRA. The conversion amount moves directly between accounts (no cash withdrawn). However, you owe income tax on the converted amount, which is paid from your other accounts.\n\nFunding the TAX: Withdrawals come from After-Tax first, then IRA if needed. The conversion itself reduces your IRA balance.',
    formula: 'IRA → Roth Transfer (internal, no cash)\nTax Cost = Conversion × Marginal Rate\n\nMoney Flow:\n1. IRA decreases by conversion amount\n2. Roth increases by conversion amount\n3. Tax paid from AT (or IRA if AT insufficient)',
    backOfEnvelope: 'Converting $100K at 22% costs $22K tax (paid from AT/IRA)',
    compute: (data, params) => {
      const { rothConversion, taxableOrdinary, iraBOY, atWithdrawal, totalTax } = data;
      const heirRate = params.heirFedRate + params.heirStateRate;
      // Estimate marginal rate based on taxable income
      let marginalRate = 0.22;
      if (taxableOrdinary > 383900) marginalRate = 0.32;
      else if (taxableOrdinary > 201050) marginalRate = 0.24;
      else if (taxableOrdinary > 94300) marginalRate = 0.22;
      else if (taxableOrdinary > 23200) marginalRate = 0.12;
      else marginalRate = 0.10;

      const taxOnConversion = rothConversion * marginalRate;

      return {
        formula: rothConversion > 0
          ? `IRA (${fK(iraBOY)}) → moves ${fK(rothConversion)} to Roth`
          : `No conversion this year`,
        values: rothConversion > 0
          ? `Tax on conversion ≈ ${fK(taxOnConversion)} (at ${(marginalRate * 100).toFixed(0)}%)\nTotal tax bill: ${fK(totalTax)} (paid from withdrawals)`
          : `—`,
        result: rothConversion > 0
          ? `Heir savings = ${fK(rothConversion * heirRate)} (heirs pay 0% on Roth)`
          : `—`,
        simple: rothConversion > 0
          ? `${fK(rothConversion)} IRA→Roth, ~${fK(taxOnConversion)} tax`
          : 'No conversion'
      };
    }
  },

  // Heir Value
  heirValue: {
    name: 'After-Tax Heir Value',
    concept: 'What heirs receive after their taxes. After-Tax accounts get "step-up in basis" (no tax). Roth is tax-free. IRA is taxed at heir\'s marginal rate (10-year rule).',
    formula: 'Heir Value = AT + Roth + IRA × (1 − heir_rate)\n\nAT: Step-up basis at death, 0% tax\nRoth: Already tax-free, 0% tax\nIRA: Heir pays income tax over 10 years',
    backOfEnvelope: '≈ Portfolio × 0.85 (if mostly IRA) or × 1.0 (if mostly Roth/AT)',
    compute: (data, params) => {
      const { atEOY, iraEOY, rothEOY, heirValue, totalEOY } = data;
      const rate = params.heirFedRate + params.heirStateRate;
      const iraAfterTax = iraEOY * (1 - rate);
      const effectiveRate = totalEOY > 0 ? (1 - heirValue / totalEOY) : 0;
      return {
        formula: `Heir = AT + Roth + IRA × (1 − ${(rate * 100).toFixed(0)}%)`,
        values: `Heir = ${fK(atEOY)} + ${fK(rothEOY)} + ${fK(iraEOY)} × ${(1 - rate).toFixed(2)}`,
        result: `Heir Value = ${fM(heirValue)} (${((1 - effectiveRate) * 100).toFixed(0)}% of portfolio)`,
        simple: `${fM(totalEOY)} × ${((1 - effectiveRate)).toFixed(2)} ≈ ${fM(heirValue)}`
      };
    }
  },

  // EOY Totals
  totalEOY: {
    name: 'End of Year Portfolio',
    concept: 'Total portfolio value after withdrawals and investment growth. EOY = (BOY − Withdrawals − Conversions) × (1 + Return)',
    formula: 'EOY = (BOY − Withdrawals) × (1 + Return)\n\nAfter-Tax: Taxable account\nIRA: Tax-deferred, taxed on withdrawal\nRoth: Tax-free growth and withdrawal',
    backOfEnvelope: '≈ Last Year × 1.06 (assuming 6% average return)',
    compute: (data) => {
      const { totalBOY, totalEOY, totalWithdrawal, rothConversion } = data;
      const growth = totalEOY - totalBOY + totalWithdrawal;
      const returnPct = totalBOY > 0 ? (growth / totalBOY * 100).toFixed(1) : 0;
      return {
        formula: `EOY = BOY − Withdrawals + Growth`,
        values: `EOY = ${fM(totalBOY)} − ${fK(totalWithdrawal)} + ${fK(growth)}`,
        result: `Total = ${fM(totalEOY)} (${returnPct}% net growth)`,
        simple: `${fM(totalBOY)} × 1.06 ≈ ${fM(totalBOY * 1.06)}`
      };
    }
  },

  // Roth Percent
  rothPercent: {
    name: 'Roth Percentage',
    concept: 'Portion of portfolio in Roth accounts. Higher Roth % = more tax-free income in retirement and better heir value (heirs pay $0 tax on Roth).',
    formula: 'Roth % = Roth Balance ÷ Total Portfolio\n\nTarget: 30-50% Roth is often optimal\nBenefit: Tax-free withdrawals, tax-free to heirs',
    backOfEnvelope: 'Track this over time to see Roth conversion impact',
    compute: (data) => {
      const { rothEOY, totalEOY, rothPercent } = data;
      return {
        formula: `Roth % = Roth ÷ Total`,
        values: `Roth % = ${fM(rothEOY)} ÷ ${fM(totalEOY)}`,
        result: `Roth = ${(rothPercent * 100).toFixed(1)}% of portfolio`,
        simple: `${(rothPercent * 100).toFixed(0)}% in Roth`
      };
    }
  },

  // Cumulative Tax
  cumulativeTax: {
    name: 'Cumulative Tax Paid',
    concept: 'Running total of all taxes paid from start of projection. Helps compare strategies: lower cumulative tax = more wealth retained.',
    formula: 'Cumulative = Sum of all annual taxes\n\nIncludes: Federal, State, LTCG, NIIT\nExcludes: IRMAA (tracked separately)',
    backOfEnvelope: 'Compare across scenarios to find tax-efficient strategy',
    compute: (data) => {
      const { cumulativeTax, totalTax, year } = data;
      const yearsOfTax = cumulativeTax / totalTax;
      return {
        formula: `Running sum of annual taxes`,
        values: `Through ${year}: ${fK(cumulativeTax)}`,
        result: `Total Taxes = ${fM(cumulativeTax)}`,
        simple: `~${fK(totalTax)}/year × ${yearsOfTax.toFixed(0)} years`
      };
    }
  },

  // =============================================================================
  // WITHDRAWAL BREAKDOWNS
  // =============================================================================

  // After-Tax Withdrawal
  atWithdrawal: {
    name: 'After-Tax Withdrawal',
    concept: 'Cash withdrawn from taxable brokerage account. Used SECOND in withdrawal order (after any required RMD). Partially taxable - only the gains portion triggers capital gains tax.',
    formula: 'Withdrawal Order:\n1. IRA (RMD only, if age 73+)\n2. After-Tax ← YOU ARE HERE\n3. More IRA (if AT insufficient)\n4. Roth (last resort)\n\nTax: Only gains are taxed (at LTCG rates)',
    backOfEnvelope: 'AT covers need after SS and RMD',
    compute: (data) => {
      const { atWithdrawal, atBOY, totalWithdrawal, expenses, totalTax, ssAnnual, iraWithdrawal, rmdRequired, irmaaTotal } = data;
      const grossNeed = expenses + totalTax + irmaaTotal;
      const netNeed = Math.max(0, grossNeed - ssAnnual);
      const afterRMD = Math.max(0, netNeed - rmdRequired);
      const atPct = totalWithdrawal > 0 ? ((atWithdrawal / totalWithdrawal) * 100).toFixed(0) : 0;

      // Dynamic simple explanation
      let simple = '';
      if (atWithdrawal === 0) {
        if (atBOY === 0) simple = 'AT depleted - nothing to withdraw';
        else if (netNeed <= rmdRequired) simple = `RMD (${fK(rmdRequired)}) covered all needs`;
        else simple = 'AT not needed this year';
      } else if (atWithdrawal >= afterRMD) {
        simple = `Need ${fK(netNeed)} − SS covered, AT provided ${fK(atWithdrawal)}`;
      } else {
        simple = `AT had ${fK(atBOY)}, used all ${fK(atWithdrawal)}`;
      }

      return {
        formula: `Need: ${fK(expenses)} exp + ${fK(totalTax)} tax − ${fK(ssAnnual)} SS = ${fK(netNeed)}`,
        values: `AT available: ${fK(atBOY)}\nWithdrew: ${fK(atWithdrawal)}`,
        result: atWithdrawal > 0
          ? `${fK(atWithdrawal)} from After-Tax (${atPct}% of total)`
          : `$0 from After-Tax`,
        simple
      };
    }
  },

  // IRA Withdrawal
  iraWithdrawal: {
    name: 'IRA Withdrawal',
    concept: 'Cash withdrawn from Traditional IRA. Used FIRST (for RMD if 73+) and THIRD (if After-Tax insufficient). 100% taxable as ordinary income. Separate from Roth conversions.',
    formula: 'Withdrawal Order:\n1. IRA (RMD required) ← FIRST\n2. After-Tax\n3. More IRA (if needed) ← THIRD\n4. Roth (last resort)\n\nNote: Roth conversion is separate from withdrawal',
    backOfEnvelope: 'IRA withdrawal = max(RMD, need − AT)',
    compute: (data) => {
      const { iraWithdrawal, iraBOY, rmdRequired, rothConversion, totalWithdrawal, atBOY, atWithdrawal, age } = data;
      const isRMDAge = age >= 73;
      const beyondRMD = Math.max(0, iraWithdrawal - rmdRequired);
      const iraPct = totalWithdrawal > 0 ? ((iraWithdrawal / totalWithdrawal) * 100).toFixed(0) : 0;

      // Dynamic simple explanation based on what actually happened
      let simple = '';
      const rmdPct = iraBOY > 0 ? ((rmdRequired / iraBOY) * 100).toFixed(1) : 0;
      if (iraWithdrawal === 0) {
        simple = `Age ${age} (no RMD), AT covered all needs`;
      } else if (isRMDAge && beyondRMD === 0) {
        simple = `RMD = ${fK(rmdRequired)} (${rmdPct}% of ${fK(iraBOY)} IRA)`;
      } else if (isRMDAge && beyondRMD > 0) {
        simple = `RMD ${fK(rmdRequired)} (${rmdPct}% of IRA) + ${fK(beyondRMD)} extra needed`;
      } else if (beyondRMD > 0) {
        simple = `${fK(iraWithdrawal)} from IRA (AT's ${fK(atBOY)} wasn't enough)`;
      } else {
        simple = `${fK(iraWithdrawal)} from IRA`;
      }

      return {
        formula: isRMDAge
          ? `Age ${age}: RMD = ${fK(rmdRequired)}`
          : `Age ${age}: No RMD required`,
        values: rothConversion > 0
          ? `IRA: ${fK(iraBOY)} (${fK(rothConversion)} reserved for Roth conv)\nWithdrew: ${fK(iraWithdrawal)}${beyondRMD > 0 ? ` (${fK(rmdRequired)} RMD + ${fK(beyondRMD)} extra)` : ''}`
          : `IRA: ${fK(iraBOY)}\nWithdrew: ${fK(iraWithdrawal)}`,
        result: iraWithdrawal > 0
          ? `${fK(iraWithdrawal)} from IRA (${iraPct}% of withdrawals)`
          : `$0 from IRA`,
        simple
      };
    }
  },

  // Roth Withdrawal
  rothWithdrawal: {
    name: 'Roth Withdrawal',
    concept: 'Cash withdrawn from Roth IRA. Used LAST in withdrawal order - only when all other accounts are depleted. 100% tax-free. Preserving Roth maximizes tax-free growth and heir value.',
    formula: 'Withdrawal Order:\n1. IRA (RMD)\n2. After-Tax\n3. More IRA\n4. Roth ← LAST RESORT\n\nTax: $0 (completely tax-free)',
    backOfEnvelope: 'Roth withdrawal only if IRA + AT exhausted',
    compute: (data) => {
      const { rothWithdrawal, rothBOY, totalWithdrawal, atBOY, iraBOY, rothConversion } = data;

      // Dynamic simple explanation
      let simple = '';
      if (rothWithdrawal === 0) {
        if (rothConversion > 0) {
          simple = `Roth grew by ${fK(rothConversion)} conversion (no withdrawal needed)`;
        } else {
          simple = `Roth preserved at ${fK(rothBOY)} (IRA+AT sufficient)`;
        }
      } else {
        simple = `IRA+AT depleted, had to use ${fK(rothWithdrawal)} Roth`;
      }

      return {
        formula: `Roth available: ${fK(rothBOY)}`,
        values: rothWithdrawal > 0
          ? `IRA (${fK(iraBOY)}) + AT (${fK(atBOY)}) exhausted\nHad to tap Roth: ${fK(rothWithdrawal)}`
          : rothConversion > 0
            ? `Roth preserved + ${fK(rothConversion)} added from conversion`
            : `Roth preserved at ${fK(rothBOY)}`,
        result: rothWithdrawal > 0
          ? `${fK(rothWithdrawal)} from Roth (tax-free but reduces future growth)`
          : `$0 - Roth preserved`,
        simple
      };
    }
  },

  // =============================================================================
  // INDIVIDUAL ACCOUNT EOY BALANCES
  // =============================================================================

  // After-Tax EOY
  atEOY: {
    name: 'After-Tax End of Year',
    concept: 'Taxable brokerage account balance after withdrawals and investment growth. This account has the most flexible access but gains are taxable.',
    formula: 'AT_EOY = (AT_BOY − Withdrawal) × (1 + Return)\n\nNo conversions affect this account.\nWithdrawals trigger capital gains tax on the gains portion.',
    backOfEnvelope: 'AT grows by return, reduced by withdrawals',
    compute: (data) => {
      const { atBOY, atWithdrawal, atEOY, effectiveAtReturn, atReturn } = data;
      const afterWithdrawal = atBOY - atWithdrawal;
      const returnPct = (effectiveAtReturn * 100).toFixed(1);

      // Dynamic simple explanation
      let simple = '';
      if (atBOY === 0) {
        simple = 'AT was already depleted';
      } else if (atWithdrawal === 0) {
        simple = `${fK(atBOY)} start + ${returnPct}% growth = ${fK(atEOY)}`;
      } else if (atEOY === 0) {
        simple = `${fK(atBOY)} start fully withdrawn, now depleted`;
      } else {
        simple = `${fK(atBOY)} start − ${fK(atWithdrawal)} withdrawn + ${fK(atReturn)} growth = ${fK(atEOY)}`;
      }

      return {
        formula: atWithdrawal > 0
          ? `${fK(atBOY)} − ${fK(atWithdrawal)} withdrawal`
          : `${fK(atBOY)} (no withdrawal)`,
        values: `(${fK(afterWithdrawal)}) × ${(1 + effectiveAtReturn).toFixed(3)}\n+ ${fK(atReturn)} growth`,
        result: `After-Tax EOY = ${fK(atEOY)}`,
        simple
      };
    }
  },

  // IRA EOY
  iraEOY: {
    name: 'Traditional IRA End of Year',
    concept: 'Tax-deferred IRA balance after withdrawals, Roth conversions, and growth. Reduced by both withdrawals AND Roth conversions. All future withdrawals are taxable.',
    formula: 'IRA_EOY = (IRA_BOY − Withdrawal − Roth_Conversion) × (1 + Return)\n\nRoth conversion moves money OUT of IRA.\nRMD forces minimum withdrawal at age 73+.',
    backOfEnvelope: 'IRA reduced by withdrawals + conversions, then grows',
    compute: (data) => {
      const { iraBOY, iraWithdrawal, rothConversion, iraEOY, effectiveIraReturn, iraReturn } = data;
      const totalOut = iraWithdrawal + rothConversion;
      const afterWithdrawal = iraBOY - totalOut;
      const returnPct = (effectiveIraReturn * 100).toFixed(1);

      // Dynamic simple explanation - show only significant terms
      let simple = '';
      if (totalOut > iraBOY * 0.5) {
        // Large reduction
        simple = `${fK(iraBOY)} start − ${fK(totalOut)} out (${rothConversion > 0 ? `${fK(rothConversion)} to Roth` : 'withdrawals'}) + growth = ${fK(iraEOY)}`;
      } else if (rothConversion > 0 && iraWithdrawal === 0) {
        simple = `${fK(iraBOY)} start − ${fK(rothConversion)} to Roth + ${fK(iraReturn)} growth = ${fK(iraEOY)}`;
      } else if (rothConversion > 0) {
        simple = `${fK(iraBOY)} start − ${fK(iraWithdrawal)} withdrawn − ${fK(rothConversion)} to Roth + growth = ${fK(iraEOY)}`;
      } else if (iraWithdrawal > 0) {
        simple = `${fK(iraBOY)} start − ${fK(iraWithdrawal)} withdrawn + ${fK(iraReturn)} growth = ${fK(iraEOY)}`;
      } else {
        simple = `${fK(iraBOY)} start + ${returnPct}% growth = ${fK(iraEOY)}`;
      }

      return {
        formula: rothConversion > 0
          ? `${fK(iraBOY)} − ${fK(iraWithdrawal)} withdrawal − ${fK(rothConversion)} → Roth`
          : `${fK(iraBOY)} − ${fK(iraWithdrawal)} withdrawal`,
        values: `(${fK(afterWithdrawal)}) × ${(1 + effectiveIraReturn).toFixed(3)}\n+ ${fK(iraReturn)} growth`,
        result: `IRA EOY = ${fK(iraEOY)}`,
        simple
      };
    }
  },

  // Roth EOY
  rothEOY: {
    name: 'Roth IRA End of Year',
    concept: 'Tax-free Roth balance after any withdrawals, plus conversions, plus growth. Roth conversions ADD to this account. Growth and withdrawals are completely tax-free.',
    formula: 'Roth_EOY = (Roth_BOY − Withdrawal + Roth_Conversion) × (1 + Return)\n\nRoth conversion moves money INTO Roth.\nWithdrawals are tax-free (last resort).',
    backOfEnvelope: 'Roth grows tax-free, boosted by conversions',
    compute: (data) => {
      const { rothBOY, rothWithdrawal, rothConversion, rothEOY, effectiveRothReturn, rothReturn } = data;
      const afterAdjustments = rothBOY - rothWithdrawal + rothConversion;
      const returnPct = (effectiveRothReturn * 100).toFixed(1);

      // Dynamic simple explanation
      let simple = '';
      if (rothConversion > 0 && rothWithdrawal === 0) {
        const growth = rothEOY - rothBOY - rothConversion;
        simple = `${fK(rothBOY)} start + ${fK(rothConversion)} converted + ${fK(growth)} growth = ${fK(rothEOY)}`;
      } else if (rothWithdrawal > 0) {
        simple = `${fK(rothBOY)} start − ${fK(rothWithdrawal)} withdrawal + growth = ${fK(rothEOY)}`;
      } else {
        simple = `${fK(rothBOY)} start + ${returnPct}% growth = ${fK(rothEOY)}`;
      }

      return {
        formula: rothConversion > 0
          ? `${fK(rothBOY)} + ${fK(rothConversion)} from IRA conversion`
          : rothWithdrawal > 0
            ? `${fK(rothBOY)} − ${fK(rothWithdrawal)} withdrawal`
            : `${fK(rothBOY)} (no changes)`,
        values: `(${fK(afterAdjustments)}) × ${(1 + effectiveRothReturn).toFixed(3)}\n+ ${fK(rothReturn)} growth`,
        result: `Roth EOY = ${fK(rothEOY)}`,
        simple
      };
    }
  },
};

export function CalculationInspector({ field, data, params, onClose }) {
  const [view, setView] = useState('concept');

  const calc = CALCULATIONS[field];
  if (!calc) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-slate-800 rounded-lg p-4 max-w-md" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-slate-200">{field}</span>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-400 text-sm">
            Value: {fmt$(data[field])}
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Detailed explanation not yet available for this field.
          </p>
        </div>
      </div>
    );
  }

  const computed = calc.compute(data, params);

  const views = [
    { id: 'concept', icon: BookOpen, label: 'Concept' },
    { id: 'formula', icon: Calculator, label: 'Formula' },
    { id: 'values', icon: Hash, label: 'Values' },
    { id: 'simple', icon: Lightbulb, label: 'Simple' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg p-4 max-w-lg w-full mx-4 shadow-xl border border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="font-medium text-blue-400">{calc.name}</span>
            <span className="text-slate-500 text-sm ml-2">({data.year})</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mb-4 bg-slate-900 rounded p-1">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs transition-colors ${
                view === v.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <v.icon className="w-3 h-3" />
              {v.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-slate-900 rounded p-4 min-h-[140px]">
          {view === 'concept' && (
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {calc.concept}
            </p>
          )}

          {view === 'formula' && (
            <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {calc.formula}
            </pre>
          )}

          {view === 'values' && (
            <div className="space-y-2 font-mono text-sm">
              <div className="text-slate-400">{computed.formula}</div>
              <div className="text-amber-400">{computed.values}</div>
              <div className="text-emerald-400 font-medium text-base">{computed.result}</div>
            </div>
          )}

          {view === 'simple' && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-2xl font-mono text-blue-400 text-center">
                {computed.simple}
              </div>
              <div className="text-slate-500 text-xs mt-3">Back-of-envelope calculation</div>
            </div>
          )}
        </div>

        {/* Quick reference */}
        <div className="mt-3 p-3 bg-slate-900/50 rounded border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Quick Mental Math:</div>
          <div className="text-sm text-slate-300">{calc.backOfEnvelope}</div>
        </div>
      </div>
    </div>
  );
}

export default CalculationInspector;
