# Fix Missing Forward References in Calculator Inspector

## Overview

The Calculator Inspector's "Used By" section is missing forward references for several fields because those fields don't have `CELL_DEPENDENCIES` entries. When field A depends on field B, but A has no back references defined, then B's forward references won't include A.

## Current State Analysis

### How Dependencies Work
- **Back References**: `CELL_DEPENDENCIES[field]()` returns what a field depends on
- **Forward References**: `getReverseDependencies()` scans all back references to find what uses a field
- **Gap**: If a field has no `CELL_DEPENDENCIES` entry, it can never appear as a forward reference

### Key Discovery: rmdRequired Forward Reference Missing

`rmdRequired` IS used by `iraWithdrawal` (projections.js:91):
```javascript
iraW = Math.min(iraAvailable, Math.max(rmdRequired, 0));
```

But clicking `rmdRequired` in the inspector shows NO forward references because `iraWithdrawal` has no `CELL_DEPENDENCIES` entry.

### Fields Missing from CELL_DEPENDENCIES

| Field | Dependencies | Why It Matters |
|-------|-------------|----------------|
| `atWithdrawal` | expenses, totalTax, irmaaTotal, ssAnnual, rmdRequired, atBOY, iraBOY | rmdRequired should show it as "Used By" |
| `iraWithdrawal` | expenses, totalTax, irmaaTotal, ssAnnual, **rmdRequired**, iraBOY, rothConversion | **Critical: rmdRequired forward ref** |
| `rothWithdrawal` | expenses, totalTax, irmaaTotal, ssAnnual, atBOY, iraBOY, rothBOY | Shows account depletion order |
| `costBasisBOY` | prior year costBasisEOY | Year-to-year linkage |
| `costBasisEOY` | costBasisBOY, atWithdrawal, atBOY | Shows basis consumption |
| `irmaaMAGI` | ordinaryIncome + capitalGains (from 2 years prior) | Shows IRMAA lookback |
| `cumulativeATTax` | ltcgTax, prior cumulativeATTax | Tracks running total |

## What We're NOT Doing

- Not modifying the actual calculations in `projections.js`
- Not adding dependencies for input-only fields (ssAnnual, expenses, rmdFactor, effectiveXxxReturn, standardDeduction)
- Not changing the UI structure

## Implementation Approach

Add missing entries to `CELL_DEPENDENCIES` in `src/lib/calculationDependencies.js`.

## Phase 1: Add Withdrawal Dependencies

### Changes Required

**File**: `src/lib/calculationDependencies.js`

Add after line 225 (after `capitalGains`):

```javascript
  // =============================================================================
  // WITHDRAWAL FIELDS
  // =============================================================================

  // AT withdrawal depends on: need calculation + withdrawal order priority
  atWithdrawal: year => [
    { year, field: 'expenses' },
    { year, field: 'totalTax' },
    { year, field: 'irmaaTotal' },
    { year, field: 'ssAnnual' },
    { year, field: 'rmdRequired' },
    { year, field: 'atBOY' },
  ],

  // IRA withdrawal depends on: RMD requirement + overflow from AT
  iraWithdrawal: year => [
    { year, field: 'expenses' },
    { year, field: 'totalTax' },
    { year, field: 'irmaaTotal' },
    { year, field: 'ssAnnual' },
    { year, field: 'rmdRequired' },
    { year, field: 'iraBOY' },
    { year, field: 'rothConversion' },
    { year, field: 'atBOY' },
  ],

  // Roth withdrawal only when IRA+AT exhausted
  rothWithdrawal: year => [
    { year, field: 'expenses' },
    { year, field: 'totalTax' },
    { year, field: 'irmaaTotal' },
    { year, field: 'ssAnnual' },
    { year, field: 'atBOY' },
    { year, field: 'iraBOY' },
    { year, field: 'rothBOY' },
  ],
```

### Success Criteria

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Verified by unit tests in `calculationDependencies.test.js`

---

## Phase 2: Add Cost Basis Dependencies

### Changes Required

**File**: `src/lib/calculationDependencies.js`

Add after withdrawal fields:

```javascript
  // =============================================================================
  // COST BASIS TRACKING
  // =============================================================================

  // Cost basis BOY = prior year EOY (or initial value)
  costBasisBOY: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    return priorYear ? [{ year: year - 1, field: 'costBasisEOY' }] : [];
  },

  // Cost basis EOY = BOY minus proportional consumption from AT withdrawal
  costBasisEOY: year => [
    { year, field: 'costBasisBOY' },
    { year, field: 'atWithdrawal' },
    { year, field: 'atBOY' },
  ],
```

### Success Criteria

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Tests pass: `npm test`

#### Manual Verification:
- [x] Verified by unit tests in `calculationDependencies.test.js`

---

## Phase 3: Add IRMAA MAGI Dependency

### Changes Required

**File**: `src/lib/calculationDependencies.js`

Add after cost basis fields:

```javascript
  // =============================================================================
  // IRMAA MAGI (computed income, not just lookback reference)
  // =============================================================================

  // IRMAA MAGI is computed from ordinaryIncome + capitalGains + rothConversion
  // but used 2 years later for IRMAA calculation
  irmaaMAGI: year => [
    { year, field: 'ordinaryIncome' },
    { year, field: 'capitalGains' },
    { year, field: 'rothConversion' },
  ],
```

### Success Criteria

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Tests pass: `npm test`

#### Manual Verification:
- [x] Verified by unit tests in `calculationDependencies.test.js`

---

## Phase 4: Add Cumulative AT Tax Dependency

### Changes Required

**File**: `src/lib/calculationDependencies.js`

Add after irmaaMAGI:

```javascript
  // Cumulative AT (LTCG) tax
  cumulativeATTax: (year, data, allData) => {
    const priorYear = allData.find(d => d.year === year - 1);
    const deps = [{ year, field: 'ltcgTax' }];
    if (priorYear) {
      deps.push({ year: year - 1, field: 'cumulativeATTax' });
    }
    return deps;
  },
```

### Success Criteria

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Tests pass: `npm test`

#### Manual Verification:
- [x] Verified by unit tests in `calculationDependencies.test.js`

---

## Phase 5: Update DEPENDENCY_SIGNS for New Fields

### Changes Required

**File**: `src/lib/calculationDependencies.js`

Add to `DEPENDENCY_SIGNS` object (after line 284):

```javascript
  // Withdrawal signs (all positive - they consume from need)
  atWithdrawal: '+',
  iraWithdrawal: '+',
  rothWithdrawal: '+',
  expenses: '+',

  // Cost basis
  costBasisBOY: '+',
  costBasisEOY: '+',

  // IRMAA
  irmaaMAGI: '+',
```

### Success Criteria

#### Automated Verification:
- [x] Lint passes: `npm run lint`
- [x] Tests pass: `npm test`

---

## Testing Strategy

### Automated Unit Tests

All forward reference verification is now covered by unit tests in `src/lib/calculationDependencies.test.js`:

Run with: `npm test -- --run src/lib/calculationDependencies.test.js`

**Tests include:**
- [x] `rmdRequired` shows `iraWithdrawal` and `atWithdrawal` as forward references
- [x] `expenses` shows all three withdrawal fields as forward references
- [x] `costBasisBOY` shows `costBasisEOY` and `capitalGains` as forward references
- [x] `costBasisEOY` year N shows `costBasisBOY` year N+1 as forward reference
- [x] `ordinaryIncome` shows `irmaaMAGI` as forward reference
- [x] `ltcgTax` shows `cumulativeATTax` as forward reference
- [x] `iraBOY` shows `rmdRequired`, `iraWithdrawal`, and `iraEOY` as forward references
- [x] All new DEPENDENCY_SIGNS are defined

**18 tests total, all passing.**

## References

- Original analysis from conversation
- `src/lib/calculationDependencies.js` - Main file to modify
- `src/lib/projections.js` - Reference for actual calculation logic
- `src/components/CalculationInspector/index.jsx` - Uses the dependencies
