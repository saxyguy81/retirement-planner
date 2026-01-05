# Year Input Validation Fix - Implementation Plan

## Overview

Fix the crash/hang that occurs when users type partial year values (e.g., deleting characters from "2025" results in intermediate value "20" triggering thousands of calculation iterations). Create a `YearInput` component that commits values only on blur, preventing invalid intermediate states from triggering recalculations.

## Current State Analysis

### The Problem

Year inputs use direct `onChange` handlers that call `updateParam` on every keystroke:

```jsx
// Current problematic pattern (InputPanel/index.jsx:304-309)
<input
  type="number"
  value={params.startYear || 2025}
  onChange={e => updateParam('startYear', parseInt(e.target.value) || 2025)}
/>
```

When a user deletes characters (e.g., changing "2025" → "20"):
1. `parseInt("20")` = 20
2. `updateParam('startYear', 20)` triggers state update
3. `useMemo` in `useProjections.js:207` detects change, recalculates
4. Loop from year 20 to 2054 = **2034 iterations**
5. Age calculation: `20 - 1960 = -1940` (negative age!)
6. App hangs or produces errors

### Affected Fields (6 total)

| Field | Location | Current Pattern |
|-------|----------|-----------------|
| Start Year | `InputPanel:304-309` | `parseInt(e.target.value) \|\| 2025` |
| End Year | `InputPanel:313-318` | `parseInt(e.target.value) \|\| 2054` |
| Primary Birth Year | `InputPanel:341-349` | `parseInt(e.target.value) \|\| 1960` |
| Spouse Birth Year | `InputPanel:365-373` | `parseInt(e.target.value) \|\| 1962` |
| Survivor Death Year | `InputPanel:386-398` | `parseInt(e.target.value) \|\| null` |
| Heir Birth Year | `InputPanel:1094-1103` | `parseInt(e.target.value) \|\| 1980` |

### Better Pattern Exists

The `ParamInput` component (lines 155-224) already uses local state + onBlur:

```jsx
function ParamInput({ value, onChange, ... }) {
  const [localValue, setLocalValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = () => {
    setIsEditing(true);
    setLocalValue(value.toString());
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      onChange(parsed);  // Only commits on blur
    }
  };
}
```

## Desired End State

After implementation:
1. Year inputs store user keystrokes in local state during editing
2. Values only commit to parent state on blur or Enter key
3. Invalid/partial values never trigger projection recalculation
4. Min/max validation prevents obviously wrong values (e.g., year 20)
5. User sees immediate feedback while typing (local state updates)
6. App never hangs from partial year input

### Verification

- Typing partial values like "20" does not trigger recalculation
- Deleting all characters and clicking away reverts to previous value
- Valid values commit on blur and Enter
- E2E tests pass
- No regression in existing functionality

## What We're NOT Doing

- Adding debounce to `updateParam` (doesn't prevent all edge cases)
- Adding defensive guards in `projections.js` (treats symptom, not cause)
- Modifying `SmartYearInput` (already has local state, used for different purpose)
- Changing the `ParamInput` component (works well for currency/percentage inputs)

## Implementation Approach

Create a new `YearInput` component following the `ParamInput` pattern, then replace all 6 year input fields with it.

---

## Phase 1: Create YearInput Component

### Overview

Create a reusable `YearInput` component that:
- Stores keystrokes in local state during editing
- Commits only on blur or Enter
- Validates against min/max bounds
- Shows validation feedback

### Changes Required:

#### 1. Create YearInput Component
**File**: `src/components/InputPanel/YearInput.jsx` (new)

```jsx
import { useState, useEffect } from 'react';

/**
 * Year input that only commits valid values on blur/Enter.
 * Prevents partial values (e.g., "20" when deleting from "2025")
 * from triggering expensive recalculations.
 */
export function YearInput({
  value,
  onChange,
  min = 1900,
  max = 2150,
  placeholder = '',
  allowEmpty = false,
  className = '',
}) {
  const [localValue, setLocalValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Sync local value when parent value changes (and not editing)
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value != null ? value.toString() : '');
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    setLocalValue(value != null ? value.toString() : '');
  };

  const commitValue = () => {
    setIsEditing(false);

    const trimmed = localValue.trim();

    // Handle empty input
    if (trimmed === '') {
      if (allowEmpty) {
        onChange(null);
      }
      // If not allowEmpty, revert to previous value (do nothing)
      setLocalValue(value != null ? value.toString() : '');
      return;
    }

    const parsed = parseInt(trimmed, 10);

    // Validate: must be a number within bounds
    if (isNaN(parsed)) {
      // Invalid - revert to previous value
      setLocalValue(value != null ? value.toString() : '');
      return;
    }

    if (parsed < min || parsed > max) {
      // Out of bounds - revert to previous value
      setLocalValue(value != null ? value.toString() : '');
      return;
    }

    // Valid - commit
    onChange(parsed);
  };

  const handleBlur = () => {
    commitValue();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
      e.target.blur();
    }
    if (e.key === 'Escape') {
      // Revert and blur
      setLocalValue(value != null ? value.toString() : '');
      setIsEditing(false);
      e.target.blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={isEditing ? localValue : (value != null ? value.toString() : '')}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className || 'w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none'}
    />
  );
}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm test` passes
- [x] Component renders without errors

#### Manual Verification:
- [ ] Typing partial values does not commit
- [ ] Blur commits valid values
- [ ] Enter commits valid values
- [ ] Escape reverts to previous value
- [ ] Out-of-bounds values revert on blur

---

## Phase 2: Replace Year Inputs in InputPanel

### Overview

Replace all 6 year input fields with the new `YearInput` component.

### Changes Required:

#### 1. Import YearInput
**File**: `src/components/InputPanel/index.jsx`

Add import at top:
```jsx
import { YearInput } from './YearInput';
```

#### 2. Replace Start Year Input
**File**: `src/components/InputPanel/index.jsx`
**Lines**: 304-309

Replace:
```jsx
<input
  type="number"
  value={params.startYear || 2025}
  onChange={e => updateParam('startYear', parseInt(e.target.value) || 2025)}
  className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
/>
```

With:
```jsx
<YearInput
  value={params.startYear}
  onChange={(v) => updateParam('startYear', v)}
  min={2020}
  max={2100}
  placeholder="e.g., 2025"
/>
```

#### 3. Replace End Year Input
**File**: `src/components/InputPanel/index.jsx`
**Lines**: 313-318

Replace:
```jsx
<input
  type="number"
  value={params.endYear || 2054}
  onChange={e => updateParam('endYear', parseInt(e.target.value) || 2054)}
  className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
/>
```

With:
```jsx
<YearInput
  value={params.endYear}
  onChange={(v) => updateParam('endYear', v)}
  min={2020}
  max={2100}
  placeholder="e.g., 2055"
/>
```

#### 4. Replace Primary Birth Year Input
**File**: `src/components/InputPanel/index.jsx`
**Lines**: 341-349

Replace:
```jsx
<input
  type="number"
  value={settings?.primaryBirthYear || ''}
  onChange={e =>
    updateSettings?.({ primaryBirthYear: parseInt(e.target.value) || 1960 })
  }
  className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
  placeholder="e.g., 1960"
/>
```

With:
```jsx
<YearInput
  value={settings?.primaryBirthYear}
  onChange={(v) => updateSettings?.({ primaryBirthYear: v })}
  min={1920}
  max={2010}
  placeholder="e.g., 1960"
/>
```

#### 5. Replace Spouse Birth Year Input
**File**: `src/components/InputPanel/index.jsx`
**Lines**: 365-373

Replace:
```jsx
<input
  type="number"
  value={settings?.spouseBirthYear || ''}
  onChange={e =>
    updateSettings?.({ spouseBirthYear: parseInt(e.target.value) || 1962 })
  }
  className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
  placeholder="e.g., 1962"
/>
```

With:
```jsx
<YearInput
  value={settings?.spouseBirthYear}
  onChange={(v) => updateSettings?.({ spouseBirthYear: v })}
  min={1920}
  max={2010}
  placeholder="e.g., 1962"
/>
```

#### 6. Replace Survivor Death Year Input
**File**: `src/components/InputPanel/index.jsx`
**Lines**: 386-398

Replace:
```jsx
<input
  type="text"
  value={params.survivorDeathYear || ''}
  onChange={e =>
    updateParam(
      'survivorDeathYear',
      e.target.value ? parseInt(e.target.value) : null
    )
  }
  onKeyDown={e => e.key === 'Enter' && e.target.blur()}
  placeholder="none"
  className="w-20 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs"
/>
```

With:
```jsx
<YearInput
  value={params.survivorDeathYear}
  onChange={(v) => updateParam('survivorDeathYear', v)}
  min={2025}
  max={2100}
  allowEmpty={true}
  placeholder="none"
  className="w-20 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
/>
```

#### 7. Replace Heir Birth Year Input
**File**: `src/components/InputPanel/index.jsx`
**Lines**: 1094-1103

Replace:
```jsx
<input
  type="number"
  value={heir.birthYear || 1980}
  onChange={e =>
    updateHeir(index, { birthYear: parseInt(e.target.value) || 1980 })
  }
  className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
  placeholder="e.g., 1980"
/>
```

With:
```jsx
<YearInput
  value={heir.birthYear}
  onChange={(v) => updateHeir(index, { birthYear: v })}
  min={1940}
  max={2020}
  placeholder="e.g., 1980"
  className="w-full bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:border-blue-500 focus:outline-none"
/>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm test` passes
- [x] `npm run test:e2e` passes

#### Manual Verification:
- [ ] Start Year: partial values don't trigger recalc
- [ ] End Year: partial values don't trigger recalc
- [ ] Primary Birth Year: partial values don't trigger recalc
- [ ] Spouse Birth Year: partial values don't trigger recalc
- [ ] Survivor Death Year: can clear to empty, partial values safe
- [ ] Heir Birth Year: partial values don't trigger recalc
- [ ] All fields accept valid years and update projections on blur

---

## Testing Strategy

### Unit Tests

Add unit tests for YearInput component:

**File**: `src/components/InputPanel/YearInput.test.jsx` (new)

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { YearInput } from './YearInput';

describe('YearInput', () => {
  it('does not call onChange during typing', () => {
    const onChange = vi.fn();
    render(<YearInput value={2025} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '20' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits valid value on blur', () => {
    const onChange = vi.fn();
    render(<YearInput value={2025} onChange={onChange} min={2020} max={2100} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2030' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(2030);
  });

  it('reverts invalid value on blur', () => {
    const onChange = vi.fn();
    render(<YearInput value={2025} onChange={onChange} min={2020} max={2100} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('2025');
  });

  it('commits on Enter key', () => {
    const onChange = vi.fn();
    render(<YearInput value={2025} onChange={onChange} min={2020} max={2100} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2030' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(2030);
  });

  it('reverts on Escape key', () => {
    const onChange = vi.fn();
    render(<YearInput value={2025} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2030' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('2025');
  });

  it('allows empty when allowEmpty is true', () => {
    const onChange = vi.fn();
    render(<YearInput value={2025} onChange={onChange} allowEmpty={true} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
```

### E2E Tests

Add E2E test for the fix:

**File**: `e2e/ci/year-input-validation.spec.js` (new)

```javascript
import { test, expect } from '@playwright/test';

test.describe('Year Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('partial year values do not crash the app', async ({ page }) => {
    // Find the Start Year input in About You section
    const startYearInput = page.locator('input[placeholder="e.g., 2025"]').first();

    // Focus and clear the input
    await startYearInput.click();
    await startYearInput.fill('');

    // Type partial value "20"
    await startYearInput.type('20');

    // App should not crash - check that page is still responsive
    await expect(page.locator('body')).toBeVisible();

    // Blur should revert to previous value
    await startYearInput.blur();

    // Value should be reverted (not "20")
    const value = await startYearInput.inputValue();
    expect(parseInt(value)).toBeGreaterThan(2000);
  });

  test('valid year values are committed on blur', async ({ page }) => {
    const startYearInput = page.locator('input[placeholder="e.g., 2025"]').first();

    await startYearInput.click();
    await startYearInput.fill('2030');
    await startYearInput.blur();

    // Value should be committed
    const value = await startYearInput.inputValue();
    expect(value).toBe('2030');
  });
});
```

### Manual Testing Steps

1. Open the app in a fresh browser tab
2. Navigate to "About You" section
3. Click on Start Year input
4. Delete all characters (should show empty during editing)
5. Type "20" - app should NOT hang
6. Click away (blur) - value should revert to previous
7. Repeat for End Year, Primary Birth Year, Spouse Birth Year
8. Test Survivor Death Year with allowEmpty behavior
9. Add an heir and test Heir Birth Year

---

## Performance Considerations

- No additional re-renders during typing (local state only)
- Only commits on blur/Enter, reducing unnecessary recalculations
- No debounce timers or complex state management needed

## Migration Notes

- No data migration needed
- Existing saved params remain valid
- Behavior change: values commit on blur instead of keystroke
- Users accustomed to immediate updates will see slight UX change

## References

- ParamInput pattern: `src/components/InputPanel/index.jsx:155-224`
- Projection calculation trigger: `src/hooks/useProjections.js:207-235`
- Loop that crashes with bad years: `src/lib/projections.js:241`
