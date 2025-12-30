/**
 * CalculationInspector - Shows calculation breakdown with navigation
 *
 * Unified single-page layout showing all sections at once:
 * 1. Quick Answer - Large, centered back-of-envelope result
 * 2. What is this? - Concept explanation
 * 3. Formula - Color-coded with clickable variable names
 * 4. This Year's Values - Formula -> values -> result
 * 5. Rule of Thumb - Quick mental math
 * 6. Used By - Shows which calculations depend on this value
 */

import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

import { CELL_DEPENDENCIES, getReverseDependencies } from '../../lib/calculationDependencies';
import { FORMULA_COLORS } from '../../lib/colors';
import { fmt$, fmtPct } from '../../lib/formatters';

// Helper to format a number
const f$ = v => '$' + Math.round(v).toLocaleString();
const fK = v => '$' + (v / 1000).toFixed(0) + 'K';
const fM = v => '$' + (v / 1000000).toFixed(2) + 'M';

/**
 * ClickableFormula - Renders formula text with clickable, color-coded variable names
 * Variables are highlighted and clicking them navigates to the source calculation
 */
function ClickableFormula({ formula, data, projections, onNavigate, currentField }) {
  if (!formula) return null;

  // Build a regex pattern that matches all known variable names
  // Sort by length descending to match longer names first (e.g., "totalWithdrawal" before "total")
  const variableNames = Object.keys(FORMULA_COLORS).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${variableNames.join('|')})\\b`, 'gi');

  // Split the formula by variable names while keeping the matches
  const parts = [];
  let lastIndex = 0;

  // Use matchAll to find all matches
  const matches = [...formula.matchAll(new RegExp(pattern.source, 'gi'))];

  matches.forEach(match => {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: formula.slice(lastIndex, match.index),
      });
    }

    // Find the variable config (case-insensitive lookup)
    const matchedText = match[0];
    const varKey = Object.keys(FORMULA_COLORS).find(
      k => k.toLowerCase() === matchedText.toLowerCase()
    );
    const varConfig = varKey ? FORMULA_COLORS[varKey] : null;
    const value = varKey && data ? data[varKey] : undefined;

    // Find the dependency for this variable
    let dependency = null;
    if (varKey && currentField && CELL_DEPENDENCIES[currentField]) {
      const deps = CELL_DEPENDENCIES[currentField](data.year, data, projections);
      dependency = deps.find(d => d.field === varKey);
    }

    parts.push({
      type: 'variable',
      content: matchedText,
      config: varConfig,
      value,
      varKey,
      dependency,
    });

    lastIndex = match.index + match[0].length;
  });

  // Add remaining text after last match
  if (lastIndex < formula.length) {
    parts.push({
      type: 'text',
      content: formula.slice(lastIndex),
    });
  }

  // If no matches were found, just return the formula as-is
  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap">{formula}</span>;
  }

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          return <span key={idx}>{part.content}</span>;
        }

        // Variable with color
        const { config, value, content, varKey, dependency } = part;
        if (!config) {
          return <span key={idx}>{content}</span>;
        }

        // Format the value for display
        let formattedValue = '';
        if (value !== undefined && value !== null) {
          if (typeof value === 'number') {
            if (config.key && (config.key.includes('Return') || config.key.includes('Percent'))) {
              formattedValue = fmtPct(value);
            } else if (Math.abs(value) >= 1000000) {
              formattedValue = fM(value);
            } else if (Math.abs(value) >= 1000) {
              formattedValue = fK(value);
            } else {
              formattedValue = f$(value);
            }
          } else {
            formattedValue = String(value);
          }
        }

        // Check if this variable is clickable (has a dependency or is a known calc)
        const isClickable = dependency || CALCULATIONS[varKey];
        const targetYear = dependency?.year || data.year;
        const targetData = projections?.find(p => p.year === targetYear);

        const handleClick = () => {
          if (isClickable && onNavigate && targetData) {
            onNavigate(varKey, targetYear, targetData);
          }
        };

        if (isClickable) {
          return (
            <button
              key={idx}
              onClick={handleClick}
              style={{ color: config.color, borderBottom: `2px solid ${config.color}` }}
              className="font-medium hover:bg-white/10 rounded px-0.5 cursor-pointer inline-flex items-baseline gap-1"
              title={`Click to see ${config.label} calculation${dependency?.year !== data.year ? ` (${dependency?.year})` : ''}`}
            >
              <span className="text-xs opacity-70">{content}</span>
              {formattedValue && <span>{formattedValue}</span>}
            </button>
          );
        }

        // Non-clickable variable (just display)
        return (
          <span
            key={idx}
            style={{
              color: config.color,
              borderBottom: `2px solid ${config.color}`,
            }}
            title={formattedValue ? `${config.label}: ${formattedValue}` : config.label}
            className="font-medium"
          >
            {content}
            {formattedValue && <span className="ml-1 opacity-80">{formattedValue}</span>}
          </span>
        );
      })}
    </span>
  );
}

/**
 * ColorCodedFormula - Legacy component for non-navigable contexts
 * Variables are highlighted with their semantic colors and show values on hover
 */
function ColorCodedFormula({ formula, data }) {
  if (!formula) return null;

  // Build a regex pattern that matches all known variable names
  // Sort by length descending to match longer names first (e.g., "totalWithdrawal" before "total")
  const variableNames = Object.keys(FORMULA_COLORS).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${variableNames.join('|')})\\b`, 'gi');

  // Split the formula by variable names while keeping the matches
  const parts = [];
  let lastIndex = 0;

  // Use matchAll to find all matches
  const matches = [...formula.matchAll(new RegExp(pattern.source, 'gi'))];

  matches.forEach(match => {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: formula.slice(lastIndex, match.index),
      });
    }

    // Find the variable config (case-insensitive lookup)
    const matchedText = match[0];
    const varKey = Object.keys(FORMULA_COLORS).find(
      k => k.toLowerCase() === matchedText.toLowerCase()
    );
    const varConfig = varKey ? FORMULA_COLORS[varKey] : null;
    const value = varKey && data ? data[varKey] : undefined;

    parts.push({
      type: 'variable',
      content: matchedText,
      config: varConfig,
      value,
    });

    lastIndex = match.index + match[0].length;
  });

  // Add remaining text after last match
  if (lastIndex < formula.length) {
    parts.push({
      type: 'text',
      content: formula.slice(lastIndex),
    });
  }

  // If no matches were found, just return the formula as-is
  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap">{formula}</span>;
  }

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          return <span key={idx}>{part.content}</span>;
        }

        // Variable with color
        const { config, value, content } = part;
        if (!config) {
          return <span key={idx}>{content}</span>;
        }

        // Format the value for tooltip
        let formattedValue = '';
        if (value !== undefined && value !== null) {
          if (typeof value === 'number') {
            if (config.key && (config.key.includes('Return') || config.key.includes('Percent'))) {
              formattedValue = fmtPct(value);
            } else if (Math.abs(value) >= 1000000) {
              formattedValue = fM(value);
            } else if (Math.abs(value) >= 1000) {
              formattedValue = fK(value);
            } else {
              formattedValue = f$(value);
            }
          } else {
            formattedValue = String(value);
          }
        }

        const tooltipText = formattedValue ? `${config.label}: ${formattedValue}` : config.label;

        return (
          <span
            key={idx}
            style={{
              color: config.color,
              borderBottom: `2px solid ${config.color}`,
              cursor: 'help',
            }}
            title={tooltipText}
            className="font-medium"
          >
            {content}
          </span>
        );
      })}
    </span>
  );
}

// Calculation definitions - maps field keys to explanations
const CALCULATIONS = {
  // =============================================================================
  // BEGINNING OF YEAR BALANCES
  // =============================================================================

  atBOY: {
    name: 'After-Tax Beginning of Year',
    concept:
      "This is the after-tax (taxable brokerage) account balance at the start of the year. For the first projection year, this equals your starting after-tax balance from inputs. For subsequent years, it equals the prior year's end-of-year after-tax balance. This account is withdrawn from second (after RMD), and gains are taxed at capital gains rates.",
    formula: 'atBOY = Prior Year atEOY\n\nFirst Year: atBOY = Starting AT Balance (from inputs)',
    backOfEnvelope: 'Start of year = end of prior year',
    compute: data => {
      const isFirstYear = data.yearsFromStart === 0;
      return {
        formula: isFirstYear
          ? 'First projection year: Starting balance from inputs'
          : `atBOY ${data.year} = atEOY ${data.year - 1}`,
        values: isFirstYear
          ? `Starting AT: ${fK(data.atBOY)}`
          : `Prior EOY (${data.year - 1}): ${fK(data.atBOY)}`,
        result: `After-Tax BOY: ${fK(data.atBOY)}`,
        simple: fK(data.atBOY),
      };
    },
  },

  iraBOY: {
    name: 'Traditional IRA Beginning of Year',
    concept:
      "This is the Traditional IRA (tax-deferred) balance at the start of the year. For the first projection year, this equals your starting IRA balance from inputs. For subsequent years, it equals the prior year's end-of-year IRA balance. Withdrawals are taxed as ordinary income. RMDs are required starting at age 73.",
    formula:
      'iraBOY = Prior Year iraEOY\n\nFirst Year: iraBOY = Starting IRA Balance (from inputs)',
    backOfEnvelope: 'Start of year = end of prior year',
    compute: data => {
      const isFirstYear = data.yearsFromStart === 0;
      return {
        formula: isFirstYear
          ? 'First projection year: Starting balance from inputs'
          : `iraBOY ${data.year} = iraEOY ${data.year - 1}`,
        values: isFirstYear
          ? `Starting IRA: ${fK(data.iraBOY)}`
          : `Prior EOY (${data.year - 1}): ${fK(data.iraBOY)}`,
        result: `IRA BOY: ${fK(data.iraBOY)}`,
        simple: fK(data.iraBOY),
      };
    },
  },

  rothBOY: {
    name: 'Roth IRA Beginning of Year',
    concept:
      "This is the Roth IRA (tax-free) balance at the start of the year. For the first projection year, this equals your starting Roth balance from inputs. For subsequent years, it equals the prior year's end-of-year Roth balance. Roth grows tax-free and withdrawals are tax-free. This is the last account tapped in withdrawals.",
    formula:
      'rothBOY = Prior Year rothEOY\n\nFirst Year: rothBOY = Starting Roth Balance (from inputs)',
    backOfEnvelope: 'Start of year = end of prior year',
    compute: data => {
      const isFirstYear = data.yearsFromStart === 0;
      return {
        formula: isFirstYear
          ? 'First projection year: Starting balance from inputs'
          : `rothBOY ${data.year} = rothEOY ${data.year - 1}`,
        values: isFirstYear
          ? `Starting Roth: ${fK(data.rothBOY)}`
          : `Prior EOY (${data.year - 1}): ${fK(data.rothBOY)}`,
        result: `Roth BOY: ${fK(data.rothBOY)}`,
        simple: fK(data.rothBOY),
      };
    },
  },

  totalBOY: {
    name: 'Total Portfolio Beginning of Year',
    concept:
      "This is the sum of all three account types at the start of the year: After-Tax + Traditional IRA + Roth IRA. For the first projection year, this equals the sum of your starting balances from inputs. For subsequent years, it equals the prior year's total end-of-year balance.",
    formula:
      'totalBOY = atBOY + iraBOY + rothBOY\n\nOr equivalently: totalBOY = Prior Year totalEOY',
    backOfEnvelope: 'AT + IRA + Roth at start of year',
    compute: data => {
      return {
        formula: 'totalBOY = atBOY + iraBOY + rothBOY',
        values: `${fK(data.atBOY)} + ${fK(data.iraBOY)} + ${fK(data.rothBOY)}`,
        result: `Total BOY: ${fM(data.totalBOY)}`,
        simple: fM(data.totalBOY),
      };
    },
  },

  // =============================================================================
  // FEDERAL TAX
  // =============================================================================

  federalTax: {
    name: 'Federal Income Tax',
    concept:
      'Progressive tax on ordinary income after deductions. Income is taxed at increasing rates as it fills each bracket: 10% -> 12% -> 22% -> 24% -> 32% -> 35% -> 37%. Most retirees fall in the 22-24% brackets.',
    formula:
      'federalTax = Sum(Income_in_bracket x Bracket_rate)\n\ntaxableOrdinary = ordinaryIncome - standardDeduction\nordinaryIncome = taxableSS + iraWithdrawal + rothConversion',
    backOfEnvelope: 'For most retirees: taxableOrdinary x 22%',
    compute: data => {
      const { taxableOrdinary, ordinaryIncome, standardDeduction, federalTax } = data;
      const effectiveRate =
        ordinaryIncome > 0 ? ((federalTax / ordinaryIncome) * 100).toFixed(1) : 0;
      return {
        formula: `taxableOrdinary = ordinaryIncome - standardDeduction`,
        values: `${fK(ordinaryIncome)} - ${fK(standardDeduction)} = ${fK(taxableOrdinary)}`,
        result: `Federal Tax = ${fK(federalTax)} (${effectiveRate}% effective rate)`,
        simple: `${fK(taxableOrdinary)} x 22% = ${fK(taxableOrdinary * 0.22)}`,
      };
    },
  },

  // =============================================================================
  // TOTAL TAX
  // =============================================================================

  totalTax: {
    name: 'Total Annual Tax',
    concept:
      'Sum of all taxes: Federal income tax on ordinary income, capital gains tax (LTCG), Net Investment Income Tax (NIIT), and Illinois state tax on investment income only.',
    formula:
      'totalTax = federalTax + ltcgTax + niit + stateTax\n\nFederal: Progressive brackets on ordinary income\nLTCG: 0%/15%/20% on capital gains (stacks on ordinary)\nNIIT: 3.8% on investment income above $250K MAGI\nIL State: 4.95% on investment income only',
    backOfEnvelope: 'federalTax + (capitalGains x 18%)',
    compute: data => {
      const { federalTax, ltcgTax, niit, stateTax, totalTax, capitalGains } = data;
      return {
        formula: `totalTax = federalTax + ltcgTax + niit + stateTax`,
        values: `${fK(federalTax)} + ${fK(ltcgTax)} + ${fK(niit)} + ${fK(stateTax)}`,
        result: `Total Tax = ${fK(totalTax)}`,
        simple:
          capitalGains > 0
            ? `${fK(federalTax)} + ${fK(capitalGains)} x 18% = ${fK(totalTax)}`
            : `${fK(federalTax)} (minimal cap gains)`,
      };
    },
  },

  // =============================================================================
  // LTCG TAX
  // =============================================================================

  ltcgTax: {
    name: 'Long-Term Capital Gains Tax',
    concept:
      'Tax on gains from selling investments held over 1 year. LTCG brackets "stack" on top of ordinary income - your capital gains are added after your taxable ordinary income to determine which rate applies to each portion of gains.',
    formula:
      'ltcgTax = Sum of (gains in each bracket × rate)\n\n' +
      'Ordinary Income fills brackets first:\n' +
      '  taxableOrdinary → fills 0%, 15%, 20% brackets\n\n' +
      'Capital Gains stack on top:\n' +
      '  Gains in 0% bracket: up to $94K total\n' +
      '  Gains in 15% bracket: $94K - $584K total\n' +
      '  Gains in 20% bracket: above $584K total',
    backOfEnvelope: 'capitalGains × 15% (most common)',
    compute: data => {
      const { capitalGains, ltcgTax, taxableOrdinary } = data;

      // Calculate bracket breakdown
      const bracket0Max = 94050;
      const bracket15Max = 583750;

      // How much room in each bracket after ordinary income
      const roomIn0 = Math.max(0, bracket0Max - taxableOrdinary);
      const roomIn15 =
        taxableOrdinary < bracket15Max ? bracket15Max - Math.max(taxableOrdinary, bracket0Max) : 0;

      // How gains fill each bracket
      const gainsIn0 = Math.min(capitalGains, roomIn0);
      const gainsIn15 = Math.min(Math.max(0, capitalGains - gainsIn0), roomIn15);
      const gainsIn20 = Math.max(0, capitalGains - gainsIn0 - gainsIn15);

      // Calculate tax from each bracket (0% bracket contributes $0)
      const taxFrom15 = gainsIn15 * 0.15;
      const taxFrom20 = gainsIn20 * 0.2;

      let bracketBreakdown = '';
      if (gainsIn0 > 0) bracketBreakdown += `  0% bracket: ${fK(gainsIn0)} × 0% = $0\n`;
      if (gainsIn15 > 0)
        bracketBreakdown += `  15% bracket: ${fK(gainsIn15)} × 15% = ${fK(taxFrom15)}\n`;
      if (gainsIn20 > 0)
        bracketBreakdown += `  20% bracket: ${fK(gainsIn20)} × 20% = ${fK(taxFrom20)}`;

      const effectiveRate = capitalGains > 0 ? ((ltcgTax / capitalGains) * 100).toFixed(1) : 0;

      return {
        formula: `Ordinary income (${fK(taxableOrdinary)}) fills brackets first\nCapital gains (${fK(capitalGains)}) stack on top:`,
        values: bracketBreakdown || 'No capital gains',
        result: `LTCG Tax = ${fK(ltcgTax)} (${effectiveRate}% effective)`,
        simple:
          capitalGains > 0
            ? `${fK(capitalGains)} × ${effectiveRate}% = ${fK(ltcgTax)}`
            : '$0 (no gains)',
      };
    },
  },

  // =============================================================================
  // NIIT
  // =============================================================================

  niit: {
    name: 'Net Investment Income Tax (NIIT)',
    concept:
      'Additional 3.8% Medicare surtax on investment income when MAGI exceeds $250K (MFJ). Only applies to the lesser of: investment income OR excess over threshold.',
    formula:
      'niit = 3.8% x min(Investment Income, MAGI - $250K)\n\nInvestment Income includes:\n- Capital gains\n- Dividends\n- Interest (not tax-exempt)',
    backOfEnvelope: '3.8% x capitalGains (if MAGI > $250K)',
    compute: data => {
      const { capitalGains, niit, ordinaryIncome } = data;
      const magi = ordinaryIncome + capitalGains;
      const threshold = 250000;
      const excess = Math.max(0, magi - threshold);
      return {
        formula: `MAGI = ${fK(magi)}, Threshold = $250K`,
        values:
          excess > 0
            ? `niit = 3.8% x min(${fK(capitalGains)}, ${fK(excess)})`
            : `MAGI below threshold, no NIIT`,
        result: `NIIT = ${fK(niit)}`,
        simple:
          excess > 0
            ? `${fK(capitalGains)} x 3.8% = ${fK(capitalGains * 0.038)}`
            : '$0 (below threshold)',
      };
    },
  },

  // =============================================================================
  // STATE TAX
  // =============================================================================

  stateTax: {
    name: 'Illinois State Tax',
    concept:
      'Illinois taxes investment income at 4.95% flat rate. Retirement income (Social Security, IRA/401k distributions) is EXEMPT from IL tax.',
    formula:
      'stateTax = Investment Income x 4.95%\n\nTaxable: Capital gains, dividends, interest\nExempt: SS, IRA distributions, Roth, pensions',
    backOfEnvelope: 'capitalGains x 5%',
    compute: data => {
      const { capitalGains, stateTax } = data;
      return {
        formula: `Only investment income is taxable in IL`,
        values: `stateTax = ${fK(capitalGains)} x 4.95%`,
        result: `State Tax = ${fK(stateTax)}`,
        simple: `${fK(capitalGains)} x 5% = ${fK(capitalGains * 0.05)}`,
      };
    },
  },

  // =============================================================================
  // PROPERTY TAX & SALT
  // =============================================================================

  propertyTax: {
    name: 'Property Tax',
    concept:
      'Annual property tax on your primary residence. This is a fixed annual expense that does not inflate with the general expense inflation. Subject to the SALT (State and Local Tax) deduction cap for itemized deductions.',
    formula:
      'propertyTax = Annual Property Tax (input)\n\nFor federal itemization:\nDeductible = min(propertyTax, SALT Cap)\n\nSALT Cap (2024):\nMFJ: $10,000\nSingle: $10,000',
    backOfEnvelope: 'Fixed annual amount, max $10K SALT deduction',
    compute: data => {
      const { propertyTax, deductiblePropertyTax, saltCap } = data;
      const cappedAmt = Math.min(propertyTax || 0, saltCap || 10000);
      const overCap = (propertyTax || 0) - cappedAmt;
      return {
        formula: `Property Tax = ${fK(propertyTax || 0)}/year`,
        values:
          overCap > 0
            ? `SALT Cap = ${fK(saltCap || 10000)}\nDeductible = ${fK(cappedAmt)}\nOver cap = ${fK(overCap)} (not deductible)`
            : `Fully deductible (under SALT cap)`,
        result: `Deductible Property Tax = ${fK(deductiblePropertyTax || cappedAmt)}`,
        simple: propertyTax > 0 ? fK(propertyTax) : '$0 property tax',
      };
    },
  },

  deductiblePropertyTax: {
    name: 'Deductible Property Tax (SALT)',
    concept:
      'The portion of property tax that can be deducted for federal itemized deductions. Limited by the SALT cap ($10,000 for both MFJ and single filers under current law).',
    formula:
      'deductiblePropertyTax = min(propertyTax, saltCap)\n\nSALT Cap limits:\n- MFJ: $10,000\n- Single: $10,000\n\nNote: IL residents using standard deduction get no property tax benefit.',
    backOfEnvelope: 'Lesser of property tax or $10K',
    compute: data => {
      const { propertyTax, deductiblePropertyTax, saltCap } = data;
      const overCap = (propertyTax || 0) - (deductiblePropertyTax || 0);
      return {
        formula: `min(propertyTax, saltCap)`,
        values: `min(${fK(propertyTax || 0)}, ${fK(saltCap || 10000)})`,
        result: `Deductible = ${fK(deductiblePropertyTax || 0)}${overCap > 0 ? ` (${fK(overCap)} over cap)` : ''}`,
        simple: fK(deductiblePropertyTax || 0),
      };
    },
  },

  // =============================================================================
  // TAXABLE SOCIAL SECURITY
  // =============================================================================

  taxableSS: {
    name: 'Taxable Social Security',
    concept:
      'Up to 85% of Social Security may be taxable, based on "combined income" = AGI + 50% of SS. Below $32K (MFJ): 0% taxable. $32K-$44K: up to 50%. Above $44K: up to 85%.',
    formula:
      'Combined Income = Other Income + 0.5 x ssAnnual\n\nIf Combined <= $32K: 0% taxable\nIf Combined <= $44K: up to 50% taxable\nIf Combined > $44K: up to 85% taxable',
    backOfEnvelope: '85% x ssAnnual (for most retirees with other income)',
    compute: data => {
      const { ssAnnual, taxableSS, ordinaryIncome } = data;
      const combined = ordinaryIncome + 0.5 * ssAnnual;
      const pct = ssAnnual > 0 ? ((taxableSS / ssAnnual) * 100).toFixed(0) : 0;
      return {
        formula: `Combined = ${fK(ordinaryIncome)} + 0.5 x ${fK(ssAnnual)}`,
        values: `Combined Income = ${fK(combined)}`,
        result: `taxableSS = ${fK(taxableSS)} (${pct}% of SS)`,
        simple: `85% x ${fK(ssAnnual)} = ${fK(ssAnnual * 0.85)}`,
      };
    },
  },

  // =============================================================================
  // IRMAA
  // =============================================================================

  irmaaTotal: {
    name: 'Total Medicare Premium',
    concept:
      'Total Medicare cost including base Part B premium plus any IRMAA surcharges. IRMAA (Income-Related Monthly Adjustment Amount) is an extra premium if MAGI from 2 years ago exceeds thresholds.',
    formula:
      'irmaaTotal = Base Part B + Part B Surcharge + Part D Surcharge\n\n' +
      'Base Part B (2024): $174.70/mo per person\n' +
      'Surcharges apply if MAGI (2 years prior) exceeds:\n' +
      '  > $206K (MFJ): +$70/mo Part B, +$13/mo Part D\n' +
      '  > $258K: +$175/mo Part B, +$33/mo Part D\n' +
      '  ... up to +$419/mo Part B, +$81/mo Part D',
    backOfEnvelope: '$4,200/yr base for couple, more if MAGI > $206K',
    compute: data => {
      const { irmaaMAGI, irmaaPartB, irmaaPartD, irmaaTotal } = data;
      // Base Part B premium for couple: $174.70 × 12 × 2 = $4,192.80
      const baseAnnual = Math.round(174.7 * 12 * 2);
      const surchargeB = Math.max(0, irmaaPartB - baseAnnual);
      const surchargeD = irmaaPartD || 0;

      let values;
      if (surchargeB > 0 || surchargeD > 0) {
        values = `Base Part B: ${fK(baseAnnual)}\nPart B Surcharge: +${fK(surchargeB)}\nPart D Surcharge: +${fK(surchargeD)}`;
      } else {
        values = `Base Part B: ${fK(baseAnnual)}\nNo IRMAA surcharges (MAGI below $206K)`;
      }

      return {
        formula: `Based on ${data.year - 2} MAGI = ${fK(irmaaMAGI)}`,
        values,
        result: `Total Medicare = ${fK(irmaaTotal)}`,
        simple:
          surchargeB > 0 || surchargeD > 0
            ? `${fK(baseAnnual)} base + ${fK(surchargeB + surchargeD)} surcharge`
            : `${fK(irmaaTotal)} (base only)`,
      };
    },
  },

  // =============================================================================
  // RMD REQUIRED
  // =============================================================================

  rmdRequired: {
    name: 'Required Minimum Distribution',
    concept:
      'Annual required withdrawal from Traditional IRA starting at age 73 (SECURE 2.0). Amount = IRA Balance / Life Expectancy Factor from IRS Uniform Lifetime Table.',
    formula:
      'rmdRequired = iraBOY / rmdFactor\n\nAge 73: Factor = 26.5\nAge 75: Factor = 24.6\nAge 80: Factor = 20.2\nAge 85: Factor = 16.0\nAge 90: Factor = 12.2',
    backOfEnvelope: 'RMD % increases with age (starts ~3.8% at 73)',
    compute: data => {
      const { iraBOY, rmdFactor, rmdRequired, age } = data;
      const rmdPct = iraBOY > 0 ? ((rmdRequired / iraBOY) * 100).toFixed(1) : 0;

      let simple = '';
      if (age < 73) {
        simple = `Age ${age}: No RMD required until age 73`;
      } else {
        simple = `${fK(rmdRequired)} = ${rmdPct}% of ${fK(iraBOY)} IRA`;
      }

      return {
        formula:
          age >= 73
            ? `Age ${age}: rmdFactor = ${rmdFactor.toFixed(1)}`
            : `Age ${age}: RMD not required (starts at 73)`,
        values:
          age >= 73
            ? `rmdRequired = ${fK(iraBOY)} / ${rmdFactor.toFixed(1)} = ${fK(rmdRequired)}`
            : `$0 required`,
        result:
          age >= 73 ? `RMD = ${fK(rmdRequired)} (${rmdPct}% of IRA)` : `$0 - not yet required`,
        simple,
      };
    },
  },

  // =============================================================================
  // TOTAL WITHDRAWAL
  // =============================================================================

  totalWithdrawal: {
    name: 'Total Withdrawal Needed',
    concept:
      'Total cash withdrawn from accounts = Expenses + Taxes + IRMAA - Social Security. Withdrawal order: IRA first (for RMD), then After-Tax, then more IRA, finally Roth.',
    formula:
      'Need = expenses + totalTax + irmaaTotal - ssAnnual\n\nWithdrawal Order:\n1. IRA (at least RMD)\n2. After-Tax (preserves tax-deferred growth)\n3. More IRA (if needed)\n4. Roth (last resort, preserves tax-free growth)',
    backOfEnvelope: 'expenses x 1.2 (assumes ~20% for taxes)',
    compute: data => {
      const { expenses, totalTax, irmaaTotal, ssAnnual, totalWithdrawal } = data;
      const _need = expenses + totalTax + irmaaTotal - ssAnnual;
      const taxPct = expenses > 0 ? ((totalWithdrawal / expenses - 1) * 100).toFixed(0) : 0;
      return {
        formula: `Need = expenses + totalTax + irmaaTotal - ssAnnual`,
        values: `Need = ${fK(expenses)} + ${fK(totalTax)} + ${fK(irmaaTotal)} - ${fK(ssAnnual)}`,
        result: `Withdrawal = ${fK(totalWithdrawal)}`,
        simple: `${fK(expenses)} x 1.${taxPct} = ${fK(totalWithdrawal)}`,
      };
    },
  },

  // =============================================================================
  // ROTH CONVERSION
  // =============================================================================

  rothConversion: {
    name: 'Roth Conversion',
    concept:
      'Internal transfer from Traditional IRA to Roth IRA. The conversion amount moves directly between accounts (no cash withdrawn). However, you owe income tax on the converted amount, which is paid from your other accounts.\n\nFunding the TAX: Withdrawals come from After-Tax first, then IRA if needed. The conversion itself reduces your IRA balance.',
    formula:
      'IRA -> Roth Transfer (internal, no cash)\nTax Cost = rothConversion x Marginal Rate\n\nMoney Flow:\n1. IRA decreases by rothConversion amount\n2. Roth increases by rothConversion amount\n3. Tax paid from AT (or IRA if AT insufficient)',
    backOfEnvelope: 'Converting $100K at 22% costs $22K tax (paid from AT/IRA)',
    compute: (data, params) => {
      const { rothConversion, taxableOrdinary, iraBOY, totalTax, heirDetails } = data;
      const heirRate =
        heirDetails && heirDetails.length > 0
          ? heirDetails.reduce((sum, h) => sum + h.rates.combined * h.split, 0)
          : params.heirFedRate + params.heirStateRate;
      let marginalRate = 0.22;
      if (taxableOrdinary > 383900) marginalRate = 0.32;
      else if (taxableOrdinary > 201050) marginalRate = 0.24;
      else if (taxableOrdinary > 94300) marginalRate = 0.22;
      else if (taxableOrdinary > 23200) marginalRate = 0.12;
      else marginalRate = 0.1;

      const taxOnConversion = rothConversion * marginalRate;

      return {
        formula:
          rothConversion > 0
            ? `iraBOY (${fK(iraBOY)}) -> moves ${fK(rothConversion)} to Roth`
            : `No conversion this year`,
        values:
          rothConversion > 0
            ? `Tax on conversion = ${fK(taxOnConversion)} (at ${(marginalRate * 100).toFixed(0)}%)\nTotal tax bill: ${fK(totalTax)} (paid from withdrawals)`
            : `-`,
        result:
          rothConversion > 0
            ? `Heir savings = ${fK(rothConversion * heirRate)} (heirs pay 0% on Roth)`
            : `-`,
        simple:
          rothConversion > 0
            ? `${fK(rothConversion)} IRA->Roth, ~${fK(taxOnConversion)} tax`
            : 'No conversion',
      };
    },
  },

  // =============================================================================
  // HEIR VALUE
  // =============================================================================

  heirValue: {
    name: 'After-Tax Heir Value',
    concept:
      'What heirs receive after their taxes. After-Tax accounts get "step-up in basis" (no tax). Roth is tax-free. IRA is taxed at heir\'s marginal rate (10-year rule).',
    formula:
      'heirValue = atEOY + rothEOY + iraEOY x (1 - heir_rate)\n\nAT: Step-up basis at death, 0% tax\nRoth: Already tax-free, 0% tax\nIRA: Heir pays income tax over 10 years',
    backOfEnvelope: 'Portfolio x 0.85 (if mostly IRA) or x 1.0 (if mostly Roth/AT)',
    compute: (data, params) => {
      const { atEOY, iraEOY, rothEOY, heirValue, totalEOY, heirDetails } = data;
      const effectiveRate = totalEOY > 0 ? 1 - heirValue / totalEOY : 0;

      if (heirDetails && heirDetails.length > 0) {
        const heirLines = heirDetails
          .map(
            h =>
              `${h.name} (${(h.split * 100).toFixed(0)}%): ${fK(h.netValue)} @ ${(h.rates.combined * 100).toFixed(0)}% rate`
          )
          .join('\n');
        const avgRate = heirDetails.reduce((sum, h) => sum + h.rates.combined * h.split, 0);
        return {
          formula: `Per heir: Share x (atEOY + rothEOY + iraEOY x (1 - rate))`,
          values: heirLines,
          result: `Total Heir Value = ${fM(heirValue)} (avg ${(avgRate * 100).toFixed(0)}% tax rate)`,
          simple: `${fM(totalEOY)} x ${(1 - effectiveRate).toFixed(2)} = ${fM(heirValue)}`,
        };
      }

      const rate = params.heirFedRate + params.heirStateRate;
      return {
        formula: `heirValue = atEOY + rothEOY + iraEOY x (1 - ${(rate * 100).toFixed(0)}%)`,
        values: `${fK(atEOY)} + ${fK(rothEOY)} + ${fK(iraEOY)} x ${(1 - rate).toFixed(2)}`,
        result: `Heir Value = ${fM(heirValue)} (${((1 - effectiveRate) * 100).toFixed(0)}% of portfolio)`,
        simple: `${fM(totalEOY)} x ${(1 - effectiveRate).toFixed(2)} = ${fM(heirValue)}`,
      };
    },
  },

  // =============================================================================
  // EOY TOTALS
  // =============================================================================

  totalEOY: {
    name: 'End of Year Portfolio',
    concept:
      'Total portfolio value after withdrawals and investment growth. EOY = (BOY - Withdrawals - Conversions) x (1 + Return)',
    formula:
      'totalEOY = atEOY + iraEOY + rothEOY\n\nOr: (totalBOY - totalWithdrawal) x (1 + Return)\n\nAfter-Tax: Taxable account\nIRA: Tax-deferred, taxed on withdrawal\nRoth: Tax-free growth and withdrawal',
    backOfEnvelope: 'Last Year x 1.06 (assuming 6% average return)',
    compute: data => {
      const { totalBOY, totalEOY, totalWithdrawal } = data;
      const growth = totalEOY - totalBOY + totalWithdrawal;
      const returnPct = totalBOY > 0 ? ((growth / totalBOY) * 100).toFixed(1) : 0;
      return {
        formula: `totalEOY = totalBOY - totalWithdrawal + Growth`,
        values: `${fM(totalBOY)} - ${fK(totalWithdrawal)} + ${fK(growth)}`,
        result: `Total = ${fM(totalEOY)} (${returnPct}% net growth)`,
        simple: `${fM(totalBOY)} x 1.06 = ${fM(totalBOY * 1.06)}`,
      };
    },
  },

  // =============================================================================
  // ROTH PERCENT
  // =============================================================================

  rothPercent: {
    name: 'Roth Percentage',
    concept:
      'Portion of portfolio in Roth accounts. Higher Roth % = more tax-free income in retirement and better heir value (heirs pay $0 tax on Roth).',
    formula:
      'rothPercent = rothEOY / totalEOY\n\nTarget: 30-50% Roth is often optimal\nBenefit: Tax-free withdrawals, tax-free to heirs',
    backOfEnvelope: 'Track this over time to see Roth conversion impact',
    compute: data => {
      const { rothEOY, totalEOY, rothPercent } = data;
      return {
        formula: `rothPercent = rothEOY / totalEOY`,
        values: `${fM(rothEOY)} / ${fM(totalEOY)}`,
        result: `Roth = ${(rothPercent * 100).toFixed(1)}% of portfolio`,
        simple: `${(rothPercent * 100).toFixed(0)}% in Roth`,
      };
    },
  },

  // =============================================================================
  // CUMULATIVE TAX
  // =============================================================================

  cumulativeTax: {
    name: 'Cumulative Tax Paid',
    concept:
      'Running total of all taxes paid from start of projection. Helps compare strategies: lower cumulative tax = more wealth retained.',
    formula:
      'cumulativeTax = Sum of all annual taxes\n\nIncludes: Federal, State, LTCG, NIIT\nExcludes: IRMAA (tracked separately)',
    backOfEnvelope: 'Compare across scenarios to find tax-efficient strategy',
    compute: data => {
      const { cumulativeTax, totalTax, year } = data;
      const yearsOfTax = cumulativeTax / totalTax;
      return {
        formula: `Running sum of annual taxes`,
        values: `Through ${year}: ${fK(cumulativeTax)}`,
        result: `Total Taxes = ${fM(cumulativeTax)}`,
        simple: `~${fK(totalTax)}/year x ${yearsOfTax.toFixed(0)} years`,
      };
    },
  },

  // =============================================================================
  // CAPITAL GAINS METRICS
  // =============================================================================

  capitalGains: {
    name: 'Capital Gains (This Year)',
    concept:
      'Capital gains realized from After-Tax (AT) account withdrawals this year. When you withdraw from an AT account, only the gains portion is taxable. The gains percentage depends on how much of the account is cost basis vs. appreciation.',
    formula:
      'capitalGains = atWithdrawal x Capital Gains %\n\nCapital Gains % = (AT Value - Cost Basis) / AT Value\n\nAs markets rise, gains % increases.\nAs you withdraw, you realize proportional gains.',
    backOfEnvelope: 'atWithdrawal x 50-70% (typical gains portion)',
    compute: data => {
      const { capitalGains, atWithdrawal, capitalGainsPercent } = data;
      const gainsPct = capitalGainsPercent
        ? (capitalGainsPercent * 100).toFixed(1)
        : atWithdrawal > 0 && capitalGains > 0
          ? ((capitalGains / atWithdrawal) * 100).toFixed(1)
          : 0;

      let simple = '';
      if (atWithdrawal === 0) {
        simple = 'No AT withdrawal, no gains realized';
      } else if (capitalGains === 0) {
        simple = 'No gains (all cost basis)';
      } else {
        simple = `${fK(atWithdrawal)} x ${gainsPct}% = ${fK(capitalGains)} gains`;
      }

      return {
        formula: `capitalGains = atWithdrawal x Gains Percentage`,
        values:
          atWithdrawal > 0
            ? `${fK(atWithdrawal)} x ${gainsPct}% = ${fK(capitalGains)}`
            : `No AT withdrawal this year`,
        result: capitalGains > 0 ? `Capital Gains = ${fK(capitalGains)}` : `$0 capital gains`,
        simple,
      };
    },
  },

  cumulativeCapitalGains: {
    name: 'Cumulative Capital Gains',
    concept:
      'Running total of all capital gains realized from After-Tax account withdrawals since the start of projections. This represents total gains that have been (or will be) taxed at LTCG rates.',
    formula:
      "cumulativeCapitalGains = Sum(Annual Capital Gains)\n\nEach year adds that year's realized gains.\nTracks total tax liability from AT liquidation.",
    backOfEnvelope: 'Sum of all AT withdrawal gains over time',
    compute: data => {
      const { cumulativeCapitalGains, capitalGains, year } = data;
      const avgPerYear = capitalGains > 0 ? (cumulativeCapitalGains / capitalGains).toFixed(1) : 0;

      return {
        formula: `Running sum of annual capital gains`,
        values: `Through ${year}: ${fK(cumulativeCapitalGains)}`,
        result: `Total Gains Realized = ${fK(cumulativeCapitalGains)}`,
        simple:
          capitalGains > 0
            ? `~${fK(capitalGains)}/year x ${avgPerYear} years`
            : `${fK(cumulativeCapitalGains)} total to date`,
      };
    },
  },

  atLiquidationPercent: {
    name: 'AT Account Liquidation %',
    concept:
      'Percentage of the original After-Tax account balance that has been liquidated (withdrawn) to date. Tracks how much of the AT account has been consumed over time.',
    formula:
      'atLiquidationPercent = (Original AT - Current AT) / Original AT x 100\n\nOriginal AT = Starting AT balance at projection start\nCurrent AT = Current EOY AT balance\n\n100% = fully depleted',
    backOfEnvelope: 'How much of original AT has been spent',
    compute: (data, params) => {
      const { atLiquidationPercent, atEOY, atBOY } = data;
      const originalAT = params?.initialAt || atBOY;
      const pct = atLiquidationPercent ? (atLiquidationPercent * 100).toFixed(1) : 0;
      const remaining = 100 - parseFloat(pct);

      let simple = '';
      if (parseFloat(pct) >= 100) {
        simple = 'AT fully depleted (100% liquidated)';
      } else if (parseFloat(pct) === 0) {
        simple = 'AT untouched (0% liquidated)';
      } else {
        simple = `${pct}% of AT used, ${remaining.toFixed(0)}% remains`;
      }

      return {
        formula: `(Original AT - Current AT) / Original AT`,
        values: `(${fK(originalAT)} - ${fK(atEOY)}) / ${fK(originalAT)}`,
        result: `Liquidation = ${pct}%`,
        simple,
      };
    },
  },

  cumulativeATTax: {
    name: 'Cumulative LTCG Tax on AT',
    concept:
      'Cumulative long-term capital gains tax paid on After-Tax account withdrawals. This is the total LTCG tax incurred from liquidating the AT account over time.',
    formula:
      'cumulativeATTax = Sum(Annual LTCG Tax)\n\nltcgTax = capitalGains x LTCG Rate\nRate is 0%, 15%, or 20% based on income bracket\n\nIncludes state tax (IL: 4.95%) on gains',
    backOfEnvelope: 'Cumulative Gains x ~18% (15% fed + 3% state avg)',
    compute: data => {
      const { cumulativeATTax, cumulativeCapitalGains } = data;
      const effectiveRate =
        cumulativeCapitalGains > 0
          ? ((cumulativeATTax / cumulativeCapitalGains) * 100).toFixed(1)
          : 0;

      let simple = '';
      if (cumulativeATTax === 0) {
        simple = '$0 LTCG tax paid (no gains realized)';
      } else {
        simple = `${fK(cumulativeCapitalGains)} gains x ${effectiveRate}% = ${fK(cumulativeATTax)}`;
      }

      return {
        formula: `Running sum of LTCG + state tax on AT gains`,
        values: `Total gains: ${fK(cumulativeCapitalGains)}\nEffective rate: ${effectiveRate}%`,
        result: `Cumulative AT Tax = ${fK(cumulativeATTax)}`,
        simple,
      };
    },
  },

  // =============================================================================
  // WITHDRAWAL BREAKDOWNS
  // =============================================================================

  atWithdrawal: {
    name: 'After-Tax Withdrawal',
    concept:
      'Cash withdrawn from taxable brokerage account. Used SECOND in withdrawal order (after any required RMD). Partially taxable - only the gains portion triggers capital gains tax.',
    formula:
      'Withdrawal Order:\n1. IRA (RMD only, if age 73+)\n2. After-Tax <- YOU ARE HERE\n3. More IRA (if AT insufficient)\n4. Roth (last resort)\n\nTax: Only gains are taxed (at LTCG rates)',
    backOfEnvelope: 'AT covers need after SS and RMD',
    compute: data => {
      const {
        atWithdrawal,
        atBOY,
        totalWithdrawal,
        expenses,
        totalTax,
        ssAnnual,
        rmdRequired,
        irmaaTotal,
      } = data;
      const grossNeed = expenses + totalTax + irmaaTotal;
      const netNeed = Math.max(0, grossNeed - ssAnnual);
      const atPct = totalWithdrawal > 0 ? ((atWithdrawal / totalWithdrawal) * 100).toFixed(0) : 0;

      let simple = '';
      if (atWithdrawal === 0) {
        if (atBOY === 0) simple = 'AT depleted - nothing to withdraw';
        else if (netNeed <= rmdRequired) simple = `RMD (${fK(rmdRequired)}) covered all needs`;
        else simple = 'AT not needed this year';
      } else {
        simple = `Need ${fK(netNeed)} - SS covered, AT provided ${fK(atWithdrawal)}`;
      }

      return {
        formula: `Need: ${fK(expenses)} exp + ${fK(totalTax)} tax - ${fK(ssAnnual)} SS = ${fK(netNeed)}`,
        values: `AT available: ${fK(atBOY)}\nWithdrew: ${fK(atWithdrawal)}`,
        result:
          atWithdrawal > 0
            ? `${fK(atWithdrawal)} from After-Tax (${atPct}% of total)`
            : `$0 from After-Tax`,
        simple,
      };
    },
  },

  iraWithdrawal: {
    name: 'IRA Withdrawal',
    concept:
      'Cash withdrawn from Traditional IRA. Used FIRST (for RMD if 73+) and THIRD (if After-Tax insufficient). 100% taxable as ordinary income. Separate from Roth conversions.',
    formula:
      'Withdrawal Order:\n1. IRA (RMD required) <- FIRST\n2. After-Tax\n3. More IRA (if needed) <- THIRD\n4. Roth (last resort)\n\nNote: rothConversion is separate from withdrawal',
    backOfEnvelope: 'iraWithdrawal = max(rmdRequired, need - AT)',
    compute: data => {
      const { iraWithdrawal, iraBOY, rmdRequired, rothConversion, totalWithdrawal, age } = data;
      const isRMDAge = age >= 73;
      const beyondRMD = Math.max(0, iraWithdrawal - rmdRequired);
      const iraPct = totalWithdrawal > 0 ? ((iraWithdrawal / totalWithdrawal) * 100).toFixed(0) : 0;
      const rmdPct = iraBOY > 0 ? ((rmdRequired / iraBOY) * 100).toFixed(1) : 0;

      let simple = '';
      if (iraWithdrawal === 0) {
        simple = `Age ${age} (no RMD), AT covered all needs`;
      } else if (isRMDAge && beyondRMD === 0) {
        simple = `RMD = ${fK(rmdRequired)} (${rmdPct}% of ${fK(iraBOY)} IRA)`;
      } else if (isRMDAge && beyondRMD > 0) {
        simple = `RMD ${fK(rmdRequired)} (${rmdPct}% of IRA) + ${fK(beyondRMD)} extra needed`;
      } else {
        simple = `${fK(iraWithdrawal)} from IRA`;
      }

      return {
        formula: isRMDAge ? `Age ${age}: RMD = ${fK(rmdRequired)}` : `Age ${age}: No RMD required`,
        values:
          rothConversion > 0
            ? `IRA: ${fK(iraBOY)} (${fK(rothConversion)} reserved for Roth conv)\nWithdrew: ${fK(iraWithdrawal)}${beyondRMD > 0 ? ` (${fK(rmdRequired)} RMD + ${fK(beyondRMD)} extra)` : ''}`
            : `IRA: ${fK(iraBOY)}\nWithdrew: ${fK(iraWithdrawal)}`,
        result:
          iraWithdrawal > 0
            ? `${fK(iraWithdrawal)} from IRA (${iraPct}% of withdrawals)`
            : `$0 from IRA`,
        simple,
      };
    },
  },

  rothWithdrawal: {
    name: 'Roth Withdrawal',
    concept:
      'Cash withdrawn from Roth IRA. Used LAST in withdrawal order - only when all other accounts are depleted. 100% tax-free. Preserving Roth maximizes tax-free growth and heir value.',
    formula:
      'Withdrawal Order:\n1. IRA (RMD)\n2. After-Tax\n3. More IRA\n4. Roth <- LAST RESORT\n\nTax: $0 (completely tax-free)',
    backOfEnvelope: 'Roth withdrawal only if IRA + AT exhausted',
    compute: data => {
      const { rothWithdrawal, rothBOY, rothConversion, atBOY, iraBOY } = data;

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
        values:
          rothWithdrawal > 0
            ? `IRA (${fK(iraBOY)}) + AT (${fK(atBOY)}) exhausted\nHad to tap Roth: ${fK(rothWithdrawal)}`
            : rothConversion > 0
              ? `Roth preserved + ${fK(rothConversion)} added from conversion`
              : `Roth preserved at ${fK(rothBOY)}`,
        result:
          rothWithdrawal > 0
            ? `${fK(rothWithdrawal)} from Roth (tax-free but reduces future growth)`
            : `$0 - Roth preserved`,
        simple,
      };
    },
  },

  // =============================================================================
  // INDIVIDUAL ACCOUNT EOY BALANCES
  // =============================================================================

  atEOY: {
    name: 'After-Tax End of Year',
    concept:
      'Taxable brokerage account balance after withdrawals and investment growth. This account has the most flexible access but gains are taxable.',
    formula:
      'atEOY = (atBOY - atWithdrawal) x (1 + effectiveAtReturn)\n\nNo conversions affect this account.\nWithdrawals trigger capital gains tax on the gains portion.',
    backOfEnvelope: 'AT grows by return, reduced by withdrawals',
    compute: data => {
      const { atBOY, atWithdrawal, atEOY, effectiveAtReturn, atReturn } = data;
      const afterWithdrawal = atBOY - atWithdrawal;
      const returnPct = (effectiveAtReturn * 100).toFixed(1);

      let simple = '';
      if (atBOY === 0) {
        simple = 'AT was already depleted';
      } else if (atWithdrawal === 0) {
        simple = `${fK(atBOY)} start + ${returnPct}% growth = ${fK(atEOY)}`;
      } else if (atEOY === 0) {
        simple = `${fK(atBOY)} start fully withdrawn, now depleted`;
      } else {
        simple = `${fK(atBOY)} start - ${fK(atWithdrawal)} withdrawn + ${fK(atReturn)} growth = ${fK(atEOY)}`;
      }

      return {
        formula:
          atWithdrawal > 0
            ? `${fK(atBOY)} - ${fK(atWithdrawal)} withdrawal`
            : `${fK(atBOY)} (no withdrawal)`,
        values: `(${fK(afterWithdrawal)}) x ${(1 + effectiveAtReturn).toFixed(3)}\n+ ${fK(atReturn)} growth`,
        result: `After-Tax EOY = ${fK(atEOY)}`,
        simple,
      };
    },
  },

  iraEOY: {
    name: 'Traditional IRA End of Year',
    concept:
      'Tax-deferred IRA balance after withdrawals, Roth conversions, and growth. Reduced by both withdrawals AND Roth conversions. All future withdrawals are taxable.',
    formula:
      'iraEOY = (iraBOY - iraWithdrawal - rothConversion) x (1 + effectiveIraReturn)\n\nrothConversion moves money OUT of IRA.\nRMD forces minimum withdrawal at age 73+.',
    backOfEnvelope: 'IRA reduced by withdrawals + conversions, then grows',
    compute: data => {
      const { iraBOY, iraWithdrawal, rothConversion, iraEOY, effectiveIraReturn, iraReturn } = data;
      const totalOut = iraWithdrawal + rothConversion;
      const afterWithdrawal = iraBOY - totalOut;
      const returnPct = (effectiveIraReturn * 100).toFixed(1);

      let simple = '';
      if (totalOut > iraBOY * 0.5) {
        simple = `${fK(iraBOY)} start - ${fK(totalOut)} out (${rothConversion > 0 ? `${fK(rothConversion)} to Roth` : 'withdrawals'}) + growth = ${fK(iraEOY)}`;
      } else if (rothConversion > 0 && iraWithdrawal === 0) {
        simple = `${fK(iraBOY)} start - ${fK(rothConversion)} to Roth + ${fK(iraReturn)} growth = ${fK(iraEOY)}`;
      } else if (rothConversion > 0) {
        simple = `${fK(iraBOY)} start - ${fK(iraWithdrawal)} withdrawn - ${fK(rothConversion)} to Roth + growth = ${fK(iraEOY)}`;
      } else if (iraWithdrawal > 0) {
        simple = `${fK(iraBOY)} start - ${fK(iraWithdrawal)} withdrawn + ${fK(iraReturn)} growth = ${fK(iraEOY)}`;
      } else {
        simple = `${fK(iraBOY)} start + ${returnPct}% growth = ${fK(iraEOY)}`;
      }

      return {
        formula:
          rothConversion > 0
            ? `${fK(iraBOY)} - ${fK(iraWithdrawal)} withdrawal - ${fK(rothConversion)} -> Roth`
            : `${fK(iraBOY)} - ${fK(iraWithdrawal)} withdrawal`,
        values: `(${fK(afterWithdrawal)}) x ${(1 + effectiveIraReturn).toFixed(3)}\n+ ${fK(iraReturn)} growth`,
        result: `IRA EOY = ${fK(iraEOY)}`,
        simple,
      };
    },
  },

  rothEOY: {
    name: 'Roth IRA End of Year',
    concept:
      'Tax-free Roth balance after any withdrawals, plus conversions, plus growth. Roth conversions ADD to this account. Growth and withdrawals are completely tax-free.',
    formula:
      'rothEOY = (rothBOY - rothWithdrawal + rothConversion) x (1 + effectiveRothReturn)\n\nrothConversion moves money INTO Roth.\nWithdrawals are tax-free (last resort).',
    backOfEnvelope: 'Roth grows tax-free, boosted by conversions',
    compute: data => {
      const { rothBOY, rothWithdrawal, rothConversion, rothEOY, effectiveRothReturn, rothReturn } =
        data;
      const afterAdjustments = rothBOY - rothWithdrawal + rothConversion;
      const returnPct = (effectiveRothReturn * 100).toFixed(1);

      let simple = '';
      if (rothConversion > 0 && rothWithdrawal === 0) {
        const growth = rothEOY - rothBOY - rothConversion;
        simple = `${fK(rothBOY)} start + ${fK(rothConversion)} converted + ${fK(growth)} growth = ${fK(rothEOY)}`;
      } else if (rothWithdrawal > 0) {
        simple = `${fK(rothBOY)} start - ${fK(rothWithdrawal)} withdrawal + growth = ${fK(rothEOY)}`;
      } else {
        simple = `${fK(rothBOY)} start + ${returnPct}% growth = ${fK(rothEOY)}`;
      }

      return {
        formula:
          rothConversion > 0
            ? `${fK(rothBOY)} + ${fK(rothConversion)} from IRA conversion`
            : rothWithdrawal > 0
              ? `${fK(rothBOY)} - ${fK(rothWithdrawal)} withdrawal`
              : `${fK(rothBOY)} (no changes)`,
        values: `(${fK(afterAdjustments)}) x ${(1 + effectiveRothReturn).toFixed(3)}\n+ ${fK(rothReturn)} growth`,
        result: `Roth EOY = ${fK(rothEOY)}`,
        simple,
      };
    },
  },

  // =============================================================================
  // ADDITIONAL FIELDS - INCOME, EXPENSES, RMD DETAILS, ETC.
  // =============================================================================

  ssAnnual: {
    name: 'Annual Social Security',
    concept:
      'Total Social Security income for the year. Based on monthly benefit x 12, adjusted annually by COLA (Cost of Living Adjustment). This is gross SS before any taxation calculations.',
    formula:
      'ssAnnual = Monthly SS x 12 x (1 + COLA)^years\n\nMonthly SS: Your stated monthly benefit at claiming\nCOLA: Annual cost-of-living adjustment (default 2.5%)\nYears: Years since projection start',
    backOfEnvelope: 'Monthly x 12 x 1.025 each year',
    compute: data => {
      const { ssAnnual } = data;
      const monthlyApprox = ssAnnual / 12;
      return {
        formula: `Monthly SS x 12`,
        values: `${f$(monthlyApprox)}/month x 12`,
        result: `Annual SS = ${fK(ssAnnual)}`,
        simple: fK(ssAnnual),
      };
    },
  },

  expenses: {
    name: 'Annual Expenses',
    concept:
      'Total spending needs for the year. Base expenses from inputs, inflated annually, plus any year-specific overrides. This determines how much you need to withdraw from accounts.',
    formula:
      'expenses = baseExpenses x (1 + inflation)^years + overrides\n\nBase: Starting annual expenses\nInflation: Annual expense inflation rate\nOverrides: Year-specific adjustments (e.g., one-time purchases)',
    backOfEnvelope: 'Base x 1.03 each year (3% inflation)',
    compute: (data, params) => {
      const { expenses } = data;
      const baseExpenses = params?.annualExpenses || 150000;
      const yearsFromStart = data.yearsFromStart || 0;
      return {
        formula: `Base expenses + inflation adjustments`,
        values: `${fK(baseExpenses)} base x (1.03)^${yearsFromStart}`,
        result: `Expenses = ${fK(expenses)}`,
        simple: fK(expenses),
      };
    },
  },

  rmdFactor: {
    name: 'RMD Life Expectancy Factor',
    concept:
      'IRS Uniform Lifetime Table factor used to calculate Required Minimum Distribution. Decreases with age, meaning larger required withdrawals as you get older.',
    formula:
      'From IRS Uniform Lifetime Table:\n\nAge 73: 26.5\nAge 75: 24.6\nAge 80: 20.2\nAge 85: 16.0\nAge 90: 12.2\nAge 95: 8.6\nAge 100: 6.4',
    backOfEnvelope: 'Roughly 100 - age (simplified)',
    compute: data => {
      const { rmdFactor, age } = data;
      const rmdPct = rmdFactor > 0 ? (100 / rmdFactor).toFixed(1) : 0;
      return {
        formula: `IRS Uniform Lifetime Table lookup`,
        values: `Age ${age} -> Factor ${rmdFactor?.toFixed(1) || 'N/A'}`,
        result: age >= 73 ? `RMD % = ${rmdPct}% of IRA` : 'No RMD until age 73',
        simple: rmdFactor ? `${rmdFactor.toFixed(1)} (${rmdPct}%)` : 'N/A',
      };
    },
  },

  ordinaryIncome: {
    name: 'Ordinary Income',
    concept:
      'Total income taxed at ordinary rates (not capital gains). Includes taxable Social Security, IRA withdrawals, and Roth conversions. This is the base for federal tax brackets.',
    formula:
      'ordinaryIncome = taxableSS + iraWithdrawal + rothConversion\n\nNote: AT withdrawals are NOT ordinary income (taxed as cap gains)\nNote: Roth withdrawals are NOT income (tax-free)',
    backOfEnvelope: 'SS (85%) + IRA withdrawals + conversions',
    compute: data => {
      const { ordinaryIncome, taxableSS, iraWithdrawal, rothConversion } = data;
      return {
        formula: `ordinaryIncome = taxableSS + iraWithdrawal + rothConversion`,
        values: `${fK(taxableSS)} + ${fK(iraWithdrawal)} + ${fK(rothConversion)}`,
        result: `Ordinary Income = ${fK(ordinaryIncome)}`,
        simple: fK(ordinaryIncome),
      };
    },
  },

  taxableOrdinary: {
    name: 'Taxable Ordinary Income',
    concept:
      'Ordinary income minus standard deduction. This is the amount actually subject to federal income tax brackets. Higher taxableOrdinary means higher marginal bracket.',
    formula:
      'taxableOrdinary = ordinaryIncome - standardDeduction\n\nStandard Deduction (2025 MFJ over 65): ~$32,300\nThis is what flows through tax brackets.',
    backOfEnvelope: 'ordinaryIncome - $32K deduction',
    compute: data => {
      const { taxableOrdinary, ordinaryIncome, standardDeduction } = data;
      return {
        formula: `taxableOrdinary = ordinaryIncome - standardDeduction`,
        values: `${fK(ordinaryIncome)} - ${fK(standardDeduction || 32000)}`,
        result: `Taxable = ${fK(taxableOrdinary)}`,
        simple: fK(Math.max(0, taxableOrdinary)),
      };
    },
  },

  standardDeduction: {
    name: 'Standard Deduction',
    concept:
      'Amount of income excluded from taxation. For married filing jointly over 65, this is significantly higher. Reduces taxable income dollar-for-dollar.',
    formula:
      'Standard Deduction (2025 MFJ):\nBase: $30,000\nAge 65+ bonus: +$1,600 each\nBoth 65+: $30,000 + $3,200 = $33,200',
    backOfEnvelope: '~$32K-$33K for retired couples',
    compute: data => {
      const { standardDeduction, age } = data;
      return {
        formula: `MFJ base + age 65+ bonuses`,
        values: `Age ${age}: Both spouses 65+ assumed`,
        result: `Standard Deduction = ${fK(standardDeduction || 32000)}`,
        simple: fK(standardDeduction || 32000),
      };
    },
  },

  costBasisBOY: {
    name: 'Cost Basis (Beginning of Year)',
    concept:
      'The original purchase price of investments in your After-Tax account at start of year. Used to calculate capital gains when you sell. Higher basis = lower taxable gains.',
    formula:
      'Cost Basis tracks: Total amount you put IN to AT account\n\nWhen you withdraw, gains = withdrawal x (1 - basis/value)\nBasis is consumed proportionally with withdrawals.',
    backOfEnvelope: 'Original investment amount (what you paid)',
    compute: data => {
      const { costBasisBOY, atBOY } = data;
      const basisPct = atBOY > 0 ? ((costBasisBOY / atBOY) * 100).toFixed(0) : 0;
      const gainsPct = 100 - basisPct;
      return {
        formula: `Tracks original investment in AT account`,
        values: `Basis: ${fK(costBasisBOY)} of ${fK(atBOY)} AT value`,
        result: `${basisPct}% basis, ${gainsPct}% gains`,
        simple: `${fK(costBasisBOY)} (${basisPct}% of AT)`,
      };
    },
  },

  costBasisEOY: {
    name: 'Cost Basis (End of Year)',
    concept:
      'Cost basis remaining in After-Tax account at year end. Reduced proportionally when you withdraw. Does not change with market growth (only original cost matters).',
    formula:
      'costBasisEOY = costBasisBOY x (1 - withdrawal_rate)\n\nwithdrawal_rate = atWithdrawal / atBOY\nBasis is consumed at same rate as withdrawals.',
    backOfEnvelope: 'Starting basis minus basis consumed by withdrawals',
    compute: data => {
      const { costBasisEOY, costBasisBOY, atWithdrawal } = data;
      const basisConsumed = costBasisBOY - costBasisEOY;
      return {
        formula: `Basis consumed proportionally with withdrawals`,
        values:
          atWithdrawal > 0
            ? `${fK(costBasisBOY)} - ${fK(basisConsumed)} consumed`
            : `${fK(costBasisBOY)} (no withdrawal)`,
        result: `EOY Basis = ${fK(costBasisEOY)}`,
        simple: fK(costBasisEOY),
      };
    },
  },

  effectiveAtReturn: {
    name: 'After-Tax Effective Return',
    concept:
      'Actual growth rate applied to After-Tax account this year. May differ from base return if using risk-adjusted returns. Applied after withdrawals.',
    formula:
      'atEOY = (atBOY - atWithdrawal) x (1 + effectiveAtReturn)\n\nBase return adjusted for:\n- Risk allocation mode\n- Account-specific factors',
    backOfEnvelope: 'Base return (e.g., 6-7%)',
    compute: data => {
      const { effectiveAtReturn, atReturn } = data;
      const returnPct = ((effectiveAtReturn || 0) * 100).toFixed(1);
      return {
        formula: `After-tax account growth rate`,
        values: `${returnPct}% on remaining balance`,
        result: `Growth = ${fK(atReturn)}`,
        simple: `${returnPct}%`,
      };
    },
  },

  effectiveIraReturn: {
    name: 'IRA Effective Return',
    concept:
      'Actual growth rate applied to Traditional IRA this year. May differ from base return if using risk-adjusted returns. Applied after withdrawals and conversions.',
    formula:
      'iraEOY = (iraBOY - iraWithdrawal - rothConversion) x (1 + effectiveIraReturn)\n\nTax-deferred growth.',
    backOfEnvelope: 'Base return (e.g., 6-7%)',
    compute: data => {
      const { effectiveIraReturn, iraReturn } = data;
      const returnPct = ((effectiveIraReturn || 0) * 100).toFixed(1);
      return {
        formula: `IRA account growth rate`,
        values: `${returnPct}% on remaining balance`,
        result: `Growth = ${fK(iraReturn)}`,
        simple: `${returnPct}%`,
      };
    },
  },

  effectiveRothReturn: {
    name: 'Roth Effective Return',
    concept:
      'Actual growth rate applied to Roth IRA this year. Growth is completely tax-free. Applied after any withdrawals and additions from conversions.',
    formula:
      'rothEOY = (rothBOY - rothWithdrawal + rothConversion) x (1 + effectiveRothReturn)\n\nTax-free growth forever!',
    backOfEnvelope: 'Base return (e.g., 6-7%)',
    compute: data => {
      const { effectiveRothReturn, rothReturn } = data;
      const returnPct = ((effectiveRothReturn || 0) * 100).toFixed(1);
      return {
        formula: `Roth account growth rate (tax-free!)`,
        values: `${returnPct}% on balance after conversions`,
        result: `Growth = ${fK(rothReturn)}`,
        simple: `${returnPct}% (tax-free)`,
      };
    },
  },

  cumulativeIRMAA: {
    name: 'Cumulative IRMAA Paid',
    concept:
      'Running total of IRMAA Medicare surcharges paid since projection start. Tracks the cost of having high income (MAGI > $206K from 2 years prior).',
    formula:
      'cumulativeIRMAA = Sum(Annual IRMAA)\n\nIRMAA is an extra Medicare premium, not a tax.\nBased on MAGI from 2 years prior.',
    backOfEnvelope: 'Sum of annual IRMAA surcharges',
    compute: data => {
      const { cumulativeIRMAA, irmaaTotal, year } = data;
      return {
        formula: `Running sum of annual IRMAA`,
        values: `Through ${year}: ${fK(cumulativeIRMAA)}`,
        result: `Total IRMAA = ${fK(cumulativeIRMAA)}`,
        simple: irmaaTotal > 0 ? `~${fK(irmaaTotal)}/year` : `${fK(cumulativeIRMAA)} total`,
      };
    },
  },

  irmaaMAGI: {
    name: 'IRMAA Lookback MAGI',
    concept:
      'Modified Adjusted Gross Income from 2 years prior, used to determine IRMAA bracket. High MAGI = higher Medicare premiums.',
    formula:
      'irmaaMAGI = MAGI from (current year - 2)\n\nThresholds (MFJ 2025):\n< $206K: $0 surcharge\n$206K-$258K: Tier 1\n$258K-$322K: Tier 2\netc.',
    backOfEnvelope: "Your income from 2 years ago determines this year's IRMAA",
    compute: data => {
      const { irmaaMAGI, year, irmaaTotal } = data;
      const tier =
        irmaaTotal === 0
          ? 'None'
          : irmaaMAGI < 258000
            ? 'Tier 1'
            : irmaaMAGI < 322000
              ? 'Tier 2'
              : 'Tier 3+';
      return {
        formula: `MAGI from ${year - 2}`,
        values: `${fK(irmaaMAGI)} (${tier})`,
        result: irmaaTotal > 0 ? `Triggered ${fK(irmaaTotal)} IRMAA` : 'Below threshold',
        simple: fK(irmaaMAGI),
      };
    },
  },

  irmaaPartB: {
    name: 'Medicare Part B (Total)',
    concept:
      'Total Medicare Part B premium including base premium and any IRMAA surcharge. Base premium is $174.70/mo/person (2024). IRMAA surcharge applies if MAGI from 2 years prior exceeds thresholds.',
    formula:
      'Part B = Base + Surcharge\n\n' +
      'Base: $174.70/mo/person ($4,193/yr for couple)\n' +
      'Surcharge tiers (per person/year):\n' +
      '  Tier 1 ($206K-$258K): +$840/yr\n' +
      '  Tier 2 ($258K-$322K): +$2,100/yr\n' +
      '  Tier 3+: Higher surcharges',
    backOfEnvelope: '$4.2K base for couple, +$2K-$10K with surcharges',
    compute: data => {
      const { irmaaPartB, irmaaMAGI } = data;
      const perPerson = irmaaPartB / 2;
      const monthly = perPerson / 12;
      const baseAnnual = Math.round(174.7 * 12 * 2); // Base for couple
      const surcharge = Math.max(0, irmaaPartB - baseAnnual);
      return {
        formula: `Base + Surcharge x 2 people x 12 months`,
        values:
          surcharge > 0
            ? `Base: ${fK(baseAnnual)} + Surcharge: ${fK(surcharge)}\n${f$(monthly)}/person/month total`
            : `Base only: ${f$(monthly)}/person/month (MAGI ${fK(irmaaMAGI)} below threshold)`,
        result: `Annual Part B = ${fK(irmaaPartB)}`,
        simple: surcharge > 0 ? `${fK(baseAnnual)} + ${fK(surcharge)} surcharge` : fK(irmaaPartB),
      };
    },
  },

  irmaaPartD: {
    name: 'IRMAA Part D Surcharge',
    concept:
      'Income-related surcharge on Medicare Part D (prescription drugs). Smaller than Part B but adds up. Per person, per year.',
    formula:
      'Part D Surcharge (per person annually):\nTier 1: ~$150\nTier 2: ~$400\nTier 3: ~$650\netc.',
    backOfEnvelope: 'Smaller than Part B, ~10-20% of Part B surcharge',
    compute: data => {
      const { irmaaPartD, irmaaPartB } = data;
      const perPerson = irmaaPartD / 2;
      const pctOfB = irmaaPartB > 0 ? ((irmaaPartD / irmaaPartB) * 100).toFixed(0) : 0;
      return {
        formula: `Part D surcharge x 2 people x 12 months`,
        values: `${f$(perPerson)}/person/year`,
        result: `Annual Part D = ${fK(irmaaPartD)} (${pctOfB}% of Part B)`,
        simple: fK(irmaaPartD),
      };
    },
  },

  // =============================================================================
  // BASIC FIELDS (age, year)
  // =============================================================================

  age: {
    name: 'Age',
    concept:
      'Your age in this projection year, calculated from birth year. Key milestones: age 62 (early SS), 65 (Medicare), 67 (full SS), 70 (max SS), 73 (RMD starts).',
    formula: 'age = year - birthYear',
    backOfEnvelope: 'Current year minus birth year',
    compute: (data, params) => {
      return {
        formula: `${data.year} - ${params?.birthYear || 1960}`,
        values: `Year ${data.year}`,
        result: `Age ${data.age}`,
        simple: `${data.age}`,
      };
    },
  },

  year: {
    name: 'Projection Year',
    concept:
      'The calendar year for this row of projections. Projections run from start year through end year (typically survivor death year).',
    formula: 'Sequential year from start to end of projection period',
    backOfEnvelope: 'Each row is one year',
    compute: data => {
      return {
        formula: `Projection year ${(data.yearsFromStart || 0) + 1} of the model`,
        values: `Started in ${data.year - (data.yearsFromStart || 0)}`,
        result: `Year ${data.year}`,
        simple: `${data.year}`,
      };
    },
  },
};

// Export CALCULATIONS for testing
export { CALCULATIONS };

/**
 * CalculationInspector - Unified single-page view showing all calculation info
 * Supports navigation between calculations with back/forward buttons
 */
export function CalculationInspector({
  // Legacy props (for backwards compatibility)
  field,
  data,
  // New navigation props
  current, // {field, year, data} from navigation hook
  params,
  projections, // All projections for dependency lookup and navigation
  onNavigate, // (field, year, data) => void
  onBack,
  onForward,
  onClose,
  canGoBack,
  canGoForward,
}) {
  // Support both old and new API
  const activeField = current?.field || field;
  const activeData = current?.data || data;

  const calc = CALCULATIONS[activeField];

  // Compute "Used By" - fields that depend on this value
  const usedBy = useMemo(() => {
    if (!projections || !activeField || !activeData) return [];
    return getReverseDependencies(activeField, activeData.year, projections);
  }, [activeField, activeData, projections]);

  // Check if we have navigation capabilities
  const hasNavigation = Boolean(onNavigate && projections);

  // Fallback for fields without detailed calculations
  if (!calc) {
    const handleClose = onClose || (() => {});
    return (
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        onClick={handleClose}
      >
        <div
          className="bg-slate-900 rounded-lg border border-slate-700 p-4 max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-slate-200">{activeField}</span>
            <button onClick={handleClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-400 text-sm">Value: {fmt$(activeData[activeField])}</p>
          <p className="text-slate-500 text-xs mt-2">
            Detailed explanation not yet available for this field.
          </p>
        </div>
      </div>
    );
  }

  const computed = calc.compute(activeData, params);
  const handleClose = onClose || (() => {});

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-slate-900 rounded-lg border border-slate-700 w-[600px] max-h-[80vh] overflow-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Navigation */}
        <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
          {hasNavigation ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={onBack}
                  disabled={!canGoBack}
                  className={`p-1 rounded ${canGoBack ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-600 cursor-not-allowed'}`}
                  title="Go back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={onForward}
                  disabled={!canGoForward}
                  className={`p-1 rounded ${canGoForward ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-600 cursor-not-allowed'}`}
                  title="Go forward"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center flex-1">
                <h3 className="text-lg font-medium text-slate-200">{calc.name}</h3>
                <div className="text-slate-500 text-xs">
                  Year {activeData.year} (Age {activeData.age})
                </div>
              </div>
            </>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-slate-200">{calc.name}</h3>
              <div className="text-slate-500 text-xs">
                Year {activeData.year} (Age {activeData.age})
              </div>
            </div>
          )}
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - All sections visible */}
        <div className="p-4 space-y-4">
          {/* Quick Answer */}
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-mono text-blue-400">{computed.simple}</div>
            <div className="text-slate-500 text-xs mt-1">Back-of-envelope</div>
          </div>

          {/* Concept */}
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">What is this?</div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {calc.concept}
            </p>
          </div>

          {/* Formula with Color-Coded/Clickable Values */}
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">
              Formula{' '}
              {hasNavigation && <span className="text-slate-600">(click values to navigate)</span>}
            </div>
            <div className="bg-slate-950 rounded p-3 font-mono text-sm text-emerald-400">
              {hasNavigation ? (
                <ClickableFormula
                  formula={calc.formula}
                  data={activeData}
                  projections={projections}
                  onNavigate={onNavigate}
                  currentField={activeField}
                />
              ) : (
                <ColorCodedFormula formula={calc.formula} data={activeData} />
              )}
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div>
            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">
              This Year&apos;s Values
            </div>
            <div className="bg-slate-950 rounded p-3 font-mono text-sm space-y-1">
              <div className="text-slate-400 whitespace-pre-wrap">{computed.formula}</div>
              <div className="text-amber-400 whitespace-pre-wrap">{computed.values}</div>
              <div className="text-emerald-400 font-medium text-base pt-2 border-t border-slate-800">
                {computed.result}
              </div>
            </div>
          </div>

          {/* Used By Section */}
          {hasNavigation && (
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                Used By
                {usedBy.length > 0 && <span className="text-slate-500">({usedBy.length})</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {usedBy.length === 0 ? (
                  <span className="text-slate-500 text-sm italic">
                    Not used by other calculations
                  </span>
                ) : (
                  usedBy.map((dep, idx) => {
                    const depCalc = CALCULATIONS[dep.field];
                    const depData = projections.find(p => p.year === dep.year);
                    // Get the actual value from the dependent calculation
                    const depValue = depData ? depData[dep.field] : null;
                    let formattedDepValue = '';
                    if (
                      depValue !== null &&
                      depValue !== undefined &&
                      typeof depValue === 'number'
                    ) {
                      if (Math.abs(depValue) >= 1e6) {
                        formattedDepValue = `$${(depValue / 1e6).toFixed(2)}M`;
                      } else if (Math.abs(depValue) >= 1e3) {
                        formattedDepValue = `$${(depValue / 1e3).toFixed(0)}K`;
                      } else {
                        formattedDepValue = `$${Math.round(depValue).toLocaleString()}`;
                      }
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => depData && onNavigate(dep.field, dep.year, depData)}
                        className="px-2 py-1 bg-slate-800 rounded text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-1"
                      >
                        <span>{depCalc?.name || dep.field}</span>
                        {formattedDepValue && (
                          <span className="text-blue-400 font-mono text-xs">
                            {formattedDepValue}
                          </span>
                        )}
                        {dep.year !== activeData.year && (
                          <span className="text-slate-500">({dep.year})</span>
                        )}
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Rule of Thumb */}
          {calc.backOfEnvelope && (
            <div className="text-slate-500 text-xs italic border-t border-slate-800 pt-3">
              <span className="text-slate-400">Rule of thumb:</span> {calc.backOfEnvelope}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalculationInspector;
