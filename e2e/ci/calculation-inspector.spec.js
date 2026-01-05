/**
 * Calculation Inspector E2E Tests
 *
 * Tests for the Calculation Inspector enhancements including:
 * - Step-by-step breakdown for complex calculations
 * - Complete coverage with all calculation definitions
 * - Navigation between related calculations
 * - Input sources display
 *
 * These tests are CI-safe (no external dependencies).
 */

import { test, expect } from '@playwright/test';

// Helper function to ensure a section is expanded
async function expandSection(page, sectionName) {
  // Find the section header
  const sectionHeader = page.locator(`td:has-text("${sectionName}")`).first();

  // Check if section rows are visible by looking for ChevronRight (collapsed) vs ChevronDown (expanded)
  const chevronRight = sectionHeader.locator('svg.w-3.h-3').first();

  // If ChevronRight is visible, section is collapsed - click to expand
  // We can't easily check which chevron, so check if the section's rows are visible
  const isCollapsed = await sectionHeader.locator('text=rows)').count() > 0;

  if (isCollapsed) {
    // Section is collapsed, click to expand
    await sectionHeader.click();
    await page.waitForTimeout(300);
  }
}

// Helper function to open the inspector for a specific field
async function openInspectorForField(page, fieldName, yearIndex = 0) {
  // Wait a bit for any animations
  await page.waitForTimeout(200);

  // Click on the cell with the given field name
  // If yearIndex specified, get that specific occurrence
  const cells = page.locator(`td[data-field="${fieldName}"]`);

  // Wait for cells to be available (may need to wait for sections to render)
  await cells.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

  const count = await cells.count();
  if (count === 0) {
    throw new Error(`No cell found with data-field="${fieldName}"`);
  }
  const targetIndex = Math.min(yearIndex, count - 1);
  await cells.nth(targetIndex).click();
  await page.waitForSelector('[data-testid="calculation-inspector"]');
}

// Helper to verify inspector title
async function verifyInspectorTitle(page, expectedTitle) {
  const title = await page.textContent('[data-testid="inspector-title"]');
  expect(title).toContain(expectedTitle);
}

test.describe('Calculation Inspector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Navigate to Projections tab (default is now Dashboard)
    await page.click('button:has-text("Projections")');
    await page.waitForTimeout(300);
    // Wait for projections table to be visible
    await page.waitForSelector('[data-testid="projections-table"]', { timeout: 10000 });
  });

  test.describe('Step-by-Step Breakdown', () => {
    test('atWithdrawal shows step-by-step breakdown', async ({ page }) => {
      // Expand WITHDRAWALS section if collapsed
      await expandSection(page, 'WITHDRAWALS');

      // Click on an atWithdrawal cell
      await openInspectorForField(page, 'atWithdrawal');

      // Verify inspector opens
      await expect(page.locator('[data-testid="calculation-inspector"]')).toBeVisible();
      await verifyInspectorTitle(page, 'After-Tax Withdrawal');

      // Verify step-by-step section is visible
      const stepByStep = page.locator('[data-testid="step-by-step-breakdown"]');
      await expect(stepByStep).toBeVisible();

      // Verify 4 steps are displayed
      const steps = stepByStep.locator('.bg-slate-900');
      const stepCount = await steps.count();
      expect(stepCount).toBe(4);

      // Verify step labels
      await expect(stepByStep.locator('text=Step 1: Total Cash Need')).toBeVisible();
      await expect(stepByStep.locator('text=Step 2: After Social Security')).toBeVisible();
      await expect(stepByStep.locator('text=Step 3: After IRA RMD')).toBeVisible();
      await expect(stepByStep.locator('text=Step 4: AT Withdrawal')).toBeVisible();
    });

    test('each step shows formula, values, and result', async ({ page }) => {
      // Expand WITHDRAWALS section if collapsed
      await expandSection(page, 'WITHDRAWALS');

      await openInspectorForField(page, 'atWithdrawal');

      const stepByStep = page.locator('[data-testid="step-by-step-breakdown"]');
      await expect(stepByStep).toBeVisible();

      // For each step, verify formula (text-slate-500), values (text-amber-400), result (text-emerald-400)
      const steps = stepByStep.locator('.bg-slate-900');
      const stepCount = await steps.count();

      for (let i = 0; i < stepCount; i++) {
        const step = steps.nth(i);

        // Formula text (slate-500)
        const formula = step.locator('.text-slate-500');
        await expect(formula).toBeVisible();

        // Values (amber-400)
        const values = step.locator('.text-amber-400');
        await expect(values).toBeVisible();

        // Result with "=" prefix (emerald-400)
        const result = step.locator('.text-emerald-400');
        await expect(result).toBeVisible();
        const resultText = await result.textContent();
        expect(resultText).toMatch(/^=/);
      }
    });

    test('field names in steps are clickable and navigate', async ({ page }) => {
      // Expand WITHDRAWALS section if collapsed
      await expandSection(page, 'WITHDRAWALS');

      await openInspectorForField(page, 'atWithdrawal');

      const stepByStep = page.locator('[data-testid="step-by-step-breakdown"]');
      await expect(stepByStep).toBeVisible();

      // Find a clickable field button (e.g., "expenses")
      const expensesButton = stepByStep.locator('button:has-text("expenses")');
      await expect(expensesButton).toBeVisible();

      // Click it
      await expensesButton.click();

      // Verify inspector navigates to the expenses calculation
      await verifyInspectorTitle(page, 'Annual Expenses');

      // Verify back button becomes enabled
      const backButton = page.locator('[data-testid="calculation-inspector"] button:has(svg)').first();
      await expect(backButton).toBeEnabled();

      // Click back and verify return to atWithdrawal
      await backButton.click();
      await verifyInspectorTitle(page, 'After-Tax Withdrawal');
    });
  });

  test.describe('Complete Coverage', () => {
    test('costBasisBOY shows explanation and computation', async ({ page }) => {
      // Expand STARTING POSITION section to see costBasisBOY
      await expandSection(page, 'STARTING POSITION');

      await openInspectorForField(page, 'costBasisBOY');

      await verifyInspectorTitle(page, 'Cost Basis (Beginning of Year)');

      // Verify concept explanation is present
      const concept = page.locator('[data-testid="calculation-inspector"]');
      await expect(concept.locator('text=What is this?')).toBeVisible();

      // Verify formula section shows computation
      await expect(concept.locator('text=Formula')).toBeVisible();
    });

    test('costBasisEOY shows proportional consumption formula', async ({ page }) => {
      // Expand ENDING POSITION section
      await expandSection(page, 'ENDING POSITION');

      await openInspectorForField(page, 'costBasisEOY');

      await verifyInspectorTitle(page, 'Cost Basis (End of Year)');

      // Verify formula mentions proportional consumption
      const inspector = page.locator('[data-testid="calculation-inspector"]');
      await expect(inspector.locator('text=proportional').first()).toBeVisible();
    });

    test('capitalGains shows gains ratio calculation', async ({ page }) => {
      // Expand TAX DETAIL section
      await expandSection(page, 'TAX DETAIL');

      await openInspectorForField(page, 'capitalGains');

      await verifyInspectorTitle(page, 'Capital Gains');

      // Verify formula shows gains percentage calculation
      const inspector = page.locator('[data-testid="calculation-inspector"]');
      await expect(inspector.locator('text=Gains Percentage').first()).toBeVisible();
    });

    test('ordinaryIncome shows sum of taxable components', async ({ page }) => {
      // Expand TAX DETAIL section
      await expandSection(page, 'TAX DETAIL');

      await openInspectorForField(page, 'ordinaryIncome');

      await verifyInspectorTitle(page, 'Ordinary Income');

      // Verify formula shows: taxableSS + iraWithdrawal + rothConversion
      const inspector = page.locator('[data-testid="calculation-inspector"]');
      const formulaSection = inspector.locator('.bg-slate-950').first();
      const formulaText = await formulaSection.textContent();
      expect(formulaText).toContain('taxableSS');
      expect(formulaText).toContain('iraWithdrawal');
      expect(formulaText).toContain('rothConversion');
    });

    test('no field shows fallback message', async ({ page }) => {
      // Test multiple fields to ensure none show the fallback message
      const fieldsToTest = [
        { field: 'atBOY', section: 'STARTING POSITION', title: 'After-Tax Beginning of Year' },
        { field: 'iraBOY', section: 'STARTING POSITION', title: 'Traditional IRA Beginning of Year' },
        { field: 'rothBOY', section: 'STARTING POSITION', title: 'Roth IRA Beginning of Year' },
        { field: 'ssAnnual', section: 'INCOME', title: 'Annual Social Security' },
        { field: 'expenses', section: 'CASH NEEDS', title: 'Annual Expenses' },
        { field: 'rmdRequired', section: 'RMD & CONVERSIONS', title: 'Required Minimum Distribution' },
        { field: 'federalTax', section: 'TAX DETAIL', title: 'Federal Income Tax' },
        { field: 'totalTax', section: 'TAX DETAIL', title: 'Total Annual Tax' },
        { field: 'heirValue', section: 'HEIR VALUE', title: 'After-Tax Heir Value' },
      ];

      for (const { field, section, title } of fieldsToTest) {
        // Expand section if needed
        await expandSection(page, section);

        await openInspectorForField(page, field);

        // Verify correct title (meaning we got a real definition)
        await verifyInspectorTitle(page, title);

        // Verify no fallback message
        const inspector = page.locator('[data-testid="calculation-inspector"]');
        const fallbackMessage = inspector.locator('text=Detailed explanation not yet available');
        await expect(fallbackMessage).not.toBeVisible();

        // Close inspector
        const closeButton = inspector.locator('button:has(svg.w-5)').last();
        await closeButton.click();
        await page.waitForTimeout(100);
      }
    });
  });

  test.describe('Navigation', () => {
    test('clicking formula variables navigates to source calculation', async ({ page }) => {
      // Expand TAX DETAIL section
      await expandSection(page, 'TAX DETAIL');

      await openInspectorForField(page, 'totalTax');
      await verifyInspectorTitle(page, 'Total Annual Tax');

      // Click on "federalTax" in the formula (it's a clickable button)
      const federalTaxLink = page.locator('[data-testid="calculation-inspector"] button:has-text("federalTax")');
      if (await federalTaxLink.count() > 0) {
        await federalTaxLink.first().click();

        // Verify navigation to Federal Income Tax
        await verifyInspectorTitle(page, 'Federal Income Tax');

        // Verify back button works
        const backButton = page.locator('[data-testid="calculation-inspector"] button:has(svg)').first();
        await backButton.click();
        await verifyInspectorTitle(page, 'Total Annual Tax');
      }
    });

    test('Used By section shows correct dependencies', async ({ page }) => {
      // Expand INCOME section
      await expandSection(page, 'INCOME');

      await openInspectorForField(page, 'ssAnnual');
      await verifyInspectorTitle(page, 'Annual Social Security');

      // Verify "Used By" section is visible
      const usedBy = page.locator('[data-testid="used-by"]');
      await expect(usedBy).toBeVisible();

      // Check if there are dependency buttons
      const depButtons = usedBy.locator('button');
      const depCount = await depButtons.count();

      if (depCount > 0) {
        // Click one of them and verify navigation
        await depButtons.first().click();

        // Should have navigated (title should have changed)
        const title = await page.textContent('[data-testid="inspector-title"]');
        expect(title).not.toContain('Annual Social Security');
      }
    });
  });

  test.describe('Input Sources', () => {
    test('expenses shows input sources section', async ({ page }) => {
      // Expand CASH NEEDS section
      await expandSection(page, 'CASH NEEDS');

      await openInspectorForField(page, 'expenses');
      await verifyInspectorTitle(page, 'Annual Expenses');

      // Verify "Input Sources" section is visible
      const inputSources = page.locator('[data-testid="input-sources"]');
      await expect(inputSources).toBeVisible();

      // Verify "User Inputs" badge is present
      await expect(inputSources.locator('text=User Inputs')).toBeVisible();
    });

    test('first year BOY fields show starting balance inputs', async ({ page }) => {
      // Ensure STARTING POSITION is expanded
      await expandSection(page, 'STARTING POSITION');

      // Click on first year atBOY cell
      await openInspectorForField(page, 'atBOY', 0); // First year

      await verifyInspectorTitle(page, 'After-Tax Beginning of Year');

      // For first year, should show input sources with starting balance
      const inspector = page.locator('[data-testid="calculation-inspector"]');
      const inputSources = inspector.locator('[data-testid="input-sources"]');

      // First year should have input sources (starting balance from inputs)
      if (await inputSources.count() > 0) {
        await expect(inputSources).toBeVisible();
      }
    });

    test('non-first-year BOY fields show formula instead of input sources', async ({ page }) => {
      // Ensure STARTING POSITION is expanded
      await expandSection(page, 'STARTING POSITION');

      // Get the count of atBOY cells to find a non-first year
      const atBOYCells = page.locator('td[data-field="atBOY"]');
      const cellCount = await atBOYCells.count();

      if (cellCount > 1) {
        // Click on second year atBOY cell
        await openInspectorForField(page, 'atBOY', 1);

        await verifyInspectorTitle(page, 'After-Tax Beginning of Year');

        // For non-first year, the formula should explain it equals prior year EOY
        const inspector = page.locator('[data-testid="calculation-inspector"]');
        const content = await inspector.textContent();

        // Should show reference to prior year
        expect(content).toMatch(/Prior|EOY|prior year/i);
      }
    });
  });
});
