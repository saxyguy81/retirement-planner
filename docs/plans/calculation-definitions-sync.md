# Calculation Definitions Sync Refactor

> **Revision 2** (2025-12-30): Enhanced Phase 3 with user-preferred dual-display approach (separate lines for PV/FV), added formula+values overlay display, centralized `applyPV` utility, and improved test coverage.

## Overview

Refactor `calculationDefinitions.js` to import values from `taxTables.js` instead of hardcoding them, making formulas automatically stay in sync with actual calculations. Add PV/FV-aware display and validation tests.

## Current State Analysis

### The Problem
`calculationDefinitions.js` (1393 lines) has **no imports** from `taxTables.js` or `calculations.js`. All values are hardcoded:
- IRMAA base premium: `$174.70` (should be `$202.90` for 2026)
- IRMAA thresholds: `$206K`, `$258K`, `$322K` (should be `$218K`, `$274K`, `$342K`)
- Standard deduction: `$30,000` (should be `$29,200`)
- Compute functions re-implement calculation logic with stale constants

### Key Discoveries
- `calculationDefinitions.js:382-391` - IRMAA values hardcoded as strings
- `calculationDefinitions.js:1287-1298` - IRMAA tier checks use wrong thresholds
- `calculationDefinitions.js:1311-1324` - More hardcoded IRMAA values
- No connection to `taxTables.js` which has correct 2026 values

## Desired End State

1. **Single Source of Truth**: All tax constants imported from `taxTables.js`
2. **Dynamic Formulas**: Formula strings built with template literals using imported values
3. **PV/FV Aware**: When showing values, display both present and future value
4. **Inflation Aware**: For bracket thresholds, show inflated values for the specific year
5. **Validated**: Tests verify definitions match actual calculations

## What We're NOT Doing

- Changing the actual calculation logic in `calculations.js`
- Restructuring the CALCULATIONS object shape
- Changing how CalculationInspector consumes definitions
- Adding new calculation fields

## Implementation Approach

Enhance `calculationDefinitions.js` in place by:
1. Adding imports from `taxTables.js`
2. Creating helper functions for common formula patterns
3. Replacing hardcoded values with imported constants
4. Adding PV/FV display helpers
5. Writing validation tests

---

## Phase 1: Add Imports and Helper Functions

### Overview
Add imports from taxTables.js and create helper functions for dynamic formula building.

### Changes Required

#### 1. Add Imports
**File**: `src/lib/calculationDefinitions.js`
**Location**: Top of file (lines 1-15)

```javascript
/**
 * Calculation Definitions
 * ...existing comment...
 */

// Import tax constants for dynamic formula generation
import {
  IRMAA_BRACKETS_MFJ_2026,
  IRMAA_BRACKETS_SINGLE_2026,
  FEDERAL_BRACKETS_MFJ_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
  LTCG_BRACKETS_MFJ_2024,
  STANDARD_DEDUCTION_MFJ_2024,
  STANDARD_DEDUCTION_SINGLE_2024,
  SENIOR_BONUS_MFJ_2024,
  SS_TAX_THRESHOLDS_MFJ,
  SS_TAX_THRESHOLDS_SINGLE,
  RMD_TABLE,
  RMD_START_AGE,
  NIIT_RATE,
  NIIT_THRESHOLD_MFJ,
  NIIT_THRESHOLD_SINGLE,
  IL_TAX_RATE,
  inflateBrackets,
} from './taxTables.js';

// Import IL property tax credit constants
import {
  IL_PROPERTY_TAX_CREDIT_RATE,
  IL_PROPERTY_TAX_CREDIT_AGI_LIMIT_MFJ,
  IL_PROPERTY_TAX_CREDIT_AGI_LIMIT_SINGLE,
} from './calculations.js';
```

#### 2. Create shared PV utility (consolidates 4 duplicated implementations)
**File**: `src/lib/pvUtils.js` (new)

```javascript
/**
 * Present Value utilities - centralized for consistency
 * Replaces duplicate implementations in ProjectionsTable, Dashboard,
 * ScenarioComparison, and HeirAnalysis
 */
import { fK, fM } from './calculationDefinitions';

export const applyPV = (value, yearsFromStart, discountRate) => {
  if (typeof value !== 'number' || isNaN(value)) return value;
  return value / Math.pow(1 + discountRate, yearsFromStart);
};

/**
 * Format value with optional dual PV/FV display
 * Returns structured data for component rendering
 *
 * In FV mode: returns single FV value (no label)
 * In PV mode: returns PV as primary (closest to symbol), FV labeled above
 *
 * @param {number} fvValue - The future value
 * @param {number} yearsFromStart - Years from year 0
 * @param {number} discountRate - e.g., 0.03
 * @param {boolean} showPV - Whether PV mode is enabled
 * @param {function} formatter - Formatting function (e.g., fK, fM)
 * @returns {{ primary: string, secondary: string|null }}
 */
export const formatDualValue = (fvValue, yearsFromStart, discountRate, showPV, formatter = fK) => {
  const pvValue = applyPV(fvValue, yearsFromStart, discountRate);

  // FV mode: just show FV, no label
  if (!showPV) {
    return { primary: formatter(fvValue), secondary: null };
  }

  // PV mode: skip dual display if values are nearly equal (year 0 or small diff)
  if (yearsFromStart === 0 || Math.abs(fvValue - pvValue) < 100) {
    return { primary: formatter(pvValue), secondary: null };
  }

  // PV mode: dual display - PV primary (closest to symbol), FV secondary (labeled, above)
  return {
    primary: formatter(pvValue),
    secondary: `FV: ${formatter(fvValue)}`
  };
};
```

#### 3. Add Helper Functions
**File**: `src/lib/calculationDefinitions.js`
**Location**: After imports, before CALCULATIONS

```javascript
// =============================================================================
// FORMULA HELPERS - Build dynamic formulas from imported constants
// =============================================================================

// Get IRMAA brackets for display (returns object with formatted values)
const getIRMAAInfo = (isSingle = false) => {
  const brackets = isSingle ? IRMAA_BRACKETS_SINGLE_2026 : IRMAA_BRACKETS_MFJ_2026;
  const basePartB = brackets[0].partB;
  const tier1 = brackets[1];
  const tier2 = brackets[2];
  const tier3 = brackets[3];

  return {
    basePartB,
    baseAnnualCouple: Math.round(basePartB * 12 * 2),
    baseAnnualSingle: Math.round(basePartB * 12),
    tier1Threshold: tier1.threshold,
    tier2Threshold: tier2.threshold,
    tier3Threshold: tier3.threshold,
    tier1SurchargeB: Math.round((tier1.partB - basePartB) * 12),
    tier1SurchargeD: Math.round(tier1.partD * 12),
    tier2SurchargeB: Math.round((tier2.partB - basePartB) * 12),
    tier2SurchargeD: Math.round(tier2.partD * 12),
  };
};

// Get federal bracket info for a specific year (with inflation)
const getFederalBracketInfo = (yearsFromBase = 0, inflationRate = 0.03, isSingle = false) => {
  const baseBrackets = isSingle ? FEDERAL_BRACKETS_SINGLE_2024 : FEDERAL_BRACKETS_MFJ_2024;
  const brackets = yearsFromBase > 0
    ? inflateBrackets(baseBrackets, inflationRate, yearsFromBase)
    : baseBrackets;
  return brackets;
};

// Format with both PV and FV when applicable
const formatWithPVFV = (fvValue, pvValue, showPV = false) => {
  if (!showPV || Math.abs(fvValue - pvValue) < 100) {
    return fK(fvValue);
  }
  return `${fK(pvValue)} (${fK(fvValue)} FV)`;
};

// Get IRMAA tier description for a given MAGI
const getIRMAATier = (magi, isSingle = false) => {
  const info = getIRMAAInfo(isSingle);
  if (magi < info.tier1Threshold) return { tier: 'None', surcharge: 0 };
  if (magi < info.tier2Threshold) return { tier: 'Tier 1', surcharge: info.tier1SurchargeB };
  if (magi < info.tier3Threshold) return { tier: 'Tier 2', surcharge: info.tier2SurchargeB };
  return { tier: 'Tier 3+', surcharge: info.tier2SurchargeB * 1.5 }; // Approximate
};
```

### Success Criteria

#### Automated Verification:
- [x] File parses without syntax errors: `npm run build`
- [x] All existing tests pass: `npm test`
- [x] No new linting errors: `npm run lint`

#### Manual Verification:
- [x] Imports are correctly resolved
- [x] Helper functions return expected values

---

## Phase 2: Fix IRMAA Definitions

### Overview
Replace all hardcoded IRMAA values with dynamic values from helper functions.

### Changes Required

#### 1. Fix irmaaTotal definition
**File**: `src/lib/calculationDefinitions.js`
**Current** (lines 376-412):
```javascript
irmaaTotal: {
  name: 'Total Medicare Premium',
  concept: '...',
  formula:
    'irmaaTotal = Base Part B + Part B Surcharge + Part D Surcharge\n\n' +
    'Base Part B (2024): $174.70/mo per person\n' +  // WRONG
    'Surcharges apply if MAGI (2 years prior) exceeds:\n' +
    '  > $206K (MFJ): +$70/mo Part B, +$13/mo Part D\n' +  // WRONG
    // ...
```

**Replace with**:
```javascript
irmaaTotal: {
  name: 'Total Medicare Premium',
  concept:
    'Total Medicare cost including base Part B premium plus any IRMAA surcharges. IRMAA (Income-Related Monthly Adjustment Amount) is an extra premium if MAGI from 2 years ago exceeds thresholds.',
  get formula() {
    const info = getIRMAAInfo();
    return (
      'irmaaTotal = Base Part B + Part B Surcharge + Part D Surcharge\n\n' +
      `Base Part B (2026): $${info.basePartB}/mo per person\n` +
      'Surcharges apply if MAGI (2 years prior) exceeds:\n' +
      `  > $${(info.tier1Threshold / 1000).toFixed(0)}K (MFJ): +$${Math.round((IRMAA_BRACKETS_MFJ_2026[1].partB - info.basePartB))}/mo Part B, +$${IRMAA_BRACKETS_MFJ_2026[1].partD}/mo Part D\n` +
      `  > $${(info.tier2Threshold / 1000).toFixed(0)}K: +$${Math.round((IRMAA_BRACKETS_MFJ_2026[2].partB - info.basePartB))}/mo Part B, +$${IRMAA_BRACKETS_MFJ_2026[2].partD}/mo Part D\n` +
      `  ... up to +$${Math.round((IRMAA_BRACKETS_MFJ_2026[5].partB - info.basePartB))}/mo Part B, +$${IRMAA_BRACKETS_MFJ_2026[5].partD}/mo Part D`
    );
  },
  get backOfEnvelope() {
    const info = getIRMAAInfo();
    return `$${(info.baseAnnualCouple / 1000).toFixed(1)}K/yr base for couple, more if MAGI > $${(info.tier1Threshold / 1000).toFixed(0)}K`;
  },
  compute: data => {
    const { irmaaMAGI, irmaaPartB, irmaaPartD, irmaaTotal } = data;
    const info = getIRMAAInfo();
    const baseAnnual = info.baseAnnualCouple;
    const surchargeB = Math.max(0, irmaaPartB - baseAnnual);
    const surchargeD = irmaaPartD || 0;

    let values;
    if (surchargeB > 0 || surchargeD > 0) {
      values = `Base Part B: ${fK(baseAnnual)}\nPart B Surcharge: +${fK(surchargeB)}\nPart D Surcharge: +${fK(surchargeD)}`;
    } else {
      values = `Base Part B: ${fK(baseAnnual)}\nNo IRMAA surcharges (MAGI below $${(info.tier1Threshold / 1000).toFixed(0)}K)`;
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
```

#### 2. Fix irmaaMAGI definition (lines 1282-1306)
Replace hardcoded thresholds with dynamic values using `getIRMAAInfo()` and `getIRMAATier()`.

#### 3. Fix irmaaPartB definition (lines 1308-1336)
Replace `174.7` constant with `getIRMAAInfo().basePartB`.

#### 4. Fix cumulativeIRMAA definition (lines 1264-1280)
Replace `$206K` with dynamic threshold.

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] All tests pass: `npm test`
- [x] E2E tests pass: `npm run test:e2e`

#### Manual Verification:
- [x] Open Calculation Inspector on irmaaTotal field
- [x] Verify formula shows $202.90/mo (not $174.70)
- [x] Verify thresholds show $218K, $274K, $342K
- [x] Click through different IRMAA fields to verify consistency

---

## Phase 3: Add PV/FV Display Support

### Overview
Implement dual-value display in CalculationInspector:
- **FV mode**: Show single FV value (no labels)
- **PV mode**: Show both values on separate lines
  - PV value (primary, large) - closest to the result symbol
  - FV value (labeled, smaller) - above the primary value

### Changes Required

#### 1. Thread `showPV` from App → ProjectionsTable → CalculationInspector

**File**: `src/components/ProjectionsTable/index.jsx`
**Change**: Pass display options to CalculationInspector

```javascript
// In the CalculationInspector render (around line 750+):
<CalculationInspector
  {...inspectorState}
  params={params}
  projections={projections}
  showPV={showPV}                              // NEW
  discountRate={params.discountRate || 0.03}   // NEW
  onClose={() => setInspectorState(null)}
  // ...other props
/>
```

#### 2. Update CalculationInspector to receive and use display options

**File**: `src/components/CalculationInspector/index.jsx`

Add props:
```javascript
export function CalculationInspector({
  // ...existing props
  showPV = false,        // NEW: whether PV mode is enabled
  discountRate = 0.03,   // NEW: for PV calculations
}) {
```

Pass to compute:
```javascript
// Line ~93, change:
const computed = calc.compute(activeData, params);
// To:
const computed = calc.compute(activeData, params, { showPV, discountRate });
```

Update Quick Answer section to show dual values:
```jsx
{/* Quick Answer */}
<div className="bg-slate-800 rounded-lg p-4 text-center">
  {computed.simpleSecondary && (
    <div className="text-slate-400 text-sm mb-1">{computed.simpleSecondary}</div>
  )}
  <div className="text-3xl font-mono text-blue-400">{computed.simple}</div>
  <div className="text-slate-500 text-xs mt-1">Back-of-envelope</div>
</div>
```

#### 3. Update compute functions to return structured dual-value data

**File**: `src/lib/calculationDefinitions.js`

Add import at top:
```javascript
import { formatDualValue } from './pvUtils.js';
```

Example update for a monetary field (expenses):
```javascript
expenses: {
  name: 'Annual Expenses',
  concept: '...',
  formula: '...',
  compute: (data, params, options = {}) => {
    const { expenses, yearsFromStart } = data;
    const { showPV = false, discountRate = 0.03 } = options;

    // Use formatDualValue for the display
    const display = formatDualValue(expenses, yearsFromStart, discountRate, showPV, fK);

    return {
      formula: 'expenses = baseExpenses × (1 + inflation)^years',
      values: `baseExpenses = ${fK(params.yearlyExpenses)}\nyears = ${yearsFromStart}`,
      result: `Expenses = ${display.primary}`,
      simple: display.primary,
      simpleSecondary: display.secondary,  // null in FV mode, "FV: $X" in PV mode
    };
  },
},
```

#### 4. Update key monetary fields to use dual-value display

Apply the pattern from step 3 to these fields:
- `expenses` - Annual spending
- `netWorth` - Total net worth
- `federalTax` - Federal tax due
- `stateTax` - State tax due
- `totalTax` - Combined taxes
- `irmaaTotal` - Medicare premiums
- `ssIncome` - Social Security income
- `rothConversion` - Conversion amounts
- `capitalGainsHarvested` - Harvesting amounts
- `legacyValue` - End-of-life estate value

Fields that are ratios, percentages, or ages should NOT use dual-value display.

#### 5. Add formula + values overlay display

Show the formula on one line and the values-substituted version on an adjacent line (above or below), with alignment so users can see the correspondence. The LHS value should be on the same line as the RHS values, not on its own line.

**Visual goal:**
```
┌─────────────────────────────────────────────────────────┐
│ Formula                                                 │
│                                                         │
│   expenses = baseExpenses × (1 + inflation)^years       │  ← symbolic formula
│   $134K    = $100K        × (1 + 0.03)^10               │  ← values on adjacent line
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**File**: `src/components/CalculationInspector/index.jsx`

Update the Formula section to show both lines:
```jsx
{/* Formula with Color-Coded/Clickable Values */}
<div>
  <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">
    Formula{' '}
    {hasNavigation && <span className="text-slate-600">(click values to navigate)</span>}
  </div>
  <div className="bg-slate-950 rounded p-3 font-mono text-sm space-y-1">
    {/* Symbolic formula */}
    <div className="text-emerald-400">
      <ClickableFormula
        formula={calc.formula}
        data={activeData}
        projections={projections}
        onNavigate={hasNavigation ? onNavigate : null}
        currentField={activeField}
      />
    </div>
    {/* Values overlay - adjacent line with actual numbers */}
    {computed.formulaWithValues && (
      <div className="text-amber-400">{computed.formulaWithValues}</div>
    )}
  </div>
</div>
```

**Compute function enhancement:**

Return a `formulaWithValues` field that shows the formula with values substituted:
```javascript
compute: (data, params, options = {}) => {
  const { expenses, yearsFromStart } = data;
  const baseExpenses = params.yearlyExpenses;
  const inflation = params.inflationRate || 0.03;

  return {
    // ...existing fields
    formulaWithValues: `${fK(expenses)} = ${fK(baseExpenses)} × (1 + ${(inflation * 100).toFixed(1)}%)^${yearsFromStart}`,
  };
},
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Tests pass: `npm test`
- [x] E2E tests pass: `npm run test:e2e`

#### Manual Verification:
- [x] In FV mode: Calculation Inspector shows single value, no "FV:" label
- [x] In PV mode (year 0): Shows single value (PV ≈ FV, no dual display)
- [x] In PV mode (year 10+): Shows dual values:
  - "FV: $X" label in smaller text above
  - PV value large and prominent below (closest to result)
- [x] Toggle between modes updates display correctly
- [x] Formula section shows symbolic formula on one line
- [x] Values-substituted line appears directly below formula (same box)
- [x] LHS result value is on same line as RHS values (e.g., `$134K = $100K × ...`)

---

## Phase 4: Fix Other Stale Values

### Overview
Fix remaining hardcoded values throughout the file.

### Changes Required

#### 1. Standard Deduction (if referenced)
Search for `30,000` or `$30K` and replace with imported `STANDARD_DEDUCTION_MFJ_2024`.

#### 2. LTCG Brackets
Search for `94,050` or `583,750` and use `LTCG_BRACKETS_MFJ_2024`.

#### 3. Federal Bracket Thresholds
Any hardcoded `23200`, `94300`, `201050`, etc. should use `FEDERAL_BRACKETS_MFJ_2024`.

#### 4. NIIT Thresholds
Replace hardcoded `250000` with `NIIT_THRESHOLD_MFJ`.

#### 5. SS Tax Thresholds
Replace `32000`, `44000` with `SS_TAX_THRESHOLDS_MFJ.tier1`, `SS_TAX_THRESHOLDS_MFJ.tier2`.

### Success Criteria

#### Automated Verification:
- [x] No hardcoded tax values remain: `grep -n "174.7\|206000\|258000\|29200\|30000" src/lib/calculationDefinitions.js` returns nothing
- [x] Build succeeds
- [x] All tests pass

---

## Phase 5: Add Validation Tests

### Overview
Create tests that verify:
1. Calculation definitions stay in sync with actual constants
2. PV utilities work correctly
3. Dual-value display behaves correctly in both modes

### Changes Required

#### 1. Create PV utility tests
**File**: `src/lib/pvUtils.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import { applyPV, formatDualValue } from './pvUtils';

describe('pvUtils', () => {
  describe('applyPV', () => {
    it('returns original value for year 0', () => {
      expect(applyPV(100000, 0, 0.03)).toBe(100000);
    });

    it('discounts correctly for 10 years at 3%', () => {
      const pv = applyPV(100000, 10, 0.03);
      // PV = 100000 / (1.03)^10 ≈ 74409
      expect(pv).toBeCloseTo(74409, 0);
    });

    it('handles non-numeric values gracefully', () => {
      expect(applyPV(null, 5, 0.03)).toBe(null);
      expect(applyPV(undefined, 5, 0.03)).toBe(undefined);
      expect(applyPV(NaN, 5, 0.03)).toBe(NaN);
    });
  });

  describe('formatDualValue', () => {
    const mockFormatter = (v) => `$${Math.round(v / 1000)}K`;

    it('returns single FV value in FV mode (showPV=false)', () => {
      const result = formatDualValue(150000, 10, 0.03, false, mockFormatter);
      expect(result.primary).toBe('$150K');
      expect(result.secondary).toBeNull();
    });

    it('returns single value for year 0 even in PV mode', () => {
      const result = formatDualValue(100000, 0, 0.03, true, mockFormatter);
      expect(result.primary).toBe('$100K');
      expect(result.secondary).toBeNull();
    });

    it('returns dual values in PV mode for future years', () => {
      const result = formatDualValue(150000, 10, 0.03, true, mockFormatter);
      expect(result.primary).toBe('$112K'); // PV ≈ 111,614
      expect(result.secondary).toBe('FV: $150K');
    });

    it('skips dual display when FV ≈ PV (diff < $100)', () => {
      const result = formatDualValue(10050, 0.1, 0.03, true, mockFormatter);
      // Very small time difference, PV ≈ FV
      expect(result.secondary).toBeNull();
    });
  });
});
```

#### 2. Create calculation definitions sync tests
**File**: `src/lib/calculationDefinitions.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import { CALCULATIONS, fK } from './calculationDefinitions';
import {
  IRMAA_BRACKETS_MFJ_2026,
  STANDARD_DEDUCTION_MFJ_2024,
  FEDERAL_BRACKETS_MFJ_2024,
} from './taxTables';

describe('Calculation Definitions Sync', () => {
  describe('IRMAA values', () => {
    it('irmaaTotal formula contains correct base premium', () => {
      const formula = CALCULATIONS.irmaaTotal.formula;
      const basePartB = IRMAA_BRACKETS_MFJ_2026[0].partB;
      expect(formula).toContain(`$${basePartB}`);
    });

    it('irmaaTotal formula contains correct tier1 threshold', () => {
      const formula = CALCULATIONS.irmaaTotal.formula;
      const tier1 = IRMAA_BRACKETS_MFJ_2026[1].threshold;
      expect(formula).toContain(`$${(tier1 / 1000).toFixed(0)}K`);
    });

    it('irmaaPartB compute uses correct base annual', () => {
      const basePartB = IRMAA_BRACKETS_MFJ_2026[0].partB;
      const expectedBase = Math.round(basePartB * 12 * 2);
      const result = CALCULATIONS.irmaaPartB.compute({
        irmaaPartB: expectedBase,
        irmaaMAGI: 100000,
      });
      expect(result.values).toContain('Base only');
    });
  });

  describe('compute functions match calculations', () => {
    it('federal tax compute shows correct bracket thresholds', () => {
      const result = CALCULATIONS.federalTax.compute({
        taxableOrdinary: 100000,
        federalTax: 12000,
        yearsFromStart: 0,
      });
      expect(result.formula).toBeDefined();
    });
  });

  describe('dual-value display (PV/FV)', () => {
    it('returns simpleSecondary only in PV mode', () => {
      const mockData = { expenses: 150000, yearsFromStart: 10 };
      const mockParams = { yearlyExpenses: 100000 };

      // FV mode - no secondary
      const fvResult = CALCULATIONS.expenses.compute(mockData, mockParams, { showPV: false });
      expect(fvResult.simpleSecondary).toBeFalsy();

      // PV mode - has secondary with FV label
      const pvResult = CALCULATIONS.expenses.compute(mockData, mockParams, { showPV: true, discountRate: 0.03 });
      expect(pvResult.simpleSecondary).toMatch(/^FV:/);
    });

    it('returns formulaWithValues for overlay display', () => {
      const result = CALCULATIONS.expenses.compute(
        { expenses: 134000, yearsFromStart: 10 },
        { yearlyExpenses: 100000 },
        {}
      );
      expect(result.formulaWithValues).toBeDefined();
      expect(result.formulaWithValues).toContain('='); // Has LHS = RHS format
    });
  });
});
```

### Success Criteria

#### Automated Verification:
- [x] PV utility tests pass: `npm test src/lib/pvUtils.test.js`
- [x] Definition sync tests pass: `npm test src/lib/calculationDefinitions.test.js`
- [x] All tests pass: `npm test`
- [x] Tests catch if someone changes taxTables without updating definitions
- [x] Tests catch if dual-display logic breaks

---

## Phase 6: Update Snapshots

### Overview
Update any test snapshots that reference the old values.

### Changes Required

Run: `npm test -- --update`

Review changed snapshots to ensure they now show correct 2026 values.

### Success Criteria

#### Automated Verification:
- [ ] All tests pass with updated snapshots
- [ ] E2E tests pass: `npm run test:e2e`

---

## Testing Strategy

### Unit Tests
- Verify helper functions return correct values
- Verify formula strings contain expected constants
- Verify compute functions use imported values

### Integration Tests
- CalculationInspector displays correct values
- PV/FV toggle works correctly

### Manual Testing Steps
1. Open the app and navigate to Projections table
2. Click on various cells to open Calculation Inspector
3. Verify IRMAA formulas show $202.90 base, $218K threshold
4. Toggle PV/FV mode and verify display updates
5. Check multiple years to verify inflation-adjusted displays

## Performance Considerations

- Using getters (`get formula()`) instead of static strings adds minimal overhead
- Helper functions are called only when definitions are accessed, not upfront
- No impact on calculation performance (only affects display)

## References

- Tax Tables: `src/lib/taxTables.js`
- Calculations: `src/lib/calculations.js`
- Calculation Inspector: `src/components/CalculationInspector/index.jsx`
- Related: IL Property Tax Credit implementation (recent)
