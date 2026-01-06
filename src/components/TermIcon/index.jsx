/**
 * TermIcon Component (Phase 8)
 *
 * Displays a small info icon that shows a tooltip with the term definition
 * on hover/focus. Accessible via keyboard navigation.
 */

import { Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { TERM_REFERENCE, ROWS_WITH_TERMS, findTermInLabel } from '../../lib/termReference';

/**
 * Calculate tooltip position to keep it within viewport
 */
function useTooltipPosition(buttonRef, isVisible) {
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top' });

  useEffect(() => {
    if (!isVisible || !buttonRef.current) return;

    const button = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = 256; // w-64 = 16rem = 256px
    const tooltipHeight = 100; // approximate height
    const padding = 8;

    let top = button.top - tooltipHeight - padding;
    let left = button.left + button.width / 2 - tooltipWidth / 2;
    let placement = 'top';

    // Flip to bottom if too close to top
    if (top < padding) {
      top = button.bottom + padding;
      placement = 'bottom';
    }

    // Constrain horizontal to viewport
    const viewportWidth = window.innerWidth;
    if (left < padding) {
      left = padding;
    } else if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }

    setPosition({ top, left, placement });
  }, [isVisible, buttonRef]);

  return position;
}

export function TermIcon({ term }) {
  const ref = TERM_REFERENCE[term];
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef(null);
  const position = useTooltipPosition(buttonRef, showTooltip);

  if (!ref) return null;

  return (
    <span className="relative inline-block align-middle">
      <button
        ref={buttonRef}
        type="button"
        className="text-blue-400/50 hover:text-blue-400 focus:text-blue-400 focus:outline-none ml-1 align-middle"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`Definition of ${term}`}
        aria-describedby={showTooltip ? `term-tooltip-${term}` : undefined}
      >
        <Info className="w-3 h-3 inline" aria-hidden="true" />
      </button>

      {showTooltip &&
        createPortal(
          <div
            id={`term-tooltip-${term}`}
            role="tooltip"
            className="fixed z-[9999] w-64 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl pointer-events-none"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {/* Arrow indicator */}
            <div
              className={`absolute w-2 h-2 bg-slate-800 border-slate-600 transform rotate-45 ${
                position.placement === 'top'
                  ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b'
                  : 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t'
              }`}
            />
            <div className="text-blue-400 text-xs font-medium">{ref.full}</div>
            <div className="text-slate-300 text-xs mt-1 leading-relaxed">{ref.definition}</div>
            {ref.source && (
              <div className="text-slate-500 text-[10px] mt-1.5">Source: {ref.source}</div>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}

/**
 * Label with auto-detected term icon
 * Wraps a label and adds a term icon if the label contains a known term
 */
export function LabelWithTerm({ label, fieldKey }) {
  // First check if fieldKey has a direct mapping
  const directTerm = ROWS_WITH_TERMS[fieldKey];

  if (directTerm) {
    return (
      <span className="flex items-center gap-1">
        {label}
        <TermIcon term={directTerm} />
      </span>
    );
  }

  // Otherwise, try auto-detecting from label text
  const autoTerm = findTermInLabel(label);

  if (autoTerm) {
    return (
      <span className="flex items-center gap-1">
        {label}
        <TermIcon term={autoTerm} />
      </span>
    );
  }

  return label;
}

export default TermIcon;
