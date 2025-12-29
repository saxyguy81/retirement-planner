/**
 * Core Tax Calculation Functions
 * These functions compute taxes based on the tax tables
 */

import {
  FEDERAL_BRACKETS_MFJ_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
  LTCG_BRACKETS_MFJ_2024,
  LTCG_BRACKETS_SINGLE_2024,
  STANDARD_DEDUCTION_MFJ_2024,
  STANDARD_DEDUCTION_SINGLE_2024,
  SENIOR_BONUS_MFJ_2024,
  SENIOR_BONUS_SINGLE_2024,
  IRMAA_BRACKETS_MFJ_2024,
  IRMAA_BRACKETS_SINGLE_2024,
  NIIT_RATE,
  NIIT_THRESHOLD_MFJ,
  NIIT_THRESHOLD_SINGLE,
  RMD_TABLE,
  RMD_START_AGE,
  SS_TAX_THRESHOLDS_MFJ,
  SS_TAX_THRESHOLDS_SINGLE,
  IL_TAX_RATE,
  inflateBrackets,
  inflateIRMAA,
} from './taxTables.js';

// =============================================================================
// FEDERAL INCOME TAX (Ordinary Income)
// =============================================================================
export function calculateFederalTax(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const currentThreshold = brackets[i].threshold;
    const nextThreshold = i < brackets.length - 1 ? brackets[i + 1].threshold : Infinity;

    if (taxableIncome > currentThreshold) {
      const incomeInBracket = Math.min(taxableIncome, nextThreshold) - currentThreshold;
      tax += incomeInBracket * brackets[i].rate;
    }
  }

  return Math.round(tax);
}

// =============================================================================
// LONG-TERM CAPITAL GAINS TAX
// LTCG brackets stack ON TOP of ordinary income
// =============================================================================
export function calculateLTCGTax(capitalGains, taxableOrdinaryIncome, brackets) {
  if (capitalGains <= 0) return 0;

  let tax = 0;
  let remainingGains = capitalGains;
  let baseIncome = taxableOrdinaryIncome;

  for (let i = 0; i < brackets.length && remainingGains > 0; i++) {
    const currentThreshold = brackets[i].threshold;
    const nextThreshold = i < brackets.length - 1 ? brackets[i + 1].threshold : Infinity;

    // Skip if we haven't reached this bracket yet
    if (baseIncome >= nextThreshold) continue;

    // Calculate room in this bracket
    const startOfBracket = Math.max(baseIncome, currentThreshold);
    const roomInBracket = nextThreshold - startOfBracket;
    const gainsInBracket = Math.min(remainingGains, roomInBracket);

    tax += gainsInBracket * brackets[i].rate;
    remainingGains -= gainsInBracket;
    baseIncome += gainsInBracket;
  }

  return Math.round(tax);
}

// =============================================================================
// NIIT (Net Investment Income Tax) - 3.8% on investment income above threshold
// =============================================================================
export function calculateNIIT(investmentIncome, magi, isSingle) {
  const threshold = isSingle ? NIIT_THRESHOLD_SINGLE : NIIT_THRESHOLD_MFJ;
  const excessMAGI = Math.max(0, magi - threshold);
  const niitableAmount = Math.min(investmentIncome, excessMAGI);
  return Math.round(niitableAmount * NIIT_RATE);
}

// =============================================================================
// TAXABLE SOCIAL SECURITY
// Uses "Combined Income" = AGI + 0.5*SS + tax-exempt interest
// =============================================================================
export function calculateTaxableSocialSecurity(ssIncome, otherIncome, isSingle) {
  const thresholds = isSingle ? SS_TAX_THRESHOLDS_SINGLE : SS_TAX_THRESHOLDS_MFJ;
  const combinedIncome = otherIncome + 0.5 * ssIncome;

  if (combinedIncome <= thresholds.tier1) {
    return 0;
  } else if (combinedIncome <= thresholds.tier2) {
    // 50% of excess over tier1, capped at 50% of SS
    return Math.min(0.5 * ssIncome, 0.5 * (combinedIncome - thresholds.tier1));
  } else {
    // 85% of excess over tier2, plus 50% of (tier2 - tier1), capped at 85% of SS
    const tier1Portion = 0.5 * (thresholds.tier2 - thresholds.tier1);
    const tier2Portion = 0.85 * (combinedIncome - thresholds.tier2);
    return Math.min(0.85 * ssIncome, tier1Portion + tier2Portion);
  }
}

// =============================================================================
// ILLINOIS STATE TAX
// IL exempts retirement income (SS, IRA, 401k distributions)
// Only taxes investment income
// =============================================================================
export function calculateIllinoisTax(investmentIncome, stateTaxRate = IL_TAX_RATE) {
  return Math.round(investmentIncome * stateTaxRate);
}

// =============================================================================
// IRMAA CALCULATION (Medicare Premium Surcharges)
// Based on MAGI from 2 years prior
// Optional customBrackets format: [{ singleThreshold, mfjThreshold, partB, partD }, ...]
// =============================================================================
export function calculateIRMAA(
  magi,
  inflationRate,
  yearsFromBase,
  isSingle,
  numPeople = 2,
  customBrackets = null
) {
  let baseBrackets;

  if (customBrackets && Array.isArray(customBrackets) && customBrackets.length > 0) {
    // Convert custom format to standard format (pick appropriate threshold)
    baseBrackets = customBrackets.map(b => ({
      threshold: isSingle ? b.singleThreshold : b.mfjThreshold,
      partB: b.partB,
      partD: b.partD,
    }));
  } else {
    baseBrackets = isSingle ? IRMAA_BRACKETS_SINGLE_2024 : IRMAA_BRACKETS_MFJ_2024;
  }

  const brackets = inflateIRMAA(baseBrackets, inflationRate, yearsFromBase);

  // Find applicable bracket (highest threshold that MAGI exceeds)
  let partB = brackets[0].partB;
  let partD = brackets[0].partD;

  for (let i = brackets.length - 1; i >= 0; i--) {
    if (magi > brackets[i].threshold) {
      partB = brackets[i].partB;
      partD = brackets[i].partD;
      break;
    }
  }

  // Convert monthly to annual and multiply by number of people
  const annualTotal = (partB + partD) * 12 * numPeople;

  return {
    partB: Math.round(partB * 12 * numPeople),
    partD: Math.round(partD * 12 * numPeople),
    total: Math.round(annualTotal),
    bracket: brackets.findIndex(b => magi <= b.threshold) || brackets.length - 1,
  };
}

// =============================================================================
// RMD CALCULATION
// =============================================================================
export function calculateRMD(iraBalance, age) {
  if (age < RMD_START_AGE) return { required: 0, factor: 0 };

  const factor = RMD_TABLE[age] || RMD_TABLE[120];
  const required = iraBalance / factor;

  return {
    required: Math.round(required),
    factor: factor,
  };
}

// =============================================================================
// RISK-BASED ALLOCATION
// Allocates portfolio across risk bands: Low -> Moderate -> High
// Fills accounts in order: After-Tax, IRA, Roth (preserving tax-advantaged growth)
// =============================================================================
export function calculateRiskAllocation(
  totalPortfolio,
  atBalance,
  iraBalance,
  rothBalance,
  lowTarget,
  modTarget
) {
  // Portfolio-level allocation
  const portfolioLow = Math.min(totalPortfolio, lowTarget);
  const portfolioMod = Math.min(Math.max(0, totalPortfolio - lowTarget), modTarget);
  const portfolioHigh = Math.max(0, totalPortfolio - lowTarget - modTarget);

  // Allocate to accounts: AT first (most accessible), then IRA, then Roth
  let remainingLow = portfolioLow;
  let remainingMod = portfolioMod;

  // After-Tax allocation
  const atLow = Math.min(atBalance, remainingLow);
  remainingLow -= atLow;
  const atMod = Math.min(atBalance - atLow, remainingMod);
  remainingMod -= atMod;
  const atHigh = atBalance - atLow - atMod;

  // IRA allocation
  const iraLow = Math.min(iraBalance, remainingLow);
  remainingLow -= iraLow;
  const iraMod = Math.min(iraBalance - iraLow, remainingMod);
  remainingMod -= iraMod;
  const iraHigh = iraBalance - iraLow - iraMod;

  // Roth allocation (gets whatever's left)
  const rothLow = Math.min(rothBalance, remainingLow);
  const rothMod = Math.min(rothBalance - rothLow, remainingMod);
  const rothHigh = rothBalance - rothLow - rothMod;

  return {
    portfolio: { low: portfolioLow, mod: portfolioMod, high: portfolioHigh },
    at: { low: atLow, mod: atMod, high: atHigh },
    ira: { low: iraLow, mod: iraMod, high: iraHigh },
    roth: { low: rothLow, mod: rothMod, high: rothHigh },
  };
}

// =============================================================================
// BLENDED RETURN CALCULATION
// Given an allocation and returns for each risk band, compute weighted return
// =============================================================================
export function calculateBlendedReturn(allocation, lowReturn, modReturn, highReturn) {
  const total = allocation.low + allocation.mod + allocation.high;
  if (total === 0) return 0;

  return (
    (allocation.low * lowReturn + allocation.mod * modReturn + allocation.high * highReturn) / total
  );
}

// =============================================================================
// COMPREHENSIVE TAX CALCULATION
// Computes all taxes for a given year's income
// =============================================================================
export function calculateAllTaxes({
  ssIncome,
  iraWithdrawal,
  rothConversion,
  otherOrdinaryIncome,
  capitalGains,
  isSingle,
  bracketInflation,
  yearsFromBase,
}) {
  // Get inflated brackets
  const fedBrackets = inflateBrackets(
    isSingle ? FEDERAL_BRACKETS_SINGLE_2024 : FEDERAL_BRACKETS_MFJ_2024,
    bracketInflation,
    yearsFromBase
  );
  const ltcgBrackets = inflateBrackets(
    isSingle ? LTCG_BRACKETS_SINGLE_2024 : LTCG_BRACKETS_MFJ_2024,
    bracketInflation,
    yearsFromBase
  );

  // Calculate standard deduction with senior bonus
  const baseDed = isSingle ? STANDARD_DEDUCTION_SINGLE_2024 : STANDARD_DEDUCTION_MFJ_2024;
  const seniorBonus = isSingle ? SENIOR_BONUS_SINGLE_2024 : SENIOR_BONUS_MFJ_2024;
  const standardDeduction = Math.round(
    (baseDed + seniorBonus) * Math.pow(1 + bracketInflation, yearsFromBase)
  );

  // Ordinary income for SS taxation calculation
  const otherIncomeForSS = iraWithdrawal + rothConversion + otherOrdinaryIncome + capitalGains;

  // Taxable Social Security
  const taxableSS = calculateTaxableSocialSecurity(ssIncome, otherIncomeForSS, isSingle);

  // Total ordinary income (before standard deduction)
  const grossOrdinaryIncome = taxableSS + iraWithdrawal + rothConversion + otherOrdinaryIncome;

  // Taxable ordinary income
  const taxableOrdinary = Math.max(0, grossOrdinaryIncome - standardDeduction);

  // Federal taxes
  const federalOrdinaryTax = calculateFederalTax(taxableOrdinary, fedBrackets);
  const federalLTCGTax = calculateLTCGTax(capitalGains, taxableOrdinary, ltcgBrackets);

  // NIIT
  const magi = grossOrdinaryIncome + capitalGains; // Simplified MAGI
  const niit = calculateNIIT(capitalGains, magi, isSingle);

  // Illinois tax (only on investment income)
  const stateTax = calculateIllinoisTax(capitalGains);

  // Total
  const totalTax = federalOrdinaryTax + federalLTCGTax + niit + stateTax;

  return {
    taxableSS,
    grossOrdinaryIncome,
    taxableOrdinary,
    capitalGains,
    federalOrdinaryTax,
    federalLTCGTax,
    niit,
    stateTax,
    totalTax,
    standardDeduction,
    effectiveRate:
      grossOrdinaryIncome + capitalGains > 0 ? totalTax / (grossOrdinaryIncome + capitalGains) : 0,
  };
}

// =============================================================================
// STATE TAX RATES BY STATE (simplified - top marginal rates for high earners)
// =============================================================================
const STATE_TAX_RATES = {
  // States with no income tax
  AK: 0,
  FL: 0,
  NV: 0,
  NH: 0,
  SD: 0,
  TN: 0,
  TX: 0,
  WA: 0,
  WY: 0,
  // Flat tax states
  IL: 0.0495,
  CO: 0.044,
  IN: 0.0305,
  KY: 0.04,
  MA: 0.09, // 9% on income over $1M (4% surtax)
  MI: 0.0425,
  NC: 0.0475,
  PA: 0.0307,
  UT: 0.0465,
  // Progressive states (top marginal rates for high earners)
  CA: 0.133, // 13.3% over ~$1.4M (includes 1% mental health surcharge)
  NY: 0.109, // 10.9% top rate
  NJ: 0.1075, // 10.75% over $1M
  OR: 0.099, // 9.9% top rate
  MN: 0.0985, // 9.85% top rate
  VT: 0.0875, // 8.75% top rate
  WI: 0.0765, // 7.65% top rate
  HI: 0.11, // 11% top rate
  SC: 0.07, // 7% flat on income over $16k
  MT: 0.0675, // 6.75% top rate
  AZ: 0.045, // 4.5% (2.5% flat from 2024, but extra on high earners)
  GA: 0.055, // 5.49% flat from 2024
  VA: 0.0575, // 5.75% top rate
  OH: 0.04, // ~4% effective for high earners
  MD: 0.0575, // 5.75% top rate + local
  DC: 0.105, // 10.5% over $1M
  // Default for unlisted states
  DEFAULT: 0.05,
};

// =============================================================================
// FEDERAL MARGINAL TAX RATE LOOKUP
// Given AGI, returns the marginal federal rate (2024 MFJ brackets)
// =============================================================================
export function getFederalMarginalRate(agi) {
  // 2024 MFJ brackets
  if (agi > 731200) return 0.37;
  if (agi > 487450) return 0.35;
  if (agi > 383900) return 0.32;
  if (agi > 201050) return 0.24;
  if (agi > 94300) return 0.22;
  if (agi > 23200) return 0.12;
  return 0.1;
}

// =============================================================================
// STATE MARGINAL TAX RATE LOOKUP
// Given state code and AGI, returns approximate marginal state rate
// =============================================================================
export function getStateMarginalRate(stateCode, agi) {
  const rate = STATE_TAX_RATES[stateCode.toUpperCase()];
  if (rate !== undefined) return rate;
  return STATE_TAX_RATES['DEFAULT'];
}

// =============================================================================
// HEIR TAX RATES CALCULATION
// Given heir's AGI and state, calculate their marginal rates
// =============================================================================
export function calculateHeirTaxRates(heir) {
  const fedRate = getFederalMarginalRate(heir.agi);
  const stateRate = getStateMarginalRate(heir.state, heir.agi);
  return {
    federal: fedRate,
    state: stateRate,
    combined: fedRate + stateRate,
  };
}

// =============================================================================
// HEIR VALUE CALCULATION (Multi-heir support)
// After-tax value to heirs:
// - After-Tax: Step-up in basis, no tax
// - Roth: Tax-free
// - IRA: Taxed at each heir's marginal rate (10-year distribution rule)
// =============================================================================
export function calculateHeirValue(atBalance, iraBalance, rothBalance, heirFedRate, heirStateRate) {
  // Legacy single-heir calculation (for backwards compatibility)
  const heirTaxRate = heirFedRate + heirStateRate;

  // AT gets step-up in basis, passes tax-free
  // Roth is already tax-free
  // IRA is taxed at heir's rate
  const heirValue = atBalance + rothBalance + iraBalance * (1 - heirTaxRate);

  return Math.round(heirValue);
}

// =============================================================================
// MULTI-HEIR VALUE CALCULATION
// Calculates after-tax inheritance value split among multiple heirs
// =============================================================================
export function calculateMultiHeirValue(atBalance, iraBalance, rothBalance, heirs) {
  if (!heirs || heirs.length === 0) {
    // Fallback to default rates if no heirs configured
    return calculateHeirValue(atBalance, iraBalance, rothBalance, 0.37, 0.0495);
  }

  let totalHeirValue = 0;
  const heirDetails = [];

  for (const heir of heirs) {
    const splitFraction = (heir.splitPercent || 0) / 100;
    const rates = calculateHeirTaxRates(heir);

    // Each heir's share
    const heirAt = atBalance * splitFraction;
    const heirIra = iraBalance * splitFraction;
    const heirRoth = rothBalance * splitFraction;

    // AT and Roth pass tax-free, IRA taxed at heir's rate
    const heirValue = heirAt + heirRoth + heirIra * (1 - rates.combined);

    totalHeirValue += heirValue;
    heirDetails.push({
      name: heir.name,
      split: splitFraction,
      rates,
      grossInheritance: heirAt + heirIra + heirRoth,
      taxOnIra: heirIra * rates.combined,
      netValue: Math.round(heirValue),
    });
  }

  return {
    totalValue: Math.round(totalHeirValue),
    details: heirDetails,
  };
}

// =============================================================================
// HEIR VALUE WITH 10-YEAR DISTRIBUTION STRATEGY
// =============================================================================
/**
 * Calculate heir value with 10-year distribution strategy
 *
 * Traditional IRA: Must distribute over 10 years, taxed as ordinary income
 * Roth IRA: Must distribute over 10 years, but tax-free
 * After-Tax: Step-up in basis, no tax
 *
 * Per-heir taxable RoR enables fair comparison by projecting what
 * each heir's inheritance becomes after N years of investing in
 * their own taxable account. This normalizes across:
 * - Different tax-advantaged distributions (Roth tax-free vs IRA taxed)
 * - Different heir investment strategies
 */
export function calculateHeirValueWithStrategy(
  atBalance,
  iraBalance,
  rothBalance,
  heir,
  strategy = 'even', // 'even' or 'year10'
  discountRate = 0.03,
  normalizationYears = 10
) {
  const rates = calculateHeirTaxRates(heir);
  const splitFraction = (heir.splitPercent || 100) / 100;
  const taxableRoR = heir.taxableRoR || 0.06; // Per-heir taxable return rate
  const iraGrowthRate = 0.06; // IRA growth rate while in tax-advantaged wrapper

  const heirAt = atBalance * splitFraction;
  const heirIra = iraBalance * splitFraction;
  const heirRoth = rothBalance * splitFraction;

  // After-Tax: Step-up in basis, 100% value received immediately
  // Heir invests in taxable account at their taxable RoR
  const atValue = heirAt;
  const atFV = heirAt * Math.pow(1 + taxableRoR, normalizationYears);
  const atNormalized = atFV / Math.pow(1 + discountRate, normalizationYears);

  // Roth: Tax-free, but must distribute within 10 years
  // Assume heir takes distribution at year 10 for maximum tax-free growth
  const rothGrowthYears = Math.min(10, normalizationYears);
  const rothFV = heirRoth * Math.pow(1 + iraGrowthRate, rothGrowthYears); // Grows tax-free at IRA rate
  // After distribution, heir invests remaining years at taxable RoR
  const remainingYearsAfterRoth = Math.max(0, normalizationYears - 10);
  const rothAfterDistribution = rothFV * Math.pow(1 + taxableRoR, remainingYearsAfterRoth);
  const rothNormalized = rothAfterDistribution / Math.pow(1 + discountRate, normalizationYears);

  // Traditional IRA: Depends on strategy
  let iraNormalized;
  let iraDetails;

  if (strategy === 'year10') {
    // Lump sum in year 10 - higher tax bracket hit
    const iraFV = heirIra * Math.pow(1 + iraGrowthRate, 10);
    // Assume higher effective rate due to bracket creep (add 3-5%)
    const effectiveRate = Math.min(rates.combined + 0.04, 0.5);
    const afterTax = iraFV * (1 - effectiveRate);
    // After distribution, heir invests at their taxable RoR
    const remainingYearsAfterIra = Math.max(0, normalizationYears - 10);
    const iraAfterDistribution = afterTax * Math.pow(1 + taxableRoR, remainingYearsAfterIra);
    iraNormalized = iraAfterDistribution / Math.pow(1 + discountRate, normalizationYears);
    iraDetails = {
      strategy: 'year10',
      futureValue: Math.round(iraFV),
      taxRate: effectiveRate,
      afterTax: Math.round(afterTax),
      normalized: Math.round(iraNormalized),
      taxableRoR: taxableRoR,
    };
  } else {
    // Spread evenly over 10 years
    let totalNormalized = 0;
    let remaining = heirIra;
    const distributions = [];

    for (let year = 1; year <= 10; year++) {
      remaining = remaining * (1 + iraGrowthRate);
      const distribution = remaining / (10 - year + 1);
      remaining -= distribution;

      // Tax at heir's rate (spreading keeps them in lower brackets)
      const tax = distribution * rates.combined;
      const afterTax = distribution - tax;

      // Heir invests after-tax amount at taxable RoR for remaining years
      const yearsToGrow = normalizationYears - year;
      const fv = afterTax * Math.pow(1 + taxableRoR, Math.max(0, yearsToGrow));
      const normalized = fv / Math.pow(1 + discountRate, normalizationYears);

      totalNormalized += normalized;
      distributions.push({
        year,
        distribution: Math.round(distribution),
        tax: Math.round(tax),
        afterTax: Math.round(afterTax),
        normalized: Math.round(normalized),
      });
    }

    iraNormalized = totalNormalized;
    iraDetails = {
      strategy: 'even',
      distributions,
      taxRate: rates.combined,
      normalized: Math.round(totalNormalized),
      taxableRoR: taxableRoR,
    };
  }

  // Total normalized value - what each account type becomes at horizon
  const totalValue = atNormalized + rothNormalized + iraNormalized;

  return {
    name: heir.name,
    split: splitFraction,
    rates,
    taxableRoR: taxableRoR,
    // Immediate values (what heir receives)
    atValue: Math.round(atValue),
    rothGross: Math.round(heirRoth),
    iraGross: Math.round(heirIra),
    grossInheritance: Math.round(heirAt + heirIra + heirRoth),
    // Normalized values (fair comparison at horizon)
    atNormalized: Math.round(atNormalized),
    rothNormalized: Math.round(rothNormalized),
    iraNormalized: Math.round(iraNormalized),
    netNormalized: Math.round(totalValue),
    iraDetails,
    normalizationYears,
  };
}

// =============================================================================
// MULTI-HEIR VALUE WITH DISTRIBUTION STRATEGY
// =============================================================================
/**
 * Calculate multi-heir value with distribution strategy
 */
export function calculateMultiHeirValueWithStrategy(
  atBalance,
  iraBalance,
  rothBalance,
  heirs,
  strategy = 'even',
  discountRate = 0.03,
  normalizationYears = 10
) {
  if (!heirs || heirs.length === 0) {
    // Fallback to default heir configuration
    const defaultHeir = {
      name: 'Heir',
      splitPercent: 100,
      state: 'IL',
      agi: 200000,
      taxableRoR: 0.06,
    };
    const result = calculateHeirValueWithStrategy(
      atBalance,
      iraBalance,
      rothBalance,
      defaultHeir,
      strategy,
      discountRate,
      normalizationYears
    );
    return {
      grossTotal: result.grossInheritance,
      normalizedTotal: result.netNormalized,
      details: [result],
      strategy,
      normalizationYears,
    };
  }

  let totalGross = 0;
  let totalNormalized = 0;
  const heirDetails = [];

  for (const heir of heirs) {
    const result = calculateHeirValueWithStrategy(
      atBalance,
      iraBalance,
      rothBalance,
      heir,
      strategy,
      discountRate,
      normalizationYears
    );
    totalGross += result.grossInheritance;
    totalNormalized += result.netNormalized;
    heirDetails.push(result);
  }

  return {
    grossTotal: Math.round(totalGross),
    normalizedTotal: Math.round(totalNormalized),
    details: heirDetails,
    strategy,
    normalizationYears,
  };
}
