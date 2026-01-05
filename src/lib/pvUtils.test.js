import { describe, it, expect } from 'vitest';
import { fK } from './calculationDefinitions';
import { applyPV, formatDualValue } from './pvUtils';

describe('applyPV', () => {
  it('returns original value for year 0', () => {
    expect(applyPV(100000, 0, 0.03)).toBe(100000);
  });

  it('discounts correctly for 1 year at 3%', () => {
    const result = applyPV(103000, 1, 0.03);
    expect(result).toBeCloseTo(100000, 2);
  });

  it('discounts correctly for 10 years at 3%', () => {
    const fv = 100000;
    const result = applyPV(fv, 10, 0.03);
    const expected = fv / Math.pow(1.03, 10);
    expect(result).toBeCloseTo(expected, 2);
  });

  it('handles non-numeric values gracefully', () => {
    expect(applyPV(null, 5, 0.03)).toBeNull();
    expect(applyPV(undefined, 5, 0.03)).toBeUndefined();
    expect(applyPV(NaN, 5, 0.03)).toBeNaN();
  });

  it('handles zero discount rate', () => {
    expect(applyPV(100000, 10, 0)).toBe(100000);
  });
});

describe('formatDualValue', () => {
  it('returns primary only when showPV is false', () => {
    const result = formatDualValue(100000, 5, 0.03, false, fK);
    expect(result.primary).toBe('$100K');
    expect(result.secondary).toBeNull();
  });

  it('returns dual display when showPV is true and values differ', () => {
    const fv = 134392; // ~$100K PV after 10 years at 3%
    const result = formatDualValue(fv, 10, 0.03, true, fK);
    expect(result.primary).toBe('$100K');
    expect(result.secondary).toBe('FV: $134K');
  });

  it('skips secondary for year 0', () => {
    const result = formatDualValue(100000, 0, 0.03, true, fK);
    expect(result.primary).toBe('$100K');
    expect(result.secondary).toBeNull();
  });

  it('skips secondary when values are nearly equal', () => {
    // For small absolute differences (< $100), secondary should be skipped
    // Use a small value where the difference is < 100
    const result = formatDualValue(1030, 1, 0.03, true, fK);
    // PV = 1030 / 1.03 = 1000, diff = 30 which is < 100
    expect(result.secondary).toBeNull();
  });

  it('uses custom formatter', () => {
    const customFormatter = v => '$' + Math.round(v).toLocaleString();
    const result = formatDualValue(100000, 0, 0.03, true, customFormatter);
    expect(result.primary).toBe('$100,000');
  });
});
