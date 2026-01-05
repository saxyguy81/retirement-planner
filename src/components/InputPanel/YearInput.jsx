import { useState, useEffect } from 'react';

/**
 * Year input that only commits valid values on blur/Enter.
 * Prevents partial values (e.g., "20" when deleting from "2025")
 * from triggering expensive recalculations.
 */
export function YearInput({
  value,
  onChange,
  min = 1900,
  max = 2150,
  placeholder = '',
  allowEmpty = false,
  className = '',
}) {
  const [localValue, setLocalValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Sync local value when parent value changes (and not editing)
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value != null ? value.toString() : '');
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    setLocalValue(value != null ? value.toString() : '');
  };

  const commitValue = () => {
    setIsEditing(false);

    const trimmed = localValue.trim();

    // Handle empty input
    if (trimmed === '') {
      if (allowEmpty) {
        onChange(null);
      }
      // If not allowEmpty, revert to previous value (do nothing)
      setLocalValue(value != null ? value.toString() : '');
      return;
    }

    const parsed = parseInt(trimmed, 10);

    // Validate: must be a number within bounds
    if (isNaN(parsed)) {
      // Invalid - revert to previous value
      setLocalValue(value != null ? value.toString() : '');
      return;
    }

    if (parsed < min || parsed > max) {
      // Out of bounds - revert to previous value
      setLocalValue(value != null ? value.toString() : '');
      return;
    }

    // Valid - commit
    onChange(parsed);
  };

  const handleBlur = () => {
    commitValue();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
      e.target.blur();
    }
    if (e.key === 'Escape') {
      // Revert and blur
      setLocalValue(value != null ? value.toString() : '');
      setIsEditing(false);
      e.target.blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={isEditing ? localValue : (value != null ? value.toString() : '')}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className || 'w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none'}
    />
  );
}
