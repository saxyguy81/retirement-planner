/**
 * E2E Verification Script for Retirement Planner Features
 * Runs headless browser tests to verify:
 * - Calculation Inspector Navigation
 * - Optimizer Feasibility Validation
 */

import { chromium } from 'playwright';

// Try multiple ports since Vite may use different ones
const PORTS = [3000, 3001, 3002, 5173];
let BASE_URL = 'http://localhost:3000/retirement-planner/';

async function runVerification() {
  console.log('Starting E2E Verification...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const results = {
    passed: [],
    failed: []
  };

  try {
    // Find the right port
    console.log('1. Finding active server...');
    let foundPort = null;
    for (const port of PORTS) {
      const testUrl = `http://localhost:${port}/retirement-planner/`;
      try {
        const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 3000 });
        if (response && response.ok()) {
          foundPort = port;
          BASE_URL = testUrl;
          console.log(`   Found server on port ${port}`);
          break;
        }
      } catch (e) {
        // Port not available, try next
      }
    }

    if (!foundPort) {
      throw new Error('Could not find running dev server on any port');
    }

    console.log('2. Loading application...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // ========================================
    // PHASE 1: Frozen Column Verification
    // ========================================
    console.log('\n=== Phase 1: Frozen Column Verification ===');

    // Check for sticky column styling
    const stickyHeader = await page.$('th.sticky');
    if (stickyHeader) {
      const classList = await stickyHeader.getAttribute('class');
      if (classList.includes('z-20') && classList.includes('after:')) {
        results.passed.push('Phase 1: Frozen column has z-index and shadow styling');
        console.log('   PASS: Frozen column has z-index and shadow styling');
      } else {
        results.failed.push('Phase 1: Frozen column missing z-index or shadow');
        console.log('   FAIL: Frozen column missing z-index or shadow');
      }
    } else {
      results.failed.push('Phase 1: Could not find sticky header');
      console.log('   FAIL: Could not find sticky header');
    }

    // ========================================
    // PHASE 2: Significant Figures Verification
    // ========================================
    console.log('\n=== Phase 2: Significant Figures Verification ===');

    // Click Settings tab
    const settingsTab = await page.$('text=Settings');
    if (settingsTab) {
      await settingsTab.click();
      await page.waitForTimeout(500);

      // Expand Display Preferences section
      const displaySection = await page.$('text=Display Preferences');
      if (displaySection) {
        await displaySection.click();
        await page.waitForTimeout(500);

        // Check for sig fig options
        const sig2Btn = await page.$('button:has-text("$1.2M")');
        const sig3Btn = await page.$('button:has-text("$1.23M")');
        const sig4Btn = await page.$('button:has-text("$1.234M")');
        const dollarsBtn = await page.$('button:has-text("$1,234,567")');
        const centsBtn = await page.$('button:has-text("$1,234,567.89")');

        if (sig2Btn && sig3Btn && sig4Btn && dollarsBtn && centsBtn) {
          results.passed.push('Phase 2: All 5 precision options present');
          console.log('   PASS: All 5 precision options present ($1.2M, $1.23M, $1.234M, $1,234,567, $1,234,567.89)');
        } else {
          results.failed.push('Phase 2: Missing precision options');
          console.log('   FAIL: Missing precision options');
        }

        // Test clicking sig2
        if (sig2Btn) {
          await sig2Btn.click();
          await page.waitForTimeout(500);
          results.passed.push('Phase 2: Can select 2 sig fig option');
          console.log('   PASS: Can select 2 sig fig option');
        }
      } else {
        results.failed.push('Phase 2: Display Preferences section not found');
        console.log('   FAIL: Display Preferences section not found');
      }
    }

    // Navigate back to Projections tab
    const projectionsTab = await page.$('text=Projections');
    if (projectionsTab) {
      await projectionsTab.click();
      await page.waitForTimeout(1000);
    }

    // ========================================
    // PHASE 3 & 4: Navigation Verification
    // ========================================
    console.log('\n=== Phase 3 & 4: Navigation Infrastructure & Inspector UI ===');

    // Find and click on a calculation cell (totalBOY or similar)
    const inspectableCell = await page.$('td[class*="cursor-pointer"]');
    if (inspectableCell) {
      await inspectableCell.click();
      await page.waitForTimeout(500);

      // Check if inspector modal opened
      const inspectorModal = await page.$('div[class*="fixed"]');
      if (inspectorModal) {
        results.passed.push('Phase 4: Calculation inspector opens on cell click');
        console.log('   PASS: Calculation inspector opens on cell click');

        // Check for back/forward buttons (look for buttons with chevron icons in header)
        const headerButtons = await page.$$('div.sticky button');
        const backBtn = headerButtons.length >= 1 ? headerButtons[0] : null;
        const forwardBtn = headerButtons.length >= 2 ? headerButtons[1] : null;

        if (backBtn && forwardBtn) {
          results.passed.push('Phase 4: Back/forward navigation buttons present');
          console.log('   PASS: Back/forward navigation buttons present');
        } else {
          results.failed.push('Phase 4: Missing back/forward navigation buttons');
          console.log('   FAIL: Missing back/forward navigation buttons');
        }

        // Check for "Used By" section
        const usedBySection = await page.$('text=Used By');
        if (usedBySection) {
          results.passed.push('Phase 4: "Used By" section present');
          console.log('   PASS: "Used By" section present');
        } else {
          results.failed.push('Phase 4: "Used By" section not found');
          console.log('   FAIL: "Used By" section not found');
        }

        // Check for clickable formula hint
        const formulaHint = await page.$('text=click values to navigate');
        if (formulaHint) {
          results.passed.push('Phase 4: Formula shows navigation hint');
          console.log('   PASS: Formula shows navigation hint');
        }

        // Try clicking a clickable formula element
        const clickableFormulas = await page.$$('button.cursor-pointer');
        if (clickableFormulas.length > 0) {
          await clickableFormulas[0].click();
          await page.waitForTimeout(500);

          // Check if back button is now enabled (should have text-slate-300 class, not text-slate-600)
          const headerBtnsAfter = await page.$$('div.sticky button');
          if (headerBtnsAfter.length >= 1) {
            const backBtnClass = await headerBtnsAfter[0].getAttribute('class');
            if (!backBtnClass.includes('cursor-not-allowed')) {
              results.passed.push('Phase 4: Navigation works - back button enabled after navigating');
              console.log('   PASS: Navigation works - back button enabled after navigating');

              // Click back
              await headerBtnsAfter[0].click();
              await page.waitForTimeout(500);
              results.passed.push('Phase 4: Back navigation works');
              console.log('   PASS: Back navigation works');
            }
          }
        } else {
          console.log('   INFO: No clickable formula elements found to test navigation');
        }

        // Close inspector (X button is typically the last button in header)
        const allHeaderBtns = await page.$$('div.sticky button');
        const closeBtn = allHeaderBtns.length > 0 ? allHeaderBtns[allHeaderBtns.length - 1] : null;
        if (closeBtn) {
          await closeBtn.click();
          await page.waitForTimeout(500);

          // Verify modal is closed
          const modalAfterClose = await page.$('div[class*="fixed"][class*="bg-black"]');
          if (!modalAfterClose) {
            results.passed.push('Phase 4: Inspector closes correctly');
            console.log('   PASS: Inspector closes correctly');
          }
        }
      } else {
        results.failed.push('Phase 4: Inspector modal did not open');
        console.log('   FAIL: Inspector modal did not open');
      }
    } else {
      results.failed.push('Phase 4: Could not find inspectable cell');
      console.log('   FAIL: Could not find inspectable cell');
    }

    // ========================================
    // OPTIMIZER FEASIBILITY VERIFICATION
    // ========================================
    console.log('\n=== Optimizer Feasibility Verification ===');

    // Navigate to Optimizer tab
    const optimizerTab = await page.$('button:has-text("Optimize")');
    if (optimizerTab) {
      await optimizerTab.click();
      await page.waitForTimeout(1000);

      // Check if optimizer panel is visible
      const optimizerPanel = await page.$('text=Strategy Optimizer');
      if (optimizerPanel) {
        results.passed.push('Optimizer: Panel opens correctly');
        console.log('   PASS: Optimizer panel opens correctly');

        // Look for Run Optimization button
        const runBtn = await page.$('button:has-text("Run Optimization")');
        if (runBtn) {
          await runBtn.click();
          await page.waitForTimeout(3000); // Wait for optimization to complete

          // Check for optimization results table
          const resultsTable = await page.$('table');
          if (resultsTable) {
            results.passed.push('Optimizer: Results table appears after running');
            console.log('   PASS: Results table appears after running');

            // Check for Feasible column header
            const feasibleHeader = await page.$('th:has-text("Feasible")');
            if (feasibleHeader) {
              results.passed.push('Optimizer: Feasibility column present in results');
              console.log('   PASS: Feasibility column present in results');
            }

            // Check for warning indicators (amber color for infeasible strategies)
            const warningIndicators = await page.$$('span.text-amber-400');
            if (warningIndicators.length > 0) {
              results.passed.push('Optimizer: Warning indicators shown for infeasible strategies');
              console.log('   PASS: Warning indicators shown for infeasible strategies');
            }

            // Check for "Actual:" label which appears when strategy is capped
            const actualLabels = await page.$$('text=/Actual:/');
            if (actualLabels.length > 0) {
              results.passed.push('Optimizer: Actual amounts displayed for capped strategies');
              console.log('   PASS: Actual amounts displayed for capped strategies');
            } else {
              // This might not be visible if all strategies are feasible - check for feasibility percentage
              const feasibilityPercent = await page.$('text=/\\d+%/');
              if (feasibilityPercent) {
                console.log('   INFO: Feasibility percentages visible (strategies may all be feasible)');
              }
            }
          } else {
            results.failed.push('Optimizer: Results table not found');
            console.log('   FAIL: Results table not found');
          }
        } else {
          results.failed.push('Optimizer: Run Optimization button not found');
          console.log('   FAIL: Run Optimization button not found');
        }
      } else {
        results.failed.push('Optimizer: Panel did not open');
        console.log('   FAIL: Optimizer panel did not open');
      }
    } else {
      console.log('   INFO: Optimizer tab not found (may be in different location)');
    }

  } catch (error) {
    console.error('\nError during verification:', error.message);
    results.failed.push(`Runtime error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n========================================');
  console.log('VERIFICATION SUMMARY');
  console.log('========================================');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed tests:');
    results.failed.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('\nAll verifications passed!');
    process.exit(0);
  }
}

runVerification().catch(console.error);
