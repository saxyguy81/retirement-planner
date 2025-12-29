/**
 * Formatting Utilities for Financial Data Display
 */

// =============================================================================
// GLOBAL PRECISION STATE
// =============================================================================

// Global precision setting: 'sig2' | 'sig3' | 'sig4' | 'dollars' | 'cents'
let globalPrecision = 'sig3';

/**
 * Set the global display precision
 * @param {'sig2' | 'sig3' | 'sig4' | 'dollars' | 'cents'} precision
 */
export function setGlobalPrecision(precision) {
  if (['sig2', 'sig3', 'sig4', 'dollars', 'cents'].includes(precision)) {
    globalPrecision = precision;
  }
}

/**
 * Get the current global precision
 * @returns {'sig2' | 'sig3' | 'sig4' | 'dollars' | 'cents'}
 */
export function getGlobalPrecision() {
  return globalPrecision;
}

/**
 * Round a number to N significant figures
 * @param {number} value - The value to round
 * @param {number} sigFigs - Number of significant figures
 * @returns {number} Rounded value
 */
function toSigFigs(value, sigFigs) {
  if (value === 0) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const scale = Math.pow(10, magnitude - sigFigs + 1);
  return Math.round(value / scale) * scale;
}

// =============================================================================
// CURRENCY FORMATTING
// =============================================================================

/**
 * Format number as currency with appropriate abbreviation
 * @param {number} value - The value to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted string
 */
export function formatCurrency(value, options = {}) {
  const { abbreviate = true, showSign = false, prefix = '$', useGlobalPrecision = true } = options;

  if (value == null || isNaN(value)) return `${prefix}0`;

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : showSign && value > 0 ? '+' : '';

  // Apply global precision if enabled
  if (useGlobalPrecision) {
    // Full precision modes
    if (globalPrecision === 'cents') {
      return `${sign}${prefix}${absValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (globalPrecision === 'dollars') {
      return `${sign}${prefix}${Math.round(absValue).toLocaleString()}`;
    }

    // Significant figure modes (sig2, sig3, sig4)
    const sigFigs = globalPrecision === 'sig2' ? 2 : globalPrecision === 'sig4' ? 4 : 3;

    if (abbreviate && absValue >= 1e3) {
      const rounded = toSigFigs(absValue, sigFigs);
      if (rounded >= 1e9) {
        const num = rounded / 1e9;
        const decimals = Math.max(0, sigFigs - Math.floor(Math.log10(num)) - 1);
        return `${sign}${prefix}${num.toFixed(decimals)}B`;
      } else if (rounded >= 1e6) {
        const num = rounded / 1e6;
        const decimals = Math.max(0, sigFigs - Math.floor(Math.log10(num)) - 1);
        return `${sign}${prefix}${num.toFixed(decimals)}M`;
      } else if (rounded >= 1e3) {
        const num = rounded / 1e3;
        const decimals = Math.max(0, sigFigs - Math.floor(Math.log10(num)) - 1);
        return `${sign}${prefix}${num.toFixed(decimals)}K`;
      }
    }
  }

  // Fallback for small values or non-abbreviated
  return `${sign}${prefix}${Math.round(absValue).toLocaleString()}`;
}

/**
 * Short format for tables (always abbreviated)
 */
export function fmt$(value) {
  return formatCurrency(value, { abbreviate: true });
}

/**
 * Full format with commas
 */
export function fmtFull$(value) {
  return formatCurrency(value, { abbreviate: false });
}

// =============================================================================
// PERCENTAGE FORMATTING
// =============================================================================

/**
 * Format number as percentage
 * @param {number} value - The value to format (0.05 = 5%)
 * @param {object} options - Formatting options
 * @returns {string} Formatted string
 */
export function formatPercent(value, options = {}) {
  const { decimals = 1, showSign = false } = options;

  if (value == null || isNaN(value)) return '0%';

  const sign = value < 0 ? '' : showSign && value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

/**
 * Short format for percentages
 */
export function fmtPct(value) {
  return formatPercent(value, { decimals: 1 });
}

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

/**
 * Format number with appropriate precision
 */
export function formatNumber(value, decimals = 1) {
  if (value == null || isNaN(value)) return '-';
  if (value === 0) return '0';
  return value.toFixed(decimals);
}

// =============================================================================
// DATE/YEAR FORMATTING
// =============================================================================

/**
 * Format year with age
 */
export function formatYearAge(year, age) {
  return `${year} (Age ${age})`;
}

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Get color for a value based on positive/negative/neutral
 */
export function getValueColor(value, options = {}) {
  const {
    positiveClass = 'text-emerald-400',
    negativeClass = 'text-rose-400',
    neutralClass = 'text-slate-300',
    threshold = 0,
  } = options;

  if (value > threshold) return positiveClass;
  if (value < -threshold) return negativeClass;
  return neutralClass;
}

/**
 * Get color for account type
 */
export function getAccountColor(type) {
  const colors = {
    at: { bg: 'bg-emerald-500', text: 'text-emerald-400', fill: '#10b981' },
    ira: { bg: 'bg-amber-500', text: 'text-amber-400', fill: '#f59e0b' },
    roth: { bg: 'bg-blue-500', text: 'text-blue-400', fill: '#3b82f6' },
    total: { bg: 'bg-purple-500', text: 'text-purple-400', fill: '#a855f7' },
  };
  return colors[type] || colors.total;
}

/**
 * Get color for risk level
 */
export function getRiskColor(level) {
  const colors = {
    low: { bg: 'bg-emerald-500/60', text: 'text-emerald-400', fill: '#10b981' },
    mod: { bg: 'bg-amber-500/60', text: 'text-amber-400', fill: '#f59e0b' },
    high: { bg: 'bg-rose-500/60', text: 'text-rose-400', fill: '#f43f5e' },
  };
  return colors[level] || colors.mod;
}

// =============================================================================
// TABLE CELL FORMATTING
// =============================================================================

/**
 * Get formatting for a projection row value
 */
export function formatProjectionValue(key, value) {
  // Percentage fields
  if (key.includes('Percent') || key.includes('Return') || key.includes('Rate')) {
    return fmtPct(value);
  }

  // Factor fields (like RMD factor)
  if (key === 'rmdFactor') {
    return value > 0 ? value.toFixed(1) : '-';
  }

  // Iteration count
  if (key === 'iterations') {
    return value.toString();
  }

  // Default: currency
  return fmt$(value);
}

// =============================================================================
// EXPORT UTILITIES
// =============================================================================

/**
 * Convert projections to CSV format
 */
export function projectionsToCSV(projections, columns) {
  const headers = columns.map(c => c.label).join(',');
  const rows = projections.map(p =>
    columns
      .map(c => {
        const value = p[c.key];
        if (typeof value === 'number') {
          return c.format === '%' ? (value * 100).toFixed(2) : value.toString();
        }
        return value?.toString() || '';
      })
      .join(',')
  );

  return [headers, ...rows].join('\n');
}

/**
 * Convert projections to JSON for export
 */
export function projectionsToJSON(projections, params) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      params,
      projections,
    },
    null,
    2
  );
}
