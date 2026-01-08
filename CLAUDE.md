# Retirement Planner - Claude Instructions

## Testing Requirements

### When to Run E2E Tests (MANDATORY)

Always run `npm run test:e2e` when changes affect:

1. **UI Section Names or Titles** - Any change to section headers, tab labels, or user-visible text
2. **Component Structure** - Adding, removing, or reorganizing UI sections
3. **Navigation** - Changes to tabs, routing, or user flow
4. **User Interactions** - Buttons, inputs, or interactive elements that e2e tests may reference

### Test Commands

```bash
# Unit tests only (fast, for logic changes)
npm test

# E2E tests (required for UI changes)
npm run test:e2e

# Full verification (both)
npm test && npm run test:e2e
```

### Pre-Completion Checklist

Before declaring UI work complete, verify:

- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes (or use `--fix`)
- [ ] `npm test` - all unit tests pass
- [ ] `npm run test:e2e` - all e2e tests pass (REQUIRED for UI changes)

If e2e tests fail due to renamed sections/elements, update the test expectations to match the new UI.

## Project Structure

- `src/components/InputPanel/` - Left sidebar with model inputs
- `src/components/SettingsPanel/` - Global settings (Tax Tables, AI, Display)
- `e2e/ci/` - E2E test files (Playwright)
- `docs/plans/` - Implementation plans

## Common Patterns

### InputPanel Sections (current order)
1. Timeline
2. Profile & Life Events
3. Starting Accounts
4. Social Security
5. Expenses (with Year-Specific Overrides)
6. Returns & Risk
7. Tax Strategies (Roth Conversions + Cap Gains Harvesting)
8. Tax Parameters
9. Property Taxes
10. Calculation Options
11. Heirs

### SettingsPanel Sections
1. Tax Settings
2. Display Preferences
3. AI Assistant
4. Tax Tables (Advanced) - with Federal Income, Capital Gains, IRMAA tabs

## Flexbox Scrolling Invariants

When working with scrollable flex layouts in this codebase:

### Height Chain Rule
Every element from `h-screen` root to `overflow-auto` container must have explicit height constraints:
- `h-full` - Fill parent height
- `flex-1` - Take remaining flex space
- `h-screen` - Viewport height (root only)

**The chain cannot be broken.** A plain `<div>` wrapper with no classes breaks the chain.

### Wrapper Div Rule
NEVER add a plain wrapper div inside a flex container. Always add constraints:

```jsx
// DANGEROUS - breaks scrolling silently
<div className="flex-1 flex">
  <div id="for-accessibility">  {/* NO CLASSES = BUG */}
    <ScrollableComponent />
  </div>
</div>

// SAFE - chain maintained
<div className="flex-1 flex">
  <div id="for-accessibility" className="h-full overflow-hidden">
    <ScrollableComponent />
  </div>
</div>
```

### Scroll Test Rule
Tests for scrolling must verify actual behavior, not just CSS properties:

```javascript
// BAD - passes even when scrolling is broken
expect(overflowStyle.overflowY).toBe('auto');

// GOOD - fails if flex chain is broken
expect(scrollHeight).toBeGreaterThan(clientHeight);
await scrollContainer.scrollTo({ top: scrollHeight });
expect(targetElement).toBeInViewport();
```

### Current Layout Structure
```
App (h-screen flex-col overflow-hidden)
  └── Body (flex-1 flex overflow-hidden)
        ├── #input-panel (h-full overflow-hidden)
        │     └── aside (w-72 h-full flex-col overflow-hidden)
        │           └── content (flex-1 overflow-auto) ← SCROLLS HERE
        ├── main (flex-1 flex-col overflow-hidden min-h-0)
        └── chat-panel (when visible)
```
