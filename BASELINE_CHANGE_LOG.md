# Baseline Change Log

All baseline changes must be documented here with justification.

## Policy

**Baselines are protected.** Any change to snapshot or visual baselines requires:
1. Individual review of the change
2. Clear justification explaining why the baseline needed to change
3. Reviewer approval
4. Documentation in this file before commit

## Format

Each entry must include:
- **Date**: When the change was made
- **File**: Which baseline file was modified
- **Justification**: Why the baseline needed to change
- **Reviewer**: Who approved the change
- **PR**: Link to the pull request (or commit hash)

---

## Changes

<!-- Add new entries below this line, newest first -->

### Initial Setup
- **Date**: 2024-12-28
- **File**: Initial baseline creation
- **Justification**: First-time baseline creation for all tests
- **Reviewer**: Initial setup
- **PR**: Initial commit

---

## How to Update Baselines

1. **NEVER** run `npm run test:visual:update` without documentation
2. Run `npm run baseline:approve <file>` to document each change
3. Provide clear justification explaining the UI change
4. Get reviewer approval before committing
5. Only update via manual GitHub workflow for bulk changes

## Emergency Override

In rare cases where baselines must be updated urgently:
```bash
git push --no-verify  # NOT RECOMMENDED
```
This bypasses pre-push hooks. Use only in emergencies and document afterward.
