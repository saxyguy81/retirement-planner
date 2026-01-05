/**
 * ClickableValue - A clickable formatted value that navigates to related calculations
 *
 * Used in FormulaDisplay and DependencyList to make values interactive.
 */

import { CALCULATIONS } from '../../lib/calculationDefinitions';
import { fmt$ } from '../../lib/formatters';

/**
 * Format a value appropriately based on magnitude
 * @param {number} value - The value to format
 * @returns {string} Formatted string
 */
function formatK(value) {
  if (value == null || isNaN(value)) return '-';
  if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `$${(value / 1e3).toFixed(0)}K`;
  }
  return fmt$(value);
}

/**
 * ClickableValue component
 *
 * @param {Object} props
 * @param {number} props.value - The numeric value to display
 * @param {string} [props.label] - Optional label suffix (e.g., "PV", "FV")
 * @param {string} props.field - The field key to navigate to
 * @param {number} props.year - The year to navigate to
 * @param {Function} props.onNavigate - Navigation callback (field, year) => void
 * @param {string} [props.className] - Additional CSS classes
 */
export function ClickableValue({ value, label, field, year, onNavigate, className = '' }) {
  const calc = CALCULATIONS[field];
  const fieldLabel = calc?.name || field;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(field, year);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        px-1.5 py-0.5 rounded
        hover:bg-blue-900/30
        border-b border-dotted border-current
        transition-colors cursor-pointer
        font-mono text-sm
        ${className}
      `}
      title={`${fieldLabel} (${year}) - Click to inspect`}
    >
      {formatK(value)}
      {label && <span className="text-xs ml-0.5 opacity-70">{label}</span>}
    </button>
  );
}

export default ClickableValue;
