# Calculation Inspector Enhancement Plan

## Overview

Enhance the Calculation Inspector to provide complete formula traceability. Every number displayed in a formula should either be a clickable projection table cell or a clearly identified user model input. Users should be able to trace any calculation back to its ultimate sources.

## Current State Analysis

### What Exists (`src/components/CalculationInspector/index.jsx` - ~1800 lines)

**Good:**
- `ClickableFormula` component that parses formula text and highlights recognized variables
- Variables matching `FORMULA_COLORS` keys are clickable and navigate to source calculations
- `CELL_DEPENDENCIES` in `calculationDependencies.js` maps fields to their input dependencies
- "Used By" section shows forward references via `getReverseDependencies()`
- Back/forward navigation history via `useInspectorNavigation` hook

**Issues:**
1. **User inputs not traceable**: Fields like `expenses`, `ssAnnual`, `standardDeduction` come from params but show as non-clickable plain numbers
2. **Hardcoded values in formulas**: e.g., NIIT shows "$250K threshold" instead of actual `NIIT_THRESHOLD_MFJ` value
3. **Formula text ≠ actual computation**: The `formula` field is descriptive prose, not the actual calculation with substituted values
4. **Complex calculations not decomposed**: Withdrawal calculations involve 5+ steps but show as single formula
5. **File size**: ~1800 lines - CALCULATIONS object alone is ~1300 lines
6. **Duplicate code**: `ClickableFormula` and `ColorCodedFormula` share 90% of their logic

### Key Discoveries

**User Model Inputs** (from `DEFAULT_PARAMS` in `taxTables.js`):
- Starting balances: `afterTaxStart`, `iraStart`, `rothStart`, `afterTaxCostBasis`
- Timeline: `birthYear`, `startYear`, `endYear`
- Social Security: `socialSecurityMonthly`, `ssCOLA`
- Expenses: `annualExpenses`, `expenseInflation`, `expenseOverrides`
- Returns: `atReturn`, `iraReturn`, `rothReturn`, `lowRiskReturn`, etc.
- Tax: `stateTaxRate`, `capitalGainsPercent`, `bracketInflation`
- Overrides: `rothConversions`, `atHarvestOverrides`

**Projection Fields with No CALCULATIONS Entry** (fallback to basic display):
- `costBasisBOY`, `costBasisEOY` - Have dependencies but no detailed explanation
- `expenses` - Marked as input but actually computed from `annualExpenses * inflation`
- `ssAnnual` - Computed from `socialSecurityMonthly * 12 * COLA^years`
- `standardDeduction` - Computed from params + age bonus

## Desired End State

After this plan is complete:

1. **Every number in a formula is clickable** - either navigates to another calculation or shows input source
2. **Input sources are clearly identified** - Section showing "This value comes from: Annual Expenses input ($120K)"
3. **Complex formulas are decomposed** - Multi-step calculations show intermediate steps
4. **File is well-organized** - Split into focused modules (<400 lines each)
5. **Forward/backward navigation works for all fields** - Including input parameters

### Verification
- Click any number in any formula → see where it comes from
- Click "expenses" → see it computed from `annualExpenses × inflation^years`
- Click withdrawal amount → see step-by-step withdrawal priority logic
- All fields in projections table have inspector entries

## What We're NOT Doing

- Changing the actual calculation logic (only improving visibility)
- Redesigning the inspector modal UI layout
- Adding printable/exportable calculation trails
- Linking input sources to the Input Panel (just show values inline)

## Design Decisions

1. **Refactor first**: Complete Phase 1 (file structure refactor) before adding new features
2. **Formula complexity guideline**: Keep formulas to ~10 inputs maximum. If a formula has more inputs, either:
   - Break it into step-by-step sub-calculations in the inspector, OR
   - Add intermediate rows to the projections table (use sparingly)
3. **Input source display**: Show input source values inline in the inspector with a clear "User Input" indicator - no navigation to the Input Panel needed

## Implementation Approach

Split into 4 phases:
1. **Refactor file structure** - Make code maintainable before adding features
2. **Add input source tracking** - Connect calculations to user model inputs
3. **Enhance formula decomposition** - Break down complex calculations
4. **Complete coverage** - Add missing CALCULATIONS entries

---

## Phase 1: Refactor File Structure

### Overview
Split the 1800-line CalculationInspector into focused modules for maintainability.

### Changes Required

#### 1. Extract Calculation Definitions
**File**: `src/lib/calculationDefinitions.js` (new file)
**Changes**: Move the entire `CALCULATIONS` object from CalculationInspector

```javascript
// src/lib/calculationDefinitions.js
import { fK, fM, f$, fmtPct } from './formatters';

// Helper formatters (move from CalculationInspector)
const fK = v => '$' + (v / 1000).toFixed(0) + 'K';
const fM = v => '$' + (v / 1000000).toFixed(2) + 'M';
const f$ = v => '$' + Math.round(v).toLocaleString();

export const CALCULATIONS = {
  atBOY: { ... },
  iraBOY: { ... },
  // ... all ~40 calculation definitions
};
```

#### 2. Extract ClickableFormula Component
**File**: `src/components/CalculationInspector/ClickableFormula.jsx` (new file)
**Changes**: Extract and consolidate formula rendering

```javascript
// src/components/CalculationInspector/ClickableFormula.jsx
import { FORMULA_COLORS } from '../../lib/colors';
import { CELL_DEPENDENCIES } from '../../lib/calculationDependencies';
import { CALCULATIONS } from '../../lib/calculationDefinitions';

export function ClickableFormula({ formula, data, projections, onNavigate, currentField }) {
  // Existing ClickableFormula logic
  // If onNavigate is null, render non-clickable (replaces ColorCodedFormula)
}
```

#### 3. Simplify Main Component
**File**: `src/components/CalculationInspector/index.jsx`
**Changes**: Import from extracted modules, keep only the modal structure

```javascript
// src/components/CalculationInspector/index.jsx
import { CALCULATIONS } from '../../lib/calculationDefinitions';
import { ClickableFormula } from './ClickableFormula';
import { getReverseDependencies } from '../../lib/calculationDependencies';

export function CalculationInspector({ ... }) {
  // Modal structure and layout only (~300 lines)
}
```

### Success Criteria

#### Automated Verification:
- [x] `npm run lint` passes
- [x] `npm run test` passes (all existing tests)
- [x] `npm run build` completes without errors

#### Manual Verification:
- [x] Click any cell in projections table → inspector opens with same content as before
- [x] Navigation (back/forward) still works
- [x] "Used By" section still shows forward references
- [x] No visual differences in inspector modal

---

## Phase 2: Add Input Source Tracking

### Overview
Create a system to identify which user model inputs feed into each calculation, and display these as a new "Input Sources" section in the inspector.

### Changes Required

#### 1. Define Input Source Mappings
**File**: `src/lib/inputSources.js` (new file)
**Changes**: Map projection fields to their ultimate input parameters

```javascript
// src/lib/inputSources.js

/**
 * Maps computed projection fields to the user model inputs they derive from.
 * Each entry lists the params keys and how they're used.
 */
export const INPUT_SOURCES = {
  // Expenses is computed from annualExpenses × inflation^years
  expenses: {
    sources: [
      { param: 'annualExpenses', label: 'Annual Expenses', transform: 'base' },
      { param: 'expenseInflation', label: 'Expense Inflation', transform: 'growth' },
    ],
    formula: 'annualExpenses × (1 + expenseInflation)^yearsFromStart',
  },

  // Social Security annual
  ssAnnual: {
    sources: [
      { param: 'socialSecurityMonthly', label: 'SS Monthly', transform: '×12' },
      { param: 'ssCOLA', label: 'SS COLA', transform: 'growth' },
    ],
    formula: 'socialSecurityMonthly × 12 × (1 + ssCOLA)^yearsFromStart',
  },

  // Standard deduction
  standardDeduction: {
    sources: [
      { param: 'filingStatus', label: 'Filing Status', transform: 'lookup' },
      { param: 'bracketInflation', label: 'Bracket Inflation', transform: 'growth' },
    ],
    formula: 'baseDeduction(filingStatus) + seniorBonus × (1 + inflation)^years',
  },

  // First year balances
  atBOY: {
    firstYearOnly: true,
    sources: [
      { param: 'afterTaxStart', label: 'Starting AT Balance', transform: 'direct' },
    ],
    formula: 'afterTaxStart (first year only)',
  },

  iraBOY: {
    firstYearOnly: true,
    sources: [
      { param: 'iraStart', label: 'Starting IRA Balance', transform: 'direct' },
    ],
    formula: 'iraStart (first year only)',
  },

  rothBOY: {
    firstYearOnly: true,
    sources: [
      { param: 'rothStart', label: 'Starting Roth Balance', transform: 'direct' },
    ],
    formula: 'rothStart (first year only)',
  },

  // Returns
  effectiveAtReturn: {
    sources: [
      { param: 'returnMode', label: 'Return Mode', transform: 'lookup' },
      { param: 'atReturn', label: 'AT Return (account mode)', transform: 'direct' },
      { param: 'lowRiskReturn', label: 'Low Risk Return', transform: 'blended' },
      { param: 'modRiskReturn', label: 'Mod Risk Return', transform: 'blended' },
      { param: 'highRiskReturn', label: 'High Risk Return', transform: 'blended' },
    ],
    formula: 'Based on returnMode: account-specific or risk-weighted blend',
  },

  // Roth conversion overrides
  rothConversion: {
    sources: [
      { param: 'rothConversions', label: 'Roth Conversion Schedule', transform: 'yearly' },
    ],
    formula: 'rothConversions[year] or 0',
  },

  // IRMAA lookback
  irmaaMAGI: {
    sources: [
      { param: 'magi2024', label: 'MAGI 2024', transform: 'lookback-2' },
      { param: 'magi2025', label: 'MAGI 2025', transform: 'lookback-2' },
    ],
    formula: 'MAGI from 2 years prior (for IRMAA calculation)',
  },

  // Tax parameters that are constants
  stateTax: {
    sources: [
      { param: 'stateTaxRate', label: 'IL State Tax Rate', transform: 'rate' },
    ],
    formula: 'capitalGains × stateTaxRate',
  },
};

/**
 * Get input sources for a field, if any.
 * Returns null if field doesn't have direct input sources.
 */
export function getInputSources(field, year, yearsFromStart, params) {
  const config = INPUT_SOURCES[field];
  if (!config) return null;

  // Handle first-year-only fields
  if (config.firstYearOnly && yearsFromStart > 0) return null;

  return {
    formula: config.formula,
    sources: config.sources.map(s => ({
      ...s,
      value: params[s.param],
      formatted: formatParamValue(s.param, params[s.param]),
    })),
  };
}

function formatParamValue(param, value) {
  if (value === undefined || value === null) return 'N/A';
  if (typeof value === 'number') {
    if (param.includes('Rate') || param.includes('Return') || param.includes('Inflation') || param.includes('Percent')) {
      return (value * 100).toFixed(1) + '%';
    }
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
    return '$' + Math.round(value).toLocaleString();
  }
  return String(value);
}
```

#### 2. Add Input Sources Section to Inspector
**File**: `src/components/CalculationInspector/index.jsx`
**Changes**: Add new "Input Sources" section when applicable, with clear "User Input" indicator

```jsx
// In the inspector render, after the formula section:

{/* Input Sources Section */}
{inputSources && (
  <div>
    <div className="text-slate-400 text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
      Input Sources
      <span className="text-xs px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded">
        User Inputs
      </span>
    </div>
    <div className="bg-slate-950 rounded p-3 space-y-2">
      <div className="text-slate-500 text-sm italic">{inputSources.formula}</div>
      {inputSources.sources.map((source, idx) => (
        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800 last:border-0">
          <span className="text-slate-400 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            {source.label}
          </span>
          <span className="text-amber-400 font-mono text-sm">{source.formatted}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

#### 3. Update CELL_DEPENDENCIES for Input Fields
**File**: `src/lib/calculationDependencies.js`
**Changes**: Ensure input fields return empty arrays and are marked correctly

Already correct:
```javascript
ssAnnual: () => [], // Input field, no dependencies
expenses: () => [], // Input field, no dependencies
```

### Success Criteria

#### Automated Verification:
- [x] `npm run lint` passes
- [x] `npm run test` passes
- [x] New file `inputSources.js` has no TypeScript/lint errors

#### Manual Verification:
- [x] Click `expenses` in any year → see "Input Sources" section showing `annualExpenses` and `expenseInflation`
- [x] Click `ssAnnual` → see SS Monthly and COLA inputs
- [x] Click first year `atBOY` → see "Starting AT Balance" input
- [x] Click second year `atBOY` → see it comes from prior year `atEOY` (no input sources section)
- [x] Input source values show with proper formatting ($, %, K, M)

---

## Phase 3: Enhance Formula Decomposition

### Overview
Break down complex multi-step calculations into clickable intermediate steps. Focus on withdrawal calculations and tax calculations which involve the most steps.

### Guideline: When to Add Projection Table Rows vs Inspector Steps

**Keep in Inspector (step-by-step breakdown)** when:
- Intermediate value is only useful for understanding one calculation
- Value doesn't have independent meaning users would look up
- Adding row would clutter the table without adding value
- Example: "Total Cash Need" is an intermediate step in withdrawal calc

**Add to Projection Table** when:
- Value has independent meaning users might want to track over time
- Value is referenced by 3+ other calculations
- Value represents a key metric (e.g., total income, total deductions)
- Example: `ordinaryIncome` and `taxableOrdinary` are useful standalone metrics

**Formula Complexity Rule**: If a formula in the inspector has >10 inputs, either:
1. Break into step-by-step sub-calculations (preferred)
2. Add intermediate rows to projections table (if values have standalone meaning)

### Changes Required

#### 1. Add Step-by-Step Breakdown for Withdrawal Calculations
**File**: `src/lib/calculationDefinitions.js`
**Changes**: Enhance compute functions to return step breakdown

```javascript
// Enhanced atWithdrawal definition
atWithdrawal: {
  name: 'After-Tax Withdrawal',
  concept: 'Amount withdrawn from after-tax account. Withdrawal order: IRA (RMD first) → After-Tax → More IRA → Roth.',
  formula: 'See step-by-step breakdown below',
  backOfEnvelope: 'Whatever is needed after RMD, before touching more IRA',
  compute: (data, params) => {
    const { expenses, totalTax, irmaaTotal, ssAnnual, rmdRequired, atBOY, atWithdrawal } = data;

    // Step-by-step calculation
    const steps = [
      {
        label: 'Total Cash Need',
        formula: 'expenses + totalTax + irmaaTotal',
        values: `${fK(expenses)} + ${fK(totalTax)} + ${fK(irmaaTotal)}`,
        result: fK(expenses + totalTax + irmaaTotal),
        fields: ['expenses', 'totalTax', 'irmaaTotal'],
      },
      {
        label: 'After Social Security',
        formula: 'totalNeed - ssAnnual',
        values: `${fK(expenses + totalTax + irmaaTotal)} - ${fK(ssAnnual)}`,
        result: fK(Math.max(0, expenses + totalTax + irmaaTotal - ssAnnual)),
        fields: ['ssAnnual'],
      },
      {
        label: 'After IRA RMD',
        formula: 'need - min(iraAvailable, rmdRequired)',
        values: `Need: ${fK(Math.max(0, expenses + totalTax + irmaaTotal - ssAnnual))} - RMD: ${fK(rmdRequired)}`,
        result: fK(Math.max(0, expenses + totalTax + irmaaTotal - ssAnnual - rmdRequired)),
        fields: ['rmdRequired'],
      },
      {
        label: 'AT Withdrawal',
        formula: 'min(atBOY, remainingNeed)',
        values: `Available: ${fK(atBOY)}, Need: ${fK(Math.max(0, expenses + totalTax + irmaaTotal - ssAnnual - rmdRequired))}`,
        result: fK(atWithdrawal),
        fields: ['atBOY'],
      },
    ];

    return {
      formula: 'Withdrawal priority: IRA(RMD) → AT → IRA → Roth',
      values: steps.map(s => `${s.label}: ${s.result}`).join('\n'),
      result: `AT Withdrawal = ${fK(atWithdrawal)}`,
      simple: fK(atWithdrawal),
      steps, // New: detailed step breakdown
    };
  },
},
```

#### 2. Create StepByStepBreakdown Component
**File**: `src/components/CalculationInspector/StepByStepBreakdown.jsx` (new file)
**Changes**: Render step-by-step calculation with clickable intermediate values

```jsx
// src/components/CalculationInspector/StepByStepBreakdown.jsx
import { FORMULA_COLORS } from '../../lib/colors';

export function StepByStepBreakdown({ steps, data, projections, onNavigate }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={idx} className="bg-slate-900 rounded p-2">
          <div className="text-slate-400 text-xs mb-1">Step {idx + 1}: {step.label}</div>
          <div className="font-mono text-sm">
            <span className="text-slate-500">{step.formula}</span>
            <div className="text-amber-400">{step.values}</div>
            <div className="text-emerald-400 font-medium">= {step.result}</div>
          </div>
          {/* Clickable field references */}
          {step.fields && (
            <div className="flex gap-2 mt-1">
              {step.fields.map(field => {
                const color = FORMULA_COLORS[field]?.color || '#94a3b8';
                const fieldData = projections?.find(p => p.year === data.year);
                return (
                  <button
                    key={field}
                    onClick={() => onNavigate && fieldData && onNavigate(field, data.year, fieldData)}
                    className="text-xs px-1 rounded hover:bg-white/10"
                    style={{ color, borderBottom: `1px solid ${color}` }}
                  >
                    {field}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### 3. Integrate StepByStepBreakdown into Inspector
**File**: `src/components/CalculationInspector/index.jsx`
**Changes**: Render steps when available

```jsx
// After "This Year's Values" section:
{computed.steps && (
  <div>
    <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">
      Step-by-Step Calculation
    </div>
    <StepByStepBreakdown
      steps={computed.steps}
      data={activeData}
      projections={projections}
      onNavigate={onNavigate}
    />
  </div>
)}
```

### Success Criteria

#### Automated Verification:
- [x] `npm run lint` passes
- [x] `npm run test` passes
- [x] New StepByStepBreakdown component renders without errors

#### Manual Verification:
- [x] Click `atWithdrawal` → see step-by-step breakdown (Total Need → After SS → After RMD → AT W)
- [x] Each step shows formula, values, and result
- [x] Field names in steps are clickable and navigate to their calculations
- [x] Steps correctly show the intermediate values for the current year

---

## Phase 4: Complete Coverage

### Overview
Add missing CALCULATIONS entries for all projection fields that currently fall back to basic display.

### Changes Required

#### 1. Add Missing Calculation Definitions
**File**: `src/lib/calculationDefinitions.js`
**Changes**: Add entries for fields that lack them

```javascript
// Cost basis tracking
costBasisBOY: {
  name: 'Cost Basis Beginning of Year',
  concept: 'The tax basis in your after-tax account at the start of the year. When you sell, gains = sale price - cost basis. Higher basis = lower taxes.',
  formula: 'First year: afterTaxCostBasis (input)\nLater: costBasisEOY from prior year',
  backOfEnvelope: 'Your original investment in AT account',
  compute: (data, params) => {
    const { costBasisBOY, yearsFromStart, year } = data;
    const isFirstYear = yearsFromStart === 0;
    return {
      formula: isFirstYear ? 'Starting cost basis from inputs' : `costBasisBOY ${year} = costBasisEOY ${year - 1}`,
      values: isFirstYear ? `Input: ${fK(params.afterTaxCostBasis)}` : `Prior year: ${fK(costBasisBOY)}`,
      result: `Cost Basis BOY = ${fK(costBasisBOY)}`,
      simple: fK(costBasisBOY),
    };
  },
},

costBasisEOY: {
  name: 'Cost Basis End of Year',
  concept: 'Remaining cost basis after withdrawals. When you withdraw, you consume proportional basis.',
  formula: 'costBasisEOY = costBasisBOY × (1 - atWithdrawal / atBOY)\n\nBasis consumed proportionally with withdrawals.',
  backOfEnvelope: 'BOY basis minus proportional consumption',
  compute: data => {
    const { costBasisBOY, costBasisEOY, atWithdrawal, atBOY } = data;
    const consumedRatio = atBOY > 0 ? atWithdrawal / atBOY : 0;
    const basisConsumed = costBasisBOY * consumedRatio;
    return {
      formula: `costBasisEOY = costBasisBOY × (1 - atWithdrawal/atBOY)`,
      values: `${fK(costBasisBOY)} × (1 - ${fK(atWithdrawal)}/${fK(atBOY)})`,
      result: `Cost Basis EOY = ${fK(costBasisEOY)} (consumed ${fK(basisConsumed)})`,
      simple: fK(costBasisEOY),
    };
  },
},

// Capital gains calculation
capitalGains: {
  name: 'Realized Capital Gains',
  concept: 'Taxable gains from AT withdrawals. Gains = Withdrawal × (1 - basis/balance). Only portion above basis is taxable.',
  formula: 'capitalGains = atWithdrawal × (1 - costBasisBOY/atBOY) × capitalGainsPercent',
  backOfEnvelope: 'AT withdrawal × 75% (typical gains ratio)',
  compute: (data, params) => {
    const { atWithdrawal, costBasisBOY, atBOY, capitalGains } = data;
    const gainsRatio = atBOY > 0 ? 1 - costBasisBOY / atBOY : 0;
    return {
      formula: `atWithdrawal × gainsRatio × capitalGainsPercent`,
      values: `${fK(atWithdrawal)} × ${(gainsRatio * 100).toFixed(0)}% × ${((params?.capitalGainsPercent || 0.75) * 100).toFixed(0)}%`,
      result: `Capital Gains = ${fK(capitalGains)}`,
      simple: fK(capitalGains),
    };
  },
},

// Ordinary income
ordinaryIncome: {
  name: 'Ordinary Income',
  concept: 'Total income taxed at ordinary rates: taxable SS + IRA withdrawals + Roth conversions.',
  formula: 'ordinaryIncome = taxableSS + iraWithdrawal + rothConversion',
  backOfEnvelope: 'IRA distribution + 85% of SS',
  compute: data => {
    const { taxableSS, iraWithdrawal, rothConversion, ordinaryIncome } = data;
    return {
      formula: `taxableSS + iraWithdrawal + rothConversion`,
      values: `${fK(taxableSS)} + ${fK(iraWithdrawal)} + ${fK(rothConversion)}`,
      result: `Ordinary Income = ${fK(ordinaryIncome)}`,
      simple: fK(ordinaryIncome),
    };
  },
},

// Taxable ordinary
taxableOrdinary: {
  name: 'Taxable Ordinary Income',
  concept: 'Ordinary income after standard deduction. This is what gets taxed at federal bracket rates.',
  formula: 'taxableOrdinary = max(0, ordinaryIncome - standardDeduction)',
  backOfEnvelope: 'Ordinary income minus ~$32K deduction',
  compute: data => {
    const { ordinaryIncome, standardDeduction, taxableOrdinary } = data;
    return {
      formula: `max(0, ordinaryIncome - standardDeduction)`,
      values: `max(0, ${fK(ordinaryIncome)} - ${fK(standardDeduction)})`,
      result: `Taxable Ordinary = ${fK(taxableOrdinary)}`,
      simple: fK(taxableOrdinary),
    };
  },
},

// Cumulative metrics
cumulativeExpenses: {
  name: 'Cumulative Expenses',
  concept: 'Running total of all expenses since projection start. Useful for understanding total spending over retirement.',
  formula: 'cumulativeExpenses = Sum(annual expenses from start)',
  backOfEnvelope: 'Sum of all years spending',
  compute: data => {
    const { cumulativeExpenses, expenses, yearsFromStart } = data;
    const avgPerYear = yearsFromStart > 0 ? cumulativeExpenses / (yearsFromStart + 1) : expenses;
    return {
      formula: `Sum of expenses through year ${data.year}`,
      values: `${yearsFromStart + 1} years of spending`,
      result: `Cumulative = ${fM(cumulativeExpenses)} (avg ${fK(avgPerYear)}/yr)`,
      simple: fM(cumulativeExpenses),
    };
  },
},
```

#### 2. Add Missing Fields to FORMULA_COLORS
**File**: `src/lib/colors.js`
**Changes**: Add color entries for fields that need to be clickable

```javascript
// Add to FORMULA_COLORS:
costBasisBOY: { color: '#8b5cf6', label: 'Cost Basis BOY', key: 'costBasisBOY' },
costBasisEOY: { color: '#8b5cf6', label: 'Cost Basis EOY', key: 'costBasisEOY' },
standardDeduction: { color: '#06b6d4', label: 'Std Deduction', key: 'standardDeduction' },
taxableOrdinary: { color: '#f97316', label: 'Taxable Ord', key: 'taxableOrdinary' },
ordinaryIncome: { color: '#f97316', label: 'Ordinary Inc', key: 'ordinaryIncome' },
```

### Success Criteria

#### Automated Verification:
- [x] `npm run lint` passes
- [x] `npm run test` passes
- [x] All projection table fields have CALCULATIONS entries (grep for fallback message)

#### Manual Verification:
- [x] Click `costBasisBOY` → see explanation and computation
- [x] Click `costBasisEOY` → see proportional consumption formula
- [x] Click `capitalGains` → see gains ratio calculation
- [x] Click `ordinaryIncome` → see sum of taxable components
- [x] No field shows "Detailed explanation not yet available" message

---

## Testing Strategy

### Unit Tests

**New test file**: `src/lib/calculationDefinitions.test.js`
- Test each CALCULATIONS entry has required fields (name, concept, formula, compute)
- Test compute functions return required fields (formula, values, result, simple)
- Test INPUT_SOURCES covers all input-derived fields

**New test file**: `src/lib/inputSources.test.js`
- Test getInputSources returns correct structure
- Test formatParamValue handles all param types
- Test firstYearOnly flag works correctly

### Integration Tests

**Update**: `src/components/CalculationInspector/CalculationInspector.test.jsx`
- Test inspector renders for all projection fields
- Test clicking formula variables navigates correctly
- Test "Input Sources" section appears for input-derived fields
- Test "Step-by-Step" section appears for complex calculations

### Manual Testing Steps

1. Open projections table, click through every row type to verify inspector coverage
2. For each field, verify all formula variables are clickable or show input sources
3. Test navigation chain: `totalTax` → `federalTax` → `taxableOrdinary` → `ordinaryIncome` → back
4. Verify "Used By" correctly shows all consumers of each value
5. Test first year vs later years for BOY fields (input sources vs prior EOY)

---

## Performance Considerations

- **Memoization**: `useMemo` for computed values and dependency lookups
- **Lazy loading**: Only compute step breakdowns when inspector is open
- **Bundle size**: Split calculationDefinitions could increase initial bundle - consider lazy import

---

## Migration Notes

- No data migration required (UI-only changes)
- Existing snapshots may need updating for refactored component structure
- Test coverage for CalculationInspector should be reviewed/expanded

---

## References

- Current implementation: `src/components/CalculationInspector/index.jsx:1-1800`
- Dependencies: `src/lib/calculationDependencies.js:1-496`
- Colors: `src/lib/colors.js:49-106`
- Projections: `src/lib/projections.js:174-525`
- Default params: `src/lib/taxTables.js:288-380`
