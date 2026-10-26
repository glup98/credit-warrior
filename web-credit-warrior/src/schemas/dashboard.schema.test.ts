import { describe, it, expect } from 'vitest';
import {
  periodStringSchema,
  dashboardSummaryParamsSchema,
  dashboardProjectionParamsSchema,
} from './dashboard.schema';

describe('dashboard schemas', () => {
  describe('periodStringSchema', () => {
    it('validates correct YYYY-MM period strings', () => {
      expect(periodStringSchema.parse('2026-01')).toBe('2026-01');
      expect(periodStringSchema.parse('2026-11')).toBe('2026-11');
      expect(periodStringSchema.parse('2026-12')).toBe('2026-12');
    });

    it('rejects invalid period strings with descriptive error', () => {
      const invalidValues = ['2026-00', '2026-13', '2026-1', '2026-11-01', 'nov-2026', ''];

      invalidValues.forEach((val) => {
        const result = periodStringSchema.safeParse(val);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe('El formato del período debe ser YYYY-MM');
        }
      });
    });
  });

  describe('dashboardSummaryParamsSchema', () => {
    it('accepts empty object (period is optional)', () => {
      const result = dashboardSummaryParamsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBeUndefined();
      }
    });

    it('accepts valid period string', () => {
      const result = dashboardSummaryParamsSchema.safeParse({ period: '2026-11' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe('2026-11');
      }
    });

    it('accepts null period', () => {
      const result = dashboardSummaryParamsSchema.safeParse({ period: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBeNull();
      }
    });

    it('rejects invalid period format', () => {
      const result = dashboardSummaryParamsSchema.safeParse({ period: '2026-13' });
      expect(result.success).toBe(false);
    });

    it('rejects unrecognized extra fields due to .strict() (Pydantic V2 extra="forbid")', () => {
      const result = dashboardSummaryParamsSchema.safeParse({
        period: '2026-11',
        extra_param: 'not_allowed',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('dashboardProjectionParamsSchema', () => {
    it('applies default months: 6 when omitted', () => {
      const result = dashboardProjectionParamsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.months).toBe(6);
        expect(result.data.start_period).toBeUndefined();
      }
    });

    it('accepts explicit start_period and months within range 1..24', () => {
      const result = dashboardProjectionParamsSchema.safeParse({
        start_period: '2026-11',
        months: 12,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.start_period).toBe('2026-11');
        expect(result.data.months).toBe(12);
      }
    });

    it('accepts null start_period', () => {
      const result = dashboardProjectionParamsSchema.safeParse({
        start_period: null,
        months: 3,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.start_period).toBeNull();
      }
    });

    it('rejects months < 1 or months > 24 or non-integers', () => {
      expect(dashboardProjectionParamsSchema.safeParse({ months: 0 }).success).toBe(false);
      expect(dashboardProjectionParamsSchema.safeParse({ months: 25 }).success).toBe(false);
      expect(dashboardProjectionParamsSchema.safeParse({ months: 5.5 }).success).toBe(false);
    });

    it('rejects invalid start_period format', () => {
      expect(
        dashboardProjectionParamsSchema.safeParse({ start_period: 'invalid' }).success,
      ).toBe(false);
    });

    it('rejects unrecognized extra fields due to .strict()', () => {
      const result = dashboardProjectionParamsSchema.safeParse({
        months: 6,
        unexpected_key: 123,
      });
      expect(result.success).toBe(false);
    });
  });
});
