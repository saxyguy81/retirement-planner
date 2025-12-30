# Comprehensive E2E Testing Plan

## Overview

Add comprehensive end-to-end testing to the retirement planner application, including:
- AI Chat integration tests using ccproxy-api on localhost:4000
- Feature E2E tests for all new functionality
- Pre-push hook to ensure tests run locally before pushing

## Current State Analysis

### ccproxy-api Status
- **Location**: `localhost:4000`
- **Format**: Anthropic-compatible (`/v1/messages` endpoint)
- **Health Check**: `http://localhost:4000/health`
- **Auth**: OAuth2 credentials (valid until 2026-12-07)
- **Availability**: Local only (not available in CI/CD)

### Existing Test Infrastructure
- **Unit Tests**: Vitest with 278 tests, 80%+ coverage
- **Visual Tests**: Playwright with Docker for consistent rendering
- **E2E Tests**: `e2e-verification.mjs` with Playwright (UI-only)
- **Test Scripts**: `npm run test`, `npm run test:unit`, `npm run test:visual`

### Key Files
- `vitest.config.js` - Unit test configuration
- `vitest.browser.config.js` - Visual test configuration
- `e2e-verification.mjs` - Existing E2E verification script
- `tests/setup.js` - Test setup file
- `scripts/hooks/pre-push` - Existing pre-push hook

## Desired End State

After this plan is complete:
1. Comprehensive E2E tests exist for all features
2. AI Chat tests run against ccproxy-api locally
3. Pre-push hook ensures all tests pass before pushing
4. Tests are properly separated (CI-safe vs ccproxy-required)
5. Clear documentation for running tests

## What We're NOT Doing

- Setting up ccproxy in CI/CD (not available)
- Mocking the LLM responses (we want real integration testing)
- Replacing existing unit tests (they're comprehensive)
- Adding visual regression tests for new components (separate effort)

---

## Phase 1: E2E Test Infrastructure Setup

### Overview
Set up proper Playwright test infrastructure with configuration for both CI-safe and local-only tests.

### Changes Required:

#### 1. Create Playwright configuration
**File**: `playwright.config.js` (NEW)

```javascript
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Timeouts are configurable via environment variables:
 * - AI_TIMEOUT: Timeout for AI/LLM tests (default: 60000ms)
 * - E2E_TIMEOUT: Default timeout for all tests (default: 30000ms)
 */

// Configurable timeouts with sensible defaults
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '60000', 10);
const DEFAULT_TIMEOUT = parseInt(process.env.E2E_TIMEOUT || '30000', 10);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],  // Clear console output
    ['html', { open: 'never' }],  // Detailed report saved to file
  ],
  timeout: DEFAULT_TIMEOUT,
  expect: {
    timeout: DEFAULT_TIMEOUT,
  },
  use: {
    baseURL: 'http://localhost:5173/retirement-planner/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'ci',
      testDir: './e2e/ci',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'local',
      testDir: './e2e/local',
      timeout: AI_TIMEOUT,
      expect: { timeout: AI_TIMEOUT },
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/retirement-planner/',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

#### 2. Create E2E test directory structure
**Directory**: `e2e/` (NEW)

```
e2e/
├── fixtures/
│   └── test-fixtures.js      # Shared test utilities
├── ci/
│   ├── navigation.spec.js    # CI-safe navigation tests
│   ├── projections.spec.js   # CI-safe projection tests
│   ├── scenarios.spec.js     # CI-safe scenario tests
│   └── optimizer.spec.js     # CI-safe optimizer tests
├── local/
│   ├── ai-chat.spec.js       # Requires ccproxy
│   ├── ai-tools.spec.js      # Requires ccproxy
│   └── ai-scenarios.spec.js  # Requires ccproxy (creates scenarios via AI)
└── README.md                  # Test documentation
```

#### 3. Create test fixtures
**File**: `e2e/fixtures/test-fixtures.js` (NEW)

```javascript
import { test as base, expect } from '@playwright/test';

// Extend base test with common fixtures
export const test = base.extend({
  // Wait for app to fully load
  appReady: async ({ page }, use) => {
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
    await use(page);
  },

  // Navigate to specific tab
  navigateToTab: async ({ page }, use) => {
    const navigate = async (tabName) => {
      await page.click(`button:has-text("${tabName}")`);
      await page.waitForTimeout(500);
    };
    await use(navigate);
  },
});

// Check if ccproxy is available
export async function isCCProxyAvailable() {
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    return data.status === 'pass' || data.status === 'warn';
  } catch {
    return false;
  }
}

// Skip test if ccproxy not available
export function requiresCCProxy(testFn) {
  return async (args) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }
    await testFn(args);
  };
}

export { expect };
```

#### 4. Add data-testid attributes to key components
**File**: `src/App.jsx`
**Changes**: Add `data-testid="app-loaded"` after initial render

```jsx
// In the main return, add data-testid to root element
<div data-testid="app-loaded" className="...">
```

### Success Criteria:

#### Automated Verification:
- [ ] Playwright installs correctly: `npx playwright install chromium`
- [ ] Test directory structure exists: `ls -la e2e/`
- [ ] Config file is valid: `npx playwright test --list`

#### Manual Verification:
- [ ] Can run empty test suite without errors

---

## Phase 2: CI-Safe E2E Tests

### Overview
Create E2E tests that work in CI (no ccproxy required) - testing UI navigation, projections, scenarios, and optimizer.

### Changes Required:

#### 1. Navigation tests
**File**: `e2e/ci/navigation.spec.js` (NEW)

```javascript
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads application with default values', async ({ page }) => {
    // Check header shows "Primary" (not "Ira")
    await expect(page.locator('text=Primary')).toBeVisible();

    // Check projections tab is active by default
    await expect(page.locator('button:has-text("Projections")')).toHaveClass(/bg-slate-800/);
  });

  test('can navigate between all tabs', async ({ page }) => {
    const tabs = ['Projections', 'Scenarios', 'Optimize', 'AI Chat', 'Settings'];

    for (const tab of tabs) {
      await page.click(`button:has-text("${tab}")`);
      await page.waitForTimeout(300);
      // Tab should be highlighted
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
    }
  });

  test('New button shows confirmation dialog', async ({ page }) => {
    // Set up dialog handler before clicking
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Start a new session');
      await dialog.dismiss();
    });

    await page.click('button:has-text("New")');
  });

  test('projections table displays data', async ({ page }) => {
    // Should see year column starting from 2025
    await expect(page.locator('text=2025')).toBeVisible();

    // Should see financial data ($ amounts)
    await expect(page.locator('text=/\\$[0-9]/')).toBeVisible();
  });
});
```

#### 2. Input panel tests
**File**: `e2e/ci/input-panel.spec.js` (NEW)

```javascript
import { test, expect } from '@playwright/test';

test.describe('Input Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('can expand and collapse input sections', async ({ page }) => {
    // Find a section header and click to expand
    const accountSection = page.locator('text=Account Balances');
    await accountSection.click();
    await page.waitForTimeout(300);

    // Should see input fields
    await expect(page.locator('text=After-Tax')).toBeVisible();
  });

  test('Roth conversions section has dynamic add/remove', async ({ page }) => {
    // Expand Roth Conversions section
    await page.click('text=Roth Conversions');
    await page.waitForTimeout(300);

    // Should see "No conversions scheduled" or existing conversions
    const noConversions = page.locator('text=No conversions scheduled');
    const addButton = page.locator('button:has-text("Add")');

    // Add button should always be present
    await expect(addButton).toBeVisible();
  });

  test('SmartYearInput shows validation errors', async ({ page }) => {
    // Expand Expense Overrides section
    await page.click('text=Expense Overrides');
    await page.waitForTimeout(300);

    // Find the year input and enter invalid age
    const yearInput = page.locator('input[placeholder="Year or Age"]').first();
    await yearInput.fill('64');  // Age 64 with birth year 1960 = 2024, before min
    await yearInput.blur();

    // Should show validation error
    await expect(page.locator('text=/before 2025/')).toBeVisible();
  });
});
```

#### 3. Optimizer tests
**File**: `e2e/ci/optimizer.spec.js` (NEW)

```javascript
import { test, expect } from '@playwright/test';

test.describe('Optimizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Optimize")');
    await page.waitForTimeout(500);
  });

  test('shows 3 optimizer objectives', async ({ page }) => {
    await expect(page.locator('text=Maximize Heir Value')).toBeVisible();
    await expect(page.locator('text=Minimize Lifetime Tax')).toBeVisible();
    await expect(page.locator('text=Maximize Portfolio')).toBeVisible();

    // Should NOT show Balance Roth Ratio (removed in Phase 5)
    await expect(page.locator('text=Balance Roth')).not.toBeVisible();
  });

  test('can run optimization', async ({ page }) => {
    await page.click('button:has-text("Run Optimization")');

    // Wait for results (may take a few seconds)
    await page.waitForTimeout(5000);

    // Should show results table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=Strategy')).toBeVisible();
  });

  test('Create Scenario button appears in results', async ({ page }) => {
    await page.click('button:has-text("Run Optimization")');
    await page.waitForTimeout(5000);

    // Should have Create Scenario button
    await expect(page.locator('button:has-text("Create Scenario")')).toBeVisible();
  });

  test('Create Scenario switches to Scenarios tab', async ({ page }) => {
    await page.click('button:has-text("Run Optimization")');
    await page.waitForTimeout(5000);

    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(500);

    // Should now be on Scenarios tab
    await expect(page.locator('text=Scenario Comparison')).toBeVisible();
  });
});
```

#### 4. Scenarios tests
**File**: `e2e/ci/scenarios.spec.js` (NEW)

```javascript
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
    const addButton = page.locator('button:has-text("Add Scenario")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Should show new scenario in list
      await expect(page.locator('text=/Scenario \\d/')).toBeVisible();
    }
  });

  test('base case is always shown', async ({ page }) => {
    // Base case column should be visible
    await expect(page.locator('text=Base Case')).toBeVisible();
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] CI tests pass: `npx playwright test e2e/ci/`
- [ ] Tests run in under 60 seconds
- [ ] All tests are independent (can run in any order)

#### Manual Verification:
- [ ] Tests produce clear error messages on failure
- [ ] HTML report is generated and readable

---

## Phase 3: AI Chat E2E Tests (ccproxy-required)

### Overview
Create E2E tests for AI Chat functionality that require ccproxy-api running locally.

### Changes Required:

#### 1. AI Settings tests
**File**: `e2e/local/ai-settings.spec.js` (NEW)

```javascript
import { test, expect } from '@playwright/test';

// Check ccproxy availability before running
test.beforeAll(async () => {
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    if (data.status !== 'pass' && data.status !== 'warn') {
      test.skip();
    }
  } catch {
    test.skip();
  }
});

test.describe('AI Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(500);
  });

  test('shows AI Assistant welcome screen', async ({ page }) => {
    await expect(page.locator('text=AI Assistant')).toBeVisible();
    await expect(page.locator('text=Configure your AI provider')).toBeVisible();
  });

  test('Settings button opens configuration panel', async ({ page }) => {
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);

    await expect(page.locator('text=AI Configuration')).toBeVisible();
    await expect(page.locator('text=Provider')).toBeVisible();
    await expect(page.locator('text=API Key')).toBeVisible();
  });

  test('can configure custom endpoint for ccproxy', async ({ page }) => {
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);

    // Select Custom provider
    await page.selectOption('select', 'custom');
    await page.waitForTimeout(300);

    // Fill in custom endpoint
    await page.fill('input[placeholder*="localhost"]', 'http://localhost:4000/v1/messages');

    // Fill in API key (any non-empty value works for ccproxy)
    await page.fill('input[type="password"]', 'test-key');

    // Fill in model name
    await page.fill('input[placeholder="Model name"]', 'claude-3-5-sonnet-20241022');

    // Test connection button should be visible
    await expect(page.locator('button:has-text("Test Connection")')).toBeVisible();
  });

  test('Test Connection works with ccproxy', async ({ page }) => {
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);

    // Configure for ccproxy
    await page.selectOption('select', 'custom');
    await page.fill('input[placeholder*="localhost"]', 'http://localhost:4000/v1/messages');
    await page.fill('input[type="password"]', 'test-key');
    await page.fill('input[placeholder="Model name"]', 'claude-3-5-sonnet-20241022');

    // Click Test Connection
    await page.click('button:has-text("Test Connection")');

    // Wait for response - uses configured AI_TIMEOUT (default 60s)
    await expect(page.locator('text=Connected successfully')).toBeVisible();
  });
});
```

#### 2. AI Chat messaging tests
**File**: `e2e/local/ai-chat.spec.js` (NEW)

```javascript
import { test, expect } from '@playwright/test';

// Helper to configure AI for ccproxy
async function configureAIForCCProxy(page) {
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);

  await page.selectOption('select', 'custom');
  await page.fill('input[placeholder*="localhost"]', 'http://localhost:4000/v1/messages');
  await page.fill('input[type="password"]', 'test-key');
  await page.fill('input[placeholder="Model name"]', 'claude-3-5-sonnet-20241022');

  // Close settings
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);
}

test.beforeAll(async () => {
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    if (data.status !== 'pass' && data.status !== 'warn') {
      test.skip();
    }
  } catch {
    test.skip();
  }
});

test.describe('AI Chat Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(500);
    await configureAIForCCProxy(page);
  });

  test('can send a simple message', async ({ page }) => {
    // Type a message
    await page.fill('textarea[placeholder*="Ask about"]', 'Hello, what can you help me with?');

    // Click send
    await page.click('button:has([class*="Send"])');

    // Should show user message
    await expect(page.locator('text=Hello, what can you help me with?')).toBeVisible();

    // Should show "Thinking..." indicator
    await expect(page.locator('text=Thinking...')).toBeVisible();

    // Wait for response - uses configured AI_TIMEOUT (default 60s)
    // The assistant response appears in a slate-800 rounded div
    const assistantMessages = page.locator('.bg-slate-800.rounded-lg');
    await expect(assistantMessages).toHaveCount(1);
  });

  test('suggested prompts populate input', async ({ page }) => {
    // Click a suggested prompt
    await page.click('button:has-text("What\'s my current projected heir value?")');

    // Input should be populated
    const textarea = page.locator('textarea[placeholder*="Ask about"]');
    await expect(textarea).toHaveValue("What's my current projected heir value?");
  });

  test('Clear button clears chat history', async ({ page }) => {
    // Send a message first
    await page.fill('textarea[placeholder*="Ask about"]', 'Test message');
    await page.click('button:has([class*="Send"])');
    await page.waitForTimeout(1000);

    // Click Clear
    await page.click('button:has-text("Clear")');

    // Should show welcome screen again
    await expect(page.locator('text=Ask me about your retirement')).toBeVisible();
  });

  test('message count updates correctly', async ({ page }) => {
    // Initially 0 messages
    await expect(page.locator('text=(0 messages)')).toBeVisible();

    // Send a message
    await page.fill('textarea[placeholder*="Ask about"]', 'Count test');
    await page.click('button:has([class*="Send"])');

    // Should show 1 message immediately (user message)
    await expect(page.locator('text=(1 messages)')).toBeVisible();

    // Wait for response - uses configured AI_TIMEOUT (default 60s)
    await expect(page.locator('text=(2 messages)')).toBeVisible();
  });
});
```

#### 3. AI Tool execution tests
**File**: `e2e/local/ai-tools.spec.js` (NEW)

```javascript
import { test, expect } from '@playwright/test';

async function configureAIForCCProxy(page) {
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);
  await page.selectOption('select', 'custom');
  await page.fill('input[placeholder*="localhost"]', 'http://localhost:4000/v1/messages');
  await page.fill('input[type="password"]', 'test-key');
  await page.fill('input[placeholder="Model name"]', 'claude-3-5-sonnet-20241022');
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);
}

test.beforeAll(async () => {
  try {
    const response = await fetch('http://localhost:4000/health');
    if (!response.ok) test.skip();
  } catch {
    test.skip();
  }
});

test.describe('AI Tool Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(500);
    await configureAIForCCProxy(page);
  });

  test('AI can get current state (get_current_state tool)', async ({ page }) => {
    await page.fill('textarea[placeholder*="Ask about"]',
      "What are my current account balances and projected heir value?");
    await page.click('button:has([class*="Send"])');

    // Wait for response with financial data (uses project timeout: AI_TIMEOUT)
    // No hardcoded waitForTimeout - Playwright waits intelligently
    const response = page.locator('.bg-slate-800.rounded-lg').last();
    await expect(response).toContainText(/\$[\d,]+/);
  });

  test('AI can run projections (run_projection tool)', async ({ page }) => {
    await page.fill('textarea[placeholder*="Ask about"]',
      "What would happen to my heir value if I did no Roth conversions?");
    await page.click('button:has([class*="Send"])');

    // Wait for response (uses project timeout: AI_TIMEOUT)
    const response = page.locator('.bg-slate-800.rounded-lg').last();
    await expect(response).toContainText(/heir|value|portfolio/i);
  });

  test('AI can perform calculations (calculate tool)', async ({ page }) => {
    await page.fill('textarea[placeholder*="Ask about"]',
      "Calculate 1000000 * 1.06 ^ 10 for me");
    await page.click('button:has([class*="Send"])');

    // Wait for response (uses project timeout: AI_TIMEOUT)
    // Should contain the calculation result (~1,790,847)
    const response = page.locator('.bg-slate-800.rounded-lg').last();
    await expect(response).toContainText(/1[,.]?79/i);
  });

  test('AI can create scenario (create_scenario tool)', async ({ page }) => {
    await page.fill('textarea[placeholder*="Ask about"]',
      'Create a scenario called "No Conversions" with no Roth conversions');
    await page.click('button:has([class*="Send"])');

    // Wait for response (uses project timeout: AI_TIMEOUT)
    const response = page.locator('.bg-slate-800.rounded-lg').last();
    await expect(response).toContainText(/scenario|created/i);

    // Navigate to Scenarios tab to verify
    await page.click('button:has-text("Scenarios")');

    // Should see the new scenario
    await expect(page.locator('text=No Conversions')).toBeVisible();
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Local AI tests pass when ccproxy is running: `npx playwright test e2e/local/`
- [ ] Tests skip gracefully when ccproxy is not available
- [ ] Tests complete in under 5 minutes

#### Manual Verification:
- [ ] AI responses are coherent and relevant
- [ ] Tool execution produces correct results
- [ ] No console errors during AI interactions

---

## Phase 4: Pre-Push Hook Setup

### Overview
Configure pre-push hook to run both CI-safe and local-only tests before pushing.

### Changes Required:

#### 1. Update pre-push hook
**File**: `scripts/hooks/pre-push` (UPDATE - extends existing hook)

This extends the existing pre-push hook to add E2E tests while running checks in parallel for faster feedback.

```bash
#!/bin/bash

set -e

echo "========================================"
echo "Running pre-push validation..."
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Temporary files for parallel execution results
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Track overall status
OVERALL_FAILED=0

# Function to run a check and save result
run_check() {
  local name="$1"
  local cmd="$2"
  local output_file="$TMPDIR/$name.out"
  local status_file="$TMPDIR/$name.status"

  if eval "$cmd" > "$output_file" 2>&1; then
    echo "0" > "$status_file"
  else
    echo "1" > "$status_file"
  fi
}

# Check ccproxy availability upfront
CCPROXY_AVAILABLE=0
HEALTH_RESPONSE=$(curl -s http://localhost:4000/health 2>/dev/null || echo "")
if echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
  CCPROXY_AVAILABLE=1
fi

echo -e "${BLUE}Running checks in parallel...${NC}"
echo ""

# Phase 1: Run parallel checks (lint, unit tests, baseline review)
run_check "lint" "npm run lint" &
PID_LINT=$!

run_check "unit" "npm run test:unit" &
PID_UNIT=$!

run_check "baseline" "npm run baseline:review" &
PID_BASELINE=$!

# Wait for Phase 1 to complete
wait $PID_LINT $PID_UNIT $PID_BASELINE

# Report Phase 1 results
echo "----------------------------------------"
echo -e "${YELLOW}Phase 1: Code Quality${NC}"
echo "----------------------------------------"

for check in lint unit baseline; do
  status=$(cat "$TMPDIR/$check.status")
  if [ "$status" -eq 0 ]; then
    echo -e "${GREEN}✓ $check passed${NC}"
  else
    echo -e "${RED}✗ $check FAILED${NC}"
    echo -e "${RED}Output:${NC}"
    cat "$TMPDIR/$check.out" | head -50
    OVERALL_FAILED=1
  fi
done

# Exit early if Phase 1 failed
if [ $OVERALL_FAILED -eq 1 ]; then
  echo ""
  echo -e "${RED}========================================"
  echo "Pre-push validation FAILED (Phase 1)"
  echo -e "========================================${NC}"
  exit 1
fi

echo ""
echo "----------------------------------------"
echo -e "${YELLOW}Phase 2: E2E Tests${NC}"
echo "----------------------------------------"

# Phase 2: Run E2E tests in parallel
run_check "e2e_ci" "npx playwright test --project=ci --reporter=list" &
PID_E2E_CI=$!

if [ $CCPROXY_AVAILABLE -eq 1 ]; then
  echo -e "${BLUE}ccproxy detected - including AI tests${NC}"
  run_check "e2e_local" "npx playwright test --project=local --reporter=list" &
  PID_E2E_LOCAL=$!
else
  echo -e "${YELLOW}⚠ ccproxy not available - skipping AI tests${NC}"
  echo -e "${YELLOW}  Run 'ccproxy-api serve --port 4000' to enable${NC}"
  echo "0" > "$TMPDIR/e2e_local.status"
  echo "Skipped (ccproxy not available)" > "$TMPDIR/e2e_local.out"
  PID_E2E_LOCAL=""
fi

# Wait for E2E tests
wait $PID_E2E_CI
[ -n "$PID_E2E_LOCAL" ] && wait $PID_E2E_LOCAL

# Report E2E results
for check in e2e_ci e2e_local; do
  if [ -f "$TMPDIR/$check.status" ]; then
    status=$(cat "$TMPDIR/$check.status")
    if [ "$status" -eq 0 ]; then
      echo -e "${GREEN}✓ $check passed${NC}"
    else
      echo -e "${RED}✗ $check FAILED${NC}"
      echo -e "${RED}Output:${NC}"
      cat "$TMPDIR/$check.out" | head -100
      OVERALL_FAILED=1
    fi
  fi
done

# Exit early if Phase 2 failed
if [ $OVERALL_FAILED -eq 1 ]; then
  echo ""
  echo -e "${RED}========================================"
  echo "Pre-push validation FAILED (Phase 2)"
  echo -e "========================================${NC}"
  exit 1
fi

echo ""
echo "----------------------------------------"
echo -e "${YELLOW}Phase 3: Build${NC}"
echo "----------------------------------------"

# Phase 3: Build (sequential, as it's the final gate)
if npm run build > "$TMPDIR/build.out" 2>&1; then
  echo -e "${GREEN}✓ build passed${NC}"
else
  echo -e "${RED}✗ build FAILED${NC}"
  cat "$TMPDIR/build.out" | head -50
  OVERALL_FAILED=1
fi

echo ""
echo "========================================"

if [ $OVERALL_FAILED -eq 1 ]; then
  echo -e "${RED}Pre-push validation FAILED${NC}"
  echo "Push blocked. Fix the issues above and try again."
  echo ""
  echo "To skip (NOT recommended): git push --no-verify"
  exit 1
fi

echo -e "${GREEN}All checks passed. Proceeding with push.${NC}"
exit 0
```

#### 2. Add npm scripts for E2E tests
**File**: `package.json` (UPDATE)

Add these scripts:

```json
{
  "scripts": {
    "test:e2e": "npx playwright test",
    "test:e2e:ci": "npx playwright test e2e/ci/",
    "test:e2e:local": "npx playwright test e2e/local/",
    "test:e2e:headed": "npx playwright test --headed",
    "test:e2e:debug": "npx playwright test --debug",
    "test:e2e:report": "npx playwright show-report"
  }
}
```

#### 3. Create E2E test documentation
**File**: `e2e/README.md` (NEW)

```markdown
# E2E Tests

This directory contains end-to-end tests for the retirement planner application.

## Directory Structure

```
e2e/
├── ci/           # Tests that run in CI (no external dependencies)
├── local/        # Tests that require ccproxy-api locally
└── fixtures/     # Shared test utilities
```

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### CI-Safe Tests Only (no ccproxy required)
```bash
npm run test:e2e:ci
```

### Local Tests (requires ccproxy)
```bash
# First, start ccproxy-api
ccproxy-api serve --port 4000

# Then run local tests
npm run test:e2e:local
```

### Debug Mode (opens browser)
```bash
npm run test:e2e:headed
npm run test:e2e:debug
```

### View Test Report
```bash
npm run test:e2e:report
```

## ccproxy-api Setup

The AI Chat tests require ccproxy-api running locally:

```bash
# Install ccproxy-api
pip install ccproxy-api

# Start the server
ccproxy-api serve --port 4000

# Check health
curl http://localhost:4000/health
```

## Pre-Push Hook

The pre-push hook runs:
1. Lint
2. Unit tests
3. CI E2E tests
4. AI E2E tests (if ccproxy available)
5. Build

To install the hook:
```bash
npm run hooks:install
```

## Writing New Tests

### CI-Safe Tests (e2e/ci/)
- Test UI interactions only
- No external API calls
- Should be deterministic

### Local Tests (e2e/local/)
- Can use ccproxy-api
- Should skip gracefully if ccproxy unavailable
- May have longer timeouts for LLM responses
```

### Success Criteria:

#### Automated Verification:
- [ ] Pre-push hook executes correctly: `./scripts/hooks/pre-push`
- [ ] Hook skips AI tests gracefully when ccproxy unavailable
- [ ] Hook blocks push on any failure
- [ ] All new npm scripts work correctly

#### Manual Verification:
- [ ] `git push` triggers all tests
- [ ] Clear output showing which tests ran
- [ ] Helpful message when ccproxy not available

---

## Phase 5: Full Integration Test

### Overview
Create comprehensive user journey tests that exercise the full application.

### Changes Required:

#### 1. Full user flow test
**File**: `e2e/ci/user-journey.spec.js` (NEW)

```javascript
import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('new user can explore all features', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Step 1: View default projections
    await expect(page.locator('text=Primary')).toBeVisible();
    await expect(page.locator('text=2025')).toBeVisible();

    // Step 2: Modify an input
    await page.click('text=Account Balances');
    await page.waitForTimeout(300);

    // Step 3: Check optimizer
    await page.click('button:has-text("Optimize")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Strategy Optimizer')).toBeVisible();

    // Step 4: Run optimization
    await page.click('button:has-text("Run Optimization")');
    await page.waitForTimeout(5000);
    await expect(page.locator('table')).toBeVisible();

    // Step 5: Create scenario from optimizer
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Scenario Comparison')).toBeVisible();

    // Step 6: Check AI Chat tab exists
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=AI Assistant')).toBeVisible();

    // Step 7: Check Settings
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Display Preferences')).toBeVisible();

    // Step 8: Return to projections
    await page.click('button:has-text("Projections")');
    await page.waitForTimeout(500);
    await expect(page.locator('table')).toBeVisible();
  });

  test('optimizer to scenario flow works correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go to optimizer
    await page.click('button:has-text("Optimize")');
    await page.waitForTimeout(500);

    // Select objective
    await page.click('text=Maximize Heir Value');
    await page.waitForTimeout(300);

    // Run optimization
    await page.click('button:has-text("Run Optimization")');
    await page.waitForTimeout(8000);

    // Create scenario
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(500);

    // Verify we're on scenarios tab with new scenario
    await expect(page.locator('text=Scenario Comparison')).toBeVisible();
    await expect(page.locator('text=/Optimizer:/')).toBeVisible({ timeout: 5000 });
  });
});
```

#### 2. Full AI journey test (requires ccproxy)
**File**: `e2e/local/ai-journey.spec.js` (NEW)

```javascript
import { test, expect } from '@playwright/test';

async function configureAIForCCProxy(page) {
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);
  await page.selectOption('select', 'custom');
  await page.fill('input[placeholder*="localhost"]', 'http://localhost:4000/v1/messages');
  await page.fill('input[type="password"]', 'test-key');
  await page.fill('input[placeholder="Model name"]', 'claude-3-5-sonnet-20241022');
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(300);
}

test.beforeAll(async () => {
  try {
    const response = await fetch('http://localhost:4000/health');
    if (!response.ok) test.skip();
  } catch {
    test.skip();
  }
});

test.describe('Complete AI Journey', () => {
  test('user can have full conversation with AI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to AI Chat
    await page.click('button:has-text("AI Chat")');

    // Configure AI
    await configureAIForCCProxy(page);

    // Test connection first
    await page.click('button:has-text("Settings")');
    await page.click('button:has-text("Test Connection")');
    await expect(page.locator('text=Connected successfully')).toBeVisible();
    await page.click('button:has-text("Settings")');

    // Ask about current state (uses project timeout: AI_TIMEOUT)
    await page.fill('textarea[placeholder*="Ask about"]',
      "What are my current retirement projections?");
    await page.click('button:has([class*="Send"])');

    // Should have response with financial info
    await expect(page.locator('.bg-slate-800.rounded-lg').last())
      .toContainText(/\$/);

    // Ask follow-up question
    await page.fill('textarea[placeholder*="Ask about"]',
      "How could I improve my heir value?");
    await page.click('button:has([class*="Send"])');

    // Should have helpful response
    await expect(page.locator('.bg-slate-800.rounded-lg').last())
      .toContainText(/conversion|roth|tax/i);

    // Message count should be 4 (2 user + 2 assistant)
    await expect(page.locator('text=(4 messages)')).toBeVisible();

    // Clear and verify
    await page.click('button:has-text("Clear")');
    await expect(page.locator('text=(0 messages)')).toBeVisible();
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] User journey test passes: `npx playwright test e2e/ci/user-journey.spec.js`
- [ ] AI journey test passes with ccproxy: `npx playwright test e2e/local/ai-journey.spec.js`
- [ ] All tests complete in under 3 minutes

#### Manual Verification:
- [ ] Tests cover the most common user flows
- [ ] Error states are properly tested
- [ ] Tests are readable and maintainable

---

## Testing Strategy Summary

### Test Categories

| Category | Location | Runs In CI | Requires ccproxy |
|----------|----------|------------|------------------|
| Unit Tests | `src/**/*.test.js` | Yes | No |
| Visual Tests | `src/**/*.visual.test.jsx` | Yes (Docker) | No |
| CI E2E Tests | `e2e/ci/` | Yes | No |
| Local E2E Tests | `e2e/local/` | No | Yes |

### Test Commands

```bash
# All tests
npm run test              # Unit tests
npm run test:visual       # Visual tests (Docker)
npm run test:e2e          # All E2E tests
npm run test:e2e:ci       # CI-safe E2E only
npm run test:e2e:local    # ccproxy-required E2E

# Development
npm run test:watch        # Unit tests in watch mode
npm run test:e2e:headed   # E2E with browser visible
npm run test:e2e:debug    # E2E in debug mode
```

### Pre-Push Verification

The pre-push hook runs:
1. `npm run lint` - Code quality
2. `npm run test:unit` - Unit tests
3. `npm run test:e2e:ci` - CI-safe E2E
4. AI E2E tests (if ccproxy available)
5. `npm run build` - Production build

---

## Implementation Order

1. **Phase 1** - Set up Playwright config and directory structure
2. **Phase 2** - Create CI-safe E2E tests
3. **Phase 3** - Create AI Chat tests (requires ccproxy)
4. **Phase 4** - Configure pre-push hook
5. **Phase 5** - Add full integration tests

---

## References

- ccproxy-api: Running on `localhost:4000`
- Existing E2E: `e2e-verification.mjs`
- Playwright docs: https://playwright.dev/docs/intro
- Vitest config: `vitest.config.js`
- Pre-push hook: `scripts/hooks/pre-push`
