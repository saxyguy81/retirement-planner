# Calculation Clarity & UX Overhaul - Implementation Plan

## Executive Summary

This plan transforms the retirement planner from a data-dense expert tool into an intuitive, self-explaining application where **calculations tell a story** users can follow. It directly addresses user feedback that calculations are "too complicated to follow" and terms are "hard to understand."

**Core Problem**: Users see 40+ rows of financial jargon (MAGI, IRMAA, BOY/EOY, NIIT) with no clear story connecting them.

**Core Solution**: Restructure the display around the **"Story of a Retirement Year"** with progressive disclosure, plain-English explanations, and visual flow indicators.

**Relationship to Existing Plan**: This plan complements `new-user-usability-improvements.md` (v3). That plan focuses on **onboarding and first impressions**. This plan focuses on **ongoing usability and comprehension** for users who are actively exploring their projections.

---

## Research-Backed Principles

Based on Nielsen Norman Group, Fidelity, Boldin, ProjectionLab, and academic UX research:

| Principle | Research Finding | Application |
|-----------|------------------|-------------|
| **Progressive Disclosure** | Max 2 disclosure levels; more causes confusion | Summary view → Detail view (no deeper) |
| **Summary First** | Users need overview before details | Show totals prominently, details on demand |
| **Plain English** | Target 9-year-old reading level; 16% of adults have low literacy | Replace jargon with conversational explanations |
| **Visual Flow** | Users scan in F/Z patterns | Place key numbers top-left; use visual connectors |
| **Contextual Definitions** | Tooltips beat glossaries for comprehension | Define terms where they appear, not in a separate page |
| **Real-Time Feedback** | Boldin's success: "Plan Updated" popup shows impact instantly | Show delta changes when inputs change |
| **Transparency Builds Trust** | Users trust what they can see calculated | Show formula + values + result for every number |
| **Color + Icon + Text** | 8% of men are colorblind; color alone fails | Always pair semantic colors with icons and labels |

---

## Current State Analysis

### What Users See Today

**Projections Table**: 10 sections, 40+ rows of financial data:
```
STARTING POSITION     (5 rows: atBOY, iraBOY, rothBOY, totalBOY, costBasisBOY)
INCOME                (1 row: ssAnnual)
CASH NEEDS            (2 rows: expenses, irmaaTotal)
RMD & CONVERSIONS     (3 rows: rmdFactor, rmdRequired, rothConversion)
WITHDRAWALS           (4 rows: atWithdrawal, iraWithdrawal, rothWithdrawal, totalWithdrawal)
TAX DETAIL            (9 rows: taxableSS, ordinaryIncome, capitalGains, taxableOrdinary, federalTax, ltcgTax, niit, stateTax, totalTax)
IRMAA DETAIL          (3 rows: irmaaMAGI, irmaaPartB, irmaaPartD)
ENDING POSITION       (6 rows: atEOY, iraEOY, rothEOY, totalEOY, costBasisEOY, rothPercent)
HEIR VALUE            (1 row: heirValue)
ANALYSIS & METRICS    (7 rows: effectiveAtReturn, effectiveIraReturn, effectiveRothReturn, cumulativeTax, cumulativeIRMAA, cumulativeCapitalGains, atLiquidationPercent)
```

### Problems Identified

1. **No Story Flow**: Sections are data-centric, not question-centric. Users can't see "how does money flow through my retirement year?"

2. **Jargon Overload**: Terms like IRMAA, MAGI, NIIT, RMD, BOY/EOY, LTCG are unexplained in the table

3. **Lost in Details**: TAX DETAIL has 9 rows; users see trees, not forest

4. **No Visual Hierarchy**: Every row looks equally important; nothing guides the eye

5. **Calculation Inspector is Separate**: Clicking a cell opens a modal that loses table context

6. **No Year-over-Year Story**: Hard to see "what changed and why" between years

---

## Desired End State

### The "Story of a Retirement Year" View

```
┌─────────────────────────────────────────────────────────────────────┐
│  2025 (Age 65)                                           [Expand]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  💰 You START with          →  📥 RECEIVE   →  📤 SPEND   →  💰 END │
│     $1,800,000                   $52,000        $98,000       $1,790,000
│                                  +$52K          -$98K         (-0.6%)
│                                                                      │
│  [See Account Details]      [Income Details] [Spending Details]      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

When expanded:
```
┌─────────────────────────────────────────────────────────────────────┐
│  💰 Starting Accounts                                               │
│  ├── Taxable Brokerage     $400,000                                │
│  ├── Traditional IRA     $1,000,000  (has Required Minimum: $40K)  │
│  └── Roth IRA              $400,000  (tax-free)                    │
│      Total               $1,800,000                                 │
├─────────────────────────────────────────────────────────────────────┤
│  📥 Money Coming In                                                 │
│  ├── Social Security        $38,400/yr  (You: $28K + Spouse: $10K) │
│  └── Account Withdrawals    $60,000     [See withdrawal strategy]  │
│      Total Income           $98,400                                 │
├─────────────────────────────────────────────────────────────────────┤
│  📤 Money Going Out                                                 │
│  ├── Living Expenses        $72,000/yr  (inflated from $68K base)  │
│  ├── Healthcare + Medicare  $12,200     [Why this much? ⓘ]         │
│  └── Taxes                  $14,200     [See tax breakdown ⓘ]      │
│      Total Spending         $98,400                                 │
├─────────────────────────────────────────────────────────────────────┤
│  💰 Ending Accounts                                                 │
│  ├── Taxable Brokerage     $385,000    (-$15K withdrawn)           │
│  ├── Traditional IRA       $980,000    (-$40K RMD, +$20K growth)   │
│  └── Roth IRA              $425,000    (+$25K growth, tax-free!)   │
│      Total               $1,790,000    (-$10K net, -0.6%)          │
│                                                                      │
│  📊 Value to Heirs: $1,650,000 (after heir taxes)                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Differences

| Current | New |
|---------|-----|
| Data-centric sections (STARTING POSITION, TAX DETAIL) | Story-centric questions (Money In, Money Out) |
| All 40 rows visible | Summary view with 4 key numbers; details on demand |
| Jargon labels (IRMAA, NIIT, RMD) | Plain English + definition on hover |
| No visual flow | Arrow/flow indicators showing money movement |
| Separate calculation inspector modal | Inline expandable explanations |
| All years equally prominent | Current year card-style, with timeline navigation |

---

## What We're NOT Doing

- **Removing data**: All 40+ fields remain accessible; we're reorganizing, not eliminating
- **Dumbing down**: Power users can still access every calculation detail
- **Hiding complexity**: Complex calculations are explained, not hidden
- **Separate "simple mode"**: One adaptive interface, not two separate modes
- **New calculation logic**: This is purely presentation; calculation engine unchanged

---

## Implementation Approach

### Strategy: "Onion Layers" of Detail

```
Layer 0: Year Summary Card    (4 numbers: Start, In, Out, End)
Layer 1: Category Breakdown   (Accounts, Income, Expenses, Taxes - 12-15 rows)
Layer 2: Full Detail         (All 40+ rows, calculation inspector)
```

Users control depth via expand/collapse, not separate modes.

---

## Phase 1: Story-Centric Row Reorganization

### Overview
Restructure the 10 current sections into 5 story-driven categories that answer questions users actually have.

### New Section Structure

| New Section | Icon | Question Answered | Contains (from old sections) |
|-------------|------|-------------------|------------------------------|
| **Your Accounts** | 💰 | "What do I have?" | STARTING POSITION + ENDING POSITION |
| **Money Coming In** | 📥 | "What's my income?" | INCOME + withdrawals from WITHDRAWALS |
| **Money Going Out** | 📤 | "What do I spend?" | CASH NEEDS + IRMAA + property tax |
| **Taxes** | 🏛️ | "What goes to taxes?" | TAX DETAIL (collapsed to 3 summary rows) |
| **Legacy** | 👨‍👩‍👧 | "What's left for heirs?" | HEIR VALUE |

### Row Mapping Detail

```javascript
const STORY_SECTIONS = [
  {
    id: 'accounts',
    title: 'Your Accounts',
    icon: '💰',
    question: 'What do you have?',
    summaryRows: [
      { key: 'totalBOY', label: 'Starting Total', format: '$' },
      { key: 'totalEOY', label: 'Ending Total', format: '$', showDelta: true },
    ],
    detailRows: [
      { key: 'atBOY', label: 'Taxable Brokerage (Start)', format: '$',
        plainEnglish: 'Your regular investment account - gains are taxed yearly' },
      { key: 'iraBOY', label: 'Traditional IRA (Start)', format: '$',
        plainEnglish: 'Tax-deferred retirement account - taxed when you withdraw' },
      { key: 'rothBOY', label: 'Roth IRA (Start)', format: '$',
        plainEnglish: 'Tax-free retirement account - no taxes on growth or withdrawals' },
      // ... end-of-year equivalents
    ],
    advancedRows: [
      { key: 'costBasisBOY', label: 'Original Purchase Price (Taxable)', format: '$',
        plainEnglish: 'What you originally paid - gains above this are taxed' },
      { key: 'rothPercent', label: 'Roth as % of Total', format: '%',
        plainEnglish: 'Higher = more tax-free money' },
    ],
  },
  {
    id: 'income',
    title: 'Money Coming In',
    icon: '📥',
    question: "What's your income?",
    summaryRows: [
      { key: 'totalIncome', label: 'Total Income', format: '$', computed: true },
    ],
    detailRows: [
      { key: 'ssAnnual', label: 'Social Security', format: '$',
        plainEnglish: 'Monthly benefit × 12, adjusted for inflation (COLA)' },
      { key: 'totalWithdrawal', label: 'Account Withdrawals', format: '$',
        plainEnglish: 'Money pulled from your accounts to cover expenses' },
    ],
    advancedRows: [
      { key: 'atWithdrawal', label: '↳ From Taxable Account', format: '$' },
      { key: 'iraWithdrawal', label: '↳ From Traditional IRA', format: '$' },
      { key: 'rothWithdrawal', label: '↳ From Roth IRA', format: '$' },
      { key: 'rmdRequired', label: 'Required Minimum (RMD)', format: '$',
        plainEnglish: 'IRS requires you withdraw at least this much from your IRA after age 73' },
      { key: 'rothConversion', label: 'Roth Conversion', format: '$',
        plainEnglish: 'Moving money from IRA to Roth - pay tax now for tax-free later' },
    ],
  },
  {
    id: 'spending',
    title: 'Money Going Out',
    icon: '📤',
    question: 'What do you spend?',
    summaryRows: [
      { key: 'totalSpending', label: 'Total Spending', format: '$', computed: true },
    ],
    detailRows: [
      { key: 'expenses', label: 'Living Expenses', format: '$',
        plainEnglish: 'Housing, food, travel, entertainment - inflated from your base amount' },
      { key: 'healthcareCost', label: 'Healthcare + Medicare', format: '$', computed: true,
        plainEnglish: 'Medicare premiums plus any surcharges based on your income' },
      { key: 'totalTax', label: 'Total Taxes', format: '$',
        plainEnglish: 'Federal + state + investment taxes combined' },
    ],
    advancedRows: [
      { key: 'irmaaPartB', label: '↳ Medicare Part B', format: '$' },
      { key: 'irmaaPartD', label: '↳ Medicare Part D', format: '$' },
      { key: 'propertyTax', label: 'Property Tax', format: '$' },
    ],
  },
  {
    id: 'taxes',
    title: 'Tax Breakdown',
    icon: '🏛️',
    question: 'How much goes to taxes?',
    collapsed: true, // Start collapsed
    summaryRows: [
      { key: 'totalTax', label: 'Total Tax', format: '$', highlight: true },
      { key: 'effectiveTaxRate', label: 'Effective Rate', format: '%', computed: true,
        plainEnglish: 'Your actual tax rate after all deductions' },
    ],
    detailRows: [
      { key: 'federalTax', label: 'Federal Income Tax', format: '$',
        plainEnglish: 'Tax on your ordinary income (SS, IRA withdrawals, conversions)' },
      { key: 'ltcgTax', label: 'Capital Gains Tax', format: '$',
        plainEnglish: 'Tax on investment profits (0%, 15%, or 20% based on income)' },
      { key: 'stateTax', label: 'State Tax', format: '$' },
    ],
    advancedRows: [
      { key: 'taxableSS', label: 'Taxable Portion of Social Security', format: '$',
        plainEnglish: 'Up to 85% of your SS can be taxed if you have other income' },
      { key: 'ordinaryIncome', label: 'Total Ordinary Income', format: '$',
        plainEnglish: 'Income taxed at regular rates: SS + IRA withdrawals + conversions' },
      { key: 'capitalGains', label: 'Capital Gains This Year', format: '$',
        plainEnglish: 'Profits from selling investments in your taxable account' },
      { key: 'standardDeduction', label: 'Standard Deduction', format: '$',
        plainEnglish: 'Amount you can subtract from income before calculating tax' },
      { key: 'niit', label: 'Medicare Surtax (NIIT)', format: '$',
        plainEnglish: '3.8% extra tax on investment income if you earn over $250K' },
    ],
  },
  {
    id: 'legacy',
    title: 'Legacy',
    icon: '👨‍👩‍👧',
    question: "What's left for heirs?",
    summaryRows: [
      { key: 'heirValue', label: 'After-Tax Value to Heirs', format: '$', highlight: true,
        plainEnglish: 'What your heirs actually receive after they pay taxes on inherited accounts' },
    ],
  },
];
```

### Changes Required:

#### 1. New Section Configuration
**File**: `src/components/ProjectionsTable/storySections.js` (new)

Export the `STORY_SECTIONS` configuration above with full row definitions.

#### 2. Update ProjectionsTable to Use Story Sections
**File**: `src/components/ProjectionsTable/index.jsx`

```jsx
// Replace current SECTIONS constant with imported STORY_SECTIONS
import { STORY_SECTIONS } from './storySections';

// Add toggle for "Story View" vs "Classic View"
const [viewMode, setViewMode] = useState('story'); // 'story' | 'classic'

// Render based on mode
{viewMode === 'story' ? (
  <StoryView sections={STORY_SECTIONS} data={projections} />
) : (
  <ClassicView sections={SECTIONS} data={projections} />
)}
```

#### 3. Story View Component
**File**: `src/components/ProjectionsTable/StoryView.jsx` (new)

```jsx
export function StoryView({ sections, data, params, showPV, onInspect }) {
  const [expandedSections, setExpandedSections] = useState(['accounts', 'income', 'spending']);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      {sections.map(section => (
        <SectionCard
          key={section.id}
          section={section}
          expanded={expandedSections.includes(section.id)}
          onToggle={() => toggleSection(section.id)}
          showAdvanced={showAdvanced}
          data={data}
        />
      ))}

      <div className="text-center">
        <button onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? 'Hide Advanced Details' : 'Show All Details'}
        </button>
      </div>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] `npm test` passes - unit tests for new section mapping
- [ ] `npm run test:e2e` passes - updated for new section names
- [ ] All 40+ original data fields remain accessible

#### Manual Verification:
- [ ] Story sections answer user questions (What do I have? What's coming in?)
- [ ] Default view shows ~12 summary rows instead of 40+
- [ ] Expanding sections reveals full detail
- [ ] "Classic View" toggle restores original 10-section layout

---

## Phase 2: Plain English Term Definitions

### Overview
Add contextual, jargon-free explanations that appear on hover/tap for every financial term.

### Term Dictionary

**File**: `src/lib/termDictionary.js` (new)

```javascript
/**
 * Plain English definitions for financial jargon
 * Target audience: Someone who's never done retirement planning
 * Reading level: 9th grade or lower
 */
export const TERM_DEFINITIONS = {
  // Account Types
  'Traditional IRA': {
    short: 'Tax-deferred retirement account',
    long: 'Money grows tax-free, but you pay income tax when you withdraw. Required withdrawals start at age 73.',
    analogy: 'Like a "pay later" account - Uncle Sam waits for his cut until you take money out.',
  },
  'Roth IRA': {
    short: 'Tax-free retirement account',
    long: 'You already paid tax on this money. It grows tax-free and withdrawals are tax-free.',
    analogy: 'Like a "pre-paid" account - you paid the tax bill upfront, so everything you take out is yours.',
  },
  'Taxable Brokerage': {
    short: 'Regular investment account',
    long: 'A normal investment account with no special tax treatment. You pay tax on dividends each year and on profits when you sell.',
    analogy: 'Like a regular savings account, but for stocks and bonds.',
  },

  // Tax Terms
  'RMD': {
    short: 'Required Minimum Distribution',
    long: "After age 73, the IRS requires you to withdraw a minimum amount from your Traditional IRA each year. The amount is based on your age and account balance.",
    analogy: "The government's way of saying 'you can't defer taxes forever.'",
    source: 'IRS Publication 590-B',
  },
  'IRMAA': {
    short: 'Income-Related Medicare Adjustment',
    long: 'If your income is above certain thresholds, you pay higher Medicare premiums. Based on your income from 2 years ago.',
    analogy: 'A "Medicare surcharge" for higher earners.',
    source: 'Medicare.gov',
  },
  'MAGI': {
    short: 'Modified Adjusted Gross Income',
    long: 'Your total income with certain deductions added back. Used to determine Medicare premiums and other benefits.',
    analogy: "The government's way of measuring your 'real' income.",
  },
  'NIIT': {
    short: 'Net Investment Income Tax',
    long: 'An extra 3.8% tax on investment income (dividends, capital gains) if your income exceeds $250,000 (married filing jointly).',
    analogy: 'A Medicare surtax on investment profits for higher earners.',
    source: 'IRS Form 8960',
  },
  'LTCG': {
    short: 'Long-Term Capital Gains',
    long: 'Profit from selling investments held over 1 year. Taxed at lower rates (0%, 15%, or 20%) than regular income.',
    analogy: 'The reward for patient investing - lower tax rates if you hold for a year.',
  },
  'Roth Conversion': {
    short: 'Moving money from IRA to Roth',
    long: 'You pay income tax on the converted amount this year, but future growth and withdrawals are tax-free. Often makes sense when you expect higher taxes later.',
    analogy: 'Paying the tax bill now to avoid a bigger one later.',
  },

  // Time References
  'BOY': {
    short: 'Beginning of Year',
    long: 'Account balance on January 1st of the given year.',
  },
  'EOY': {
    short: 'End of Year',
    long: 'Account balance on December 31st of the given year.',
  },
  'PV': {
    short: 'Present Value',
    long: "Future amounts converted to today's dollars. Helps compare money across different years fairly.",
    analogy: '$100,000 in 2045 won\'t buy as much as $100,000 today. PV shows what it\'s worth in today\'s purchasing power.',
  },
  'FV': {
    short: 'Future Value',
    long: 'The actual dollar amount at that future date, not adjusted for inflation.',
  },

  // Other
  'Cost Basis': {
    short: 'What you originally paid',
    long: 'The original purchase price of your investments. When you sell, you only pay tax on the gain above this amount.',
    analogy: 'If you bought stock for $50 and sell for $100, you only pay tax on the $50 profit, not the full $100.',
  },
  'Standard Deduction': {
    short: 'Tax-free income amount',
    long: 'An amount you can subtract from your income before calculating taxes. Higher for seniors (65+) and married couples.',
    source: 'IRS Publication 501',
  },
  'Effective Tax Rate': {
    short: 'Your actual tax percentage',
    long: 'Total tax divided by total income. Usually lower than your marginal bracket because lower brackets apply first.',
    analogy: "Even if you're 'in the 22% bracket', you might only pay 15% overall.",
  },
};
```

### Tooltip Component with Progressive Detail

**File**: `src/components/TermTooltip/index.jsx` (new)

```jsx
import { TERM_DEFINITIONS } from '../../lib/termDictionary';

export function TermTooltip({ term, children }) {
  const def = TERM_DEFINITIONS[term];
  const [showLong, setShowLong] = useState(false);

  if (!def) return children;

  return (
    <span className="relative group">
      {children}
      <span className="underline decoration-dotted decoration-blue-400/50 cursor-help" />

      {/* Tooltip */}
      <div
        className="absolute z-50 hidden group-hover:block bottom-full left-0 mb-2 w-72
                   bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3"
        role="tooltip"
      >
        <div className="text-blue-400 font-medium text-sm">{term}</div>
        <div className="text-slate-300 text-xs mt-1">{def.short}</div>

        {showLong ? (
          <>
            <div className="text-slate-400 text-xs mt-2 leading-relaxed">{def.long}</div>
            {def.analogy && (
              <div className="text-slate-500 text-xs mt-2 italic">
                💡 Think of it as: {def.analogy}
              </div>
            )}
            {def.source && (
              <div className="text-slate-600 text-[10px] mt-2">
                Source: {def.source}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => setShowLong(true)}
            className="text-blue-400 text-xs mt-2 hover:underline"
          >
            Tell me more →
          </button>
        )}
      </div>
    </span>
  );
}
```

### Integration with Row Labels

**File**: `src/components/ProjectionsTable/RowLabel.jsx` (new)

```jsx
export function RowLabel({ label, plainEnglish, fieldKey }) {
  const hasTerm = TERM_DEFINITIONS[fieldKey] || TERM_DEFINITIONS[label];

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-300">{label}</span>

      {plainEnglish && (
        <span className="text-slate-500 text-xs hidden xl:inline">
          — {plainEnglish}
        </span>
      )}

      {hasTerm && (
        <button
          className="text-blue-400/50 hover:text-blue-400"
          aria-label={`Learn about ${label}`}
        >
          <HelpCircle className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] Unit tests for term dictionary coverage (all used terms have definitions)
- [ ] Tooltips render without layout shifts

#### Manual Verification:
- [ ] Hover over any jargon term → tooltip appears with plain English
- [ ] "Tell me more" reveals deeper explanation + analogy
- [ ] Sources cited where applicable (IRS, Medicare.gov)
- [ ] Terms feel conversational, not clinical

---

## Phase 3: Visual Flow Indicators

### Overview
Add visual cues that show how money flows through a retirement year, making the calculation chain visible at a glance.

### Flow Visualization Component

**File**: `src/components/MoneyFlow/index.jsx` (new)

```jsx
/**
 * Visual representation of money flow through a retirement year
 * Shows: Start → Income + Withdrawals → Expenses + Taxes → End
 */
export function MoneyFlow({ yearData, compact = false }) {
  const { totalBOY, totalIncome, totalSpending, totalEOY } = yearData;
  const netChange = totalEOY - totalBOY;
  const percentChange = ((netChange / totalBOY) * 100).toFixed(1);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">{formatK(totalBOY)}</span>
        <ArrowRight className="w-4 h-4 text-slate-600" />
        <span className="text-green-400">+{formatK(totalIncome)}</span>
        <ArrowRight className="w-4 h-4 text-slate-600" />
        <span className="text-orange-400">-{formatK(totalSpending)}</span>
        <ArrowRight className="w-4 h-4 text-slate-600" />
        <span className={netChange >= 0 ? 'text-blue-400' : 'text-red-400'}>
          {formatK(totalEOY)}
        </span>
        <span className="text-slate-500 text-xs">
          ({percentChange > 0 ? '+' : ''}{percentChange}%)
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 p-4 bg-slate-800/50 rounded-lg">
      {/* Start */}
      <FlowNode
        icon="💰"
        label="Start With"
        value={totalBOY}
        color="slate"
      />

      {/* Arrow with income */}
      <FlowArrow direction="right" label={`+${formatK(totalIncome)}`} color="green" />

      {/* After income */}
      <FlowNode
        icon="📥"
        label="After Income"
        value={totalBOY + totalIncome}
        delta={totalIncome}
        color="green"
      />

      {/* Arrow with spending */}
      <FlowArrow direction="right" label={`-${formatK(totalSpending)}`} color="orange" />

      {/* End */}
      <FlowNode
        icon="💰"
        label="End With"
        value={totalEOY}
        delta={netChange}
        percent={percentChange}
        color={netChange >= 0 ? 'blue' : 'red'}
      />
    </div>
  );
}
```

### Year-over-Year Delta Indicators

**File**: `src/components/DeltaIndicator/index.jsx` (new)

```jsx
/**
 * Shows change from previous year with directional arrow and color
 */
export function DeltaIndicator({ current, previous, format = '$' }) {
  if (previous === undefined || previous === null) return null;

  const delta = current - previous;
  const percentChange = previous !== 0 ? ((delta / previous) * 100) : 0;
  const isPositive = delta >= 0;

  return (
    <span className={`text-xs flex items-center gap-1 ${
      isPositive ? 'text-green-400' : 'text-orange-400'
    }`}>
      {isPositive ? (
        <TrendingUp className="w-3 h-3" aria-hidden="true" />
      ) : (
        <TrendingDown className="w-3 h-3" aria-hidden="true" />
      )}
      <span>
        {isPositive ? '+' : ''}{format === '$' ? formatK(delta) : delta.toFixed(1) + '%'}
      </span>
      <span className="text-slate-500">
        ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
      </span>
      <span className="sr-only">
        {isPositive ? 'increase' : 'decrease'} from previous year
      </span>
    </span>
  );
}
```

### Interactive Sankey Diagram (Optional Enhancement)

For the Dashboard tab, add a Sankey diagram showing annual cash flow:

```jsx
// Using recharts or react-flow
<SankeyDiagram
  nodes={[
    { id: 'ss', label: 'Social Security', value: ssAnnual },
    { id: 'ira-w', label: 'IRA Withdrawal', value: iraWithdrawal },
    { id: 'at-w', label: 'Taxable Withdrawal', value: atWithdrawal },
    { id: 'expenses', label: 'Living Expenses', value: expenses },
    { id: 'taxes', label: 'Taxes', value: totalTax },
    { id: 'healthcare', label: 'Healthcare', value: irmaaTotal },
    { id: 'savings', label: 'Remaining', value: netSavings },
  ]}
  links={[
    { source: 'ss', target: 'expenses' },
    { source: 'ira-w', target: 'expenses' },
    { source: 'ira-w', target: 'taxes' },
    // ... etc
  ]}
/>
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] Flow components render without errors
- [ ] Delta calculations are accurate

#### Manual Verification:
- [ ] Money flow visualization shows clear Start → End story
- [ ] Deltas show change direction with color + icon
- [ ] Users can trace "where did my money go?"

---

## Phase 4: Inline Calculation Explanations

### Overview
Replace the modal-based Calculation Inspector with inline expandable explanations that maintain table context.

### Current Problem
- User clicks cell → Modal opens → Loses table context
- Hard to compare calculations across years
- Must close modal to see another cell

### Solution: Inline Expansion

**File**: `src/components/ProjectionsTable/InlineExplanation.jsx` (new)

```jsx
/**
 * Inline expandable calculation explanation
 * Renders below the row when a cell is clicked
 */
export function InlineExplanation({ field, yearData, params, onClose }) {
  const calc = CALCULATIONS[field];
  const computed = calc.compute(yearData, params);

  return (
    <tr className="bg-slate-800/80 border-l-4 border-blue-500">
      <td colSpan="100%" className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="text-blue-400 font-medium">{calc.name}</h4>
            <p className="text-slate-400 text-sm mt-1">{calc.concept}</p>
          </div>
          <button onClick={onClose} aria-label="Close explanation">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Quick Answer */}
        <div className="bg-slate-900 rounded p-3 mb-3">
          <div className="text-3xl font-mono text-blue-400">{computed.simple}</div>
          {computed.simpleSecondary && (
            <div className="text-slate-500 text-sm">{computed.simpleSecondary}</div>
          )}
        </div>

        {/* Formula */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-slate-500 text-xs mb-1">Formula</div>
            <code className="text-slate-400">{computed.formula}</code>
          </div>
          <div>
            <div className="text-slate-500 text-xs mb-1">This Year's Values</div>
            <code className="text-amber-400">{computed.values}</code>
          </div>
          <div>
            <div className="text-slate-500 text-xs mb-1">Result</div>
            <code className="text-emerald-400 font-bold">{computed.result}</code>
          </div>
        </div>

        {/* Rule of Thumb */}
        {calc.backOfEnvelope && (
          <div className="mt-3 text-slate-500 text-xs italic">
            💡 Rule of thumb: {calc.backOfEnvelope}
          </div>
        )}

        {/* Navigate to related calculations */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-slate-500 text-xs">Related:</span>
          {getRelatedFields(field).map(related => (
            <button
              key={related}
              onClick={() => expandField(related)}
              className="text-xs px-2 py-1 bg-slate-700 rounded hover:bg-slate-600"
            >
              {CALCULATIONS[related]?.name || related}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}
```

### Table Integration

```jsx
// In ProjectionsTable, track expanded explanations
const [expandedCell, setExpandedCell] = useState(null); // { field, year }

// When rendering rows:
{section.rows.map(row => (
  <>
    <tr key={row.key}>
      {/* ... existing row cells ... */}
      {sortedData.map(yearData => (
        <td
          key={yearData.year}
          onClick={() => setExpandedCell({ field: row.key, year: yearData.year })}
          className="cursor-pointer hover:bg-blue-900/20"
        >
          {formatValue(yearData[row.key])}
        </td>
      ))}
    </tr>

    {/* Inline explanation row */}
    {expandedCell?.field === row.key && (
      <InlineExplanation
        field={row.key}
        yearData={sortedData.find(d => d.year === expandedCell.year)}
        params={params}
        onClose={() => setExpandedCell(null)}
      />
    )}
  </>
))}
```

### Keep Modal as Optional Deep-Dive

The existing CalculationInspector modal can remain available via a "Full Details" button in the inline explanation for users who want the complete breakdown with navigation.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] Inline explanations render without breaking table layout

#### Manual Verification:
- [ ] Click cell → explanation appears inline below row
- [ ] Table context (other years) remains visible
- [ ] Can click another cell without closing first
- [ ] "Full Details" opens existing modal for power users

---

## Phase 5: Summary Dashboard Cards

### Overview
Replace the dense projections table as the default view with summary cards that highlight what matters most.

### Year Summary Card Component

**File**: `src/components/YearSummaryCard/index.jsx` (new)

```jsx
export function YearSummaryCard({ yearData, previousYearData, expanded, onToggle }) {
  const netChange = yearData.totalEOY - yearData.totalBOY;
  const isPositive = netChange >= 0;

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50"
      >
        <div className="flex items-center gap-4">
          <div className="text-lg font-medium text-slate-200">
            {yearData.year}
            <span className="text-slate-500 text-sm ml-2">Age {yearData.age}</span>
          </div>

          {/* Key metrics summary */}
          <div className="flex items-center gap-6 text-sm">
            <Metric label="Start" value={yearData.totalBOY} />
            <Metric label="End" value={yearData.totalEOY} />
            <Metric
              label="Change"
              value={netChange}
              trend={isPositive ? 'up' : 'down'}
            />
          </div>
        </div>

        <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700">
          <MoneyFlow yearData={yearData} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <MetricCard
              icon="📥"
              title="Income"
              value={yearData.ssAnnual + yearData.totalWithdrawal}
              breakdown={[
                { label: 'Social Security', value: yearData.ssAnnual },
                { label: 'Withdrawals', value: yearData.totalWithdrawal },
              ]}
            />
            <MetricCard
              icon="📤"
              title="Spending"
              value={yearData.expenses + yearData.totalTax + yearData.irmaaTotal}
              breakdown={[
                { label: 'Living Expenses', value: yearData.expenses },
                { label: 'Taxes', value: yearData.totalTax },
                { label: 'Healthcare', value: yearData.irmaaTotal },
              ]}
            />
            <MetricCard
              icon="💰"
              title="Net Worth"
              value={yearData.totalEOY}
              delta={netChange}
              previousLabel="vs. start of year"
            />
            <MetricCard
              icon="👨‍👩‍👧"
              title="Heir Value"
              value={yearData.heirValue}
              sublabel="After heir taxes"
            />
          </div>

          <div className="mt-4 flex justify-center">
            <button className="text-blue-400 text-sm hover:underline">
              View Full Details for {yearData.year} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Timeline Navigation

**File**: `src/components/YearTimeline/index.jsx` (new)

```jsx
/**
 * Visual timeline showing all years with key milestones
 */
export function YearTimeline({ projections, selectedYear, onSelectYear }) {
  const milestones = [
    { year: 2025, label: 'Plan Start' },
    { year: 2028, label: 'Age 65 - Medicare' },
    { year: 2030, label: 'Social Security' },
    { year: 2036, label: 'Age 73 - RMDs Begin' },
    { year: 2045, label: 'Spouse SS' },
  ];

  return (
    <div className="relative py-4">
      {/* Timeline bar */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-700 -translate-y-1/2" />

      {/* Year markers */}
      <div className="relative flex justify-between">
        {projections.map(p => (
          <button
            key={p.year}
            onClick={() => onSelectYear(p.year)}
            className={`relative flex flex-col items-center ${
              p.year === selectedYear ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${
              p.year === selectedYear ? 'bg-blue-400' : 'bg-slate-600'
            }`} />
            <span className="text-xs mt-1">{p.year}</span>

            {/* Milestone label */}
            {milestones.find(m => m.year === p.year) && (
              <span className="absolute top-full mt-4 text-[10px] whitespace-nowrap">
                {milestones.find(m => m.year === p.year).label}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] Card components render correctly
- [ ] Timeline navigation works

#### Manual Verification:
- [ ] Default view shows summary cards instead of full table
- [ ] Cards answer "what happened this year?" at a glance
- [ ] Timeline makes year navigation intuitive
- [ ] "View Full Details" leads to detailed table

---

## Phase 6: Intelligent Defaults & Presets

### Overview
Reduce cognitive load by offering sensible default views and presets for common user questions.

### Quick View Presets

```jsx
const VIEW_PRESETS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Key metrics only',
    rows: ['totalBOY', 'totalEOY', 'ssAnnual', 'totalWithdrawal', 'totalTax', 'heirValue'],
    collapsed: ['taxes', 'analysis'],
  },
  {
    id: 'tax-focus',
    label: 'Tax Analysis',
    description: 'Detailed tax breakdown',
    rows: ['ordinaryIncome', 'capitalGains', 'taxableOrdinary', 'federalTax', 'ltcgTax', 'stateTax', 'totalTax', 'effectiveTaxRate'],
    expanded: ['taxes'],
  },
  {
    id: 'withdrawal-strategy',
    label: 'Withdrawal Strategy',
    description: 'Where money comes from',
    rows: ['rmdRequired', 'atWithdrawal', 'iraWithdrawal', 'rothWithdrawal', 'rothConversion'],
    expanded: ['income'],
  },
  {
    id: 'heir-planning',
    label: 'Legacy Planning',
    description: 'What heirs receive',
    rows: ['totalEOY', 'rothPercent', 'heirValue'],
    expanded: ['legacy'],
  },
  {
    id: 'full-detail',
    label: 'Full Detail',
    description: 'All 40+ rows',
    rows: 'all',
    expanded: 'all',
  },
];
```

### Preset Selector Component

```jsx
export function ViewPresetSelector({ currentPreset, onSelect }) {
  return (
    <div className="flex gap-2 p-2 bg-slate-800 rounded-lg">
      {VIEW_PRESETS.map(preset => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset)}
          className={`px-3 py-1.5 rounded text-sm ${
            currentPreset?.id === preset.id
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-700'
          }`}
          title={preset.description}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] Presets correctly filter visible rows

#### Manual Verification:
- [ ] Users can quickly switch between focused views
- [ ] "Overview" preset reduces cognitive load
- [ ] Power users can access "Full Detail"

---

## Phase 7: Comparison View Enhancements

### Overview
Make it easier to compare scenarios and understand differences.

### Side-by-Side Scenario Comparison

```jsx
export function ScenarioComparisonTable({ scenarios, selectedYears }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          {scenarios.map(s => (
            <th key={s.id}>
              {s.name}
              <span className="text-xs text-slate-500 block">
                {s.description}
              </span>
            </th>
          ))}
          <th>Difference</th>
        </tr>
      </thead>
      <tbody>
        {COMPARISON_METRICS.map(metric => (
          <tr key={metric.key}>
            <td>{metric.label}</td>
            {scenarios.map(s => (
              <td key={s.id}>{formatValue(s.data[metric.key])}</td>
            ))}
            <td>
              <DifferenceIndicator
                values={scenarios.map(s => s.data[metric.key])}
                bestIs={metric.bestIs} // 'high' | 'low'
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Difference Highlighting

```jsx
export function DifferenceIndicator({ values, bestIs }) {
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const diff = max - min;
  const diffPercent = ((diff / min) * 100).toFixed(1);
  const best = bestIs === 'high' ? max : min;

  return (
    <div className="flex flex-col items-center">
      <span className={diff > 0 ? 'text-amber-400' : 'text-slate-500'}>
        {diff > 0 ? `${formatK(diff)} (${diffPercent}%)` : 'Same'}
      </span>
      {diff > 0 && (
        <span className="text-[10px] text-slate-500">
          {bestIs === 'high' ? 'Higher is better' : 'Lower is better'}
        </span>
      )}
    </div>
  );
}
```

### Success Criteria:

#### Manual Verification:
- [ ] Scenarios displayed side-by-side
- [ ] Differences highlighted with directional indicators
- [ ] "Best" option clearly marked

---

## Phase 8: Mobile-Optimized Views

### Overview
Adapt the new story-centric layout for mobile screens.

### Mobile Card Layout

On screens < 768px:
- Year summary cards stack vertically
- Flow diagram simplifies to horizontal bar
- Table converts to card-per-row layout
- Bottom navigation for quick year switching

```jsx
export function MobileYearView({ yearData }) {
  return (
    <div className="space-y-4 pb-20"> {/* padding for bottom nav */}
      {/* Year header */}
      <div className="sticky top-0 bg-slate-900 p-4 border-b border-slate-700">
        <h2 className="text-xl font-bold">{yearData.year}</h2>
        <p className="text-slate-400">Age {yearData.age}</p>
      </div>

      {/* Summary metrics as horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2">
        <MobileMetricChip label="Start" value={yearData.totalBOY} />
        <MobileMetricChip label="End" value={yearData.totalEOY} />
        <MobileMetricChip label="Income" value={yearData.ssAnnual} />
        <MobileMetricChip label="Tax" value={yearData.totalTax} />
      </div>

      {/* Expandable sections */}
      <MobileSection title="Your Accounts" icon="💰">
        <MobileDataRow label="Taxable" value={yearData.atEOY} />
        <MobileDataRow label="Traditional IRA" value={yearData.iraEOY} />
        <MobileDataRow label="Roth IRA" value={yearData.rothEOY} />
      </MobileSection>

      {/* ... more sections ... */}

      {/* Fixed bottom nav for year switching */}
      <MobileYearNav
        currentYear={yearData.year}
        years={allYears}
        onSelect={setSelectedYear}
      />
    </div>
  );
}
```

### Success Criteria:

#### Manual Verification:
- [ ] Test on actual mobile device
- [ ] All metrics accessible without horizontal scroll of data
- [ ] Touch targets are 44px minimum
- [ ] Year navigation is thumb-friendly

---

## Implementation Priority

| Phase | Impact | Effort | Priority | Rationale |
|-------|--------|--------|----------|-----------|
| **Phase 1: Story-Centric Reorganization** | Very High | High | 1 | Fundamental restructure - foundation for everything |
| **Phase 2: Plain English Terms** | Very High | Medium | 2 | Directly addresses jargon feedback |
| **Phase 5: Summary Dashboard Cards** | High | Medium | 3 | Reduces overwhelm immediately |
| **Phase 4: Inline Explanations** | High | Medium | 4 | Maintains context while explaining |
| **Phase 3: Visual Flow Indicators** | Medium | Medium | 5 | Makes money flow visible |
| **Phase 6: View Presets** | Medium | Low | 6 | Quick win for common use cases |
| **Phase 7: Comparison Enhancements** | Medium | Medium | 7 | Helps scenario comparison |
| **Phase 8: Mobile Optimization** | Medium | High | 8 | Complex but important |

---

## Testing Strategy

### Unit Tests
- Term dictionary has definition for every used term
- Story section mapping covers all 40+ fields
- Delta calculations are accurate
- Summary computations (totalIncome, totalSpending) are correct

### E2E Tests
- Story view renders with correct sections
- Clicking cell shows inline explanation
- Toggling between Story/Classic views works
- View presets filter rows correctly
- Mobile card layout functions

### Manual Testing
1. **"Dad Test"**: Can someone unfamiliar with finance understand where their money goes?
2. **Follow the Money**: Can you trace $1 from start to end of year?
3. **Jargon Audit**: Read every label out loud - does it make sense?
4. **3-Click Rule**: Can you find any piece of information in 3 clicks or fewer?
5. **Side-by-Side**: Compare current vs new with actual users

---

## Migration Notes

- No breaking changes to data structure
- Existing localStorage saves continue to work
- "Classic View" toggle preserves power-user access
- All 40+ calculation fields remain accessible
- CalculationInspector modal still available via "Full Details"

---

## References

### Research Sources
- Nielsen Norman Group - Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Nielsen Norman Group - Data Tables: https://www.nngroup.com/articles/data-tables/
- Nielsen Norman Group - Mobile Tables: https://www.nngroup.com/articles/mobile-tables/
- Pencil & Paper - Enterprise Data Tables: https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
- Smashing Magazine - Feature Comparison Tables: https://www.smashingmagazine.com/2017/08/designing-perfect-feature-comparison-table/

### Financial UX
- NoA Ignite - UX Writing for Banks: https://noaignite.com/insights/ux-writing-for-banks-and-fintech/
- FD Capital - Financial Dashboard Design: https://www.fdcapital.co.uk/designing-financial-dashboards-clients-actually-understand/
- Boldin Calculator Review: https://www.caniretireyet.com/boldin-calculator-review/
- ProjectionLab: https://projectionlab.com/

### Competitive Analysis
- Fidelity Retirement Score methodology
- Boldin (NewRetirement) progressive disclosure patterns
- ProjectionLab Sankey diagrams and clean UI
- Vanguard plain-English explanations
