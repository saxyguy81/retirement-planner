# Present Value / Future Value Override Selector

## STATUS: ✅ COMPLETED (2026-01-04)

## Overview

Add per-override PV/FV selectors to year-specific overrides (expenses, Roth conversions, AT harvest). Users can choose whether to enter amounts in today's dollars (PV) or future nominal dollars (FV). Default to PV for consistency with base input fields.

## Current State Analysis

All three override types currently store raw amounts interpreted as nominal (FV) dollars:

```javascript
// taxTables.js:326-338
expenseOverrides: {},    // { [year]: amount }
rothConversions: {},     // { [year]: amount }
atHarvestOverrides: {},  // { [year]: amount }
```

When applied in `projections.js:277-280`:
```javascript
let expenses = p.expenseOverrides?.[year]
  ? p.expenseOverrides[year]  // Used directly as nominal
  : p.annualExpenses * Math.pow(1 + p.expenseInflation, yearsFromStart);
```

## Desired End State

1. Each override stores `{ amount, isPV }` instead of just `amount`
2. New overrides default to `isPV: true` (Present Value)
3. UI shows a toggle per override and displays the converted equivalent
4. Legacy number-only overrides are treated as FV for backward compatibility

**Verification:**
- Existing saved states load without error and produce identical results
- New overrides entered in PV are correctly inflated in calculations
- UI displays both entered value and computed equivalent

## What We're NOT Doing

- No global PV/FV input mode (each override has its own toggle)
- No changes to the display-side PV toggle (that remains independent)
- No changes to base inputs like `annualExpenses` (already implicitly PV)

## Implementation Approach

Use object values for all overrides:
- All values use `{amount, isPV}` format
- No backward compatibility with plain number format required

---

## Phase 1: Data Model & Calculation Logic

### Overview
Update data structures and calculation engine to support PV/FV flag per override.

### Changes Required:

#### 1. Add Helper Functions
**File**: `src/lib/projections.js`
**Changes**: Add helper to parse override values

```javascript
/**
 * Parse an override value in new format ({amount, isPV})
 * @param {{amount: number, isPV: boolean}} override - The override value
 * @param {number} yearsFromStart - Years from projection start
 * @param {number} inflationRate - Annual inflation rate for PV conversion
 * @returns {number|null} The nominal (FV) amount to use in calculations
 */
function resolveOverride(override, yearsFromStart, inflationRate) {
  if (override === undefined || override === null) return null;

  const { amount, isPV } = override;
  if (isPV) {
    // Convert PV to FV by inflating
    return amount * Math.pow(1 + inflationRate, yearsFromStart);
  }
  return amount;
}
```

#### 2. Update Expense Override Usage
**File**: `src/lib/projections.js` (line ~277-280)
**Changes**: Use `resolveOverride` for expense overrides

```javascript
// Before:
let expenses =
  p.expenseOverrides && p.expenseOverrides[year]
    ? p.expenseOverrides[year]
    : p.annualExpenses * Math.pow(1 + p.expenseInflation, yearsFromStart);

// After:
const expenseOverrideValue = resolveOverride(
  p.expenseOverrides?.[year],
  yearsFromStart,
  p.expenseInflation
);
let expenses = expenseOverrideValue !== null
  ? expenseOverrideValue
  : p.annualExpenses * Math.pow(1 + p.expenseInflation, yearsFromStart);
```

#### 3. Update Roth Conversion Usage
**File**: `src/lib/projections.js` (line ~300)
**Changes**: Use `resolveOverride` for Roth conversions

```javascript
// Before:
const requestedRothConversion = p.rothConversions[year] || 0;

// After:
const requestedRothConversion = resolveOverride(
  p.rothConversions?.[year],
  yearsFromStart,
  p.expenseInflation  // Use same inflation rate for consistency
) || 0;
```

#### 4. Update AT Harvest Override Usage
**File**: `src/lib/projections.js` (line ~289)
**Changes**: Use `resolveOverride` for AT harvest overrides

```javascript
// Before:
const atHarvestOverride = p.atHarvestOverrides?.[year] || 0;

// After:
const atHarvestOverride = resolveOverride(
  p.atHarvestOverrides?.[year],
  yearsFromStart,
  p.expenseInflation
) || 0;
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm test` - all existing projection tests pass (backward compatibility)
- [ ] `npm run build` - builds without errors
- [ ] `npm run lint` - no linting errors

#### Manual Verification:
- [ ] Load an existing saved state with overrides - values unchanged
- [ ] Calculations produce identical results for legacy data

---

## Phase 2: State Update Functions

### Overview
Update the update functions in `useProjections.js` to handle the new object format.

### Changes Required:

#### 1. Update `updateExpenseOverride`
**File**: `src/hooks/useProjections.js` (lines ~210-218)
**Changes**: Accept optional `isPV` parameter, default to `true`

```javascript
const updateExpenseOverride = useCallback((year, amount, isPV = true) => {
  setParams(prev => {
    const newOverrides = { ...prev.expenseOverrides };
    if (amount === null || amount === 0) {
      delete newOverrides[year];
    } else {
      newOverrides[year] = { amount, isPV };
    }
    return { ...prev, expenseOverrides: newOverrides };
  });
}, []);
```

#### 2. Update `updateRothConversion`
**File**: `src/hooks/useProjections.js` (lines ~196-207)
**Changes**: Accept optional `isPV` parameter, default to `true`

```javascript
const updateRothConversion = useCallback((year, amount, isPV = true) => {
  setParams(prev => {
    const newConversions = { ...prev.rothConversions };
    if (amount === null || amount === 0) {
      delete newConversions[year];
    } else {
      newConversions[year] = { amount, isPV };
    }
    return { ...prev, rothConversions: newConversions };
  });
}, []);
```

#### 3. Update `updateATHarvest`
**File**: `src/hooks/useProjections.js` (lines ~222-233)
**Changes**: Accept optional `isPV` parameter, default to `true`

```javascript
const updateATHarvest = useCallback((year, amount, isPV = true) => {
  setParams(prev => {
    const newOverrides = { ...(prev.atHarvestOverrides || {}) };
    if (amount === null || amount === 0) {
      delete newOverrides[year];
    } else {
      newOverrides[year] = { amount, isPV };
    }
    return { ...prev, atHarvestOverrides: newOverrides };
  });
}, []);
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm test` - unit tests pass
- [ ] `npm run build` - builds without errors

#### Manual Verification:
- [ ] Creating a new override stores `{ amount, isPV: true }` format

---

## Phase 3: UI Components

### Overview
Update InputPanel to show PV/FV toggle per override and display converted equivalent.

### Changes Required:

#### 1. Add Helper to Extract Override Data
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Add helper function near top of component

```javascript
// Helper to extract amount and isPV from override (handles legacy format)
const parseOverride = (override) => {
  if (typeof override === 'number') {
    return { amount: override, isPV: false }; // Legacy = FV
  }
  return override; // { amount, isPV }
};

// Helper to compute converted value
const computeEquivalent = (amount, isPV, year, startYear, inflationRate) => {
  const yearsFromStart = year - startYear;
  if (isPV) {
    // PV entered, show FV equivalent
    return amount * Math.pow(1 + inflationRate, yearsFromStart);
  } else {
    // FV entered, show PV equivalent
    return amount / Math.pow(1 + inflationRate, yearsFromStart);
  }
};
```

#### 2. Update Expense Override Display (lines ~479-515)
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Add PV/FV toggle and equivalent display

```jsx
{Object.entries(params.expenseOverrides || {})
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([year, override]) => {
    const { amount, isPV } = parseOverride(override);
    const yearsFromStart = Number(year) - params.startYear;
    const equivalent = computeEquivalent(
      amount, isPV, Number(year), params.startYear, params.expenseInflation
    );

    return (
      <div key={year} className="flex items-center gap-1 py-0.5">
        <span className="text-slate-400 text-xs w-10">{year}</span>
        <input
          type="text"
          value={
            editingInput.key === `expense-${year}`
              ? editingInput.value
              : `$${amount.toLocaleString()}`
          }
          onFocus={() =>
            setEditingInput({ key: `expense-${year}`, value: amount.toString() })
          }
          onChange={e =>
            setEditingInput({ key: `expense-${year}`, value: e.target.value })
          }
          onBlur={() => {
            const parsed = parseFloat(editingInput.value.replace(/[,$]/g, ''));
            if (!isNaN(parsed) && parsed > 0) {
              updateExpenseOverride(Number(year), parsed, isPV);
            }
            setEditingInput({ key: null, value: '' });
          }}
          onKeyDown={e => e.key === 'Enter' && e.target.blur()}
          className="flex-1 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
        />
        {/* PV/FV Toggle */}
        <button
          onClick={() => updateExpenseOverride(Number(year), amount, !isPV)}
          className={`px-1.5 py-0.5 text-[10px] rounded ${
            isPV
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}
          title={isPV ? "Present Value (today's dollars)" : "Future Value (nominal)"}
        >
          {isPV ? 'PV' : 'FV'}
        </button>
        {/* Equivalent display */}
        <span className="text-slate-500 text-[10px] w-16 text-right">
          {isPV ? 'FV' : 'PV'}: ${Math.round(equivalent / 1000)}K
        </span>
        <button
          onClick={() => updateExpenseOverride(Number(year), null)}
          className="p-0.5 text-slate-500 hover:text-red-400"
          title="Remove override"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  })}
```

#### 3. Update "Add Override" Default
**File**: `src/components/InputPanel/index.jsx` (line ~538)
**Changes**: New overrides default to `isPV: true`

```jsx
onClick={() => {
  const year = parseInt(newExpenseYear);
  if (year >= 2026 && year <= 2060 && !params.expenseOverrides?.[year]) {
    updateExpenseOverride(year, params.annualExpenses, true); // isPV = true
    setNewExpenseYear('');
  }
}}
```

#### 4. Apply Same Pattern to Roth Conversions (lines ~640-719)
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Same UI pattern - PV/FV toggle and equivalent display

#### 5. Apply Same Pattern to AT Harvest Overrides (lines ~721-801)
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Same UI pattern - PV/FV toggle and equivalent display

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` - builds without errors
- [ ] `npm run lint` - no linting errors
- [ ] `npm run test:e2e` - E2E tests pass

#### Manual Verification:
- [ ] New expense override shows PV toggle (defaulted on)
- [ ] Clicking PV/FV toggle switches mode and recalculates equivalent
- [ ] Equivalent value displays correctly (e.g., "$150K PV in 2035 → FV: $217K")
- [ ] Editing amount preserves current PV/FV mode
- [ ] All three override types (expense, Roth, AT harvest) work consistently

---

## Phase 4: Unit Tests

### Overview
Add tests for the new `resolveOverride` function and backward compatibility.

### Changes Required:

#### 1. Add Tests for resolveOverride
**File**: `src/lib/projections.test.js`
**Changes**: Add new test suite

```javascript
describe('resolveOverride', () => {
  it('returns null for undefined/null', () => {
    expect(resolveOverride(undefined, 5, 0.03)).toBeNull();
    expect(resolveOverride(null, 5, 0.03)).toBeNull();
  });

  it('treats plain number as FV (legacy format)', () => {
    // 150000 FV should return 150000 unchanged
    expect(resolveOverride(150000, 5, 0.03)).toBe(150000);
  });

  it('returns FV amount unchanged when isPV is false', () => {
    const override = { amount: 150000, isPV: false };
    expect(resolveOverride(override, 5, 0.03)).toBe(150000);
  });

  it('inflates PV amount to FV when isPV is true', () => {
    const override = { amount: 150000, isPV: true };
    const result = resolveOverride(override, 10, 0.03);
    const expected = 150000 * Math.pow(1.03, 10);
    expect(result).toBeCloseTo(expected, 2);
  });

  it('returns amount unchanged for year 0 regardless of isPV', () => {
    expect(resolveOverride({ amount: 150000, isPV: true }, 0, 0.03)).toBe(150000);
    expect(resolveOverride({ amount: 150000, isPV: false }, 0, 0.03)).toBe(150000);
  });
});
```

#### 2. Add Integration Tests
**File**: `src/lib/projections.test.js`
**Changes**: Test that projections use overrides correctly

```javascript
describe('projection overrides with PV/FV', () => {
  it('applies FV expense override directly (legacy)', () => {
    const params = {
      ...DEFAULT_PARAMS,
      startYear: 2026,
      expenseOverrides: { 2030: 180000 }, // Legacy FV
    };
    const projections = generateProjections(params);
    const year2030 = projections.find(p => p.year === 2030);
    expect(year2030.expenses).toBe(180000);
  });

  it('inflates PV expense override to correct FV', () => {
    const params = {
      ...DEFAULT_PARAMS,
      startYear: 2026,
      annualExpenses: 150000,
      expenseInflation: 0.03,
      expenseOverrides: { 2030: { amount: 150000, isPV: true } },
    };
    const projections = generateProjections(params);
    const year2030 = projections.find(p => p.year === 2030);
    const expectedFV = 150000 * Math.pow(1.03, 4); // 4 years from 2026
    expect(year2030.expenses).toBeCloseTo(expectedFV, 0);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm test` - all new and existing tests pass
- [ ] Test coverage for `resolveOverride` function

---

## Testing Strategy

### Unit Tests:
- `resolveOverride` function with all input variants
- Backward compatibility with legacy number format
- Correct inflation calculation for PV → FV

### Integration Tests:
- Full projection generation with mixed PV/FV overrides
- Verify expenses, Roth conversions, AT harvests all resolve correctly

### Manual Testing Steps:
1. Load existing saved state with legacy overrides - verify no behavior change
2. Add new expense override - verify defaults to PV
3. Toggle PV/FV - verify equivalent updates correctly
4. Check 2035 with $150K PV shows ~$217K FV equivalent (at 3% inflation from 2026)
5. Verify calculations use correct inflated values

## Migration Notes

**Backward Compatibility: NOT REQUIRED**
- All overrides will use the new `{ [year]: { amount, isPV } }` format only
- Legacy plain number format is not supported
- Existing saved states with old format will need to be re-entered

## References

- Current override implementation: `src/lib/projections.js:277-303`
- State update functions: `src/hooks/useProjections.js:196-233`
- UI components: `src/components/InputPanel/index.jsx:473-552`
- PV utilities: `src/lib/pvUtils.js`
