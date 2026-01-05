# New User Usability Improvements - Implementation Plan (v3)

## Executive Summary

This plan transforms the retirement planner from an expert-focused tool into one that guides new users to their "aha moment" within 2 minutes, while preserving all power-user capabilities.

**The Aha Moment**: Seeing your retirement projections update in real-time as you adjust variables.

**Core Strategy**: Value before commitment. Show meaningful projections immediately using sample data, then guide users to personalize.

**New in v3**: Accessibility-first design, emotional framing to reduce financial anxiety, error forgiveness patterns, and mobile-first considerations.

---

## Research-Backed Principles

Based on UX research from Wealthfront, Betterment, Nielsen Norman Group, fintech onboarding studies, and competitive analysis of Fidelity, Boldin, Vanguard, and ProjectionLab:

| Principle | Research Finding | Application |
|-----------|------------------|-------------|
| **Sample First** | Users need to see value before committing data | Load with realistic sample data showing projections |
| **Goal-Oriented** | Task-based navigation outperforms feature-based | Ask "What do you want to know?" before collecting inputs |
| **3-Step Max** | 3-step tours: 72% completion. 7-step: 16% | Onboarding has exactly 3 steps |
| **No Tooltip Walls** | Tooltip fatigue causes users to ignore all help | Use contextual "pull revelations" instead |
| **Endowed Progress** | Pre-checked items increase completion by 40% | Progress bar starts at 20% "Getting Started" |
| **< 2 Minutes** | Time to first meaningful projection | Sample data -> projection visible in < 5 seconds |
| **Reduce Anxiety** | Financial tools trigger money anxiety | Frame shortfalls as "opportunities" not "problems" |
| **Trust Signals** | Users skeptical of black-box calculations | Cite IRS/SSA sources, show methodology |
| **Forgiveness** | Fear of mistakes prevents exploration | Prominent undo, auto-save, easy reset |
| **Accessibility** | 15-20% of users have disabilities | WCAG compliance expands usability for everyone |

---

## Emotional Design Guidelines (Apply Throughout)

**Critical Insight**: Retirement planning triggers financial anxiety. Every UI element should reduce stress, not amplify it.

### Language Principles

| Instead of... | Use... | Why |
|---------------|--------|-----|
| "Shortfall" | "Gap to close" | Frames as actionable, not failure |
| "You'll run out of money" | "You have 22 funded years" | Focus on what IS funded |
| "Failing" | "Room to optimize" | Avoids judgment |
| "Error" | "Let's adjust that" | Collaborative tone |
| "Required" | "Recommended" | Reduces pressure |
| "Warning: X is too low" | "Tip: Increasing X by $Y would..." | Shows path forward |

### Color Coding Beyond Red/Green

Many users are colorblind (8% of men). Always pair color with:
- **Icons**: Checkmark, warning triangle, info circle
- **Text labels**: "On track", "Needs attention", "Opportunity"
- **Position**: Good news top/left, concerns lower/right

### Trust Signals to Add

1. **Source citations**: "Social Security benefit estimates based on SSA.gov calculator methodology"
2. **Calculation transparency**: "How this was calculated" expandable on every major number
3. **Version/date stamps**: "Tax brackets: 2024 IRS Publication 15-T"
4. **Limitations acknowledgment**: "Projections are estimates based on your inputs. Actual results will vary."

---

## Current State vs Desired State

### Current (Problem)
```
User opens app
  -> Lands on empty projections table
  -> Sees 11 input sections (50+ fields)
  -> Has no idea where to start
  -> Gets overwhelmed by jargon
  -> Fears making mistakes
  -> Leaves
```

### Desired (Solution)
```
User opens app
  -> Sees Dashboard with SAMPLE projections showing 30-year forecast
  -> Floating "Make It Yours" prompt (3 quick questions)
  -> Enters age, savings, expenses
  -> Projections UPDATE IN REAL-TIME
  -> AHA MOMENT: "If I do X, I'll have Y at retirement"
  -> Feels encouraged: "You're starting with $X - let's make it work"
  -> Explores scenarios with confidence (undo is always available)
  -> Explores scenarios, optimization on their own
```

---

## What We're NOT Doing

- Multi-step modal wizards (high skip rate)
- Tooltips on every term (tooltip fatigue)
- Separate "simple mode" (fragments experience)
- Hiding advanced features (power users need them)
- Documentation/help pages (nobody reads them)
- Requiring all data upfront (delays aha moment)
- Red/green only color coding (accessibility fail)
- Scary language about money running out (increases anxiety)

---

## Phase 1: Sample Data First (Highest Impact)

### Overview
App loads with realistic pre-populated sample data. User sees meaningful projections immediately. This IS the onboarding.

### Why This Works
- Wealthfront's "Path" tool: users adjust sliders and see projections before any commitment
- "Show, don't tell" - demonstrations beat explanations
- Reduces cognitive load from "fill in 50 fields" to "adjust what matters"
- Provides psychological safety: "I'm just exploring sample data, not my real info"

### Changes Required:

#### 1. Sample Data Set
**File**: `src/lib/sampleData.js` (new)

```javascript
/**
 * Realistic sample data for new users
 * Represents: 62-year-old couple in Illinois, $1.8M saved,
 * planning to retire at 65, moderate expenses
 *
 * EMOTIONAL DESIGN: Sample shows a realistic achievable outcome
 * to build confidence. Avoid samples that look too perfect or too dire.
 */
export const SAMPLE_PARAMS = {
  // Timeline
  startYear: 2025,
  endYear: 2055,

  // Profile (relatable "sample" names)
  // Note: Will show "Sample Plan" indicator in UI

  // Accounts - realistic middle-class retiree
  afterTaxStart: 400000,
  iraStart: 1000000,
  rothStart: 400000,
  afterTaxCostBasis: 250000,

  // Social Security - realistic benefit
  socialSecurityMonthly: 3200,
  ssCOLA: 0.025,

  // Expenses - comfortable but not lavish
  annualExpenses: 85000,
  expenseInflation: 0.025,

  // Returns - moderate/realistic
  returnMode: 'account',
  atReturn: 0.06,
  iraReturn: 0.06,
  rothReturn: 0.07,

  // Tax - Illinois defaults
  stateTaxRate: 0.0495,
  capitalGainsPercent: 0.6,
  bracketInflation: 0.025,

  // Roth Conversions - show the feature exists
  rothConversions: {
    2025: { amount: 50000, isPV: true },
    2026: { amount: 50000, isPV: true },
  },

  // One heir - simple
  heirs: [{
    name: 'Child',
    state: 'IL',
    agi: 150000,
    splitPercent: 100,
    birthYear: 1990,
    taxableRoR: 0.06,
  }],

  // Reasonable defaults for everything else
  discountRate: 0.03,
  magi2024: 180000,
  magi2025: 120000,
  survivorDeathYear: null,
  survivorSSPercent: 0.72,
  survivorExpensePercent: 0.70,
};

export const SAMPLE_SETTINGS = {
  primaryName: 'Sample',
  primaryBirthYear: 1963,
  spouseName: 'Spouse',
  spouseBirthYear: 1965,
};
```

#### 2. First-Visit Detection & Sample Loading
**File**: `src/hooks/useProjections.js`

```javascript
// In useProjections hook initialization:
const getInitialState = () => {
  const hasVisited = localStorage.getItem('retirement-planner-visited');
  const lastState = loadLastState();

  if (lastState) {
    return lastState; // Returning user with saved data
  }

  if (!hasVisited) {
    // First visit: use sample data
    return {
      params: SAMPLE_PARAMS,
      options: DEFAULT_OPTIONS,
      isSampleData: true, // Flag for UI indicator
    };
  }

  // Visited before but no saved data: use defaults
  return { params: DEFAULT_PARAMS, options: DEFAULT_OPTIONS };
};
```

#### 3. "Sample Data" Indicator with Encouraging Tone
**File**: `src/App.jsx`

When viewing sample data, show non-intrusive banner with positive framing:
```jsx
{isSampleData && (
  <div className="bg-amber-900/30 border-b border-amber-700/50 px-4 py-2 flex items-center justify-between">
    <span className="text-amber-200 text-xs">
      <span aria-hidden="true">📊</span> Exploring a sample plan — adjust anything to see results update instantly
    </span>
    <button
      onClick={startPersonalization}
      className="text-amber-400 text-xs hover:text-amber-300 underline"
    >
      Make it yours →
    </button>
  </div>
)}
```

#### 4. Default Tab: Dashboard (not Projections)
**File**: `src/App.jsx`

```javascript
const [activeTab, setActiveTab] = useState('dashboard'); // Changed from 'projections'
```

The Dashboard with charts provides better immediate visual impact than a data table.

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm test` passes (unit tests for sample data loading)
- [x] `npm run test:e2e` passes
- [x] E2E: Fresh visit (no localStorage) shows sample data
- [x] E2E: Dashboard is default tab

#### Manual Verification:
- [x] Clear localStorage, open app -> see populated Dashboard with charts
- [x] Charts show meaningful 30-year projections
- [x] "Sample Plan" indicator is visible but not intrusive
- [x] Changing any input updates projections immediately
- [x] Language is encouraging, not intimidating

---

## Phase 2: Goal-First Personalization (3 Steps Max)

### Overview
Instead of a modal wizard, use a floating "Make It Yours" panel that asks 3 goal-oriented questions and pre-fills intelligent defaults.

### The 3 Questions

1. **"When were you born?"** -> Sets timeline, Social Security timing, RMD age
2. **"How much have you saved?"** -> Splits across AT/IRA/Roth with reasonable ratios
3. **"What are your monthly expenses?"** -> Sets annual expenses

Everything else uses intelligent defaults based on these answers.

### Emotional Design Integration

- Use encouraging micro-copy at each step
- Show "You're doing great!" feedback after each answer
- Progress dots provide sense of momentum
- "Skip for now" option removes pressure

### Changes Required:

#### 1. Personalization Panel Component
**File**: `src/components/PersonalizationPanel/index.jsx` (new)

```jsx
/**
 * Floating panel (not modal) for quick personalization
 * - Dismissible at any time (sample data remains usable)
 * - 3 simple questions
 * - Smart defaults derived from answers
 * - Encouraging micro-copy throughout
 */
export function PersonalizationPanel({ onComplete, onDismiss }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    birthYear: null,
    totalSavings: null,
    monthlyExpenses: null,
  });

  // Encouraging messages for each step
  const encouragement = {
    1: "Great start! This helps us calculate your timeline.",
    2: "Nice! You've already taken the important step of saving.",
    3: "Almost there! This helps us project your needs.",
  };

  // Derive full params from 3 answers
  const deriveParams = () => {
    const { birthYear, totalSavings, monthlyExpenses } = answers;
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    return {
      // Timeline: plan from now to age 95
      startYear: currentYear,
      endYear: birthYear + 95,

      // Accounts: split savings 25% AT, 55% IRA, 20% Roth (typical ratio)
      afterTaxStart: Math.round(totalSavings * 0.25),
      iraStart: Math.round(totalSavings * 0.55),
      rothStart: Math.round(totalSavings * 0.20),
      afterTaxCostBasis: Math.round(totalSavings * 0.25 * 0.6), // 60% gains

      // Expenses
      annualExpenses: monthlyExpenses * 12,

      // Social Security estimate based on age
      // (Rough estimate: $2,500/mo for someone retiring at 67)
      socialSecurityMonthly: age < 62 ? 2500 : 3000,

      // ... reasonable defaults for everything else
    };
  };

  return (
    <div
      className="fixed bottom-4 right-4 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 z-50"
      role="dialog"
      aria-labelledby="personalize-title"
      aria-describedby="personalize-desc"
    >
      {/* Progress dots with ARIA */}
      <div className="flex gap-1 mb-3" role="progressbar" aria-valuenow={step} aria-valuemin="1" aria-valuemax="3">
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className={`h-1 flex-1 rounded ${n <= step ? 'bg-blue-500' : 'bg-slate-600'}`}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-slate-500 hover:text-slate-400"
        aria-label="Close personalization panel"
      >
        <X className="w-4 h-4" />
      </button>

      <p id="personalize-desc" className="text-green-400 text-xs mb-2">
        {encouragement[step]}
      </p>

      {step === 1 && (
        <div>
          <h3 id="personalize-title" className="text-slate-200 font-medium mb-2">
            What year were you born?
          </h3>
          <input
            type="number"
            placeholder="e.g., 1965"
            onChange={e => setAnswers({...answers, birthYear: +e.target.value})}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2"
            aria-describedby="birth-year-hint"
          />
          <p id="birth-year-hint" className="text-slate-500 text-xs mt-2">
            Used to calculate your timeline and Social Security timing
          </p>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 id="personalize-title" className="text-slate-200 font-medium mb-2">
            Roughly how much have you saved for retirement?
          </h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Savings amount options">
            {['$250K', '$500K', '$1M', '$2M', '$3M+'].map(amount => (
              <button
                key={amount}
                onClick={() => {
                  const value = { '$250K': 250000, '$500K': 500000, '$1M': 1000000, '$2M': 2000000, '$3M+': 3000000 }[amount];
                  setAnswers({...answers, totalSavings: value});
                }}
                className={`flex-1 min-w-[60px] py-2 rounded text-xs transition-colors
                  ${answers.totalSavings === { '$250K': 250000, '$500K': 500000, '$1M': 1000000, '$2M': 2000000, '$3M+': 3000000 }[amount]
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600'}`}
              >
                {amount}
              </button>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-2">
            Include 401k, IRA, Roth, and taxable accounts
          </p>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 id="personalize-title" className="text-slate-200 font-medium mb-2">
            What are your monthly expenses?
          </h3>
          <input
            type="number"
            placeholder="e.g., 6000"
            onChange={e => setAnswers({...answers, monthlyExpenses: +e.target.value})}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2"
            aria-describedby="expense-hint"
          />
          <p id="expense-hint" className="text-slate-500 text-xs mt-2">
            Housing, food, healthcare, travel, etc.
          </p>
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button
          onClick={() => step === 1 ? onDismiss() : setStep(s => s - 1)}
          className="text-slate-400 text-sm hover:text-slate-300"
        >
          {step === 1 ? 'Skip for now' : 'Back'}
        </button>
        <button
          onClick={() => {
            if (step < 3) setStep(s => s + 1);
            else onComplete(deriveParams());
          }}
          className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-500"
        >
          {step < 3 ? 'Next' : 'See My Plan'}
        </button>
      </div>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] Unit test: deriveParams produces valid params from 3 inputs
- [x] E2E: Complete 3-step flow -> projections update

#### Manual Verification:
- [x] Panel is dismissible at any step
- [x] Can still interact with app while panel is open
- [x] Derived params produce reasonable projections
- [x] Completing flow removes "Sample Plan" indicator
- [x] Micro-copy feels encouraging, not clinical

---

## Phase 3: Contextual Help System (Not Tooltips)

### Overview
Replace the planned "tooltips on everything" with a smarter contextual help system using:
1. **Inline hints** - Brief explanatory text under complex inputs
2. **"Learn more" expandables** - Click to expand detailed explanation
3. **Empty state education** - Explain features where they're first encountered

### Why Not Tooltips Everywhere

Research findings:
- Users develop "tooltip blindness" and stop reading them
- Tooltips interrupt flow and require precise hover
- Mobile users can't hover
- Better: information visible in context when relevant

### Changes Required:

#### 1. Inline Hints for Complex Fields
**File**: `src/components/InputPanel/index.jsx`

Add `hint` prop to ParamInput where needed:

```jsx
<ParamInput
  label="MAGI (2024)"
  value={params.magi2024}
  onChange={v => updateParam('magi2024', v)}
  hint="Modified AGI from your 2024 tax return. Affects Medicare premiums (IRMAA) in 2026."
  aria-describedby="magi-hint"
/>
```

Only add hints to fields where:
- The label contains jargon (MAGI, IRMAA, COLA)
- The impact isn't obvious (Cost Basis, Bracket Inflation)
- Users commonly make mistakes

#### 2. Learn More Expandables for Complex Concepts
**File**: `src/components/LearnMore/index.jsx` (new)

```jsx
export function LearnMore({ topic, children }) {
  const [expanded, setExpanded] = useState(false);

  const content = {
    'roth-conversion': {
      summary: 'Moving money from Traditional IRA to Roth IRA',
      detail: `A Roth conversion moves money from your tax-deferred IRA to a tax-free Roth IRA.
        You pay income tax on the conversion amount THIS year, but future growth and withdrawals
        are tax-free. This can be advantageous if you expect to be in a higher tax bracket later,
        or want to reduce Required Minimum Distributions.`,
      source: 'IRS Publication 590-A'
    },
    'present-value': {
      summary: "Amounts in today's dollars",
      detail: `Present Value (PV) converts future dollars to today's equivalent using a discount rate.
        $100,000 in 2045 isn't the same as $100,000 today due to inflation. PV helps you compare
        amounts across different years fairly. Toggle PV/FV in the header to switch views.`,
      source: null
    },
    // ... more topics
  };

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300"
        aria-expanded={expanded}
        aria-controls={`learn-more-${topic}`}
      >
        <HelpCircle className="w-3 h-3" aria-hidden="true" />
        {content[topic].summary}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div
          id={`learn-more-${topic}`}
          className="mt-2 p-2 bg-slate-800 rounded text-slate-300 text-xs leading-relaxed"
        >
          {content[topic].detail}
          {content[topic].source && (
            <p className="mt-2 text-slate-500 text-[10px]">
              Source: {content[topic].source}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

Usage in InputPanel:
```jsx
<InputSection title="Tax Strategies" ...>
  <LearnMore topic="roth-conversion" />
  {/* Roth conversion inputs */}
</InputSection>
```

#### 3. Educational Empty States with Positive Framing
**File**: Various components

When a section is empty, explain what it does AND frame it positively:

```jsx
// In Roth Conversions section when empty:
<div className="text-slate-500 text-xs p-3 bg-slate-800/50 rounded">
  <p className="font-medium text-slate-400 mb-1">
    <CheckCircle className="w-3 h-3 inline mr-1 text-green-500" aria-hidden="true" />
    No Roth Conversions Scheduled (That's OK!)
  </p>
  <p>Converting IRA money to Roth lets you pay taxes now at potentially lower rates,
     then enjoy tax-free growth and withdrawals later.</p>
  <p className="mt-2">
    <span className="text-blue-400">Opportunity:</span> Use the Optimize tab to discover
    if conversions could benefit your specific situation.
  </p>
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] LearnMore component renders and expands/collapses
- [x] ARIA attributes present and correct

#### Manual Verification:
- [x] Hints appear under complex fields without hover
- [x] "Learn more" sections provide genuinely useful explanations
- [x] Empty states explain AND guide to action with positive framing
- [x] No tooltip fatigue - help is available but not overwhelming

---

## Phase 4: Progress Indicator with Endowed Progress

### Overview
Show users how "complete" their plan is, starting at 20% to leverage the endowed progress effect (40% higher completion rates).

### Emotional Design Integration

- Start at 20% ("Getting Started" - already complete!) to create momentum
- Use "Next:" hint to guide, not shame
- Hide at 100% (don't nag complete users)
- Frame remaining items as "opportunities to refine" not "missing data"

### Changes Required:

#### 1. Profile Completeness Calculator
**File**: `src/lib/profileCompleteness.js` (new)

```javascript
/**
 * Calculate profile completeness for progress indicator
 * Uses endowed progress: starts at 20% ("Getting Started" complete)
 */
export function calculateCompleteness(params, settings) {
  const checks = [
    // Endowed (always complete) - creates psychological momentum
    { id: 'started', label: 'Getting Started', weight: 20, complete: true },

    // Essential
    { id: 'profile', label: 'Your Profile', weight: 15,
      complete: settings.primaryBirthYear && settings.primaryBirthYear > 1900 },
    { id: 'accounts', label: 'Starting Accounts', weight: 20,
      complete: (params.afterTaxStart + params.iraStart + params.rothStart) > 0 },
    { id: 'expenses', label: 'Annual Expenses', weight: 15,
      complete: params.annualExpenses > 0 },
    { id: 'income', label: 'Social Security', weight: 10,
      complete: params.socialSecurityMonthly > 0 },

    // Advanced (bonus)
    { id: 'conversions', label: 'Roth Strategy', weight: 10,
      complete: Object.keys(params.rothConversions || {}).length > 0 },
    { id: 'heirs', label: 'Heir Info', weight: 10,
      complete: (params.heirs || []).length > 0 },
  ];

  const completed = checks.filter(c => c.complete);
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const completedWeight = completed.reduce((sum, c) => sum + c.weight, 0);

  return {
    percentage: Math.round((completedWeight / totalWeight) * 100),
    completed: completed.map(c => c.id),
    remaining: checks.filter(c => !c.complete).map(c => ({ id: c.id, label: c.label })),
  };
}
```

#### 2. Progress Indicator Component
**File**: `src/components/ProfileProgress/index.jsx` (new)

```jsx
export function ProfileProgress({ params, settings }) {
  const { percentage, remaining } = calculateCompleteness(params, settings);

  if (percentage >= 100) return null; // Hide when complete

  return (
    <div className="px-2 py-1.5 border-b border-slate-800 bg-slate-900/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-400 text-xs">Plan completeness</span>
        <span className="text-blue-400 text-xs font-medium">{percentage}%</span>
      </div>
      <div
        className="h-1 bg-slate-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`Plan ${percentage}% complete`}
      >
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-1 text-slate-500 text-[10px]">
          Optional: Add {remaining[0].label} for more accuracy
        </div>
      )}
    </div>
  );
}
```

#### 3. Add to InputPanel
**File**: `src/components/InputPanel/index.jsx`

```jsx
<aside className="w-72 bg-slate-900 ...">
  <div className="p-2 border-b border-slate-700 ...">Model Inputs</div>
  <ProfileProgress params={params} settings={settings} />
  <div className="flex-1 overflow-y-auto">
    {/* sections */}
  </div>
</aside>
```

### Success Criteria:

#### Automated Verification:
- [x] Unit test: calculateCompleteness returns correct values
- [x] Empty params -> 20% (endowed progress)
- [x] Full params -> 100%

#### Manual Verification:
- [x] Progress bar visible at top of InputPanel
- [x] Updates in real-time as user fills in data
- [x] "Optional: Add..." hint guides without shaming
- [x] Disappears at 100% (doesn't nag complete users)

---

## Phase 5: Information Architecture Restructure

### Overview
Reorganize InputPanel sections from data-centric to goal-centric, reducing from 11 sections to 6 logical groups.

### Current (11 sections, data-centric)
1. Timeline
2. Profile & Life Events
3. Starting Accounts
4. Social Security
5. Expenses
6. Returns & Risk
7. Tax Strategies
8. Tax Parameters
9. Property Taxes
10. Calculation Options
11. Heirs

### Proposed (6 sections, goal-centric)

| New Section | Old Sections | Why |
|-------------|--------------|-----|
| **About You** | Timeline + Profile | "When does this apply to?" |
| **What You Have** | Starting Accounts | "What are we working with?" |
| **What You'll Receive** | Social Security | "What's coming in?" |
| **What You'll Spend** | Expenses + Property Taxes | "What's going out?" |
| **Your Strategy** | Tax Strategies + Returns + Calculation Options | "How should we optimize?" |
| **Your Legacy** | Heirs | "What happens after?" |

### Changes Required:

#### 1. Reorganize InputPanel Sections
**File**: `src/components/InputPanel/index.jsx`

Merge and rename sections. Move Tax Parameters into "Your Strategy" as an expandable advanced subsection.

#### 2. Update Default Expanded State
```javascript
// Only essential sections expanded by default
const [expanded, setExpanded] = useState(['about-you', 'what-you-have', 'what-youll-spend']);
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] E2E tests updated for new section names
- [x] All parameters still accessible

#### Manual Verification:
- [x] 6 sections feels less overwhelming than 11
- [x] Section names are self-explanatory
- [x] Power users can still find all settings

---

## Phase 6: AI as Concierge

### Overview
Transform AI Chat from passive assistant to proactive guide. The AI notices incomplete data and offers to help.

### Emotional Design Integration

- Suggested prompts frame questions positively ("Will my money last?" vs "Am I going to run out?")
- AI responses use encouraging language
- AI acknowledges uncertainty honestly (builds trust)

### Changes Required:

#### 1. Suggested Prompts in Empty Chat
**File**: `src/components/Chat/index.jsx`

```jsx
const SUGGESTED_PROMPTS = [
  {
    label: "What Roth strategy would work best for me?",
    icon: <Zap className="w-4 h-4" aria-hidden="true" />,
    category: 'optimize'
  },
  {
    label: "How many years of retirement am I funded for?",
    icon: <TrendingUp className="w-4 h-4" aria-hidden="true" />,
    category: 'project'
  },
  {
    label: "What are my opportunities to reduce taxes?",
    icon: <DollarSign className="w-4 h-4" aria-hidden="true" />,
    category: 'optimize'
  },
  {
    label: "Help me understand these projections",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    category: 'learn'
  },
];

// When chat is empty:
{messages.length === 0 && (
  <div className="p-4">
    <p className="text-slate-400 text-sm mb-3">I can help you explore your plan. Try asking:</p>
    <div className="flex flex-wrap gap-2" role="list">
      {SUGGESTED_PROMPTS.map(prompt => (
        <button
          key={prompt.label}
          onClick={() => sendMessage(prompt.label)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-full text-xs text-slate-300 hover:bg-slate-700"
          role="listitem"
        >
          {prompt.icon}
          {prompt.label}
        </button>
      ))}
    </div>
  </div>
)}
```

#### 2. Proactive Welcome Message
When chat opens for first time:

```javascript
const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `I'm here to help you understand and optimize your retirement plan.

Some things I can help with:
- **Find your optimal Roth conversion strategy** - I'll analyze hundreds of scenarios
- **Answer questions** about taxes, withdrawals, or any numbers you see
- **Create "what-if" scenarios** to compare different approaches
- **Explain the calculations** in plain English

All projections are estimates based on your inputs. I'll be transparent about assumptions and limitations.

What would you like to explore?`
};
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds

#### Manual Verification:
- [x] Empty chat shows clickable suggested prompts
- [x] Clicking prompt populates input field
- [x] Welcome message appears on first chat open
- [x] Prompts lead to useful AI responses
- [x] Language throughout is encouraging, not scary

---

## Phase 7: Streamlined Header

### Overview
Reduce header cognitive load by grouping actions and moving advanced toggles elsewhere.

### Current Header (too many items)
```
[Logo] [PV/FV] [Iterative Tax ON/OFF + iterations] [Summary Stats] [Save] [Load] [New] [Export]
```

### Proposed Header
```
[Logo] [Summary Stats] [PV/FV toggle] [File menu] [Settings gear]
```

Changes:
- **Iterative Tax** -> Move to Settings or Calculation Options (it's advanced)
- **Save/Load/New/Export** -> Combine into single "File" dropdown
- **Settings gear** -> Quick access to Settings tab

### Success Criteria:

#### Manual Verification:
- [ ] Header feels cleaner
- [ ] All actions still accessible
- [ ] Power users not slowed down

---

## Phase 8: Accessibility (WCAG 2.1 AA)

### Overview
Ensure the app is usable by people with disabilities, which also improves usability for everyone (curb-cut effect).

### Why This Matters
- 15-20% of users have some form of disability
- Screen reader users, keyboard-only users, colorblind users
- Accessibility improvements help all users (better keyboard nav, clearer labels)
- Legal compliance (ADA, Section 508)

### Key Areas:

#### 1. Screen Reader Compatibility for Data Tables
**File**: `src/components/ProjectionsTable/index.jsx`

```jsx
<table role="grid" aria-label="Retirement projections by year">
  <thead>
    <tr role="row">
      <th scope="col" role="columnheader">Year</th>
      <th scope="col" role="columnheader">Age</th>
      <th scope="col" role="columnheader" aria-label="After-tax account balance">After-Tax</th>
      {/* ... */}
    </tr>
  </thead>
  <tbody>
    {rows.map(row => (
      <tr key={row.year} role="row">
        <th scope="row">{row.year}</th>
        <td role="gridcell">{row.age}</td>
        <td role="gridcell" aria-label={`After-tax: ${formatCurrency(row.afterTax)}`}>
          {formatCurrency(row.afterTax)}
        </td>
        {/* ... */}
      </tr>
    ))}
  </tbody>
</table>
```

#### 2. Keyboard Navigation with Roving Tabindex
**File**: `src/components/InputPanel/index.jsx`

For forms with many inputs (50+), implement roving tabindex for efficient navigation:

```jsx
function InputSection({ children, sectionId }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputs = useRef([]);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(index + 1, inputs.current.length - 1);
      setFocusedIndex(next);
      inputs.current[next]?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(index - 1, 0);
      setFocusedIndex(prev);
      inputs.current[prev]?.focus();
    }
  };

  return (
    <div role="group" aria-labelledby={`${sectionId}-heading`}>
      {React.Children.map(children, (child, i) =>
        React.cloneElement(child, {
          ref: el => inputs.current[i] = el,
          tabIndex: focusedIndex === i ? 0 : -1,
          onKeyDown: e => handleKeyDown(e, i),
        })
      )}
    </div>
  );
}
```

#### 3. Color Alternatives (Beyond Red/Green)

Every color-coded element must have a non-color alternative:

```jsx
// Instead of just color:
<span className="text-red-500">-$15,000</span>

// Use color + icon + text:
<span className="text-red-500 flex items-center gap-1">
  <TrendingDown className="w-4 h-4" aria-hidden="true" />
  <span>-$15,000</span>
  <span className="sr-only">(decrease)</span>
</span>

// For status indicators:
<span className="flex items-center gap-1">
  <span className={`w-2 h-2 rounded-full ${isOnTrack ? 'bg-green-500' : 'bg-yellow-500'}`} aria-hidden="true" />
  <span>{isOnTrack ? 'On track' : 'Needs attention'}</span>
</span>
```

#### 4. ARIA Live Regions for Real-Time Updates
**File**: `src/components/SummaryStats/index.jsx`

```jsx
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {/* Screen reader announces when calculations update */}
  Projections updated. Net present value: {formatCurrency(npv)}.
  {yearsToDepletion ? `Funds last until age ${yearsToDepletion}` : 'Funds projected to last through planning period'}.
</div>
```

#### 5. Focus Management
**File**: Various components

```jsx
// When modal/panel opens, focus first interactive element
useEffect(() => {
  if (isOpen) {
    firstInputRef.current?.focus();
  }
}, [isOpen]);

// Trap focus within modal
// Return focus to trigger when modal closes
```

#### 6. Skip Links
**File**: `src/App.jsx`

```jsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-blue-600 focus:px-4 focus:py-2">
  Skip to main content
</a>
<a href="#input-panel" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-blue-600 focus:px-4 focus:py-2">
  Skip to inputs
</a>
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] Run axe-core or similar accessibility checker: 0 critical issues
- [ ] All interactive elements have accessible names
- [ ] Color contrast ratios meet WCAG AA (4.5:1 for text)

#### Manual Verification:
- [ ] Navigate entire app using only keyboard (Tab, Enter, Arrow keys, Escape)
- [ ] Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] Verify all information is conveyed without relying on color alone
- [ ] Screen reader announces calculation updates

---

## Phase 9: Error Handling & Forgiveness

### Overview
Users fear making mistakes with financial data. Build confidence through robust undo, auto-save, and gentle validation.

### Why This Matters
- Fear of mistakes prevents exploration
- "What if I mess up my plan?" is a real user concern
- Forgiveness enables experimentation, which leads to learning

### Key Patterns:

#### 1. Undo/Redo with State History Stack
**File**: `src/hooks/useUndoRedo.js` (new)

```javascript
export function useUndoRedo(initialState, maxHistory = 50) {
  const [history, setHistory] = useState([initialState]);
  const [pointer, setPointer] = useState(0);

  const current = history[pointer];

  const pushState = useCallback((newState) => {
    // Trim future states if we're not at the end
    const newHistory = history.slice(0, pointer + 1);
    newHistory.push(newState);

    // Limit history size
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setPointer(newHistory.length - 1);
  }, [history, pointer, maxHistory]);

  const undo = useCallback(() => {
    if (pointer > 0) {
      setPointer(p => p - 1);
    }
  }, [pointer]);

  const redo = useCallback(() => {
    if (pointer < history.length - 1) {
      setPointer(p => p + 1);
    }
  }, [pointer, history.length]);

  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  return { current, pushState, undo, redo, canUndo, canRedo };
}
```

#### 2. Undo/Redo UI
**File**: `src/components/Header/index.jsx`

```jsx
<div className="flex items-center gap-1">
  <button
    onClick={undo}
    disabled={!canUndo}
    className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30"
    aria-label="Undo last change"
    title="Undo (Ctrl+Z)"
  >
    <Undo2 className="w-4 h-4" />
  </button>
  <button
    onClick={redo}
    disabled={!canRedo}
    className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30"
    aria-label="Redo"
    title="Redo (Ctrl+Shift+Z)"
  >
    <Redo2 className="w-4 h-4" />
  </button>
</div>

// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, redo]);
```

#### 3. Auto-Save with Version History
**File**: `src/hooks/useAutoSave.js` (new)

```javascript
// Already have localStorage - enhance with version history
export function useAutoSave(state, key = 'retirement-planner') {
  useEffect(() => {
    const saveData = {
      state,
      savedAt: new Date().toISOString(),
      version: 1,
    };

    // Save current state
    localStorage.setItem(key, JSON.stringify(saveData));

    // Maintain last 5 versions
    const versions = JSON.parse(localStorage.getItem(`${key}-versions`) || '[]');
    versions.unshift(saveData);
    if (versions.length > 5) versions.pop();
    localStorage.setItem(`${key}-versions`, JSON.stringify(versions));
  }, [state, key]);
}

// Recovery function
export function getVersionHistory(key = 'retirement-planner') {
  return JSON.parse(localStorage.getItem(`${key}-versions`) || '[]');
}
```

#### 4. Input Validation: "Reward Early, Punish Late"
**File**: `src/components/ParamInput/index.jsx`

```jsx
// Validate on blur, not on every keystroke
// Show success state for valid inputs
// Only show errors when user leaves field

const [touched, setTouched] = useState(false);
const [valid, setValid] = useState(true);

const validate = (value) => {
  if (min !== undefined && value < min) return `Minimum is ${min}`;
  if (max !== undefined && value > max) return `Maximum is ${max}`;
  if (required && !value) return 'This field is recommended';
  return null;
};

const error = touched ? validate(value) : null;

return (
  <div>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={() => setTouched(true)}
      className={`... ${error ? 'border-yellow-500' : touched && !error ? 'border-green-500/50' : ''}`}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
    />
    {error && (
      <p id={`${id}-error`} className="text-yellow-400 text-xs mt-1" role="alert">
        {error}
      </p>
    )}
  </div>
);
```

#### 5. Conflict Warnings for Impossible Combinations
**File**: `src/lib/validateParams.js` (new)

```javascript
export function detectConflicts(params, settings) {
  const conflicts = [];

  // Death year before birth year
  if (params.survivorDeathYear && settings.primaryBirthYear &&
      params.survivorDeathYear < settings.primaryBirthYear + 50) {
    conflicts.push({
      severity: 'warning',
      message: 'Survivor death year seems early. Did you mean a different year?',
      fields: ['survivorDeathYear'],
    });
  }

  // Expenses > Income + Withdrawals capacity
  // ... more conflict checks

  return conflicts;
}
```

#### 6. "Reset to Sample" Always Visible
**File**: `src/components/InputPanel/index.jsx`

```jsx
<button
  onClick={() => {
    if (confirm('Reset all inputs to sample data? Your current plan will be saved in version history.')) {
      resetToSample();
    }
  }}
  className="text-slate-500 text-xs hover:text-slate-400 flex items-center gap-1"
>
  <RefreshCw className="w-3 h-3" />
  Reset to sample
</button>
```

#### 7. Unsaved Changes Warning
**File**: `src/App.jsx`

```javascript
useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] Unit tests for undo/redo stack
- [ ] Unit tests for conflict detection

#### Manual Verification:
- [ ] Ctrl+Z undoes last change
- [ ] Ctrl+Shift+Z redoes
- [ ] Version history accessible
- [ ] Validation errors appear on blur, not keystroke
- [ ] "Reset to sample" works and preserves history
- [ ] Browser warns before closing with unsaved changes

---

## Phase 10: Mobile Considerations

### Overview
While this is a complex desktop-first app, many users will access it on mobile for checking/reviewing. Optimize the mobile experience for common tasks.

### Mobile Usage Patterns

Based on competitive analysis (ProjectionLab, Boldin):
- Users primarily do initial data entry on desktop
- Mobile used for: checking projections, making quick adjustments, showing spouse/advisor
- Full editing less common on mobile, but should still work

### Key Patterns:

#### 1. Bottom Sheet Pattern for Section Editing
**File**: `src/components/MobileBottomSheet/index.jsx` (new)

```jsx
export function MobileBottomSheet({ isOpen, onClose, title, children }) {
  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${isOpen ? '' : 'pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-xl transform transition-transform ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '85vh' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-700">
          <h2 id="sheet-title" className="text-lg font-medium">{title}</h2>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 60px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
```

#### 2. Touch-Friendly Number Inputs
**File**: `src/components/ParamInput/index.jsx`

```jsx
// Larger tap targets on mobile
<input
  type="number"
  inputMode="numeric" // Shows numeric keyboard on mobile
  pattern="[0-9]*" // iOS numeric keyboard
  className="... min-h-[44px] text-base" // 44px is Apple's minimum tap target
/>

// Consider stepper controls for common adjustments
<div className="flex items-center">
  <button
    onClick={() => onChange(value - step)}
    className="w-10 h-10 flex items-center justify-center"
    aria-label={`Decrease by ${step}`}
  >
    <Minus className="w-4 h-4" />
  </button>
  <input ... />
  <button
    onClick={() => onChange(value + step)}
    className="w-10 h-10 flex items-center justify-center"
    aria-label={`Increase by ${step}`}
  >
    <Plus className="w-4 h-4" />
  </button>
</div>
```

#### 3. Simplified Mobile Navigation
**File**: `src/components/MobileNav/index.jsx` (new)

```jsx
// Bottom tab bar for mobile
export function MobileNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'dashboard', icon: <BarChart3 />, label: 'Dashboard' },
    { id: 'inputs', icon: <Sliders />, label: 'Inputs' },
    { id: 'projections', icon: <Table />, label: 'Table' },
    { id: 'chat', icon: <MessageCircle />, label: 'AI Help' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 md:hidden safe-area-bottom"
      role="tablist"
    >
      <div className="flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 ${
              activeTab === tab.id ? 'text-blue-400' : 'text-slate-500'
            }`}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {React.cloneElement(tab.icon, { className: 'w-5 h-5' })}
            <span className="text-xs mt-1">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
```

#### 4. Responsive Charts
**File**: `src/components/Charts/index.jsx`

```jsx
// Use responsive container
<ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
  <LineChart data={data}>
    {/* Fewer data points on mobile for performance */}
    {/* Larger touch targets for interactive elements */}
    {/* Simplified legends */}
  </LineChart>
</ResponsiveContainer>

// Consider horizontal scroll for data tables on mobile
<div className="overflow-x-auto -mx-4 px-4">
  <table className="min-w-[600px]">
    ...
  </table>
</div>
```

#### 5. Mobile-First Initial Data Entry
**File**: `src/components/PersonalizationPanel/index.jsx`

The 3-step personalization panel already works well on mobile. Enhancements:

```jsx
// Full-screen on mobile
<div className={`
  fixed z-50
  md:bottom-4 md:right-4 md:w-80
  inset-0 md:inset-auto
  bg-slate-800 md:rounded-lg
`}>
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] E2E tests pass on mobile viewport (375px)

#### Manual Verification:
- [ ] Test on actual mobile device (not just DevTools)
- [ ] All tap targets are at least 44x44px
- [ ] Forms are usable with mobile keyboard
- [ ] Charts are readable on small screens
- [ ] Navigation is thumb-friendly

---

## Implementation Priority (Revised for v3)

| Phase | Impact | Effort | Priority | Rationale |
|-------|--------|--------|----------|-----------|
| **Phase 1: Sample Data First** | Very High | Medium | 1 | Immediate aha moment - foundation for everything |
| **Phase 9: Error Forgiveness** | High | Medium | 2 | Removes fear, enables exploration |
| **Phase 4: Progress Indicator** | High | Low | 3 | Guides completion with momentum |
| **Phase 2: 3-Step Personalization** | High | Medium | 4 | Converts sample -> personal |
| **Phase 8: Accessibility** | High | High | 5 | Expands audience, legal compliance |
| **Phase 6: AI Prompts** | Medium | Low | 6 | Low effort, high value |
| **Phase 3: Contextual Help** | Medium | Medium | 7 | Reduces jargon barrier |
| **Phase 10: Mobile** | Medium | High | 8 | Many users, but complex to do well |
| **Phase 5: IA Restructure** | Medium | High | 9 | Big change, do after other improvements |
| **Phase 7: Header Cleanup** | Low | Low | 10 | Polish |

### Priority Rationale Changes from v2

- **Error Forgiveness moved up** (was implicit): Fear of mistakes is a major barrier. Undo/redo provides psychological safety.
- **Accessibility added high**: Affects 15-20% of users AND improves experience for everyone.
- **Mobile added**: Many users will access on mobile; can't ignore.

---

## Metrics to Track

| Metric | Current (Est.) | Target | How to Measure |
|--------|---------------|--------|----------------|
| Time to first projection | > 5 min | < 30 sec | Sample data -> instant |
| Profile completion rate | ~20% | > 60% | localStorage check |
| Return rate (Day 1) | Unknown | > 40% | Session analytics |
| Optimization usage | ~10% | > 30% | Tab visit tracking |
| Undo usage | N/A | Tracked | Feature event |
| Mobile session completion | Unknown | > 50% | Device + completion |
| Accessibility audit score | Unknown | 95+ | axe-core |

---

## Analytics Implementation (Privacy-First)

### Principles
- **No third-party tracking**: No Google Analytics, no Mixpanel, no cookies
- **Local-first**: Store anonymized events in localStorage, aggregate on-device
- **Optional server sync**: Users can opt-in to share anonymized data

### Event Schema

```javascript
// Track events locally
const trackEvent = (eventName, properties = {}) => {
  const events = JSON.parse(localStorage.getItem('rp-analytics') || '[]');
  events.push({
    event: eventName,
    props: properties,
    ts: Date.now(),
    session: getSessionId(), // Random ID per session
  });
  // Keep last 1000 events
  if (events.length > 1000) events.shift();
  localStorage.setItem('rp-analytics', JSON.stringify(events));
};

// Key events to track
const TRACKED_EVENTS = {
  // Aha moment funnel
  'sample_data_viewed': {}, // First visit
  'input_changed': { field: string }, // Any input modified
  'personalization_started': {},
  'personalization_completed': {},
  'projection_viewed': { tab: string },

  // Feature adoption
  'optimization_used': { type: string },
  'scenario_created': {},
  'ai_chat_opened': {},
  'ai_prompt_used': { prompt: string },

  // Error/Recovery
  'undo_used': {},
  'reset_to_sample': {},
  'validation_error': { field: string },

  // Engagement
  'session_duration': { seconds: number },
  'tabs_visited': { tabs: string[] },
};
```

### Funnel Analysis

```javascript
// Calculate aha moment funnel on-device
function calculateFunnel() {
  const events = JSON.parse(localStorage.getItem('rp-analytics') || '[]');

  return {
    viewed_sample: events.some(e => e.event === 'sample_data_viewed'),
    modified_input: events.some(e => e.event === 'input_changed'),
    completed_personalization: events.some(e => e.event === 'personalization_completed'),
    viewed_projection: events.some(e => e.event === 'projection_viewed'),
    used_optimization: events.some(e => e.event === 'optimization_used'),
  };
}
```

---

## Testing Strategy

### Unit Tests
- `calculateCompleteness()` returns correct values
- `deriveParams()` produces valid params from 3 inputs
- Sample data produces valid projections
- Undo/redo stack works correctly
- Conflict detection identifies impossible combinations

### E2E Tests
- Fresh visit -> sample data -> Dashboard with charts
- Personalization flow -> projections update
- Progress indicator updates as data added
- AI suggested prompts are clickable
- Undo/redo via keyboard shortcuts
- Mobile viewport: bottom nav visible, sheets work

### Accessibility Testing
1. **Automated**: axe-core integration in E2E tests
2. **Keyboard**: Complete all tasks using only keyboard
3. **Screen reader**: Test with VoiceOver/NVDA
4. **Color**: Verify with colorblindness simulator

### Manual Testing
1. **Incognito window test**: Clear all data, verify full new-user flow
2. **3-minute test**: Can a new user get personalized projections in 3 minutes?
3. **Jargon audit**: Have someone unfamiliar with finance use the app, note confusion points
4. **Power user test**: Verify existing users aren't slowed down
5. **Mobile test**: Use app on actual phone, note friction points
6. **Anxiety audit**: Read all user-facing text; flag scary/negative language

---

## Migration Notes

- No breaking changes to data structure
- New localStorage keys:
  - `retirement-planner-visited` (boolean)
  - `retirement-planner-chat-welcomed` (boolean)
  - `retirement-planner-versions` (array of saved states)
  - `rp-analytics` (anonymized events)
- Existing saved states continue to work
- Users with existing data skip sample data entirely

---

## Key Differences: v2 -> v3

| v2 | v3 | Why |
|----|-----|-----|
| 7 phases | 10 phases | Added accessibility, error forgiveness, mobile |
| Implicit emotional design | Explicit language guidelines | Reduces financial anxiety |
| Red/green status colors | Color + icon + text | Accessibility requirement |
| No undo/redo | Full undo/redo stack | Enables fearless exploration |
| Desktop-focused | Mobile-considered | Many users access on mobile |
| No analytics | Privacy-first analytics | Measure aha moment funnel |
| Generic references | Competitive insights added | Learn from Fidelity, Boldin, etc. |

---

## Competitive Insights

| Tool | Strength | Apply To Our App |
|------|----------|------------------|
| **Fidelity Retirement Score** | Single number (0-150) + actionable steps | Consider a "Retirement Readiness Score" in Dashboard |
| **Boldin** | Side-by-side scenario comparison | Already have this; ensure it's discoverable |
| **Vanguard** | Monte Carlo explanations in plain English | Improve our stochastic mode explanations |
| **ProjectionLab** | Notion-like flexibility + good mobile | Inspiration for mobile bottom sheets |
| **Betterment** | Emotional design, positive framing | Apply throughout our app |

---

## References

### Research & Guidelines
- Wealthfront Path Tool UX: https://goodux.appcues.com/blog/wealthfront-personalized-ux-copy
- Nielsen Norman Group - Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Nielsen Norman Group - Tutorials vs Contextual Help: https://www.nngroup.com/articles/onboarding-tutorials/
- Userpilot - Aha Moment Guide: https://userpilot.com/blog/aha-moment/
- Chameleon - Why Tooltips Are Terrible: https://www.chameleon.io/blog/why-tooltips-are-terrible
- UXCam - Fintech Onboarding KPIs: https://uxcam.com/blog/measure-fintech-app-onboarding-kpis/

### Accessibility
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- WebAIM Color Contrast Checker: https://webaim.org/resources/contrastchecker/
- Inclusive Components: https://inclusive-components.design/
- A11y Project Checklist: https://www.a11yproject.com/checklist/

### Emotional Design
- Don Norman - Emotional Design: https://www.nngroup.com/articles/emotional-design/
- Designing for Financial Wellbeing: https://www.finmentalhealth.org/designing-for-financial-wellbeing

### Mobile UX
- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Material Design Bottom Sheets: https://m3.material.io/components/bottom-sheets/overview

### Competitive Tools
- Fidelity Retirement Score: https://www.fidelity.com/retirement-planning/retirement-score
- Boldin (formerly NewRetirement): https://www.boldin.com/
- ProjectionLab: https://projectionlab.com/
- Vanguard Retirement Nest Egg Calculator: https://retirementplans.vanguard.com/VGApp/pe/pubeducation/calculators/RetirementNestEggCalc.jsf
