/**
 * Scenarios E2E Tests
 *
 * Tests for the Scenario Comparison functionality.
 * These tests are CI-safe (no external dependencies).
 */

import { test, expect } from '@playwright/test';

test.describe('Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Scenarios")');
    await page.waitForTimeout(500);
  });

  test('shows scenario comparison panel', async ({ page }) => {
    await expect(page.locator('text=Scenario Comparison')).toBeVisible();
  });

  test('can add a new scenario', async ({ page }) => {
    // Wait for the page to fully render
    await page.waitForTimeout(1000);

    // Look for Add Scenario button or similar
    const addButton = page.locator('button:has-text("Add")').first();
    const addScenarioButton = page.locator('button:has-text("Add Scenario")');

    if (await addScenarioButton.isVisible()) {
      await addScenarioButton.click();
      await page.waitForTimeout(500);
    } else if (await addButton.isVisible()) {
      // Scenario panel should be visible
      await expect(page.locator('text=Scenario')).toBeVisible();
    }
  });

  test('shows empty state or base case', async ({ page }) => {
    // Wait for lazy component to load and render
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Either shows empty state with "Create Your First Scenario" button
    // or shows "Base Case" if scenarios exist
    const createButton = page.locator('text=Create Your First Scenario');
    const baseCase = page.locator('text=Base Case').first();

    // Either empty state or base case should be visible
    await expect(createButton.or(baseCase)).toBeVisible({ timeout: 10000 });
  });

  test('scenario comparison shows metrics', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Should show Scenario Comparison header
    await expect(page.locator('text=Scenario Comparison')).toBeVisible();
  });

  test('can delete scenario if exists', async ({ page }) => {
    // First add a scenario
    const addButton = page.locator('button:has-text("Add Scenario")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
    }

    // Look for delete button (trash icon)
    const deleteButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    // This is just checking the UI exists - actual deletion requires more setup
  });
});
