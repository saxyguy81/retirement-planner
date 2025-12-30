/**
 * Source Code Provider for AI
 *
 * Provides pre-extracted code snippets with comments for AI to explain calculations.
 * This is more reliable than runtime code reading and ensures consistent explanations.
 */

export const SOURCE_CODE = {
  federal_tax: {
    file: 'src/lib/calculations.js',
    lines: '45-85',
    description: 'Federal income tax calculation using progressive brackets',
    code: `
/**
 * Calculate federal income tax using progressive brackets
 * @param {number} taxableIncome - Total taxable ordinary income
 * @param {Array} brackets - Tax brackets [{ceiling, rate}]
 */
export function calculateFederalTax(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let previousCeiling = 0;

  for (const { ceiling, rate } of brackets) {
    if (taxableIncome <= previousCeiling) break;

    const taxableInBracket = Math.min(taxableIncome, ceiling) - previousCeiling;
    tax += taxableInBracket * rate;
    previousCeiling = ceiling;
  }

  return Math.round(tax);
}`,
    explanation: `
The federal tax is calculated progressively:
1. Income is taxed in "slices" at different rates
2. First $23,200 (MFJ) at 10%
3. Next $71,100 ($23,200-$94,300) at 12%
4. And so on through 22%, 24%, 32%, 35%, 37% brackets
5. Each bracket only applies to income WITHIN that range
`,
  },

  ltcg_tax: {
    file: 'src/lib/calculations.js',
    lines: '90-140',
    description: 'Long-term capital gains tax with stacking on ordinary income',
    code: `
/**
 * Calculate LTCG tax with bracket stacking
 * Capital gains "stack" on top of ordinary income to determine the rate
 */
export function calculateLTCGTax(capitalGains, ordinaryIncome, brackets) {
  if (capitalGains <= 0) return 0;

  let tax = 0;
  let previousCeiling = 0;
  const stackedIncome = ordinaryIncome;

  for (const { ceiling, rate } of brackets) {
    // Skip brackets already filled by ordinary income
    if (ceiling <= stackedIncome) {
      previousCeiling = ceiling;
      continue;
    }

    // Calculate gains in this bracket
    const bracketStart = Math.max(previousCeiling, stackedIncome);
    const bracketEnd = Math.min(stackedIncome + capitalGains, ceiling);
    const gainsInBracket = bracketEnd - bracketStart;

    if (gainsInBracket > 0) {
      tax += gainsInBracket * rate;
    }

    previousCeiling = ceiling;
  }

  return Math.round(tax);
}`,
    explanation: `
LTCG tax uses "stacking":
1. Ordinary income fills the lower brackets first
2. Capital gains then "stack" on top
3. If ordinary income is $50k, first $44,050 of gains are at 0%
4. Gains above that threshold are taxed at 15% (up to $583,750 total)
5. Gains above $583,750 total income are taxed at 20%
`,
  },

  social_security_taxation: {
    file: 'src/lib/calculations.js',
    lines: '160-210',
    description: 'Social Security benefit taxation calculation',
    code: `
/**
 * Calculate taxable portion of Social Security benefits
 * Uses "combined income" = AGI + 0.5 * SS benefits
 */
export function calculateTaxableSocialSecurity(ssIncome, otherIncome, isSingle) {
  if (ssIncome <= 0) return 0;

  const thresholds = isSingle ? SS_TAX_THRESHOLDS_SINGLE : SS_TAX_THRESHOLDS_MFJ;
  const combinedIncome = otherIncome + ssIncome * 0.5;

  // Below tier1: 0% taxable
  if (combinedIncome <= thresholds.tier1) return 0;

  // Between tier1 and tier2: up to 50% taxable
  const tier1Excess = Math.min(combinedIncome - thresholds.tier1,
                                thresholds.tier2 - thresholds.tier1);
  let taxable = tier1Excess * 0.5;

  // Above tier2: additional 35% (total up to 85%)
  if (combinedIncome > thresholds.tier2) {
    taxable += (combinedIncome - thresholds.tier2) * 0.85;
  }

  // Cap at 85% of benefits
  return Math.min(taxable, ssIncome * 0.85);
}`,
    explanation: `
SS taxation depends on "combined income":
1. Combined = AGI + 50% of SS benefits
2. MFJ thresholds: $32k (tier1) and $44k (tier2)
3. Below $32k: 0% of SS is taxable
4. $32k-$44k: 50% of excess is taxable
5. Above $44k: additional 85% of excess is taxable
6. Maximum: 85% of SS can ever be taxed
`,
  },

  rmd: {
    file: 'src/lib/calculations.js',
    lines: '270-300',
    description: 'Required Minimum Distribution calculation',
    code: `
/**
 * Calculate Required Minimum Distribution
 * Uses IRS Uniform Lifetime Table (updated 2022)
 */
export function calculateRMD(iraBalance, age) {
  if (age < RMD_START_AGE) return { required: 0, factor: 0 };

  // Look up distribution period (life expectancy factor)
  const factor = RMD_TABLE[Math.min(age, 120)] || RMD_TABLE[120];

  // RMD = Balance / Factor
  const required = Math.round(iraBalance / factor);

  return { required, factor };
}`,
    explanation: `
RMD calculation:
1. Starts at age 73 (as of 2023 SECURE 2.0 Act)
2. Look up "life expectancy factor" in IRS table
3. At 73: factor = 26.5, so RMD = balance / 26.5 = ~3.77%
4. At 80: factor = 20.2, so RMD = ~4.95%
5. At 90: factor = 12.2, so RMD = ~8.2%
6. Factor decreases each year (higher percentage required)
`,
  },

  heir_value: {
    file: 'src/lib/calculations.js',
    lines: '320-360',
    description: 'After-tax heir value calculation',
    code: `
/**
 * Calculate after-tax value heirs receive
 * AT: step-up basis (no tax), IRA: fully taxable, Roth: tax-free
 */
export function calculateHeirValue(atBalance, iraBalance, rothBalance, heirFedRate, heirStateRate) {
  // After-tax account: step-up in basis eliminates capital gains
  const atValue = atBalance;

  // Traditional IRA: taxed as ordinary income to heirs
  const iraValue = iraBalance * (1 - heirFedRate - heirStateRate);

  // Roth: completely tax-free to heirs
  const rothValue = rothBalance;

  return atValue + iraValue + rothValue;
}`,
    explanation: `
Heir value calculation reflects different tax treatment:
1. After-tax brokerage: Gets "step-up" in cost basis at death
   - Heirs pay NO capital gains tax on growth during your life
   - Full balance passes tax-free
2. Traditional IRA: Heirs must distribute over 10 years
   - ALL withdrawals taxed as ordinary income
   - At 37% fed + 5% state = only 58% net value
3. Roth IRA: Best for heirs
   - Must distribute over 10 years but NO TAX
   - Full balance passes tax-free
`,
  },

  irmaa: {
    file: 'src/lib/calculations.js',
    lines: '380-440',
    description: 'IRMAA Medicare premium surcharge calculation',
    code: `
/**
 * Calculate IRMAA (Income-Related Monthly Adjustment Amount)
 * Uses MAGI from 2 years prior
 */
export function calculateIRMAA(magi, bracketInflation, yearsFromBase, isSingle, numPeople) {
  const brackets = isSingle ? IRMAA_BRACKETS_SINGLE_2024 : IRMAA_BRACKETS_MFJ_2024;

  // Inflate thresholds for future years
  const inflationFactor = Math.pow(1 + bracketInflation, yearsFromBase);

  // Find applicable bracket
  let partB = 174.70; // Base premium
  let partD = 0;

  for (const bracket of brackets) {
    const threshold = bracket.magi * inflationFactor;
    if (magi > threshold) {
      partB = bracket.partB;
      partD = bracket.partD;
    }
  }

  return {
    partB: partB * 12 * numPeople,
    partD: partD * 12 * numPeople,
    total: (partB + partD) * 12 * numPeople,
  };
}`,
    explanation: `
IRMAA calculation:
1. Uses MAGI from 2 YEARS AGO (e.g., 2024 MAGI affects 2026 premiums)
2. MFJ thresholds (2024): $206k, $258k, $322k, $386k, $750k
3. Base Part B: $174.70/month per person
4. Surcharge tiers add $70-$420/month per person
5. Part D (drug plan) also has IRMAA tiers
6. Big Roth conversion can trigger IRMAA 2 years later!
`,
  },

  niit: {
    file: 'src/lib/calculations.js',
    lines: '145-160',
    description: 'Net Investment Income Tax calculation',
    code: `
/**
 * Calculate NIIT (3.8% surtax on investment income)
 */
export function calculateNIIT(investmentIncome, magi, isSingle) {
  const threshold = isSingle ? NIIT_THRESHOLD_SINGLE : NIIT_THRESHOLD_MFJ;

  // No NIIT if MAGI below threshold
  if (magi <= threshold) return 0;

  // Tax is 3.8% of LESSER of:
  // - Investment income, OR
  // - Excess MAGI over threshold
  const excessMAGI = magi - threshold;
  const taxableAmount = Math.min(investmentIncome, excessMAGI);

  return Math.round(taxableAmount * NIIT_RATE);
}`,
    explanation: `
NIIT (Net Investment Income Tax):
1. 3.8% surtax on investment income
2. Only applies if MAGI exceeds threshold
3. MFJ threshold: $250,000
4. Single threshold: $200,000
5. Taxable = LESSER of: investment income OR excess over threshold
6. Includes: capital gains, dividends, interest, rental income
7. Does NOT include: wages, SS benefits, retirement distributions
`,
  },

  projections: {
    file: 'src/lib/projections.js',
    lines: '1-100',
    description: 'Year-by-year projection generation logic',
    code: `
/**
 * Generate year-by-year retirement projections
 *
 * For each year, calculates:
 * 1. Beginning balances (AT, IRA, Roth)
 * 2. Income (Social Security)
 * 3. Required expenses
 * 4. RMD requirement
 * 5. Roth conversions (user-specified)
 * 6. Withdrawals needed to cover expenses + taxes
 * 7. All taxes (federal, state, LTCG, NIIT, IRMAA)
 * 8. Investment returns
 * 9. Ending balances
 * 10. Heir value
 */
export function generateProjections(params) {
  const results = [];
  let at = params.afterTaxStart;
  let ira = params.iraStart;
  let roth = params.rothStart;
  let costBasis = params.afterTaxCostBasis;

  for (let year = params.startYear; year <= params.endYear; year++) {
    const age = year - params.birthYear;
    const yearsFromStart = year - params.startYear;

    // Calculate expenses with inflation
    const expenses = params.annualExpenses * Math.pow(1 + params.expenseInflation, yearsFromStart);

    // Calculate Social Security with COLA
    const ss = params.socialSecurityMonthly * 12 * Math.pow(1 + params.ssCOLA, yearsFromStart);

    // Calculate RMD
    const rmd = calculateRMD(ira, age);

    // Get Roth conversion for this year
    const rothConversion = params.rothConversions[year] || 0;

    // Calculate withdrawals needed
    const { atWithdrawal, iraWithdrawal, rothWithdrawal, taxes } =
      calculateWithdrawals(at, ira, roth, expenses, ss, rmd.required, rothConversion, ...);

    // Apply returns and update balances
    // ... continues with investment returns, ending balances, heir value
  }

  return results;
}`,
    explanation: `
Projection flow for each year:
1. Start with beginning-of-year balances
2. Calculate income (SS with COLA)
3. Calculate expenses (with inflation)
4. Determine RMD requirement based on age
5. Apply any Roth conversion specified
6. Calculate taxes on all income
7. Determine withdrawals needed (expenses + taxes - SS)
8. Withdraw in order: AT first, then IRA, then Roth
9. Apply investment returns to remaining balances
10. Calculate heir value at year-end
11. Move to next year with ending balances
`,
  },

  tax_tables: {
    file: 'src/lib/taxTables.js',
    lines: '1-150',
    description: 'Tax brackets, IRMAA tables, and RMD factors',
    code: `
// 2024 Federal Tax Brackets (MFJ)
export const FEDERAL_BRACKETS_MFJ_2024 = [
  { ceiling: 23200, rate: 0.10 },
  { ceiling: 94300, rate: 0.12 },
  { ceiling: 201050, rate: 0.22 },
  { ceiling: 383900, rate: 0.24 },
  { ceiling: 487450, rate: 0.32 },
  { ceiling: 731200, rate: 0.35 },
  { ceiling: Infinity, rate: 0.37 },
];

// 2024 LTCG Brackets (MFJ)
export const LTCG_BRACKETS_MFJ_2024 = [
  { ceiling: 94050, rate: 0.00 },   // 0% rate
  { ceiling: 583750, rate: 0.15 },  // 15% rate
  { ceiling: Infinity, rate: 0.20 }, // 20% rate
];

// RMD Factors (Uniform Lifetime Table)
export const RMD_TABLE = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
  78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5,
  // ... continues to age 120
};

// IRMAA Brackets (MFJ)
export const IRMAA_BRACKETS_MFJ_2024 = [
  { magi: 206000, partB: 244.60, partD: 12.90 },
  { magi: 258000, partB: 349.40, partD: 33.30 },
  { magi: 322000, partB: 454.20, partD: 53.80 },
  { magi: 386000, partB: 559.00, partD: 74.20 },
  { magi: 750000, partB: 594.00, partD: 81.00 },
];`,
    explanation: `
Key tax tables:
1. Federal brackets: Progressive rates 10% to 37%
2. LTCG brackets: 0%, 15%, 20% based on total income
3. RMD table: Life expectancy factors by age
4. IRMAA brackets: Medicare surcharges by MAGI
5. SS thresholds: $32k/$44k (MFJ) for taxation tiers
6. NIIT thresholds: $250k (MFJ), $200k (Single)
`,
  },

  all_taxes: {
    file: 'src/lib/calculations.js',
    lines: '450-530',
    description: 'Combined tax calculation for a single year',
    code: `
/**
 * Calculate all taxes for a year
 * Orchestrates individual tax calculations
 */
export function calculateAllTaxes({
  ssIncome, iraWithdrawal, rothConversion, otherOrdinaryIncome,
  capitalGains, isSingle, bracketInflation, yearsFromBase
}) {
  const brackets = getInflatedBrackets(isSingle, bracketInflation, yearsFromBase);

  // 1. Calculate taxable Social Security
  const ordinaryIncome = iraWithdrawal + rothConversion + otherOrdinaryIncome;
  const taxableSS = calculateTaxableSocialSecurity(ssIncome, ordinaryIncome, isSingle);

  // 2. Calculate taxable ordinary income (with standard deduction)
  const standardDeduction = isSingle ? 14600 : 29200;
  const taxableOrdinary = Math.max(0, ordinaryIncome + taxableSS - standardDeduction);

  // 3. Federal tax on ordinary income
  const federalTax = calculateFederalTax(taxableOrdinary, brackets.federal);

  // 4. LTCG tax (stacks on ordinary)
  const ltcgTax = calculateLTCGTax(capitalGains, taxableOrdinary, brackets.ltcg);

  // 5. NIIT
  const magi = ordinaryIncome + ssIncome + capitalGains;
  const niit = calculateNIIT(capitalGains, magi, isSingle);

  // 6. State tax
  const stateTax = calculateIllinoisTax(taxableOrdinary + capitalGains);

  return {
    taxableSS,
    taxableOrdinary,
    federalTax,
    ltcgTax,
    niit,
    stateTax,
    totalTax: federalTax + ltcgTax + niit + stateTax,
    effectiveRate: // ...
  };
}`,
    explanation: `
Tax calculation order:
1. Determine taxable SS (depends on other income)
2. Add all ordinary income: IRA + Roth conversion + other
3. Subtract standard deduction ($29,200 MFJ)
4. Calculate federal tax on ordinary income
5. Stack capital gains on top, calculate LTCG tax
6. Check if NIIT applies (MAGI > $250k)
7. Calculate state tax (IL flat 4.95%)
8. Sum all taxes for total
`,
  },

  risk_allocation: {
    file: 'src/lib/calculations.js',
    lines: '550-600',
    description: 'Risk allocation across account types',
    code: `
/**
 * Calculate optimal risk allocation across accounts
 * Considers tax-efficiency of placing assets
 */
export function calculateRiskAllocation(atBalance, iraBalance, rothBalance, targetStockPercent) {
  const total = atBalance + iraBalance + rothBalance;
  const targetStocks = total * targetStockPercent;
  const targetBonds = total - targetStocks;

  // Strategy: Put bonds in tax-deferred (IRA), stocks in taxable
  // Bonds generate ordinary income (taxed higher)
  // Stocks generate qualified dividends/LTCG (taxed lower)

  let iraBonds = Math.min(iraBalance, targetBonds);
  let iraStocks = iraBalance - iraBonds;

  let atStocks = Math.min(atBalance, targetStocks - iraStocks);
  let atBonds = atBalance - atStocks;

  let rothStocks = targetStocks - iraStocks - atStocks;
  let rothBonds = rothBalance - rothStocks;

  return {
    at: { stocks: atStocks, bonds: atBonds },
    ira: { stocks: iraStocks, bonds: iraBonds },
    roth: { stocks: rothStocks, bonds: rothBonds },
  };
}`,
    explanation: `
Risk allocation strategy:
1. Put BONDS in IRA (tax-deferred)
   - Bond interest is ordinary income
   - Better to defer high-tax income
2. Put STOCKS in taxable accounts
   - Qualified dividends taxed at 0-20%
   - Long-term gains taxed at 0-20%
   - Step-up basis at death
3. Roth can hold either
   - Growth is tax-free
   - Good for highest-growth assets
4. This minimizes lifetime taxes
`,
  },
};

/**
 * Get source code and explanation for a calculation
 */
export function getSourceCode(target) {
  const source = SOURCE_CODE[target];
  if (!source) {
    return {
      error: `Unknown target: ${target}. Available: ${Object.keys(SOURCE_CODE).join(', ')}`,
    };
  }
  return source;
}

/**
 * Search for patterns in codebase (simulated for security)
 */
export function grepCodebase(pattern, context = 'all') {
  // Return curated results for common patterns
  const results = [];

  const searchTargets =
    context === 'all'
      ? Object.keys(SOURCE_CODE)
      : Object.keys(SOURCE_CODE).filter(k => {
          if (context === 'taxes')
            return [
              'federal_tax',
              'ltcg_tax',
              'niit',
              'social_security_taxation',
              'irmaa',
            ].includes(k);
          if (context === 'calculations') return !['projections', 'tax_tables'].includes(k);
          return true;
        });

  for (const target of searchTargets) {
    const source = SOURCE_CODE[target];
    if (
      source.code.toLowerCase().includes(pattern.toLowerCase()) ||
      source.explanation.toLowerCase().includes(pattern.toLowerCase())
    ) {
      results.push({
        target,
        file: source.file,
        lines: source.lines,
        description: source.description,
      });
    }
  }

  return results.length > 0 ? results : { message: `No matches for "${pattern}" in ${context}` };
}
