# Implementation Plan: Property Taxes, Heir RMD Strategies, LTCG Dependency, and Inspector Improvements

## Overview

This plan addresses four interconnected improvements to the retirement planner:
1. Add property taxes input with configurable growth rate and state tax offset
2. Update heir analysis to model RMD-based distribution vs lump sum withdrawal
3. Fix LTCG tax display to show taxable income dependency clearly
4. Make more calculation inputs clickable in the Inspector

## Current State Analysis

### Key Discoveries:

1. **Property Taxes**: Not currently implemented. Expenses are modeled as a single annual amount with inflation (`src/lib/projections.js:260-264`). No mechanism to track property taxes or their impact on state tax deductions.

2. **Heir Analysis** (`src/components/HeirAnalysis/index.jsx`, `src/lib/calculations.js:484-600`):
   - Current strategies: `even` (divide equally over 10 years) and `year10` (lump sum in year 10)
   - Does NOT use actual IRS beneficiary RMD tables
   - Under SECURE Act 2.0: Non-eligible designated beneficiaries must empty inherited IRA within 10 years, and if the owner died after RMD age, annual RMDs are required

3. **LTCG Tax Calculation** (`src/components/CalculationInspector/index.jsx:422-439`):
   - Formula mentions "stacks on top of ordinary income" but the breakdown doesn't show which brackets the gains fall into
   - The dependency exists (`src/lib/calculationDependencies.js:120-123`) but the visualization is incomplete

4. **Inspector Clickability** (`src/components/CalculationInspector/index.jsx:125`):
   - Variables are clickable only if: `dependency || CALCULATIONS[varKey]`
   - Missing from CELL_DEPENDENCIES: `ssAnnual`, `expenses`, `standardDeduction`, and several others
   - Missing from CALCULATIONS: Several computed values that appear in formulas

5. **Medicare Part B Premium** (`src/lib/taxTables.js:57-64`):
   - Base Part B premium ($174.70/mo) IS included in the first IRMAA bracket
   - But the UI/Inspector labels everything as "surcharge" which is misleading
   - The irmaaTotal calculation returns the TOTAL premium (base + surcharge), not just surcharge

## Desired End State

### After implementation:

1. **Property Taxes**: Users can input annual property taxes with a growth rate. Property taxes reduce effective state tax burden (via SALT deduction) up to the **$40K limit (2025)** with income-based phaseout above $500K MAGI.

2. **Heir RMD Strategies**: Two strategies with automatic RMD determination:
   - `rmd_based`: Automatic RMD calculation based on model inputs:
     - Uses owner death year (existing `survivorDeathYear` or new input) to determine if owner died before/after RBD (age 73)
     - If owner died after RBD → annual RMDs required based on heir's age (from heir birth year input)
     - If owner died before RBD → no annual RMDs, can defer to year 10
     - Uses heir birth year inputs to calculate heir age at inheritance dynamically
   - `lump_sum_year0`: Immediate lump sum distribution at inheritance (year 0)

3. **LTCG Tax**: The calculation inspector clearly shows how capital gains "stack" on ordinary income, displaying which bracket each portion falls into.

4. **Inspector Clickability**: All variables shown in formulas are clickable, with proper dependency tracking.

5. **IRMAA Display**: Clearly separates base Medicare Part B premium from IRMAA surcharges.

## What We're NOT Doing

- Not adding SALT itemization logic (just property tax offset)
- Not modeling state-specific property tax exemptions (homestead, senior, etc.)
- Not adding the "stretch IRA" rules for eligible designated beneficiaries (EDBs like spouses, disabled individuals)

---

## Phase 1: Property Taxes Input Section

### Overview
Add property taxes as a separate input category that affects annual expenses and provides state tax offset.

### Changes Required:

#### 1. Tax Tables - Add Default Property Tax Parameters
**File**: `src/lib/taxTables.js`
**Changes**: Add default parameters for property taxes

```javascript
// After line 254 in DEFAULT_PARAMS
// Property Taxes
propertyTaxAnnual: 0,         // Starting annual property tax
propertyTaxGrowth: 0.02,      // Annual property tax growth rate (typically 2-3%)

// SALT Cap Schedule (One Big Beautiful Bill Act)
// $40K for 2025-2028, reverts to $10K in 2029+
// Income-based phaseout: $500K-$600K MAGI reduces cap to floor
```

#### 2. Projections Engine - Calculate Property Tax Impact
**File**: `src/lib/projections.js`
**Changes**: Add property tax to expenses and calculate SALT benefit

After line 263 (expense calculation), add:
```javascript
// Property tax calculation
const propertyTax = p.propertyTaxAnnual * Math.pow(1 + p.propertyTaxGrowth, yearsFromStart);

// Calculate SALT cap based on year and income
// Schedule: $40K for 2025-2028, $10K for 2029+
// Income phaseout: $500K-$600K MAGI reduces cap to floor
const calculateSaltCap = (year, magi) => {
  // Base cap depends on year
  const baseCap = (year >= 2025 && year <= 2028) ? 40000 : 10000;
  const floor = 10000;

  // No phaseout if already at floor
  if (baseCap === floor) return floor;

  // Income-based phaseout for high earners (2025-2028)
  const phaseoutStart = 500000;
  const phaseoutEnd = 600000;

  if (magi <= phaseoutStart) return baseCap;
  if (magi >= phaseoutEnd) return floor;

  // Reduce cap by 30% of excess over $500K
  const excess = magi - phaseoutStart;
  const reduction = excess * 0.30;
  return Math.max(floor, baseCap - reduction);
};

// Use current year MAGI for SALT cap calculation
const currentMAGI = withdrawal.ordinaryIncome + withdrawal.capitalGains;
const effectiveSaltCap = calculateSaltCap(year, currentMAGI);

// State tax offset from property taxes (limited by SALT cap)
const saltDeduction = Math.min(propertyTax, effectiveSaltCap);

// Property tax increases expenses but provides state tax benefit
const effectivePropertyTax = propertyTax - (saltDeduction * p.stateTaxRate);
expenses += effectivePropertyTax;
```

#### 3. Input Panel - Add Property Taxes Section
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Add new collapsible section after "Tax Parameters"

```jsx
{/* Property Taxes */}
<InputSection
  title="Property Taxes"
  icon={Home}
  expanded={expanded.includes('propertyTax')}
  onToggle={() => toggle('propertyTax')}
  color="orange"
>
  <ParamInput
    label="Annual (2025)"
    value={params.propertyTaxAnnual}
    onChange={v => updateParam('propertyTaxAnnual', v)}
    helpText="Current annual property tax"
  />
  <ParamInput
    label="Growth Rate"
    value={params.propertyTaxGrowth}
    onChange={v => updateParam('propertyTaxGrowth', v)}
    format="%"
    helpText="Typical: 2-3%"
  />
  <div className="mt-2 p-2 bg-slate-800/50 rounded text-[10px] text-slate-400">
    <div className="font-medium text-slate-300 mb-1">SALT Deduction Schedule</div>
    <div>• 2025-2028: $40K cap (phases out $500K-$600K MAGI)</div>
    <div>• 2029+: $10K cap (reverts to prior law)</div>
  </div>
</InputSection>
```

#### 4. Calculation Inspector - Add Property Tax Calculation
**File**: `src/components/CalculationInspector/index.jsx`
**Changes**: Add propertyTax to CALCULATIONS object

```javascript
propertyTax: {
  name: 'Property Tax',
  concept: 'Annual property tax expense, growing at a configured rate. Property taxes provide a state tax deduction via SALT. Cap is $40K (2025-2028) or $10K (2029+), with income phaseout for high earners.',
  formula: 'propertyTax = Base × (1 + Growth)^years\n\nSALT Cap:\n  • 2025-2028: $40K (phases out $500K-$600K MAGI)\n  • 2029+: $10K\n\nState Tax Offset = min(propertyTax, SALT cap) × State Rate',
  backOfEnvelope: 'Property tax × (1 - state rate) = effective cost',
  compute: (data, params) => {
    const propertyTax = data.propertyTax || 0;
    const saltCap = data.effectiveSaltCap || 40000;
    const saltDeduction = Math.min(propertyTax, saltCap);
    const saltBenefit = saltDeduction * (params?.stateTaxRate || 0.0495);
    const effectiveCost = propertyTax - saltBenefit;
    const magi = data.ordinaryIncome + data.capitalGains;
    const capType = data.year <= 2028 ? '$40K (2025-2028)' : '$10K (2029+)';

    return {
      formula: `Base: ${fmt$(params?.propertyTaxAnnual || 0)}, Growth: ${fmtPct(params?.propertyTaxGrowth || 0.02)}`,
      values: `Year ${data.year}: ${capType}\nMAGI: ${fK(magi)} → Effective SALT Cap: ${fK(saltCap)}\nSALT Deduction: ${fK(saltDeduction)}\nState Tax Benefit: ${fK(saltBenefit)}`,
      result: `Effective Cost: ${fmt$(effectiveCost)}`,
      simple: fmt$(effectiveCost),
    };
  },
},
```

#### 5. Update Projections Output
**File**: `src/lib/projections.js`
**Changes**: Include property tax in projection output

Add to results.push() around line 425:
```javascript
propertyTax: Math.round(propertyTax),
effectiveSaltCap: Math.round(effectiveSaltCap),
saltDeduction: Math.round(saltDeduction),
effectivePropertyTax: Math.round(effectivePropertyTax),
```

### Success Criteria:

#### Automated Verification:
- [x] App builds without errors: `npm run build`
- [x] All existing tests pass: `npm run test`
- [x] Linting passes: `npm run lint`

**Implementation Note**: Phase 1 implemented with simplified SALT cap (configurable $10K MFJ/single) instead of the complex $40K/$10K phaseout schedule. Added `propertyTax`, `deductiblePropertyTax`, `saltCap` fields to projections and inspector.

#### New Unit Tests (`src/lib/__tests__/propertyTax.test.js`):
```javascript
describe('Property Tax SALT Calculation', () => {
  test('2025-2028: $40K cap applies for low income', () => {
    expect(calculateSaltCap(2026, 200000)).toBe(40000);
  });

  test('2025-2028: cap phases out at $550K MAGI', () => {
    // $50K over $500K threshold → 30% × $50K = $15K reduction
    expect(calculateSaltCap(2027, 550000)).toBe(25000);
  });

  test('2025-2028: cap floors at $10K for high income', () => {
    expect(calculateSaltCap(2028, 700000)).toBe(10000);
  });

  test('2029+: $10K cap regardless of income', () => {
    expect(calculateSaltCap(2029, 200000)).toBe(10000);
    expect(calculateSaltCap(2030, 200000)).toBe(10000);
  });

  test('effective property tax accounts for state tax benefit', () => {
    const propertyTax = 15000;
    const saltCap = 40000;
    const stateRate = 0.0495;
    const saltDeduction = Math.min(propertyTax, saltCap);
    const effectiveCost = propertyTax - (saltDeduction * stateRate);
    expect(effectiveCost).toBeCloseTo(14257.5);
  });
});
```

#### New E2E Tests (`e2e/property-tax.spec.js`):
```javascript
test('property tax input updates projections', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Property Taxes');
  await page.fill('[data-testid="property-tax-annual"]', '15000');
  await page.fill('[data-testid="property-tax-growth"]', '3');
  // Verify projection table updates
  await expect(page.locator('[data-testid="property-tax-2026"]')).toContainText('$15,450');
});

test('SALT cap changes in 2029', async ({ page }) => {
  // Navigate to 2029 in projections
  // Verify SALT cap shows $10K instead of $40K
});
```

---

## Phase 2: Heir Analysis RMD Strategy

### Overview
Implement proper inherited IRA distribution strategies based on SECURE Act 2.0 rules. The RMD requirement is **automatically determined** based on when the original account owner(s) die - this is derived from existing model inputs (death year, birth year).

### Background: SECURE Act 2.0 Inherited IRA Rules

| Owner Death Age | Annual RMDs Required? | 10-Year Rule |
|-----------------|----------------------|--------------|
| **Under 73** (before RBD) | NO - can defer | Must empty by year 10 |
| **73+** (after RBD) | YES - based on heir's SLE | Must empty by year 10 |
| **Roth IRA** | NO - always "before RBD" | Must empty by year 10 |

### Key Design Decisions

1. **Owner death determines RMD requirement automatically**:
   - Use existing `survivorDeathYear` and `birthYear` to calculate owner's death age
   - If both owners die after 73 → annual RMDs required
   - If any owner dies before 73 → no annual RMDs for their portion

2. **Heir birth years as inputs** (not fixed ages):
   - Add `birthYear` field to heir configuration
   - Calculate heir age at inheritance dynamically: `deathYear - heirBirthYear`

3. **Two strategies**:
   - `rmd_based`: Automatic RMD calculation based on model inputs
   - `lump_sum_year0`: Immediate distribution at inheritance

### Changes Required:

#### 1. Tax Tables - Add Beneficiary Single Life Expectancy Table
**File**: `src/lib/taxTables.js`
**Changes**: Add IRS Single Life Expectancy Table for beneficiaries

```javascript
// =============================================================================
// BENEFICIARY SINGLE LIFE EXPECTANCY TABLE (IRS Publication 590-B)
// Used for inherited IRA RMDs when owner died AFTER RBD (age 73+).
// Key: Age of beneficiary, Value: Life expectancy divisor
// Each subsequent year, subtract 1 from the initial factor.
// =============================================================================
export const BENEFICIARY_SLE_TABLE = {
  20: 63.0, 21: 62.1, 22: 61.1, 23: 60.1, 24: 59.2,
  25: 58.2, 26: 57.2, 27: 56.3, 28: 55.3, 29: 54.3,
  30: 53.3, 31: 52.4, 32: 51.4, 33: 50.4, 34: 49.4,
  35: 48.5, 36: 47.5, 37: 46.5, 38: 45.6, 39: 44.6,
  40: 43.6, 41: 42.7, 42: 41.7, 43: 40.7, 44: 39.8,
  45: 38.8, 46: 37.9, 47: 36.9, 48: 35.9, 49: 35.0,
  50: 34.0, 51: 33.1, 52: 32.1, 53: 31.2, 54: 30.2,
  55: 29.3, 56: 28.3, 57: 27.4, 58: 26.5, 59: 25.5,
  60: 24.6, 61: 23.7, 62: 22.8, 63: 21.8, 64: 20.9,
  65: 20.0, 66: 19.1, 67: 18.2, 68: 17.4, 69: 16.5,
  70: 15.6, 71: 14.8, 72: 13.9, 73: 13.1, 74: 12.3,
  75: 11.5, 76: 10.7, 77: 9.9, 78: 9.2, 79: 8.4,
  80: 7.7, 81: 7.0, 82: 6.3, 83: 5.7, 84: 5.1,
  85: 4.5, 86: 4.0, 87: 3.5, 88: 3.0, 89: 2.6,
  90: 2.2,
};

export function getBeneficiarySLEFactor(age) {
  if (age < 20) return BENEFICIARY_SLE_TABLE[20];
  if (age > 90) return BENEFICIARY_SLE_TABLE[90];
  return BENEFICIARY_SLE_TABLE[age] || BENEFICIARY_SLE_TABLE[90];
}

// Determine if owner died after RBD (Required Beginning Date = age 73)
export function ownerDiedAfterRBD(ownerDeathYear, ownerBirthYear) {
  const deathAge = ownerDeathYear - ownerBirthYear;
  return deathAge >= 73;
}
```

#### 2. Update Default Params
**File**: `src/lib/taxTables.js`
**Changes**: Update heir distribution strategy and add owner death year

```javascript
// In DEFAULT_PARAMS, update heir configuration:
heirDistributionStrategy: 'rmd_based', // 'rmd_based' or 'lump_sum_year0'

// Owner death year for heir analysis (uses end year if not set)
// This determines when inheritance occurs and whether RMDs are required
ownerDeathYear: null, // null = use endYear from projections
```

#### 3. Calculations - Implement RMD-Based Distribution
**File**: `src/lib/calculations.js`
**Changes**: Update `calculateHeirValueWithStrategy` function

The strategy is now `rmd_based` (automatic) or `lump_sum_year0`. RMD requirements are determined from owner death age.

```javascript
/**
 * Calculate heir value with distribution strategy
 *
 * @param {number} atBalance - After-tax account balance
 * @param {number} iraBalance - Traditional IRA balance
 * @param {number} rothBalance - Roth IRA balance
 * @param {object} heir - Heir configuration with birthYear, splitPercent, state, agi, taxableRoR
 * @param {string} strategy - 'rmd_based' or 'lump_sum_year0'
 * @param {number} ownerDeathYear - Year owner dies (determines inheritance timing)
 * @param {number} ownerBirthYear - Owner's birth year (to calculate death age)
 * @param {number} discountRate - Discount rate for PV calculation
 * @param {number} normalizationYears - Years to project forward
 */
export function calculateHeirValueWithStrategy(
  atBalance,
  iraBalance,
  rothBalance,
  heir,
  strategy = 'rmd_based',
  ownerDeathYear,
  ownerBirthYear,
  discountRate = 0.03,
  normalizationYears = 10
) {
  const rates = calculateHeirTaxRates(heir);
  const splitFraction = (heir.splitPercent || 100) / 100;
  const taxableRoR = heir.taxableRoR || 0.06;
  const iraGrowthRate = 0.06;

  // Calculate heir age at inheritance from birth year
  const heirBirthYear = heir.birthYear || (ownerDeathYear - 45); // Default to 45 years younger
  const heirAgeAtInheritance = ownerDeathYear - heirBirthYear;

  // Determine if owner died after RBD (age 73+)
  const ownerDeathAge = ownerDeathYear - ownerBirthYear;
  const ownerDiedAfterRBD = ownerDeathAge >= 73;

  const heirAt = atBalance * splitFraction;
  const heirIra = iraBalance * splitFraction;
  const heirRoth = rothBalance * splitFraction;

  // After-Tax: Step-up in basis, 100% value received immediately
  const atFV = heirAt * Math.pow(1 + taxableRoR, normalizationYears);
  const atNormalized = atFV / Math.pow(1 + discountRate, normalizationYears);

  // Roth: Tax-free, no RMDs required (owner always deemed "before RBD")
  // Optimal: defer until year 10 for maximum tax-free growth
  const rothFV = heirRoth * Math.pow(1 + iraGrowthRate, 10);
  const rothAfterDist = rothFV * Math.pow(1 + taxableRoR, Math.max(0, normalizationYears - 10));
  const rothNormalized = rothAfterDist / Math.pow(1 + discountRate, normalizationYears);

  let iraNormalized;
  let iraDetails;

  if (strategy === 'lump_sum_year0') {
    // ═══════════════════════════════════════════════════════════════════════
    // LUMP SUM YEAR 0: Immediate full distribution
    // ═══════════════════════════════════════════════════════════════════════
    const afterTax = heirIra * (1 - rates.combined);
    const iraFV = afterTax * Math.pow(1 + taxableRoR, normalizationYears);
    iraNormalized = iraFV / Math.pow(1 + discountRate, normalizationYears);
    iraDetails = {
      strategy: 'lump_sum_year0',
      description: 'Immediate full distribution at inheritance',
      grossAmount: Math.round(heirIra),
      taxRate: rates.combined,
      afterTax: Math.round(afterTax),
      normalized: Math.round(iraNormalized),
    };

  } else if (!ownerDiedAfterRBD) {
    // ═══════════════════════════════════════════════════════════════════════
    // RMD_BASED + OWNER DIED BEFORE RBD: No annual RMDs required
    // Optimal: Defer to year 10 for maximum tax-deferred growth
    // ═══════════════════════════════════════════════════════════════════════
    const iraFV = heirIra * Math.pow(1 + iraGrowthRate, 10);
    const afterTax = iraFV * (1 - rates.combined);
    const finalFV = afterTax * Math.pow(1 + taxableRoR, Math.max(0, normalizationYears - 10));
    iraNormalized = finalFV / Math.pow(1 + discountRate, normalizationYears);
    iraDetails = {
      strategy: 'rmd_based',
      rmdRequired: false,
      description: `Owner died at ${ownerDeathAge} (before RBD) - no annual RMDs, defer to year 10`,
      ownerDeathAge,
      heirAgeAtInheritance,
      grossAmount: Math.round(heirIra),
      futureValue: Math.round(iraFV),
      taxRate: rates.combined,
      afterTax: Math.round(afterTax),
      normalized: Math.round(iraNormalized),
      distributions: [{ year: 10, distribution: Math.round(iraFV), tax: Math.round(iraFV * rates.combined) }],
    };

  } else {
    // ═══════════════════════════════════════════════════════════════════════
    // RMD_BASED + OWNER DIED AFTER RBD: Annual RMDs REQUIRED
    // Based on heir's age using Single Life Expectancy table
    // ═══════════════════════════════════════════════════════════════════════
    let totalNormalized = 0;
    let remaining = heirIra;
    const distributions = [];

    const initialSLEFactor = getBeneficiarySLEFactor(heirAgeAtInheritance);

    for (let year = 1; year <= 10 && remaining > 0; year++) {
      remaining = remaining * (1 + iraGrowthRate);

      // SLE factor decreases by 1 each year
      const sleFactor = Math.max(1, initialSLEFactor - (year - 1));
      const rmdAmount = remaining / sleFactor;

      // Year 10: must distribute entire remaining balance
      const distribution = year === 10 ? remaining : rmdAmount;
      remaining = Math.max(0, remaining - distribution);

      const tax = distribution * rates.combined;
      const afterTax = distribution - tax;

      const yearsToGrow = normalizationYears - year;
      const fv = afterTax * Math.pow(1 + taxableRoR, Math.max(0, yearsToGrow));
      const normalized = fv / Math.pow(1 + discountRate, normalizationYears);

      totalNormalized += normalized;
      distributions.push({
        year,
        heirAge: heirAgeAtInheritance + year - 1,
        sleFactor: sleFactor.toFixed(1),
        distribution: Math.round(distribution),
        tax: Math.round(tax),
        afterTax: Math.round(afterTax),
        normalized: Math.round(normalized),
      });
    }

    iraNormalized = totalNormalized;
    iraDetails = {
      strategy: 'rmd_based',
      rmdRequired: true,
      description: `Owner died at ${ownerDeathAge} (after RBD) - annual RMDs required`,
      ownerDeathAge,
      heirAgeAtInheritance,
      initialSLEFactor: initialSLEFactor.toFixed(1),
      distributions,
      taxRate: rates.combined,
      normalized: Math.round(totalNormalized),
    };
  }

  return {
    name: heir.name,
    split: splitFraction,
    rates,
    taxableRoR,
    heirBirthYear,
    heirAgeAtInheritance,
    ownerDeathAge,
    ownerDiedAfterRBD,
    atValue: Math.round(heirAt),
    rothGross: Math.round(heirRoth),
    iraGross: Math.round(heirIra),
    grossInheritance: Math.round(heirAt + heirIra + heirRoth),
    atNormalized: Math.round(atNormalized),
    rothNormalized: Math.round(rothNormalized),
    iraNormalized: Math.round(iraNormalized),
    netNormalized: Math.round(atNormalized + rothNormalized + iraNormalized),
    iraDetails,
    normalizationYears,
  };
}
```

#### 4. Input Panel - Update Heir Configuration
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Add birth year field to heir inputs (instead of age) and simplify to 2 strategies

```jsx
// Add after the AGI input field in the heir card (around line 920)
<div>
  <label className="block text-slate-500 text-[10px] mb-0.5">Birth Year</label>
  <input
    type="number"
    value={heir.birthYear || 1980}
    onChange={e => updateHeir(index, { birthYear: parseInt(e.target.value) || 1980 })}
    className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
    placeholder="e.g., 1980"
  />
  <div className="text-slate-500 text-[9px] mt-0.5">
    Age at inheritance calculated automatically
  </div>
</div>

// Update Distribution Strategy section (around line 979)
<div className="mt-2 pt-2 border-t border-slate-700">
  <label className="block text-slate-400 text-xs mb-1">IRA Distribution Strategy</label>
  <div className="text-slate-500 text-[10px] mb-2">
    RMD requirements auto-determined from owner death age (SECURE Act 2.0)
  </div>
  <div className="space-y-1">
    {/* RMD-Based (automatic determination) */}
    <button
      onClick={() => updateParam('heirDistributionStrategy', 'rmd_based')}
      className={`w-full px-2 py-1.5 rounded text-left text-[10px] ${
        (params.heirDistributionStrategy || 'rmd_based') === 'rmd_based'
          ? 'bg-blue-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      <div className="font-medium">RMD-Based Distribution</div>
      <div className="opacity-70">
        Auto-determines RMD requirement from owner death age:<br/>
        • Owner dies ≥73: Annual RMDs required (heir's SLE table)<br/>
        • Owner dies &lt;73: No RMDs, defer to year 10
      </div>
    </button>

    {/* Lump sum year 0 */}
    <button
      onClick={() => updateParam('heirDistributionStrategy', 'lump_sum_year0')}
      className={`w-full px-2 py-1.5 rounded text-left text-[10px] ${
        params.heirDistributionStrategy === 'lump_sum_year0'
          ? 'bg-amber-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      <div className="font-medium">Lump Sum Year 0</div>
      <div className="opacity-70">Immediate full distribution at inheritance</div>
    </button>
  </div>
</div>
```

#### 5. Heir Analysis - Update Strategy Comparison UI
**File**: `src/components/HeirAnalysis/index.jsx`
**Changes**: Update strategy labels and add RMD schedule display

Update the strategy comparison card (around line 137-189) to use new strategy names and show RMD schedule when applicable.

### Success Criteria:

#### Automated Verification:
- [x] App builds without errors: `npm run build`
- [x] All tests pass: `npm run test`
- [x] Linting passes: `npm run lint`

**Implementation Note**: Phase 2 fully implemented with RMD-based and lump_sum_year0 strategies, heir birth year input, beneficiary SLE table, and automatic RMD determination from owner death age.

#### New Unit Tests (`src/lib/__tests__/heirRmd.test.js`):
```javascript
import { calculateHeirValueWithStrategy, getBeneficiarySLEFactor } from '../calculations';

describe('Beneficiary SLE Table', () => {
  test('returns correct SLE factor for age 50', () => {
    expect(getBeneficiarySLEFactor(50)).toBe(34.0);
  });

  test('clamps to age 20 for younger beneficiaries', () => {
    expect(getBeneficiarySLEFactor(15)).toBe(63.0);
  });

  test('clamps to age 90 for older beneficiaries', () => {
    expect(getBeneficiarySLEFactor(95)).toBe(2.2);
  });
});

describe('Heir RMD Strategy Calculation', () => {
  const baseHeir = { name: 'Test Heir', birthYear: 1980, splitPercent: 100, state: 'CA', agi: 100000 };

  test('owner died after RBD (age 75) requires annual RMDs', () => {
    const result = calculateHeirValueWithStrategy(
      0, 500000, 0, baseHeir, 'rmd_based',
      2040, 1965, // ownerDeathYear=2040, ownerBirthYear=1965 → deathAge=75
      0.03, 10
    );
    expect(result.ownerDiedAfterRBD).toBe(true);
    expect(result.iraDetails.rmdRequired).toBe(true);
    expect(result.iraDetails.distributions.length).toBeGreaterThan(1);
  });

  test('owner died before RBD (age 70) no annual RMDs', () => {
    const result = calculateHeirValueWithStrategy(
      0, 500000, 0, baseHeir, 'rmd_based',
      2035, 1965, // ownerDeathYear=2035, ownerBirthYear=1965 → deathAge=70
      0.03, 10
    );
    expect(result.ownerDiedAfterRBD).toBe(false);
    expect(result.iraDetails.rmdRequired).toBe(false);
    expect(result.iraDetails.distributions.length).toBe(1); // Single year-10 distribution
  });

  test('lump_sum_year0 distributes everything immediately', () => {
    const result = calculateHeirValueWithStrategy(
      0, 500000, 0, baseHeir, 'lump_sum_year0',
      2040, 1965, 0.03, 10
    );
    expect(result.iraDetails.strategy).toBe('lump_sum_year0');
    expect(result.iraDetails.grossAmount).toBe(500000);
  });

  test('heir birth year calculates age at inheritance correctly', () => {
    const result = calculateHeirValueWithStrategy(
      0, 500000, 0, { ...baseHeir, birthYear: 1990 }, 'rmd_based',
      2040, 1965, 0.03, 10
    );
    expect(result.heirAgeAtInheritance).toBe(50); // 2040 - 1990
  });
});
```

#### New E2E Tests (`e2e/heir-rmd.spec.js`):
```javascript
import { test, expect } from '@playwright/test';

test.describe('Heir RMD Strategy', () => {
  test('heir birth year input updates age calculation', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Heirs');
    await page.fill('[data-testid="heir-birth-year-0"]', '1985');
    // Verify age at inheritance is calculated and displayed
    await expect(page.locator('[data-testid="heir-age-at-inheritance-0"]')).toContainText(/\d+/);
  });

  test('RMD-based strategy shows RMD requirement auto-determination', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="heir-strategy-rmd-based"]');
    await expect(page.locator('[data-testid="rmd-requirement-info"]')).toBeVisible();
  });

  test('strategy toggle updates heir analysis results', async ({ page }) => {
    await page.goto('/');
    // Set up test data
    await page.click('[data-testid="heir-strategy-lump-sum"]');
    const lumpSumValue = await page.locator('[data-testid="heir-normalized-value"]').textContent();

    await page.click('[data-testid="heir-strategy-rmd-based"]');
    const rmdValue = await page.locator('[data-testid="heir-normalized-value"]').textContent();

    // Values should differ between strategies
    expect(lumpSumValue).not.toBe(rmdValue);
  });
});
```

---

## Phase 3: LTCG Tax Taxable Income Dependency Display

### Overview
Improve the LTCG tax calculation display to clearly show how capital gains stack on top of ordinary income and which brackets apply.

### Changes Required:

#### 1. Update LTCG Tax Calculation Display
**File**: `src/components/CalculationInspector/index.jsx`
**Changes**: Enhance the ltcgTax CALCULATIONS entry

```javascript
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
  compute: (data, params) => {
    const { capitalGains, ltcgTax, taxableOrdinary } = data;

    // Calculate bracket breakdown
    const bracket0Max = 94050;
    const bracket15Max = 583750;

    // How much room in each bracket after ordinary income
    const roomIn0 = Math.max(0, bracket0Max - taxableOrdinary);
    const roomIn15 = taxableOrdinary < bracket15Max
      ? bracket15Max - Math.max(taxableOrdinary, bracket0Max)
      : 0;

    // How gains fill each bracket
    const gainsIn0 = Math.min(capitalGains, roomIn0);
    const gainsIn15 = Math.min(Math.max(0, capitalGains - gainsIn0), roomIn15);
    const gainsIn20 = Math.max(0, capitalGains - gainsIn0 - gainsIn15);

    // Calculate tax from each bracket
    const taxFrom0 = gainsIn0 * 0.0;
    const taxFrom15 = gainsIn15 * 0.15;
    const taxFrom20 = gainsIn20 * 0.20;

    let bracketBreakdown = '';
    if (gainsIn0 > 0) bracketBreakdown += `  0% bracket: ${fK(gainsIn0)} × 0% = $0\n`;
    if (gainsIn15 > 0) bracketBreakdown += `  15% bracket: ${fK(gainsIn15)} × 15% = ${fK(taxFrom15)}\n`;
    if (gainsIn20 > 0) bracketBreakdown += `  20% bracket: ${fK(gainsIn20)} × 20% = ${fK(taxFrom20)}`;

    const effectiveRate = capitalGains > 0 ? ((ltcgTax / capitalGains) * 100).toFixed(1) : 0;

    return {
      formula: `Ordinary income (${fK(taxableOrdinary)}) fills brackets first\nCapital gains (${fK(capitalGains)}) stack on top:`,
      values: bracketBreakdown || 'No capital gains',
      result: `LTCG Tax = ${fK(ltcgTax)} (${effectiveRate}% effective)`,
      simple: capitalGains > 0
        ? `${fK(capitalGains)} × ${effectiveRate}% = ${fK(ltcgTax)}`
        : '$0 (no gains)',
    };
  },
},
```

#### 2. Add taxableOrdinary to Formula Colors
**File**: `src/lib/colors.js`
**Changes**: Ensure taxableOrdinary is in FORMULA_COLORS (already exists at line 101)

Already present - no changes needed.

#### 3. Add LTCG Dependencies
**File**: `src/lib/calculationDependencies.js`
**Changes**: Ensure ltcgTax has complete dependencies (already at lines 120-123)

Already present - no changes needed.

### Success Criteria:

#### Automated Verification:
- [x] App builds without errors: `npm run build`
- [x] All tests pass: `npm run test`
- [x] Linting passes: `npm run lint`

**Implementation Note**: Phase 3 LTCG bracket stacking display already implemented in CalculationInspector with full breakdown of gains in 0%, 15%, 20% brackets.

#### New Unit Tests (`src/lib/__tests__/ltcgBrackets.test.js`):
```javascript
describe('LTCG Bracket Stacking', () => {
  test('gains in 0% bracket when ordinary income under $94K', () => {
    const taxableOrdinary = 50000;
    const capitalGains = 30000;
    const roomIn0 = Math.max(0, 94050 - taxableOrdinary); // 44050
    const gainsIn0 = Math.min(capitalGains, roomIn0);
    expect(gainsIn0).toBe(30000); // All gains in 0% bracket
  });

  test('gains split across brackets when stacking pushes into 15%', () => {
    const taxableOrdinary = 80000;
    const capitalGains = 50000;
    const bracket0Max = 94050;
    const roomIn0 = Math.max(0, bracket0Max - taxableOrdinary); // 14050
    const gainsIn0 = Math.min(capitalGains, roomIn0);
    const gainsIn15 = capitalGains - gainsIn0;

    expect(gainsIn0).toBe(14050);
    expect(gainsIn15).toBe(35950);
  });

  test('effective rate calculation accurate', () => {
    const gainsIn0 = 14050;
    const gainsIn15 = 35950;
    const totalGains = gainsIn0 + gainsIn15;
    const tax = gainsIn0 * 0 + gainsIn15 * 0.15;
    const effectiveRate = (tax / totalGains) * 100;

    expect(effectiveRate).toBeCloseTo(10.78, 1);
  });
});
```

#### New E2E Tests (`e2e/ltcg-inspector.spec.js`):
```javascript
import { test, expect } from '@playwright/test';

test.describe('LTCG Tax Inspector', () => {
  test('shows bracket stacking breakdown', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="ltcg-tax-cell"]');
    // Verify bracket breakdown is visible
    await expect(page.locator('text=/0% bracket/')).toBeVisible();
    await expect(page.locator('text=/15% bracket/')).toBeVisible();
  });

  test('taxableOrdinary is clickable in LTCG formula', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="ltcg-tax-cell"]');
    // Click on taxableOrdinary in formula
    await page.click('[data-testid="formula-var-taxableOrdinary"]');
    // Should navigate to taxableOrdinary calculation
    await expect(page.locator('[data-testid="calculation-header"]')).toContainText('Taxable Ordinary');
  });
});
```

---

## Phase 4: Inspector Clickability Audit and Fix

### Overview
Audit all variables that appear in FORMULA_COLORS and ensure they have corresponding entries in CELL_DEPENDENCIES and/or CALCULATIONS for full clickability.

### Changes Required:

#### 1. Audit Missing Dependencies
**File**: `src/lib/calculationDependencies.js`
**Changes**: Add missing dependencies

```javascript
// Add these missing dependencies:

// ssAnnual is an input (comes from params), so it depends on nothing but should be navigable
ssAnnual: () => [], // Input value - no dependencies

// expenses depends on base expenses and inflation
expenses: (year, data, allData) => {
  // Expenses come from params or override, but for navigation purposes:
  return []; // Input value - no dependencies
},

// standardDeduction depends on filing status and inflation
standardDeduction: (year) => [
  // Derived from params, no direct dependencies in projection data
],

// irmaaMAGI depends on prior year income components
irmaaMAGI: (year) => [
  { year, field: 'ordinaryIncome' },
  { year, field: 'capitalGains' },
  { year, field: 'rothConversion' },
],

// effectiveAtReturn, effectiveIraReturn, effectiveRothReturn depend on risk allocation
effectiveAtReturn: () => [], // Calculated from params, no data dependencies
effectiveIraReturn: () => [],
effectiveRothReturn: () => [],
```

#### 2. Add Missing CALCULATIONS Entries
**File**: `src/components/CalculationInspector/index.jsx`
**Changes**: Add missing calculation entries

These fields appear in formulas but don't have full CALCULATIONS entries:
- `age` - simple display
- `year` - simple display
- Several return fields already have entries

Add near line 1150:

```javascript
age: {
  name: 'Age',
  concept: 'Your age in this projection year, calculated from birth year.',
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
  concept: 'The calendar year for this row of projections.',
  formula: 'Sequential year from start to end of projection period',
  backOfEnvelope: 'Each row is one year',
  compute: (data) => {
    return {
      formula: `Projection year ${data.yearsFromStart + 1} of the model`,
      values: `Started in ${data.year - data.yearsFromStart}`,
      result: `Year ${data.year}`,
      simple: `${data.year}`,
    };
  },
},
```

#### 3. Ensure All FORMULA_COLORS Have Dependencies or CALCULATIONS
**File**: Review both files

Cross-reference checklist:
- [x] iraBOY - has both
- [x] rothBOY - has both
- [x] atBOY - has both
- [x] totalBOY - has both
- [x] iraEOY - has both
- [x] rothEOY - has both
- [x] atEOY - has both
- [x] totalEOY - has both
- [x] atWithdrawal - has both
- [x] iraWithdrawal - has both
- [x] rothWithdrawal - has both
- [x] totalWithdrawal - has both
- [x] rothConversion - has both
- [x] federalTax - has both
- [x] ltcgTax - has both
- [x] niit - has both
- [x] stateTax - has both
- [x] totalTax - has both
- [x] ssAnnual - has FORMULA_COLORS, needs CALCULATIONS entry ← ADD
- [x] taxableSS - has both
- [x] expenses - has FORMULA_COLORS, needs CALCULATIONS entry ← ADD
- [x] irmaaTotal - has both
- [x] rmdRequired - has both
- [x] rmdFactor - has both
- [x] effectiveAtReturn - has both
- [x] effectiveIraReturn - has both
- [x] effectiveRothReturn - has both
- [x] capitalGains - has both
- [x] heirValue - has both
- [x] ordinaryIncome - has both
- [x] taxableOrdinary - has both
- [x] standardDeduction - has FORMULA_COLORS, has CALCULATIONS entry

### Success Criteria:

#### Automated Verification:
- [x] App builds without errors: `npm run build`
- [x] All tests pass: `npm run test`
- [x] Linting passes: `npm run lint`
- [x] No console errors about missing calculations

**Implementation Note**: Phase 4 inspector clickability already implemented - all FORMULA_COLORS have corresponding CELL_DEPENDENCIES and CALCULATIONS entries.

#### New Unit Tests (`src/lib/__tests__/inspectorClickability.test.js`):
```javascript
import { CELL_DEPENDENCIES } from '../calculationDependencies';
import { FORMULA_COLORS } from '../colors';

describe('Inspector Clickability Coverage', () => {
  const formulaColorKeys = Object.keys(FORMULA_COLORS);
  const dependencyKeys = Object.keys(CELL_DEPENDENCIES);

  test('all FORMULA_COLORS variables have dependency entries', () => {
    const missingDependencies = formulaColorKeys.filter(
      key => !dependencyKeys.includes(key)
    );
    expect(missingDependencies).toEqual([]);
  });

  test('ssAnnual has dependency entry', () => {
    expect(CELL_DEPENDENCIES.ssAnnual).toBeDefined();
  });

  test('expenses has dependency entry', () => {
    expect(CELL_DEPENDENCIES.expenses).toBeDefined();
  });

  test('irmaaMAGI has dependency entry', () => {
    expect(CELL_DEPENDENCIES.irmaaMAGI).toBeDefined();
  });
});
```

#### New E2E Tests (`e2e/inspector-clickability.spec.js`):
```javascript
import { test, expect } from '@playwright/test';

test.describe('Inspector Clickability', () => {
  const testVariables = ['ssAnnual', 'expenses', 'age', 'year', 'taxableOrdinary'];

  for (const varName of testVariables) {
    test(`${varName} is clickable in formulas`, async ({ page }) => {
      await page.goto('/');
      // Navigate to a calculation that uses this variable
      await page.click('[data-testid="total-tax-cell"]');

      // Check if variable appears and is clickable
      const varElement = page.locator(`[data-testid="formula-var-${varName}"]`);
      if (await varElement.count() > 0) {
        await varElement.click();
        // Should navigate without errors
        await expect(page.locator('[data-testid="calculation-header"]')).toBeVisible();
      }
    });
  }

  test('back/forward navigation works', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="federal-tax-cell"]');
    const firstHeader = await page.locator('[data-testid="calculation-header"]').textContent();

    // Navigate to a dependency
    await page.click('[data-testid="formula-var-taxableOrdinary"]');
    const secondHeader = await page.locator('[data-testid="calculation-header"]').textContent();
    expect(firstHeader).not.toBe(secondHeader);

    // Navigate back
    await page.click('[data-testid="nav-back"]');
    await expect(page.locator('[data-testid="calculation-header"]')).toContainText(firstHeader);
  });
});
```

---

## Phase 5: IRMAA Display Clarification

### Overview
Clarify the Medicare Part B display to distinguish between base premium and IRMAA surcharges.

### Changes Required:

#### 1. Update IRMAA Calculation Return
**File**: `src/lib/calculations.js`
**Changes**: Return both base premium and surcharge separately

Update `calculateIRMAA` function to return more detail:

```javascript
export function calculateIRMAA(magi, inflationRate, yearsFromBase, isSingle, numPeople = 2, customBrackets = null) {
  // ... existing bracket logic ...

  const basePremiumB = brackets[0].partB; // $174.70 is the base
  const basePremiumD = brackets[0].partD; // $0 for Part D base (it's just surcharge)

  // Calculate surcharge only (amount above base)
  const surchargeB = partB - basePremiumB;
  const surchargeD = partD;

  return {
    partB: Math.round(partB * 12 * numPeople),
    partD: Math.round(partD * 12 * numPeople),
    total: Math.round(annualTotal),
    // New fields:
    basePremiumB: Math.round(basePremiumB * 12 * numPeople),
    surchargeB: Math.round(surchargeB * 12 * numPeople),
    surchargeD: Math.round(partD * 12 * numPeople), // Part D is all surcharge
    bracket: brackets.findIndex(b => magi <= b.threshold) || brackets.length - 1,
  };
}
```

#### 2. Update Calculation Inspector IRMAA Display
**File**: `src/components/CalculationInspector/index.jsx`
**Changes**: Update irmaaTotal, irmaaPartB, irmaaPartD entries

```javascript
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
    '  ... up to $419/mo Part B, +$81/mo Part D',
  backOfEnvelope: '$4,200/yr base for couple, more if MAGI > $206K',
  compute: (data) => {
    const { irmaaMAGI, irmaaPartB, irmaaPartD, irmaaTotal } = data;
    const baseAnnual = 174.7 * 12 * 2; // Base premium for couple
    const surchargeB = irmaaPartB - baseAnnual;

    return {
      formula: `Based on ${data.year - 2} MAGI = ${fK(irmaaMAGI)}`,
      values: surchargeB > 0
        ? `Base Part B: ${fK(baseAnnual)}\nPart B Surcharge: +${fK(surchargeB)}\nPart D Surcharge: +${fK(irmaaPartD)}`
        : `Base Part B: ${fK(baseAnnual)}\nNo IRMAA surcharges (MAGI below $206K)`,
      result: `Total Medicare = ${fK(irmaaTotal)}`,
      simple: fK(irmaaTotal),
    };
  },
},
```

### Success Criteria:

#### Automated Verification:
- [x] App builds without errors: `npm run build`
- [x] All tests pass: `npm run test`
- [x] Linting passes: `npm run lint`

**Implementation Note**: Phase 5 IRMAA display clarification already implemented in CalculationInspector with base premium vs surcharge breakdown. Also updated calculateIRMAA to return basePremiumB, surchargeB, surchargeD fields.

#### New Unit Tests (`src/lib/__tests__/irmaaDisplay.test.js`):
```javascript
import { calculateIRMAA } from '../calculations';

describe('IRMAA Display Breakdown', () => {
  test('returns base premium separately from surcharges', () => {
    const result = calculateIRMAA(150000, 0.02, 0, false, 2);
    // Base Part B for couple: $174.70 × 12 × 2 = $4,192.80
    expect(result.basePremiumB).toBeCloseTo(4193, 0);
    expect(result.surchargeB).toBe(0); // No surcharge below $206K
    expect(result.surchargeD).toBe(0);
  });

  test('shows surcharges when MAGI exceeds threshold', () => {
    const result = calculateIRMAA(250000, 0.02, 0, false, 2);
    // Above $206K threshold, should have surcharges
    expect(result.surchargeB).toBeGreaterThan(0);
    expect(result.total).toBe(result.basePremiumB + result.surchargeB + result.surchargeD);
  });

  test('total equals base plus all surcharges', () => {
    const result = calculateIRMAA(300000, 0.02, 0, false, 2);
    const calculatedTotal = result.basePremiumB + result.surchargeB + result.surchargeD;
    expect(result.total).toBeCloseTo(calculatedTotal, 0);
  });
});
```

#### New E2E Tests (`e2e/irmaa-display.spec.js`):
```javascript
import { test, expect } from '@playwright/test';

test.describe('IRMAA Display', () => {
  test('shows base premium label', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="irmaa-total-cell"]');
    await expect(page.locator('text=/Base Part B/')).toBeVisible();
  });

  test('shows surcharge breakdown when applicable', async ({ page }) => {
    await page.goto('/');
    // Set MAGI above threshold
    await page.fill('[data-testid="income-input"]', '250000');
    await page.click('[data-testid="irmaa-total-cell"]');
    await expect(page.locator('text=/Part B Surcharge/')).toBeVisible();
  });

  test('no surcharge shown for low MAGI', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="income-input"]', '150000');
    await page.click('[data-testid="irmaa-total-cell"]');
    await expect(page.locator('text=/No IRMAA surcharges/')).toBeVisible();
  });
});
```

---

## Testing Strategy

### Unit Tests (Automated):
All test files located in `src/lib/__tests__/`:

| Test File | Coverage |
|-----------|----------|
| `propertyTax.test.js` | SALT cap calculation, phaseout logic, effective property tax |
| `heirRmd.test.js` | SLE table lookup, RMD-based vs lump sum strategies, birth year age calculation |
| `ltcgBrackets.test.js` | Bracket stacking logic, effective rate calculation |
| `inspectorClickability.test.js` | FORMULA_COLORS coverage, dependency entries |
| `irmaaDisplay.test.js` | Base premium vs surcharge breakdown |

### E2E Tests (Automated):
All test files located in `e2e/`:

| Test File | Coverage |
|-----------|----------|
| `property-tax.spec.js` | Input section, projection updates, SALT cap year change |
| `heir-rmd.spec.js` | Birth year input, strategy toggle, analysis results |
| `ltcg-inspector.spec.js` | Bracket stacking display, variable clickability |
| `inspector-clickability.spec.js` | All formula variables clickable, navigation |
| `irmaa-display.spec.js` | Base/surcharge breakdown visibility |

### Running Tests:
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# All tests
npm run test && npm run test:e2e
```

## Performance Considerations

- Beneficiary SLE table lookup is O(1)
- No significant performance impact from additional calculations
- Inspector clickability audit adds no runtime cost

## Migration Notes

- Property taxes default to 0, so existing scenarios unaffected
- SALT cap parameters default to 2025 values ($40K with phaseout, $10K after 2028)
- Heir distribution strategy changes from old naming to simplified two-strategy model
- Heir configuration now uses `birthYear` instead of `age` - dynamic age calculation
- Add migration in persistence.js to handle strategy rename:
  ```javascript
  // In migration logic:
  if (params.heirDistributionStrategy === 'even') {
    // 'even' was spreading over 10 years - now use rmd_based
    params.heirDistributionStrategy = 'rmd_based';
  }
  if (params.heirDistributionStrategy === 'year10') {
    // 'year10' was deferring to year 10 - now use rmd_based (auto-determines if no RMD needed)
    params.heirDistributionStrategy = 'rmd_based';
  }
  // 'lump_sum_year0' is new - no migration needed

  // Migrate heir age to birthYear (if present)
  if (params.heirs) {
    params.heirs = params.heirs.map(heir => {
      if (heir.age && !heir.birthYear) {
        // Approximate birth year from age and current year
        heir.birthYear = new Date().getFullYear() - heir.age;
        delete heir.age;
      }
      return heir;
    });
  }
  ```

## References

- [IRS Publication 590-B](https://www.irs.gov/publications/p590b) - Single Life Expectancy Table for beneficiaries
- [SECURE Act 2.0 Rules](https://www.schwab.com/learn/story/inherited-ira-rules-secure-act-20-changes) - 10-year rule and RMD requirements
- [IRS Final RMD Regulations (July 2024)](https://www.kitces.com/blog/secure-act-2-0-irs-regulations-rmd-required-minimum-distributions-10-year-rule-eligible-designated-beneficiary-see-through-conduit-trust/) - Clarification on annual RMDs during 10-year period
- [IRS Topic 409](https://www.irs.gov/taxtopics/tc409) - Capital Gains and Losses
- [Medicare.gov IRMAA brackets 2024](https://www.medicare.gov/basics/costs/medicare-costs/irmaa)
- [SALT Deduction 2025](https://www.cnbc.com/2025/12/02/trump-bigger-salt-deduction-2025.html) - One Big Beautiful Bill Act changes
