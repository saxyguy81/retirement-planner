# Calculation Inspector E2E Tests Plan

## Overview

Add automated e2e tests to verify the Calculation Inspector enhancements from the completed `calculation-inspector-enhancement.md` plan. These tests replace manual verification steps with automated Playwright tests.

## Background

The Calculation Inspector was enhanced with:
1. Step-by-step breakdown for complex calculations (Phase 3)
2. Additional calculation definitions and colors (Phase 4)

All "Manual Verification" criteria from the original plan must be covered by e2e tests.

## Test File

**File**: `e2e/ci/calculation-inspector.spec.js`

## Test Cases

### Phase 3: Step-by-Step Breakdown Tests

```javascript
test.describe('Calculation Inspector - Step-by-Step Breakdown', () => {
  test('atWithdrawal shows step-by-step breakdown', async ({ page }) => {
    // 1. Navigate to app and wait for projections to load
    // 2. Click on an atWithdrawal cell in the projections table
    // 3. Verify inspector modal opens
    // 4. Verify "Step-by-Step Calculation" section is visible
    // 5. Verify 4 steps are displayed:
    //    - Step 1: Total Cash Need
    //    - Step 2: After Social Security
    //    - Step 3: After IRA RMD
    //    - Step 4: AT Withdrawal
  });

  test('each step shows formula, values, and result', async ({ page }) => {
    // 1. Open atWithdrawal inspector
    // 2. For each step, verify:
    //    - Formula text is present (text-slate-500)
    //    - Values are present (text-amber-400)
    //    - Result is present with "=" prefix (text-emerald-400)
  });

  test('field names in steps are clickable and navigate', async ({ page }) => {
    // 1. Open atWithdrawal inspector
    // 2. Find a clickable field button in the steps (e.g., "expenses")
    // 3. Click it
    // 4. Verify inspector navigates to the expenses calculation
    // 5. Verify back button becomes enabled
    // 6. Click back and verify return to atWithdrawal
  });
});
```

### Phase 4: Complete Coverage Tests

```javascript
test.describe('Calculation Inspector - Complete Coverage', () => {
  test('costBasisBOY shows explanation and computation', async ({ page }) => {
    // 1. Click on costBasisBOY cell
    // 2. Verify inspector opens with "Cost Basis (Beginning of Year)" title
    // 3. Verify concept explanation is present
    // 4. Verify formula section shows computation
  });

  test('costBasisEOY shows proportional consumption formula', async ({ page }) => {
    // 1. Click on costBasisEOY cell
    // 2. Verify "Cost Basis (End of Year)" title
    // 3. Verify formula mentions proportional consumption
  });

  test('capitalGains shows gains ratio calculation', async ({ page }) => {
    // 1. Click on capitalGains cell
    // 2. Verify "Capital Gains" title
    // 3. Verify formula shows gains percentage calculation
  });

  test('ordinaryIncome shows sum of taxable components', async ({ page }) => {
    // 1. Click on ordinaryIncome cell
    // 2. Verify formula shows: taxableSS + iraWithdrawal + rothConversion
  });

  test('cumulativeExpenses shows running total', async ({ page }) => {
    // 1. Click on cumulativeExpenses cell (if visible in table)
    // 2. Verify "Cumulative Expenses" title
    // 3. Verify formula explains running sum
  });

  test('no field shows fallback message', async ({ page }) => {
    // 1. Click through multiple different field types
    // 2. Verify none show "Detailed explanation not yet available"
    // Fields to test: atBOY, iraBOY, rothBOY, totalTax, federalTax,
    //                 ssAnnual, expenses, rmdRequired, heirValue
  });
});
```

### Navigation Tests

```javascript
test.describe('Calculation Inspector - Navigation', () => {
  test('clicking formula variables navigates to source calculation', async ({ page }) => {
    // 1. Open totalTax inspector
    // 2. Click on "federalTax" in the formula
    // 3. Verify navigation to Federal Income Tax
    // 4. Verify back button works
  });

  test('Used By section shows correct dependencies', async ({ page }) => {
    // 1. Open ssAnnual inspector
    // 2. Verify "Used By" section shows fields that use SS
    // 3. Click one of them and verify navigation
  });
});
```

### Input Sources Tests

```javascript
test.describe('Calculation Inspector - Input Sources', () => {
  test('expenses shows input sources section', async ({ page }) => {
    // 1. Click on expenses cell
    // 2. Verify "Input Sources" section is visible
    // 3. Verify "User Inputs" badge is present
    // 4. Verify annualExpenses and expenseInflation are listed
  });

  test('first year BOY fields show starting balance inputs', async ({ page }) => {
    // 1. Click on first year atBOY cell
    // 2. Verify Input Sources shows "Starting AT Balance"
  });

  test('non-first-year BOY fields do not show input sources', async ({ page }) => {
    // 1. Click on second year atBOY cell
    // 2. Verify Input Sources section is NOT present
    // 3. Verify formula shows "atBOY = prior year atEOY"
  });
});
```

## Implementation Notes

### Test Setup

```javascript
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for projections table to be visible
  await page.waitForSelector('[data-testid="projections-table"]', { timeout: 10000 });
});
```

### Helper Functions

```javascript
async function openInspectorForField(page, fieldName, year = null) {
  // Find and click the cell for the given field
  // If year specified, find that specific year's row
  const selector = year
    ? `[data-field="${fieldName}"][data-year="${year}"]`
    : `[data-field="${fieldName}"]`;
  await page.click(selector);
  await page.waitForSelector('[data-testid="calculation-inspector"]');
}

async function verifyInspectorTitle(page, expectedTitle) {
  const title = await page.textContent('[data-testid="inspector-title"]');
  expect(title).toContain(expectedTitle);
}
```

### Data Attributes Needed

The following data attributes should be added to components for testability:

1. **ProjectionsTable**: `data-testid="projections-table"`
2. **Table cells**: `data-field="{fieldName}"` and `data-year="{year}"`
3. **CalculationInspector modal**: `data-testid="calculation-inspector"`
4. **Inspector title**: `data-testid="inspector-title"`
5. **Step-by-step section**: `data-testid="step-by-step-breakdown"`
6. **Input sources section**: `data-testid="input-sources"`
7. **Used by section**: `data-testid="used-by"`

## Changes Required

### 1. Add Data Attributes to Components

**File**: `src/components/ProjectionsTable/index.jsx`
- Add `data-testid="projections-table"` to table container
- Add `data-field` and `data-year` to clickable cells

**File**: `src/components/CalculationInspector/index.jsx`
- Add `data-testid="calculation-inspector"` to modal
- Add `data-testid="inspector-title"` to title element
- Add `data-testid="input-sources"` to input sources section
- Add `data-testid="used-by"` to used by section

**File**: `src/components/CalculationInspector/StepByStepBreakdown.jsx`
- Add `data-testid="step-by-step-breakdown"` to container

### 2. Create Test File

**File**: `e2e/ci/calculation-inspector.spec.js`
- Implement all test cases listed above

## Success Criteria

- [x] All tests pass: `npx playwright test e2e/ci/calculation-inspector.spec.js`
- [x] Tests cover all manual verification items from original plan:
  - [x] atWithdrawal step-by-step breakdown (4 steps)
  - [x] Steps show formula, values, result
  - [x] Step field names are clickable
  - [x] costBasisBOY, costBasisEOY, capitalGains, ordinaryIncome have calculations
  - [x] No fallback "not yet available" messages
- [x] Tests run in CI pipeline

## Estimated Test Count

- Step-by-step breakdown: 3 tests
- Complete coverage: 6 tests
- Navigation: 2 tests
- Input sources: 3 tests
- **Total: ~14 tests**
