import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  formatPeriod,
  formatDate,
  formatMaskedCard,
  toCents,
  formatLocalDate,
} from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    describe('CLP (Chilean Peso)', () => {
      it('formats standard integer amounts with thousand dot separators and $ prefix', () => {
        expect(formatCurrency('100000', 'CLP')).toBe('$100.000');
        expect(formatCurrency('1000', 'CLP')).toBe('$1.000');
        expect(formatCurrency('1500000', 'CLP')).toBe('$1.500.000');
        expect(formatCurrency('500', 'CLP')).toBe('$500');
      });

      it('formats zero amounts as $0 without decimals', () => {
        expect(formatCurrency('0', 'CLP')).toBe('$0');
        expect(formatCurrency('0.00', 'CLP')).toBe('$0');
      });

      it('handles whitespace around valid numbers', () => {
        expect(formatCurrency('  100000  ', 'CLP')).toBe('$100.000');
      });

      it('returns $0 for falsy, empty or invalid strings', () => {
        expect(formatCurrency(null, 'CLP')).toBe('$0');
        expect(formatCurrency(undefined, 'CLP')).toBe('$0');
        expect(formatCurrency('', 'CLP')).toBe('$0');
        expect(formatCurrency('   ', 'CLP')).toBe('$0');
        expect(formatCurrency('invalid', 'CLP')).toBe('$0');
        expect(formatCurrency('-100', 'CLP')).toBe('$0');
      });
    });

    describe('USD (US Dollar)', () => {
      it('formats amounts with US$ prefix and exactly 2 decimals separated by a dot', () => {
        expect(formatCurrency('33.34', 'USD')).toBe('US$33.34');
        expect(formatCurrency('12.50', 'USD')).toBe('US$12.50');
      });

      it('pads single-decimal and zero-decimal values with trailing zeros', () => {
        expect(formatCurrency('30', 'USD')).toBe('US$30.00');
        expect(formatCurrency('30.0', 'USD')).toBe('US$30.00');
        expect(formatCurrency('30.5', 'USD')).toBe('US$30.50');
      });

      it('formats zero amounts as US$0.00', () => {
        expect(formatCurrency('0', 'USD')).toBe('US$0.00');
        expect(formatCurrency('0.00', 'USD')).toBe('US$0.00');
      });

      it('handles thousand separators in USD integer part', () => {
        expect(formatCurrency('1000', 'USD')).toBe('US$1.000.00');
      });

      it('handles whitespace around valid numbers', () => {
        expect(formatCurrency('  33.34  ', 'USD')).toBe('US$33.34');
      });

      it('returns US$0.00 for falsy, empty or invalid strings', () => {
        expect(formatCurrency(null, 'USD')).toBe('US$0.00');
        expect(formatCurrency(undefined, 'USD')).toBe('US$0.00');
        expect(formatCurrency('', 'USD')).toBe('US$0.00');
        expect(formatCurrency('   ', 'USD')).toBe('US$0.00');
        expect(formatCurrency('invalid', 'USD')).toBe('US$0.00');
        expect(formatCurrency('-50.00', 'USD')).toBe('US$0.00');
      });
    });
  });

  describe('formatPercentage', () => {
    it('formats percentages with exactly 2 decimals and % suffix', () => {
      expect(formatPercentage('70')).toBe('70.00%');
      expect(formatPercentage('33.33')).toBe('33.33%');
      expect(formatPercentage('100')).toBe('100.00%');
    });

    it('pads single-decimal values to 2 decimals', () => {
      expect(formatPercentage('33.3')).toBe('33.30%');
      expect(formatPercentage('0.5')).toBe('0.50%');
    });

    it('formats zero as 0.00%', () => {
      expect(formatPercentage('0')).toBe('0.00%');
      expect(formatPercentage('0.0')).toBe('0.00%');
      expect(formatPercentage('0.00')).toBe('0.00%');
    });

    it('handles whitespace around percentage strings', () => {
      expect(formatPercentage('  50.5  ')).toBe('50.50%');
    });

    it('returns 0.00% for falsy, empty or invalid strings', () => {
      expect(formatPercentage(null)).toBe('0.00%');
      expect(formatPercentage(undefined)).toBe('0.00%');
      expect(formatPercentage('')).toBe('0.00%');
      expect(formatPercentage('   ')).toBe('0.00%');
      expect(formatPercentage('abc')).toBe('0.00%');
      expect(formatPercentage('-10')).toBe('0.00%');
    });
  });

  describe('formatPeriod', () => {
    it('formats YYYY-MM periods in full Spanish format by default', () => {
      expect(formatPeriod('2026-11')).toBe('Noviembre 2026');
      expect(formatPeriod('2026-11', 'full')).toBe('Noviembre 2026');
      expect(formatPeriod('2026-01')).toBe('Enero 2026');
      expect(formatPeriod('2026-05')).toBe('Mayo 2026');
      expect(formatPeriod('2026-12')).toBe('Diciembre 2026');
    });

    it('formats YYYY-MM periods in short format when specified', () => {
      expect(formatPeriod('2026-11', 'short')).toBe('Nov 2026');
      expect(formatPeriod('2026-01', 'short')).toBe('Ene 2026');
      expect(formatPeriod('2026-07', 'short')).toBe('Jul 2026');
      expect(formatPeriod('2026-09', 'short')).toBe('Sep 2026');
      expect(formatPeriod('2026-12', 'short')).toBe('Dic 2026');
    });

    it('supports compact format alias matching short output', () => {
      expect(formatPeriod('2026-11', 'compact')).toBe('Nov 2026');
    });

    it('correctly maps all 12 months', () => {
      const monthsFull = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ];
      const monthsShort = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
      ];

      for (let i = 1; i <= 12; i++) {
        const monthStr = String(i).padStart(2, '0');
        const period = `2026-${monthStr}`;
        expect(formatPeriod(period, 'full')).toBe(`${monthsFull[i - 1]} 2026`);
        expect(formatPeriod(period, 'short')).toBe(`${monthsShort[i - 1]} 2026`);
      }
    });

    it('returns empty string for falsy or empty inputs', () => {
      expect(formatPeriod(null)).toBe('');
      expect(formatPeriod(undefined)).toBe('');
      expect(formatPeriod('')).toBe('');
      expect(formatPeriod('   ')).toBe('');
    });

    it('returns the raw string as fallback for invalid period formats', () => {
      expect(formatPeriod('2026-13')).toBe('2026-13');
      expect(formatPeriod('invalid-date')).toBe('invalid-date');
      expect(formatPeriod('2026/11')).toBe('2026/11');
    });

    it('is immune to UTC timezone offsets by parsing string directly without Date constructor', () => {
      // Direct string parsing ensures "2026-11" never shifts to "Octubre 2026" in UTC-3
      const period = '2026-11';
      expect(formatPeriod(period)).toBe('Noviembre 2026');
      expect(formatPeriod(period, 'short')).toBe('Nov 2026');
    });
  });

  describe('formatDate', () => {
    it('formats YYYY-MM-DD into Spanish civil date (D mmm YYYY)', () => {
      expect(formatDate('2026-10-16')).toBe('16 oct 2026');
      expect(formatDate('2026-01-01')).toBe('1 ene 2026');
      expect(formatDate('2026-05-09')).toBe('9 may 2026');
      expect(formatDate('2026-12-31')).toBe('31 dic 2026');
    });

    it('parses day without leading zero for single digits', () => {
      expect(formatDate('2026-04-05')).toBe('5 abr 2026');
    });

    it('returns empty string for falsy or empty inputs', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
      expect(formatDate('   ')).toBe('');
    });

    it('returns the raw string as safe fallback for invalid formats', () => {
      expect(formatDate('invalid')).toBe('invalid');
      expect(formatDate('2026-99-99')).toBe('2026-99-99');
    });

    it('is immune to UTC midnight shift in western timezones', () => {
      // In UTC-3/UTC-4, new Date("2026-10-16") shifts to "15 oct 2026"
      // Direct string parsing guarantees day 16 stays 16
      expect(formatDate('2026-10-16')).toBe('16 oct 2026');
    });
  });

  describe('formatMaskedCard', () => {
    it('formats 4 digits with bullet mask prefix', () => {
      expect(formatMaskedCard('1234')).toBe('•••• 1234');
      expect(formatMaskedCard('0000')).toBe('•••• 0000');
      expect(formatMaskedCard('9876')).toBe('•••• 9876');
    });

    it('handles whitespace around 4 digits', () => {
      expect(formatMaskedCard('  1234  ')).toBe('•••• 1234');
    });

    it('returns empty string for null, undefined, empty or whitespace-only', () => {
      expect(formatMaskedCard(null)).toBe('');
      expect(formatMaskedCard(undefined)).toBe('');
      expect(formatMaskedCard('')).toBe('');
      expect(formatMaskedCard('   ')).toBe('');
    });

    it('returns empty string if length is not exactly 4 digits', () => {
      expect(formatMaskedCard('123')).toBe('');
      expect(formatMaskedCard('12345')).toBe('');
      expect(formatMaskedCard('1')).toBe('');
    });

    it('returns empty string if input contains non-digit characters', () => {
      expect(formatMaskedCard('12a4')).toBe('');
      expect(formatMaskedCard('abcd')).toBe('');
      expect(formatMaskedCard('12-4')).toBe('');
    });
  });

  describe('toCents', () => {
    it('converts integer strings to cents (* 100)', () => {
      expect(toCents('100')).toBe(10000);
      expect(toCents('1')).toBe(100);
      expect(toCents('0')).toBe(0);
    });

    it('converts two-decimal strings deterministically', () => {
      expect(toCents('33.34')).toBe(3334);
      expect(toCents('0.05')).toBe(5);
      expect(toCents('0.99')).toBe(99);
      expect(toCents('100.50')).toBe(10050);
    });

    it('pads single decimal places with a trailing zero', () => {
      expect(toCents('33.3')).toBe(3330);
      expect(toCents('0.5')).toBe(50);
    });

    it('handles zero values consistently', () => {
      expect(toCents('0')).toBe(0);
      expect(toCents('0.0')).toBe(0);
      expect(toCents('0.00')).toBe(0);
    });

    it('handles whitespace around numbers', () => {
      expect(toCents('  50.25  ')).toBe(5025);
    });

    it('returns 0 for falsy, empty, negative or invalid values', () => {
      expect(toCents(null)).toBe(0);
      expect(toCents(undefined)).toBe(0);
      expect(toCents('')).toBe(0);
      expect(toCents('   ')).toBe(0);
      expect(toCents('abc')).toBe(0);
      expect(toCents('-10')).toBe(0);
      expect(toCents('10.123')).toBe(0); // more than 2 decimals rejected
    });

    it('guarantees exact sum validation without IEEE 754 precision loss', () => {
      // 33.33 + 33.33 + 33.34 = 100.00
      const split1 = toCents('33.33'); // 3333
      const split2 = toCents('33.33'); // 3333
      const split3 = toCents('33.34'); // 3334
      expect(split1 + split2 + split3).toBe(10000);
    });
  });

  describe('formatLocalDate', () => {
    it('formats a given Date to local YYYY-MM-DD string', () => {
      const testDate = new Date(2026, 9, 20); // 20 Oct 2026 local
      expect(formatLocalDate(testDate)).toBe('2026-10-20');
    });

    it('pads single-digit month and day with leading zeroes', () => {
      const testDate = new Date(2026, 0, 5); // 5 Jan 2026 local
      expect(formatLocalDate(testDate)).toBe('2026-01-05');
    });
  });
});

