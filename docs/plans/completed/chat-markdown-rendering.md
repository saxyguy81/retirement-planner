# AI Chat Markdown Rendering & Enhanced UX Implementation Plan

## Overview

Add full markdown rendering support to the AI Chat component, enabling proper display of tables, formatted text, code blocks with syntax highlighting, images, and clickable in-app navigation links. Additionally, enhance the loading/waiting experience with engaging animations and real-time status updates.

## Current State Analysis

### What Exists Now
- **Plain text rendering** with `whitespace-pre-wrap` at `Chat/index.jsx:632`
- **No markdown libraries** installed
- **Markdown generation** exists (`snapshotCapture.js` generates tables) but displays as raw text
- **No HTML sanitization** - not needed currently since only plain text is rendered
- **Basic loading state** - Simple "Thinking..." text with spinning loader icon
- **Tool call indicators** - Small bubbles showing tool name and status (running/complete)

### Key Problems
1. AI-generated tables (from `capture_snapshot` tool) render as raw markdown text
2. No way to render formatted explanations (bold, lists, headers)
3. No clickable links for in-app navigation
4. Code/formula explanations lack syntax highlighting
5. **Boring loading experience** - Just a static "Thinking..." message
6. **Minimal status feedback** - No insight into what the AI is doing during longer operations

### Key Discoveries
- `Chat/index.jsx:632` - Main message rendering location
- `Chat/index.jsx:674` - Streaming content rendering
- `Chat/index.jsx:685-694` - Loading state ("Thinking..." message)
- `Chat/index.jsx:658-665` - Tool call indicators (ToolCallBubble component)
- `Chat/index.jsx:83-98` - ToolCallBubble component definition
- App uses tab-based navigation via `onNavigate` prop (not React Router)
- Dark theme with slate colors
- `TOOL_UI_CONFIG` in `aiService.js` provides icons and labels for each tool

## Desired End State

After implementation:
1. **Tables** render as proper HTML tables with styling
2. **Text formatting** (bold, italic, lists, headers) renders correctly
3. **In-app links** like `[View Projections](#projections)` navigate to tabs
4. **External links** open in new tabs with security attributes
5. **Images** render from any HTTPS source
6. **Code blocks** display with full syntax highlighting
7. **Security** - All content sanitized to prevent XSS
8. **Engaging loading experience** with animated indicators and status messages
9. **Real-time tool progress** showing what the AI is doing with animated transitions

### Verification
- Ask AI "Show me a table of my projections for the next 5 years" - renders as table
- Ask AI to explain something with formatting - renders bold/lists correctly
- Click an in-app link - navigates to correct tab
- Paste markdown with script tags - safely escaped
- While AI is thinking - see animated loading indicator with rotating status messages
- When AI calls tools - see animated progress with descriptive labels

## What We're NOT Doing

- **No React Router integration** - App uses custom tab navigation
- **No LaTeX/math rendering** - Not needed for this use case
- **No file upload/image insertion by user** - AI-provided images only
- **No markdown editor for user input** - User input remains plain text

## Implementation Approach

Use `react-markdown` with plugins for GFM (tables) and security sanitization. Create a `MarkdownMessage` component that handles all rendering, including custom link handlers for in-app navigation.

## Phase 1: Core Dependencies & Basic Markdown

### Overview
Install required packages and create basic markdown rendering component.

### Changes Required:

#### 1. Install Dependencies
```bash
npm install react-markdown remark-gfm rehype-sanitize
npm install -D @tailwindcss/typography
```

#### 2. Update Tailwind Config
**File**: `tailwind.config.js`
**Changes**: Add typography plugin

```javascript
module.exports = {
  // ... existing config
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

#### 3. Create MarkdownMessage Component
**File**: `src/components/Chat/MarkdownMessage.jsx` (new file)
**Changes**: Create reusable markdown renderer

```jsx
/**
 * MarkdownMessage - Renders markdown content safely
 *
 * Features:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists)
 * - Sanitized HTML output (XSS protection)
 * - Custom link handling for in-app navigation
 * - Dark theme styling
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { memo } from 'react';

// Prose classes for dark theme styling
const PROSE_CLASSES = [
  'prose',
  'prose-sm',
  'prose-invert',
  'max-w-none',
  // Customize specific elements for chat context
  'prose-p:my-1',
  'prose-headings:my-2',
  'prose-ul:my-1',
  'prose-ol:my-1',
  'prose-li:my-0',
  'prose-table:my-2',
  'prose-pre:my-2',
  'prose-code:text-purple-300',
  'prose-a:text-purple-400',
].join(' ');

function MarkdownMessage({ content, onNavigate }) {
  return (
    <div className={PROSE_CLASSES}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Custom link handler - see Phase 2
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownMessage);
```

#### 4. Update Chat Component to Use MarkdownMessage
**File**: `src/components/Chat/index.jsx`
**Changes**: Import and use MarkdownMessage for assistant messages

```jsx
// Add import at top
import MarkdownMessage from './MarkdownMessage';

// Replace line 632 (assistant message content):
// FROM:
<div className="whitespace-pre-wrap text-sm">{msg.content}</div>

// TO:
{msg.role === 'assistant' ? (
  <MarkdownMessage content={msg.content} onNavigate={onNavigate} />
) : (
  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
)}

// Also update streaming content at line 674:
// FROM:
<div className="whitespace-pre-wrap text-sm text-slate-200">
  {streamingContent}
  ...
</div>

// TO:
<div className="text-sm text-slate-200">
  <MarkdownMessage content={streamingContent} onNavigate={onNavigate} />
  <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] `npm install` completes without errors
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] `npm test` - all existing tests pass
- [x] `npm run test:e2e` - all e2e tests pass

#### Manual Verification:
- [x] Ask AI for a table - renders as formatted table
- [x] Ask AI to explain with bullet points - renders as list
- [x] Bold and italic text renders correctly
- [x] Headers render with proper sizing
- [x] Chat still scrolls properly with long content

---

## Phase 2: In-App Navigation Links

### Overview
Enable special link syntax for navigating to app tabs (projections, scenarios, settings).

### Changes Required:

#### 1. Define Navigation Link Pattern
Use anchor-style links: `#projections`, `#scenarios`, `#settings`, `#chat`

#### 2. Update MarkdownMessage Link Handler
**File**: `src/components/Chat/MarkdownMessage.jsx`
**Changes**: Add in-app link detection and navigation

```jsx
// Update the 'a' component in MarkdownMessage:

a: ({ href, children, ...props }) => {
  // In-app navigation links (e.g., #projections, #scenarios)
  if (href?.startsWith('#')) {
    const tab = href.slice(1); // Remove '#'
    const validTabs = ['projections', 'scenarios', 'settings', 'chat'];

    if (validTabs.includes(tab)) {
      return (
        <button
          onClick={() => onNavigate?.(tab)}
          className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
          {...props}
        >
          {children}
        </button>
      );
    }
  }

  // External links - open in new tab
  const isExternal = href?.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="text-purple-400 hover:text-purple-300 underline"
      {...props}
    >
      {children}
      {isExternal && <span className="ml-1 text-xs">↗</span>}
    </a>
  );
},
```

#### 3. Update AI System Prompt (Optional Enhancement)
**File**: `src/lib/aiService.js`
**Changes**: Tell the AI about the link syntax

Add to `SYSTEM_PROMPT`:
```javascript
// Add to SYSTEM_PROMPT around line 274:
`
When referencing other parts of the app, use markdown links:
- [View Projections](#projections)
- [View Scenarios](#scenarios)
- [Open Settings](#settings)
`
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] Unit tests pass

#### Manual Verification:
- [x] Type `[Go to Projections](#projections)` in AI response - clicking navigates
- [x] External links show ↗ icon
- [x] External links open in new tab
- [x] Invalid tab links render as regular text (no crash)

---

## Phase 3: Image Rendering

### Overview
Allow all HTTPS images to render with proper styling and error handling.

### Changes Required:

#### 1. Add Image Component
**File**: `src/components/Chat/MarkdownMessage.jsx`
**Changes**: Add image component with styling and error handling

```jsx
// Add to components prop:
img: ({ src, alt, ...props }) => {
  // Only allow HTTPS and data URLs
  const isSecure = src?.startsWith('https://') || src?.startsWith('data:image/');

  if (!isSecure) {
    return (
      <span className="text-slate-500 italic text-xs">
        [Image blocked: requires HTTPS]
      </span>
    );
  }

  return (
    <figure className="my-3">
      <img
        src={src}
        alt={alt || 'Image'}
        loading="lazy"
        className="max-w-full h-auto rounded-lg border border-slate-700 hover:border-purple-500 transition-colors"
        style={{ maxHeight: '400px' }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.querySelector('.error-msg')?.classList.remove('hidden');
        }}
        {...props}
      />
      <span className="error-msg hidden text-slate-500 italic text-xs">
        [Image failed to load]
      </span>
      {alt && (
        <figcaption className="text-xs text-slate-500 mt-1 text-center">
          {alt}
        </figcaption>
      )}
    </figure>
  );
},
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes

#### Manual Verification:
- [x] HTTPS images render correctly with border styling
- [x] HTTP images show "requires HTTPS" message
- [x] Images have proper sizing constraints (max-height 400px)
- [x] Failed images show error message gracefully
- [x] Alt text displays as centered caption
- [x] Images have hover effect (purple border)

---

## Phase 4: Code Block Syntax Highlighting

### Overview
Add full syntax highlighting for code blocks using react-syntax-highlighter.

### Changes Required:

#### 1. Install Syntax Highlighter
```bash
npm install react-syntax-highlighter
```

#### 2. Add Code Block Component
**File**: `src/components/Chat/MarkdownMessage.jsx`
**Changes**: Add code block handler with full syntax highlighting

```jsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Add to components:
code: ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  // Inline code
  if (inline) {
    return (
      <code
        className="bg-slate-700 text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Code blocks with syntax highlighting
  if (match) {
    return (
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        showLineNumbers={String(children).split('\n').length > 5}
        customStyle={{
          margin: '0.5rem 0',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  }

  // Code blocks without language specifier
  return (
    <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto text-xs my-2 font-mono">
      <code {...props}>{children}</code>
    </pre>
  );
},
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] Bundle size increase is reasonable (~25KB gzipped for syntax highlighter)

#### Manual Verification:
- [x] Inline code renders with purple text on slate background
- [x] Code blocks have full syntax highlighting
- [x] JavaScript, Python, and other common languages have proper colors
- [x] Line numbers appear for blocks > 5 lines
- [x] Code blocks are horizontally scrollable for long lines

---

## Phase 5: Enhanced Loading Experience

### Overview
Transform the boring "Thinking..." state into an engaging, informative experience with animations, rotating status messages, and real-time tool progress visualization.

### Changes Required:

#### 1. Create ThinkingIndicator Component
**File**: `src/components/Chat/ThinkingIndicator.jsx` (new file)
**Changes**: Create animated thinking indicator with rotating messages

```jsx
/**
 * ThinkingIndicator - Animated loading state for AI responses
 *
 * Features:
 * - Animated brain/thinking icon
 * - Rotating status messages
 * - Smooth transitions
 * - Elapsed time display
 */

import { useState, useEffect } from 'react';
import { Brain, Sparkles, Lightbulb, Calculator, Search } from 'lucide-react';

const THINKING_MESSAGES = [
  { text: 'Analyzing your question...', icon: Brain },
  { text: 'Crunching the numbers...', icon: Calculator },
  { text: 'Searching for insights...', icon: Search },
  { text: 'Formulating response...', icon: Lightbulb },
  { text: 'Almost there...', icon: Sparkles },
];

const MESSAGE_ROTATE_INTERVAL = 3000; // 3 seconds

export function ThinkingIndicator({ startTime }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % THINKING_MESSAGES.length);
    }, MESSAGE_ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Track elapsed time
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const currentMessage = THINKING_MESSAGES[messageIndex];
  const Icon = currentMessage.icon;

  return (
    <div className="flex gap-3 justify-start" data-testid="thinking-indicator">
      {/* Animated avatar */}
      <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 relative">
        <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
        <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
      </div>

      {/* Message bubble */}
      <div className="bg-slate-800 rounded-lg px-4 py-3 max-w-[80%]">
        {/* Animated dots */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Rotating message with icon */}
        <div className="flex items-center gap-2 text-slate-300 text-sm transition-all duration-300">
          <Icon className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="animate-fade-in">{currentMessage.text}</span>
        </div>

        {/* Elapsed time (show after 5 seconds) */}
        {elapsed >= 5 && (
          <div className="text-xs text-slate-500 mt-2">
            {elapsed}s elapsed
          </div>
        )}
      </div>
    </div>
  );
}

export default ThinkingIndicator;
```

#### 2. Create Enhanced ToolCallProgress Component
**File**: `src/components/Chat/ToolCallProgress.jsx` (new file)
**Changes**: Create animated tool call progress visualization

```jsx
/**
 * ToolCallProgress - Animated tool execution visualization
 *
 * Shows what the AI is doing with engaging animations
 */

import { Check, Loader2 } from 'lucide-react';
import { TOOL_UI_CONFIG } from '../../lib/aiService';

function ToolStep({ tool, isActive, isComplete }) {
  const config = TOOL_UI_CONFIG[tool.name] || { icon: '🔧', label: tool.name };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300
        ${isActive ? 'bg-purple-900/30 border border-purple-700 scale-105' : ''}
        ${isComplete ? 'bg-emerald-900/20 border border-emerald-800' : ''}
        ${!isActive && !isComplete ? 'bg-slate-800/50 opacity-60' : ''}
      `}
      data-testid="tool-step"
    >
      {/* Icon */}
      <span className="text-lg">{config.icon}</span>

      {/* Label */}
      <span className={`text-sm flex-1 ${isActive ? 'text-purple-200' : isComplete ? 'text-emerald-200' : 'text-slate-400'}`}>
        {config.label}
      </span>

      {/* Status indicator */}
      {isActive && (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-xs text-purple-400">Running...</span>
        </div>
      )}
      {isComplete && (
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-400">Done</span>
        </div>
      )}
    </div>
  );
}

export function ToolCallProgress({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="flex gap-3 justify-start" data-testid="tool-progress">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
      </div>

      {/* Tool steps */}
      <div className="flex-1 max-w-[80%]">
        <div className="text-xs text-slate-400 mb-2">Working on your request...</div>
        <div className="space-y-2">
          {toolCalls.map((tool, idx) => (
            <ToolStep
              key={tool.id || idx}
              tool={tool}
              isActive={tool.status === 'running'}
              isComplete={tool.status === 'complete'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ToolCallProgress;
```

#### 3. Add CSS Animations to Tailwind Config
**File**: `tailwind.config.js`
**Changes**: Add custom animations

```javascript
module.exports = {
  // ... existing config
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

#### 4. Update Chat Component to Use New Components
**File**: `src/components/Chat/index.jsx`
**Changes**: Replace old loading indicators with new animated ones

```jsx
// Add imports
import ThinkingIndicator from './ThinkingIndicator';
import ToolCallProgress from './ToolCallProgress';

// Add state for tracking when loading started
const [loadingStartTime, setLoadingStartTime] = useState(null);

// Update sendMessage to track start time
const sendMessage = useCallback(async () => {
  // ... existing code
  setIsLoading(true);
  setLoadingStartTime(Date.now()); // Add this line
  // ... rest of function
});

// In finally block, reset start time
finally {
  setIsLoading(false);
  setLoadingStartTime(null); // Add this line
  // ... rest of finally
}

// Replace the old loading display (lines 685-694):
// FROM:
{isLoading && !streamingContent && activeToolCalls.length === 0 && (
  <div className="flex gap-3 justify-start">
    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
    </div>
    <div className="bg-slate-800 rounded-lg px-4 py-2">
      <div className="text-slate-400 text-sm">Thinking...</div>
    </div>
  </div>
)}

// TO:
{isLoading && !streamingContent && activeToolCalls.length === 0 && (
  <ThinkingIndicator startTime={loadingStartTime} />
)}

// Replace the tool call indicators (lines 658-665):
// FROM:
{activeToolCalls.length > 0 && (
  <div className="flex flex-wrap gap-2 ml-11" data-testid="tool-call-indicators">
    {activeToolCalls.map(tc => (
      <ToolCallBubble key={tc.id} name={tc.name} status={tc.status} />
    ))}
  </div>
)}

// TO:
{activeToolCalls.length > 0 && (
  <ToolCallProgress toolCalls={activeToolCalls} />
)}
```

#### 5. (Optional) Add Skeleton Loading for Streaming
**File**: `src/components/Chat/index.jsx`
**Changes**: Add skeleton pulse effect before first character arrives

```jsx
// When streaming starts but no content yet, show skeleton
{isLoading && streamingContent === '' && activeToolCalls.length === 0 && (
  <div className="flex gap-3 justify-start">
    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
      <Bot className="w-4 h-4 text-purple-400" />
    </div>
    <div className="bg-slate-800 rounded-lg px-4 py-3 max-w-[60%]">
      {/* Skeleton lines */}
      <div className="space-y-2 animate-pulse">
        <div className="h-3 bg-slate-700 rounded w-full" />
        <div className="h-3 bg-slate-700 rounded w-4/5" />
        <div className="h-3 bg-slate-700 rounded w-3/5" />
      </div>
    </div>
  </div>
)}
```

### Success Criteria:

#### Automated Verification:
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] New components have no TypeScript/ESLint errors

#### Manual Verification:
- [x] Thinking indicator shows animated bouncing dots
- [x] Status messages rotate every 3 seconds
- [x] Elapsed time appears after 5 seconds
- [x] Tool calls show as animated progress steps
- [x] Running tools have purple highlight and spinner
- [x] Completed tools show green checkmark
- [x] Animations are smooth (no jank)
- [x] Dark theme styling is consistent

---

## Phase 6: Testing & Polish

### Overview
Add unit tests and polish the implementation.

### Changes Required:

#### 1. Create Unit Tests
**File**: `src/components/Chat/MarkdownMessage.test.jsx` (new file)

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MarkdownMessage from './MarkdownMessage';

describe('MarkdownMessage', () => {
  it('renders plain text correctly', () => {
    render(<MarkdownMessage content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders markdown tables', () => {
    const table = `| Year | Value |
|------|-------|
| 2025 | $100K |`;
    render(<MarkdownMessage content={table} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('renders bold and italic text', () => {
    render(<MarkdownMessage content="**bold** and *italic*" />);
    expect(screen.getByText('bold')).toHaveStyle({ fontWeight: 'bold' });
  });

  it('handles in-app navigation links', () => {
    const onNavigate = vi.fn();
    render(
      <MarkdownMessage
        content="[Go to Projections](#projections)"
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText('Go to Projections'));
    expect(onNavigate).toHaveBeenCalledWith('projections');
  });

  it('opens external links in new tab', () => {
    render(<MarkdownMessage content="[Google](https://google.com)" />);
    const link = screen.getByText('Google');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('blocks non-HTTPS images', () => {
    render(<MarkdownMessage content="![alt](http://evil.com/image.png)" />);
    expect(screen.getByText(/Image blocked/)).toBeInTheDocument();
  });

  it('renders HTTPS images', () => {
    render(<MarkdownMessage content="![alt text](https://example.com/image.png)" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/image.png');
  });
});
```

#### 2. Update E2E Tests (if needed)
**File**: `e2e/ci/ai-chat-reload.spec.js`
**Changes**: Add test for markdown rendering if desired

### Success Criteria:

#### Automated Verification:
- [x] `npm test` - all unit tests pass including new tests (358 tests)
- [x] `npm run test:e2e` - all e2e tests pass (48 tests)
- [x] `npm run build` succeeds
- [x] Bundle size increase is acceptable (< 50KB gzipped)

#### Manual Verification:
- [x] Complete end-to-end test of all markdown features
- [x] No visual regressions in chat styling
- [x] Performance is acceptable with long markdown content
- [x] Copy button still works on markdown messages

---

## Testing Strategy

### Unit Tests
- MarkdownMessage component renders various markdown elements
- Link navigation callbacks fire correctly
- Image blocking works for HTTP sources
- XSS content is properly escaped
- ThinkingIndicator rotates messages correctly
- ToolCallProgress shows correct states

### Integration Tests
- Chat component correctly uses MarkdownMessage
- Streaming content updates properly
- Navigation integration works
- Loading states transition correctly

### Manual Testing Steps
1. Send "Show me a table of projections" - verify table renders
2. Send message with **bold** and *italic* - verify formatting
3. Click in-app link - verify navigation
4. Test with malicious markdown (script tags) - verify escaped
5. Test with very long markdown - verify scrolling
6. Test with images - verify HTTPS works, HTTP blocked
7. Watch loading animation - verify rotating messages and bouncing dots
8. Trigger tool calls - verify animated progress steps
9. Wait 5+ seconds - verify elapsed time appears

## Performance Considerations

- **Bundle size**: `react-markdown` + `remark-gfm` + `rehype-sanitize` adds ~40KB gzipped
- **Syntax highlighting**: `react-syntax-highlighter` adds ~25KB gzipped
- **Total addition**: ~65KB gzipped (acceptable for the feature set)
- **Rendering**: Memoize MarkdownMessage to prevent unnecessary re-renders
- **Streaming**: May need debouncing for very fast streaming updates
- **Animations**: Use CSS animations (GPU-accelerated) instead of JS animations
- **Cleanup**: Ensure all intervals/timers are cleaned up on unmount

## Migration Notes

- No database migration needed
- No breaking changes to existing chat history
- Stored messages (plain text) will now render with markdown styling
- Old messages containing markdown syntax will now render properly

## References

- Current Chat component: `src/components/Chat/index.jsx`
- Snapshot capture (generates markdown): `src/lib/snapshotCapture.js`
- AI service configuration: `src/lib/aiService.js`
- Tool UI config: `src/lib/aiService.js` (TOOL_UI_CONFIG)
- react-markdown docs: https://github.com/remarkjs/react-markdown
- react-syntax-highlighter: https://github.com/react-syntax-highlighter/react-syntax-highlighter
- Tailwind Typography: https://tailwindcss.com/docs/typography-plugin
- Tailwind Animations: https://tailwindcss.com/docs/animation
