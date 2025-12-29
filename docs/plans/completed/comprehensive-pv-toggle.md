# Comprehensive Present Value Toggle Fix

> **STATUS: 100% COMPLETE** - Updated 2025-12-28

## Problem Statement

The Present Value (PV) toggle in the Projections tab only affects a small subset of monetary values:
- Expenses
- EOY balances (atEOY, iraEOY, rothEOY, totalEOY)
- Heir value

But ALL monetary amounts should be affected by the PV toggle to show a consistent view of values in today's dollars. Currently missing:
- BOY balances
- All withdrawal amounts
- All tax amounts (federal, LTCG, NIIT, state, total)
- IRMAA amounts
- Social Security
- RMD amounts
- Roth conversion amounts
- Cost basis values
- Cumulative totals
- Tax calculation intermediates

## Approach

### Option A: Calculate all PV values in projections.js
Add `pv*` variants for every monetary field in the projection calculation.

**Pros**: Clean separation, all PV values pre-calculated
**Cons**: Doubles the number of fields, increases memory usage

### Option B: Apply PV factor dynamically in ProjectionsTable
Pass the discount rate and year to the table, calculate PV on display.

**Pros**: Less data duplication, simpler projections.js
**Cons**: More complex rendering logic

### Recommendation: Option B (Dynamic PV)

The PV factor is simple: `value / Math.pow(1 + discountRate, yearsFromStart)`

We can apply this at render time in ProjectionsTable, which:
1. Keeps projections.js clean
2. Works for all monetary fields automatically
3. Reduces data duplication
4. Allows easy extension to other views

---

## Phase 1: Update ProjectionsTable to Apply PV Dynamically

### Changes Required

#### 1. Modify cell value rendering
**File**: `src/components/ProjectionsTable/index.jsx`

Instead of using conditional keys like `showPV ? 'pvExpenses' : 'expenses'`, apply PV transformation at render time for all `$` format fields:

```jsx
// Helper function to apply PV factor
const applyPV = (value, yearsFromStart, discountRate, showPV) => {
  if (!showPV || typeof value !== 'number') return value;
  const pvFactor = Math.pow(1 + discountRate, yearsFromStart);
  return value / pvFactor;
};

// In cell rendering
const displayValue = row.format === '$' && showPV
  ? applyPV(d[row.key], d.yearsFromStart, params.discountRate || 0.03, true)
  : d[row.key];
```

#### 2. Simplify getSections()
Remove conditional key selection since we now apply PV dynamically:

```jsx
// Before:
{ key: showPV ? 'pvExpenses' : 'expenses', label: 'Annual Expenses', format: '$' },

// After:
{ key: 'expenses', label: 'Annual Expenses', format: '$' },
```

#### 3. Update formatValue to handle PV-adjusted values
Ensure the formatter receives the PV-adjusted value, not the raw value.

### Success Criteria
- [x] All monetary fields in Projections tab respond to PV toggle
- [x] PV calculation is consistent: `value / (1 + r)^years`
- [x] Non-monetary fields (percentages, factors, counts) are unaffected
- [x] Build passes: `npm run build`
- [x] Tests pass: `npm test`

---

## Phase 2: Clean Up Redundant PV Fields in projections.js

### Changes Required

#### 1. Remove pre-calculated PV fields (optional)
**File**: `src/lib/projections.js`

The following fields can be removed since PV is now calculated at display time:
- `pvAtEOY`, `pvIraEOY`, `pvRothEOY`, `pvTotalEOY`
- `pvHeirValue`
- `pvExpenses`

However, keep them for now for backward compatibility with other views (Dashboard, Charts, etc.) that may rely on them.

### Success Criteria
- [x] Tests still pass after any cleanup
- [x] Other views (Dashboard, HeirAnalysis, Charts) still work correctly
- Note: Kept pv* fields for backward compatibility; dynamic PV approach is cleaner

---

## Phase 3: Apply PV Consistently to Other Views

### Changes Required

Apply the same dynamic PV pattern to:

#### 1. Dashboard
**File**: `src/components/Dashboard/index.jsx`

Apply PV to all summary cards and chart values.

#### 2. HeirAnalysis
**File**: `src/components/HeirAnalysis/index.jsx`

Apply PV to heir value displays.

#### 3. ScenarioComparison
**File**: `src/components/ScenarioComparison/index.jsx`

Apply PV to comparison values.

### Success Criteria
- [x] All views show consistent PV values when toggle is on
- [x] Toggle affects all monetary displays across all views
- [x] Build passes: `npm run build`

---

## Fields That SHOULD Be Affected by PV Toggle

### Starting Position
- `atBOY` - After-Tax BOY
- `iraBOY` - IRA BOY
- `rothBOY` - Roth BOY
- `totalBOY` - Total BOY
- `costBasisBOY` - Cost Basis BOY

### Income
- `ssAnnual` - Social Security

### Cash Needs
- `expenses` - Annual Expenses
- `irmaaTotal` - IRMAA Surcharges

### RMD & Conversions
- `rmdRequired` - RMD Required
- `rothConversion` - Roth Conversion

### Withdrawals
- `atWithdrawal` - From After-Tax
- `iraWithdrawal` - From IRA
- `rothWithdrawal` - From Roth
- `totalWithdrawal` - Total Withdrawal

### Tax Detail
- `taxableSS` - Taxable Soc Sec
- `ordinaryIncome` - Ordinary Income
- `capitalGains` - Capital Gains
- `taxableOrdinary` - Taxable Income
- `federalTax` - Federal Tax
- `ltcgTax` - LTCG Tax
- `niit` - NIIT
- `stateTax` - State Tax
- `totalTax` - Total Tax

### IRMAA Detail
- `irmaaMAGI` - MAGI (2yr prior)
- `irmaaPartB` - Part B Surcharge
- `irmaaPartD` - Part D Surcharge

### Ending Position
- `atEOY` - After-Tax EOY
- `iraEOY` - IRA EOY
- `rothEOY` - Roth EOY
- `totalEOY` - Total EOY
- `costBasisEOY` - Cost Basis EOY

### Heir Value
- `heirValue` - After-Tax to Heirs

### Analysis & Metrics
- `cumulativeTax` - Cumulative Tax Paid
- `cumulativeIRMAA` - Cumulative IRMAA
- `cumulativeCapitalGains` - Cumulative Cap Gains

## Fields That Should NOT Be Affected
- `rmdFactor` - RMD Factor (divisor, not a dollar amount)
- `rothPercent` - Roth % (percentage)
- `atLiquidationPercent` - AT Liquidation % (percentage)
- `effectiveAtReturn`, `effectiveIraReturn`, `effectiveRothReturn` - Return rates (percentages)
- `year`, `age`, `yearsFromStart` - Identifiers

---

## Testing Strategy

### Unit Tests
- Test PV calculation: `100000 / (1.03)^5 ≈ 86261`
- Test that percentages are not affected
- Test that all monetary fields are affected

### Manual Tests
1. Open Projections tab
2. Note values in FV mode
3. Toggle to PV mode
4. Verify ALL dollar amounts decreased by the expected PV factor
5. Verify percentages and factors unchanged
6. Check other tabs for consistency

---

## References
- Present Value formula: `PV = FV / (1 + r)^n`
- Default discount rate: 3% (from `params.discountRate`)
- `yearsFromStart` is 0-indexed (year 1 = 0 years from start)
