/**
 * Tests for calculationDependencies.js
 * Verifies forward/back references are properly configured
 */

import { describe, it, expect } from 'vitest';

import {
  CELL_DEPENDENCIES,
  getReverseDependencies,
  DEPENDENCY_SIGNS,
} from './calculationDependencies';

// Mock projection data for testing
const createMockProjections = () => [
  {
    year: 2026,
    age: 64,
    yearsFromStart: 0,
    atBOY: 500000,
    iraBOY: 1000000,
    rothBOY: 200000,
    totalBOY: 1700000,
    costBasisBOY: 250000,
    ssAnnual: 0,
    expenses: 120000,
    rmdRequired: 0,
    rmdFactor: 0,
    rothConversion: 50000,
    atWithdrawal: 70000,
    iraWithdrawal: 50000,
    rothWithdrawal: 0,
    totalWithdrawal: 120000,
    capitalGains: 35000,
    ordinaryIncome: 100000,
    taxableOrdinary: 68000,
    federalTax: 8000,
    ltcgTax: 5250,
    niit: 0,
    stateTax: 1733,
    totalTax: 14983,
    irmaaTotal: 0,
    irmaaMAGI: 180000,
    irmaaPartB: 0,
    irmaaPartD: 0,
    atEOY: 460000,
    iraEOY: 960000,
    rothEOY: 265000,
    totalEOY: 1685000,
    costBasisEOY: 215000,
    cumulativeTax: 14983,
    cumulativeATTax: 5250,
  },
  {
    year: 2027,
    age: 65,
    yearsFromStart: 1,
    atBOY: 460000,
    iraBOY: 960000,
    rothBOY: 265000,
    totalBOY: 1685000,
    costBasisBOY: 215000,
    ssAnnual: 36000,
    expenses: 123600,
    rmdRequired: 0,
    rmdFactor: 0,
    rothConversion: 40000,
    atWithdrawal: 60000,
    iraWithdrawal: 40000,
    rothWithdrawal: 0,
    totalWithdrawal: 100000,
    capitalGains: 30000,
    ordinaryIncome: 110000,
    taxableOrdinary: 78000,
    federalTax: 10000,
    ltcgTax: 4500,
    niit: 0,
    stateTax: 1485,
    totalTax: 15985,
    irmaaTotal: 0,
    irmaaMAGI: 200000,
    irmaaPartB: 0,
    irmaaPartD: 0,
    atEOY: 424000,
    iraEOY: 976000,
    rothEOY: 323000,
    totalEOY: 1723000,
    costBasisEOY: 187000,
    cumulativeTax: 30968,
    cumulativeATTax: 9750,
  },
  {
    year: 2035,
    age: 73,
    yearsFromStart: 9,
    atBOY: 300000,
    iraBOY: 1200000,
    rothBOY: 500000,
    totalBOY: 2000000,
    costBasisBOY: 150000,
    ssAnnual: 48000,
    expenses: 150000,
    rmdRequired: 45283, // IRA BOY / 26.5 factor at age 73
    rmdFactor: 26.5,
    rothConversion: 30000,
    atWithdrawal: 80000,
    iraWithdrawal: 45283, // At least RMD
    rothWithdrawal: 0,
    totalWithdrawal: 125283,
    capitalGains: 40000,
    ordinaryIncome: 120000,
    taxableOrdinary: 88000,
    federalTax: 12000,
    ltcgTax: 6000,
    niit: 0,
    stateTax: 1980,
    totalTax: 19980,
    irmaaTotal: 2400,
    irmaaMAGI: 220000,
    irmaaPartB: 2000,
    irmaaPartD: 400,
    atEOY: 233200,
    iraEOY: 1192461,
    rothEOY: 561800,
    totalEOY: 1987461,
    costBasisEOY: 110000,
    cumulativeTax: 150000,
    cumulativeATTax: 50000,
  },
];

describe('CELL_DEPENDENCIES', () => {
  describe('withdrawal field dependencies', () => {
    const mockProjections = createMockProjections();
    const year2035 = mockProjections[2];

    it('atWithdrawal should depend on expenses, totalTax, irmaaTotal, ssAnnual, rmdRequired, atBOY', () => {
      expect(CELL_DEPENDENCIES.atWithdrawal).toBeDefined();
      const deps = CELL_DEPENDENCIES.atWithdrawal(2035, year2035, mockProjections);
      const depFields = deps.map(d => d.field);

      expect(depFields).toContain('expenses');
      expect(depFields).toContain('totalTax');
      expect(depFields).toContain('irmaaTotal');
      expect(depFields).toContain('ssAnnual');
      expect(depFields).toContain('rmdRequired');
      expect(depFields).toContain('atBOY');
    });

    it('iraWithdrawal should depend on rmdRequired (critical for RMD forward reference)', () => {
      expect(CELL_DEPENDENCIES.iraWithdrawal).toBeDefined();
      const deps = CELL_DEPENDENCIES.iraWithdrawal(2035, year2035, mockProjections);
      const depFields = deps.map(d => d.field);

      expect(depFields).toContain('rmdRequired');
      expect(depFields).toContain('iraBOY');
      expect(depFields).toContain('rothConversion');
      expect(depFields).toContain('expenses');
    });

    it('rothWithdrawal should depend on all account balances', () => {
      expect(CELL_DEPENDENCIES.rothWithdrawal).toBeDefined();
      const deps = CELL_DEPENDENCIES.rothWithdrawal(2035, year2035, mockProjections);
      const depFields = deps.map(d => d.field);

      expect(depFields).toContain('atBOY');
      expect(depFields).toContain('iraBOY');
      expect(depFields).toContain('rothBOY');
      expect(depFields).toContain('expenses');
    });
  });

  describe('cost basis dependencies', () => {
    const mockProjections = createMockProjections();

    it('costBasisBOY should depend on prior year costBasisEOY', () => {
      expect(CELL_DEPENDENCIES.costBasisBOY).toBeDefined();
      const deps = CELL_DEPENDENCIES.costBasisBOY(2027, mockProjections[1], mockProjections);

      expect(deps.length).toBe(1);
      expect(deps[0].field).toBe('costBasisEOY');
      expect(deps[0].year).toBe(2026);
    });

    it('costBasisBOY should return empty for first year', () => {
      const deps = CELL_DEPENDENCIES.costBasisBOY(2026, mockProjections[0], mockProjections);
      expect(deps.length).toBe(0);
    });

    it('costBasisEOY should depend on costBasisBOY, atWithdrawal, atBOY', () => {
      expect(CELL_DEPENDENCIES.costBasisEOY).toBeDefined();
      const deps = CELL_DEPENDENCIES.costBasisEOY(2026, mockProjections[0], mockProjections);
      const depFields = deps.map(d => d.field);

      expect(depFields).toContain('costBasisBOY');
      expect(depFields).toContain('atWithdrawal');
      expect(depFields).toContain('atBOY');
    });
  });

  describe('irmaaMAGI dependencies', () => {
    const mockProjections = createMockProjections();

    it('irmaaMAGI should depend on ordinaryIncome, capitalGains, rothConversion', () => {
      expect(CELL_DEPENDENCIES.irmaaMAGI).toBeDefined();
      const deps = CELL_DEPENDENCIES.irmaaMAGI(2026, mockProjections[0], mockProjections);
      const depFields = deps.map(d => d.field);

      expect(depFields).toContain('ordinaryIncome');
      expect(depFields).toContain('capitalGains');
      expect(depFields).toContain('rothConversion');
    });
  });

  describe('cumulativeATTax dependencies', () => {
    const mockProjections = createMockProjections();

    it('cumulativeATTax should depend on ltcgTax and prior cumulativeATTax', () => {
      expect(CELL_DEPENDENCIES.cumulativeATTax).toBeDefined();
      const deps = CELL_DEPENDENCIES.cumulativeATTax(2027, mockProjections[1], mockProjections);
      const depFields = deps.map(d => d.field);

      expect(depFields).toContain('ltcgTax');
      // Should have prior year cumulativeATTax
      const priorDep = deps.find(d => d.field === 'cumulativeATTax');
      expect(priorDep).toBeDefined();
      expect(priorDep.year).toBe(2026);
    });

    it('cumulativeATTax should only depend on ltcgTax for first year', () => {
      const deps = CELL_DEPENDENCIES.cumulativeATTax(2026, mockProjections[0], mockProjections);
      expect(deps.length).toBe(1);
      expect(deps[0].field).toBe('ltcgTax');
    });
  });
});

describe('getReverseDependencies (forward references)', () => {
  const mockProjections = createMockProjections();

  it('rmdRequired should show iraWithdrawal as forward reference', () => {
    const usedBy = getReverseDependencies('rmdRequired', 2035, mockProjections);
    const usedByFields = usedBy.map(d => d.field);

    expect(usedByFields).toContain('iraWithdrawal');
    // Should also be used by atWithdrawal (affects withdrawal order)
    expect(usedByFields).toContain('atWithdrawal');
  });

  it('expenses should show all withdrawal fields as forward references', () => {
    const usedBy = getReverseDependencies('expenses', 2035, mockProjections);
    const usedByFields = usedBy.map(d => d.field);

    expect(usedByFields).toContain('atWithdrawal');
    expect(usedByFields).toContain('iraWithdrawal');
    expect(usedByFields).toContain('rothWithdrawal');
  });

  it('costBasisBOY should show costBasisEOY as forward reference', () => {
    const usedBy = getReverseDependencies('costBasisBOY', 2026, mockProjections);
    const usedByFields = usedBy.map(d => d.field);

    expect(usedByFields).toContain('costBasisEOY');
    expect(usedByFields).toContain('capitalGains'); // Also used by capitalGains
  });

  it('costBasisEOY should show next year costBasisBOY as forward reference', () => {
    const usedBy = getReverseDependencies('costBasisEOY', 2026, mockProjections);
    const nextYearBOY = usedBy.find(d => d.field === 'costBasisBOY' && d.year === 2027);

    expect(nextYearBOY).toBeDefined();
  });

  it('ordinaryIncome should show irmaaMAGI as forward reference', () => {
    const usedBy = getReverseDependencies('ordinaryIncome', 2026, mockProjections);
    const usedByFields = usedBy.map(d => d.field);

    expect(usedByFields).toContain('irmaaMAGI');
  });

  it('ltcgTax should show cumulativeATTax as forward reference', () => {
    const usedBy = getReverseDependencies('ltcgTax', 2026, mockProjections);
    const usedByFields = usedBy.map(d => d.field);

    expect(usedByFields).toContain('cumulativeATTax');
    expect(usedByFields).toContain('totalTax'); // Also used by totalTax
  });

  it('iraBOY should show rmdRequired as forward reference', () => {
    const usedBy = getReverseDependencies('iraBOY', 2035, mockProjections);
    const usedByFields = usedBy.map(d => d.field);

    expect(usedByFields).toContain('rmdRequired');
    expect(usedByFields).toContain('iraWithdrawal');
    expect(usedByFields).toContain('iraEOY');
  });
});

describe('DEPENDENCY_SIGNS', () => {
  it('should have signs for new withdrawal-related fields', () => {
    expect(DEPENDENCY_SIGNS.expenses).toBe('+');
    expect(DEPENDENCY_SIGNS.rmdRequired).toBe('+');
    expect(DEPENDENCY_SIGNS.irmaaMAGI).toBe('+');
    expect(DEPENDENCY_SIGNS.cumulativeATTax).toBe('+');
  });

  it('should have signs for cost basis fields', () => {
    expect(DEPENDENCY_SIGNS.costBasisBOY).toBe('+');
    expect(DEPENDENCY_SIGNS.costBasisEOY).toBe('+');
  });
});
