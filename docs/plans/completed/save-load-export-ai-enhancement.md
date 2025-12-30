# Save/Load/Export Reorganization & AI Enhancement Plan

## Overview

Reorganize the save/load/export functionality to clarify their distinct purposes, and enhance the AI assistant with agentic capabilities to explore and explain the calculation code. The goal is:
- **Export** = share calculations/reports with others (read-only)
- **Save/Load** = persist/restore user configuration with flexible storage options
- **AI** = can explain HOW calculations work by reading the actual source code

## Current State Analysis

### Export (JSON/XLSX/PDF)
- **Location**: `src/lib/excelExport.js:509-530`
- **Data**: `{ exportDate, params, summary, projections }`
- **Purpose**: Create shareable reports with full calculation results

### Save/Load
- **Location**: `src/hooks/useProjections.js:251-288`
- **Data**: `{ id, name, createdAt, params, options }`
- **Storage**: Browser localStorage only
- **Gap**: No file-based save/load for sharing configurations

### AI Tools
- **Location**: `src/lib/aiService.js:53-139`
- **Current**: `get_current_state`, `run_projection`, `create_scenario`, `calculate`, `apply_scenario_to_base`
- **Gap**: Cannot explain calculation logic, no access to source code

### Key Discoveries
- `src/lib/calculations.js` - Core tax/financial calculations (1,030 lines)
- `src/lib/projections.js` - Year-by-year projection generation
- `src/lib/taxTables.js` - Tax brackets, RMD tables, IRMAA brackets

## Desired End State

1. **Save dropdown** with "Browser" and "JSON File" options (native file picker for filename)
2. **Load dropdown** with "Browser" and "JSON File" options
3. **Export dropdown** unchanged (XLSX/JSON/PDF) - exports full reports
4. **AI can read source code** to explain any calculation
5. **AI can create todo lists** to work through complex questions
6. **AI stays in chat tab** when creating scenarios/charts
7. **AI can embed snapshots** of tables/charts in responses
8. **Comprehensive tests** for realistic user questions

## What We're NOT Doing

- Changing export data format (still full report with params+summary+projections)
- Removing browser localStorage persistence (still auto-saves)
- Adding cloud storage/sync
- Changing calculation logic

## Implementation Approach

Implement in phases, each independently testable:
1. Save/Load UI with file picker
2. AI agentic tools for code exploration
3. Chart/table snapshot capabilities
4. Chat UI behavior (no navigation)
5. Comprehensive test coverage

---

## Phase 1: Save/Load UI Reorganization

### Overview
Add dropdown menus to Save/Load buttons with browser and JSON file options.

### Changes Required

#### 1. App.jsx - Save/Load Dropdowns
**File**: `src/App.jsx`

Replace the current Save button (lines 381-387) with a dropdown:

```jsx
// New state for menus
const [showSaveMenu, setShowSaveMenu] = useState(false);
const saveMenuRef = useRef(null);

// Save dropdown
<div className="relative" ref={saveMenuRef}>
  <button
    onClick={() => setShowSaveMenu(!showSaveMenu)}
    className="px-2 py-1 bg-slate-700 text-white rounded text-xs flex items-center gap-1 hover:bg-slate-600"
  >
    <Save className="w-3 h-3" />
    Save
    <ChevronDown className="w-3 h-3" />
  </button>
  {showSaveMenu && (
    <div className="absolute right-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded shadow-lg z-50">
      <button
        onClick={() => {
          setShowSaveDialog(true);
          setShowSaveMenu(false);
        }}
        className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2"
      >
        <span className="text-blue-400">Browser</span>
        <span className="text-slate-400">localStorage</span>
      </button>
      <button
        onClick={() => {
          handleSaveToFile();
          setShowSaveMenu(false);
        }}
        className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2"
      >
        <span className="text-emerald-400">JSON File</span>
        <span className="text-slate-400">download</span>
      </button>
    </div>
  )}
</div>
```

Similarly update Load button (lines 390-436) with:
- "Browser" option (current behavior - shows list)
- "JSON File" option (opens file picker)

#### 2. File System Save Handler
**File**: `src/App.jsx`

Add handler for native file picker save:

```jsx
const handleSaveToFile = useCallback(async () => {
  const saveData = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    type: 'retirement-planner-config',
    params: { ...params },
    options: { ...options },
  };

  // Try native File System Access API first
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `retirement-config-${new Date().toISOString().slice(0, 10)}.json`,
        types: [{
          description: 'JSON Configuration',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(saveData, null, 2));
      await writable.close();
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled
      console.warn('File System Access API failed, falling back to download');
    }
  }

  // Fallback: standard download
  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `retirement-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}, [params, options]);
```

#### 3. File Load Handler
**File**: `src/App.jsx`

Add handler for loading configuration from file:

```jsx
const handleLoadFromFile = useCallback(async () => {
  // Try native File System Access API
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Configuration',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.type !== 'retirement-planner-config') {
        // Might be an export file, try to load params anyway
        if (data.params) {
          updateParams(data.params);
          if (data.options) setOptions(prev => ({ ...prev, ...data.options }));
        } else {
          alert('Invalid configuration file');
        }
        return;
      }

      updateParams(data.params);
      if (data.options) setOptions(prev => ({ ...prev, ...data.options }));
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('File System Access API failed, falling back to input');
    }
  }

  // Fallback: use file input
  configFileInputRef.current?.click();
}, [updateParams, setOptions]);
```

### Success Criteria

#### Automated Verification:
- [x] App builds without errors: `npm run build`
- [x] Linting passes: `npm run lint`
- [x] Type checking passes (if applicable)
- [x] Unit tests pass: `npm test`

#### Manual Verification:
- [x] Save dropdown shows "Browser" and "JSON File" options
- [x] "Browser" shows name dialog, saves to localStorage
- [x] "JSON File" opens native file picker (or downloads fallback)
- [x] Load dropdown shows "Browser" (with saved list) and "JSON File" options
- [x] Loading JSON file restores params correctly
- [x] Error handling for invalid files works

---

## Phase 2: AI Agentic Code Exploration Tools

### Overview
Add tools that let the AI read source code, grep for patterns, and maintain todo lists for complex questions.

### Changes Required

#### 1. New AI Tools Definition
**File**: `src/lib/aiService.js`

Add new tools to `AGENT_TOOLS` array:

```javascript
// Add to AGENT_TOOLS array
{
  name: 'read_source_code',
  description: 'Read the source code of a calculation function or file to explain how it works. Use this to answer questions about calculation logic.',
  parameters: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        enum: [
          'federal_tax',
          'ltcg_tax',
          'niit',
          'social_security_taxation',
          'irmaa',
          'rmd',
          'heir_value',
          'risk_allocation',
          'projections',
          'tax_tables',
          'all_taxes',
        ],
        description: 'Which calculation to read the source for',
      },
    },
    required: ['target'],
  },
},
{
  name: 'grep_codebase',
  description: 'Search the codebase for a pattern to find where specific logic is implemented',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Text pattern to search for' },
      context: {
        type: 'string',
        enum: ['calculations', 'projections', 'taxes', 'ui', 'all'],
        description: 'Which part of codebase to search',
      },
    },
    required: ['pattern'],
  },
},
{
  name: 'create_analysis_todo',
  description: 'Create a todo list to work through a complex analysis question step by step',
  parameters: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The main question being analyzed' },
      steps: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of analysis steps to work through',
      },
    },
    required: ['question', 'steps'],
  },
},
{
  name: 'update_analysis_todo',
  description: 'Mark a step complete or add notes to the analysis todo',
  parameters: {
    type: 'object',
    properties: {
      stepIndex: { type: 'number', description: '0-based index of step to update' },
      status: { type: 'string', enum: ['complete', 'in_progress', 'blocked'] },
      notes: { type: 'string', description: 'Optional notes about findings' },
    },
    required: ['stepIndex', 'status'],
  },
},
```

#### 2. Source Code Provider
**File**: `src/lib/sourceCodeProvider.js` (NEW FILE)

Create embedded source code snippets for AI access:

```javascript
/**
 * Source Code Provider for AI
 *
 * Provides pre-extracted code snippets with comments for AI to explain calculations.
 * This is more reliable than runtime code reading and ensures consistent explanations.
 */

export const SOURCE_CODE = {
  federal_tax: {
    file: 'src/lib/calculations.js',
    lines: '45-85',
    description: 'Federal income tax calculation using progressive brackets',
    code: `
/**
 * Calculate federal income tax using progressive brackets
 * @param {number} taxableIncome - Total taxable ordinary income
 * @param {Array} brackets - Tax brackets [{ceiling, rate}]
 */
export function calculateFederalTax(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let previousCeiling = 0;

  for (const { ceiling, rate } of brackets) {
    if (taxableIncome <= previousCeiling) break;

    const taxableInBracket = Math.min(taxableIncome, ceiling) - previousCeiling;
    tax += taxableInBracket * rate;
    previousCeiling = ceiling;
  }

  return Math.round(tax);
}`,
    explanation: `
The federal tax is calculated progressively:
1. Income is taxed in "slices" at different rates
2. First $23,200 (MFJ) at 10%
3. Next $71,100 ($23,200-$94,300) at 12%
4. And so on through 22%, 24%, 32%, 35%, 37% brackets
5. Each bracket only applies to income WITHIN that range
`,
  },

  ltcg_tax: {
    file: 'src/lib/calculations.js',
    lines: '90-140',
    description: 'Long-term capital gains tax with stacking on ordinary income',
    code: `
/**
 * Calculate LTCG tax with bracket stacking
 * Capital gains "stack" on top of ordinary income to determine the rate
 */
export function calculateLTCGTax(capitalGains, ordinaryIncome, brackets) {
  if (capitalGains <= 0) return 0;

  let tax = 0;
  let previousCeiling = 0;
  const stackedIncome = ordinaryIncome;

  for (const { ceiling, rate } of brackets) {
    // Skip brackets already filled by ordinary income
    if (ceiling <= stackedIncome) {
      previousCeiling = ceiling;
      continue;
    }

    // Calculate gains in this bracket
    const bracketStart = Math.max(previousCeiling, stackedIncome);
    const bracketEnd = Math.min(stackedIncome + capitalGains, ceiling);
    const gainsInBracket = bracketEnd - bracketStart;

    if (gainsInBracket > 0) {
      tax += gainsInBracket * rate;
    }

    previousCeiling = ceiling;
  }

  return Math.round(tax);
}`,
    explanation: `
LTCG tax uses "stacking":
1. Ordinary income fills the lower brackets first
2. Capital gains then "stack" on top
3. If ordinary income is $50k, first $44,050 of gains are at 0%
4. Gains above that threshold are taxed at 15% (up to $583,750 total)
5. Gains above $583,750 total income are taxed at 20%
`,
  },

  social_security_taxation: {
    file: 'src/lib/calculations.js',
    lines: '160-210',
    description: 'Social Security benefit taxation calculation',
    code: `
/**
 * Calculate taxable portion of Social Security benefits
 * Uses "combined income" = AGI + 0.5 * SS benefits
 */
export function calculateTaxableSocialSecurity(ssIncome, otherIncome, isSingle) {
  if (ssIncome <= 0) return 0;

  const thresholds = isSingle ? SS_TAX_THRESHOLDS_SINGLE : SS_TAX_THRESHOLDS_MFJ;
  const combinedIncome = otherIncome + ssIncome * 0.5;

  // Below tier1: 0% taxable
  if (combinedIncome <= thresholds.tier1) return 0;

  // Between tier1 and tier2: up to 50% taxable
  const tier1Excess = Math.min(combinedIncome - thresholds.tier1,
                                thresholds.tier2 - thresholds.tier1);
  let taxable = tier1Excess * 0.5;

  // Above tier2: additional 35% (total up to 85%)
  if (combinedIncome > thresholds.tier2) {
    taxable += (combinedIncome - thresholds.tier2) * 0.85;
  }

  // Cap at 85% of benefits
  return Math.min(taxable, ssIncome * 0.85);
}`,
    explanation: `
SS taxation depends on "combined income":
1. Combined = AGI + 50% of SS benefits
2. MFJ thresholds: $32k (tier1) and $44k (tier2)
3. Below $32k: 0% of SS is taxable
4. $32k-$44k: 50% of excess is taxable
5. Above $44k: additional 85% of excess is taxable
6. Maximum: 85% of SS can ever be taxed
`,
  },

  rmd: {
    file: 'src/lib/calculations.js',
    lines: '270-300',
    description: 'Required Minimum Distribution calculation',
    code: `
/**
 * Calculate Required Minimum Distribution
 * Uses IRS Uniform Lifetime Table (updated 2022)
 */
export function calculateRMD(iraBalance, age) {
  if (age < RMD_START_AGE) return { required: 0, factor: 0 };

  // Look up distribution period (life expectancy factor)
  const factor = RMD_TABLE[Math.min(age, 120)] || RMD_TABLE[120];

  // RMD = Balance / Factor
  const required = Math.round(iraBalance / factor);

  return { required, factor };
}`,
    explanation: `
RMD calculation:
1. Starts at age 73 (as of 2023 SECURE 2.0 Act)
2. Look up "life expectancy factor" in IRS table
3. At 73: factor = 26.5, so RMD = balance / 26.5 = ~3.77%
4. At 80: factor = 20.2, so RMD = ~4.95%
5. At 90: factor = 12.2, so RMD = ~8.2%
6. Factor decreases each year (higher percentage required)
`,
  },

  heir_value: {
    file: 'src/lib/calculations.js',
    lines: '320-360',
    description: 'After-tax heir value calculation',
    code: `
/**
 * Calculate after-tax value heirs receive
 * AT: step-up basis (no tax), IRA: fully taxable, Roth: tax-free
 */
export function calculateHeirValue(atBalance, iraBalance, rothBalance, heirFedRate, heirStateRate) {
  // After-tax account: step-up in basis eliminates capital gains
  const atValue = atBalance;

  // Traditional IRA: taxed as ordinary income to heirs
  const iraValue = iraBalance * (1 - heirFedRate - heirStateRate);

  // Roth: completely tax-free to heirs
  const rothValue = rothBalance;

  return atValue + iraValue + rothValue;
}`,
    explanation: `
Heir value calculation reflects different tax treatment:
1. After-tax brokerage: Gets "step-up" in cost basis at death
   - Heirs pay NO capital gains tax on growth during your life
   - Full balance passes tax-free
2. Traditional IRA: Heirs must distribute over 10 years
   - ALL withdrawals taxed as ordinary income
   - At 37% fed + 5% state = only 58% net value
3. Roth IRA: Best for heirs
   - Must distribute over 10 years but NO TAX
   - Full balance passes tax-free
`,
  },

  irmaa: {
    file: 'src/lib/calculations.js',
    lines: '380-440',
    description: 'IRMAA Medicare premium surcharge calculation',
    code: `
/**
 * Calculate IRMAA (Income-Related Monthly Adjustment Amount)
 * Uses MAGI from 2 years prior
 */
export function calculateIRMAA(magi, bracketInflation, yearsFromBase, isSingle, numPeople) {
  const brackets = isSingle ? IRMAA_BRACKETS_SINGLE_2024 : IRMAA_BRACKETS_MFJ_2024;

  // Inflate thresholds for future years
  const inflationFactor = Math.pow(1 + bracketInflation, yearsFromBase);

  // Find applicable bracket
  let partB = 174.70; // Base premium
  let partD = 0;

  for (const bracket of brackets) {
    const threshold = bracket.magi * inflationFactor;
    if (magi > threshold) {
      partB = bracket.partB;
      partD = bracket.partD;
    }
  }

  return {
    partB: partB * 12 * numPeople,
    partD: partD * 12 * numPeople,
    total: (partB + partD) * 12 * numPeople,
  };
}`,
    explanation: `
IRMAA calculation:
1. Uses MAGI from 2 YEARS AGO (e.g., 2024 MAGI affects 2026 premiums)
2. MFJ thresholds (2024): $206k, $258k, $322k, $386k, $750k
3. Base Part B: $174.70/month per person
4. Surcharge tiers add $70-$420/month per person
5. Part D (drug plan) also has IRMAA tiers
6. Big Roth conversion can trigger IRMAA 2 years later!
`,
  },

  niit: {
    file: 'src/lib/calculations.js',
    lines: '145-160',
    description: 'Net Investment Income Tax calculation',
    code: `
/**
 * Calculate NIIT (3.8% surtax on investment income)
 */
export function calculateNIIT(investmentIncome, magi, isSingle) {
  const threshold = isSingle ? NIIT_THRESHOLD_SINGLE : NIIT_THRESHOLD_MFJ;

  // No NIIT if MAGI below threshold
  if (magi <= threshold) return 0;

  // Tax is 3.8% of LESSER of:
  // - Investment income, OR
  // - Excess MAGI over threshold
  const excessMAGI = magi - threshold;
  const taxableAmount = Math.min(investmentIncome, excessMAGI);

  return Math.round(taxableAmount * NIIT_RATE);
}`,
    explanation: `
NIIT (Net Investment Income Tax):
1. 3.8% surtax on investment income
2. Only applies if MAGI exceeds threshold
3. MFJ threshold: $250,000
4. Single threshold: $200,000
5. Taxable = LESSER of: investment income OR excess over threshold
6. Includes: capital gains, dividends, interest, rental income
7. Does NOT include: wages, SS benefits, retirement distributions
`,
  },

  projections: {
    file: 'src/lib/projections.js',
    lines: '1-100',
    description: 'Year-by-year projection generation logic',
    code: `
/**
 * Generate year-by-year retirement projections
 *
 * For each year, calculates:
 * 1. Beginning balances (AT, IRA, Roth)
 * 2. Income (Social Security)
 * 3. Required expenses
 * 4. RMD requirement
 * 5. Roth conversions (user-specified)
 * 6. Withdrawals needed to cover expenses + taxes
 * 7. All taxes (federal, state, LTCG, NIIT, IRMAA)
 * 8. Investment returns
 * 9. Ending balances
 * 10. Heir value
 */
export function generateProjections(params) {
  const results = [];
  let at = params.afterTaxStart;
  let ira = params.iraStart;
  let roth = params.rothStart;
  let costBasis = params.afterTaxCostBasis;

  for (let year = params.startYear; year <= params.endYear; year++) {
    const age = year - params.birthYear;
    const yearsFromStart = year - params.startYear;

    // Calculate expenses with inflation
    const expenses = params.annualExpenses * Math.pow(1 + params.expenseInflation, yearsFromStart);

    // Calculate Social Security with COLA
    const ss = params.socialSecurityMonthly * 12 * Math.pow(1 + params.ssCOLA, yearsFromStart);

    // Calculate RMD
    const rmd = calculateRMD(ira, age);

    // Get Roth conversion for this year
    const rothConversion = params.rothConversions[year] || 0;

    // Calculate withdrawals needed
    const { atWithdrawal, iraWithdrawal, rothWithdrawal, taxes } =
      calculateWithdrawals(at, ira, roth, expenses, ss, rmd.required, rothConversion, ...);

    // Apply returns and update balances
    // ... continues with investment returns, ending balances, heir value
  }

  return results;
}`,
    explanation: `
Projection flow for each year:
1. Start with beginning-of-year balances
2. Calculate income (SS with COLA)
3. Calculate expenses (with inflation)
4. Determine RMD requirement based on age
5. Apply any Roth conversion specified
6. Calculate taxes on all income
7. Determine withdrawals needed (expenses + taxes - SS)
8. Withdraw in order: AT first, then IRA, then Roth
9. Apply investment returns to remaining balances
10. Calculate heir value at year-end
11. Move to next year with ending balances
`,
  },

  tax_tables: {
    file: 'src/lib/taxTables.js',
    lines: '1-150',
    description: 'Tax brackets, IRMAA tables, and RMD factors',
    code: `
// 2024 Federal Tax Brackets (MFJ)
export const FEDERAL_BRACKETS_MFJ_2024 = [
  { ceiling: 23200, rate: 0.10 },
  { ceiling: 94300, rate: 0.12 },
  { ceiling: 201050, rate: 0.22 },
  { ceiling: 383900, rate: 0.24 },
  { ceiling: 487450, rate: 0.32 },
  { ceiling: 731200, rate: 0.35 },
  { ceiling: Infinity, rate: 0.37 },
];

// 2024 LTCG Brackets (MFJ)
export const LTCG_BRACKETS_MFJ_2024 = [
  { ceiling: 94050, rate: 0.00 },   // 0% rate
  { ceiling: 583750, rate: 0.15 },  // 15% rate
  { ceiling: Infinity, rate: 0.20 }, // 20% rate
];

// RMD Factors (Uniform Lifetime Table)
export const RMD_TABLE = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
  78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5,
  // ... continues to age 120
};

// IRMAA Brackets (MFJ)
export const IRMAA_BRACKETS_MFJ_2024 = [
  { magi: 206000, partB: 244.60, partD: 12.90 },
  { magi: 258000, partB: 349.40, partD: 33.30 },
  { magi: 322000, partB: 454.20, partD: 53.80 },
  { magi: 386000, partB: 559.00, partD: 74.20 },
  { magi: 750000, partB: 594.00, partD: 81.00 },
];`,
    explanation: `
Key tax tables:
1. Federal brackets: Progressive rates 10% to 37%
2. LTCG brackets: 0%, 15%, 20% based on total income
3. RMD table: Life expectancy factors by age
4. IRMAA brackets: Medicare surcharges by MAGI
5. SS thresholds: $32k/$44k (MFJ) for taxation tiers
6. NIIT thresholds: $250k (MFJ), $200k (Single)
`,
  },

  all_taxes: {
    file: 'src/lib/calculations.js',
    lines: '450-530',
    description: 'Combined tax calculation for a single year',
    code: `
/**
 * Calculate all taxes for a year
 * Orchestrates individual tax calculations
 */
export function calculateAllTaxes({
  ssIncome, iraWithdrawal, rothConversion, otherOrdinaryIncome,
  capitalGains, isSingle, bracketInflation, yearsFromBase
}) {
  const brackets = getInflatedBrackets(isSingle, bracketInflation, yearsFromBase);

  // 1. Calculate taxable Social Security
  const ordinaryIncome = iraWithdrawal + rothConversion + otherOrdinaryIncome;
  const taxableSS = calculateTaxableSocialSecurity(ssIncome, ordinaryIncome, isSingle);

  // 2. Calculate taxable ordinary income (with standard deduction)
  const standardDeduction = isSingle ? 14600 : 29200;
  const taxableOrdinary = Math.max(0, ordinaryIncome + taxableSS - standardDeduction);

  // 3. Federal tax on ordinary income
  const federalTax = calculateFederalTax(taxableOrdinary, brackets.federal);

  // 4. LTCG tax (stacks on ordinary)
  const ltcgTax = calculateLTCGTax(capitalGains, taxableOrdinary, brackets.ltcg);

  // 5. NIIT
  const magi = ordinaryIncome + ssIncome + capitalGains;
  const niit = calculateNIIT(capitalGains, magi, isSingle);

  // 6. State tax
  const stateTax = calculateIllinoisTax(taxableOrdinary + capitalGains);

  return {
    taxableSS,
    taxableOrdinary,
    federalTax,
    ltcgTax,
    niit,
    stateTax,
    totalTax: federalTax + ltcgTax + niit + stateTax,
    effectiveRate: // ...
  };
}`,
    explanation: `
Tax calculation order:
1. Determine taxable SS (depends on other income)
2. Add all ordinary income: IRA + Roth conversion + other
3. Subtract standard deduction ($29,200 MFJ)
4. Calculate federal tax on ordinary income
5. Stack capital gains on top, calculate LTCG tax
6. Check if NIIT applies (MAGI > $250k)
7. Calculate state tax (IL flat 4.95%)
8. Sum all taxes for total
`,
  },
};

/**
 * Get source code and explanation for a calculation
 */
export function getSourceCode(target) {
  const source = SOURCE_CODE[target];
  if (!source) {
    return { error: `Unknown target: ${target}. Available: ${Object.keys(SOURCE_CODE).join(', ')}` };
  }
  return source;
}

/**
 * Search for patterns in codebase (simulated for security)
 */
export function grepCodebase(pattern, context = 'all') {
  // Return curated results for common patterns
  const results = [];

  const searchTargets = context === 'all'
    ? Object.keys(SOURCE_CODE)
    : Object.keys(SOURCE_CODE).filter(k => {
        if (context === 'taxes') return ['federal_tax', 'ltcg_tax', 'niit', 'social_security_taxation', 'irmaa'].includes(k);
        if (context === 'calculations') return !['projections', 'tax_tables'].includes(k);
        return true;
      });

  for (const target of searchTargets) {
    const source = SOURCE_CODE[target];
    if (source.code.toLowerCase().includes(pattern.toLowerCase()) ||
        source.explanation.toLowerCase().includes(pattern.toLowerCase())) {
      results.push({
        target,
        file: source.file,
        lines: source.lines,
        description: source.description,
      });
    }
  }

  return results.length > 0 ? results : { message: `No matches for "${pattern}" in ${context}` };
}
```

#### 3. Tool Execution in Chat
**File**: `src/components/Chat/index.jsx`

Add execution for new tools in `executeToolCall`:

```javascript
case 'read_source_code': {
  const { getSourceCode } = await import('../../lib/sourceCodeProvider');
  const source = getSourceCode(args.target);
  return JSON.stringify(source, null, 2);
}

case 'grep_codebase': {
  const { grepCodebase } = await import('../../lib/sourceCodeProvider');
  const results = grepCodebase(args.pattern, args.context);
  return JSON.stringify(results, null, 2);
}

case 'create_analysis_todo': {
  // Store in component state for display
  setAnalysisTodo({
    question: args.question,
    steps: args.steps.map((s, i) => ({ text: s, status: 'pending', notes: null })),
  });
  return `Created analysis plan with ${args.steps.length} steps`;
}

case 'update_analysis_todo': {
  setAnalysisTodo(prev => {
    if (!prev) return null;
    const newSteps = [...prev.steps];
    newSteps[args.stepIndex] = {
      ...newSteps[args.stepIndex],
      status: args.status,
      notes: args.notes || newSteps[args.stepIndex].notes,
    };
    return { ...prev, steps: newSteps };
  });
  return `Updated step ${args.stepIndex + 1}: ${args.status}`;
}
```

#### 4. Update TOOL_UI_CONFIG
**File**: `src/lib/aiService.js`

```javascript
read_source_code: {
  icon: '📖',
  label: 'Reading source code',
  capability: { title: 'Explain Calculations', description: 'Show how formulas work' },
},
grep_codebase: {
  icon: '🔍',
  label: 'Searching codebase',
  capability: null,
},
create_analysis_todo: {
  icon: '📝',
  label: 'Creating analysis plan',
  capability: { title: 'Analyze Step-by-Step', description: 'Work through complex questions' },
},
update_analysis_todo: {
  icon: '✏️',
  label: 'Updating analysis',
  capability: null,
},
```

### Success Criteria

#### Automated Verification:
- [x] New sourceCodeProvider.js compiles: `npm run build`
- [x] Unit tests for sourceCodeProvider: `npm test src/lib/sourceCodeProvider.test.js`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Ask AI "How is federal tax calculated?" - should read source and explain
- [x] Ask AI "Why is my SS 85% taxable?" - should explain the formula
- [x] Ask AI complex question - should create todo and work through steps
- [x] Verify source code snippets match actual implementation

---

## Phase 3: Chart/Table Snapshot Capabilities

### Overview
Enable the AI to embed snapshots of charts and tables in responses.

### Changes Required

#### 1. Snapshot Utility
**File**: `src/lib/snapshotCapture.js` (NEW FILE)

```javascript
/**
 * Snapshot Capture Utility
 * Captures charts/tables as images or markdown for AI embedding
 */

import html2canvas from 'html2canvas';

/**
 * Capture a DOM element as base64 PNG
 */
export async function captureElementAsImage(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    return { error: `Element #${elementId} not found` };
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f172a', // slate-950
      scale: 2, // Higher resolution
    });

    return {
      type: 'image',
      format: 'png',
      width: canvas.width,
      height: canvas.height,
      data: canvas.toDataURL('image/png'),
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Capture projection table as markdown
 */
export function captureTableAsMarkdown(projections, columns = ['year', 'age', 'totalEOY', 'heirValue', 'totalTax']) {
  const headers = columns.join(' | ');
  const separator = columns.map(() => '---').join(' | ');

  const rows = projections.map(p =>
    columns.map(col => {
      const val = p[col];
      if (typeof val === 'number') {
        if (col.includes('Percent') || col.includes('Rate')) {
          return `${(val * 100).toFixed(1)}%`;
        }
        return `$${Math.round(val).toLocaleString()}`;
      }
      return String(val);
    }).join(' | ')
  );

  return `| ${headers} |\n| ${separator} |\n${rows.map(r => `| ${r} |`).join('\n')}`;
}

/**
 * Capture summary as markdown
 */
export function captureSummaryAsMarkdown(summary) {
  return `
## Projection Summary

| Metric | Value |
|--------|-------|
| Starting Portfolio | $${Math.round(summary.startingPortfolio).toLocaleString()} |
| Ending Portfolio | $${Math.round(summary.endingPortfolio).toLocaleString()} |
| Ending Heir Value | $${Math.round(summary.endingHeirValue).toLocaleString()} |
| Total Tax Paid | $${Math.round(summary.totalTaxPaid).toLocaleString()} |
| Total IRMAA Paid | $${Math.round(summary.totalIRMAAPaid).toLocaleString()} |
| Final Roth % | ${(summary.finalRothPercent * 100).toFixed(1)}% |
`;
}
```

#### 2. New AI Tool for Snapshots
**File**: `src/lib/aiService.js`

Add to AGENT_TOOLS:

```javascript
{
  name: 'capture_snapshot',
  description: 'Capture a snapshot of current data as markdown table for embedding in response',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['summary', 'projections', 'year_range'],
        description: 'What to capture',
      },
      startYear: { type: 'number', description: 'For year_range: start year' },
      endYear: { type: 'number', description: 'For year_range: end year' },
      columns: {
        type: 'array',
        items: { type: 'string' },
        description: 'For projections: which columns to include',
      },
    },
    required: ['type'],
  },
},
```

#### 3. Tool Execution
**File**: `src/components/Chat/index.jsx`

```javascript
case 'capture_snapshot': {
  const { captureTableAsMarkdown, captureSummaryAsMarkdown } =
    await import('../../lib/snapshotCapture');

  if (args.type === 'summary') {
    return captureSummaryAsMarkdown(summary);
  }

  if (args.type === 'projections') {
    return captureTableAsMarkdown(projections, args.columns);
  }

  if (args.type === 'year_range') {
    const filtered = projections.filter(p =>
      p.year >= args.startYear && p.year <= args.endYear
    );
    return captureTableAsMarkdown(filtered, args.columns);
  }

  return 'Unknown snapshot type';
}
```

### Success Criteria

#### Automated Verification:
- [x] snapshotCapture.js compiles: `npm run build`
- [x] Unit tests pass: `npm test src/lib/snapshotCapture.test.js`

#### Manual Verification:
- [x] Ask AI "Show me a summary of my projections" - should embed markdown table
- [x] Ask AI "What are my balances for 2026-2030?" - should show year range
- [x] Tables render correctly in chat

---

## Phase 4: Chat UI Behavior (No Navigation)

### Overview
Prevent AI from navigating away from chat tab when creating scenarios or charts.

### Changes Required

#### 1. Remove Navigation from Scenario Creation
**File**: `src/components/Chat/index.jsx`

Update `handleCreateScenarioFromOptimizer` usage to NOT navigate:

```javascript
// In Chat component - modify executeToolCall
case 'create_scenario': {
  if (onCreateScenario) {
    // Create scenario but DON'T trigger navigation
    onCreateScenario(args.overrides || {}, args.name);

    // Show inline notification instead of navigation hint
    setRecentAction({
      type: 'scenario_created',
      name: args.name,
      // Remove navigateTo - stay in chat
    });

    return `Created scenario "${args.name}". You can view it in the Scenarios tab when ready.`;
  }
  return 'Scenario creation not available';
}
```

#### 2. Update ActionHint Component
**File**: `src/components/Chat/index.jsx`

Make the "View in Scenarios" link optional, not automatic:

```jsx
function ActionHint({ action, onNavigate, onDismiss }) {
  if (!action) return null;

  if (action.type === 'scenario_created') {
    return (
      <div className="flex items-center gap-2 text-xs bg-emerald-900/30 border border-emerald-800 rounded-lg px-3 py-2 mx-4 mb-2">
        <span className="text-emerald-300">✓ Scenario "{action.name}" created</span>
        <button
          onClick={() => onNavigate('scenarios')}
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          View in Scenarios tab
        </button>
        <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 ml-auto">
          ×
        </button>
      </div>
    );
  }
  // ... similar for params_updated
}
```

### Success Criteria

#### Automated Verification:
- [x] E2E test: AI creates scenario without tab change: `npx playwright test e2e/local/ai-chat.spec.js`

#### Manual Verification:
- [x] Ask AI to create a scenario - stays in chat tab
- [x] Ask AI to update parameters - stays in chat tab
- [x] User can still click link to navigate manually

---

## Phase 5: Comprehensive Test Coverage

### Overview
Add realistic test scenarios for AI questions about calculations.

### Changes Required

#### 1. Source Code Provider Tests
**File**: `src/lib/sourceCodeProvider.test.js` (NEW FILE)

```javascript
import { describe, it, expect } from 'vitest';
import { getSourceCode, grepCodebase, SOURCE_CODE } from './sourceCodeProvider';

describe('sourceCodeProvider', () => {
  describe('getSourceCode', () => {
    it('returns federal tax source and explanation', () => {
      const result = getSourceCode('federal_tax');
      expect(result.code).toContain('calculateFederalTax');
      expect(result.explanation).toContain('progressively');
      expect(result.file).toBe('src/lib/calculations.js');
    });

    it('returns LTCG tax with stacking explanation', () => {
      const result = getSourceCode('ltcg_tax');
      expect(result.code).toContain('stackedIncome');
      expect(result.explanation).toContain('stack');
    });

    it('returns error for unknown target', () => {
      const result = getSourceCode('invalid_target');
      expect(result.error).toContain('Unknown target');
    });

    it('covers all calculation types', () => {
      const targets = [
        'federal_tax', 'ltcg_tax', 'niit', 'social_security_taxation',
        'irmaa', 'rmd', 'heir_value', 'projections', 'tax_tables', 'all_taxes'
      ];

      for (const target of targets) {
        const result = getSourceCode(target);
        expect(result.code).toBeDefined();
        expect(result.explanation).toBeDefined();
      }
    });
  });

  describe('grepCodebase', () => {
    it('finds bracket-related code', () => {
      const results = grepCodebase('bracket', 'taxes');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.target === 'federal_tax')).toBe(true);
    });

    it('finds IRMAA references', () => {
      const results = grepCodebase('IRMAA');
      expect(results.some(r => r.target === 'irmaa')).toBe(true);
    });

    it('returns message for no matches', () => {
      const results = grepCodebase('xyznonexistent123');
      expect(results.message).toContain('No matches');
    });
  });
});
```

#### 2. E2E Tests for Realistic AI Questions
**File**: `e2e/local/ai-calculation-questions.spec.js` (NEW FILE)

```javascript
/**
 * E2E Tests for AI Calculation Explanations
 *
 * Tests realistic questions users might ask about how calculations work.
 */

import { test, expect } from '@playwright/test';

async function isCCProxyAvailable() {
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    return data.status === 'pass' || data.status === 'warn';
  } catch {
    return false;
  }
}

test.describe('AI Calculation Questions', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Configure AI provider
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(500);
    await page.locator('text=AI Assistant').click();
    await page.locator('select').first().selectOption('custom');
    await page.fill('input[placeholder*="endpoint"]', 'http://localhost:4000/v1/messages');
    await page.fill('input[placeholder*="model" i]', 'claude-3-5-sonnet-20241022');
    await page.fill('input[type="password"]', 'test-api-key');
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(500);
  });

  test('explains how federal tax brackets work', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) test.skip();

    await page.fill('[data-testid="chat-input"]',
      'How does the federal income tax calculation work? Show me the brackets.');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="tool-call-indicator"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 90000 });

    const response = await page.locator('[data-testid="message-assistant"]').textContent();
    expect(response).toMatch(/progressive|bracket/i);
    expect(response).toMatch(/10%|12%|22%/);
  });

  test('explains why SS benefits are taxed at specific percentage', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) test.skip();

    await page.fill('[data-testid="chat-input"]',
      'Why is 85% of my Social Security taxable? How is that calculated?');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 90000 });

    const response = await page.locator('[data-testid="message-assistant"]').textContent();
    expect(response).toMatch(/combined income|provisional income/i);
    expect(response).toMatch(/\$32,000|\$44,000|threshold/i);
  });

  test('explains RMD calculation with factors', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) test.skip();

    await page.fill('[data-testid="chat-input"]',
      'How are RMDs calculated? What factor is used at different ages?');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 90000 });

    const response = await page.locator('[data-testid="message-assistant"]').textContent();
    expect(response).toMatch(/73|life expectancy|factor/i);
    expect(response).toMatch(/26\.5|distribution period/i);
  });

  test('explains IRMAA 2-year lookback', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) test.skip();

    await page.fill('[data-testid="chat-input"]',
      'Why does my Roth conversion in 2024 affect Medicare premiums in 2026?');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 90000 });

    const response = await page.locator('[data-testid="message-assistant"]').textContent();
    expect(response).toMatch(/IRMAA|lookback|2 year/i);
    expect(response).toMatch(/MAGI|income/i);
  });

  test('explains heir value differences between account types', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) test.skip();

    await page.fill('[data-testid="chat-input"]',
      'Why is my Roth IRA worth more to heirs than my Traditional IRA?');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 90000 });

    const response = await page.locator('[data-testid="message-assistant"]').textContent();
    expect(response).toMatch(/tax-free|step.up|basis/i);
    expect(response).toMatch(/10.year|distribute/i);
  });

  test('explains capital gains stacking on ordinary income', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) test.skip();

    await page.fill('[data-testid="chat-input"]',
      'How do capital gains rates work? Why do they depend on my other income?');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 90000 });

    const response = await page.locator('[data-testid="message-assistant"]').textContent();
    expect(response).toMatch(/stack|ordinary income/i);
    expect(response).toMatch(/0%|15%|20%/);
  });

  test('AI creates scenario without navigating away', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) test.skip();

    await page.fill('[data-testid="chat-input"]',
      'Create a scenario with $200K Roth conversions in 2026 and 2027');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 90000 });

    // Should still be on chat tab
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();

    // Should show action hint
    await expect(page.locator('[data-testid="action-hint"]')).toBeVisible();
  });

  test('AI can capture and show projection summary', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) test.skip();

    await page.fill('[data-testid="chat-input"]',
      'Show me a summary table of my retirement projections');
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 90000 });

    const response = await page.locator('[data-testid="message-assistant"]').textContent();
    expect(response).toMatch(/Portfolio|Heir Value|Tax/i);
    expect(response).toMatch(/\$/); // Should contain dollar amounts
  });
});
```

#### 3. Unit Tests for Snapshot Capture
**File**: `src/lib/snapshotCapture.test.js` (NEW FILE)

```javascript
import { describe, it, expect } from 'vitest';
import { captureTableAsMarkdown, captureSummaryAsMarkdown } from './snapshotCapture';

describe('snapshotCapture', () => {
  describe('captureTableAsMarkdown', () => {
    const mockProjections = [
      { year: 2026, age: 66, totalEOY: 3500000, heirValue: 3200000, totalTax: 45000 },
      { year: 2027, age: 67, totalEOY: 3600000, heirValue: 3350000, totalTax: 48000 },
    ];

    it('generates markdown table with default columns', () => {
      const result = captureTableAsMarkdown(mockProjections);
      expect(result).toContain('| year | age |');
      expect(result).toContain('| 2026 |');
      expect(result).toContain('$3,500,000');
    });

    it('respects custom columns', () => {
      const result = captureTableAsMarkdown(mockProjections, ['year', 'totalTax']);
      expect(result).toContain('| year | totalTax |');
      expect(result).not.toContain('age');
    });

    it('formats percentages correctly', () => {
      const projWithPercent = [{ year: 2026, rothPercent: 0.35 }];
      const result = captureTableAsMarkdown(projWithPercent, ['year', 'rothPercent']);
      expect(result).toContain('35.0%');
    });
  });

  describe('captureSummaryAsMarkdown', () => {
    const mockSummary = {
      startingPortfolio: 3000000,
      endingPortfolio: 4500000,
      endingHeirValue: 4200000,
      totalTaxPaid: 850000,
      totalIRMAAPaid: 25000,
      finalRothPercent: 0.45,
    };

    it('generates summary table', () => {
      const result = captureSummaryAsMarkdown(mockSummary);
      expect(result).toContain('Starting Portfolio');
      expect(result).toContain('$3,000,000');
      expect(result).toContain('45.0%');
    });
  });
});
```

### Success Criteria

#### Automated Verification:
- [x] All unit tests pass: `npm test`
- [x] E2E tests pass: `npx playwright test`
- [x] Test coverage > 80% for new files

#### Manual Verification:
- [x] Run through each AI question scenario manually
- [x] Verify explanations are accurate and helpful
- [x] Test with different model providers

---

## Testing Strategy

### Unit Tests
- sourceCodeProvider.js: Test all targets, grep patterns
- snapshotCapture.js: Test markdown generation, formatting
- File save/load handlers: Test File System Access API and fallback

### Integration Tests
- AI tool execution chain
- Save/Load round-trip (browser and file)

### E2E Tests
- Realistic calculation questions
- Scenario creation without navigation
- File picker interactions (where supported)

### Manual Testing Steps
1. Test Save dropdown with both options
2. Test Load dropdown with both options
3. Ask 10 different calculation questions
4. Verify AI stays in chat when creating scenarios
5. Test on browsers without File System Access API

## References

- Current export implementation: `src/lib/excelExport.js`
- Current save/load: `src/hooks/useProjections.js:251-288`
- AI tools: `src/lib/aiService.js:53-139`
- Chat component: `src/components/Chat/index.jsx`
- Calculation logic: `src/lib/calculations.js`
- Tax tables: `src/lib/taxTables.js`
