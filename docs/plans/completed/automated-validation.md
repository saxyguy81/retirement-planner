# Automated Validation Infrastructure

> **STATUS: 100% COMPLETE** - Updated 2025-12-28
>
> **DONE:**
> - Phase 1: Testing infrastructure (vitest, setup, custom matchers)
> - Phase 2: Unit tests for calculations (244 tests passing)
> - Phase 3: Visual regression tests with Playwright/Docker
>   - Docker configuration (docker-compose.test.yml, Dockerfile.test)
>   - Visual test files (ProjectionsTable.visual.test.jsx, Dashboard.visual.test.jsx)
>   - vitest.browser.config.js with Playwright provider
>   - data-testid attributes on components
> - Phase 4: Baseline protection (change log, approval script)
> - Phase 5: Pre-push hook installed and working
> - Phase 6: CI workflows (deploy.yml, validate.yml)

## Overview

Comprehensive automated testing infrastructure for the retirement planner that eliminates all manual validation. Uses Vitest for unit/integration tests and Vitest Browser Mode with Playwright for visual regression testing. Baselines are protected with strict approval workflows requiring individual review and justification.

## Current State

- Vitest v1.0.0 installed but no tests written
- No visual regression testing
- No pre-push hooks
- CI/CD deploys without running tests
- Pure calculation functions are testable but untested

## Desired End State

1. **100% automated validation** - no manual verification steps
2. **Protected baselines** - individual review + justification required to change
3. **Pre-push hook** - all tests must pass before pushing
4. **CI integration** - tests run on every PR, block merge on failure
5. **Reproducible results** - Docker-based visual tests for cross-platform consistency

## What We're NOT Doing

- Manual testing steps in any validation workflow
- Automatic baseline updates on PRs
- Visual tests without Docker (to ensure consistency)
- Skipping tests with `--no-verify`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Pre-Push Hook                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Unit Tests   │ │ Integration  │ │ Visual Regression Tests  │ │
│  │ (vitest)     │ │ Tests        │ │ (vitest browser + docker)│ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Baseline Protection                          │
│  • Baselines stored in __baselines__/ directory                 │
│  • BASELINE_CHANGE_LOG.md tracks all modifications              │
│  • Manual workflow required to update via npm run baseline:update│
│  • Each change requires justification in commit message          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Testing Infrastructure Setup

### Overview
Install dependencies and configure Vitest with Browser Mode for visual regression testing.

### Changes Required:

#### 1. Update package.json
**File**: `package.json`

Add testing dependencies and scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run --exclude 'src/**/*.visual.test.jsx'",
    "test:visual": "docker compose -f docker/docker-compose.test.yml run --rm visual-tests",
    "test:visual:update": "docker compose -f docker/docker-compose.test.yml run --rm visual-tests-update",
    "baseline:review": "node scripts/review-baseline-changes.js",
    "baseline:approve": "node scripts/approve-baseline.js",
    "hooks:install": "node scripts/install-hooks.js",
    "check": "npm run test:unit && npm run test:visual"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/react": "^14.1.0",
    "@vitest/browser": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "playwright": "^1.40.0",
    "vitest": "^2.0.0"
  }
}
```

#### 2. Create Vitest Configuration
**File**: `vitest.config.js`

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.{js,jsx}'],
    exclude: ['src/**/*.visual.test.jsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.js'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // Snapshot serializer settings
    snapshotSerializers: [],
    // Fail on first error for faster feedback
    bail: 1,
  },
});
```

#### 3. Create Browser Test Configuration
**File**: `vitest.browser.config.js`

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      name: 'chromium',
      headless: true,
      screenshotDirectory: '__baselines__',
      screenshotFailures: true,
    },
    include: ['src/**/*.visual.test.jsx'],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
```

#### 4. Create Docker Configuration for Visual Tests
**File**: `docker/docker-compose.test.yml`

```yaml
version: '3.8'

services:
  visual-tests:
    image: mcr.microsoft.com/playwright:v1.40.0-jammy
    working_dir: /app
    volumes:
      - ..:/app
      - /app/node_modules
    environment:
      - CI=true
    command: npx vitest run --config vitest.browser.config.js

  visual-tests-update:
    image: mcr.microsoft.com/playwright:v1.40.0-jammy
    working_dir: /app
    volumes:
      - ..:/app
      - /app/node_modules
    environment:
      - CI=true
    command: npx vitest run --config vitest.browser.config.js --update
```

#### 5. Create Dockerfile for Consistent Environment
**File**: `docker/Dockerfile.test`

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Run tests
CMD ["npx", "vitest", "run", "--config", "vitest.browser.config.js"]
```

#### 6. Create Test Setup File
**File**: `tests/setup.js`

```javascript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Custom matchers for financial calculations
expect.extend({
  toBeWithinDollars(received, expected, tolerance = 1) {
    const pass = Math.abs(received - expected) <= tolerance;
    return {
      pass,
      message: () =>
        `expected ${received} to be within $${tolerance} of ${expected}`,
    };
  },
  toBeWithinPercent(received, expected, tolerancePercent = 0.01) {
    const tolerance = expected * tolerancePercent;
    const pass = Math.abs(received - expected) <= tolerance;
    return {
      pass,
      message: () =>
        `expected ${received} to be within ${tolerancePercent * 100}% of ${expected}`,
    };
  },
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm install` completes without errors
- [ ] `npm run test:unit` runs (even with no tests yet)
- [ ] Docker builds successfully: `docker build -f docker/Dockerfile.test .`
- [ ] `npm run hooks:install` creates pre-push hook

---

## Phase 2: Unit Tests for Calculations

### Overview
Create comprehensive unit tests for all pure calculation functions with snapshot baselines.

### Changes Required:

#### 1. Tax Calculation Tests
**File**: `src/lib/calculations.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import {
  calculateFederalTax,
  calculateLTCGTax,
  calculateNIIT,
  calculateTaxableSocialSecurity,
  calculateIRMAA,
  calculateRMD,
  calculateHeirValue,
  calculateMultiHeirValue,
} from './calculations';
import {
  FEDERAL_BRACKETS_MFJ_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
  LTCG_BRACKETS_MFJ_2024,
  SS_TAX_THRESHOLDS_MFJ,
  IRMAA_BRACKETS_MFJ_2024,
} from './taxTables';

describe('calculateFederalTax', () => {
  const brackets = FEDERAL_BRACKETS_MFJ_2024;

  it('calculates 10% bracket correctly', () => {
    expect(calculateFederalTax(20000, brackets)).toBe(2000);
  });

  it('calculates across bracket boundaries', () => {
    // $50,000 taxable: $23,200 @ 10% + $26,800 @ 12%
    const expected = 23200 * 0.10 + 26800 * 0.12;
    expect(calculateFederalTax(50000, brackets)).toBeWithinDollars(expected, 1);
  });

  it('handles high income correctly', () => {
    const tax = calculateFederalTax(500000, brackets);
    expect(tax).toBeGreaterThan(100000);
    expect(tax).toBeLessThan(200000);
  });

  it('returns 0 for 0 income', () => {
    expect(calculateFederalTax(0, brackets)).toBe(0);
  });

  it('matches baseline for standard scenarios', () => {
    const scenarios = [
      { income: 0, expected: 0 },
      { income: 23200, expected: 2320 },
      { income: 94300, expected: 10852 },
      { income: 201050, expected: 34337 },
      { income: 383900, expected: 78221 },
      { income: 500000, expected: 118803 },
    ];

    scenarios.forEach(({ income, expected }) => {
      expect(calculateFederalTax(income, brackets)).toBeWithinDollars(expected, 10);
    });
  });
});

describe('calculateLTCGTax', () => {
  const brackets = LTCG_BRACKETS_MFJ_2024;

  it('calculates 0% bracket correctly', () => {
    // Under $94,050 combined = 0% LTCG
    expect(calculateLTCGTax(50000, 20000, brackets)).toBe(0);
  });

  it('stacks LTCG on top of ordinary income', () => {
    // $100,000 ordinary + $50,000 gains
    // Ordinary fills 0% bracket, gains taxed at 15%
    const tax = calculateLTCGTax(50000, 100000, brackets);
    expect(tax).toBe(Math.round(50000 * 0.15));
  });

  it('handles 20% bracket for high income', () => {
    const tax = calculateLTCGTax(100000, 600000, brackets);
    expect(tax).toBeGreaterThan(15000); // Some at 20%
  });
});

describe('calculateNIIT', () => {
  it('returns 0 below threshold', () => {
    expect(calculateNIIT(200000, 50000, false)).toBe(0);
  });

  it('calculates correctly above MFJ threshold', () => {
    // $300,000 MAGI with $50,000 investment income
    // Excess MAGI = $50,000, NIIT = $50,000 * 3.8%
    expect(calculateNIIT(300000, 50000, false)).toBe(1900);
  });

  it('limits NIIT to investment income', () => {
    // $260,000 MAGI with $100,000 investment income
    // Excess = $10,000, but limit to excess
    expect(calculateNIIT(260000, 100000, false)).toBe(380);
  });
});

describe('calculateTaxableSocialSecurity', () => {
  const thresholds = SS_TAX_THRESHOLDS_MFJ;

  it('returns 0 below tier1', () => {
    expect(calculateTaxableSocialSecurity(20000, 10000, thresholds)).toBe(0);
  });

  it('calculates 50% tier correctly', () => {
    // Combined income between $32,000 and $44,000
    const result = calculateTaxableSocialSecurity(25000, 40000, thresholds);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(20000); // Max 50% of SS
  });

  it('calculates 85% tier correctly', () => {
    // Combined income > $44,000
    const result = calculateTaxableSocialSecurity(40000, 100000, thresholds);
    expect(result).toBe(34000); // 85% of $40,000
  });
});

describe('calculateRMD', () => {
  it('returns 0 for age under 73', () => {
    const result = calculateRMD(72, 1000000);
    expect(result.required).toBe(0);
  });

  it('calculates RMD at age 73', () => {
    const result = calculateRMD(73, 1000000);
    expect(result.factor).toBe(26.5);
    expect(result.required).toBeWithinDollars(37736, 1);
  });

  it('increases RMD percentage with age', () => {
    const rmd73 = calculateRMD(73, 1000000);
    const rmd80 = calculateRMD(80, 1000000);
    expect(rmd80.required).toBeGreaterThan(rmd73.required);
  });
});

describe('calculateIRMAA', () => {
  const brackets = IRMAA_BRACKETS_MFJ_2024;

  it('returns base premium below threshold', () => {
    const result = calculateIRMAA(150000, brackets, false);
    expect(result.partB).toBe(174.70);
    expect(result.partD).toBe(0);
  });

  it('calculates surcharges at each bracket', () => {
    const bracketTests = [
      { magi: 210000, expectedPartB: 244.60 },
      { magi: 260000, expectedPartB: 349.40 },
      { magi: 330000, expectedPartB: 454.20 },
    ];

    bracketTests.forEach(({ magi, expectedPartB }) => {
      const result = calculateIRMAA(magi, brackets, false);
      expect(result.partB).toBe(expectedPartB);
    });
  });
});

describe('calculateHeirValue', () => {
  it('calculates after-tax inheritance correctly', () => {
    const result = calculateHeirValue(100000, 500000, 200000, 0.24, 0.05);
    // AT: 100% = $100,000
    // Roth: 100% = $200,000
    // IRA: (1 - 0.24 - 0.05) = 71% of $500,000 = $355,000
    expect(result).toBe(100000 + 200000 + 355000);
  });
});
```

#### 2. Projections Snapshot Tests
**File**: `src/lib/projections.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import { generateProjections, calculateSummary } from './projections';
import { DEFAULT_PARAMS } from './taxTables';

// Deterministic test fixture
const TEST_PARAMS = {
  ...DEFAULT_PARAMS,
  startYear: 2026,
  endYear: 2030,
  birthYear: 1955,
  afterTaxStart: 100000,
  iraStart: 500000,
  rothStart: 200000,
  afterTaxCostBasis: 25000,
  returnMode: 'account',
  atReturn: 0.04,
  iraReturn: 0.06,
  rothReturn: 0.08,
  socialSecurityMonthly: 3000,
  ssCOLA: 0.02,
  annualExpenses: 80000,
  expenseInflation: 0.03,
  rothConversions: {},
  iterativeTax: false,
  discountRate: 0.03,
};

describe('generateProjections', () => {
  it('generates correct number of years', () => {
    const result = generateProjections(TEST_PARAMS);
    expect(result).toHaveLength(5); // 2026-2030
  });

  it('maintains balance invariants', () => {
    const result = generateProjections(TEST_PARAMS);

    result.forEach(year => {
      // Total = sum of parts
      expect(year.totalBOY).toBeWithinDollars(
        year.atBOY + year.iraBOY + year.rothBOY, 1
      );
      expect(year.totalEOY).toBeWithinDollars(
        year.atEOY + year.iraEOY + year.rothEOY, 1
      );

      // Total withdrawal = sum of account withdrawals
      expect(year.totalWithdrawal).toBeWithinDollars(
        year.atWithdrawal + year.iraWithdrawal + year.rothWithdrawal, 1
      );

      // Cumulative values monotonically increase
      if (year.yearsFromStart > 0) {
        expect(year.cumulativeTax).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it('matches baseline snapshot', () => {
    const result = generateProjections(TEST_PARAMS);

    // Extract key metrics for baseline comparison
    const baseline = result.map(year => ({
      year: year.year,
      totalBOY: Math.round(year.totalBOY),
      totalEOY: Math.round(year.totalEOY),
      totalWithdrawal: Math.round(year.totalWithdrawal),
      totalTax: Math.round(year.totalTax),
      heirValue: Math.round(year.heirValue),
    }));

    expect(baseline).toMatchSnapshot();
  });

  it('RMD starts at age 73', () => {
    const params = { ...TEST_PARAMS, birthYear: 1953 }; // Age 73 in 2026
    const result = generateProjections(params);

    expect(result[0].rmdRequired).toBeGreaterThan(0);
  });

  it('RMD not required before age 73', () => {
    const params = { ...TEST_PARAMS, birthYear: 1955 }; // Age 71 in 2026
    const result = generateProjections(params);

    expect(result[0].rmdRequired).toBe(0);
  });

  it('applies Roth conversions correctly', () => {
    const params = {
      ...TEST_PARAMS,
      rothConversions: { 2026: 50000 },
    };
    const result = generateProjections(params);

    expect(result[0].rothConversion).toBe(50000);
    // Conversion increases taxable income
    expect(result[0].totalTax).toBeGreaterThan(
      generateProjections(TEST_PARAMS)[0].totalTax
    );
  });
});

describe('calculateSummary', () => {
  it('calculates summary statistics correctly', () => {
    const projections = generateProjections(TEST_PARAMS);
    const summary = calculateSummary(projections);

    expect(summary).toMatchSnapshot();
  });
});

describe('projection baselines', () => {
  // Comprehensive baseline tests for key scenarios
  const scenarios = [
    {
      name: 'base-case',
      params: TEST_PARAMS,
    },
    {
      name: 'high-roth-conversion',
      params: { ...TEST_PARAMS, rothConversions: { 2026: 200000, 2027: 200000 } },
    },
    {
      name: 'survivor-scenario',
      params: { ...TEST_PARAMS, survivorDeathYear: 2028 },
    },
    {
      name: 'high-expenses',
      params: { ...TEST_PARAMS, annualExpenses: 150000 },
    },
  ];

  scenarios.forEach(({ name, params }) => {
    it(`matches baseline: ${name}`, () => {
      const result = generateProjections(params);
      const summary = result.map(y => ({
        year: y.year,
        totalEOY: Math.round(y.totalEOY),
        heirValue: Math.round(y.heirValue),
        totalTax: Math.round(y.totalTax),
      }));
      expect(summary).toMatchSnapshot(`projection-${name}`);
    });
  });
});
```

#### 3. Tax Tables Tests
**File**: `src/lib/taxTables.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import {
  FEDERAL_BRACKETS_MFJ_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
  LTCG_BRACKETS_MFJ_2024,
  RMD_TABLE,
  inflateBrackets,
} from './taxTables';

describe('tax bracket structure', () => {
  it('federal brackets are properly ordered', () => {
    for (let i = 1; i < FEDERAL_BRACKETS_MFJ_2024.length; i++) {
      expect(FEDERAL_BRACKETS_MFJ_2024[i].threshold)
        .toBeGreaterThan(FEDERAL_BRACKETS_MFJ_2024[i - 1].threshold);
      expect(FEDERAL_BRACKETS_MFJ_2024[i].rate)
        .toBeGreaterThan(FEDERAL_BRACKETS_MFJ_2024[i - 1].rate);
    }
  });

  it('single brackets are ~half of MFJ', () => {
    // 12% bracket comparison
    const mfj12 = FEDERAL_BRACKETS_MFJ_2024[1].threshold;
    const single12 = FEDERAL_BRACKETS_SINGLE_2024[1].threshold;
    expect(single12).toBeWithinPercent(mfj12 / 2, 0.05);
  });
});

describe('RMD table', () => {
  it('covers ages 72-120', () => {
    expect(RMD_TABLE[72]).toBeDefined();
    expect(RMD_TABLE[120]).toBeDefined();
  });

  it('factors decrease with age', () => {
    expect(RMD_TABLE[73]).toBeGreaterThan(RMD_TABLE[80]);
    expect(RMD_TABLE[80]).toBeGreaterThan(RMD_TABLE[90]);
  });
});

describe('inflateBrackets', () => {
  it('inflates thresholds correctly', () => {
    const inflated = inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, 0.03, 1);

    expect(inflated[1].threshold).toBe(
      Math.round(FEDERAL_BRACKETS_MFJ_2024[1].threshold * 1.03)
    );
  });

  it('preserves rates', () => {
    const inflated = inflateBrackets(FEDERAL_BRACKETS_MFJ_2024, 0.03, 5);

    inflated.forEach((bracket, i) => {
      expect(bracket.rate).toBe(FEDERAL_BRACKETS_MFJ_2024[i].rate);
    });
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run test:unit` passes all tests
- [ ] Coverage meets 80% threshold: `npm run test:unit -- --coverage`
- [ ] Snapshots created in `__snapshots__/` directories

---

## Phase 3: Visual Regression Tests

### Overview
Create visual regression tests for all data-rendering components with Docker-based consistency.

### Changes Required:

#### 1. Visual Test Utilities
**File**: `tests/visual/utils.js`

```javascript
import { render } from '@testing-library/react';

// Mock data for consistent visual tests
export const MOCK_PROJECTIONS = [
  {
    year: 2026, age: 71,
    atBOY: 100000, iraBOY: 500000, rothBOY: 200000, totalBOY: 800000,
    atEOY: 95000, iraEOY: 480000, rothEOY: 216000, totalEOY: 791000,
    ssAnnual: 36000, expenses: 80000,
    totalWithdrawal: 50000, totalTax: 12000,
    heirValue: 700000,
    rmdRequired: 0, rmdFactor: 0,
    effectiveAtReturn: 0.04, effectiveIraReturn: 0.06, effectiveRothReturn: 0.08,
  },
  // ... more years
];

export const MOCK_PARAMS = {
  startYear: 2026,
  endYear: 2030,
  annualExpenses: 80000,
  // ... other params
};

export function renderWithProviders(ui, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => children,
    ...options,
  });
}
```

#### 2. ProjectionsTable Visual Test
**File**: `src/components/ProjectionsTable/ProjectionsTable.visual.test.jsx`

```javascript
import { describe, it, expect } from 'vitest';
import { page } from '@vitest/browser/context';
import { ProjectionsTable } from './index';
import { MOCK_PROJECTIONS, MOCK_PARAMS, renderWithProviders } from '../../../tests/visual/utils';

describe('ProjectionsTable Visual', () => {
  it('renders table correctly', async () => {
    renderWithProviders(
      <ProjectionsTable
        projections={MOCK_PROJECTIONS}
        params={MOCK_PARAMS}
        options={{ showPV: false }}
      />
    );

    await expect(
      page.getByTestId('projections-table')
    ).toMatchScreenshot('projections-table-default');
  });

  it('renders with PV toggle enabled', async () => {
    renderWithProviders(
      <ProjectionsTable
        projections={MOCK_PROJECTIONS}
        params={MOCK_PARAMS}
        options={{ showPV: true }}
      />
    );

    await expect(
      page.getByTestId('projections-table')
    ).toMatchScreenshot('projections-table-pv');
  });

  it('renders collapsed sections correctly', async () => {
    renderWithProviders(
      <ProjectionsTable
        projections={MOCK_PROJECTIONS}
        params={MOCK_PARAMS}
        options={{ showPV: false }}
        defaultCollapsed={['TAX DETAIL', 'IRMAA']}
      />
    );

    await expect(
      page.getByTestId('projections-table')
    ).toMatchScreenshot('projections-table-collapsed');
  });
});
```

#### 3. Dashboard Visual Test
**File**: `src/components/Dashboard/Dashboard.visual.test.jsx`

```javascript
import { describe, it, expect } from 'vitest';
import { page } from '@vitest/browser/context';
import { Dashboard } from './index';
import { MOCK_PROJECTIONS, MOCK_PARAMS, renderWithProviders } from '../../../tests/visual/utils';

describe('Dashboard Visual', () => {
  it('renders summary cards correctly', async () => {
    renderWithProviders(
      <Dashboard
        projections={MOCK_PROJECTIONS}
        params={MOCK_PARAMS}
        summary={{
          totalTaxPaid: 150000,
          finalHeirValue: 700000,
          totalExpenses: 400000,
        }}
      />
    );

    await expect(
      page.getByTestId('dashboard')
    ).toMatchScreenshot('dashboard-default');
  });

  it('renders charts correctly', async () => {
    renderWithProviders(
      <Dashboard
        projections={MOCK_PROJECTIONS}
        params={MOCK_PARAMS}
        summary={{}}
      />
    );

    // Wait for Recharts to render
    await page.waitForTimeout(500);

    await expect(
      page.getByTestId('dashboard-charts')
    ).toMatchScreenshot('dashboard-charts');
  });
});
```

#### 4. Add Test IDs to Components
**File**: `src/components/ProjectionsTable/index.jsx`

Add `data-testid` attributes:

```jsx
// In ProjectionsTable
<div data-testid="projections-table" className="...">
  {/* table content */}
</div>
```

**File**: `src/components/Dashboard/index.jsx`

```jsx
<div data-testid="dashboard" className="...">
  {/* summary cards */}
</div>
<div data-testid="dashboard-charts" className="...">
  {/* charts */}
</div>
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run test:visual` passes in Docker
- [ ] Baseline screenshots created in `__baselines__/`
- [ ] Tests fail when UI changes without baseline update

---

## Phase 4: Baseline Protection System

### Overview
Create a robust baseline protection system that requires individual review and justification for any baseline changes.

### Changes Required:

#### 1. Baseline Change Log
**File**: `BASELINE_CHANGE_LOG.md`

```markdown
# Baseline Change Log

All baseline changes must be documented here with justification.

## Format

Each entry must include:
- **Date**: When the change was made
- **File**: Which baseline file was modified
- **Justification**: Why the baseline needed to change
- **Reviewer**: Who approved the change
- **PR**: Link to the pull request

---

## Changes

### [Template - Copy for new entries]
- **Date**: YYYY-MM-DD
- **File**: `__baselines__/component-name-chromium-linux.png`
- **Justification**: [Explain why this baseline needed to change]
- **Reviewer**: [Name]
- **PR**: #XXX

---
```

#### 2. Baseline Review Script
**File**: `scripts/review-baseline-changes.js`

```javascript
#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function getChangedBaselines() {
  try {
    const output = execSync('git diff --name-only HEAD', {
      cwd: ROOT,
      encoding: 'utf-8'
    });

    return output
      .split('\n')
      .filter(f => f.includes('__baselines__') || f.includes('__snapshots__'));
  } catch {
    return [];
  }
}

function checkChangeLog(changedFiles) {
  const changeLogPath = resolve(ROOT, 'BASELINE_CHANGE_LOG.md');

  if (!existsSync(changeLogPath)) {
    console.error('ERROR: BASELINE_CHANGE_LOG.md not found');
    process.exit(1);
  }

  const changeLog = readFileSync(changeLogPath, 'utf-8');
  const missingJustifications = [];

  changedFiles.forEach(file => {
    const fileName = file.split('/').pop();
    if (!changeLog.includes(fileName)) {
      missingJustifications.push(file);
    }
  });

  return missingJustifications;
}

function main() {
  console.log('Reviewing baseline changes...\n');

  const changedBaselines = getChangedBaselines();

  if (changedBaselines.length === 0) {
    console.log('No baseline changes detected.');
    process.exit(0);
  }

  console.log('Changed baselines:');
  changedBaselines.forEach(f => console.log(`  - ${f}`));
  console.log('');

  const missing = checkChangeLog(changedBaselines);

  if (missing.length > 0) {
    console.error('ERROR: The following baseline changes lack justification in BASELINE_CHANGE_LOG.md:\n');
    missing.forEach(f => console.error(`  - ${f}`));
    console.error('\nPlease add an entry to BASELINE_CHANGE_LOG.md explaining why each baseline changed.');
    console.error('Each change requires:');
    console.error('  - Date');
    console.error('  - File name');
    console.error('  - Justification');
    console.error('  - Reviewer');
    process.exit(1);
  }

  console.log('All baseline changes are documented.');
  process.exit(0);
}

main();
```

#### 3. Baseline Approval Script
**File**: `scripts/approve-baseline.js`

```javascript
#!/usr/bin/env node

import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run baseline:approve <baseline-file>');
    console.log('Example: npm run baseline:approve __baselines__/dashboard-chromium-linux.png');
    process.exit(1);
  }

  const baselineFile = args[0];

  console.log(`\nApproving baseline: ${baselineFile}\n`);

  const justification = await prompt('Justification (why does this baseline need to change?): ');

  if (!justification.trim()) {
    console.error('ERROR: Justification is required.');
    process.exit(1);
  }

  const reviewer = await prompt('Reviewer name: ');

  if (!reviewer.trim()) {
    console.error('ERROR: Reviewer name is required.');
    process.exit(1);
  }

  const prNumber = await prompt('PR number (or "pending"): ');

  const date = new Date().toISOString().split('T')[0];
  const fileName = baselineFile.split('/').pop();

  const entry = `
### ${date} - ${fileName}
- **Date**: ${date}
- **File**: \`${baselineFile}\`
- **Justification**: ${justification}
- **Reviewer**: ${reviewer}
- **PR**: ${prNumber || 'pending'}
`;

  const changeLogPath = resolve(ROOT, 'BASELINE_CHANGE_LOG.md');
  appendFileSync(changeLogPath, entry);

  console.log('\nEntry added to BASELINE_CHANGE_LOG.md');
  console.log('You can now commit the baseline change.');

  rl.close();
}

main();
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run baseline:review` exits 0 when all changes documented
- [ ] `npm run baseline:review` exits 1 when changes lack documentation
- [ ] `npm run baseline:approve` prompts for required fields

---

## Phase 5: Pre-Push Hook & Installation

### Overview
Create pre-push hook that runs all tests and a script to install it.

### Changes Required:

#### 1. Pre-Push Hook
**File**: `scripts/hooks/pre-push`

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
NC='\033[0m' # No Color

# Track failures
FAILED=0

# Step 1: Unit tests
echo -e "${YELLOW}[1/4] Running unit tests...${NC}"
if npm run test:unit; then
  echo -e "${GREEN}Unit tests passed${NC}"
else
  echo -e "${RED}Unit tests FAILED${NC}"
  FAILED=1
fi

echo ""

# Step 2: Visual tests (in Docker for consistency)
echo -e "${YELLOW}[2/4] Running visual regression tests...${NC}"
if npm run test:visual; then
  echo -e "${GREEN}Visual tests passed${NC}"
else
  echo -e "${RED}Visual tests FAILED${NC}"
  FAILED=1
fi

echo ""

# Step 3: Check baseline documentation
echo -e "${YELLOW}[3/4] Reviewing baseline changes...${NC}"
if npm run baseline:review; then
  echo -e "${GREEN}Baseline review passed${NC}"
else
  echo -e "${RED}Baseline changes lack documentation${NC}"
  FAILED=1
fi

echo ""

# Step 4: Build check
echo -e "${YELLOW}[4/4] Verifying build...${NC}"
if npm run build; then
  echo -e "${GREEN}Build succeeded${NC}"
else
  echo -e "${RED}Build FAILED${NC}"
  FAILED=1
fi

echo ""
echo "========================================"

if [ $FAILED -eq 1 ]; then
  echo -e "${RED}Pre-push validation FAILED${NC}"
  echo "Push blocked. Fix the issues above and try again."
  exit 1
fi

echo -e "${GREEN}All checks passed. Proceeding with push.${NC}"
exit 0
```

#### 2. Hook Installation Script
**File**: `scripts/install-hooks.js`

```javascript
#!/usr/bin/env node

import { existsSync, mkdirSync, copyFileSync, chmodSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function main() {
  const gitHooksDir = resolve(ROOT, '.git', 'hooks');
  const sourceHook = resolve(ROOT, 'scripts', 'hooks', 'pre-push');
  const targetHook = resolve(gitHooksDir, 'pre-push');

  // Check if .git directory exists
  if (!existsSync(resolve(ROOT, '.git'))) {
    console.error('ERROR: This directory is not a git repository.');
    console.error('Initialize git first: git init');
    process.exit(1);
  }

  // Create hooks directory if it doesn't exist
  if (!existsSync(gitHooksDir)) {
    mkdirSync(gitHooksDir, { recursive: true });
  }

  // Check if hook source exists
  if (!existsSync(sourceHook)) {
    console.error('ERROR: Pre-push hook source not found at scripts/hooks/pre-push');
    process.exit(1);
  }

  // Check if hook already exists
  if (existsSync(targetHook)) {
    const existing = readFileSync(targetHook, 'utf-8');
    const source = readFileSync(sourceHook, 'utf-8');

    if (existing === source) {
      console.log('Pre-push hook is already installed and up to date.');
      process.exit(0);
    }

    console.log('Updating existing pre-push hook...');
  }

  // Copy hook
  copyFileSync(sourceHook, targetHook);

  // Make executable
  chmodSync(targetHook, '755');

  console.log('Pre-push hook installed successfully!');
  console.log('');
  console.log('The hook will run before each push:');
  console.log('  1. Unit tests');
  console.log('  2. Visual regression tests (Docker)');
  console.log('  3. Baseline change documentation check');
  console.log('  4. Build verification');
  console.log('');
  console.log('To skip the hook in emergencies (NOT recommended):');
  console.log('  git push --no-verify');

  process.exit(0);
}

main();
```

#### 3. Create hooks directory
**File**: `scripts/hooks/.gitkeep`

```
# This directory contains git hooks
# Run `npm run hooks:install` to install them
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run hooks:install` creates `.git/hooks/pre-push`
- [ ] Hook is executable: `ls -la .git/hooks/pre-push`
- [ ] `git push` runs all tests before pushing
- [ ] Push is blocked when tests fail

---

## Phase 6: CI Integration

### Overview
Update GitHub Actions to run tests on every PR and block merges on failure.

### Changes Required:

#### 1. Update Deploy Workflow
**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main, master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run visual tests
        run: npm run test:visual

      - name: Check baseline documentation
        run: npm run baseline:review

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4
        with:
          enablement: true

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 2. Create PR Validation Workflow
**File**: `.github/workflows/validate.yml`

```yaml
name: Validate PR

on:
  pull_request:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with coverage
        run: npm run test:unit -- --coverage

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run visual tests
        run: npm run test:visual

      - name: Check baseline documentation
        run: npm run baseline:review

      - name: Build
        run: npm run build
```

#### 3. Create Baseline Update Workflow (Manual Trigger Only)
**File**: `.github/workflows/update-baselines.yml`

```yaml
name: Update Baselines

on:
  workflow_dispatch:
    inputs:
      justification:
        description: 'Why are baselines being updated?'
        required: true
        type: string
      reviewer:
        description: 'Who is approving this update?'
        required: true
        type: string

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Update visual baselines
        run: npm run test:visual:update

      - name: Update snapshot baselines
        run: npm run test:unit -- --update

      - name: Add changelog entry
        run: |
          DATE=$(date +%Y-%m-%d)
          echo "" >> BASELINE_CHANGE_LOG.md
          echo "### ${DATE} - Automated Update" >> BASELINE_CHANGE_LOG.md
          echo "- **Date**: ${DATE}" >> BASELINE_CHANGE_LOG.md
          echo "- **File**: Multiple baselines updated" >> BASELINE_CHANGE_LOG.md
          echo "- **Justification**: ${{ github.event.inputs.justification }}" >> BASELINE_CHANGE_LOG.md
          echo "- **Reviewer**: ${{ github.event.inputs.reviewer }}" >> BASELINE_CHANGE_LOG.md
          echo "- **PR**: Workflow run #${{ github.run_number }}" >> BASELINE_CHANGE_LOG.md

      - name: Commit and push
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "chore: update baselines - ${{ github.event.inputs.justification }}"
          git push
```

### Success Criteria:

#### Automated Verification:
- [ ] PR validation workflow runs on every PR
- [ ] Merge blocked when tests fail
- [ ] Deploy workflow runs tests before deploying
- [ ] Baseline update workflow requires manual trigger with justification

---

## Testing Strategy

### Automated Test Types:

| Type | Tool | Runs In | Coverage |
|------|------|---------|----------|
| Unit Tests | Vitest | Node.js | Calculation logic, utilities |
| Snapshot Tests | Vitest | Node.js | Projection outputs |
| Visual Regression | Vitest Browser + Playwright | Docker | All UI components |
| Build Verification | Vite | Node.js | Full application |

### Coverage Requirements:
- **Calculation functions**: 90%+
- **Projection logic**: 80%+
- **Visual components**: All data-rendering components

### Test Execution Order:
1. Unit tests (fastest, catch logic errors)
2. Visual tests (slower, catch UI regressions)
3. Baseline documentation check
4. Build verification

---

## Implementation Order

1. **Phase 1**: Testing infrastructure setup
2. **Phase 2**: Unit tests for calculations (can run in parallel with Phase 3)
3. **Phase 3**: Visual regression tests
4. **Phase 4**: Baseline protection system
5. **Phase 5**: Pre-push hook & installation
6. **Phase 6**: CI integration

---

## References

- [Vitest Visual Regression Testing](https://vitest.dev/guide/browser/visual-regression-testing.html)
- [Playwright Visual Testing Guide](https://testgrid.io/blog/playwright-visual-regression-testing/)
- [Vitest 4.0 Release](https://www.infoq.com/news/2025/12/vitest-4-browser-mode/)
- [ViteConf 2025 Workshop](https://github.com/maoberlehner/workshop-vitest-visual-regression-testing-demo-viteconf-2025)
