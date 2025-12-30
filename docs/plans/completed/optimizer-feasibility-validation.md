# Optimizer Feasibility Validation Implementation Plan

## Overview

The optimizer currently generates Roth conversion strategies without validating whether the IRA has sufficient funds. A strategy requesting $1.2M conversions annually will silently fail when the IRA only has $500K, executing a partial conversion but labeling it as the full amount. This makes strategy comparison meaningless.

## Current State Analysis

### The Problem (projections.js:350)
```javascript
const iraAfterWithdrawal = iraBOY - withdrawal.iraWithdrawal - rothConversion;
// When rothConversion > iraBOY, this goes negative
const iraEOY = Math.max(0, iraAfterWithdrawal * (1 + effectiveIraReturn));
// Floored to 0, hiding the fact that conversion was capped
```

### Key Discoveries:
- `projections.js:350` - Conversions are subtracted without validation
- `projections.js:355` - Negative balances are silently floored to 0
- `Optimization/index.jsx:135` - Test amounts go up to $1.2M regardless of IRA balance
- No tracking exists for actual vs requested conversion amounts

## Desired End State

After implementation:
1. Roth conversions are **capped to available IRA balance** (after RMD withdrawal)
2. Each projection year tracks **requested vs actual** conversion amounts
3. Projection summary includes **conversion feasibility metrics**
4. Optimizer displays **actual conversion amounts** and flags partial execution
5. Strategy labels show **real numbers**, not requested amounts

### Verification:
- Unit tests verify conversion capping logic
- Optimizer shows "Actual: $X" when different from requested
- Strategies that exhaust IRA show clear indication

## What We're NOT Doing

- Not preventing users from manually entering infeasible conversions (just tracking what happens)
- Not changing the optimization algorithm itself
- Not adding new optimization objectives
- Not modifying tax calculations

## Implementation Approach

Track actual conversions at the projection level, then surface that information in the optimizer UI.

---

## Phase 1: Cap Conversions in Projections Engine

### Overview
Modify `generateProjections()` to cap Roth conversions to available IRA balance and track the difference.

### Changes Required

**File**: `src/lib/projections.js`

#### 1. Cap conversion to available IRA (around line 273-275)
```javascript
// Current:
const rothConversion = p.rothConversions[year] || 0;

// New:
const requestedRothConversion = p.rothConversions[year] || 0;
// Cap to available IRA after RMD (RMD must be withdrawn first)
const maxConversion = Math.max(0, iraBOY - rmd.required);
const actualRothConversion = Math.min(requestedRothConversion, maxConversion);
const conversionCapped = requestedRothConversion > actualRothConversion;
```

#### 2. Use actualRothConversion throughout (update all references)
Replace `rothConversion` with `actualRothConversion` in:
- Line 312-324: `calculateWithdrawals` inputs
- Line 350-351: EOY balance calculations
- Line 364: MAGI history update

#### 3. Add conversion tracking to year output (around line 449-450)
```javascript
// Add to results.push({...}):
rothConversionRequested: requestedRothConversion,
rothConversionActual: actualRothConversion,
rothConversionCapped: conversionCapped,
```

### Success Criteria

#### Automated Verification:
- [x] All existing tests pass: `npm test`
- [x] Lint passes: `npm run lint`
- [x] Build succeeds: `npm run build`

#### Unit Tests to Add:
- [x] Test conversion caps when IRA < requested
- [x] Test conversion caps after RMD deduction
- [x] Test tracking of requested vs actual amounts

---

## Phase 2: Add Conversion Feasibility to Summary

### Overview
Add aggregated feasibility metrics to `calculateSummary()`.

### Changes Required

**File**: `src/lib/projections.js`

#### 1. Add feasibility metrics to calculateSummary (around line 529)
```javascript
export function calculateSummary(projections) {
  const first = projections[0];
  const last = projections[projections.length - 1];

  // Calculate conversion feasibility
  const totalRequested = projections.reduce((sum, p) => sum + (p.rothConversionRequested || 0), 0);
  const totalActual = projections.reduce((sum, p) => sum + (p.rothConversionActual || 0), 0);
  const cappedYears = projections.filter(p => p.rothConversionCapped).map(p => p.year);
  const firstCappedYear = cappedYears.length > 0 ? cappedYears[0] : null;

  return {
    // ... existing fields ...

    // Conversion feasibility
    totalConversionRequested: totalRequested,
    totalConversionActual: totalActual,
    conversionShortfall: totalRequested - totalActual,
    conversionFeasibilityPercent: totalRequested > 0 ? totalActual / totalRequested : 1,
    conversionCappedYears: cappedYears,
    firstConversionCappedYear: firstCappedYear,
    isFullyFeasible: cappedYears.length === 0,
  };
}
```

### Success Criteria

#### Automated Verification:
- [x] All existing tests pass: `npm test`
- [x] Summary includes feasibility metrics

#### Unit Tests to Add:
- [x] Test summary with fully feasible strategy
- [x] Test summary with partially feasible strategy (caps in later years)
- [x] Test summary with fully infeasible strategy

---

## Phase 3: Update Optimizer to Display Actual Amounts

### Overview
Modify the Optimization component to show actual conversion amounts and feasibility warnings.

### Changes Required

**File**: `src/components/Optimization/index.jsx`

#### 1. Update scenario evaluation to capture feasibility (around line 144-155)
```javascript
const evaluated = scenarios.map(scenario => {
  const testParams = { ...params, rothConversions: scenario.conversions };
  const proj = generateProjections(testParams);
  const sum = calculateSummary(proj);

  // Calculate actual conversion label
  const actualLabel = sum.isFullyFeasible
    ? scenario.label
    : `${scenario.label} → Actual: ${fmt$(sum.totalConversionActual)}`;

  return {
    ...scenario,
    projections: proj,
    summary: sum,
    score: sum[objective.metric],
    // New feasibility tracking
    actualLabel,
    isFullyFeasible: sum.isFullyFeasible,
    feasibilityPercent: sum.conversionFeasibilityPercent,
    firstCappedYear: sum.firstConversionCappedYear,
    totalRequested: sum.totalConversionRequested,
    totalActual: sum.totalConversionActual,
  };
});
```

#### 2. Update best result display (around line 370-418)
Add feasibility warning when strategy is capped:
```javascript
{!results.best.isFullyFeasible && (
  <div className="mt-2 px-2 py-1 bg-amber-900/30 rounded text-amber-300 text-xs">
    ⚠️ Strategy capped: Requested {fmt$(results.best.totalRequested)},
    actual {fmt$(results.best.totalActual)}
    ({fmtPct(results.best.feasibilityPercent)} feasible)
    {results.best.firstCappedYear && ` - IRA depleted starting ${results.best.firstCappedYear}`}
  </div>
)}
```

#### 3. Update results table to show actual amounts (around line 486)
```javascript
<td className="py-2 px-3 text-slate-300">
  {s.isFullyFeasible ? (
    s.label
  ) : (
    <span className="flex items-center gap-1">
      <span className="text-amber-400">⚠️</span>
      {s.actualLabel}
    </span>
  )}
</td>
```

#### 4. Add column for feasibility in table header (optional enhancement)
```javascript
<th className="py-2 px-3 text-slate-400 font-normal text-center">Feasible</th>
// ...
<td className="py-2 px-3 text-center">
  {s.isFullyFeasible ? (
    <span className="text-emerald-400">✓</span>
  ) : (
    <span className="text-amber-400" title={`${fmtPct(s.feasibilityPercent)} feasible`}>
      {fmtPct(s.feasibilityPercent)}
    </span>
  )}
</td>
```

### Success Criteria

#### Automated Verification:
- [x] Build succeeds: `npm run build`
- [x] Lint passes: `npm run lint`

#### Manual Verification (to be automated via e2e):
- [x] Infeasible strategies show warning badge
- [x] Actual amounts displayed when different from requested
- [x] First capped year shown for partial feasibility

---

## Phase 4: Add Unit Tests for Feasibility

### Overview
Add comprehensive tests for the new feasibility tracking.

### Changes Required

**File**: `src/lib/projections.test.js`

Add new test section:
```javascript
describe('Roth conversion feasibility', () => {
  it('should cap conversion to available IRA balance', () => {
    const params = {
      ...DEFAULT_PARAMS,
      iraStart: 500000,
      rothConversions: { 2026: 1000000 }, // Request more than available
    };
    const projections = generateProjections(params);
    const year2026 = projections[0];

    expect(year2026.rothConversionRequested).toBe(1000000);
    expect(year2026.rothConversionActual).toBeLessThanOrEqual(500000);
    expect(year2026.rothConversionCapped).toBe(true);
  });

  it('should allow full conversion when IRA has sufficient balance', () => {
    const params = {
      ...DEFAULT_PARAMS,
      iraStart: 2000000,
      rothConversions: { 2026: 500000 },
    };
    const projections = generateProjections(params);
    const year2026 = projections[0];

    expect(year2026.rothConversionRequested).toBe(500000);
    expect(year2026.rothConversionActual).toBe(500000);
    expect(year2026.rothConversionCapped).toBe(false);
  });

  it('should reserve IRA balance for RMD before conversion', () => {
    const params = {
      ...DEFAULT_PARAMS,
      iraStart: 500000,
      birthYear: 1952, // Age 73+ triggers RMD
      startYear: 2026,
      rothConversions: { 2026: 500000 },
    };
    const projections = generateProjections(params);
    const year2026 = projections[0];

    // Conversion should be capped to IRA - RMD
    expect(year2026.rothConversionActual).toBeLessThan(500000);
    expect(year2026.rothConversionCapped).toBe(true);
  });

  it('should track feasibility in summary', () => {
    const params = {
      ...DEFAULT_PARAMS,
      iraStart: 500000,
      rothConversions: { 2026: 300000, 2027: 300000 }, // Total 600K > 500K IRA
    };
    const projections = generateProjections(params);
    const summary = calculateSummary(projections);

    expect(summary.totalConversionRequested).toBe(600000);
    expect(summary.totalConversionActual).toBeLessThan(600000);
    expect(summary.isFullyFeasible).toBe(false);
    expect(summary.conversionCappedYears.length).toBeGreaterThan(0);
  });

  it('should identify first capped year for partial feasibility', () => {
    const params = {
      ...DEFAULT_PARAMS,
      iraStart: 1000000,
      rothConversions: { 2026: 300000, 2027: 300000, 2028: 300000, 2029: 300000 },
    };
    const projections = generateProjections(params);
    const summary = calculateSummary(projections);

    // First few years should be feasible, later years capped
    expect(summary.firstConversionCappedYear).toBeGreaterThan(2026);
  });
});
```

### Success Criteria

#### Automated Verification:
- [x] All new tests pass: `npm test`
- [x] Test coverage for conversion capping
- [x] Test coverage for summary feasibility metrics

---

## Testing Strategy

### Unit Tests:
- Conversion capping when IRA < requested
- RMD reservation before conversion
- Multi-year feasibility tracking
- Summary aggregation of feasibility metrics

### Integration Tests:
- Run optimizer with strategies that exceed IRA balance
- Verify actual amounts displayed correctly

### Manual Testing Steps:
1. Start app with default params (IRA ~$1.5M)
2. Run optimizer with all years selected
3. Verify "$1.2M/yr" strategies show actual amounts
4. Check that feasibility warnings appear for capped strategies
5. Apply a capped strategy and verify the projections reflect actual amounts

## Performance Considerations

- No significant performance impact - just adding a few comparisons per year
- Summary calculations are O(n) where n = number of projection years

## Migration Notes

- Existing saved scenarios will work unchanged
- New fields added to projection output (backwards compatible)
- Summary gains new fields (backwards compatible)

## References

- `src/lib/projections.js:350` - Current conversion handling
- `src/components/Optimization/index.jsx:135` - Test amounts array
- `src/lib/projections.js:529` - Summary calculation
