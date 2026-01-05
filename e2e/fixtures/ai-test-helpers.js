/**
 * AI Test Helpers
 *
 * Utilities for validating AI responses in E2E tests.
 */

/**
 * Extract dollar amounts from text
 * @param {string} text - Text to search
 * @returns {number[]} Array of dollar amounts found
 */
export function extractDollarAmounts(text) {
  const matches = text.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
  return matches.map((m) => parseFloat(m.replace(/[$,]/g, '')));
}

/**
 * Extract years (2020-2099) from text
 * @param {string} text - Text to search
 * @returns {number[]} Array of unique years found, sorted
 */
export function extractYears(text) {
  const matches = text.match(/20\d{2}/g) || [];
  return [...new Set(matches)].map(Number).sort();
}

/**
 * Check if response has no common error indicators
 * @param {string} response - AI response text
 * @returns {boolean} True if no errors detected
 */
export function hasNoErrors(response) {
  const errorIndicators = [
    'error',
    'failed',
    'unable to',
    "couldn't",
    "can't",
    'not available',
    'unknown tool',
    'exception',
  ];
  const lowered = response.toLowerCase();
  return !errorIndicators.some((e) => lowered.includes(e));
}

/**
 * Check if actual value is within percent tolerance of expected
 * @param {number} actual - Actual value
 * @param {number} expected - Expected value
 * @param {number} percent - Tolerance percentage (default 10)
 * @returns {boolean} True if within tolerance
 */
export function isWithinPercent(actual, expected, percent = 10) {
  const tolerance = expected * (percent / 100);
  return Math.abs(actual - expected) <= tolerance;
}

/**
 * Check if response contains all expected keywords
 * @param {string} response - AI response text
 * @param {string[]} keywords - Keywords to find
 * @returns {Object[]} Array of { keyword, found } objects
 */
export function checkMultiPartResponse(response, keywords) {
  const lowered = response.toLowerCase();
  return keywords.map((kw) => ({
    keyword: kw,
    found: lowered.includes(kw.toLowerCase()),
  }));
}

/**
 * Check if response indicates a limitation acknowledgment
 * @param {string} response - AI response text
 * @returns {boolean} True if response acknowledges a limitation
 */
export function acknowledgesLimitation(response) {
  const limitationIndicators = [
    'cannot',
    "can't",
    'unable to',
    'not able to',
    'limitation',
    'however',
    'instead',
    'alternatively',
    'but i can',
    'what i can do',
  ];
  const lowered = response.toLowerCase();
  return limitationIndicators.some((ind) => lowered.includes(ind));
}

/**
 * Extract percentage values from text
 * @param {string} text - Text to search
 * @returns {number[]} Array of percentage values found
 */
export function extractPercentages(text) {
  const matches = text.match(/(\d+(?:\.\d+)?)\s*%/g) || [];
  return matches.map((m) => parseFloat(m.replace('%', '').trim()));
}

/**
 * Count the number of markdown table rows in text
 * @param {string} text - Text to search
 * @returns {number} Number of table rows (excluding header)
 */
export function countTableRows(text) {
  const lines = text.split('\n');
  const tableLines = lines.filter((line) => line.trim().startsWith('|') && !line.includes('---'));
  // Subtract 1 for header row
  return Math.max(0, tableLines.length - 1);
}

/**
 * Check if response contains a markdown table
 * @param {string} text - Text to search
 * @returns {boolean} True if contains table
 */
export function hasMarkdownTable(text) {
  return text.includes('|') && text.includes('---');
}
