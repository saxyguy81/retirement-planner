/**
 * Comprehensive Unit Tests for Calculation Functions
 * Tests all core tax and financial calculation functions with bracket boundaries
 */

import { describe, it, expect } from 'vitest';

import {
  calculateFederalTax,
  calculateLTCGTax,
  calculateNIIT,
  calculateTaxableSocialSecurity,
  calculateIllinoisTax,
  calculateIRMAA,
  calculateRMD,
  calculateHeirValue,
  calculateMultiHeirValue,
  calculateRiskAllocation,
  calculateBlendedReturn,
  calculateAllTaxes,
  getFederalMarginalRate,
  getStateMarginalRate,
  calculateHeirTaxRates,
} from './calculations.js';
import {
  FEDERAL_BRACKETS_MFJ_2024,
  FEDERAL_BRACKETS_SINGLE_2024,
  LTCG_BRACKETS_MFJ_2024,
  LTCG_BRACKETS_SINGLE_2024,
  NIIT_RATE,
  NIIT_THRESHOLD_MFJ,
  NIIT_THRESHOLD_SINGLE,
  SS_TAX_THRESHOLDS_MFJ,
  SS_TAX_THRESHOLDS_SINGLE,
  RMD_TABLE,
  RMD_START_AGE,
  IRMAA_BRACKETS_MFJ_2024,
  IRMAA_BRACKETS_SINGLE_2024,
  IL_TAX_RATE,
} from './taxTables.js';

// =============================================================================
// calculateFederalTax Tests
// =============================================================================
describe('calculateFederalTax', () => {
  describe('edge cases', () => {
    it('returns 0 for zero income', () => {
      expect(calculateFederalTax(0, FEDERAL_BRACKETS_MFJ_2024)).toBe(0);
    });

    it('returns 0 for negative income', () => {
      expect(calculateFederalTax(-10000, FEDERAL_BRACKETS_MFJ_2024)).toBe(0);
    });
  });

  describe('MFJ bracket boundaries', () => {
    it('calculates tax at 10% bracket ceiling ($23,200)', () => {
      // All income in 10% bracket
      const tax = calculateFederalTax(23200, FEDERAL_BRACKETS_MFJ_2024);
      expect(tax).toBeWithinDollars(23200 * 0.1, 1);
    });

    it('calculates tax just into 12% bracket ($23,201)', () => {
      const tax = calculateFederalTax(23201, FEDERAL_BRACKETS_MFJ_2024);
      const expected = 23200 * 0.1 + 1 * 0.12;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax at 12% bracket ceiling ($94,300)', () => {
      const tax = calculateFederalTax(94300, FEDERAL_BRACKETS_MFJ_2024);
      const expected = 23200 * 0.1 + (94300 - 23200) * 0.12;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax just into 22% bracket ($94,301)', () => {
      const tax = calculateFederalTax(94301, FEDERAL_BRACKETS_MFJ_2024);
      const expected = 23200 * 0.1 + (94300 - 23200) * 0.12 + 1 * 0.22;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax at 22% bracket ceiling ($201,050)', () => {
      const tax = calculateFederalTax(201050, FEDERAL_BRACKETS_MFJ_2024);
      const expected = 23200 * 0.1 + (94300 - 23200) * 0.12 + (201050 - 94300) * 0.22;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax just into 24% bracket ($201,051)', () => {
      const tax = calculateFederalTax(201051, FEDERAL_BRACKETS_MFJ_2024);
      const base = 23200 * 0.1 + (94300 - 23200) * 0.12 + (201050 - 94300) * 0.22;
      const expected = base + 1 * 0.24;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax at 24% bracket ceiling ($383,900)', () => {
      const tax = calculateFederalTax(383900, FEDERAL_BRACKETS_MFJ_2024);
      const expected =
        23200 * 0.1 + (94300 - 23200) * 0.12 + (201050 - 94300) * 0.22 + (383900 - 201050) * 0.24;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax just into 32% bracket ($383,901)', () => {
      const tax = calculateFederalTax(383901, FEDERAL_BRACKETS_MFJ_2024);
      const base =
        23200 * 0.1 + (94300 - 23200) * 0.12 + (201050 - 94300) * 0.22 + (383900 - 201050) * 0.24;
      const expected = base + 1 * 0.32;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax at 32% bracket ceiling ($487,450)', () => {
      const tax = calculateFederalTax(487450, FEDERAL_BRACKETS_MFJ_2024);
      const expected =
        23200 * 0.1 +
        (94300 - 23200) * 0.12 +
        (201050 - 94300) * 0.22 +
        (383900 - 201050) * 0.24 +
        (487450 - 383900) * 0.32;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax just into 35% bracket ($487,451)', () => {
      const tax = calculateFederalTax(487451, FEDERAL_BRACKETS_MFJ_2024);
      const base =
        23200 * 0.1 +
        (94300 - 23200) * 0.12 +
        (201050 - 94300) * 0.22 +
        (383900 - 201050) * 0.24 +
        (487450 - 383900) * 0.32;
      const expected = base + 1 * 0.35;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax at 35% bracket ceiling ($731,200)', () => {
      const tax = calculateFederalTax(731200, FEDERAL_BRACKETS_MFJ_2024);
      const expected =
        23200 * 0.1 +
        (94300 - 23200) * 0.12 +
        (201050 - 94300) * 0.22 +
        (383900 - 201050) * 0.24 +
        (487450 - 383900) * 0.32 +
        (731200 - 487450) * 0.35;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax in 37% bracket ($1,000,000)', () => {
      const tax = calculateFederalTax(1000000, FEDERAL_BRACKETS_MFJ_2024);
      const expected =
        23200 * 0.1 +
        (94300 - 23200) * 0.12 +
        (201050 - 94300) * 0.22 +
        (383900 - 201050) * 0.24 +
        (487450 - 383900) * 0.32 +
        (731200 - 487450) * 0.35 +
        (1000000 - 731200) * 0.37;
      expect(tax).toBeWithinDollars(expected, 1);
    });
  });

  describe('Single bracket boundaries', () => {
    it('calculates tax at 10% bracket ceiling ($11,600)', () => {
      const tax = calculateFederalTax(11600, FEDERAL_BRACKETS_SINGLE_2024);
      expect(tax).toBeWithinDollars(11600 * 0.1, 1);
    });

    it('calculates tax just into 12% bracket ($11,601)', () => {
      const tax = calculateFederalTax(11601, FEDERAL_BRACKETS_SINGLE_2024);
      const expected = 11600 * 0.1 + 1 * 0.12;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax at 12% bracket ceiling ($47,150)', () => {
      const tax = calculateFederalTax(47150, FEDERAL_BRACKETS_SINGLE_2024);
      const expected = 11600 * 0.1 + (47150 - 11600) * 0.12;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax just into 22% bracket ($47,151)', () => {
      const tax = calculateFederalTax(47151, FEDERAL_BRACKETS_SINGLE_2024);
      const expected = 11600 * 0.1 + (47150 - 11600) * 0.12 + 1 * 0.22;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax at 24% bracket ceiling ($191,950)', () => {
      const tax = calculateFederalTax(191950, FEDERAL_BRACKETS_SINGLE_2024);
      const expected =
        11600 * 0.1 + (47150 - 11600) * 0.12 + (100525 - 47150) * 0.22 + (191950 - 100525) * 0.24;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('calculates tax in 37% bracket ($700,000)', () => {
      const tax = calculateFederalTax(700000, FEDERAL_BRACKETS_SINGLE_2024);
      const expected =
        11600 * 0.1 +
        (47150 - 11600) * 0.12 +
        (100525 - 47150) * 0.22 +
        (191950 - 100525) * 0.24 +
        (243725 - 191950) * 0.32 +
        (609350 - 243725) * 0.35 +
        (700000 - 609350) * 0.37;
      expect(tax).toBeWithinDollars(expected, 1);
    });
  });
});

// =============================================================================
// calculateLTCGTax Tests
// =============================================================================
describe('calculateLTCGTax', () => {
  describe('edge cases', () => {
    it('returns 0 for zero capital gains', () => {
      expect(calculateLTCGTax(0, 50000, LTCG_BRACKETS_MFJ_2024)).toBe(0);
    });

    it('returns 0 for negative capital gains', () => {
      expect(calculateLTCGTax(-10000, 50000, LTCG_BRACKETS_MFJ_2024)).toBe(0);
    });
  });

  describe('MFJ stacking behavior', () => {
    it('0% rate when ordinary + gains stays below $94,050', () => {
      // $50k ordinary + $40k gains = $90k total, all in 0% LTCG bracket
      const tax = calculateLTCGTax(40000, 50000, LTCG_BRACKETS_MFJ_2024);
      expect(tax).toBe(0);
    });

    it('0% rate when gains exactly fill to $94,050 threshold', () => {
      // $50k ordinary + $44,050 gains = $94,050, all gains at 0%
      const tax = calculateLTCGTax(44050, 50000, LTCG_BRACKETS_MFJ_2024);
      expect(tax).toBe(0);
    });

    it('splits gains across 0% and 15% brackets', () => {
      // $50k ordinary, $60k gains
      // First $44,050 at 0%, remaining $15,950 at 15%
      const tax = calculateLTCGTax(60000, 50000, LTCG_BRACKETS_MFJ_2024);
      const expected = 44050 * 0 + 15950 * 0.15;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('all gains at 15% when ordinary income exceeds 0% threshold', () => {
      // $100k ordinary (already past $94,050), $50k gains all at 15%
      const tax = calculateLTCGTax(50000, 100000, LTCG_BRACKETS_MFJ_2024);
      expect(tax).toBeWithinDollars(50000 * 0.15, 1);
    });

    it('splits gains across 15% and 20% brackets', () => {
      // $500k ordinary, $100k gains
      // $83,750 at 15% (up to $583,750), $16,250 at 20%
      const tax = calculateLTCGTax(100000, 500000, LTCG_BRACKETS_MFJ_2024);
      const expected = 83750 * 0.15 + 16250 * 0.2;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('all gains at 20% when ordinary income exceeds 15% threshold', () => {
      // $600k ordinary (past $583,750), all gains at 20%
      const tax = calculateLTCGTax(50000, 600000, LTCG_BRACKETS_MFJ_2024);
      expect(tax).toBeWithinDollars(50000 * 0.2, 1);
    });

    it('spans all three brackets with large gains', () => {
      // $0 ordinary, $600k gains spans all brackets
      // $94,050 at 0%, $489,700 at 15% (up to $583,750), $16,250 at 20%
      const tax = calculateLTCGTax(600000, 0, LTCG_BRACKETS_MFJ_2024);
      const expected = 94050 * 0 + (583750 - 94050) * 0.15 + (600000 - 583750) * 0.2;
      expect(tax).toBeWithinDollars(expected, 1);
    });
  });

  describe('Single stacking behavior', () => {
    it('0% rate when ordinary + gains stays below $47,025', () => {
      const tax = calculateLTCGTax(20000, 20000, LTCG_BRACKETS_SINGLE_2024);
      expect(tax).toBe(0);
    });

    it('splits gains across 0% and 15% brackets', () => {
      // $30k ordinary, $30k gains
      // First $17,025 at 0%, remaining $12,975 at 15%
      const tax = calculateLTCGTax(30000, 30000, LTCG_BRACKETS_SINGLE_2024);
      const expected = 17025 * 0 + 12975 * 0.15;
      expect(tax).toBeWithinDollars(expected, 1);
    });

    it('all gains at 20% when in top bracket', () => {
      const tax = calculateLTCGTax(50000, 550000, LTCG_BRACKETS_SINGLE_2024);
      expect(tax).toBeWithinDollars(50000 * 0.2, 1);
    });
  });
});

// =============================================================================
// calculateNIIT Tests
// =============================================================================
describe('calculateNIIT', () => {
  describe('MFJ threshold ($250,000)', () => {
    it('returns 0 when MAGI below threshold', () => {
      const niit = calculateNIIT(50000, 200000, false);
      expect(niit).toBe(0);
    });

    it('returns 0 when MAGI equals threshold', () => {
      const niit = calculateNIIT(50000, 250000, false);
      expect(niit).toBe(0);
    });

    it('taxes lesser of investment income or excess MAGI', () => {
      // MAGI $300k, investment income $100k
      // Excess MAGI = $50k, so NIIT on $50k
      const niit = calculateNIIT(100000, 300000, false);
      expect(niit).toBeWithinDollars(50000 * NIIT_RATE, 1);
    });

    it('taxes all investment income when excess MAGI exceeds it', () => {
      // MAGI $400k, investment income $50k
      // Excess MAGI = $150k, but only $50k investment income
      const niit = calculateNIIT(50000, 400000, false);
      expect(niit).toBeWithinDollars(50000 * NIIT_RATE, 1);
    });

    it('handles large amounts correctly', () => {
      const niit = calculateNIIT(500000, 750000, false);
      // Excess MAGI = $500k, equals investment income
      expect(niit).toBeWithinDollars(500000 * NIIT_RATE, 1);
    });
  });

  describe('Single threshold ($200,000)', () => {
    it('returns 0 when MAGI below threshold', () => {
      const niit = calculateNIIT(30000, 180000, true);
      expect(niit).toBe(0);
    });

    it('returns 0 when MAGI equals threshold', () => {
      const niit = calculateNIIT(30000, 200000, true);
      expect(niit).toBe(0);
    });

    it('taxes lesser of investment income or excess MAGI', () => {
      // MAGI $250k, investment income $100k
      // Excess MAGI = $50k
      const niit = calculateNIIT(100000, 250000, true);
      expect(niit).toBeWithinDollars(50000 * NIIT_RATE, 1);
    });

    it('correctly uses Single threshold ($200k vs $250k MFJ)', () => {
      // Same numbers should produce different results
      const niitSingle = calculateNIIT(100000, 250000, true);
      const niitMFJ = calculateNIIT(100000, 250000, false);

      // Single: excess = $50k, MFJ: excess = $0
      expect(niitSingle).toBeWithinDollars(50000 * NIIT_RATE, 1);
      expect(niitMFJ).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('returns 0 for zero investment income', () => {
      const niit = calculateNIIT(0, 500000, false);
      expect(niit).toBe(0);
    });

    it('handles exactly $1 over threshold', () => {
      const niit = calculateNIIT(10000, 250001, false);
      expect(niit).toBeWithinDollars(1 * NIIT_RATE, 1);
    });
  });
});

// =============================================================================
// calculateTaxableSocialSecurity Tests
// =============================================================================
describe('calculateTaxableSocialSecurity', () => {
  describe('MFJ thresholds', () => {
    it('returns 0 when combined income below tier1 ($32,000)', () => {
      // Combined = other + 0.5*SS = $10k + $40k*0.5 = $30k < $32k
      const taxable = calculateTaxableSocialSecurity(40000, 10000, false);
      expect(taxable).toBe(0);
    });

    it('returns 0 when combined income equals tier1', () => {
      // Combined = $12k + $40k*0.5 = $32k
      const taxable = calculateTaxableSocialSecurity(40000, 12000, false);
      expect(taxable).toBe(0);
    });

    it('calculates 50% tier between tier1 and tier2', () => {
      // SS = $40k, other = $20k
      // Combined = $20k + $20k = $40k (between $32k and $44k)
      // Taxable = min(0.5*$40k, 0.5*($40k - $32k)) = min($20k, $4k) = $4k
      const taxable = calculateTaxableSocialSecurity(40000, 20000, false);
      expect(taxable).toBeWithinDollars(4000, 1);
    });

    it('calculates at tier2 boundary ($44,000)', () => {
      // SS = $40k, other = $24k
      // Combined = $24k + $20k = $44k (exactly tier2)
      // Taxable = min($20k, 0.5*$12k) = min($20k, $6k) = $6k
      const taxable = calculateTaxableSocialSecurity(40000, 24000, false);
      expect(taxable).toBeWithinDollars(6000, 1);
    });

    it('calculates 85% tier above tier2', () => {
      // SS = $40k, other = $50k
      // Combined = $50k + $20k = $70k (above $44k)
      // Tier1 portion = 0.5 * ($44k - $32k) = $6k
      // Tier2 portion = 0.85 * ($70k - $44k) = $22.1k
      // Total = $28.1k, but cap at 0.85 * $40k = $34k
      const taxable = calculateTaxableSocialSecurity(40000, 50000, false);
      expect(taxable).toBeWithinDollars(28100, 100);
    });

    it('caps at 85% of SS income for high earners', () => {
      // SS = $40k, other = $200k (very high)
      // Combined = $200k + $20k = $220k
      // Calculation would exceed 85% of SS, so cap applies
      const taxable = calculateTaxableSocialSecurity(40000, 200000, false);
      expect(taxable).toBeWithinDollars(40000 * 0.85, 1);
    });
  });

  describe('Single thresholds', () => {
    it('returns 0 when combined income below tier1 ($25,000)', () => {
      // Combined = other + 0.5*SS = $10k + $20k*0.5 = $20k < $25k
      const taxable = calculateTaxableSocialSecurity(20000, 10000, true);
      expect(taxable).toBe(0);
    });

    it('calculates 50% tier between tier1 ($25k) and tier2 ($34k)', () => {
      // SS = $40k, other = $10k
      // Combined = $10k + $20k = $30k (between $25k and $34k)
      // Taxable = min($20k, 0.5*$5k) = min($20k, $2.5k) = $2.5k
      const taxable = calculateTaxableSocialSecurity(40000, 10000, true);
      expect(taxable).toBeWithinDollars(2500, 100);
    });

    it('calculates 85% tier above tier2 ($34k)', () => {
      // SS = $40k, other = $40k
      // Combined = $40k + $20k = $60k (above $34k)
      // Tier1 portion = 0.5 * ($34k - $25k) = $4.5k
      // Tier2 portion = 0.85 * ($60k - $34k) = $22.1k
      // Total = $26.6k, cap at 0.85 * $40k = $34k
      const taxable = calculateTaxableSocialSecurity(40000, 40000, true);
      expect(taxable).toBeWithinDollars(26600, 100);
    });

    it('caps at 85% of SS income for high earners (Single)', () => {
      const taxable = calculateTaxableSocialSecurity(40000, 150000, true);
      expect(taxable).toBeWithinDollars(40000 * 0.85, 1);
    });
  });

  describe('edge cases', () => {
    it('handles zero SS income', () => {
      const taxable = calculateTaxableSocialSecurity(0, 100000, false);
      expect(taxable).toBe(0);
    });

    it('handles zero other income', () => {
      // Combined = 0 + $40k*0.5 = $20k < $32k (MFJ tier1)
      const taxable = calculateTaxableSocialSecurity(40000, 0, false);
      expect(taxable).toBe(0);
    });
  });
});

// =============================================================================
// calculateIRMAA Tests
// =============================================================================
describe('calculateIRMAA', () => {
  // 2026 IRMAA brackets (based on 2024 income)
  describe('MFJ brackets (no inflation)', () => {
    it('returns base premium below first threshold', () => {
      const result = calculateIRMAA(150000, 0, 0, false, 2);
      // Base: Part B = $202.90/mo, Part D = $0/mo (2026)
      expect(result.partB).toBeWithinDollars(202.9 * 12 * 2, 1);
      expect(result.partD).toBe(0);
    });

    it('bracket 1: MAGI > $218,000', () => {
      const result = calculateIRMAA(250000, 0, 0, false, 2);
      // Part B = $284.10/mo, Part D = $14.50/mo (2026)
      expect(result.partB).toBeWithinDollars(284.1 * 12 * 2, 1);
      expect(result.partD).toBeWithinDollars(14.5 * 12 * 2, 1);
    });

    it('bracket 2: MAGI > $274,000', () => {
      const result = calculateIRMAA(300000, 0, 0, false, 2);
      expect(result.partB).toBeWithinDollars(405.8 * 12 * 2, 1);
      expect(result.partD).toBeWithinDollars(37.4 * 12 * 2, 1);
    });

    it('bracket 3: MAGI > $342,000', () => {
      const result = calculateIRMAA(380000, 0, 0, false, 2);
      expect(result.partB).toBeWithinDollars(527.5 * 12 * 2, 1);
      expect(result.partD).toBeWithinDollars(60.3 * 12 * 2, 1);
    });

    it('bracket 4: MAGI > $410,000', () => {
      const result = calculateIRMAA(500000, 0, 0, false, 2);
      expect(result.partB).toBeWithinDollars(649.2 * 12 * 2, 1);
      expect(result.partD).toBeWithinDollars(83.2 * 12 * 2, 1);
    });

    it('bracket 5 (top): MAGI >= $750,000', () => {
      const result = calculateIRMAA(1000000, 0, 0, false, 2);
      expect(result.partB).toBeWithinDollars(689.9 * 12 * 2, 1);
      expect(result.partD).toBeWithinDollars(91.0 * 12 * 2, 1);
    });

    it('calculates total correctly', () => {
      const result = calculateIRMAA(300000, 0, 0, false, 2);
      expect(result.total).toBeWithinDollars(result.partB + result.partD, 1);
    });

    it('handles single person', () => {
      const result = calculateIRMAA(300000, 0, 0, false, 1);
      // Same bracket but for 1 person
      expect(result.partB).toBeWithinDollars(405.8 * 12 * 1, 1);
      expect(result.partD).toBeWithinDollars(37.4 * 12 * 1, 1);
    });
  });

  describe('Single brackets', () => {
    it('returns base premium below first threshold', () => {
      const result = calculateIRMAA(90000, 0, 0, true, 1);
      expect(result.partB).toBeWithinDollars(202.9 * 12, 1);
      expect(result.partD).toBe(0);
    });

    it('bracket 1: MAGI > $109,000', () => {
      const result = calculateIRMAA(120000, 0, 0, true, 1);
      expect(result.partB).toBeWithinDollars(284.1 * 12, 1);
    });

    it('bracket 2: MAGI > $137,000', () => {
      const result = calculateIRMAA(150000, 0, 0, true, 1);
      expect(result.partB).toBeWithinDollars(405.8 * 12, 1);
    });

    it('top bracket: MAGI > $500,000', () => {
      const result = calculateIRMAA(600000, 0, 0, true, 1);
      // 2026 values: Part B = $689.9/mo, Part D = $91.0/mo
      expect(result.partB).toBeWithinDollars(689.9 * 12, 1);
      expect(result.partD).toBeWithinDollars(91.0 * 12, 1);
    });
  });

  describe('inflation adjustment', () => {
    it('inflates thresholds correctly', () => {
      // At 3% inflation for 5 years, $218k threshold becomes ~$253k
      // MAGI of $230k would now be below the inflated first threshold
      const result = calculateIRMAA(230000, 0.03, 5, false, 2);
      // $230k < $218k * 1.03^5 = $252,700, so should be base bracket
      // 2026 base: Part B = $202.9/mo
      expect(result.partB).toBeWithinDollars(202.9 * 12 * 2, 1);
    });
  });
});

// =============================================================================
// calculateRMD Tests
// =============================================================================
describe('calculateRMD', () => {
  describe('age requirements', () => {
    it('returns 0 for age below RMD start age (73)', () => {
      const result = calculateRMD(1000000, 72);
      expect(result.required).toBe(0);
      expect(result.factor).toBe(0);
    });

    it('returns 0 for age 70', () => {
      const result = calculateRMD(1000000, 70);
      expect(result.required).toBe(0);
    });

    it('calculates RMD at age 73 (first RMD year)', () => {
      const result = calculateRMD(1000000, 73);
      // Factor at 73 is 26.5
      expect(result.factor).toBe(26.5);
      expect(result.required).toBeWithinDollars(1000000 / 26.5, 1);
    });

    it('calculates RMD at age 75', () => {
      const result = calculateRMD(1000000, 75);
      expect(result.factor).toBe(24.6);
      expect(result.required).toBeWithinDollars(1000000 / 24.6, 1);
    });

    it('calculates RMD at age 80', () => {
      const result = calculateRMD(1000000, 80);
      expect(result.factor).toBe(20.2);
      expect(result.required).toBeWithinDollars(1000000 / 20.2, 1);
    });

    it('calculates RMD at age 90', () => {
      const result = calculateRMD(1000000, 90);
      expect(result.factor).toBe(12.2);
      expect(result.required).toBeWithinDollars(1000000 / 12.2, 1);
    });

    it('calculates RMD at age 100', () => {
      const result = calculateRMD(1000000, 100);
      expect(result.factor).toBe(6.4);
      expect(result.required).toBeWithinDollars(1000000 / 6.4, 1);
    });

    it('calculates RMD at age 110', () => {
      const result = calculateRMD(1000000, 110);
      expect(result.factor).toBe(3.5);
      expect(result.required).toBeWithinDollars(1000000 / 3.5, 1);
    });

    it('uses age 120 factor for ages above 120', () => {
      const result = calculateRMD(1000000, 125);
      expect(result.factor).toBe(RMD_TABLE[120]);
      expect(result.required).toBeWithinDollars(1000000 / 2.0, 1);
    });
  });

  describe('balance variations', () => {
    it('handles zero balance', () => {
      const result = calculateRMD(0, 75);
      expect(result.required).toBe(0);
    });

    it('handles large balance', () => {
      const result = calculateRMD(10000000, 75);
      expect(result.required).toBeWithinDollars(10000000 / 24.6, 1);
    });

    it('rounds to nearest dollar', () => {
      const result = calculateRMD(1000000, 73);
      expect(Number.isInteger(result.required)).toBe(true);
    });
  });
});

// =============================================================================
// calculateHeirValue Tests
// =============================================================================
describe('calculateHeirValue', () => {
  it('calculates heir value with step-up basis for AT', () => {
    // AT: $500k (step-up, no tax)
    // IRA: $500k (taxed at heir rate)
    // Roth: $500k (tax-free)
    const value = calculateHeirValue(500000, 500000, 500000, 0.37, 0.05);
    // Expected: $500k + $500k + $500k * (1 - 0.42) = $500k + $500k + $290k = $1.29M
    expect(value).toBeWithinDollars(1290000, 1);
  });

  it('handles zero IRA balance (all tax-free)', () => {
    const value = calculateHeirValue(500000, 0, 500000, 0.37, 0.05);
    // All tax-free: $500k + $500k = $1M
    expect(value).toBe(1000000);
  });

  it('handles all IRA (maximum tax impact)', () => {
    const value = calculateHeirValue(0, 1000000, 0, 0.37, 0.05);
    // IRA only: $1M * (1 - 0.42) = $580k
    expect(value).toBeWithinDollars(580000, 1);
  });

  it('handles high tax rate heirs', () => {
    const value = calculateHeirValue(100000, 100000, 100000, 0.37, 0.133);
    // Combined rate: 50.3%
    // Expected: $100k + $100k * (1 - 0.503) + $100k = $200k + $49.7k = $249.7k
    expect(value).toBeWithinDollars(249700, 100);
  });

  it('handles no-tax-state heirs', () => {
    const value = calculateHeirValue(100000, 100000, 100000, 0.37, 0);
    // Combined rate: 37%
    // Expected: $100k + $100k * 0.63 + $100k = $263k
    expect(value).toBeWithinDollars(263000, 1);
  });
});

// =============================================================================
// calculateMultiHeirValue Tests
// =============================================================================
describe('calculateMultiHeirValue', () => {
  describe('single heir', () => {
    it('calculates value for single 100% heir', () => {
      const heirs = [
        {
          name: 'Child',
          splitPercent: 100,
          agi: 200000,
          state: 'IL',
        },
      ];

      const result = calculateMultiHeirValue(500000, 500000, 500000, heirs);
      // Fed rate at $200k AGI: $200k > $94,300 but < $201,050, so 22%
      // State: IL = 4.95%
      // Combined: 26.95%
      // AT + Roth = $1M tax-free, IRA = $500k * (1 - 0.2695) = $365,250
      // Total: $1,365,250
      expect(result.totalValue).toBeWithinDollars(1365250, 100);
      expect(result.details).toHaveLength(1);
    });
  });

  describe('multiple heirs with different rates', () => {
    it('splits 50/50 between heirs with different tax situations', () => {
      const heirs = [
        { name: 'High Earner', splitPercent: 50, agi: 500000, state: 'CA' },
        { name: 'Low Earner', splitPercent: 50, agi: 50000, state: 'TX' },
      ];

      const result = calculateMultiHeirValue(200000, 400000, 200000, heirs);

      expect(result.details).toHaveLength(2);

      // High Earner: 35% fed + 13.3% CA = 48.3%
      // Gets $100k AT + $200k IRA * (1 - 0.483) + $100k Roth = $100k + $103.4k + $100k
      const highEarnerExpected = 100000 + 200000 * (1 - 0.483) + 100000;
      expect(result.details[0].netValue).toBeWithinDollars(highEarnerExpected, 100);

      // Low Earner: 12% fed (50k > 23200 but < 94300) + 0% TX = 12%
      // Gets $100k AT + $200k IRA * 0.88 + $100k Roth = $100k + $176k + $100k = $376k
      const lowEarnerExpected = 100000 + 200000 * 0.88 + 100000;
      expect(result.details[1].netValue).toBeWithinDollars(lowEarnerExpected, 100);

      expect(result.totalValue).toBeWithinDollars(
        result.details[0].netValue + result.details[1].netValue,
        1
      );
    });

    it('handles unequal splits (60/30/10)', () => {
      const heirs = [
        { name: 'Heir1', splitPercent: 60, agi: 100000, state: 'IL' },
        { name: 'Heir2', splitPercent: 30, agi: 100000, state: 'IL' },
        { name: 'Heir3', splitPercent: 10, agi: 100000, state: 'IL' },
      ];

      const result = calculateMultiHeirValue(300000, 300000, 300000, heirs);

      // All heirs have same rate, so total should equal single heir calculation
      const singleHeirValue = calculateHeirValue(300000, 300000, 300000, 0.22, 0.0495);
      expect(result.totalValue).toBeWithinDollars(singleHeirValue, 100);
    });

    it('provides detailed breakdown per heir', () => {
      const heirs = [
        { name: 'Alice', splitPercent: 70, agi: 200000, state: 'NY' },
        { name: 'Bob', splitPercent: 30, agi: 50000, state: 'FL' },
      ];

      const result = calculateMultiHeirValue(100000, 200000, 100000, heirs);

      expect(result.details[0].name).toBe('Alice');
      expect(result.details[0].split).toBe(0.7);
      expect(result.details[0].grossInheritance).toBeWithinDollars(280000, 1);
      // $200k AGI: > $94,300 but < $201,050, so 22% fed rate
      expect(result.details[0].rates.federal).toBe(0.22);
      expect(result.details[0].rates.state).toBe(0.109);

      expect(result.details[1].name).toBe('Bob');
      expect(result.details[1].split).toBe(0.3);
      expect(result.details[1].grossInheritance).toBeWithinDollars(120000, 1);
    });
  });

  describe('fallback behavior', () => {
    it('uses default rates when no heirs provided', () => {
      const result = calculateMultiHeirValue(100000, 100000, 100000, []);
      // Falls back to 37% fed + 4.95% state = 41.95%
      const expected = calculateHeirValue(100000, 100000, 100000, 0.37, 0.0495);
      expect(result).toBe(expected);
    });

    it('uses default rates when heirs is null', () => {
      const result = calculateMultiHeirValue(100000, 100000, 100000, null);
      const expected = calculateHeirValue(100000, 100000, 100000, 0.37, 0.0495);
      expect(result).toBe(expected);
    });
  });
});

// =============================================================================
// calculateRiskAllocation Tests
// =============================================================================
describe('calculateRiskAllocation', () => {
  describe('portfolio-level allocation', () => {
    it('allocates all to low risk when total < lowTarget', () => {
      const result = calculateRiskAllocation(2000000, 500000, 1000000, 500000, 3000000, 2000000);

      expect(result.portfolio.low).toBe(2000000);
      expect(result.portfolio.mod).toBe(0);
      expect(result.portfolio.high).toBe(0);
    });

    it('allocates to low and mod when total < lowTarget + modTarget', () => {
      const result = calculateRiskAllocation(4500000, 1000000, 2000000, 1500000, 3000000, 2000000);

      expect(result.portfolio.low).toBe(3000000);
      expect(result.portfolio.mod).toBe(1500000);
      expect(result.portfolio.high).toBe(0);
    });

    it('allocates across all bands when total > lowTarget + modTarget', () => {
      const result = calculateRiskAllocation(7000000, 1000000, 3000000, 3000000, 3000000, 2000000);

      expect(result.portfolio.low).toBe(3000000);
      expect(result.portfolio.mod).toBe(2000000);
      expect(result.portfolio.high).toBe(2000000);
    });
  });

  describe('account-level allocation (AT -> IRA -> Roth)', () => {
    it('fills AT first with low risk', () => {
      const result = calculateRiskAllocation(5000000, 2000000, 2000000, 1000000, 3000000, 2000000);

      // Low: $3M - fills AT ($2M low), then IRA ($1M low)
      expect(result.at.low).toBe(2000000);
      expect(result.ira.low).toBe(1000000);
      expect(result.roth.low).toBe(0);

      // Mod: $2M - fills remaining IRA ($1M mod), then Roth ($1M mod)
      expect(result.at.mod).toBe(0);
      expect(result.ira.mod).toBe(1000000);
      expect(result.roth.mod).toBe(1000000); // Remaining $1M of mod goes to Roth
    });

    it('allocates correctly with small AT balance', () => {
      const result = calculateRiskAllocation(3000000, 500000, 1500000, 1000000, 1000000, 1000000);

      // Low: $1M - fills AT ($500k), then IRA ($500k)
      expect(result.at.low).toBe(500000);
      expect(result.ira.low).toBe(500000);
      expect(result.roth.low).toBe(0);

      // Mod: $1M - fills remaining IRA ($1M)
      expect(result.ira.mod).toBe(1000000);
      expect(result.roth.mod).toBe(0);

      // High: $1M - all to Roth
      expect(result.roth.high).toBe(1000000);
    });

    it('Roth gets high-risk allocation (tax-free growth)', () => {
      const result = calculateRiskAllocation(10000000, 1000000, 4000000, 5000000, 2000000, 3000000);

      // High risk = $10M - $2M - $3M = $5M
      // Should overflow to Roth
      expect(result.roth.high).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles zero portfolio', () => {
      const result = calculateRiskAllocation(0, 0, 0, 0, 1000000, 1000000);

      expect(result.portfolio.low).toBe(0);
      expect(result.portfolio.mod).toBe(0);
      expect(result.portfolio.high).toBe(0);
    });

    it('handles zero low and mod targets (all high risk)', () => {
      const result = calculateRiskAllocation(1000000, 400000, 400000, 200000, 0, 0);

      expect(result.portfolio.high).toBe(1000000);
      expect(result.at.high).toBe(400000);
      expect(result.ira.high).toBe(400000);
      expect(result.roth.high).toBe(200000);
    });
  });
});

// =============================================================================
// calculateBlendedReturn Tests
// =============================================================================
describe('calculateBlendedReturn', () => {
  it('calculates simple weighted average', () => {
    const allocation = { low: 1000000, mod: 1000000, high: 1000000 };
    const blended = calculateBlendedReturn(allocation, 0.04, 0.06, 0.08);

    // Equal weights: (0.04 + 0.06 + 0.08) / 3 = 0.06
    expect(blended).toBeWithinPercent(0.06, 0.001);
  });

  it('weights by allocation amounts', () => {
    const allocation = { low: 3000000, mod: 2000000, high: 1000000 };
    const blended = calculateBlendedReturn(allocation, 0.04, 0.06, 0.08);

    // Weighted: (3M*0.04 + 2M*0.06 + 1M*0.08) / 6M = (120k + 120k + 80k) / 6M = 0.0533
    expect(blended).toBeWithinPercent(0.0533, 0.001);
  });

  it('returns low return when all in low risk', () => {
    const allocation = { low: 1000000, mod: 0, high: 0 };
    const blended = calculateBlendedReturn(allocation, 0.04, 0.06, 0.08);

    expect(blended).toBe(0.04);
  });

  it('returns high return when all in high risk', () => {
    const allocation = { low: 0, mod: 0, high: 1000000 };
    const blended = calculateBlendedReturn(allocation, 0.04, 0.06, 0.08);

    expect(blended).toBe(0.08);
  });

  it('returns 0 for zero total allocation', () => {
    const allocation = { low: 0, mod: 0, high: 0 };
    const blended = calculateBlendedReturn(allocation, 0.04, 0.06, 0.08);

    expect(blended).toBe(0);
  });

  it('handles negative returns', () => {
    const allocation = { low: 500000, mod: 500000, high: 0 };
    const blended = calculateBlendedReturn(allocation, -0.02, 0.02, 0.08);

    // (500k * -0.02 + 500k * 0.02) / 1M = 0
    expect(blended).toBe(0);
  });
});

// =============================================================================
// calculateIllinoisTax Tests
// =============================================================================
describe('calculateIllinoisTax', () => {
  describe('base tax calculation', () => {
    it('calculates 4.95% flat rate', () => {
      const result = calculateIllinoisTax(100000);
      expect(result.baseTax).toBeWithinDollars(4950, 1);
      expect(result.netTax).toBeWithinDollars(4950, 1);
    });

    it('handles zero income', () => {
      const result = calculateIllinoisTax(0);
      expect(result.baseTax).toBe(0);
      expect(result.netTax).toBe(0);
    });

    it('accepts custom rate', () => {
      const result = calculateIllinoisTax(100000, 0.05);
      expect(result.baseTax).toBeWithinDollars(5000, 1);
      expect(result.netTax).toBeWithinDollars(5000, 1);
    });
  });

  describe('Property Tax Credit', () => {
    it('applies 5% credit when AGI is below MFJ limit ($500k)', () => {
      // $100k investment income, $20k property tax, $400k AGI
      const result = calculateIllinoisTax(100000, 0.0495, 20000, 400000, false);
      expect(result.baseTax).toBeWithinDollars(4950, 1);
      expect(result.propertyTaxCredit).toBeWithinDollars(1000, 1); // 5% of $20k
      expect(result.netTax).toBeWithinDollars(3950, 1);
    });

    it('applies 5% credit when AGI is below Single limit ($250k)', () => {
      const result = calculateIllinoisTax(50000, 0.0495, 15000, 200000, true);
      expect(result.baseTax).toBeWithinDollars(2475, 1);
      expect(result.propertyTaxCredit).toBeWithinDollars(750, 1); // 5% of $15k
      expect(result.netTax).toBeWithinDollars(1725, 1);
    });

    it('does not apply credit when AGI exceeds MFJ limit', () => {
      const result = calculateIllinoisTax(100000, 0.0495, 20000, 600000, false);
      expect(result.baseTax).toBeWithinDollars(4950, 1);
      expect(result.propertyTaxCredit).toBe(0);
      expect(result.netTax).toBeWithinDollars(4950, 1);
      expect(result.creditLimitedByAGI).toBe(true);
    });

    it('does not apply credit when AGI exceeds Single limit', () => {
      const result = calculateIllinoisTax(50000, 0.0495, 15000, 300000, true);
      expect(result.baseTax).toBeWithinDollars(2475, 1);
      expect(result.propertyTaxCredit).toBe(0);
      expect(result.netTax).toBeWithinDollars(2475, 1);
      expect(result.creditLimitedByAGI).toBe(true);
    });

    it('credit is non-refundable (cannot exceed tax owed)', () => {
      // $10k investment income = $495 tax, $50k property tax = $2500 potential credit
      const result = calculateIllinoisTax(10000, 0.0495, 50000, 100000, false);
      expect(result.baseTax).toBeWithinDollars(495, 1);
      expect(result.propertyTaxCredit).toBeWithinDollars(495, 1); // Limited to tax owed
      expect(result.netTax).toBe(0);
      expect(result.creditLimitedByTax).toBe(true);
    });

    it('returns zero credit when no property tax', () => {
      const result = calculateIllinoisTax(100000, 0.0495, 0, 400000, false);
      expect(result.propertyTaxCredit).toBe(0);
      expect(result.netTax).toBeWithinDollars(4950, 1);
    });

    it('applies full credit when AGI is at exactly the limit', () => {
      const result = calculateIllinoisTax(100000, 0.0495, 20000, 500000, false);
      expect(result.propertyTaxCredit).toBeWithinDollars(1000, 1);
      expect(result.netTax).toBeWithinDollars(3950, 1);
    });

    it('denies credit when AGI is $1 over the limit', () => {
      const result = calculateIllinoisTax(100000, 0.0495, 20000, 500001, false);
      expect(result.propertyTaxCredit).toBe(0);
      expect(result.netTax).toBeWithinDollars(4950, 1);
    });
  });
});

// =============================================================================
// getFederalMarginalRate Tests
// =============================================================================
describe('getFederalMarginalRate', () => {
  it('returns 10% for lowest income', () => {
    expect(getFederalMarginalRate(20000)).toBe(0.1);
  });

  it('returns 12% for income above $23,200', () => {
    expect(getFederalMarginalRate(50000)).toBe(0.12);
  });

  it('returns 22% for income above $94,300', () => {
    expect(getFederalMarginalRate(150000)).toBe(0.22);
  });

  it('returns 24% for income above $201,050', () => {
    expect(getFederalMarginalRate(300000)).toBe(0.24);
  });

  it('returns 32% for income above $383,900', () => {
    expect(getFederalMarginalRate(450000)).toBe(0.32);
  });

  it('returns 35% for income above $487,450', () => {
    expect(getFederalMarginalRate(600000)).toBe(0.35);
  });

  it('returns 37% for income above $731,200', () => {
    expect(getFederalMarginalRate(1000000)).toBe(0.37);
  });
});

// =============================================================================
// getStateMarginalRate Tests
// =============================================================================
describe('getStateMarginalRate', () => {
  it('returns 0 for no-tax states', () => {
    expect(getStateMarginalRate('TX', 500000)).toBe(0);
    expect(getStateMarginalRate('FL', 500000)).toBe(0);
    expect(getStateMarginalRate('WA', 500000)).toBe(0);
    expect(getStateMarginalRate('NV', 500000)).toBe(0);
  });

  it('returns correct rate for IL', () => {
    expect(getStateMarginalRate('IL', 100000)).toBe(0.0495);
  });

  it('returns correct rate for high-tax states', () => {
    expect(getStateMarginalRate('CA', 500000)).toBe(0.133);
    expect(getStateMarginalRate('NY', 500000)).toBe(0.109);
    expect(getStateMarginalRate('NJ', 500000)).toBe(0.1075);
  });

  it('handles lowercase state codes', () => {
    expect(getStateMarginalRate('ca', 500000)).toBe(0.133);
    expect(getStateMarginalRate('tx', 500000)).toBe(0);
  });

  it('returns default rate for unknown states', () => {
    expect(getStateMarginalRate('XX', 100000)).toBe(0.05);
  });
});

// =============================================================================
// calculateHeirTaxRates Tests
// =============================================================================
describe('calculateHeirTaxRates', () => {
  it('calculates combined rates correctly', () => {
    const heir = { agi: 200000, state: 'IL' };
    const rates = calculateHeirTaxRates(heir);

    // $200k AGI: > $94,300 but < $201,050, so 22% fed rate
    expect(rates.federal).toBe(0.22);
    expect(rates.state).toBe(0.0495);
    expect(rates.combined).toBeWithinPercent(0.2695, 0.001);
  });

  it('handles high-income heir in high-tax state', () => {
    const heir = { agi: 1000000, state: 'CA' };
    const rates = calculateHeirTaxRates(heir);

    expect(rates.federal).toBe(0.37);
    expect(rates.state).toBe(0.133);
    expect(rates.combined).toBeWithinPercent(0.503, 0.001);
  });

  it('handles low-income heir in no-tax state', () => {
    const heir = { agi: 50000, state: 'TX' };
    const rates = calculateHeirTaxRates(heir);

    expect(rates.federal).toBe(0.12);
    expect(rates.state).toBe(0);
    expect(rates.combined).toBe(0.12);
  });
});

// =============================================================================
// Snapshot Tests for Baseline Scenarios
// =============================================================================
describe('Baseline Scenario Snapshots', () => {
  describe('calculateAllTaxes', () => {
    it('matches baseline for typical MFJ retiree scenario', () => {
      const result = calculateAllTaxes({
        ssIncome: 50000,
        iraWithdrawal: 80000,
        rothConversion: 0,
        otherOrdinaryIncome: 0,
        capitalGains: 30000,
        isSingle: false,
        bracketInflation: 0,
        yearsFromBase: 0,
      });

      expect(result).toMatchSnapshot();
    });

    it('matches baseline for high Roth conversion year', () => {
      const result = calculateAllTaxes({
        ssIncome: 60000,
        iraWithdrawal: 50000,
        rothConversion: 500000,
        otherOrdinaryIncome: 0,
        capitalGains: 50000,
        isSingle: false,
        bracketInflation: 0,
        yearsFromBase: 0,
      });

      expect(result).toMatchSnapshot();
    });

    it('matches baseline for survivor (Single) scenario', () => {
      const result = calculateAllTaxes({
        ssIncome: 35000,
        iraWithdrawal: 60000,
        rothConversion: 0,
        otherOrdinaryIncome: 10000,
        capitalGains: 20000,
        isSingle: true,
        bracketInflation: 0,
        yearsFromBase: 0,
      });

      expect(result).toMatchSnapshot();
    });

    it('matches baseline with bracket inflation', () => {
      const result = calculateAllTaxes({
        ssIncome: 50000,
        iraWithdrawal: 100000,
        rothConversion: 100000,
        otherOrdinaryIncome: 0,
        capitalGains: 40000,
        isSingle: false,
        bracketInflation: 0.03,
        yearsFromBase: 5,
      });

      expect(result).toMatchSnapshot();
    });
  });

  describe('Complex multi-heir scenarios', () => {
    it('matches baseline for 3-heir wealth transfer', () => {
      const heirs = [
        { name: 'Child1', splitPercent: 50, agi: 300000, state: 'CA' },
        { name: 'Child2', splitPercent: 30, agi: 100000, state: 'IL' },
        { name: 'Grandchild', splitPercent: 20, agi: 40000, state: 'TX' },
      ];

      const result = calculateMultiHeirValue(500000, 2000000, 1000000, heirs);

      expect(result).toMatchSnapshot();
    });
  });

  describe('Risk allocation scenarios', () => {
    it('matches baseline for large portfolio allocation', () => {
      const result = calculateRiskAllocation(
        9000000, // total
        500000, // AT
        6000000, // IRA
        2500000, // Roth
        3500000, // low target
        3000000 // mod target
      );

      expect(result).toMatchSnapshot();
    });
  });
});
