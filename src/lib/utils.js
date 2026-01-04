/**
 * Utility functions
 */

/**
 * Deep clone an object, handling nested objects and arrays.
 * Used for creating independent scenario snapshots.
 * @param {*} obj - The value to clone
 * @returns {*} A deep copy of the input
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}
