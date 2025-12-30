/**
 * ClickableFormula - Renders formula text with clickable, color-coded variable names
 *
 * Variables are highlighted with semantic colors and can optionally navigate
 * to source calculations when clicked. Consolidates ClickableFormula and
 * ColorCodedFormula functionality - pass onNavigate=null for non-clickable display.
 */

import { CALCULATIONS, fK, fM, f$ } from '../../lib/calculationDefinitions';
import { CELL_DEPENDENCIES } from '../../lib/calculationDependencies';
import { FORMULA_COLORS } from '../../lib/colors';
import { fmtPct } from '../../lib/formatters';

/**
 * ClickableFormula component
 *
 * @param {Object} props
 * @param {string} props.formula - The formula text to render
 * @param {Object} props.data - Current row data with field values
 * @param {Array} props.projections - All projection rows (for navigation)
 * @param {Function} props.onNavigate - Navigation handler (field, year, data) => void, or null for non-clickable
 * @param {string} props.currentField - The field being displayed (for dependency lookup)
 */
export function ClickableFormula({ formula, data, projections, onNavigate, currentField }) {
  if (!formula) return null;

  // Build a regex pattern that matches all known variable names
  // Sort by length descending to match longer names first (e.g., "totalWithdrawal" before "total")
  const variableNames = Object.keys(FORMULA_COLORS).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${variableNames.join('|')})\\b`, 'gi');

  // Split the formula by variable names while keeping the matches
  const parts = [];
  let lastIndex = 0;

  // Use matchAll to find all matches
  const matches = [...formula.matchAll(new RegExp(pattern.source, 'gi'))];

  matches.forEach(match => {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: formula.slice(lastIndex, match.index),
      });
    }

    // Find the variable config (case-insensitive lookup)
    const matchedText = match[0];
    const varKey = Object.keys(FORMULA_COLORS).find(
      k => k.toLowerCase() === matchedText.toLowerCase()
    );
    const varConfig = varKey ? FORMULA_COLORS[varKey] : null;
    const value = varKey && data ? data[varKey] : undefined;

    // Find the dependency for this variable (only if we have navigation)
    let dependency = null;
    if (onNavigate && varKey && currentField && CELL_DEPENDENCIES[currentField]) {
      const deps = CELL_DEPENDENCIES[currentField](data.year, data, projections);
      dependency = deps.find(d => d.field === varKey);
    }

    parts.push({
      type: 'variable',
      content: matchedText,
      config: varConfig,
      value,
      varKey,
      dependency,
    });

    lastIndex = match.index + match[0].length;
  });

  // Add remaining text after last match
  if (lastIndex < formula.length) {
    parts.push({
      type: 'text',
      content: formula.slice(lastIndex),
    });
  }

  // If no matches were found, just return the formula as-is
  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap">{formula}</span>;
  }

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          return <span key={idx}>{part.content}</span>;
        }

        // Variable with color
        const { config, value, content, varKey, dependency } = part;
        if (!config) {
          return <span key={idx}>{content}</span>;
        }

        // Format the value for display
        let formattedValue = '';
        if (value !== undefined && value !== null) {
          if (typeof value === 'number') {
            if (config.key && (config.key.includes('Return') || config.key.includes('Percent'))) {
              formattedValue = fmtPct(value);
            } else if (Math.abs(value) >= 1000000) {
              formattedValue = fM(value);
            } else if (Math.abs(value) >= 1000) {
              formattedValue = fK(value);
            } else {
              formattedValue = f$(value);
            }
          } else {
            formattedValue = String(value);
          }
        }

        // Check if this variable is clickable (only if onNavigate provided)
        const isClickable = onNavigate && (dependency || CALCULATIONS[varKey]);
        const targetYear = dependency?.year || data.year;
        const targetData = projections?.find(p => p.year === targetYear);

        const handleClick = () => {
          if (isClickable && onNavigate && targetData) {
            onNavigate(varKey, targetYear, targetData);
          }
        };

        if (isClickable) {
          return (
            <button
              key={idx}
              onClick={handleClick}
              style={{ color: config.color, borderBottom: `2px solid ${config.color}` }}
              className="font-medium hover:bg-white/10 rounded px-0.5 cursor-pointer inline-flex items-baseline gap-1"
              title={`Click to see ${config.label} calculation${dependency?.year !== data.year ? ` (${dependency?.year})` : ''}`}
            >
              <span className="text-xs opacity-70">{content}</span>
              {formattedValue && <span>{formattedValue}</span>}
            </button>
          );
        }

        // Non-clickable variable (just display with tooltip)
        const tooltipText = formattedValue ? `${config.label}: ${formattedValue}` : config.label;

        return (
          <span
            key={idx}
            style={{
              color: config.color,
              borderBottom: `2px solid ${config.color}`,
              cursor: onNavigate ? 'default' : 'help',
            }}
            title={tooltipText}
            className="font-medium"
          >
            {content}
            {formattedValue && <span className="ml-1 opacity-80">{formattedValue}</span>}
          </span>
        );
      })}
    </span>
  );
}

export default ClickableFormula;
