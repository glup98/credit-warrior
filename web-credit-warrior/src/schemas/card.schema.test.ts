import { describe, it, expect } from 'vitest';
import {
  cardCreateSchema,
  cardUpdateSchema,
  currencyEnumSchema,
  cardMonthlyFeeSchema,
} from './card.schema';

describe('Card Schemas', () => {
  describe('currencyEnumSchema', () => {
    it('accepts CLP and USD', () => {
      expect(currencyEnumSchema.parse('CLP')).toBe('CLP');
      expect(currencyEnumSchema.parse('USD')).toBe('USD');
    });

    it('rejects unsupported currencies', () => {
      expect(() => currencyEnumSchema.parse('EUR')).toThrow();
      expect(() => currencyEnumSchema.parse('ARS')).toThrow();
    });
  });

  describe('cardCreateSchema', () => {
    const validPayload = {
      name: 'Visa Santander',
      last_four_digits: '1234',
      currency: 'CLP',
      closing_day: 25,
      due_day: 10,
      default_monthly_fee: '0',
      is_active: true,
    };

    it('validates a complete valid card payload', () => {
      const parsed = cardCreateSchema.parse(validPayload);
      expect(parsed).toEqual(validPayload);
    });

    it('applies default values for currency and is_active', () => {
      const parsed = cardCreateSchema.parse({
        name: 'Mastercard Bci',
        closing_day: 20,
        due_day: 5,
      });
      expect(parsed.currency).toBe('CLP');
      expect(parsed.is_active).toBe(true);
      expect(parsed.last_four_digits).toBeUndefined();
    });

    it('accepts null for last_four_digits', () => {
      const parsed = cardCreateSchema.parse({
        name: 'Cuenta Corriente',
        last_four_digits: null,
        closing_day: 15,
        due_day: 1,
      });
      expect(parsed.last_four_digits).toBeNull();
    });

    it('rejects invalid last_four_digits format', () => {
      expect(() =>
        cardCreateSchema.parse({ ...validPayload, last_four_digits: '123' }),
      ).toThrow();
      expect(() =>
        cardCreateSchema.parse({ ...validPayload, last_four_digits: 'abcd' }),
      ).toThrow();
      expect(() =>
        cardCreateSchema.parse({ ...validPayload, last_four_digits: '12345' }),
      ).toThrow();
    });

    it('rejects extra unknown properties due to .strict()', () => {
      expect(() =>
        cardCreateSchema.parse({
          ...validPayload,
          unauthorized_extra_prop: 'hacker_payload',
        }),
      ).toThrow();
    });

    it('rejects empty or whitespace-only name', () => {
      expect(() => cardCreateSchema.parse({ ...validPayload, name: '' })).toThrow();
      expect(() => cardCreateSchema.parse({ ...validPayload, name: '   ' })).toThrow();
    });

    it('rejects name exceeding 100 characters', () => {
      expect(() =>
        cardCreateSchema.parse({ ...validPayload, name: 'a'.repeat(101) }),
      ).toThrow();
    });

    it('rejects closing_day and due_day outside 1..31', () => {
      expect(() => cardCreateSchema.parse({ ...validPayload, closing_day: 0 })).toThrow();
      expect(() => cardCreateSchema.parse({ ...validPayload, closing_day: 32 })).toThrow();
      expect(() => cardCreateSchema.parse({ ...validPayload, due_day: 0 })).toThrow();
      expect(() => cardCreateSchema.parse({ ...validPayload, due_day: 32 })).toThrow();
    });

    it('coerces numeric strings for closing_day and due_day', () => {
      const parsed = cardCreateSchema.parse({
        ...validPayload,
        closing_day: '25' as unknown as number,
        due_day: '10' as unknown as number,
      });
      expect(parsed.closing_day).toBe(25);
      expect(parsed.due_day).toBe(10);
    });
  });

  describe('cardUpdateSchema', () => {
    it('allows full partial updates (empty object)', () => {
      const parsed = cardUpdateSchema.parse({});
      expect(parsed).toEqual({});
    });

    it('allows fast archiving with PATCH { is_active: false }', () => {
      const parsed = cardUpdateSchema.parse({ is_active: false });
      expect(parsed).toEqual({ is_active: false });
    });

    it('allows nullifying nullable fields', () => {
      const parsed = cardUpdateSchema.parse({
        last_four_digits: null,
        currency: null,
        closing_day: null,
        due_day: null,
        is_active: null,
      });
      expect(parsed.last_four_digits).toBeNull();
      expect(parsed.closing_day).toBeNull();
      expect(parsed.due_day).toBeNull();
    });

    it('rejects extra unknown properties due to .strict()', () => {
      expect(() =>
        cardUpdateSchema.parse({
          is_active: false,
          forbidden_prop: true,
        }),
      ).toThrow();
    });

    it('validates formats if property is provided and not null', () => {
      expect(() => cardUpdateSchema.parse({ last_four_digits: 'bad' })).toThrow();
      expect(() => cardUpdateSchema.parse({ closing_day: 99 })).toThrow();
    });

    describe('default_monthly_fee in cardUpdateSchema', () => {
      it('allows updating default_monthly_fee with valid values', () => {
        const parsedCLP = cardUpdateSchema.parse({
          currency: 'CLP',
          default_monthly_fee: '4500',
        });
        expect(parsedCLP.default_monthly_fee).toBe('4500');

        const parsedUSD = cardUpdateSchema.parse({
          currency: 'USD',
          default_monthly_fee: '5.50',
        });
        expect(parsedUSD.default_monthly_fee).toBe('5.50');
      });

      it('normalizes empty string to "0"', () => {
        const parsed = cardUpdateSchema.parse({
          default_monthly_fee: '',
        });
        expect(parsed.default_monthly_fee).toBe('0');
      });

      it('allows setting default_monthly_fee to null', () => {
        const parsed = cardUpdateSchema.parse({
          default_monthly_fee: null,
        });
        expect(parsed.default_monthly_fee).toBeNull();
      });

      it('rejects decimals in CLP for default_monthly_fee', () => {
        expect(() =>
          cardUpdateSchema.parse({
            currency: 'CLP',
            default_monthly_fee: '4500.50',
          }),
        ).toThrow();
      });

      it('rejects >2 decimals in USD for default_monthly_fee', () => {
        expect(() =>
          cardUpdateSchema.parse({
            currency: 'USD',
            default_monthly_fee: '5.123',
          }),
        ).toThrow();
      });

      it('rejects negative default_monthly_fee', () => {
        expect(() =>
          cardUpdateSchema.parse({
            default_monthly_fee: '-500',
          }),
        ).toThrow();
      });
    });
  });

  describe('default_monthly_fee in cardCreateSchema', () => {
    const basePayload = {
      name: 'Visa Banco',
      closing_day: 20,
      due_day: 5,
    };

    it('defaults default_monthly_fee to "0" when omitted', () => {
      const parsed = cardCreateSchema.parse(basePayload);
      expect(parsed.default_monthly_fee).toBe('0');
    });

    it('normalizes empty string or whitespace to "0"', () => {
      const parsedEmpty = cardCreateSchema.parse({
        ...basePayload,
        default_monthly_fee: '',
      });
      expect(parsedEmpty.default_monthly_fee).toBe('0');

      const parsedWhitespace = cardCreateSchema.parse({
        ...basePayload,
        default_monthly_fee: '   ',
      });
      expect(parsedWhitespace.default_monthly_fee).toBe('0');
    });

    it('accepts integer default_monthly_fee in CLP', () => {
      const parsed = cardCreateSchema.parse({
        ...basePayload,
        currency: 'CLP',
        default_monthly_fee: '4500',
      });
      expect(parsed.default_monthly_fee).toBe('4500');
    });

    it('rejects decimal default_monthly_fee in CLP', () => {
      expect(() =>
        cardCreateSchema.parse({
          ...basePayload,
          currency: 'CLP',
          default_monthly_fee: '4500.50',
        }),
      ).toThrow();
    });

    it('accepts up to 2 decimal places in USD', () => {
      const parsed1 = cardCreateSchema.parse({
        ...basePayload,
        currency: 'USD',
        default_monthly_fee: '5.00',
      });
      expect(parsed1.default_monthly_fee).toBe('5.00');

      const parsed2 = cardCreateSchema.parse({
        ...basePayload,
        currency: 'USD',
        default_monthly_fee: '3.5',
      });
      expect(parsed2.default_monthly_fee).toBe('3.5');
    });

    it('rejects >2 decimal places in USD', () => {
      expect(() =>
        cardCreateSchema.parse({
          ...basePayload,
          currency: 'USD',
          default_monthly_fee: '5.123',
        }),
      ).toThrow();
    });

    it('rejects negative default_monthly_fee', () => {
      expect(() =>
        cardCreateSchema.parse({
          ...basePayload,
          default_monthly_fee: '-100',
        }),
      ).toThrow();
    });
  });

  describe('cardMonthlyFeeSchema', () => {
    it('validates and accepts valid fee amounts', () => {
      const parsedCLP = cardMonthlyFeeSchema.parse({ fee: '4500' });
      expect(parsedCLP).toEqual({ fee: '4500' });

      const parsedUSD = cardMonthlyFeeSchema.parse({ fee: '5.50' });
      expect(parsedUSD).toEqual({ fee: '5.50' });
    });

    it('normalizes empty string to "0"', () => {
      const parsed = cardMonthlyFeeSchema.parse({ fee: '' });
      expect(parsed).toEqual({ fee: '0' });
    });

    it('rejects negative fee amounts', () => {
      expect(() => cardMonthlyFeeSchema.parse({ fee: '-10' })).toThrow();
    });

    it('rejects extra unknown properties due to .strict()', () => {
      expect(() =>
        cardMonthlyFeeSchema.parse({
          fee: '4500',
          unauthorized_extra: 'exploit',
        }),
      ).toThrow();
    });
  });
});
