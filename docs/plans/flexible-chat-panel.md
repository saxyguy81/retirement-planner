# Flexible Chat Panel Implementation Plan

## STATUS: IMPLEMENTED

## Overview

Redesign the Chat UI from a tab-based view to a dockable, resizable panel that can be positioned on the right side or top of the main content area. Users can drag the panel to reposition it, resize it, and toggle its visibility via the AI Chat tab.

## Current State Analysis

### Current Implementation
- Chat is a **tab** in the main content area (`App.jsx:777-789`)
- Selecting "AI Chat" tab replaces the entire main content with Chat
- Chat has its own 40px header (`h-10`) with controls: message count, token usage, clear button
- No way to view Chat alongside other content (projections, dashboard, etc.)

### Existing Patterns to Leverage
- `SplitPanel` has drag-to-resize with percentage-based sizing (`src/components/SplitPanel/index.jsx`)
- Mouse event handling pattern: attach to `document` during drag for smooth tracking
- Icons: `GripVertical`, `Maximize2`, `Minimize2`, `X` from lucide-react

### Key Files to Modify
- `src/App.jsx` - Layout restructuring, drop zone rendering
- `src/components/Chat/index.jsx` - Add panel mode with drag handle and close button

### New Files to Create
- `src/hooks/useChatPanelState.js` - State management + localStorage persistence

## Desired End State

1. Chat appears as a **docked panel** on right or top edge (user's choice)
2. Panel can be **resized** by dragging the edge divider
3. Panel can be **repositioned** by dragging header to a different edge
4. Position, size, and visibility **persist** across sessions
5. Clicking **AI Chat tab toggles** panel visibility
6. Panel is **hidden by default** on first use
7. When visible, panel **coexists** with other tab content

**Verification:**
- Panel appears on right edge when toggled on
- Dragging resize handle changes panel width/height
- Dragging panel header toward top edge shows drop zone indicator
- Releasing on drop zone repositions panel to top
- Refreshing page restores panel state
- All existing tab content renders correctly with panel visible

## What We're NOT Doing

- Floating/overlay mode (panel is always docked)
- Left edge docking (only right and top)
- Bottom edge docking (adds complexity, limited value)
- Multiple simultaneous panels
- Touch/mobile support (mouse only for now)
- Separate ChatPanel header (reuse Chat's existing header)

---

## Phase 1: State Management Hook

### Overview
Create a custom hook to manage chat panel state with localStorage persistence.

### Changes Required:

#### 1. Create useChatPanelState Hook
**File**: `src/hooks/useChatPanelState.js` (new file)

```javascript
/**
 * useChatPanelState Hook
 *
 * Manages chat panel visibility, position, size, and drag state.
 * Persists settings to localStorage.
 */
import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'retirement-planner-chat-panel';

const DEFAULT_STATE = {
  visible: false,
  position: 'right', // 'right' | 'top'
  size: 380, // pixels - width for right, height for top
};

const MIN_SIZE = 280;
const MAX_SIZE_PERCENT = 0.5; // 50% of container

export function useChatPanelState() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load chat panel state:', e);
    }
    return DEFAULT_STATE;
  });

  // Drag/resize state (not persisted)
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dropZone, setDropZone] = useState(null); // 'right' | 'top' | null
  const containerRef = useRef(null);

  // Persist to localStorage on change (only persistent state)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        visible: state.visible,
        position: state.position,
        size: state.size,
      }));
    } catch (e) {
      console.warn('Failed to save chat panel state:', e);
    }
  }, [state.visible, state.position, state.size]);

  // === Actions ===
  const toggleVisible = useCallback(() => {
    setState(prev => ({ ...prev, visible: !prev.visible }));
  }, []);

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  const setPosition = useCallback((position) => {
    setState(prev => ({ ...prev, position }));
  }, []);

  const setSize = useCallback((size) => {
    setState(prev => ({
      ...prev,
      size: Math.max(MIN_SIZE, size),
    }));
  }, []);

  // === Resize handlers ===
  const startResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResize = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let newSize;

    if (state.position === 'right') {
      newSize = rect.right - e.clientX;
    } else {
      newSize = e.clientY - rect.top;
    }

    const maxSize = (state.position === 'right' ? rect.width : rect.height) * MAX_SIZE_PERCENT;
    setSize(Math.min(maxSize, Math.max(MIN_SIZE, newSize)));
  }, [isResizing, state.position, setSize]);

  const endResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  // === Drag handlers (for repositioning) ===
  const startDrag = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Determine which edge is closest
    const distToRight = rect.width - x;
    const distToTop = y;

    // Threshold for showing drop zone
    if (distToRight < 120 && distToTop > 100) {
      setDropZone('right');
    } else if (distToTop < 100) {
      setDropZone('top');
    } else {
      setDropZone(null);
    }
  }, [isDragging]);

  const endDrag = useCallback(() => {
    if (dropZone && dropZone !== state.position) {
      setPosition(dropZone);
    }
    setIsDragging(false);
    setDropZone(null);
  }, [dropZone, state.position, setPosition]);

  // Attach document-level mouse events during drag/resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', endResize);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', endResize);
      };
    }
  }, [isResizing, handleResize, endResize]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', endDrag);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', endDrag);
      };
    }
  }, [isDragging, handleDrag, endDrag]);

  return {
    // State
    visible: state.visible,
    position: state.position,
    size: state.size,
    isDragging,
    isResizing,
    dropZone,
    containerRef,

    // Constants
    MIN_SIZE,
    MAX_SIZE_PERCENT,

    // Actions
    toggleVisible,
    hide,
    setPosition,
    setSize,

    // Drag/resize handlers
    startDrag,
    startResize,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [x] File exists: `src/hooks/useChatPanelState.js`
- [x] No lint errors: `npm run lint`
- [x] Unit tests pass: `npm test`

#### Manual Verification:
- [x] Hook can be imported without errors

---

## Phase 2: Modify Chat Component for Panel Mode

### Overview
Add panel mode to the Chat component. When in panel mode, the header becomes draggable for repositioning and includes a close button. This avoids having two headers (which wastes vertical space).

### Changes Required:

#### 1. Add Panel Mode Props to Chat
**File**: `src/components/Chat/index.jsx`
**Location**: Component props

Add new props:
```javascript
export function Chat({
  params,
  projections,
  summary,
  scenarios,
  onCreateScenario,
  onUpdateParams,
  onNavigate,
  settings,
  options,
  // New panel mode props
  panelMode = false,
  onClose,
  onDragStart,
  isDragging = false,
}) {
```

#### 2. Update Header for Panel Mode
**File**: `src/components/Chat/index.jsx`
**Location**: Header section (around line 1041-1082)

Modify the header to be draggable in panel mode:

```javascript
{/* Header */}
<div
  className={`h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-3 justify-between shrink-0 ${
    panelMode ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
  }`}
  onMouseDown={panelMode ? onDragStart : undefined}
>
  <div className="flex items-center gap-2">
    <MessageCircle className="w-4 h-4 text-purple-400" />
    <span className="text-slate-200 font-medium">AI Assistant</span>
    {panelMode && (
      <span className="text-slate-500 text-[10px]">(drag to reposition)</span>
    )}
    <span className="text-slate-500">({messages.length} messages)</span>
    {/* ... rest of token usage, context warnings ... */}
  </div>
  <div className="flex items-center gap-2">
    <button
      onClick={clearHistory}
      className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 hover:bg-slate-600"
      title="Start a new chat session"
      data-testid="new-chat-button"
      onMouseDown={(e) => e.stopPropagation()} // Prevent drag
    >
      <Trash2 className="w-3 h-3" />
      New Chat
    </button>
    {/* Close button - only in panel mode */}
    {panelMode && onClose && (
      <button
        onClick={onClose}
        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
        title="Close panel (toggle with AI Chat tab)"
        onMouseDown={(e) => e.stopPropagation()} // Prevent drag
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
</div>
```

#### 3. Import X Icon
**File**: `src/components/Chat/index.jsx`
**Location**: Imports

Add `X` to the lucide-react imports:
```javascript
import { ..., X } from 'lucide-react';
```

### Success Criteria:

#### Automated Verification:
- [x] No lint errors: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] Existing Chat tests pass: `npm test`

#### Manual Verification:
- [x] Chat still works normally when panelMode=false
- [x] Header shows "(drag to reposition)" when panelMode=true
- [x] Close button appears when panelMode=true and onClose provided

---

## Phase 3: App Layout Integration

### Overview
Restructure App.jsx layout to:
1. Render the Chat as a docked panel instead of a tab
2. Render resize handles and drop zone overlays at App level
3. Pass containerRef from hook to wrapper for accurate sizing

### Changes Required:

#### 1. Import Hook
**File**: `src/App.jsx`
**Location**: Near imports at top

```javascript
import { useChatPanelState } from './hooks/useChatPanelState';
import { GripVertical, GripHorizontal } from 'lucide-react';
```

Note: `Chat` is already imported. No separate ChatPanel component needed.

#### 2. Add Hook Usage
**File**: `src/App.jsx`
**Location**: Inside App component, near other useState calls

```javascript
// Chat panel state with persistence
const chatPanel = useChatPanelState();
```

#### 3. Modify Tab Click Handler
**File**: `src/App.jsx`
**Location**: In the tab button's onClick handler (around line 672)

Change the AI Chat tab to toggle the panel instead of switching tabs:

```javascript
{TABS.map(tab => {
  // Chat tab toggles panel visibility instead of switching tabs
  const isActive = tab.id === 'chat' ? chatPanel.visible : activeTab === tab.id;

  return (
    <button
      key={tab.id}
      onClick={() => {
        if (tab.id === 'chat') {
          chatPanel.toggleVisible();
        } else {
          setActiveTab(tab.id);
        }
      }}
      // ... rest unchanged
      className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
        isActive
          ? 'bg-slate-700 text-slate-100'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <tab.icon className="w-3.5 h-3.5" />
      {tab.label}
    </button>
  );
})}
```

#### 4. Restructure Main Content Layout
**File**: `src/App.jsx`
**Location**: The main content area (around line 656-801)

Replace the current structure with a flex container that renders drop zones and handles resize.

```jsx
<main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
  {/* Tab bar - unchanged */}
  <div className="h-9 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-1 shrink-0">
    {/* ... tab buttons ... */}
  </div>

  {/* Content + Chat wrapper - attach containerRef here */}
  <div
    ref={chatPanel.containerRef}
    className={`flex-1 flex overflow-hidden relative ${
      chatPanel.visible && chatPanel.position === 'top' ? 'flex-col' : 'flex-row'
    }`}
    style={{
      cursor: chatPanel.isResizing
        ? (chatPanel.position === 'right' ? 'col-resize' : 'row-resize')
        : 'auto',
    }}
  >
    {/* Drop zone indicators - rendered at container level */}
    {chatPanel.isDragging && (
      <>
        {/* Right drop zone */}
        <div
          className={`absolute z-50 pointer-events-none transition-opacity duration-150 ${
            chatPanel.dropZone === 'right' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            right: 0,
            top: 0,
            bottom: 0,
            width: '120px',
            background: 'linear-gradient(to left, rgba(59, 130, 246, 0.3), transparent)',
            borderRight: '3px solid rgb(59, 130, 246)',
          }}
        />
        {/* Top drop zone */}
        <div
          className={`absolute z-50 pointer-events-none transition-opacity duration-150 ${
            chatPanel.dropZone === 'top' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: 0,
            right: 0,
            top: 0,
            height: '100px',
            background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.3), transparent)',
            borderTop: '3px solid rgb(59, 130, 246)',
          }}
        />
      </>
    )}

    {/* TOP POSITION: Chat panel above content */}
    {chatPanel.visible && chatPanel.position === 'top' && (
      <>
        {/* Chat panel */}
        <div
          className="flex flex-col overflow-hidden bg-slate-950 border-b border-slate-700 shrink-0"
          style={{
            height: `${chatPanel.size}px`,
            transition: chatPanel.isResizing ? 'none' : 'height 0.15s ease',
          }}
        >
          <Chat
            params={params}
            projections={projections}
            summary={summary}
            scenarios={chatScenarios}
            onCreateScenario={handleCreateScenarioFromChat}
            onUpdateParams={updateParams}
            onNavigate={tab => setActiveTab(tab)}
            settings={settings}
            options={options}
            panelMode={true}
            onClose={chatPanel.hide}
            onDragStart={chatPanel.startDrag}
            isDragging={chatPanel.isDragging}
          />
        </div>
        {/* Resize handle */}
        <div
          className={`h-1 w-full cursor-row-resize shrink-0 flex items-center justify-center group ${
            chatPanel.isResizing ? 'bg-blue-500' : 'bg-slate-700 hover:bg-blue-500'
          }`}
          onMouseDown={chatPanel.startResize}
        >
          <GripHorizontal className="w-4 h-4 text-slate-500 group-hover:text-white" />
        </div>
      </>
    )}

    {/* Main tab content area */}
    <div className="flex-1 flex flex-col overflow-hidden">
      {splitView ? (
        <SplitPanel
          views={splitPanelViews}
          defaultLeftView="projections"
          defaultRightView="dashboard"
        />
      ) : (
        <LazyErrorBoundary>
          {activeTab === 'projections' && (
            <ProjectionsTable ... />
          )}
          {activeTab === 'dashboard' && (
            <Suspense fallback={<LazyLoadingFallback />}>
              <Dashboard ... />
            </Suspense>
          )}
          {/* ... other tabs ... */}
          {/* REMOVE the chat tab conditional - it's now a panel */}
        </LazyErrorBoundary>
      )}
    </div>

    {/* RIGHT POSITION: Resize handle + Chat panel */}
    {chatPanel.visible && chatPanel.position === 'right' && (
      <>
        {/* Resize handle */}
        <div
          className={`w-1 h-full cursor-col-resize shrink-0 flex items-center justify-center group ${
            chatPanel.isResizing ? 'bg-blue-500' : 'bg-slate-700 hover:bg-blue-500'
          }`}
          onMouseDown={chatPanel.startResize}
        >
          <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-white" />
        </div>
        {/* Chat panel */}
        <div
          className="flex flex-col overflow-hidden bg-slate-950 border-l border-slate-700 shrink-0"
          style={{
            width: `${chatPanel.size}px`,
            transition: chatPanel.isResizing ? 'none' : 'width 0.15s ease',
          }}
        >
          <Chat
            params={params}
            projections={projections}
            summary={summary}
            scenarios={chatScenarios}
            onCreateScenario={handleCreateScenarioFromChat}
            onUpdateParams={updateParams}
            onNavigate={tab => setActiveTab(tab)}
            settings={settings}
            options={options}
            panelMode={true}
            onClose={chatPanel.hide}
            onDragStart={chatPanel.startDrag}
            isDragging={chatPanel.isDragging}
          />
        </div>
      </>
    )}
  </div>
</main>
```

#### 5. Remove Chat from Tab Content
**File**: `src/App.jsx`
**Location**: Tab content conditional rendering

Remove the conditional rendering for chat tab (around line 777-789):
```javascript
// REMOVE this entire block:
{activeTab === 'chat' && (
  <Chat
    params={params}
    projections={projections}
    summary={summary}
    scenarios={chatScenarios}
    onCreateScenario={handleCreateScenarioFromChat}
    onUpdateParams={updateParams}
    onNavigate={tab => setActiveTab(tab)}
    settings={settings}
    options={options}
  />
)}
```

### Success Criteria:

#### Automated Verification:
- [x] No lint errors: `npm run lint`
- [x] Build succeeds: `npm run build`
- [x] Unit tests pass: `npm test`

#### Manual Verification:
- [x] App loads without errors
- [x] Clicking AI Chat tab shows panel on right side
- [x] Clicking AI Chat tab again hides panel
- [x] Other tabs still work correctly (projections, dashboard, etc.)
- [x] Panel coexists with other tab content
- [x] Drop zones appear when dragging panel header
- [x] Resize handle changes panel size

---

## Phase 4: Refinements and Edge Cases

### Overview
Handle edge cases, improve UX, and ensure robustness.

### Changes Required:

#### 1. Handle Initial activeTab State
**File**: `src/App.jsx`

If user was on chat tab before, redirect to projections:
```javascript
const [activeTab, setActiveTab] = useState(() => {
  // If previously on chat, start on projections since chat is now a panel
  const saved = localStorage.getItem('activeTab');
  return saved === 'chat' ? 'projections' : (saved || 'projections');
});
```

#### 2. Add Keyboard Shortcut
**File**: `src/App.jsx`

Add Cmd/Ctrl+Shift+C to toggle chat panel:
```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
      e.preventDefault();
      chatPanel.toggleVisible();
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [chatPanel.toggleVisible]);
```

#### 3. Update E2E Tests
**File**: `e2e/ci/ai-chat.spec.js` and `e2e/local/ai-chat.spec.js`

Update selectors and assertions to work with new panel structure:
- Chat is now toggled, not navigated to
- Panel has different container structure
- Update any tab-click assertions

#### 4. Handle SplitView with ChatPanel
Ensure ChatPanel works correctly when SplitView is enabled:
- ChatPanel should still appear on edge
- SplitPanel content should shrink to accommodate

### Success Criteria:

#### Automated Verification:
- [x] E2E tests pass: `npm run test:e2e`
- [x] No console errors on page load
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Keyboard shortcut (Cmd/Ctrl+Shift+C) toggles panel
- [x] Panel works with SplitView enabled
- [x] Panel state persists after refresh
- [x] Resizing panel works smoothly
- [x] Dragging panel to top edge repositions it
- [x] Dragging panel back to right edge works
- [x] Drop zone indicators appear during drag

---

## Testing Strategy

### Unit Tests:
- `useChatPanelState` hook: state transitions, localStorage persistence
- ChatPanel: resize calculations, position changes

### Integration Tests:
- Panel toggle via tab click
- Panel coexistence with different tabs
- State persistence across page reload

### Manual Testing Steps:
1. Load app, verify chat panel is hidden
2. Click AI Chat tab, verify panel appears on right
3. Click AI Chat tab again, verify panel hides
4. Show panel, drag resize handle, verify size changes
5. Drag panel header toward top edge, verify drop zone appears
6. Release on top, verify panel repositions
7. Refresh page, verify position/size persist
8. Enable SplitView, verify panel still works
9. Test keyboard shortcut (Cmd/Ctrl+Shift+C)
10. Test on different viewport sizes

---

## Performance Considerations

1. **Re-render Optimization**: ChatPanel uses `useCallback` for all handlers
2. **Transition Performance**: CSS transitions disabled during drag for 60fps
3. **Memory**: Chat component instance persists when hidden (maintains state)
4. **localStorage**: Only writes on state change, not on every render

---

## Migration Notes

- No data migration needed
- Users' saved AI configurations remain intact
- E2E tests need updates for new panel structure
- If user had activeTab='chat' saved, redirect to 'projections'

---

## References

- Existing resize pattern: `src/components/SplitPanel/index.jsx`
- Chat component: `src/components/Chat/index.jsx`
- App layout: `src/App.jsx:656-801`
