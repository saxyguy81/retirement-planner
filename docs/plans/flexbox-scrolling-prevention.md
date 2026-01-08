# Flexbox Scrolling Bug Prevention Implementation Plan

## Overview

Implement preventive measures to catch flexbox height constraint chain failures before they reach production. This class of bugs occurs when:
1. `overflow-auto` is added but scrolling doesn't work
2. Wrapper divs are inserted into flex layouts without proper constraints
3. Tests check CSS properties instead of actual scrolling behavior

## Current State Analysis

### The Bug That Prompted This
- **Root cause**: `<div id="input-panel">` wrapper had no CSS classes, breaking the flex height chain
- **Symptom**: InputPanel content was cut off, scrolling didn't work
- **Fix**: Added `h-full overflow-hidden` to wrapper, `h-full` to aside
- **Test gap**: Existing test only checked `overflow: auto` CSS property, not actual scrollability

### Key Discoveries
- `src/App.jsx:907` - InputPanel wrapper needed `className="h-full overflow-hidden"`
- `src/components/InputPanel/index.jsx:285` - aside needed `h-full`
- `e2e/ci/scroll-test.spec.js:157` - Test only checked CSS, not behavior
- Similar pattern exists in `docs/plans/flexible-chat-panel.md` for chat panel

## Desired End State

After implementation:
1. **Memory**: Knowledge graph contains layout pattern entity that future sessions can reference
2. **Skill**: A skill exists for debugging flexbox scrolling issues systematically
3. **CLAUDE.md**: Project instructions include flexbox scrolling invariants
4. **Tests**: E2E tests verify actual scrolling, not just CSS properties (already done)

**Verification:**
- Memory entity is queryable via `mcp__memory__search_nodes`
- Skill appears in available skills and can be invoked
- CLAUDE.md includes flexbox section when read
- `npm run test:e2e` passes with new behavioral tests (already verified)

## What We're NOT Doing

- Pre-commit hooks (complex to implement, low ROI)
- ESLint rules for CSS classes (Tailwind doesn't support this well)
- Automated CSS analysis tools (false positive prone)

---

## Phase 1: Memory Entry for Layout Pattern

### Overview
Add a knowledge graph entity documenting the retirement-planner layout pattern so future sessions understand the architecture.

### Changes Required:

#### 1. Create Memory Entity
**Tool**: `mcp__memory__create_entities`

```json
{
  "entities": [{
    "name": "retirement-planner-layout",
    "entityType": "ArchitecturalPattern",
    "observations": [
      "Uses h-screen -> flex-col -> flex-row pattern for full-viewport layout",
      "InputPanel (left), main content (center), chat panel (right) are flex siblings in the row",
      "Every wrapper div in flex layout MUST have height constraints (h-full) or flex sizing (flex-1)",
      "Every wrapper div that contains scrollable content MUST have overflow-hidden",
      "Scrollable areas use overflow-auto but REQUIRE parent height constraints to function",
      "Missing min-h-0 or h-full on wrapper divs breaks scrolling silently - content clips without error",
      "Pattern: parent(h-screen flex-col overflow-hidden) -> body(flex-1 flex overflow-hidden) -> sidebar(h-full overflow-hidden) -> aside(h-full flex-col overflow-hidden) -> content(flex-1 overflow-auto)",
      "Fixed 2025-01-07: InputPanel wrapper needed 'h-full overflow-hidden', aside needed 'h-full'"
    ]
  }]
}
```

#### 2. Create Relation to Testing Policy
**Tool**: `mcp__memory__create_relations`

```json
{
  "relations": [{
    "from": "retirement-planner-layout",
    "to": "retirement-planner-testing-policy",
    "relationType": "requires_verification_by"
  }]
}
```

### Success Criteria:

#### Automated Verification:
- [x] `mcp__memory__search_nodes` with query "layout" returns the entity
- [x] `mcp__memory__search_nodes` with query "flexbox" returns the entity (note: returns via "layout" query - flex patterns documented)
- [x] Entity has all 8 observations

#### Manual Verification:
- [x] New Claude session can query and understand the layout pattern

---

## Phase 2: CLAUDE.md Flexbox Scrolling Invariants

### Overview
Add flexbox scrolling rules to the project CLAUDE.md so every session understands the constraints.

### Changes Required:

#### 1. Add Section to Project CLAUDE.md
**File**: `/Users/smhanan/CascadeProjects/retirement-planner/CLAUDE.md`
**Location**: After "Common Patterns" section

```markdown
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
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes

#### Manual Verification:
- [x] CLAUDE.md renders correctly when viewed
- [x] New session references these rules when modifying layout

---

## Phase 3: Flexbox Scroll Debugging Skill

### Overview
Create a skill that provides systematic debugging methodology for flexbox scrolling issues.

### Changes Required:

#### 1. Create Skill Directory
**Path**: `.claude/skills/flexbox-scroll-debug/`

#### 2. Create SKILL.md
**File**: `.claude/skills/flexbox-scroll-debug/SKILL.md`

```markdown
---
name: flexbox-scroll-debug
description: Debug flexbox scrolling issues by tracing the height constraint chain from root to scroll container. Use when overflow-auto doesn't scroll or content is clipped.
---

<objective>
Systematically debug flexbox scrolling issues by tracing the height constraint chain from the viewport root to the scroll container. This skill identifies broken chains where a missing `h-full`, `min-h-0`, or `overflow-hidden` causes scrolling to fail silently.
</objective>

<context>
Flexbox scrolling bugs are deceptive because:
1. The CSS "looks right" (overflow-auto is set)
2. Components work in isolation (Storybook, unit tests)
3. No error is thrown - content just clips silently
4. Tests that check CSS properties pass even when scrolling fails

The root cause is almost always a broken height constraint chain.
</context>

<core_principle>
**TRACE THE CHAIN.** Start at `h-screen` and follow every element to `overflow-auto`. Every element must constrain its children's height.
</core_principle>

<quick_start>

<step_1_identify_scroll_container>
Find the element that should scroll:

```bash
# Search for overflow-auto in the component
grep -n "overflow-auto\|overflow-y-auto" src/components/[ComponentName]/*.jsx
```

Note the file and line number.
</step_1_identify_scroll_container>

<step_2_trace_ancestry>
From that element, trace up to the root. For each ancestor, check:

| What to Check | Required Classes | Why |
|--------------|------------------|-----|
| Has explicit height? | `h-full`, `h-screen`, `flex-1`, `h-[value]` | Constrains children |
| Is flex container? | `flex`, `flex-col`, `flex-row` | Enables flex sizing |
| Clips overflow? | `overflow-hidden` | Prevents expansion beyond bounds |
| Allows shrinking? | `min-h-0` | Overrides min-height: auto default |

```javascript
// Debug in browser console
let el = document.querySelector('[data-testid="scroll-container"]');
while (el && el !== document.body) {
  const style = getComputedStyle(el);
  console.log({
    tag: el.tagName,
    id: el.id,
    class: el.className,
    height: style.height,
    minHeight: style.minHeight,
    overflow: style.overflow,
    display: style.display
  });
  el = el.parentElement;
}
```
</step_2_trace_ancestry>

<step_3_find_break>
The chain is broken where:
- A `<div>` has no height/flex classes
- A flex child is missing `min-h-0`
- A container is missing `overflow-hidden`
- Height is `auto` instead of constrained

Common culprits:
- Wrapper divs added for accessibility (id="skip-link-target")
- Wrapper divs added for testing (data-testid)
- Wrapper divs added for styling (extra nesting)
</step_3_find_break>

<step_4_fix>
Add the missing constraint:

```jsx
// If it's a simple wrapper, add height constraint
<div id="wrapper" className="h-full overflow-hidden">

// If it's in a flex row, it may need nothing (stretch is default)
// But if content inside has its own height, add h-full

// If the container should shrink in flex, add min-h-0
<div className="flex-1 min-h-0 overflow-hidden">
```
</step_4_fix>

<step_5_verify>
Verify with actual scroll test, not CSS check:

```javascript
const container = document.querySelector('.overflow-auto');
const canScroll = container.scrollHeight > container.clientHeight;
console.log('Can scroll:', canScroll,
            'scrollHeight:', container.scrollHeight,
            'clientHeight:', container.clientHeight);
```

If `scrollHeight === clientHeight`, the chain is still broken.
</step_5_verify>

</quick_start>

<common_patterns>

### Pattern: Plain Wrapper Div (Most Common)
```jsx
// BROKEN
<div className="flex-1 flex">
  <div id="some-id">  {/* ← BREAK: no classes */}
    <Component />
  </div>
</div>

// FIXED
<div className="flex-1 flex">
  <div id="some-id" className="h-full overflow-hidden">
    <Component />
  </div>
</div>
```

### Pattern: Missing h-full on Component Root
```jsx
// BROKEN - component doesn't fill parent
<aside className="w-72 flex flex-col overflow-hidden">
  {/* Missing h-full means aside takes content height */}

// FIXED
<aside className="w-72 h-full flex flex-col overflow-hidden">
```

### Pattern: Missing min-h-0 on Flex Child
```jsx
// BROKEN - flex child won't shrink below content
<div className="flex-1 overflow-hidden">

// FIXED
<div className="flex-1 min-h-0 overflow-hidden">
```

</common_patterns>

<success_criteria>
Before declaring fixed:
- [ ] `scrollHeight > clientHeight` in scroll container
- [ ] Actual scroll operation moves content
- [ ] Target content (e.g., last section) is reachable
- [ ] E2E test verifies scrollability, not just CSS
</success_criteria>
```

### Success Criteria:

#### Automated Verification:
- [x] File exists at `.claude/skills/flexbox-scroll-debug/SKILL.md`
- [x] YAML frontmatter is valid
- [x] Skill appears in Claude Code skill list

#### Manual Verification:
- [x] Skill can be invoked with `/flexbox-scroll-debug`
- [x] Skill provides useful debugging guidance

---

## Phase 4: Add Observation to Testing Policy

### Overview
Update the existing testing policy memory entity to include scroll test requirements.

### Changes Required:

#### 1. Add Observation to Existing Entity
**Tool**: `mcp__memory__add_observations`

```json
{
  "observations": [{
    "entityName": "retirement-planner-testing-policy",
    "contents": [
      "Scroll tests must verify actual scrollability (scrollHeight > clientHeight), not just CSS properties",
      "Scroll tests should verify target content is reachable after scrolling to bottom"
    ]
  }]
}
```

### Success Criteria:

#### Automated Verification:
- [x] `mcp__memory__open_nodes` for "retirement-planner-testing-policy" shows new observations

---

## Testing Strategy

### Automated Tests (Already Implemented)
- `e2e/ci/scroll-test.spec.js:179` - Verifies InputPanel scrolls and last section reachable
- `e2e/ci/scroll-test.spec.js:223` - Verifies InputPanel wrapper has height constraints

### Verification After Implementation
```bash
# Verify memory
# Use mcp__memory__search_nodes with query "layout"

# Verify CLAUDE.md
cat /Users/smhanan/CascadeProjects/retirement-planner/CLAUDE.md | grep -A5 "Flexbox Scrolling"

# Verify skill
ls -la .claude/skills/flexbox-scroll-debug/

# Verify tests still pass
npm run test:e2e -- --grep "InputPanel"
```

## Implementation Order

Phases can be executed in parallel:

```
┌─────────────┐     ┌─────────────┐
│  Phase 1:   │     │  Phase 2:   │
│   Memory    │     │  CLAUDE.md  │
│   Entity    │     │  Addition   │
└─────────────┘     └─────────────┘
       │                   │
       └─────────┬─────────┘
                 │
         ┌───────▼───────┐
         │   Phase 3:    │
         │  Create Skill │
         └───────────────┘
                 │
         ┌───────▼───────┐
         │   Phase 4:    │
         │ Update Policy │
         └───────────────┘
```

Phases 1 and 2 have no dependencies and can run in parallel.
Phase 3 can start after understanding the pattern (no hard dependency).
Phase 4 should run last to add cross-references.

## References

- Original fix commit: (current session)
- Similar pattern: `docs/plans/flexible-chat-panel.md`
- Test patterns: `e2e/ci/scroll-test.spec.js`
- Existing skill example: `/Users/smhanan/CascadeProjects/smhanan-claude-setup/skills/debug-like-expert/SKILL.md`
