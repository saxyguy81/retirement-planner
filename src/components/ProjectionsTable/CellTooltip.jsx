/**
 * CellTooltip Component (Phase 7)
 *
 * Shows a quick formula preview on hover without requiring a click.
 * Accessible via keyboard focus and touch long-press.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { CALCULATIONS } from '../../lib/calculationDefinitions';

/**
 * Calculate tooltip position to keep it within viewport
 */
function useTooltipPosition(cellRef, isVisible) {
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top' });

  useEffect(() => {
    if (!isVisible || !cellRef.current) return;

    const cell = cellRef.current.getBoundingClientRect();
    const tooltipWidth = 288; // w-72 = 18rem = 288px
    const tooltipHeight = 140; // approximate max height
    const padding = 8;

    let top = cell.top - tooltipHeight - padding;
    let left = cell.left + cell.width / 2 - tooltipWidth / 2;
    let placement = 'top';

    // Flip to bottom if too close to top
    if (top < padding) {
      top = cell.bottom + padding;
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
  }, [isVisible, cellRef]);

  return position;
}

/**
 * Hook to handle debounced hover events
 */
function useHoverDebounce(delay = 300) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowTooltip(true), delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    setShowTooltip(false);
  }, []);

  const handleFocus = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleBlur = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const hideImmediately = useCallback(() => {
    clearTimeout(timerRef.current);
    setShowTooltip(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return {
    showTooltip,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur,
    hideImmediately,
  };
}

/**
 * CellTooltip - displays formula preview for a cell
 */
export function CellTooltip({ field, data, params, showPV, position }) {
  const calc = CALCULATIONS[field];
  if (!calc) return null;

  // Compute the calculation data
  const computed = calc.compute(data, params, {
    showPV,
    discountRate: params?.discountRate || 0.03,
  });

  return createPortal(
    <div
      role="tooltip"
      className="fixed z-[9999] w-72 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 pointer-events-none"
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

      {/* Title */}
      <div className="text-blue-400 font-medium text-sm truncate">{calc.name}</div>

      {/* Value */}
      <div className="text-2xl font-mono text-amber-400 mt-1">{computed.simple}</div>

      {/* Secondary value (e.g., FV when showing PV) */}
      {computed.simpleSecondary && (
        <div className="text-slate-500 text-xs font-mono">{computed.simpleSecondary}</div>
      )}

      {/* Formula */}
      {computed.formula && (
        <div className="text-slate-400 text-xs font-mono mt-2 whitespace-pre-line line-clamp-2">
          {computed.formula}
        </div>
      )}

      {/* Back of envelope */}
      {calc.backOfEnvelope && (
        <div className="text-slate-600 text-xs mt-2 italic truncate">{calc.backOfEnvelope}</div>
      )}

      {/* Click hint */}
      <div className="text-blue-400 text-xs mt-2 flex items-center gap-1">
        <span>Click for full breakdown</span>
        <span className="text-blue-400/50">→</span>
      </div>
    </div>,
    document.body
  );
}

/**
 * Wrapper component that provides hover/focus behavior for table cells
 */
export function TooltipCell({
  field,
  data,
  params,
  showPV,
  children,
  isInspectable,
  onClick,
  onMouseEnter: externalMouseEnter,
  onMouseLeave: externalMouseLeave,
  className,
  ...props
}) {
  const cellRef = useRef(null);
  const {
    showTooltip,
    handleMouseEnter: tooltipMouseEnter,
    handleMouseLeave: tooltipMouseLeave,
    handleFocus,
    handleBlur,
    hideImmediately,
  } = useHoverDebounce(300);
  const position = useTooltipPosition(cellRef, showTooltip);

  const handleClick = () => {
    hideImmediately();
    if (onClick) onClick();
  };

  // Merge internal tooltip handlers with external dependency handlers
  const handleMouseEnter = useCallback(() => {
    tooltipMouseEnter();
    if (externalMouseEnter) externalMouseEnter();
  }, [tooltipMouseEnter, externalMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    tooltipMouseLeave();
    if (externalMouseLeave) externalMouseLeave();
  }, [tooltipMouseLeave, externalMouseLeave]);

  // Check if calculation exists for this field
  const hasTooltip = isInspectable && CALCULATIONS[field];

  return (
    <td
      ref={cellRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={hasTooltip ? handleFocus : undefined}
      onBlur={hasTooltip ? handleBlur : undefined}
      tabIndex={hasTooltip ? 0 : undefined}
      aria-describedby={showTooltip && hasTooltip ? `tooltip-${field}-${data.year}` : undefined}
      className={className}
      {...props}
    >
      {children}
      {showTooltip && hasTooltip && (
        <div id={`tooltip-${field}-${data.year}`}>
          <CellTooltip field={field} data={data} params={params} showPV={showPV} position={position} />
        </div>
      )}
    </td>
  );
}

export default CellTooltip;
