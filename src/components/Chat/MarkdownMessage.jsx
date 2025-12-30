/**
 * MarkdownMessage - Renders markdown content safely
 *
 * Features:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists)
 * - Sanitized HTML output (XSS protection)
 * - Custom link handling for in-app navigation
 * - Syntax highlighting for code blocks
 * - HTTPS-only image rendering
 * - Dark theme styling
 */

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

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

// Valid in-app navigation tabs
const VALID_TABS = ['projections', 'scenarios', 'settings', 'chat'];

function MarkdownMessage({ content, onNavigate }) {
  return (
    <div className={PROSE_CLASSES}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Custom link handler for in-app navigation and external links
          a: ({ href, children, ...props }) => {
            // In-app navigation links (e.g., #projections, #scenarios)
            if (href?.startsWith('#')) {
              const tab = href.slice(1); // Remove '#'

              if (VALID_TABS.includes(tab)) {
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
                {isExternal && <span className="ml-1 text-xs">&#8599;</span>}
              </a>
            );
          },

          // Image handler - only allow HTTPS images
          img: ({ src, alt, ...props }) => {
            const isSecure = src?.startsWith('https://');

            if (!isSecure) {
              return (
                <span className="text-slate-500 italic text-xs">
                  [Image blocked: requires HTTPS]
                </span>
              );
            }

            return (
              <img
                src={src}
                alt={alt || 'Image'}
                loading="lazy"
                className="max-w-full h-auto rounded-lg border border-slate-700 hover:border-purple-500 transition-colors my-2"
                style={{ maxHeight: '400px' }}
                onError={e => {
                  e.target.style.display = 'none';
                }}
                {...props}
              />
            );
          },

          // Code block handler with syntax highlighting
          code: ({ inline, className, children, ...props }) => {
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownMessage);
