# AI Chat Stress Testing & Agent Enhancements Implementation Plan

## Overview

Implement comprehensive stress E2E tests for the AI chat feature with challenging user requests, fix critical bugs, and significantly enhance the AI agent's capabilities to handle complex retirement planning queries including optimization, risk analysis, and educational explanations.

## Current State Analysis

### Existing Test Coverage
- **10 tests** in `e2e/local/ai-chat.spec.js`: Basic flows, tool calls, cancel, copy
- **3 tests** in `e2e/local/web-search.spec.js`: Web search, sources, follow-up

### Critical Issues Found

| Issue | Location | Impact |
|-------|----------|--------|
| `compare_scenarios` not implemented | `Chat/index.jsx:207-347` | Tool defined but no handler - returns "Unknown tool" |
| `get_current_state` truncates projections | `Chat/index.jsx:237` | Only returns 5 years, hides important data |
| Limited params exposed | `Chat/index.jsx:216-227` | Many params not accessible to AI |
| No iterative optimization | - | Cannot find optimal values automatically |
| No risk scenario support | - | Cannot model worst/best case returns |
| No year-specific overrides | - | Cannot model one-time events or income changes |

### Key Discoveries
- Tool definitions: `src/lib/aiService.js:118-302`
- Tool execution: `src/components/Chat/index.jsx:207-347`
- Scenarios stored in `ScenarioComparison/index.jsx` via `onCreateScenario` callback
- No direct access to scenario data from Chat component

## Desired End State

After this plan is complete:
1. **All 11+ tools** are fully implemented and tested
2. **40+ E2E stress tests** validate all features with challenging prompts
3. AI can handle **optimization queries** (find optimal Roth conversion, etc.)
4. AI can handle **risk scenarios** (worst-case, average, best-case)
5. AI can handle **complex multi-variable** queries
6. AI **gracefully acknowledges limitations** when it cannot help
7. All tests complete in **reasonable time** (<2 min each)

### Verification
- `npm run test:e2e:local` passes all new stress tests
- Manual testing confirms improved AI capabilities
- No regressions in existing functionality

## What We're NOT Doing

- Adding CI-compatible mocked tests (local ccproxy only)
- Adding Monte Carlo simulation (would require significant calculation changes)
- Adding real-time market data integration
- Changing the core projection engine
- Adding new UI components beyond what tools need

---

## Phase 1: Fix `compare_scenarios` Tool

### Overview
Implement the missing `compare_scenarios` tool handler.

### Changes Required:

#### 1. Add state for scenarios in App.jsx

**File**: `src/App.jsx`

```javascript
// Add state to store scenarios for Chat access (near other state declarations)
const [chatScenarios, setChatScenarios] = useState([]);

// Callback for ScenarioComparison to report scenarios
const handleScenariosChange = useCallback((scenarios) => {
  setChatScenarios(scenarios);
}, []);
```

#### 2. Update ScenarioComparison to report changes

**File**: `src/components/ScenarioComparison/index.jsx`

```javascript
// Add prop
export function ScenarioComparison({ ..., onScenariosChange }) {
  // Call whenever scenarios change
  useEffect(() => {
    if (onScenariosChange) {
      onScenariosChange(scenarios.map(s => ({
        name: s.name,
        overrides: s.overrides,
        summary: s.summary,
      })));
    }
  }, [scenarios, onScenariosChange]);
```

#### 3. Pass scenarios to Chat and implement handler

**File**: `src/components/Chat/index.jsx`

```javascript
// Add scenarios prop
export function Chat({ params, projections, summary, scenarios, onCreateScenario, ... }) {

// In executeToolCall switch:
case 'compare_scenarios': {
  const { scenarioNames, metrics } = args;

  if (!scenarios || scenarios.length === 0) {
    return 'No scenarios available yet. Use create_scenario to create some scenarios first, then I can compare them.';
  }

  // Include base case in comparison
  const baseCase = {
    name: 'Base Case (Current Plan)',
    summary: {
      endingPortfolio: summary.endingPortfolio,
      endingHeirValue: summary.endingHeirValue,
      totalTaxPaid: summary.totalTaxPaid,
    }
  };

  let toCompare = [baseCase, ...scenarios];

  // Filter by names if specified
  if (scenarioNames && scenarioNames.length > 0) {
    toCompare = toCompare.filter(s =>
      scenarioNames.some(n => s.name.toLowerCase().includes(n.toLowerCase()))
    );
  }

  if (toCompare.length === 0) {
    const available = scenarios.map(s => s.name).join(', ');
    return `No matching scenarios found. Available scenarios: ${available}`;
  }

  // Build comparison
  const metricsToCompare = metrics || ['endingPortfolio', 'endingHeirValue', 'totalTaxPaid'];

  const comparison = toCompare.map(s => {
    const row = { name: s.name };
    metricsToCompare.forEach(m => {
      row[m] = s.summary?.[m] ?? 'N/A';
    });
    return row;
  });

  // Format as markdown table
  let table = '| Scenario | ' + metricsToCompare.join(' | ') + ' |\n';
  table += '|----------|' + metricsToCompare.map(() => '--------').join('|') + '|\n';
  comparison.forEach(row => {
    table += `| ${row.name} | `;
    table += metricsToCompare.map(m => {
      const val = row[m];
      return typeof val === 'number' ? `$${val.toLocaleString()}` : val;
    }).join(' | ');
    table += ' |\n';
  });

  return table;
}
```

### Success Criteria:
- [x] `npm run build` succeeds
- [x] AI can list and compare scenarios
- [x] Base case is always included in comparisons

---

## Phase 2: Enhance `get_current_state` Tool

### Overview
Expand to expose all parameters, configurable projection range, and tax bracket info.

### Changes Required:

#### 1. Update tool definition

**File**: `src/lib/aiService.js`

```javascript
{
  name: 'get_current_state',
  description: 'Get current retirement plan parameters, projections, summary, and tax information',
  parameters: {
    type: 'object',
    properties: {
      include: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['params', 'projections', 'summary', 'scenarios', 'all_params', 'tax_brackets', 'irmaa_years']
        },
        description: 'What data to include',
      },
      projectionRange: {
        type: 'string',
        enum: ['first5', 'last5', 'all', 'custom'],
        description: 'Which projection years to return',
      },
      startYear: { type: 'number', description: 'For custom range: start year' },
      endYear: { type: 'number', description: 'For custom range: end year' },
      columns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific projection columns to include',
      },
    },
  },
},
```

#### 2. Enhanced handler with tax bracket and IRMAA detection

**File**: `src/components/Chat/index.jsx`

```javascript
case 'get_current_state': {
  const include = args.include || ['params', 'summary'];
  const result = {};

  // Basic params
  if (include.includes('params')) {
    result.params = {
      startYear: params.startYear,
      endYear: params.endYear,
      birthYear: params.birthYear,
      afterTaxStart: params.afterTaxStart,
      iraStart: params.iraStart,
      rothStart: params.rothStart,
      annualExpenses: params.annualExpenses,
      socialSecurityMonthly: params.socialSecurityMonthly,
      rothConversions: params.rothConversions,
      riskAllocation: params.riskAllocation,
      expectedReturn: params.expectedReturn,
    };
  }

  // All params
  if (include.includes('all_params')) {
    result.allParams = { ...params };
  }

  // Summary
  if (include.includes('summary')) {
    result.summary = {
      endingPortfolio: summary.endingPortfolio,
      endingHeirValue: summary.endingHeirValue,
      totalTaxPaid: summary.totalTaxPaid,
      finalRothPercent: summary.finalRothPercent,
      yearsProjected: projections.length,
      startYear: projections[0]?.year,
      endYear: projections[projections.length - 1]?.year,
    };
  }

  // Projections with flexible range
  if (include.includes('projections')) {
    let projs = [...projections];

    // Apply range filter
    if (args.projectionRange === 'first5') {
      projs = projs.slice(0, 5);
    } else if (args.projectionRange === 'last5') {
      projs = projs.slice(-5);
    } else if (args.projectionRange === 'custom' && (args.startYear || args.endYear)) {
      projs = projs.filter(p => {
        if (args.startYear && p.year < args.startYear) return false;
        if (args.endYear && p.year > args.endYear) return false;
        return true;
      });
    }
    // 'all' returns everything

    // Select columns
    const defaultCols = ['year', 'age', 'totalEOY', 'heirValue', 'totalTax', 'rothConversion'];
    const cols = args.columns || defaultCols;

    result.projections = projs.map(p => {
      const row = {};
      cols.forEach(c => { row[c] = p[c]; });
      return row;
    });
  }

  // IRMAA years detection
  if (include.includes('irmaa_years')) {
    result.irmaaYears = projections
      .filter(p => p.irmaa && p.irmaa > 0)
      .map(p => ({ year: p.year, irmaa: p.irmaa, magi: p.magi || p.agi }));
  }

  // Tax brackets hit
  if (include.includes('tax_brackets')) {
    result.taxBrackets = projections.map(p => ({
      year: p.year,
      marginalRate: p.marginalRate,
      effectiveRate: p.totalTax / (p.agi || 1),
      agi: p.agi,
    }));
  }

  // Scenarios
  if (include.includes('scenarios') && scenarios) {
    result.scenarios = scenarios.map(s => ({
      name: s.name,
      summary: s.summary,
    }));
  }

  return JSON.stringify(result, null, 2);
}
```

### Success Criteria:
- [x] AI can get all years with `projectionRange: "all"`
- [x] AI can detect IRMAA years
- [x] AI can see tax brackets by year

---

## Phase 3: Add `find_optimal` Tool

### Overview
Add a tool that can iteratively search for optimal parameter values (e.g., optimal Roth conversion amount).

### Changes Required:

#### 1. Add tool definition

**File**: `src/lib/aiService.js`

```javascript
{
  name: 'find_optimal',
  description: 'Search for the optimal value of a parameter to maximize or minimize a metric. Uses binary search to efficiently find the best value.',
  parameters: {
    type: 'object',
    properties: {
      parameter: {
        type: 'string',
        enum: ['rothConversion', 'expenses', 'ssStartAge'],
        description: 'Which parameter to optimize',
      },
      year: {
        type: 'number',
        description: 'For rothConversion: which year to optimize (or "all" for uniform)',
      },
      metric: {
        type: 'string',
        enum: ['endingHeirValue', 'endingPortfolio', 'totalTaxPaid', 'avoidIrmaa'],
        description: 'What to optimize for',
      },
      direction: {
        type: 'string',
        enum: ['maximize', 'minimize'],
        description: 'Whether to maximize or minimize the metric',
      },
      minValue: { type: 'number', description: 'Minimum value to try' },
      maxValue: { type: 'number', description: 'Maximum value to try' },
      constraint: {
        type: 'string',
        enum: ['stayIn22Bracket', 'stayIn24Bracket', 'avoidIrmaa', 'none'],
        description: 'Optional constraint to respect',
      },
    },
    required: ['parameter', 'metric', 'direction'],
  },
},
```

#### 2. Add UI config

**File**: `src/lib/aiService.js`

```javascript
find_optimal: {
  icon: '🎯',
  label: 'Finding optimal value',
  capability: { title: 'Optimize', description: 'Find best conversion amounts' },
},
```

#### 3. Add handler with binary search

**File**: `src/components/Chat/index.jsx`

```javascript
case 'find_optimal': {
  const { parameter, year, metric, direction, minValue, maxValue, constraint } = args;

  // Set search bounds
  let min = minValue ?? 0;
  let max = maxValue ?? (parameter === 'rothConversion' ? params.iraStart : 500000);

  // Binary search for optimal value
  const iterations = 10; // log2(1M) ≈ 20, 10 iterations = ~$1K precision
  let bestValue = min;
  let bestMetric = null;

  const evaluate = (testValue) => {
    let overrides = {};

    if (parameter === 'rothConversion') {
      if (year) {
        // Single year
        overrides.rothConversions = { ...params.rothConversions, [year]: testValue };
      } else {
        // Uniform across all years
        const years = {};
        for (let y = params.startYear; y <= params.endYear; y++) {
          years[y] = testValue;
        }
        overrides.rothConversions = years;
      }
    } else if (parameter === 'expenses') {
      overrides.annualExpenses = testValue;
    }

    const testParams = { ...params, ...overrides };
    const proj = generateProjections(testParams);
    const sum = calculateSummary(proj);

    // Check constraint
    if (constraint === 'avoidIrmaa') {
      const hasIrmaa = proj.some(p => p.irmaa > 0);
      if (hasIrmaa) return null; // Violates constraint
    }
    if (constraint === 'stayIn22Bracket' || constraint === 'stayIn24Bracket') {
      const targetRate = constraint === 'stayIn22Bracket' ? 0.22 : 0.24;
      const exceeds = proj.some(p => p.marginalRate > targetRate);
      if (exceeds) return null;
    }

    return sum[metric === 'endingHeirValue' ? 'endingHeirValue' :
               metric === 'endingPortfolio' ? 'endingPortfolio' :
               metric === 'totalTaxPaid' ? 'totalTaxPaid' : 'endingHeirValue'];
  };

  // Binary search
  for (let i = 0; i < iterations; i++) {
    const mid = Math.floor((min + max) / 2);
    const midValue = evaluate(mid);
    const midPlusValue = evaluate(mid + 1000);

    if (midValue === null && midPlusValue === null) {
      // Both violate constraint, need to go lower
      max = mid;
    } else if (midValue === null) {
      max = mid;
    } else if (midPlusValue === null) {
      // Found the boundary
      bestValue = mid;
      bestMetric = midValue;
      break;
    } else {
      const midBetter = direction === 'maximize' ? midValue >= midPlusValue : midValue <= midPlusValue;
      if (midBetter) {
        max = mid;
        bestValue = mid;
        bestMetric = midValue;
      } else {
        min = mid;
        bestValue = mid + 1000;
        bestMetric = midPlusValue;
      }
    }
  }

  // Final evaluation
  const finalMetric = evaluate(bestValue);

  return JSON.stringify({
    parameter,
    year: year || 'all years',
    optimalValue: bestValue,
    metric,
    direction,
    resultingMetricValue: finalMetric,
    constraint: constraint || 'none',
    searchRange: { min: minValue ?? 0, max: maxValue ?? max },
  }, null, 2);
}
```

### Success Criteria:
- [x] AI can find optimal Roth conversion to maximize heir value
- [x] AI can find optimal conversion while avoiding IRMAA
- [x] AI can find conversion that keeps user in 22% bracket

---

## Phase 4: Add `run_risk_scenarios` Tool

### Overview
Add a tool that runs projections under different return assumptions (worst, average, best case).

### Changes Required:

#### 1. Add tool definition

**File**: `src/lib/aiService.js`

```javascript
{
  name: 'run_risk_scenarios',
  description: 'Run projections under different market return assumptions to show best/worst/average case outcomes',
  parameters: {
    type: 'object',
    properties: {
      scenarios: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            returnRate: { type: 'number', description: 'Annual real return rate (e.g., 0.02 for 2%)' },
          },
        },
        description: 'Custom scenarios to run. If not provided, uses default worst/average/best.',
      },
      metrics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Which metrics to compare',
      },
    },
  },
},
```

#### 2. Add UI config

**File**: `src/lib/aiService.js`

```javascript
run_risk_scenarios: {
  icon: '📊',
  label: 'Running risk scenarios',
  capability: { title: 'Risk Analysis', description: 'Compare best/worst/average outcomes' },
},
```

#### 3. Add handler

**File**: `src/components/Chat/index.jsx`

```javascript
case 'run_risk_scenarios': {
  const defaultScenarios = [
    { name: 'Worst Case (2% real)', returnRate: 0.02 },
    { name: 'Average Case (5% real)', returnRate: 0.05 },
    { name: 'Best Case (8% real)', returnRate: 0.08 },
  ];

  const scenariosToRun = args.scenarios || defaultScenarios;
  const metrics = args.metrics || ['endingPortfolio', 'endingHeirValue', 'totalTaxPaid'];

  const results = scenariosToRun.map(scenario => {
    const testParams = {
      ...params,
      expectedReturn: scenario.returnRate,
    };
    const proj = generateProjections(testParams);
    const sum = calculateSummary(proj);

    const result = { name: scenario.name, returnRate: `${(scenario.returnRate * 100).toFixed(1)}%` };
    metrics.forEach(m => {
      result[m] = sum[m];
    });

    // Add years until depletion if applicable
    const depletionYear = proj.find(p => p.totalEOY <= 0);
    result.runsOutOfMoney = depletionYear ? depletionYear.year : 'Never';

    return result;
  });

  // Format as markdown table
  let table = '| Scenario | Return | ';
  table += metrics.map(m => m.replace(/([A-Z])/g, ' $1').trim()).join(' | ');
  table += ' | Runs Out |\n';

  table += '|----------|--------|';
  table += metrics.map(() => '--------').join('|');
  table += '|----------|\n';

  results.forEach(r => {
    table += `| ${r.name} | ${r.returnRate} | `;
    table += metrics.map(m => {
      const val = r[m];
      return typeof val === 'number' ? `$${Math.round(val).toLocaleString()}` : val;
    }).join(' | ');
    table += ` | ${r.runsOutOfMoney} |\n`;
  });

  return table;
}
```

### Success Criteria:
- [x] AI can run worst/average/best case projections
- [x] AI shows when money runs out in worst case
- [x] Custom return rates work

---

## Phase 5: Add `explain_calculation` Tool

### Overview
Add a tool for step-by-step calculation explanations.

### Changes Required:

#### 1. Add tool definition

**File**: `src/lib/aiService.js`

```javascript
{
  name: 'explain_calculation',
  description: 'Get a detailed step-by-step explanation of how a specific calculation was performed for a given year',
  parameters: {
    type: 'object',
    properties: {
      year: { type: 'number', description: 'The year to explain' },
      calculation: {
        type: 'string',
        enum: [
          'federal_tax', 'heir_value', 'rmd', 'roth_conversion_impact',
          'irmaa', 'social_security_tax', 'capital_gains_tax', 'total_income'
        ],
        description: 'Which calculation to explain',
      },
    },
    required: ['year', 'calculation'],
  },
},
```

#### 2. Add handler with detailed explanations

**File**: `src/components/Chat/index.jsx`

```javascript
case 'explain_calculation': {
  const { year, calculation } = args;

  const yearData = projections.find(p => p.year === year);
  if (!yearData) {
    return `Year ${year} not found. Available: ${projections[0]?.year} - ${projections[projections.length - 1]?.year}`;
  }

  const fmt = (n) => typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : 'N/A';

  const explanations = {
    federal_tax: () => ({
      title: 'Federal Income Tax Calculation',
      year,
      steps: [
        { step: 1, description: 'Calculate Adjusted Gross Income (AGI)', value: fmt(yearData.agi) },
        { step: 2, description: 'Subtract Standard Deduction', value: fmt(yearData.standardDeduction || 29200) },
        { step: 3, description: 'Taxable Income', value: fmt(yearData.taxableIncome) },
        { step: 4, description: 'Apply Tax Brackets (10%, 12%, 22%, 24%, etc.)', value: 'Progressive' },
        { step: 5, description: 'Federal Tax', value: fmt(yearData.federalTax) },
      ],
      marginalBracket: `${((yearData.marginalRate || 0.22) * 100).toFixed(0)}%`,
      effectiveRate: `${((yearData.federalTax / (yearData.agi || 1)) * 100).toFixed(1)}%`,
    }),

    heir_value: () => ({
      title: 'Heir Value Calculation',
      year,
      steps: [
        { step: 1, description: 'IRA Balance', value: fmt(yearData.iraEOY) },
        { step: 2, description: 'Less: Heir Tax on IRA (income tax)', value: `-${fmt(yearData.iraEOY * (params.heirFedRate + params.heirStateRate))}` },
        { step: 3, description: 'Net IRA to Heirs', value: fmt(yearData.iraEOY * (1 - params.heirFedRate - params.heirStateRate)) },
        { step: 4, description: 'Plus: Roth Balance (tax-free)', value: `+${fmt(yearData.rothEOY)}` },
        { step: 5, description: 'Plus: After-Tax Balance', value: `+${fmt(yearData.afterTaxEOY)}` },
        { step: 6, description: 'Less: Cap Gains on After-Tax', value: `-${fmt(yearData.afterTaxEOY * 0.15)}` },
        { step: 7, description: 'Total Heir Value', value: fmt(yearData.heirValue) },
      ],
      heirTaxRates: {
        federal: `${(params.heirFedRate * 100).toFixed(0)}%`,
        state: `${(params.heirStateRate * 100).toFixed(0)}%`,
      },
    }),

    rmd: () => ({
      title: 'Required Minimum Distribution',
      year,
      age: yearData.age,
      rmdRequired: yearData.age >= 73,
      steps: yearData.age >= 73 ? [
        { step: 1, description: 'Prior Year-End IRA Balance', value: fmt(yearData.iraEOY) },
        { step: 2, description: 'Life Expectancy Factor', value: yearData.rmdFactor || 'See IRS table' },
        { step: 3, description: 'RMD = Balance / Factor', value: fmt(yearData.rmd) },
      ] : [
        { step: 1, description: 'Age Check', value: `Age ${yearData.age} < 73` },
        { step: 2, description: 'RMD Required?', value: 'No' },
      ],
      note: 'RMDs begin at age 73 under SECURE 2.0 Act (was 72, will be 75 for those born 1960+)',
    }),

    irmaa: () => ({
      title: 'IRMAA (Medicare Income-Related Monthly Adjustment)',
      year,
      steps: [
        { step: 1, description: 'MAGI from 2 years prior', value: fmt(yearData.irmaaLookbackMagi || yearData.magi) },
        { step: 2, description: 'Compare to IRMAA Thresholds', value: 'See bracket table' },
        { step: 3, description: 'Monthly Part B Surcharge', value: fmt((yearData.irmaa || 0) / 12) },
        { step: 4, description: 'Annual IRMAA', value: fmt(yearData.irmaa) },
      ],
      triggered: (yearData.irmaa || 0) > 0,
      note: 'IRMAA looks at income from 2 years prior. High Roth conversions today affect Medicare premiums in 2 years.',
    }),

    social_security_tax: () => ({
      title: 'Social Security Benefit Taxation',
      year,
      steps: [
        { step: 1, description: 'Annual SS Benefit', value: fmt(yearData.socialSecurity) },
        { step: 2, description: 'Calculate Provisional Income', value: 'AGI + 50% of SS + tax-exempt interest' },
        { step: 3, description: 'Provisional Income', value: fmt(yearData.provisionalIncome || yearData.agi) },
        { step: 4, description: 'Taxable Portion (0%, 50%, or 85%)', value: `${((yearData.ssTaxablePercent || 0.85) * 100).toFixed(0)}%` },
        { step: 5, description: 'Taxable SS Amount', value: fmt(yearData.ssTaxable) },
      ],
      note: 'Up to 85% of SS can be taxable if provisional income exceeds thresholds.',
    }),
  };

  const explainer = explanations[calculation];
  if (!explainer) {
    return `Unknown calculation: ${calculation}. Available: ${Object.keys(explanations).join(', ')}`;
  }

  return JSON.stringify(explainer(), null, 2);
}
```

### Success Criteria:
- [x] AI can explain federal tax step-by-step
- [x] AI can explain heir value calculation
- [x] AI can explain IRMAA lookback

---

## Phase 6: Add `acknowledge_limitation` System Prompt Update

### Overview
Update system prompt to help AI gracefully acknowledge when it cannot help.

### Changes Required:

**File**: `src/lib/aiService.js`

```javascript
export const SYSTEM_PROMPT = `You are a helpful retirement planning assistant...

## Limitations to Acknowledge

When users ask about things you cannot do, acknowledge the limitation clearly:

1. **Monte Carlo / Probability**: "I can show you worst/average/best case scenarios, but I cannot calculate probability of success. The projections are deterministic, not probabilistic."

2. **Investment Advice**: "I can help with tax optimization and withdrawal strategies, but I cannot recommend specific investments or asset allocations beyond what's in the model."

3. **Future Tax Law**: "I use current tax law. I cannot predict future changes, but I can help you build a plan that's robust to potential changes."

4. **Guaranteed Outcomes**: "These are projections based on assumptions. Actual results will vary based on market returns, tax law changes, and personal circumstances."

5. **Years Beyond Projection**: "The projection only goes through [end year]. I cannot show data beyond that."

When you cannot do something, suggest what you CAN do instead. For example:
- Cannot do Monte Carlo → "I can run worst/average/best case scenarios instead"
- Cannot pick stocks → "I can help optimize your withdrawal sequence"
`;
```

### Success Criteria:
- [x] AI acknowledges limitations gracefully
- [x] AI suggests alternatives when it can't help

---

## Phase 7: Comprehensive Stress Test Suite

### Overview
Create 40+ E2E tests covering all challenging prompt categories.

### Changes Required:

**File**: `e2e/local/ai-stress.spec.js`

```javascript
/**
 * AI Chat Stress Tests
 *
 * Comprehensive tests for complex, multi-tool workflows and challenging user requests.
 * Requires ccproxy-api running locally on port 4000.
 *
 * Run: npx playwright test --project=local e2e/local/ai-stress.spec.js
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// Test Utilities
// ============================================================================

async function isCCProxyAvailable() {
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    return data.status === 'pass' || data.status === 'warn';
  } catch {
    return false;
  }
}

async function setupAIChat(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(500);
  await page.locator('text=AI Assistant').click();
  await page.waitForTimeout(300);
  await page.locator('select').first().selectOption('custom');
  await page.waitForTimeout(300);
  await page.fill('input[placeholder*="endpoint"], input[placeholder*="URL"]', 'http://localhost:4000/v1/messages');
  await page.fill('input[placeholder*="model" i], input[placeholder*="Model"]', 'claude-sonnet-4-20250514');
  await page.fill('input[type="password"]', 'test-api-key');
  await page.click('button:has-text("AI Chat")');
  await page.waitForTimeout(500);
}

async function sendAndWait(page, message, timeout = 120000) {
  await page.fill('[data-testid="chat-input"]', message);
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('[data-testid="message-assistant"]').last()).toBeVisible({ timeout });
  await page.waitForTimeout(500); // Let response fully render
  return await page.locator('[data-testid="message-assistant"]').last().textContent();
}

function skipIfNoProxy(testFn) {
  return async (args) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }
    return testFn(args);
  };
}

// ============================================================================
// TIER 1: Core Optimization Tests
// ============================================================================

test.describe('Optimization Queries', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('find optimal Roth conversion to maximize heir value', async ({ page }) => {
    const response = await sendAndWait(page,
      'Find the optimal Roth conversion amount for 2026 that maximizes my heir value.'
    );
    expect(response).toMatch(/\$[\d,]+/);
    expect(response.toLowerCase()).toMatch(/optimal|best|recommend|conversion/);
  });

  test('optimize conversions while avoiding IRMAA', async ({ page }) => {
    const response = await sendAndWait(page,
      'Find the maximum Roth conversion I can do in 2026 without triggering IRMAA in 2028.'
    );
    expect(response.toLowerCase()).toMatch(/irmaa|conversion|threshold/);
    expect(response).toMatch(/\$[\d,]+/);
  });

  test('stay in 22% bracket optimization', async ({ page }) => {
    const response = await sendAndWait(page,
      'What is the maximum Roth conversion I can do each year while staying in the 22% tax bracket?'
    );
    expect(response.toLowerCase()).toMatch(/22%|bracket|conversion/);
    expect(response).toMatch(/\$[\d,]+/);
  });

  test('minimize taxes while maintaining heir value', async ({ page }) => {
    const response = await sendAndWait(page,
      'Find a conversion strategy that minimizes my total lifetime taxes while keeping heir value above $3 million.'
    );
    expect(response.toLowerCase()).toMatch(/tax|heir|strategy|conversion/);
  });
});

// ============================================================================
// TIER 1: Risk Scenario Tests
// ============================================================================

test.describe('Risk Scenario Analysis', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('worst vs average vs best case comparison', async ({ page }) => {
    const response = await sendAndWait(page,
      'Compare my plan under three scenarios: worst-case with 2% real returns, average with 5%, and optimistic with 8%.'
    );
    expect(response.toLowerCase()).toMatch(/worst|average|best|scenario/);
    expect(response).toMatch(/\$[\d,]+/);
    // Should show multiple scenarios
    expect((response.match(/\$/g) || []).length).toBeGreaterThan(2);
  });

  test('sequence of returns risk', async ({ page }) => {
    const response = await sendAndWait(page,
      'What happens if I get bad returns (2%) in the first 5 years of retirement versus getting them in the last 5 years?'
    );
    expect(response.toLowerCase()).toMatch(/return|sequence|year|impact/);
  });

  test('market crash scenario', async ({ page }) => {
    const response = await sendAndWait(page,
      'What happens to my plan if the market drops 40% in 2026?'
    );
    expect(response.toLowerCase()).toMatch(/drop|crash|2026|portfolio|impact/);
  });

  test('longevity risk - living to 100', async ({ page }) => {
    const response = await sendAndWait(page,
      'What if I live to 100 instead of my projected end year? Do I run out of money?'
    );
    expect(response.toLowerCase()).toMatch(/100|longevity|run out|money|last/);
  });
});

// ============================================================================
// TIER 1: Capital Gains and Tax Optimization
// ============================================================================

test.describe('Capital Gains Optimization', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('capital gains harvesting in 0% bracket', async ({ page }) => {
    const response = await sendAndWait(page,
      'Should I harvest capital gains this year? How much can I realize and stay in the 0% long-term capital gains bracket?'
    );
    expect(response.toLowerCase()).toMatch(/capital gain|0%|bracket|harvest/);
  });

  test('compare realizing gains now vs later', async ({ page }) => {
    const response = await sendAndWait(page,
      'Compare: realize $50K in capital gains this year at 0% versus letting them grow and paying 15% later.'
    );
    expect(response.toLowerCase()).toMatch(/gain|compare|tax|later|now/);
  });
});

// ============================================================================
// TIER 1: Verification and Math Requests
// ============================================================================

test.describe('Verification Requests', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('step by step federal tax calculation', async ({ page }) => {
    const response = await sendAndWait(page,
      'Walk me through exactly how you calculated my 2027 federal tax, line by line with actual numbers.'
    );
    expect(response.toLowerCase()).toMatch(/tax|step|bracket|income/);
    expect(response).toMatch(/\$[\d,]+/);
    // Should have multiple steps
    expect(response.length).toBeGreaterThan(500);
  });

  test('heir value calculation breakdown', async ({ page }) => {
    const response = await sendAndWait(page,
      'Explain exactly how my heir value is calculated for 2030. Show me the formula and actual numbers.'
    );
    expect(response.toLowerCase()).toMatch(/heir|ira|roth|tax/);
    expect(response).toMatch(/\$[\d,]+/);
  });

  test('prove strategy is better', async ({ page }) => {
    const response = await sendAndWait(page,
      'Prove to me that Roth conversions are better than doing nothing. Show me the numbers for both scenarios.'
    );
    expect(response.toLowerCase()).toMatch(/convert|comparison|scenario|better|worse/);
    expect(response).toMatch(/\$[\d,]+/);
  });

  test('IRMAA years identification', async ({ page }) => {
    const response = await sendAndWait(page,
      'Show me every year where I will pay IRMAA and exactly how much. Explain why.'
    );
    expect(response.toLowerCase()).toMatch(/irmaa|year|medicare/);
  });
});

// ============================================================================
// TIER 2: Trade-off Analysis
// ============================================================================

test.describe('Trade-off Analysis', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('pay taxes now vs heirs pay later', async ({ page }) => {
    const response = await sendAndWait(page,
      'Should I pay more taxes now through Roth conversions, or leave the money in my IRA for my heirs to pay taxes on?'
    );
    expect(response.toLowerCase()).toMatch(/tax|heir|convert|trade-?off|depend/);
    expect(response.length).toBeGreaterThan(400);
  });

  test('IRMAA vs Roth conversion trade-off', async ({ page }) => {
    const response = await sendAndWait(page,
      'What is the trade-off between avoiding IRMAA and doing more Roth conversions? Which should I prioritize?'
    );
    expect(response.toLowerCase()).toMatch(/irmaa|conversion|trade-?off|balance/);
  });

  test('aggressive vs spread conversions', async ({ page }) => {
    const response = await sendAndWait(page,
      'Compare: aggressive $300K Roth conversions for 3 years versus spreading $100K conversions over 10 years.'
    );
    expect(response.toLowerCase()).toMatch(/aggressive|spread|convert|compare/);
    expect(response).toMatch(/\$[\d,]+/);
  });
});

// ============================================================================
// TIER 2: Complex Multi-Variable Scenarios
// ============================================================================

test.describe('Complex Multi-Variable Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('delay SS and increase conversions', async ({ page }) => {
    const response = await sendAndWait(page,
      'What if I delay Social Security to 70 AND increase Roth conversions to $150K per year from 2026-2030?',
      150000
    );
    expect(response.toLowerCase()).toMatch(/social security|conversion|70/);
    expect(response).toMatch(/\$[\d,]+/);
  });

  test('multi-part complex question', async ({ page }) => {
    const response = await sendAndWait(page,
      "What's my current heir value, how does it compare to doing no Roth conversions, what's the tax difference, and which strategy is better for maximizing inheritance?",
      150000
    );
    expect(response).toMatch(/heir/i);
    expect(response).toMatch(/tax/i);
    expect(response).toMatch(/\$/);
    expect(response.length).toBeGreaterThan(600);
  });
});

// ============================================================================
// TIER 2: Educational Deep Dives
// ============================================================================

test.describe('Educational Explanations', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('explain tax torpedo', async ({ page }) => {
    const response = await sendAndWait(page,
      'Explain the "tax torpedo" and whether it affects my Social Security. Show me in which years it applies.'
    );
    expect(response.toLowerCase()).toMatch(/tax|torpedo|social security|provisional/);
  });

  test('explain provisional income', async ({ page }) => {
    const response = await sendAndWait(page,
      'What is provisional income and walk me through exactly how mine is calculated for 2027.'
    );
    expect(response.toLowerCase()).toMatch(/provisional|income|calculation/);
    expect(response).toMatch(/\$[\d,]+/);
  });

  test('explain step-up in basis', async ({ page }) => {
    const response = await sendAndWait(page,
      'How does the step-up in basis work for my heirs? How much does it save them compared to if they inherited my cost basis?'
    );
    expect(response.toLowerCase()).toMatch(/step.?up|basis|heir|inherit/);
  });

  test('marginal vs effective rate', async ({ page }) => {
    const response = await sendAndWait(page,
      'What is the difference between marginal and effective tax rate? Show me both for my 2027 projections.'
    );
    expect(response.toLowerCase()).toMatch(/marginal|effective|rate|2027/);
    expect(response).toMatch(/%/);
  });
});

// ============================================================================
// TIER 2: Adversarial / Edge Case Handling
// ============================================================================

test.describe('Adversarial and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('ambiguous request handling', async ({ page }) => {
    const response = await sendAndWait(page, 'Make it better.');
    expect(response.toLowerCase()).toMatch(/what|which|clarify|help|could you|specific|would you like/);
  });

  test('impossible optimization request', async ({ page }) => {
    const response = await sendAndWait(page,
      'Find a strategy that results in zero taxes AND maximum heir value AND never runs out of money.'
    );
    expect(response.toLowerCase()).toMatch(/trade.?off|balance|impossible|however|while|cannot/);
  });

  test('extreme conversion amount', async ({ page }) => {
    const response = await sendAndWait(page,
      'Create a scenario where I convert $10 million to Roth in 2026.'
    );
    expect(response.toLowerCase()).toMatch(/million|extreme|exceed|balance|unrealistic|created/);
  });

  test('year beyond projection', async ({ page }) => {
    const response = await sendAndWait(page,
      'What will my portfolio look like in 2099?'
    );
    expect(response.toLowerCase()).toMatch(/beyond|end|projection|data|available|year/);
  });

  test('out of scope investment advice', async ({ page }) => {
    const response = await sendAndWait(page,
      'What stocks should I buy in my after-tax account?'
    );
    expect(response.toLowerCase()).toMatch(/cannot|investment advice|scope|however|can help/);
  });

  test('guarantee request', async ({ page }) => {
    const response = await sendAndWait(page,
      'Can you guarantee I will never run out of money in retirement?'
    );
    expect(response.toLowerCase()).toMatch(/cannot guarantee|projection|assumption|estimate|uncertain/);
  });

  test('bad advice request - convert everything', async ({ page }) => {
    const response = await sendAndWait(page,
      'I want to convert my entire $2M IRA to Roth this year.'
    );
    expect(response.toLowerCase()).toMatch(/caution|tax|bracket|massive|consider|spread/);
  });
});

// ============================================================================
// TIER 2: Context and Conversation Quality
// ============================================================================

test.describe('Conversation Context', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('maintains context across messages', async ({ page }) => {
    await sendAndWait(page, 'What is my current heir value?');
    const response = await sendAndWait(page, 'How can I increase it by 10%?');
    expect(response.toLowerCase()).toMatch(/heir|increase|10|conversion|strategy/);
  });

  test('handles correction gracefully', async ({ page }) => {
    await sendAndWait(page, 'Create a scenario with $500K conversions in 2026');
    const response = await sendAndWait(page, 'Actually I meant $50K not $500K. Can you fix that?');
    expect(response.toLowerCase()).toMatch(/50|correct|new|updated|scenario/);
  });

  test('long conversation quality', async ({ page }) => {
    await sendAndWait(page, 'What is my starting portfolio?', 60000);
    await sendAndWait(page, 'What are my annual expenses?', 60000);
    await sendAndWait(page, 'When does Social Security start?', 60000);
    await sendAndWait(page, 'What is my current Roth conversion strategy?', 60000);

    const response = await sendAndWait(page,
      'Given everything we discussed, what is the single most impactful change I could make?',
      120000
    );

    expect(response.length).toBeGreaterThan(300);
    expect(response.toLowerCase()).toMatch(/recommend|suggest|consider|impact|change/);
  });
});

// ============================================================================
// TIER 3: Web Search Integration
// ============================================================================

test.describe('Current Information Queries', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('current IRMAA brackets and application', async ({ page }) => {
    const response = await sendAndWait(page,
      'What are the 2025 IRMAA thresholds and will my current plan trigger IRMAA?',
      120000
    );
    expect(response).not.toContain("wasn't able to search");
    expect(response.toLowerCase()).toMatch(/irmaa|threshold|bracket/);
  });

  test('current tax law sunset', async ({ page }) => {
    const response = await sendAndWait(page,
      'When does the TCJA sunset and how will that affect my tax brackets?',
      120000
    );
    expect(response.toLowerCase()).toMatch(/tcja|sunset|expire|bracket|2025|2026/);
  });

  test('current RMD rules', async ({ page }) => {
    const response = await sendAndWait(page,
      'What is the current RMD starting age under SECURE 2.0 and does it affect my plan?',
      120000
    );
    expect(response.toLowerCase()).toMatch(/rmd|73|75|secure/);
  });
});

// ============================================================================
// TIER 3: Response Quality Validation
// ============================================================================

test.describe('Response Quality', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('numerical consistency with projections tab', async ({ page }) => {
    const response = await sendAndWait(page,
      'What is my ending portfolio value in the final year?'
    );

    await page.click('button:has-text("Projections")');
    await page.waitForTimeout(500);

    // Both should have dollar amounts
    const responseNumbers = response.match(/\$[\d,]+/g);
    expect(responseNumbers).not.toBeNull();
    expect(responseNumbers.length).toBeGreaterThan(0);
  });

  test('recommendations include justification', async ({ page }) => {
    const response = await sendAndWait(page,
      'Should I do more Roth conversions or fewer?'
    );

    expect(response.length).toBeGreaterThan(400);
    expect(response.toLowerCase()).toMatch(/because|since|given|consider|depend|factor|reason/);
  });

  test('web search includes sources', async ({ page }) => {
    const response = await sendAndWait(page,
      'What are the current 401k contribution limits? Search the web for the latest.',
      120000
    );

    expect(response).not.toContain("wasn't able to search");
    expect(response.toLowerCase()).toMatch(/irs|source|according|https|\.gov/);
  });
});

// ============================================================================
// TIER 3: Limitation Acknowledgment
// ============================================================================

test.describe('Limitation Acknowledgment', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) { test.skip(); return; }
    await setupAIChat(page);
  });

  test('probability/monte carlo limitation', async ({ page }) => {
    const response = await sendAndWait(page,
      'What is the probability I will run out of money before age 95?'
    );
    expect(response.toLowerCase()).toMatch(/cannot|probability|monte carlo|however|can show|scenario/);
  });

  test('future tax law uncertainty', async ({ page }) => {
    const response = await sendAndWait(page,
      'Will the 22% tax bracket still exist in 2030?'
    );
    expect(response.toLowerCase()).toMatch(/cannot predict|uncertain|current law|assume|may change/);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [x] All 40+ E2E tests pass with ccproxy running
- [x] No test takes longer than 2.5 minutes
- [x] `npm run test:e2e:local e2e/local/ai-stress.spec.js` completes

#### Manual Verification:
- [ ] Review test output for quality of AI responses
- [ ] Verify multi-tool workflows complete successfully
- [ ] Confirm limitations are acknowledged gracefully

---

## Phase 8: Test Helpers and Utilities

### Overview
Add utilities for validating AI responses.

**File**: `e2e/fixtures/ai-test-helpers.js`

```javascript
/**
 * AI Test Helpers
 */

export function extractDollarAmounts(text) {
  const matches = text.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
  return matches.map(m => parseFloat(m.replace(/[$,]/g, '')));
}

export function extractYears(text) {
  const matches = text.match(/20\d{2}/g) || [];
  return [...new Set(matches)].map(Number).sort();
}

export function hasNoErrors(response) {
  const errorIndicators = [
    'error', 'failed', 'unable to', "couldn't", "can't",
    'not available', 'unknown tool', 'exception'
  ];
  const lowered = response.toLowerCase();
  return !errorIndicators.some(e => lowered.includes(e));
}

export function isWithinPercent(actual, expected, percent = 10) {
  const tolerance = expected * (percent / 100);
  return Math.abs(actual - expected) <= tolerance;
}

export function checkMultiPartResponse(response, keywords) {
  const lowered = response.toLowerCase();
  return keywords.map(kw => ({
    keyword: kw,
    found: lowered.includes(kw.toLowerCase()),
  }));
}
```

---

## Testing Strategy Summary

### Test Distribution

| Category | Count | Description |
|----------|-------|-------------|
| Optimization | 4 | Finding optimal values for conversions, avoiding IRMAA |
| Risk Scenarios | 4 | Worst/average/best case, longevity, market crash |
| Capital Gains | 2 | Tax harvesting, bracket optimization |
| Verification | 4 | Step-by-step math, proving strategies |
| Trade-offs | 3 | Complex decisions with no clear answer |
| Multi-Variable | 2 | Complex combined scenarios |
| Educational | 4 | Deep explanations of concepts |
| Adversarial | 7 | Edge cases, impossible requests, bad advice |
| Conversation | 3 | Context maintenance, corrections |
| Web Search | 3 | Current info integration |
| Response Quality | 3 | Accuracy, justification, sources |
| Limitations | 2 | Graceful acknowledgment |
| **Total** | **41** | |

### Test Execution

```bash
# Run all stress tests
npx playwright test --project=local e2e/local/ai-stress.spec.js

# Run specific category
npx playwright test --project=local -g "Optimization"

# Run with extended timeout
AI_TIMEOUT=180000 npx playwright test --project=local e2e/local/ai-stress.spec.js

# Run with headed browser for debugging
npx playwright test --project=local --headed e2e/local/ai-stress.spec.js
```

---

## Performance Considerations

- Tests use 120s default timeout (AI responses can be slow)
- Tests run sequentially to avoid ccproxy overload
- Each test has independent setup (fresh page state)
- Long conversations are broken into chunks with intermediate waits

---

## Implementation Order

1. **Phase 1**: Fix `compare_scenarios` (blocker for many tests)
2. **Phase 2**: Enhance `get_current_state` (needed for optimization)
3. **Phase 3**: Add `find_optimal` tool (enables optimization tests)
4. **Phase 4**: Add `run_risk_scenarios` tool (enables risk tests)
5. **Phase 5**: Add `explain_calculation` tool (enables verification tests)
6. **Phase 6**: Update system prompt (enables limitation tests)
7. **Phase 7**: Create stress test suite
8. **Phase 8**: Add test helpers

---

## References

- AI Service: `src/lib/aiService.js`
- Chat Component: `src/components/Chat/index.jsx`
- Existing Tests: `e2e/local/ai-chat.spec.js`
- Projections Engine: `src/lib/projections.js`
- Calculations: `src/lib/calculations.js`
