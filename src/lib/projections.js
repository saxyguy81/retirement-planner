/**
 * Projection Engine
 * Generates year-by-year retirement projections with iterative tax calculation
 */

import {
  calculateFederalTax,
  calculateLTCGTax,
  calculateNIIT,
  calculateTaxableSocialSecurity,
  calculateIllinoisTax,
  calculateIRMAA,
  calculateRMD,
  calculateRiskAllocation,
  calculateBlendedReturn,
  calculateHeirValue,
} from './calculations.js';

import {
  FEDERAL_BRACKETS_MFJ_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
  LTCG_BRACKETS_MFJ_2024,
  LTCG_BRACKETS_SINGLE_2024,
  STANDARD_DEDUCTION_MFJ_2024,
  STANDARD_DEDUCTION_SINGLE_2024,
  SENIOR_BONUS_MFJ_2024,
  SENIOR_BONUS_SINGLE_2024,
  inflateBrackets,
  DEFAULT_PARAMS,
} from './taxTables.js';

// =============================================================================
// WITHDRAWAL CALCULATION (with optional iteration)
// =============================================================================
function calculateWithdrawals(inputs, taxParams, options) {
  const {
    atBOY, iraBOY, rothBOY, costBasisBOY,
    ssAnnual, expenses, irmaaTotal,
    rmdRequired, rothConversion
  } = inputs;
  
  const {
    fedBrackets, ltcgBrackets, standardDeduction,
    stateTaxRate, capitalGainsPercent, isSingle
  } = taxParams;
  
  const { iterative, maxIterations } = options;
  
  let estimatedTax = 0;
  let result = null;
  const iterations = iterative ? maxIterations : 1;
  
  for (let iter = 0; iter < iterations; iter++) {
    // Total cash needed this year
    const totalNeed = expenses + irmaaTotal + estimatedTax;
    const afterSS = totalNeed - ssAnnual;
    let need = Math.max(0, afterSS);
    
    let atW = 0, iraW = 0, rothW = 0;
    
    // IRA must withdraw at least RMD (and account for Roth conversion reducing available balance)
    const iraAvailable = Math.max(0, iraBOY - rothConversion);
    iraW = Math.min(iraAvailable, Math.max(rmdRequired, 0));
    need -= iraW;
    
    // After-Tax next (preserves tax-deferred growth)
    if (need > 0 && atBOY > 0) {
      atW = Math.min(atBOY, need);
      need -= atW;
    }
    
    // More IRA if needed
    if (need > 0 && iraAvailable > iraW) {
      const additionalIRA = Math.min(iraAvailable - iraW, need);
      iraW += additionalIRA;
      need -= additionalIRA;
    }
    
    // Roth last (preserves tax-free growth)
    if (need > 0 && rothBOY > 0) {
      rothW = Math.min(rothBOY, need);
      need -= rothW;
    }
    
    // Calculate capital gains from AT withdrawal
    const cgRatio = atBOY > 0 ? Math.max(0, 1 - costBasisBOY / atBOY) : 0;
    const capitalGains = atW * cgRatio * capitalGainsPercent;
    
    // Calculate taxable Social Security
    const otherIncomeForSS = iraW + rothConversion + capitalGains;
    const taxableSS = calculateTaxableSocialSecurity(ssAnnual, otherIncomeForSS, isSingle);
    
    // Ordinary income
    const ordinaryIncome = taxableSS + iraW + rothConversion;
    const taxableOrdinary = Math.max(0, ordinaryIncome - standardDeduction);
    
    // Calculate taxes
    const federalTax = calculateFederalTax(taxableOrdinary, fedBrackets);
    const ltcgTax = calculateLTCGTax(capitalGains, taxableOrdinary, ltcgBrackets);
    
    // NIIT
    const magi = ordinaryIncome + capitalGains;
    const niit = calculateNIIT(capitalGains, magi, isSingle);
    
    // State tax (IL only taxes investment income)
    const stateTax = calculateIllinoisTax(capitalGains, stateTaxRate);
    
    const totalTax = federalTax + ltcgTax + niit + stateTax;
    
    result = {
      atWithdrawal: Math.round(atW),
      iraWithdrawal: Math.round(iraW),
      rothWithdrawal: Math.round(rothW),
      totalWithdrawal: Math.round(atW + iraW + rothW),
      taxableSS: Math.round(taxableSS),
      ordinaryIncome: Math.round(ordinaryIncome),
      capitalGains: Math.round(capitalGains),
      taxableOrdinary: Math.round(taxableOrdinary),
      federalTax,
      ltcgTax,
      niit,
      stateTax,
      totalTax,
      shortfall: Math.round(need), // If positive, couldn't meet expenses
      iterations: iter + 1,
    };
    
    // Check convergence
    if (!iterative || Math.abs(totalTax - estimatedTax) < 100) break;
    estimatedTax = totalTax;
  }
  
  return result;
}

// =============================================================================
// MAIN PROJECTION FUNCTION
// =============================================================================
export function generateProjections(params = {}) {
  // Merge with defaults
  const p = { ...DEFAULT_PARAMS, ...params };
  
  const results = [];
  
  // Initialize balances
  let atBalance = p.afterTaxStart;
  let iraBalance = p.iraStart;
  let rothBalance = p.rothStart;
  let costBasis = p.afterTaxCostBasis;
  
  // MAGI history for IRMAA (need 2-year lookback)
  const magiHistory = {
    [p.startYear - 2]: p.magi2024,
    [p.startYear - 1]: p.magi2025,
  };
  
  // Cumulative tracking
  let cumulativeTax = 0;
  let cumulativeIRMAA = 0;
  let cumulativeExpenses = 0;
  
  for (let year = p.startYear; year <= p.endYear; year++) {
    const yearsFromBase = year - 2024; // Years from tax table base year
    const yearsFromStart = year - p.startYear;
    const age = year - p.birthYear;
    
    // Determine if survivor scenario
    const isSurvivor = p.survivorDeathYear && year >= p.survivorDeathYear;
    const isSingle = isSurvivor;
    
    // Beginning of year balances
    const atBOY = atBalance;
    const iraBOY = iraBalance;
    const rothBOY = rothBalance;
    const totalBOY = atBOY + iraBOY + rothBOY;
    const costBasisBOY = costBasis;
    
    // Calculate effective returns based on mode
    let effectiveAtReturn, effectiveIraReturn, effectiveRothReturn;
    let riskAllocation = null;
    
    if (p.returnMode === 'blended') {
      riskAllocation = calculateRiskAllocation(
        totalBOY, atBOY, iraBOY, rothBOY,
        p.lowRiskTarget, p.modRiskTarget
      );
      effectiveAtReturn = calculateBlendedReturn(riskAllocation.at, p.lowRiskReturn, p.modRiskReturn, p.highRiskReturn);
      effectiveIraReturn = calculateBlendedReturn(riskAllocation.ira, p.lowRiskReturn, p.modRiskReturn, p.highRiskReturn);
      effectiveRothReturn = calculateBlendedReturn(riskAllocation.roth, p.lowRiskReturn, p.modRiskReturn, p.highRiskReturn);
    } else {
      effectiveAtReturn = p.atReturn;
      effectiveIraReturn = p.iraReturn;
      effectiveRothReturn = p.rothReturn;
    }
    
    // Income calculations
    let ssAnnual = p.socialSecurityMonthly * 12 * Math.pow(1 + p.ssCOLA, yearsFromStart);
    let expenses = p.annualExpenses * Math.pow(1 + p.expenseInflation, yearsFromStart);
    
    // Adjust for survivor scenario
    if (isSurvivor) {
      ssAnnual *= p.survivorSSPercent;
      expenses *= p.survivorExpensePercent;
    }
    
    // Roth conversion for this year
    const rothConversion = p.rothConversions[year] || 0;
    
    // RMD calculation
    const rmd = calculateRMD(iraBOY, age);
    
    // Inflate tax brackets
    const fedBrackets = inflateBrackets(
      isSingle ? FEDERAL_BRACKETS_SINGLE_2024 : FEDERAL_BRACKETS_MFJ_2024,
      p.bracketInflation, yearsFromBase
    );
    const ltcgBrackets = inflateBrackets(
      isSingle ? LTCG_BRACKETS_SINGLE_2024 : LTCG_BRACKETS_MFJ_2024,
      p.bracketInflation, yearsFromBase
    );
    
    // Standard deduction with inflation and senior bonus
    const baseDed = isSingle ? STANDARD_DEDUCTION_SINGLE_2024 : STANDARD_DEDUCTION_MFJ_2024;
    const seniorBonus = isSingle ? SENIOR_BONUS_SINGLE_2024 : SENIOR_BONUS_MFJ_2024;
    const standardDeduction = Math.round((baseDed + seniorBonus) * Math.pow(1 + p.bracketInflation, yearsFromBase));
    
    // IRMAA (2-year lookback)
    const irmaaMAGI = magiHistory[year - 2] || 0;
    const irmaa = calculateIRMAA(
      irmaaMAGI, p.bracketInflation, yearsFromBase,
      isSingle, isSurvivor ? 1 : 2
    );
    cumulativeIRMAA += irmaa.total;
    
    // Calculate withdrawals and taxes (with iteration)
    const withdrawal = calculateWithdrawals(
      {
        atBOY, iraBOY, rothBOY, costBasisBOY,
        ssAnnual, expenses, irmaaTotal: irmaa.total,
        rmdRequired: rmd.required, rothConversion
      },
      {
        fedBrackets, ltcgBrackets, standardDeduction,
        stateTaxRate: p.stateTaxRate,
        capitalGainsPercent: p.capitalGainsPercent,
        isSingle
      },
      {
        iterative: p.iterativeTax,
        maxIterations: p.maxIterations
      }
    );
    
    cumulativeTax += withdrawal.totalTax;
    cumulativeExpenses += expenses;
    
    // Apply withdrawals
    const atAfterWithdrawal = atBOY - withdrawal.atWithdrawal;
    const iraAfterWithdrawal = iraBOY - withdrawal.iraWithdrawal - rothConversion;
    const rothAfterWithdrawal = rothBOY - withdrawal.rothWithdrawal + rothConversion;
    
    // Apply growth (end of year)
    const atEOY = Math.max(0, atAfterWithdrawal * (1 + effectiveAtReturn));
    const iraEOY = Math.max(0, iraAfterWithdrawal * (1 + effectiveIraReturn));
    const rothEOY = Math.max(0, rothAfterWithdrawal * (1 + effectiveRothReturn));
    const totalEOY = atEOY + iraEOY + rothEOY;
    
    // Update cost basis (proportional to withdrawal)
    const costBasisUsed = atBOY > 0 ? costBasisBOY * (withdrawal.atWithdrawal / atBOY) : 0;
    const costBasisEOY = Math.max(0, costBasisBOY - costBasisUsed);
    
    // Update MAGI history for future IRMAA
    magiHistory[year] = withdrawal.ordinaryIncome + withdrawal.capitalGains + rothConversion;
    
    // Heir value
    const heirValue = calculateHeirValue(atEOY, iraEOY, rothEOY, p.heirFedRate, p.heirStateRate);
    
    // Present value factor
    const pvFactor = Math.pow(1 + (p.discountRate || 0.03), yearsFromStart);
    
    // Investment returns for the year
    const atReturn = atAfterWithdrawal > 0 ? atAfterWithdrawal * effectiveAtReturn : 0;
    const iraReturn = iraAfterWithdrawal > 0 ? iraAfterWithdrawal * effectiveIraReturn : 0;
    const rothReturn = rothAfterWithdrawal > 0 ? rothAfterWithdrawal * effectiveRothReturn : 0;
    
    results.push({
      // Identifiers
      year,
      age,
      isSurvivor,
      yearsFromStart,
      
      // Beginning of year
      atBOY: Math.round(atBOY),
      iraBOY: Math.round(iraBOY),
      rothBOY: Math.round(rothBOY),
      totalBOY: Math.round(totalBOY),
      costBasisBOY: Math.round(costBasisBOY),
      
      // Returns
      effectiveAtReturn,
      effectiveIraReturn,
      effectiveRothReturn,
      riskAllocation,
      atReturn: Math.round(atReturn),
      iraReturn: Math.round(iraReturn),
      rothReturn: Math.round(rothReturn),
      
      // Income & Expenses
      ssAnnual: Math.round(ssAnnual),
      expenses: Math.round(expenses),
      rothConversion,
      
      // RMD
      rmdFactor: rmd.factor,
      rmdRequired: rmd.required,
      
      // Withdrawals
      ...withdrawal,
      
      // IRMAA
      irmaaMAGI: Math.round(irmaaMAGI),
      irmaaPartB: irmaa.partB,
      irmaaPartD: irmaa.partD,
      irmaaTotal: irmaa.total,
      irmaaBracket: irmaa.bracket,
      
      // Standard deduction used
      standardDeduction,
      
      // End of year
      atEOY: Math.round(atEOY),
      iraEOY: Math.round(iraEOY),
      rothEOY: Math.round(rothEOY),
      totalEOY: Math.round(totalEOY),
      costBasisEOY: Math.round(costBasisEOY),
      
      // Heir value
      heirValue,
      rothPercent: totalEOY > 0 ? rothEOY / totalEOY : 0,
      
      // Cumulative
      cumulativeTax: Math.round(cumulativeTax),
      cumulativeIRMAA: Math.round(cumulativeIRMAA),
      cumulativeExpenses: Math.round(cumulativeExpenses),
      
      // Present values
      pvAtEOY: Math.round(atEOY / pvFactor),
      pvIraEOY: Math.round(iraEOY / pvFactor),
      pvRothEOY: Math.round(rothEOY / pvFactor),
      pvTotalEOY: Math.round(totalEOY / pvFactor),
      pvHeirValue: Math.round(heirValue / pvFactor),
      pvExpenses: Math.round(expenses / pvFactor),
    });
    
    // Update balances for next year
    atBalance = atEOY;
    iraBalance = iraEOY;
    rothBalance = rothEOY;
    costBasis = costBasisEOY;
  }
  
  return results;
}

// =============================================================================
// SCENARIO COMPARISON
// =============================================================================
export function compareScenarios(baseParams, scenarios) {
  const results = {
    base: generateProjections(baseParams),
    scenarios: {},
  };
  
  for (const [name, overrides] of Object.entries(scenarios)) {
    results.scenarios[name] = generateProjections({ ...baseParams, ...overrides });
  }
  
  return results;
}

// =============================================================================
// SUMMARY STATISTICS
// =============================================================================
export function calculateSummary(projections) {
  const first = projections[0];
  const last = projections[projections.length - 1];
  
  return {
    startYear: first.year,
    endYear: last.year,
    yearsModeled: projections.length,
    
    startingPortfolio: first.totalBOY,
    endingPortfolio: last.totalEOY,
    portfolioGrowth: last.totalEOY - first.totalBOY,
    
    startingHeirValue: calculateHeirValue(first.atBOY, first.iraBOY, first.rothBOY, 0.37, 0.0495),
    endingHeirValue: last.heirValue,
    
    totalTaxPaid: last.cumulativeTax,
    totalIRMAAPaid: last.cumulativeIRMAA,
    totalExpenses: last.cumulativeExpenses,
    
    finalRothPercent: last.rothPercent,
    
    // Find peak and trough
    peakPortfolio: Math.max(...projections.map(p => p.totalEOY)),
    peakYear: projections.find(p => p.totalEOY === Math.max(...projections.map(p => p.totalEOY)))?.year,
    
    // Years with shortfall
    shortfallYears: projections.filter(p => p.shortfall > 0).map(p => p.year),
  };
}
