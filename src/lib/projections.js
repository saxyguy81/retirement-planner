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
  calculateMultiHeirValueWithStrategy,
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
// HELPER: Convert custom brackets from TaxBracketEditor format to calculation format
// TaxBracketEditor format: { rate, singleThreshold, mfjThreshold }
// Calculation format: { rate, threshold }
// =============================================================================
function getCustomBrackets(customBrackets, type, isSingle) {
  if (!customBrackets || !customBrackets[type]) return null;
  return customBrackets[type].map(b => ({
    rate: b.rate,
    threshold: isSingle ? b.singleThreshold : b.mfjThreshold,
  }));
}

// =============================================================================
// WITHDRAWAL CALCULATION (with optional iteration)
// =============================================================================
function calculateWithdrawals(inputs, taxParams, options) {
  const {
    atBOY,
    iraBOY,
    rothBOY,
    costBasisBOY,
    ssAnnual,
    expenses,
    irmaaTotal,
    rmdRequired,
    rothConversion,
    atHarvestOverride = 0,
    propertyTax = 0,
  } = inputs;

  const {
    fedBrackets,
    ltcgBrackets,
    standardDeduction,
    stateTaxRate,
    capitalGainsPercent,
    isSingle,
    exemptSSFromTax = false,
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

    let atW = 0,
      iraW = 0,
      rothW = 0;

    // IRA must withdraw at least RMD (and account for Roth conversion reducing available balance)
    const iraAvailable = Math.max(0, iraBOY - rothConversion);
    iraW = Math.min(iraAvailable, Math.max(rmdRequired, 0));
    need -= iraW;

    // After-Tax next (preserves tax-deferred growth)
    if (need > 0 && atBOY > 0) {
      atW = Math.min(atBOY, need);
      need -= atW;
    }

    // Add AT harvest override (extra AT liquidation for capital gains harvesting)
    if (atHarvestOverride > 0 && atBOY > atW) {
      const additionalHarvest = Math.min(atHarvestOverride, atBOY - atW);
      atW += additionalHarvest;
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

    // Calculate taxable Social Security (0 if Trump's SS exemption is enabled)
    const otherIncomeForSS = iraW + rothConversion + capitalGains;
    const taxableSS = exemptSSFromTax
      ? 0
      : calculateTaxableSocialSecurity(ssAnnual, otherIncomeForSS, isSingle);

    // Ordinary income
    const ordinaryIncome = taxableSS + iraW + rothConversion;
    const taxableOrdinary = Math.max(0, ordinaryIncome - standardDeduction);

    // Calculate taxes
    const federalTax = calculateFederalTax(taxableOrdinary, fedBrackets);
    const ltcgTax = calculateLTCGTax(capitalGains, taxableOrdinary, ltcgBrackets);

    // NIIT
    const magi = ordinaryIncome + capitalGains;
    const niit = calculateNIIT(capitalGains, magi, isSingle);

    // State tax (IL only taxes investment income, with property tax credit)
    // AGI for IL credit = ordinary income + capital gains
    const agiForILCredit = ordinaryIncome + capitalGains;
    const ilTaxResult = calculateIllinoisTax(
      capitalGains,
      stateTaxRate,
      propertyTax,
      agiForILCredit,
      isSingle
    );
    const stateTax = ilTaxResult.netTax;
    const ilPropertyTaxCredit = ilTaxResult.propertyTaxCredit;

    const totalTax = federalTax + ltcgTax + niit + stateTax;

    const atWithdrawalRounded = Math.round(atW);
    const iraWithdrawalRounded = Math.round(iraW);
    const rothWithdrawalRounded = Math.round(rothW);

    result = {
      atWithdrawal: atWithdrawalRounded,
      iraWithdrawal: iraWithdrawalRounded,
      rothWithdrawal: rothWithdrawalRounded,
      totalWithdrawal: atWithdrawalRounded + iraWithdrawalRounded + rothWithdrawalRounded,
      taxableSS: Math.round(taxableSS),
      ordinaryIncome: Math.round(ordinaryIncome),
      capitalGains: Math.round(capitalGains),
      taxableOrdinary: Math.round(taxableOrdinary),
      federalTax,
      ltcgTax,
      niit,
      stateTax,
      ilPropertyTaxCredit,
      ilBaseTax: ilTaxResult.baseTax,
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
  let cumulativeCapitalGains = 0;
  let cumulativeATTax = 0;

  // Track original AT balance for liquidation percentage
  const originalATBalance = p.afterTaxStart;

  for (let year = p.startYear; year <= p.endYear; year++) {
    const taxBaseYear = p.taxYear || 2024;
    const yearsFromBase = year - taxBaseYear; // Years from tax table base year
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
        totalBOY,
        atBOY,
        iraBOY,
        rothBOY,
        p.lowRiskTarget,
        p.modRiskTarget
      );
      effectiveAtReturn = calculateBlendedReturn(
        riskAllocation.at,
        p.lowRiskReturn,
        p.modRiskReturn,
        p.highRiskReturn
      );
      effectiveIraReturn = calculateBlendedReturn(
        riskAllocation.ira,
        p.lowRiskReturn,
        p.modRiskReturn,
        p.highRiskReturn
      );
      effectiveRothReturn = calculateBlendedReturn(
        riskAllocation.roth,
        p.lowRiskReturn,
        p.modRiskReturn,
        p.highRiskReturn
      );
    } else {
      effectiveAtReturn = p.atReturn;
      effectiveIraReturn = p.iraReturn;
      effectiveRothReturn = p.rothReturn;
    }

    // Income calculations
    let ssAnnual = p.socialSecurityMonthly * 12 * Math.pow(1 + p.ssCOLA, yearsFromStart);

    // Expense calculation: use override if set, otherwise calculate with inflation
    let expenses =
      p.expenseOverrides && p.expenseOverrides[year]
        ? p.expenseOverrides[year]
        : p.annualExpenses * Math.pow(1 + p.expenseInflation, yearsFromStart);

    // Adjust for survivor scenario
    if (isSurvivor) {
      ssAnnual *= p.survivorSSPercent;
      expenses *= p.survivorExpensePercent;
    }

    // AT harvest override (extra AT liquidation for capital gains harvesting)
    const atHarvestOverride = p.atHarvestOverrides?.[year] || 0;

    // RMD calculation
    const rmd = calculateRMD(iraBOY, age);

    // Property Tax and SALT calculation
    const propertyTax = p.annualPropertyTax || 0;
    const saltCap = isSingle ? p.saltCapSingle || 10000 : p.saltCapMarried || 10000;
    const deductiblePropertyTax = Math.min(propertyTax, saltCap);

    // Roth conversion for this year - cap to available IRA after RMD
    const requestedRothConversion = p.rothConversions[year] || 0;
    const maxConversion = Math.max(0, iraBOY - rmd.required);
    const actualRothConversion = Math.min(requestedRothConversion, maxConversion);
    const conversionCapped = requestedRothConversion > actualRothConversion;

    // Inflate tax brackets (use custom if available, otherwise defaults)
    const baseFedBrackets =
      getCustomBrackets(p.customBrackets, 'federal', isSingle) ||
      (isSingle ? FEDERAL_BRACKETS_SINGLE_2024 : FEDERAL_BRACKETS_MFJ_2024);
    const baseLtcgBrackets =
      getCustomBrackets(p.customBrackets, 'capitalGains', isSingle) ||
      (isSingle ? LTCG_BRACKETS_SINGLE_2024 : LTCG_BRACKETS_MFJ_2024);

    const fedBrackets = inflateBrackets(baseFedBrackets, p.bracketInflation, yearsFromBase);
    const ltcgBrackets = inflateBrackets(baseLtcgBrackets, p.bracketInflation, yearsFromBase);

    // Standard deduction with inflation and senior bonus
    const baseDed = isSingle ? STANDARD_DEDUCTION_SINGLE_2024 : STANDARD_DEDUCTION_MFJ_2024;
    const seniorBonus = isSingle ? SENIOR_BONUS_SINGLE_2024 : SENIOR_BONUS_MFJ_2024;
    const standardDeduction = Math.round(
      (baseDed + seniorBonus) * Math.pow(1 + p.bracketInflation, yearsFromBase)
    );

    // IRMAA (2-year lookback)
    const irmaaMAGI = magiHistory[year - 2] || 0;
    const irmaa = calculateIRMAA(
      irmaaMAGI,
      p.bracketInflation,
      yearsFromBase,
      isSingle,
      isSurvivor ? 1 : 2,
      p.customIRMAA
    );
    cumulativeIRMAA += irmaa.total;

    // Calculate withdrawals and taxes (with iteration)
    const withdrawal = calculateWithdrawals(
      {
        atBOY,
        iraBOY,
        rothBOY,
        costBasisBOY,
        ssAnnual,
        expenses,
        irmaaTotal: irmaa.total,
        rmdRequired: rmd.required,
        rothConversion: actualRothConversion,
        atHarvestOverride,
        propertyTax,
      },
      {
        fedBrackets,
        ltcgBrackets,
        standardDeduction,
        stateTaxRate: p.stateTaxRate,
        capitalGainsPercent: p.capitalGainsPercent,
        isSingle,
        exemptSSFromTax: p.exemptSSFromTax || false,
      },
      {
        iterative: p.iterativeTax,
        maxIterations: p.maxIterations,
      }
    );

    cumulativeTax += withdrawal.totalTax;
    cumulativeExpenses += expenses;
    cumulativeCapitalGains += withdrawal.capitalGains;
    cumulativeATTax += withdrawal.ltcgTax;

    // Calculate AT liquidation percentage (how much of original AT has been used)
    const atLiquidationPercent = originalATBalance > 0 ? 1 - atBOY / originalATBalance : 0;

    // Apply withdrawals
    const atAfterWithdrawal = atBOY - withdrawal.atWithdrawal;
    const iraAfterWithdrawal = iraBOY - withdrawal.iraWithdrawal - actualRothConversion;
    const rothAfterWithdrawal = rothBOY - withdrawal.rothWithdrawal + actualRothConversion;

    // Apply growth (end of year)
    const atEOY = Math.max(0, atAfterWithdrawal * (1 + effectiveAtReturn));
    const iraEOY = Math.max(0, iraAfterWithdrawal * (1 + effectiveIraReturn));
    const rothEOY = Math.max(0, rothAfterWithdrawal * (1 + effectiveRothReturn));
    const totalEOY = atEOY + iraEOY + rothEOY;

    // Update cost basis (proportional to withdrawal)
    const costBasisUsed = atBOY > 0 ? costBasisBOY * (withdrawal.atWithdrawal / atBOY) : 0;
    const costBasisEOY = Math.max(0, costBasisBOY - costBasisUsed);

    // Update MAGI history for future IRMAA
    magiHistory[year] = withdrawal.ordinaryIncome + withdrawal.capitalGains + actualRothConversion;

    // Heir value calculation
    // Use strategy-based calculation if heirDistributionStrategy is specified
    // Otherwise fall back to legacy calculation for backwards compatibility
    let heirGross, heirNormalized, heirValue, heirDetails, heirStrategyDetails;
    const heirStrategy = p.heirDistributionStrategy || 'even';
    const heirNormalizationYears = p.heirNormalizationYears || 10;

    if (p.heirs && p.heirs.length > 0) {
      // Use new strategy-based multi-heir calculation
      const heirResult = calculateMultiHeirValueWithStrategy(
        atEOY,
        iraEOY,
        rothEOY,
        p.heirs,
        heirStrategy,
        p.discountRate || 0.03,
        heirNormalizationYears
      );
      heirGross = heirResult.grossTotal;
      heirNormalized = heirResult.normalizedTotal;
      heirValue = heirNormalized; // Use normalized for comparisons
      heirDetails = heirResult.details;
      heirStrategyDetails = {
        strategy: heirResult.strategy,
        normalizationYears: heirResult.normalizationYears,
      };

      // Also calculate with alternate strategy for comparison
      const altStrategy = heirStrategy === 'even' ? 'year10' : 'even';
      const altResult = calculateMultiHeirValueWithStrategy(
        atEOY,
        iraEOY,
        rothEOY,
        p.heirs,
        altStrategy,
        p.discountRate || 0.03,
        heirNormalizationYears
      );
      heirStrategyDetails.alternateStrategyValue = altResult.normalizedTotal;
      heirStrategyDetails.alternateStrategy = altStrategy;
    } else {
      // Legacy single-heir calculation
      heirValue = calculateHeirValue(atEOY, iraEOY, rothEOY, p.heirFedRate, p.heirStateRate);
      heirGross = atEOY + iraEOY + rothEOY;
      heirNormalized = heirValue;
      heirDetails = null;
      heirStrategyDetails = null;
    }

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
      rothConversion: actualRothConversion,

      // Roth conversion feasibility tracking
      rothConversionRequested: requestedRothConversion,
      rothConversionActual: actualRothConversion,
      rothConversionCapped: conversionCapped,

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

      // Property Tax & SALT
      propertyTax,
      deductiblePropertyTax,
      saltCap,

      // End of year
      atEOY: Math.round(atEOY),
      iraEOY: Math.round(iraEOY),
      rothEOY: Math.round(rothEOY),
      totalEOY: Math.round(totalEOY),
      costBasisEOY: Math.round(costBasisEOY),

      // Heir value
      heirGross, // Total gross inheritance (before taxes)
      heirNormalized, // Normalized heir value (for comparisons)
      heirValue, // Same as heirNormalized for display
      heirDetails, // Per-heir breakdown with strategy details
      heirStrategyDetails, // Strategy comparison info
      rothPercent: totalEOY > 0 ? rothEOY / totalEOY : 0,

      // Cumulative
      cumulativeTax: Math.round(cumulativeTax),
      cumulativeIRMAA: Math.round(cumulativeIRMAA),
      cumulativeExpenses: Math.round(cumulativeExpenses),
      cumulativeCapitalGains: Math.round(cumulativeCapitalGains),
      cumulativeATTax: Math.round(cumulativeATTax),
      atLiquidationPercent,

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

  // Calculate conversion feasibility
  const totalConversionRequested = projections.reduce(
    (sum, p) => sum + (p.rothConversionRequested || 0),
    0
  );
  const totalConversionActual = projections.reduce(
    (sum, p) => sum + (p.rothConversionActual || 0),
    0
  );
  const conversionCappedYears = projections.filter(p => p.rothConversionCapped).map(p => p.year);
  const firstConversionCappedYear =
    conversionCappedYears.length > 0 ? conversionCappedYears[0] : null;

  return {
    startYear: first.year,
    endYear: last.year,
    yearsModeled: projections.length,

    startingPortfolio: first.totalBOY,
    endingPortfolio: last.totalEOY,
    portfolioGrowth: last.totalEOY - first.totalBOY,

    startingHeirValue: first.heirValue, // Use the calculated value from first year (includes multi-heir if configured)
    endingHeirValue: last.heirValue,

    totalTaxPaid: last.cumulativeTax,
    totalIRMAAPaid: last.cumulativeIRMAA,
    totalExpenses: last.cumulativeExpenses,

    finalRothPercent: last.rothPercent,

    // Find peak and trough
    peakPortfolio: Math.max(...projections.map(p => p.totalEOY)),
    peakYear: projections.find(p => p.totalEOY === Math.max(...projections.map(p => p.totalEOY)))
      ?.year,

    // Years with shortfall
    shortfallYears: projections.filter(p => p.shortfall > 0).map(p => p.year),

    // Conversion feasibility
    totalConversionRequested,
    totalConversionActual,
    conversionShortfall: totalConversionRequested - totalConversionActual,
    conversionFeasibilityPercent:
      totalConversionRequested > 0 ? totalConversionActual / totalConversionRequested : 1,
    conversionCappedYears,
    firstConversionCappedYear,
    isFullyFeasible: conversionCappedYears.length === 0,
  };
}
