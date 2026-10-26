import { describe, it, expect } from 'vitest';
import {
  isValidPeriod,
  getNextPeriod,
  getPreviousPeriod,
  PERIOD_REGEX,
} from './date-period';

describe('date-period utilities', () => {
  describe('PERIOD_REGEX', () => {
    it('matches valid YYYY-MM periods', () => {
      expect(PERIOD_REGEX.test('2026-01')).toBe(true);
      expect(PERIOD_REGEX.test('2026-12')).toBe(true);
      expect(PERIOD_REGEX.test('2030-10')).toBe(true);
      expect(PERIOD_REGEX.test('1999-07')).toBe(true);
    });

    it('rejects invalid month numbers and patterns', () => {
      expect(PERIOD_REGEX.test('2026-00')).toBe(false);
      expect(PERIOD_REGEX.test('2026-13')).toBe(false);
      expect(PERIOD_REGEX.test('2026-1')).toBe(false);
      expect(PERIOD_REGEX.test('2026-001')).toBe(false);
      expect(PERIOD_REGEX.test('2026/11')).toBe(false);
      expect(PERIOD_REGEX.test('2026-11-01')).toBe(false);
      expect(PERIOD_REGEX.test('invalid')).toBe(false);
    });
  });

  describe('isValidPeriod', () => {
    it('returns true for valid period strings (including trimmed ones)', () => {
      expect(isValidPeriod('2026-01')).toBe(true);
      expect(isValidPeriod('2026-11')).toBe(true);
      expect(isValidPeriod('2026-12')).toBe(true);
      expect(isValidPeriod('  2026-05  ')).toBe(true);
    });

    it('returns false for null, undefined, or empty values', () => {
      expect(isValidPeriod(null)).toBe(false);
      expect(isValidPeriod(undefined)).toBe(false);
      expect(isValidPeriod('')).toBe(false);
      expect(isValidPeriod('   ')).toBe(false);
    });

    it('returns false for non-string types or malformed values', () => {
      // @ts-expect-error - testing invalid runtime input
      expect(isValidPeriod(202611)).toBe(false);
      // @ts-expect-error - testing invalid runtime input
      expect(isValidPeriod({})).toBe(false);
      expect(isValidPeriod('2026-00')).toBe(false);
      expect(isValidPeriod('2026-13')).toBe(false);
      expect(isValidPeriod('2026-9')).toBe(false);
    });
  });

  describe('getNextPeriod', () => {
    it('increments months within the same year', () => {
      expect(getNextPeriod('2026-01')).toBe('2026-02');
      expect(getNextPeriod('2026-08')).toBe('2026-09');
      expect(getNextPeriod('2026-09')).toBe('2026-10');
      expect(getNextPeriod('2026-10')).toBe('2026-11');
      expect(getNextPeriod('2026-11')).toBe('2026-12');
    });

    it('rolls over year on month 12 overflow (12 -> 01 of next year)', () => {
      expect(getNextPeriod('2026-12')).toBe('2027-01');
      expect(getNextPeriod('2099-12')).toBe('2100-01');
    });

    it('throws an error for invalid input period', () => {
      expect(() => getNextPeriod('2026-13')).toThrow('Invalid period: 2026-13');
      expect(() => getNextPeriod('')).toThrow('Invalid period: ');
      expect(() => getNextPeriod('invalid')).toThrow('Invalid period: invalid');
    });
  });

  describe('getPreviousPeriod', () => {
    it('decrements months within the same year', () => {
      expect(getPreviousPeriod('2026-12')).toBe('2026-11');
      expect(getPreviousPeriod('2026-11')).toBe('2026-10');
      expect(getPreviousPeriod('2026-10')).toBe('2026-09');
      expect(getPreviousPeriod('2026-09')).toBe('2026-08');
      expect(getPreviousPeriod('2026-02')).toBe('2026-01');
    });

    it('rolls over year on month 01 underflow (01 -> 12 of previous year)', () => {
      expect(getPreviousPeriod('2026-01')).toBe('2025-12');
      expect(getPreviousPeriod('2000-01')).toBe('1999-12');
    });

    it('throws an error for invalid input period', () => {
      expect(() => getPreviousPeriod('2026-00')).toThrow('Invalid period: 2026-00');
      expect(() => getPreviousPeriod('')).toThrow('Invalid period: ');
      expect(() => getPreviousPeriod('invalid')).toThrow('Invalid period: invalid');
    });
  });
});
