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
// =============================================================================
export function calculateIRMAA(magi, inflationRate, yearsFromBase, isSingle, numPeople = 2) {
  const baseBrackets = isSingle ? IRMAA_BRACKETS_SINGLE_2024 : IRMAA_BRACKETS_MFJ_2024;
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
export function calculateRiskAllocation(totalPortfolio, atBalance, iraBalance, rothBalance, lowTarget, modTarget) {
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
  
  return (allocation.low * lowReturn + allocation.mod * modReturn + allocation.high * highReturn) / total;
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
  const standardDeduction = Math.round((baseDed + seniorBonus) * Math.pow(1 + bracketInflation, yearsFromBase));
  
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
    effectiveRate: (grossOrdinaryIncome + capitalGains) > 0 
      ? totalTax / (grossOrdinaryIncome + capitalGains) 
      : 0,
  };
}

// =============================================================================
// STATE TAX RATES BY STATE (simplified - top marginal rates for high earners)
// =============================================================================
const STATE_TAX_RATES = {
  // States with no income tax
  'AK': 0, 'FL': 0, 'NV': 0, 'NH': 0, 'SD': 0, 'TN': 0, 'TX': 0, 'WA': 0, 'WY': 0,
  // Flat tax states
  'IL': 0.0495,
  'CO': 0.044,
  'IN': 0.0305,
  'KY': 0.04,
  'MA': 0.09,   // 9% on income over $1M (4% surtax)
  'MI': 0.0425,
  'NC': 0.0475,
  'PA': 0.0307,
  'UT': 0.0465,
  // Progressive states (top marginal rates for high earners)
  'CA': 0.133,  // 13.3% over ~$1.4M (includes 1% mental health surcharge)
  'NY': 0.109,  // 10.9% top rate
  'NJ': 0.1075, // 10.75% over $1M
  'OR': 0.099,  // 9.9% top rate
  'MN': 0.0985, // 9.85% top rate
  'VT': 0.0875, // 8.75% top rate
  'WI': 0.0765, // 7.65% top rate
  'HI': 0.11,   // 11% top rate
  'SC': 0.07,   // 7% flat on income over $16k
  'MT': 0.0675, // 6.75% top rate
  'AZ': 0.045,  // 4.5% (2.5% flat from 2024, but extra on high earners)
  'GA': 0.055,  // 5.49% flat from 2024
  'VA': 0.0575, // 5.75% top rate
  'OH': 0.04,   // ~4% effective for high earners
  'MD': 0.0575, // 5.75% top rate + local
  'DC': 0.105,  // 10.5% over $1M
  // Default for unlisted states
  'DEFAULT': 0.05,
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
  return 0.10;
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
