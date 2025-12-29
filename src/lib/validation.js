/**
 * Validation utilities for retirement planner inputs
 *
 * Provides:
 * - VALIDATION rules for common input types (year, age, rate, balance, percent)
 * - Age/Year detection and conversion functions
 * - Input sanity checking
 */

/**
 * Validation rules for common input types
 */
export const VALIDATION = {
  year: {
    min: 2024,
    max: 2100,
    validate: v => v >= 2024 && v <= 2100,
    message: 'Year must be between 2024 and 2100',
  },
  age: {
    min: 50,
    max: 125,
    validate: v => v >= 50 && v <= 125,
    message: 'Age must be between 50 and 125',
  },
  rate: {
    min: 0,
    max: 1,
    validate: v => v >= 0 && v <= 1,
    message: 'Rate must be between 0% and 100%',
  },
  balance: {
    min: 0,
    max: 100000000,
    validate: v => v >= 0 && v <= 100000000,
    message: 'Balance must be non-negative',
  },
  percent: {
    min: 0,
    max: 100,
    validate: v => v >= 0 && v <= 100,
    message: 'Percentage must be 0-100',
  },
};

/**
 * Detect if a user input is an age or a year
 *
 * Logic:
 * - If between 50-125, likely an age (converts to year using birthYear)
 * - If 2020+, likely a year
 * - Otherwise ambiguous
 *
 * @param {string|number} value - The input value
 * @param {number} birthYear - The user's birth year for age conversion
 * @returns {{ type: 'age'|'year'|'ambiguous'|null, value: number|null }}
 */
export function detectAgeOrYear(value, birthYear) {
  const num = parseInt(value, 10);
  if (isNaN(num)) return { type: null, value: null };

  // If between 50-125, likely an age
  if (num >= 50 && num <= 125) {
    return { type: 'age', value: birthYear + num };
  }
  // If 2020+, likely a year
  if (num >= 2020 && num <= 2100) {
    return { type: 'year', value: num };
  }
  // Ambiguous - could be either
  return { type: 'ambiguous', value: num };
}

/**
 * Convert age to year
 *
 * @param {number} age - The age
 * @param {number} birthYear - The user's birth year
 * @returns {number} - The corresponding year
 */
export function ageToYear(age, birthYear) {
  return birthYear + age;
}

/**
 * Convert year to age
 *
 * @param {number} year - The year
 * @param {number} birthYear - The user's birth year
 * @returns {number} - The corresponding age
 */
export function yearToAge(year, birthYear) {
  return year - birthYear;
}

/**
 * Validate a value against a validation rule
 *
 * @param {number} value - The value to validate
 * @param {string} type - The validation type (year, age, rate, balance, percent)
 * @returns {{ valid: boolean, message: string|null }}
 */
export function validateValue(value, type) {
  const rule = VALIDATION[type];
  if (!rule) {
    return { valid: true, message: null };
  }

  if (rule.validate(value)) {
    return { valid: true, message: null };
  }

  return { valid: false, message: rule.message };
}
