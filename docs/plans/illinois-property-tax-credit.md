# Illinois Property Tax Credit Implementation Plan

## Overview

Implement the Illinois Property Tax Credit (Schedule ICR) - a 5% credit on property taxes paid, subject to AGI limits. This is a state tax credit applied against Illinois state tax liability, completely separate from the federal SALT deduction.

## Current State Analysis

**Existing Code:**
- `calculateIllinoisTax()` in `calculations.js:117-119` - calculates IL tax on investment income only
- Property tax is tracked in projections but only for SALT cap calculation (`projections.js:277-280`)
- `stateTax` definition in `calculationDefinitions.js:249-265` documents current IL tax

**What's Missing:**
- Illinois Property Tax Credit (5% of property tax)
- AGI-based phase-out ($500k MFJ / $250k Single)
- Credit is non-refundable (can only reduce state tax to zero)

## Desired End State

After implementation:
1. Illinois state tax will be reduced by 5% of property tax paid
2. Credit will only apply when AGI is below threshold ($500k MFJ / $250k Single)
3. Credit will be capped at the state tax liability (non-refundable)
4. Projection output will include `ilPropertyTaxCredit` field
5. UI will show the credit in tax breakdowns
6. Formula explanations will document the credit calculation

**Verification:**
- AGI $400k, Property Tax $15k, Investment Income $50k:
  - Base IL Tax: $50,000 × 4.95% = $2,475
  - Credit: $15,000 × 5% = $750
  - Net IL Tax: $2,475 - $750 = $1,725
- AGI $600k (over limit): No credit applies, IL Tax = $2,475

## What We're NOT Doing

- Property Index Number validation (required for actual filing, not for projections)
- Principal residence verification
- Tax-exempt interest in AGI calculation (simplification)
- Carryforward tracking (credit cannot be carried forward per IL law)

## Implementation Approach

Modify `calculateIllinoisTax()` to accept additional parameters and return both the tax and credit amounts. Update projections.js to pass AGI and property tax. Add new calculation definition for the credit.

---

## Phase 1: Core Calculation Function

### Overview
Modify the Illinois tax calculation to include the property tax credit with AGI limits.

### Changes Required:

#### 1. Update `calculateIllinoisTax()` function
**File**: `src/lib/calculations.js`

**Current code (lines 112-119):**
```javascript
// =============================================================================
// ILLINOIS STATE TAX
// IL exempts retirement income (SS, IRA, 401k distributions)
// Only taxes investment income
// =============================================================================
export function calculateIllinoisTax(investmentIncome, stateTaxRate = IL_TAX_RATE) {
  return Math.round(investmentIncome * stateTaxRate);
}
```

**New code:**
```javascript
// =============================================================================
// ILLINOIS STATE TAX
// IL exempts retirement income (SS, IRA, 401k distributions)
// Only taxes investment income
// Property Tax Credit: 5% of property tax, subject to AGI limits
// =============================================================================

// IL Property Tax Credit AGI Limits (Schedule ICR)
export const IL_PROPERTY_TAX_CREDIT_AGI_LIMIT_MFJ = 500000;
export const IL_PROPERTY_TAX_CREDIT_AGI_LIMIT_SINGLE = 250000;
export const IL_PROPERTY_TAX_CREDIT_RATE = 0.05;

export function calculateIllinoisTax(
  investmentIncome,
  stateTaxRate = IL_TAX_RATE,
  propertyTax = 0,
  agi = 0,
  isSingle = false
) {
  // Base IL tax on investment income
  const baseTax = Math.round(investmentIncome * stateTaxRate);

  // Property Tax Credit (5% of property tax, non-refundable)
  // Only available if AGI is below threshold
  const agiLimit = isSingle
    ? IL_PROPERTY_TAX_CREDIT_AGI_LIMIT_SINGLE
    : IL_PROPERTY_TAX_CREDIT_AGI_LIMIT_MFJ;

  let propertyTaxCredit = 0;
  if (agi <= agiLimit && propertyTax > 0) {
    const potentialCredit = Math.round(propertyTax * IL_PROPERTY_TAX_CREDIT_RATE);
    // Credit is non-refundable - can only reduce tax to zero
    propertyTaxCredit = Math.min(potentialCredit, baseTax);
  }

  const netTax = baseTax - propertyTaxCredit;

  return {
    baseTax,
    propertyTaxCredit,
    netTax,
    creditLimitedByTax: propertyTaxCredit < Math.round(propertyTax * IL_PROPERTY_TAX_CREDIT_RATE),
    creditLimitedByAGI: agi > agiLimit,
  };
}

// Backwards-compatible wrapper for existing code
export function calculateIllinoisTaxSimple(investmentIncome, stateTaxRate = IL_TAX_RATE) {
  return Math.round(investmentIncome * stateTaxRate);
}
```

#### 2. Update exports in `calculations.js`
Add the new constants to exports if needed for tests.

### Success Criteria:

#### Automated Verification:
- [ ] `npm test` passes - all existing tests still work
- [ ] New unit tests for property tax credit pass
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

---

## Phase 2: Update Projections Engine

### Overview
Pass AGI and property tax to the updated Illinois tax function and include credit in output.

### Changes Required:

#### 1. Update withdrawal calculation
**File**: `src/lib/projections.js`

**Current code (line 141):**
```javascript
const stateTax = calculateIllinoisTax(capitalGains, stateTaxRate);
```

**New code:**
```javascript
// Calculate AGI for IL property tax credit eligibility
// AGI = ordinary income + capital gains (excluding non-taxable SS portion)
const agiForILCredit = ordinaryIncome + capitalGains;

// Illinois tax with property tax credit
const ilTaxResult = calculateIllinoisTax(
  capitalGains,
  stateTaxRate,
  propertyTax,
  agiForILCredit,
  isSingle
);
const stateTax = ilTaxResult.netTax;
const ilPropertyTaxCredit = ilTaxResult.propertyTaxCredit;
```

**Note:** Need to pass `propertyTax` into the `calculateWithdrawals` function via the inputs object.

#### 2. Update function signature and result
**File**: `src/lib/projections.js`

Add `propertyTax` to the inputs destructuring and include credit in result object:

```javascript
// In calculateWithdrawals inputs:
const {
  // ... existing fields
  propertyTax = 0,
} = inputs;

// In result object:
result = {
  // ... existing fields
  ilPropertyTaxCredit,
  ilBaseTax: ilTaxResult.baseTax,
};
```

#### 3. Update the main projection loop
**File**: `src/lib/projections.js`

Pass `propertyTax` when calling `calculateWithdrawals`:

```javascript
const withdrawal = calculateWithdrawals(
  {
    // ... existing fields
    propertyTax,
  },
  // ... rest of params
);
```

#### 4. Add credit to projection output
Include in the results.push() object:
```javascript
ilPropertyTaxCredit: withdrawal.ilPropertyTaxCredit || 0,
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Projection output includes `ilPropertyTaxCredit` field

---

## Phase 3: Update `calculateAllTaxes` Function

### Overview
The standalone `calculateAllTaxes` function also needs the property tax credit.

### Changes Required:

#### 1. Update function signature and logic
**File**: `src/lib/calculations.js` (lines 264-333)

Add `propertyTax` parameter and use updated IL tax function:

```javascript
export function calculateAllTaxes({
  // ... existing params
  propertyTax = 0,
}) {
  // ... existing code ...

  // Calculate AGI for IL credit
  const agi = grossOrdinaryIncome + capitalGains;

  // Illinois tax with property tax credit
  const ilTaxResult = calculateIllinoisTax(
    capitalGains,
    IL_TAX_RATE,
    propertyTax,
    agi,
    isSingle
  );
  const stateTax = ilTaxResult.netTax;

  // ... rest of function ...

  return {
    // ... existing fields ...
    ilPropertyTaxCredit: ilTaxResult.propertyTaxCredit,
    ilBaseTax: ilTaxResult.baseTax,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Existing `calculateAllTaxes` tests pass
- [ ] New tests for property tax credit in `calculateAllTaxes` pass

---

## Phase 4: Add Unit Tests

### Overview
Add comprehensive tests for the Illinois property tax credit.

### Changes Required:

#### 1. New test cases
**File**: `src/lib/calculations.test.js`

```javascript
describe('calculateIllinoisTax with Property Tax Credit', () => {
  describe('credit eligibility by AGI', () => {
    it('applies 5% credit when AGI below MFJ limit ($500k)', () => {
      const result = calculateIllinoisTax(50000, 0.0495, 15000, 400000, false);
      expect(result.baseTax).toBeWithinDollars(2475, 1);
      expect(result.propertyTaxCredit).toBeWithinDollars(750, 1);
      expect(result.netTax).toBeWithinDollars(1725, 1);
      expect(result.creditLimitedByAGI).toBe(false);
    });

    it('applies 5% credit when AGI below Single limit ($250k)', () => {
      const result = calculateIllinoisTax(30000, 0.0495, 10000, 200000, true);
      expect(result.baseTax).toBeWithinDollars(1485, 1);
      expect(result.propertyTaxCredit).toBeWithinDollars(500, 1);
      expect(result.netTax).toBeWithinDollars(985, 1);
    });

    it('denies credit when AGI exceeds MFJ limit', () => {
      const result = calculateIllinoisTax(50000, 0.0495, 15000, 600000, false);
      expect(result.propertyTaxCredit).toBe(0);
      expect(result.netTax).toBeWithinDollars(2475, 1);
      expect(result.creditLimitedByAGI).toBe(true);
    });

    it('denies credit when AGI exceeds Single limit', () => {
      const result = calculateIllinoisTax(30000, 0.0495, 10000, 300000, true);
      expect(result.propertyTaxCredit).toBe(0);
      expect(result.creditLimitedByAGI).toBe(true);
    });

    it('allows credit at exactly the AGI limit', () => {
      const result = calculateIllinoisTax(50000, 0.0495, 10000, 500000, false);
      expect(result.propertyTaxCredit).toBeWithinDollars(500, 1);
      expect(result.creditLimitedByAGI).toBe(false);
    });
  });

  describe('non-refundable credit behavior', () => {
    it('caps credit at tax liability (cannot go negative)', () => {
      // Small investment income = small tax, large property tax
      const result = calculateIllinoisTax(5000, 0.0495, 20000, 100000, false);
      // Base tax: $247.50, potential credit: $1,000
      expect(result.baseTax).toBeWithinDollars(248, 1);
      expect(result.propertyTaxCredit).toBeWithinDollars(248, 1); // Capped at tax
      expect(result.netTax).toBe(0);
      expect(result.creditLimitedByTax).toBe(true);
    });

    it('uses full credit when tax exceeds credit', () => {
      const result = calculateIllinoisTax(100000, 0.0495, 10000, 300000, false);
      // Base tax: $4,950, credit: $500
      expect(result.propertyTaxCredit).toBeWithinDollars(500, 1);
      expect(result.netTax).toBeWithinDollars(4450, 1);
      expect(result.creditLimitedByTax).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles zero property tax', () => {
      const result = calculateIllinoisTax(50000, 0.0495, 0, 300000, false);
      expect(result.propertyTaxCredit).toBe(0);
      expect(result.netTax).toBeWithinDollars(2475, 1);
    });

    it('handles zero investment income', () => {
      const result = calculateIllinoisTax(0, 0.0495, 10000, 100000, false);
      expect(result.baseTax).toBe(0);
      expect(result.propertyTaxCredit).toBe(0);
      expect(result.netTax).toBe(0);
    });

    it('backwards compatible - works without new params', () => {
      const result = calculateIllinoisTax(100000);
      expect(result.netTax).toBeWithinDollars(4950, 1);
      expect(result.propertyTaxCredit).toBe(0);
    });
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] All new tests pass
- [ ] `npm test` shows increased test count

---

## Phase 5: Update Calculation Definitions

### Overview
Document the property tax credit in the formula explanations shown in the UI.

### Changes Required:

#### 1. Update stateTax definition
**File**: `src/lib/calculationDefinitions.js`

Update the `stateTax` entry to include credit information:

```javascript
stateTax: {
  name: 'Illinois State Tax',
  concept:
    'Illinois taxes investment income at 4.95% flat rate. Retirement income (SS, IRA/401k distributions) is EXEMPT. Property Tax Credit: 5% of property tax paid, if AGI ≤ $500K (MFJ) or $250K (Single). Credit is non-refundable.',
  formula:
    'Base Tax = Investment Income x 4.95%\n' +
    'Property Tax Credit = Property Tax x 5%\n' +
    '  (only if AGI ≤ $500K MFJ / $250K Single)\n' +
    'Net State Tax = Base Tax - Credit\n' +
    '  (Credit cannot exceed Base Tax)',
  backOfEnvelope: 'capitalGains x 5% - (propertyTax x 5%)',
  compute: data => {
    const { capitalGains, stateTax, propertyTax, ilPropertyTaxCredit } = data;
    const baseTax = Math.round((capitalGains || 0) * 0.0495);
    const credit = ilPropertyTaxCredit || 0;

    if (credit > 0) {
      return {
        formula: `Base Tax - Property Tax Credit`,
        values: `${fK(baseTax)} - ${fK(credit)} (5% of ${fK(propertyTax || 0)})`,
        result: `State Tax = ${fK(stateTax)}`,
        simple: `${fK(capitalGains)} x 5% - ${fK(credit)} = ${fK(stateTax)}`,
      };
    }
    return {
      formula: `Only investment income is taxable in IL`,
      values: `stateTax = ${fK(capitalGains)} x 4.95%`,
      result: `State Tax = ${fK(stateTax)}`,
      simple: `${fK(capitalGains)} x 5% = ${fK(capitalGains * 0.05)}`,
    };
  },
},
```

#### 2. Add new ilPropertyTaxCredit definition
**File**: `src/lib/calculationDefinitions.js`

Add after the `stateTax` definition:

```javascript
ilPropertyTaxCredit: {
  name: 'IL Property Tax Credit',
  concept:
    'Illinois allows a 5% credit on property taxes paid on your principal residence. Credit is non-refundable (can only reduce state tax to zero). Not available if AGI exceeds $500K (MFJ) or $250K (Single).',
  formula:
    'If AGI ≤ limit:\n' +
    '  Credit = min(Property Tax x 5%, State Tax)\n' +
    'If AGI > limit:\n' +
    '  Credit = $0\n\n' +
    'AGI Limits:\n' +
    '  MFJ: $500,000\n' +
    '  Single: $250,000',
  backOfEnvelope: 'propertyTax x 5% (if under AGI limit)',
  compute: data => {
    const { propertyTax, ilPropertyTaxCredit, isSurvivor } = data;
    const limit = isSurvivor ? 250000 : 500000;
    const potentialCredit = Math.round((propertyTax || 0) * 0.05);
    const actualCredit = ilPropertyTaxCredit || 0;

    if (actualCredit === 0 && propertyTax > 0) {
      return {
        formula: `AGI exceeds $${(limit/1000)}K limit`,
        values: `No credit available`,
        result: `IL Property Tax Credit = $0`,
        simple: `$0 (AGI over limit)`,
      };
    }
    if (actualCredit < potentialCredit) {
      return {
        formula: `Credit limited by tax liability`,
        values: `min(${fK(potentialCredit)}, State Tax)`,
        result: `IL Property Tax Credit = ${fK(actualCredit)}`,
        simple: `${fK(actualCredit)} (capped at tax)`,
      };
    }
    return {
      formula: `Property Tax x 5%`,
      values: `${fK(propertyTax || 0)} x 5%`,
      result: `IL Property Tax Credit = ${fK(actualCredit)}`,
      simple: `${fK(propertyTax || 0)} x 5% = ${fK(actualCredit)}`,
    };
  },
},
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

#### Manual Verification:
- [ ] Click on stateTax in projection table to see updated formula
- [ ] New ilPropertyTaxCredit field shows in detailed breakdown

---

## Phase 6: Update Total Tax Formula

### Overview
Ensure total tax calculation and display reflects the credit.

### Changes Required:

#### 1. Update totalTax definition
**File**: `src/lib/calculationDefinitions.js`

Update the formula description:

```javascript
formula:
  'totalTax = federalTax + ltcgTax + niit + stateTax\n\n' +
  'Federal: Progressive brackets on ordinary income\n' +
  'LTCG: 0%/15%/20% on capital gains (stacks on ordinary)\n' +
  'NIIT: 3.8% on investment income above $250K MAGI\n' +
  'IL State: 4.95% on investment income - Property Tax Credit',
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds

---

## Testing Strategy

### Unit Tests:
- Credit calculation with various AGI levels
- Non-refundable credit capping behavior
- Edge cases (zero property tax, zero investment income)
- Backwards compatibility

### Integration Tests:
- Full projection run with property tax credit
- Verify credit flows through to totals

### Manual Testing Steps:
1. Load retirement planner with property tax > $0
2. Set AGI-generating income below $500k
3. Verify state tax shows credit applied
4. Click state tax to see formula breakdown
5. Increase income to push AGI above $500k
6. Verify credit disappears
7. Check survivor scenario uses $250k threshold

---

## Migration Notes

No data migration required - existing saved scenarios will work with default values (zero property tax credit).

## References

- [IL Schedule ICR Instructions](https://tax.illinois.gov/forms/incometax/currentyear/individual/il-1040-schedule-icr-instr.html)
- [IL Property Tax Credit FAQ](https://tax.illinois.gov/questionsandanswers/answer.46.html)
- Current implementation: `src/lib/calculations.js:117-119`
- Projections: `src/lib/projections.js:141`
