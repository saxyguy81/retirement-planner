/**
 * SmartYearInput Component
 *
 * An intelligent input that accepts either age or year values and
 * auto-detects which type was entered:
 * - Values 50-125 are interpreted as ages and converted to years
 * - Values 2020+ are interpreted as years
 *
 * Features:
 * - Auto-detection of age vs year input
 * - Shows converted value (e.g., "Age 75" or "2030")
 * - Validation with error messages
 * - Seamless user experience with clear feedback
 */

import { useState, useEffect } from 'react';

import { detectAgeOrYear, yearToAge } from '../../lib/validation';

export function SmartYearInput({
  value, // year value (always stored as year internally)
  onChange,
  onValidationError, // NEW: callback for validation errors
  birthYear = 1955, // default birth year
  min = 2024,
  max = 2100,
  placeholder = 'Year or Age',
  className = '',
}) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [mode, setMode] = useState('year'); // 'year' or 'age'
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // Sync inputValue with external value changes
  useEffect(() => {
    if (!isFocused && value) {
      setInputValue(value.toString());
      setValidationError(null);
    }
  }, [value, isFocused]);

  const handleChange = e => {
    const raw = e.target.value;
    setInputValue(raw);
    setValidationError(null);

    // Only process if there's actual input
    if (!raw.trim()) {
      onChange(null);
      return;
    }

    const detected = detectAgeOrYear(raw, birthYear);

    if (detected.type === 'year' || detected.type === 'age') {
      setMode(detected.type);

      // Validate the resulting year
      if (detected.value < min) {
        const error = `Year ${detected.value} is before ${min}`;
        setValidationError(error);
        onValidationError?.(error);
        return;
      }
      if (detected.value > max) {
        const error = `Year ${detected.value} is after ${max}`;
        setValidationError(error);
        onValidationError?.(error);
        return;
      }

      // Valid - call onChange
      onChange(detected.value);
    } else if (detected.type === 'ambiguous' || detected.type === null) {
      const error = 'Enter a year (2024-2100) or age (50-125)';
      setValidationError(error);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value) {
      // Show in current mode
      setInputValue(mode === 'age' ? yearToAge(value, birthYear).toString() : value.toString());
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // Calculate age for display
  const age = value ? yearToAge(value, birthYear) : null;
  const isValid = value && value >= min && value <= max && !validationError;

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full bg-slate-800 border rounded px-2 py-1 text-xs text-slate-200
          focus:outline-none focus:border-blue-500
          ${!validationError ? 'border-slate-700' : 'border-rose-500'}`}
      />
      {/* Show converted value indicator */}
      {value && isValid && !isFocused && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
          {mode === 'age' ? `(${value})` : `Age ${age}`}
        </div>
      )}
      {/* Error message */}
      {validationError && <div className="text-rose-400 text-xs mt-0.5">{validationError}</div>}
    </div>
  );
}

export default SmartYearInput;
