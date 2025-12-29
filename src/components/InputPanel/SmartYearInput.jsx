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

import React, { useState, useEffect } from 'react';

import { detectAgeOrYear, yearToAge, VALIDATION } from '../../lib/validation';

export function SmartYearInput({
  value, // year value (always stored as year internally)
  onChange,
  birthYear = 1955, // default birth year
  min = 2024,
  max = 2100,
  placeholder = 'Year or Age',
  className = '',
}) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [mode, setMode] = useState('year'); // 'year' or 'age'
  const [isFocused, setIsFocused] = useState(false);

  // Sync inputValue with external value changes
  useEffect(() => {
    if (!isFocused && value) {
      setInputValue(value.toString());
    }
  }, [value, isFocused]);

  const handleChange = e => {
    const raw = e.target.value;
    setInputValue(raw);

    // Only process if there's actual input
    if (!raw.trim()) {
      return;
    }

    const detected = detectAgeOrYear(raw, birthYear);
    if (detected.type === 'year') {
      setMode('year');
      if (detected.value >= min && detected.value <= max) {
        onChange(detected.value);
      }
    } else if (detected.type === 'age') {
      setMode('age');
      if (detected.value >= min && detected.value <= max) {
        onChange(detected.value);
      }
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

  // Calculate age and validation state
  const age = value ? yearToAge(value, birthYear) : null;
  const isValidYear = value && value >= min && value <= max;
  const isValidAge = age !== null && age >= VALIDATION.age.min && age <= VALIDATION.age.max;
  const isValid = isValidYear && isValidAge;

  // Determine error message
  let errorMessage = null;
  if (inputValue.trim() && !isValid) {
    if (age !== null && age > VALIDATION.age.max) {
      errorMessage = `Age exceeds ${VALIDATION.age.max}`;
    } else if (value && value < min) {
      errorMessage = `Year must be ${min} or later`;
    } else if (value && value > max) {
      errorMessage = `Year must be ${max} or earlier`;
    } else if (inputValue.trim() && !value) {
      errorMessage = 'Invalid year or age';
    }
  }

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
          ${isValid || !inputValue.trim() ? 'border-slate-700' : 'border-rose-500'}`}
      />
      {/* Show converted value indicator */}
      {value && isValid && !isFocused && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
          {mode === 'age' ? `(${value})` : `Age ${age}`}
        </div>
      )}
      {/* Error message */}
      {errorMessage && <div className="text-rose-400 text-xs mt-0.5">{errorMessage}</div>}
    </div>
  );
}

export default SmartYearInput;
