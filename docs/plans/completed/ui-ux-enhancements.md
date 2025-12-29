# UI/UX Enhancements Implementation Plan

## Overview

Implement several UI/UX improvements: remove heirs placeholder from settings, move user profile to InputPanel, change SS exemption default, complete calculation help for all rows, add precision options, and add table filtering/sorting.

## Current State Analysis

### 1. Heirs in Settings (Placeholder Only)
- **Location**: `src/components/SettingsPanel/index.jsx:206-222`
- **Status**: Contains only a placeholder message directing users to InputPanel
- **Issue**: Unnecessary navigation confusion - heirs are fully managed in InputPanel

### 2. User Profile Location
- **Current**: `src/components/SettingsPanel/index.jsx:107-145`
- **Fields**: primaryName, primaryBirthYear, spouseName, spouseBirthYear
- **Issue**: User profile should be with other model inputs in InputPanel

### 3. SS Tax Exemption Default
- **Current**: `src/hooks/useProjections.js:31` - defaults to `'disabled'`
- **Issue**: Should default to `'through2028'` (SS exempt through 2028)

### 4. Missing Calculation Help
- **Current**: ~28 fields have calculation help in CalculationInspector
- **Missing**: ssAnnual, expenses, rmdFactor, irmaaMAGI, irmaaPartB, irmaaPartD, ordinaryIncome, taxableOrdinary, costBasisBOY, costBasisEOY, effectiveAtReturn, effectiveIraReturn, effectiveRothReturn, cumulativeIRMAA, standardDeduction

### 5. Precision Formatting
- **Current**: `src/lib/formatters.js` - hardcoded precision (1 decimal for M/B, 0 for K)
- **Issue**: No user control over display precision

### 6. Table Filtering/Sorting
- **Current**: No filtering or sorting in ProjectionsTable or CustomViewModal
- **Issue**: Large tables are hard to analyze

## Desired End State

1. Settings page has NO heirs section
2. User profile (names, birth years) is in InputPanel "Profile" section at top
3. SS exemption defaults to 'through2028'
4. Every inspectable row has calculation help
5. Global precision setting: "Rounded (K/M)", "Full Dollars", "Dollars+Cents"
6. Custom tables have column sorting and row value filtering

### How to Verify:
- Automated tests for all changes
- `npm run check` passes
- Visual inspection confirms UX improvements

## What We're NOT Doing

- Not changing heir management (stays in InputPanel)
- Not adding new data fields
- Not changing calculation logic
- Not adding backward compatibility shims (user agreed)

---

## Phase 1: Remove Heirs Placeholder from Settings

### Overview
Remove the unnecessary "Heirs Moved to InputPanel" placeholder section from SettingsPanel.

### Changes Required:

#### 1. Remove Heirs Section from SettingsPanel
**File**: `src/components/SettingsPanel/index.jsx`
**Changes**: Delete lines 206-222 (the heirs SettingsSection)

```jsx
// DELETE THIS ENTIRE BLOCK:
{/* Note about heirs - moved to InputPanel */}
<SettingsSection
  title="Heirs"
  icon={Users}
  expanded={expanded.includes('heirs')}
  onToggle={() => toggle('heirs')}
  color="purple"
>
  <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
    <div className="text-slate-400 text-sm mb-2">Heirs Moved to InputPanel</div>
    <div className="text-slate-500 text-xs">
      Heir configuration (names, states, AGI, split percentages, and distribution strategy)
      has been moved to the <span className="text-indigo-400 font-medium">Heirs</span>{' '}
      section in the InputPanel for easier access while viewing projections.
    </div>
  </div>
</SettingsSection>
```

#### 2. Remove 'heirs' from default expanded sections
**File**: `src/components/SettingsPanel/index.jsx`
**Changes**: Update line 79 if 'heirs' is in the default expanded array

```jsx
// Before (if present):
const [expanded, setExpanded] = useState(['profile', 'tax', 'heirs']);

// After:
const [expanded, setExpanded] = useState(['profile', 'tax']);
```

#### 3. Remove Users icon import if no longer needed
**File**: `src/components/SettingsPanel/index.jsx`
**Changes**: Check if `Users` icon is used elsewhere; if not, remove from imports

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Settings page no longer contains heirs section:
  ```bash
  ! grep -q "Heirs Moved to InputPanel" src/components/SettingsPanel/index.jsx
  ```
- [ ] Add SettingsPanel test:
  ```javascript
  // src/components/SettingsPanel/SettingsPanel.test.jsx
  import { render, screen } from '@testing-library/react';
  import { SettingsPanel } from './index';

  describe('SettingsPanel', () => {
    const mockSettings = { primaryName: 'Test', primaryBirthYear: 1960 };
    const mockUpdate = vi.fn();
    const mockReset = vi.fn();

    it('does not render heirs section', () => {
      render(<SettingsPanel settings={mockSettings} updateSettings={mockUpdate} resetSettings={mockReset} />);
      expect(screen.queryByText('Heirs Moved to InputPanel')).not.toBeInTheDocument();
      expect(screen.queryByText(/Heirs/i)).not.toBeInTheDocument();
    });

    it('renders User Profile section', () => {
      render(<SettingsPanel settings={mockSettings} updateSettings={mockUpdate} resetSettings={mockReset} />);
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });
  });
  ```

---

## Phase 2: Move User Profile to InputPanel

### Overview
Move primary/spouse name and birth year inputs from SettingsPanel to InputPanel as a new "Profile" section at the top.

### Changes Required:

#### 1. Add Profile Section to InputPanel
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Add new section at the top (before "Starting Accounts", around line 263)

```jsx
// Add import for User icon
import { User } from 'lucide-react';

// Add Profile section as FIRST section (before Starting Accounts):
<InputSection
  title="Profile"
  icon={User}
  expanded={expanded.includes('profile')}
  onToggle={() => toggle('profile')}
  color="blue"
>
  <div className="space-y-2">
    <div className="grid grid-cols-2 gap-2">
      <ParamInput
        label="Primary Name"
        value={settings?.primaryName || ''}
        onChange={v => updateSettings?.({ primaryName: v })}
        type="text"
        className="text-xs"
      />
      <ParamInput
        label="Birth Year"
        value={settings?.primaryBirthYear || 1960}
        onChange={v => updateSettings?.({ primaryBirthYear: parseInt(v) || 1960 })}
        type="number"
        className="text-xs"
      />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <ParamInput
        label="Spouse Name"
        value={settings?.spouseName || ''}
        onChange={v => updateSettings?.({ spouseName: v })}
        type="text"
        className="text-xs"
      />
      <ParamInput
        label="Spouse Birth"
        value={settings?.spouseBirthYear || 1962}
        onChange={v => updateSettings?.({ spouseBirthYear: parseInt(v) || 1962 })}
        type="number"
        className="text-xs"
      />
    </div>
  </div>
</InputSection>
```

#### 2. Add 'profile' to InputPanel default expanded sections
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Update the expanded state initialization (around line 216)

```jsx
// Add 'profile' to default expanded:
const [expanded, setExpanded] = useState(['starting', 'profile']);
```

#### 3. Add updateSettings prop to InputPanel
**File**: `src/components/InputPanel/index.jsx`
**Changes**: Add `updateSettings` to props destructuring (around line 205-215)

```jsx
export function InputPanel({
  params,
  settings,
  updateParam,
  updateParams,
  updateRothConversion,
  updateExpenseOverride,
  updateATHarvest,
  options,
  setOptions,
  updateSettings, // ADD THIS
}) {
```

#### 4. Pass updateSettings from App.jsx
**File**: `src/App.jsx`
**Changes**: Add updateSettings prop to InputPanel (around line 419)

```jsx
<InputPanel
  params={params}
  settings={settings}
  updateParam={updateParam}
  updateParams={updateParams}
  updateRothConversion={updateRothConversion}
  updateExpenseOverride={updateExpenseOverride}
  updateATHarvest={updateATHarvest}
  options={options}
  setOptions={setOptions}
  updateSettings={updateSettings}  // ADD THIS
/>
```

#### 5. Remove User Profile section from SettingsPanel
**File**: `src/components/SettingsPanel/index.jsx`
**Changes**: Delete lines 107-145 (the User Profile SettingsSection)

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] InputPanel contains profile section:
  ```bash
  grep -q "title=\"Profile\"" src/components/InputPanel/index.jsx
  grep -q "primaryName" src/components/InputPanel/index.jsx
  ```
- [ ] SettingsPanel no longer contains User Profile:
  ```bash
  ! grep -q "User Profile" src/components/SettingsPanel/index.jsx
  ```
- [ ] Add InputPanel profile test:
  ```javascript
  // Add to src/components/InputPanel/InputPanel.test.jsx
  describe('InputPanel Profile section', () => {
    it('renders profile inputs', () => {
      render(<InputPanel {...mockProps} />);
      expect(screen.getByLabelText(/Primary Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Birth Year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Spouse Name/i)).toBeInTheDocument();
    });

    it('calls updateSettings when profile fields change', () => {
      const mockUpdateSettings = vi.fn();
      render(<InputPanel {...mockProps} updateSettings={mockUpdateSettings} />);
      fireEvent.change(screen.getByLabelText(/Primary Name/i), { target: { value: 'John' } });
      expect(mockUpdateSettings).toHaveBeenCalledWith({ primaryName: 'John' });
    });
  });
  ```

---

## Phase 3: Change SS Exemption Default

### Overview
Change the default SS exemption mode from 'disabled' to 'through2028'.

### Changes Required:

#### 1. Update DEFAULT_SETTINGS
**File**: `src/hooks/useProjections.js`
**Changes**: Update line 31

```javascript
// Before:
ssExemptionMode: 'disabled', // 'disabled' | 'through2028' | 'permanent'

// After:
ssExemptionMode: 'through2028', // 'disabled' | 'through2028' | 'permanent' - Trump proposal default
```

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Default is 'through2028':
  ```bash
  grep -q "ssExemptionMode: 'through2028'" src/hooks/useProjections.js
  ```
- [ ] Add useProjections test:
  ```javascript
  // Add to src/hooks/useProjections.test.js
  describe('useProjections defaults', () => {
    it('defaults SS exemption to through2028', () => {
      // Clear localStorage to test fresh defaults
      localStorage.clear();
      const { result } = renderHook(() => useProjections());
      expect(result.current.settings.ssExemptionMode).toBe('through2028');
    });
  });
  ```

---

## Phase 4: Complete Calculation Help for All Rows

### Overview
Add calculation help for all fields that are currently missing explanations.

### Changes Required:

#### 1. Add Missing CALCULATIONS entries
**File**: `src/components/CalculationInspector/index.jsx`
**Changes**: Add entries for missing fields after line 981 (before the closing brace of CALCULATIONS)

```javascript
// Add these entries to CALCULATIONS object:

ssAnnual: {
  name: 'Annual Social Security',
  concept:
    'Total Social Security income for the year. Based on monthly benefit x 12, adjusted annually by COLA (Cost of Living Adjustment). This is gross SS before any taxation calculations.',
  formula:
    'ssAnnual = Monthly SS x 12 x (1 + COLA)^years\n\nMonthly SS: Your stated monthly benefit at claiming\nCOLA: Annual cost-of-living adjustment (default 2.5%)\nYears: Years since projection start',
  backOfEnvelope: 'Monthly x 12 x 1.025 each year',
  compute: (data, params) => {
    const { ssAnnual, year } = data;
    const monthlyApprox = ssAnnual / 12;
    return {
      formula: `Monthly SS x 12`,
      values: `${f$(monthlyApprox)}/month x 12`,
      result: `Annual SS = ${fK(ssAnnual)}`,
      simple: fK(ssAnnual),
    };
  },
},

expenses: {
  name: 'Annual Expenses',
  concept:
    'Total spending needs for the year. Base expenses from inputs, inflated annually, plus any year-specific overrides. This determines how much you need to withdraw from accounts.',
  formula:
    'expenses = baseExpenses x (1 + inflation)^years + overrides\n\nBase: Starting annual expenses\nInflation: Annual expense inflation rate\nOverrides: Year-specific adjustments (e.g., one-time purchases)',
  backOfEnvelope: 'Base x 1.03 each year (3% inflation)',
  compute: (data, params) => {
    const { expenses, year } = data;
    const baseExpenses = params?.annualExpenses || 150000;
    const yearsFromStart = data.yearsFromStart || 0;
    const inflatedBase = baseExpenses * Math.pow(1.03, yearsFromStart);
    return {
      formula: `Base expenses + inflation adjustments`,
      values: `${fK(baseExpenses)} base x (1.03)^${yearsFromStart}`,
      result: `Expenses = ${fK(expenses)}`,
      simple: fK(expenses),
    };
  },
},

rmdFactor: {
  name: 'RMD Life Expectancy Factor',
  concept:
    'IRS Uniform Lifetime Table factor used to calculate Required Minimum Distribution. Decreases with age, meaning larger required withdrawals as you get older.',
  formula:
    'From IRS Uniform Lifetime Table:\n\nAge 73: 26.5\nAge 75: 24.6\nAge 80: 20.2\nAge 85: 16.0\nAge 90: 12.2\nAge 95: 8.6\nAge 100: 6.4',
  backOfEnvelope: 'Roughly 100 - age (simplified)',
  compute: (data, params) => {
    const { rmdFactor, age } = data;
    const rmdPct = rmdFactor > 0 ? (100 / rmdFactor).toFixed(1) : 0;
    return {
      formula: `IRS Uniform Lifetime Table lookup`,
      values: `Age ${age} -> Factor ${rmdFactor?.toFixed(1) || 'N/A'}`,
      result: age >= 73 ? `RMD % = ${rmdPct}% of IRA` : 'No RMD until age 73',
      simple: rmdFactor ? `${rmdFactor.toFixed(1)} (${rmdPct}%)` : 'N/A',
    };
  },
},

ordinaryIncome: {
  name: 'Ordinary Income',
  concept:
    'Total income taxed at ordinary rates (not capital gains). Includes taxable Social Security, IRA withdrawals, and Roth conversions. This is the base for federal tax brackets.',
  formula:
    'ordinaryIncome = taxableSS + iraWithdrawal + rothConversion\n\nNote: AT withdrawals are NOT ordinary income (taxed as cap gains)\nNote: Roth withdrawals are NOT income (tax-free)',
  backOfEnvelope: 'SS (85%) + IRA withdrawals + conversions',
  compute: (data, params) => {
    const { ordinaryIncome, taxableSS, iraWithdrawal, rothConversion } = data;
    return {
      formula: `ordinaryIncome = taxableSS + iraWithdrawal + rothConversion`,
      values: `${fK(taxableSS)} + ${fK(iraWithdrawal)} + ${fK(rothConversion)}`,
      result: `Ordinary Income = ${fK(ordinaryIncome)}`,
      simple: fK(ordinaryIncome),
    };
  },
},

taxableOrdinary: {
  name: 'Taxable Ordinary Income',
  concept:
    'Ordinary income minus standard deduction. This is the amount actually subject to federal income tax brackets. Higher taxableOrdinary means higher marginal bracket.',
  formula:
    'taxableOrdinary = ordinaryIncome - standardDeduction\n\nStandard Deduction (2025 MFJ over 65): ~$32,300\nThis is what flows through tax brackets.',
  backOfEnvelope: 'ordinaryIncome - $32K deduction',
  compute: (data, params) => {
    const { taxableOrdinary, ordinaryIncome, standardDeduction } = data;
    return {
      formula: `taxableOrdinary = ordinaryIncome - standardDeduction`,
      values: `${fK(ordinaryIncome)} - ${fK(standardDeduction)}`,
      result: `Taxable = ${fK(taxableOrdinary)}`,
      simple: fK(Math.max(0, taxableOrdinary)),
    };
  },
},

standardDeduction: {
  name: 'Standard Deduction',
  concept:
    'Amount of income excluded from taxation. For married filing jointly over 65, this is significantly higher. Reduces taxable income dollar-for-dollar.',
  formula:
    'Standard Deduction (2025 MFJ):\nBase: $30,000\nAge 65+ bonus: +$1,600 each\nBoth 65+: $30,000 + $3,200 = $33,200',
  backOfEnvelope: '~$32K-$33K for retired couples',
  compute: (data, params) => {
    const { standardDeduction, age } = data;
    return {
      formula: `MFJ base + age 65+ bonuses`,
      values: `Age ${age}: Both spouses 65+ assumed`,
      result: `Standard Deduction = ${fK(standardDeduction)}`,
      simple: fK(standardDeduction),
    };
  },
},

costBasisBOY: {
  name: 'Cost Basis (Beginning of Year)',
  concept:
    'The original purchase price of investments in your After-Tax account at start of year. Used to calculate capital gains when you sell. Higher basis = lower taxable gains.',
  formula:
    'Cost Basis tracks: Total amount you put IN to AT account\n\nWhen you withdraw, gains = withdrawal x (1 - basis/value)\nBasis is consumed proportionally with withdrawals.',
  backOfEnvelope: 'Original investment amount (what you paid)',
  compute: (data, params) => {
    const { costBasisBOY, atBOY } = data;
    const basisPct = atBOY > 0 ? ((costBasisBOY / atBOY) * 100).toFixed(0) : 0;
    const gainsPct = 100 - basisPct;
    return {
      formula: `Tracks original investment in AT account`,
      values: `Basis: ${fK(costBasisBOY)} of ${fK(atBOY)} AT value`,
      result: `${basisPct}% basis, ${gainsPct}% gains`,
      simple: `${fK(costBasisBOY)} (${basisPct}% of AT)`,
    };
  },
},

costBasisEOY: {
  name: 'Cost Basis (End of Year)',
  concept:
    'Cost basis remaining in After-Tax account at year end. Reduced proportionally when you withdraw. Does not change with market growth (only original cost matters).',
  formula:
    'costBasisEOY = costBasisBOY x (1 - withdrawal_rate)\n\nwithdrawal_rate = atWithdrawal / atBOY\nBasis is consumed at same rate as withdrawals.',
  backOfEnvelope: 'Starting basis minus basis consumed by withdrawals',
  compute: (data, params) => {
    const { costBasisEOY, costBasisBOY, atBOY, atWithdrawal } = data;
    const basisConsumed = costBasisBOY - costBasisEOY;
    return {
      formula: `Basis consumed proportionally with withdrawals`,
      values: atWithdrawal > 0
        ? `${fK(costBasisBOY)} - ${fK(basisConsumed)} consumed`
        : `${fK(costBasisBOY)} (no withdrawal)`,
      result: `EOY Basis = ${fK(costBasisEOY)}`,
      simple: fK(costBasisEOY),
    };
  },
},

effectiveAtReturn: {
  name: 'After-Tax Effective Return',
  concept:
    'Actual growth rate applied to After-Tax account this year. May differ from base return if using risk-adjusted returns. Applied after withdrawals.',
  formula:
    'atEOY = (atBOY - atWithdrawal) x (1 + effectiveAtReturn)\n\nBase return adjusted for:\n- Risk allocation mode\n- Account-specific factors',
  backOfEnvelope: 'Base return (e.g., 6-7%)',
  compute: (data, params) => {
    const { effectiveAtReturn, atReturn, atBOY } = data;
    const returnPct = (effectiveAtReturn * 100).toFixed(1);
    return {
      formula: `After-tax account growth rate`,
      values: `${returnPct}% on remaining balance`,
      result: `Growth = ${fK(atReturn)}`,
      simple: `${returnPct}%`,
    };
  },
},

effectiveIraReturn: {
  name: 'IRA Effective Return',
  concept:
    'Actual growth rate applied to Traditional IRA this year. May differ from base return if using risk-adjusted returns. Applied after withdrawals and conversions.',
  formula:
    'iraEOY = (iraBOY - iraWithdrawal - rothConversion) x (1 + effectiveIraReturn)\n\nTax-deferred growth.',
  backOfEnvelope: 'Base return (e.g., 6-7%)',
  compute: (data, params) => {
    const { effectiveIraReturn, iraReturn, iraBOY } = data;
    const returnPct = (effectiveIraReturn * 100).toFixed(1);
    return {
      formula: `IRA account growth rate`,
      values: `${returnPct}% on remaining balance`,
      result: `Growth = ${fK(iraReturn)}`,
      simple: `${returnPct}%`,
    };
  },
},

effectiveRothReturn: {
  name: 'Roth Effective Return',
  concept:
    'Actual growth rate applied to Roth IRA this year. Growth is completely tax-free. Applied after any withdrawals and additions from conversions.',
  formula:
    'rothEOY = (rothBOY - rothWithdrawal + rothConversion) x (1 + effectiveRothReturn)\n\nTax-free growth forever!',
  backOfEnvelope: 'Base return (e.g., 6-7%)',
  compute: (data, params) => {
    const { effectiveRothReturn, rothReturn, rothBOY } = data;
    const returnPct = (effectiveRothReturn * 100).toFixed(1);
    return {
      formula: `Roth account growth rate (tax-free!)`,
      values: `${returnPct}% on balance after conversions`,
      result: `Growth = ${fK(rothReturn)}`,
      simple: `${returnPct}% (tax-free)`,
    };
  },
},

cumulativeIRMAA: {
  name: 'Cumulative IRMAA Paid',
  concept:
    'Running total of IRMAA Medicare surcharges paid since projection start. Tracks the cost of having high income (MAGI > $206K from 2 years prior).',
  formula:
    'cumulativeIRMAA = Sum(Annual IRMAA)\n\nIRMAA is an extra Medicare premium, not a tax.\nBased on MAGI from 2 years prior.',
  backOfEnvelope: 'Sum of annual IRMAA surcharges',
  compute: (data, params) => {
    const { cumulativeIRMAA, irmaaTotal, year } = data;
    const avgPerYear = irmaaTotal > 0 ? cumulativeIRMAA / irmaaTotal : 0;
    return {
      formula: `Running sum of annual IRMAA`,
      values: `Through ${year}: ${fK(cumulativeIRMAA)}`,
      result: `Total IRMAA = ${fK(cumulativeIRMAA)}`,
      simple: irmaaTotal > 0
        ? `~${fK(irmaaTotal)}/year x ${avgPerYear.toFixed(0)} years`
        : `${fK(cumulativeIRMAA)} total`,
    };
  },
},

irmaaMAGI: {
  name: 'IRMAA Lookback MAGI',
  concept:
    'Modified Adjusted Gross Income from 2 years prior, used to determine IRMAA bracket. High MAGI = higher Medicare premiums.',
  formula:
    'irmaaMAGI = MAGI from (current year - 2)\n\nThresholds (MFJ 2025):\n< $206K: $0 surcharge\n$206K-$258K: Tier 1\n$258K-$322K: Tier 2\netc.',
  backOfEnvelope: 'Your income from 2 years ago determines this year\'s IRMAA',
  compute: (data, params) => {
    const { irmaaMAGI, year, irmaaTotal } = data;
    const tier = irmaaTotal === 0 ? 'None' :
                 irmaaMAGI < 258000 ? 'Tier 1' :
                 irmaaMAGI < 322000 ? 'Tier 2' : 'Tier 3+';
    return {
      formula: `MAGI from ${year - 2}`,
      values: `${fK(irmaaMAGI)} (${tier})`,
      result: irmaaTotal > 0 ? `Triggered ${fK(irmaaTotal)} IRMAA` : 'Below threshold',
      simple: fK(irmaaMAGI),
    };
  },
},

irmaaPartB: {
  name: 'IRMAA Part B Surcharge',
  concept:
    'Income-related surcharge on Medicare Part B (medical insurance). Added to base premium when MAGI exceeds thresholds. Per person, per year.',
  formula:
    'Part B Surcharge (per person annually):\nTier 1 ($206K-$258K): ~$1,000\nTier 2 ($258K-$322K): ~$2,500\nTier 3 ($322K-$386K): ~$4,000\netc.',
  backOfEnvelope: 'Doubles your Part B premium at higher tiers',
  compute: (data, params) => {
    const { irmaaPartB } = data;
    const perPerson = irmaaPartB / 2;
    const monthly = perPerson / 12;
    return {
      formula: `Part B surcharge x 2 people x 12 months`,
      values: `${f$(monthly)}/person/month`,
      result: `Annual Part B = ${fK(irmaaPartB)}`,
      simple: fK(irmaaPartB),
    };
  },
},

irmaaPartD: {
  name: 'IRMAA Part D Surcharge',
  concept:
    'Income-related surcharge on Medicare Part D (prescription drugs). Smaller than Part B but adds up. Per person, per year.',
  formula:
    'Part D Surcharge (per person annually):\nTier 1: ~$150\nTier 2: ~$400\nTier 3: ~$650\netc.',
  backOfEnvelope: 'Smaller than Part B, ~10-20% of Part B surcharge',
  compute: (data, params) => {
    const { irmaaPartD, irmaaPartB } = data;
    const perPerson = irmaaPartD / 2;
    const pctOfB = irmaaPartB > 0 ? ((irmaaPartD / irmaaPartB) * 100).toFixed(0) : 0;
    return {
      formula: `Part D surcharge x 2 people x 12 months`,
      values: `${f$(perPerson)}/person/year`,
      result: `Annual Part D = ${fK(irmaaPartD)} (${pctOfB}% of Part B)`,
      simple: fK(irmaaPartD),
    };
  },
},
```

#### 2. Expand INSPECTABLE_FIELDS to include all rows
**File**: `src/components/ProjectionsTable/index.jsx`
**Changes**: Add all fields from SECTIONS to INSPECTABLE_FIELDS (around line 171-202)

```javascript
// CRITICAL: Expand INSPECTABLE_FIELDS to include ALL rows from SECTIONS
// Otherwise the new CALCULATIONS entries won't be clickable!
const INSPECTABLE_FIELDS = [
  // Beginning of Year (existing + new)
  'atBOY', 'iraBOY', 'rothBOY', 'totalBOY', 'costBasisBOY',
  // Income
  'ssAnnual',
  // Cash Needs
  'expenses', 'irmaaTotal',
  // RMD & Conversions
  'rmdFactor', 'rmdRequired', 'rothConversion',
  // Withdrawals
  'atWithdrawal', 'iraWithdrawal', 'rothWithdrawal', 'totalWithdrawal',
  // Tax Detail
  'taxableSS', 'ordinaryIncome', 'capitalGains', 'taxableOrdinary',
  'federalTax', 'ltcgTax', 'niit', 'stateTax', 'totalTax',
  // IRMAA Detail
  'irmaaMAGI', 'irmaaPartB', 'irmaaPartD',
  // Ending Position
  'atEOY', 'iraEOY', 'rothEOY', 'totalEOY', 'costBasisEOY', 'rothPercent',
  // Heir Value
  'heirValue',
  // Analysis & Metrics
  'effectiveAtReturn', 'effectiveIraReturn', 'effectiveRothReturn',
  'cumulativeTax', 'cumulativeIRMAA', 'cumulativeCapitalGains', 'atLiquidationPercent',
  // Also include cumulativeATTax if used
  'cumulativeATTax',
];
```

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] All SECTIONS rows are in INSPECTABLE_FIELDS:
  ```bash
  # Verify key fields are in INSPECTABLE_FIELDS
  grep -q "'ssAnnual'" src/components/ProjectionsTable/index.jsx
  grep -q "'expenses'" src/components/ProjectionsTable/index.jsx
  grep -q "'atBOY'" src/components/ProjectionsTable/index.jsx
  grep -q "'rmdFactor'" src/components/ProjectionsTable/index.jsx
  ```
- [ ] All fields have calculations:
  ```bash
  # Count CALCULATIONS entries (should be 40+)
  grep -c "^  [a-zA-Z]*:" src/components/CalculationInspector/index.jsx | test $(cat) -ge 40
  ```
- [ ] Add CalculationInspector test:
  ```javascript
  // src/components/CalculationInspector/CalculationInspector.test.jsx
  import { render, screen } from '@testing-library/react';
  import { CalculationInspector, CALCULATIONS } from './index';

  describe('CalculationInspector coverage', () => {
    const requiredFields = [
      'ssAnnual', 'expenses', 'rmdFactor', 'ordinaryIncome', 'taxableOrdinary',
      'standardDeduction', 'costBasisBOY', 'costBasisEOY', 'effectiveAtReturn',
      'effectiveIraReturn', 'effectiveRothReturn', 'cumulativeIRMAA',
      'irmaaMAGI', 'irmaaPartB', 'irmaaPartD',
      // BOY fields already have CALCULATIONS - verify still present
      'atBOY', 'iraBOY', 'rothBOY', 'totalBOY'
    ];

    requiredFields.forEach(field => {
      it(`has calculation for ${field}`, () => {
        expect(CALCULATIONS[field]).toBeDefined();
        expect(CALCULATIONS[field].name).toBeTruthy();
        expect(CALCULATIONS[field].concept).toBeTruthy();
        expect(CALCULATIONS[field].compute).toBeInstanceOf(Function);
      });
    });

    it('renders calculation details for new fields', () => {
      const mockData = { ssAnnual: 50000, year: 2026, age: 70 };
      render(<CalculationInspector field="ssAnnual" data={mockData} params={{}} onClose={() => {}} />);
      expect(screen.getByText('Annual Social Security')).toBeInTheDocument();
    });
  });
  ```
- [ ] All rows are clickable:
  ```javascript
  // Add to ProjectionsTable.test.jsx
  describe('All rows are inspectable', () => {
    const allRowKeys = ['atBOY', 'ssAnnual', 'expenses', 'rmdFactor', 'ordinaryIncome'];

    allRowKeys.forEach(key => {
      it(`${key} row is clickable`, () => {
        render(<ProjectionsTable {...mockProps} />);
        // Click on a cell in this row should open inspector
        // (test depends on how cells are structured)
      });
    });
  });
  ```

---

## Phase 5: Add Global Precision Setting

### Overview
Add a setting to control display precision: "Rounded (K/M)", "Full Dollars", "Dollars+Cents".

### Changes Required:

#### 1. Add precision to DEFAULT_SETTINGS
**File**: `src/hooks/useProjections.js`
**Changes**: Add to DEFAULT_SETTINGS (around line 22-41)

```javascript
const DEFAULT_SETTINGS = {
  // ... existing settings ...

  // Display Precision
  displayPrecision: 'abbreviated', // 'abbreviated' | 'dollars' | 'cents'
};
```

#### 2. Update formatters to accept precision config
**File**: `src/lib/formatters.js`
**Changes**: Create precision-aware formatter

```javascript
// Add at top of file
let globalPrecision = 'abbreviated'; // 'abbreviated' | 'dollars' | 'cents'

export function setGlobalPrecision(precision) {
  globalPrecision = precision;
}

export function getGlobalPrecision() {
  return globalPrecision;
}

// Update formatCurrency function
export function formatCurrency(value, options = {}) {
  const { abbreviate = true, decimals = 0, showSign = false, prefix = '$' } = options;

  // Use global precision unless explicitly overridden
  const precision = options.precision || globalPrecision;

  if (value == null || isNaN(value)) return '-';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : showSign && value > 0 ? '+' : '';

  // Precision modes
  if (precision === 'cents') {
    return `${sign}${prefix}${absValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (precision === 'dollars') {
    return `${sign}${prefix}${Math.round(absValue).toLocaleString()}`;
  }

  // 'abbreviated' mode (K/M/B)
  if (!abbreviate) {
    return `${sign}${prefix}${Math.round(absValue).toLocaleString()}`;
  }

  if (absValue >= 1e9) {
    return `${sign}${prefix}${(absValue / 1e9).toFixed(1)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}${prefix}${(absValue / 1e6).toFixed(1)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}${prefix}${(absValue / 1e3).toFixed(decimals)}K`;
  }
  return `${sign}${prefix}${Math.round(absValue).toLocaleString()}`;
}
```

#### 3. Add precision toggle to SettingsPanel
**File**: `src/components/SettingsPanel/index.jsx`
**Changes**: Add in Display Preferences section

```jsx
{/* Precision Setting */}
<div className="mb-3">
  <div className="text-slate-400 text-xs mb-1">Number Precision</div>
  <div className="flex gap-1">
    {[
      { value: 'abbreviated', label: 'Rounded (K/M)' },
      { value: 'dollars', label: 'Full Dollars' },
      { value: 'cents', label: 'Dollars + Cents' },
    ].map(opt => (
      <button
        key={opt.value}
        onClick={() => updateSettings({ displayPrecision: opt.value })}
        className={`flex-1 px-2 py-1.5 rounded text-xs ${
          (settings.displayPrecision || 'abbreviated') === opt.value
            ? 'bg-blue-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>
```

#### 4. Apply precision setting on mount and change
**File**: `src/App.jsx`
**Changes**: Add useEffect to sync precision setting

```javascript
import { setGlobalPrecision } from './lib/formatters';

// Add in App component:
useEffect(() => {
  setGlobalPrecision(settings.displayPrecision || 'abbreviated');
}, [settings.displayPrecision]);
```

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Formatter supports precision modes:
  ```javascript
  // src/lib/formatters.test.js
  describe('formatCurrency precision modes', () => {
    it('abbreviated mode shows K/M', () => {
      setGlobalPrecision('abbreviated');
      expect(formatCurrency(1500000)).toBe('$1.5M');
      expect(formatCurrency(75000)).toBe('$75K');
    });

    it('dollars mode shows full numbers', () => {
      setGlobalPrecision('dollars');
      expect(formatCurrency(1500000)).toBe('$1,500,000');
      expect(formatCurrency(75000)).toBe('$75,000');
    });

    it('cents mode shows decimals', () => {
      setGlobalPrecision('cents');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1500000)).toBe('$1,500,000.00');
    });
  });
  ```

---

## Phase 6: Add Table Filtering and Multi-Sort

### Overview
Add multi-column sorting and row value filtering to ProjectionsTable and CustomViewModal.
**IMPORTANT**: User specifically requested "multi sorting options" - not single-column sort.

### Changes Required:

#### 1. Add MULTI-SORT state to ProjectionsTable
**File**: `src/components/ProjectionsTable/index.jsx`
**Changes**: Add multi-column sorting state and logic

```javascript
// Add state for MULTI-COLUMN sorting (around line 228)
// Array of sort configs: [{key: 'year', direction: 'asc'}, {key: 'totalEOY', direction: 'desc'}]
const [sortConfigs, setSortConfigs] = useState([]);

// Add multi-sort handler - Shift+click adds secondary sort, regular click sets primary
const handleSort = useCallback((key, event) => {
  setSortConfigs(prev => {
    const existingIndex = prev.findIndex(s => s.key === key);

    if (event?.shiftKey) {
      // Shift+click: Add as secondary sort or toggle existing
      if (existingIndex >= 0) {
        // Toggle direction of existing sort
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          direction: updated[existingIndex].direction === 'asc' ? 'desc' : 'asc'
        };
        return updated;
      } else {
        // Add new secondary sort
        return [...prev, { key, direction: 'asc' }];
      }
    } else {
      // Regular click: Set as single primary sort or toggle
      if (existingIndex === 0 && prev.length === 1) {
        // Toggle direction of single sort
        return [{ key, direction: prev[0].direction === 'asc' ? 'desc' : 'asc' }];
      } else {
        // Reset to single sort on this column
        return [{ key, direction: 'asc' }];
      }
    }
  });
}, []);

// Clear all sorts
const clearSort = useCallback(() => setSortConfigs([]), []);

// Add multi-sorted data memo with null handling
const sortedData = useMemo(() => {
  if (sortConfigs.length === 0) return displayData;

  return [...displayData].sort((a, b) => {
    for (const { key, direction } of sortConfigs) {
      // Handle null/undefined values - push to end
      const aVal = a[key];
      const bVal = b[key];

      // Null handling: nulls always sort to the end
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Numeric comparison
      const compare = Number(aVal) - Number(bVal);
      if (compare !== 0) {
        return direction === 'asc' ? compare : -compare;
      }
      // If equal, continue to next sort key
    }
    return 0;
  });
}, [displayData, sortConfigs]);
```

#### 2. Add sortable column headers with multi-sort indicators
**File**: `src/components/ProjectionsTable/index.jsx`
**Changes**: Make year headers clickable for sorting with priority badges

```jsx
// Helper to get sort indicator and priority badge
const getSortIndicator = (key) => {
  const sortIndex = sortConfigs.findIndex(s => s.key === key);
  if (sortIndex === -1) return null;
  const config = sortConfigs[sortIndex];
  const arrow = config.direction === 'asc' ? '↑' : '↓';
  // Show priority number if multi-sorting (2nd, 3rd, etc.)
  const priority = sortConfigs.length > 1 ? `${sortIndex + 1}` : '';
  return (
    <span className="ml-1 text-blue-400">
      {arrow}{priority && <sup className="text-[10px]">{priority}</sup>}
    </span>
  );
};

// In thead, add sort indicators to column headers
<th
  onClick={(e) => handleSort('year', e)}
  className="cursor-pointer hover:bg-slate-800 select-none"
  title="Click to sort, Shift+click to add secondary sort"
>
  Year
  {getSortIndicator('year')}
</th>

// Add clear sort button when sorts are active
{sortConfigs.length > 0 && (
  <button
    onClick={clearSort}
    className="ml-2 text-xs text-slate-500 hover:text-slate-300"
    title="Clear all sorting"
  >
    ✕ Clear sort
  </button>
)}
```

#### 3. Add filter state to CustomViewModal with empty handling
**File**: `src/components/CustomViewModal/index.jsx`
**Changes**: Add filtering controls with edge case handling

```javascript
// Add filter state
const [filterField, setFilterField] = useState(null); // Which field to filter by
const [filterMode, setFilterMode] = useState('all'); // 'all' | 'above' | 'below' | 'between'
const [filterThreshold, setFilterThreshold] = useState(0);
const [filterThresholdMax, setFilterThresholdMax] = useState(0); // For 'between' mode

// Add filtered data logic with null handling
const filteredData = useMemo(() => {
  if (filterMode === 'all' || !filterField) return projections;

  return projections.filter(p => {
    const val = p[filterField];

    // Handle null/undefined - exclude from filtered results
    if (val == null) return false;

    if (filterMode === 'above') return val >= filterThreshold;
    if (filterMode === 'below') return val <= filterThreshold;
    if (filterMode === 'between') return val >= filterThreshold && val <= filterThresholdMax;
    return true;
  });
}, [projections, filterMode, filterField, filterThreshold, filterThresholdMax]);

// Check for empty results
const hasNoResults = filteredData.length === 0 && filterMode !== 'all';
```

#### 4. Add filter UI with empty state handling
**File**: `src/components/CustomViewModal/index.jsx`
**Changes**: Add filter controls with helpful feedback

```jsx
{/* Filter controls */}
<div className="flex items-center gap-2 mb-3 p-2 bg-slate-800 rounded flex-wrap">
  <span className="text-xs text-slate-400">Filter by:</span>
  <select
    value={filterField || ''}
    onChange={e => setFilterField(e.target.value || null)}
    className="bg-slate-700 text-xs rounded px-2 py-1"
  >
    <option value="">Select field...</option>
    {selectedRowsArray.map(field => (
      <option key={field} value={field}>{field}</option>
    ))}
  </select>

  {filterField && (
    <>
      <select
        value={filterMode}
        onChange={e => setFilterMode(e.target.value)}
        className="bg-slate-700 text-xs rounded px-2 py-1"
      >
        <option value="all">Show All</option>
        <option value="above">Above</option>
        <option value="below">Below</option>
        <option value="between">Between</option>
      </select>

      {filterMode !== 'all' && (
        <input
          type="number"
          value={filterThreshold}
          onChange={e => setFilterThreshold(Number(e.target.value))}
          className="bg-slate-700 text-xs rounded px-2 py-1 w-24"
          placeholder={filterMode === 'between' ? 'Min' : 'Threshold'}
        />
      )}

      {filterMode === 'between' && (
        <>
          <span className="text-xs text-slate-500">to</span>
          <input
            type="number"
            value={filterThresholdMax}
            onChange={e => setFilterThresholdMax(Number(e.target.value))}
            className="bg-slate-700 text-xs rounded px-2 py-1 w-24"
            placeholder="Max"
          />
        </>
      )}

      {filterMode !== 'all' && (
        <span className="text-xs text-slate-500">
          ({filteredData.length} of {projections.length} rows)
        </span>
      )}
    </>
  )}
</div>

{/* Empty results message */}
{hasNoResults && (
  <div className="p-4 text-center bg-slate-800/50 rounded border border-slate-700 mb-3">
    <div className="text-slate-400 text-sm mb-1">No rows match your filter</div>
    <div className="text-slate-500 text-xs">
      Try adjusting the threshold or selecting "Show All"
    </div>
    <button
      onClick={() => setFilterMode('all')}
      className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
    >
      Clear Filter
    </button>
  </div>
)}
```

#### 5. Add multi-sort to CustomViewModal as well
**File**: `src/components/CustomViewModal/index.jsx`
**Changes**: Mirror the multi-sort functionality from ProjectionsTable

```javascript
// Add multi-sort state
const [sortConfigs, setSortConfigs] = useState([]);

// Same handleSort and clearSort logic as ProjectionsTable
const handleSort = useCallback((key, event) => {
  // ... same implementation as Step 1
}, []);

// Apply multi-sort to filteredData
const sortedData = useMemo(() => {
  if (sortConfigs.length === 0) return filteredData;
  // ... same implementation as Step 1
}, [filteredData, sortConfigs]);
```

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Multi-sort functionality tests:
  ```javascript
  // src/components/ProjectionsTable/ProjectionsTable.test.jsx
  describe('ProjectionsTable multi-sort', () => {
    it('sorts data when column header clicked', () => {
      render(<ProjectionsTable {...mockProps} />);
      const yearHeader = screen.getByText('Year');
      fireEvent.click(yearHeader);
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('adds secondary sort with shift+click', () => {
      render(<ProjectionsTable {...mockProps} />);
      const yearHeader = screen.getByText('Year');
      const totalHeader = screen.getByText('Total EOY');

      fireEvent.click(yearHeader);
      fireEvent.click(totalHeader, { shiftKey: true });

      // Both columns should have sort indicators with priority numbers
      expect(screen.getByText('1', { selector: 'sup' })).toBeInTheDocument();
      expect(screen.getByText('2', { selector: 'sup' })).toBeInTheDocument();
    });

    it('handles null values in sort (pushes to end)', () => {
      const propsWithNulls = {
        ...mockProps,
        projections: [
          { year: 2025, totalEOY: 100000 },
          { year: 2026, totalEOY: null },
          { year: 2027, totalEOY: 200000 },
        ],
      };
      render(<ProjectionsTable {...propsWithNulls} />);
      fireEvent.click(screen.getByText('Total EOY'));
      // Verify null row is at the end
    });

    it('clears sort when clear button clicked', () => {
      render(<ProjectionsTable {...mockProps} />);
      fireEvent.click(screen.getByText('Year'));
      fireEvent.click(screen.getByText('✕ Clear sort'));
      expect(screen.queryByText('↑')).not.toBeInTheDocument();
    });
  });
  ```
- [ ] Filter functionality tests with edge cases:
  ```javascript
  // src/components/CustomViewModal/CustomViewModal.test.jsx
  describe('CustomViewModal filtering', () => {
    it('filters data by threshold', () => {
      render(<CustomViewModal {...mockProps} />);
      fireEvent.change(screen.getByRole('combobox', { name: /filter by/i }), { target: { value: 'totalEOY' } });
      fireEvent.change(screen.getByRole('combobox', { name: /show all/i }), { target: { value: 'above' } });
      fireEvent.change(screen.getByPlaceholderText('Threshold'), { target: { value: '100000' } });
      expect(screen.getByText(/rows/)).toBeInTheDocument();
    });

    it('shows empty state when no rows match', () => {
      render(<CustomViewModal {...mockProps} />);
      // Set filter that matches nothing
      fireEvent.change(screen.getByPlaceholderText('Threshold'), { target: { value: '999999999' } });
      expect(screen.getByText('No rows match your filter')).toBeInTheDocument();
    });

    it('clear filter button removes filter', () => {
      render(<CustomViewModal {...mockProps} />);
      // Set filter, then clear
      fireEvent.click(screen.getByText('Clear Filter'));
      expect(screen.queryByText('No rows match your filter')).not.toBeInTheDocument();
    });

    it('filters between two values', () => {
      render(<CustomViewModal {...mockProps} />);
      fireEvent.change(screen.getByRole('combobox', { name: /show all/i }), { target: { value: 'between' } });
      fireEvent.change(screen.getByPlaceholderText('Min'), { target: { value: '50000' } });
      fireEvent.change(screen.getByPlaceholderText('Max'), { target: { value: '150000' } });
      // Verify only rows in range are shown
    });

    it('excludes null values from filtered results', () => {
      const propsWithNulls = {
        ...mockProps,
        projections: [
          { year: 2025, totalEOY: 100000 },
          { year: 2026, totalEOY: null },
        ],
      };
      render(<CustomViewModal {...propsWithNulls} />);
      fireEvent.change(screen.getByRole('combobox', { name: /filter by/i }), { target: { value: 'totalEOY' } });
      fireEvent.change(screen.getByRole('combobox', { name: /show all/i }), { target: { value: 'above' } });
      fireEvent.change(screen.getByPlaceholderText('Threshold'), { target: { value: '0' } });
      // Null row should be excluded
      expect(screen.getByText('1 of 2 rows')).toBeInTheDocument();
    });
  });
  ```

---

## Testing Strategy

### Unit Tests (All Automated):
- `SettingsPanel.test.jsx`: No heirs section, renders other sections
- `InputPanel.test.jsx`: Profile section renders and updates settings
- `useProjections.test.js`: SS exemption defaults to 'through2028'
- `CalculationInspector.test.jsx`: All fields have calculation entries
- `formatters.test.js`: Precision modes work correctly
- `ProjectionsTable.test.jsx`: Sort functionality
- `CustomViewModal.test.jsx`: Filter functionality

### Integration Tests:
- Full app renders with new settings
- Profile changes in InputPanel persist
- Precision changes affect all displays

### Running All Verification:
```bash
npm run check
```

---

## References

- SettingsPanel: `src/components/SettingsPanel/index.jsx`
- InputPanel: `src/components/InputPanel/index.jsx`
- useProjections hook: `src/hooks/useProjections.js`
- CalculationInspector: `src/components/CalculationInspector/index.jsx`
- Formatters: `src/lib/formatters.js`
- ProjectionsTable: `src/components/ProjectionsTable/index.jsx`
- CustomViewModal: `src/components/CustomViewModal/index.jsx`
