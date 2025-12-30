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
