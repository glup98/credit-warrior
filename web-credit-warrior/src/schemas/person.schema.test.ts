import { describe, it, expect } from 'vitest';
import {
  personCreateSchema,
  personUpdateSchema,
} from './person.schema';

describe('Person Schemas', () => {
  describe('personCreateSchema', () => {
    const validPayload = {
      name: 'Anyi',
      color_hex: '#10B981',
      is_active: true,
    };

    it('validates a complete valid person payload', () => {
      const parsed = personCreateSchema.parse(validPayload);
      expect(parsed).toEqual(validPayload);
    });

    it('applies default value for is_active and allows optional color_hex', () => {
      const parsed = personCreateSchema.parse({
        name: 'Augusto',
      });
      expect(parsed.name).toBe('Augusto');
      expect(parsed.is_active).toBe(true);
      expect(parsed.color_hex).toBeUndefined();
    });

    it('accepts null for color_hex', () => {
      const parsed = personCreateSchema.parse({
        name: 'Carlos',
        color_hex: null,
      });
      expect(parsed.color_hex).toBeNull();
    });

    it('validates 6-character hex color format with #', () => {
      expect(personCreateSchema.parse({ name: 'User', color_hex: '#abcdef' }).color_hex).toBe('#abcdef');
      expect(personCreateSchema.parse({ name: 'User', color_hex: '#123456' }).color_hex).toBe('#123456');
      expect(personCreateSchema.parse({ name: 'User', color_hex: '#ABCDEF' }).color_hex).toBe('#ABCDEF');
    });

    it('rejects invalid color_hex formats', () => {
      expect(() => personCreateSchema.parse({ name: 'User', color_hex: '10B981' })).toThrow();
      expect(() => personCreateSchema.parse({ name: 'User', color_hex: '#FFF' })).toThrow();
      expect(() => personCreateSchema.parse({ name: 'User', color_hex: '#10B981AA' })).toThrow();
      expect(() => personCreateSchema.parse({ name: 'User', color_hex: 'red' })).toThrow();
    });

    it('rejects empty or whitespace-only name', () => {
      expect(() => personCreateSchema.parse({ name: '' })).toThrow();
      expect(() => personCreateSchema.parse({ name: '   ' })).toThrow();
    });

    it('rejects name exceeding 100 characters', () => {
      expect(() => personCreateSchema.parse({ name: 'p'.repeat(101) })).toThrow();
    });

    it('rejects extra unknown properties due to .strict()', () => {
      expect(() =>
        personCreateSchema.parse({
          name: 'Anyi',
          role: 'ADMIN',
        }),
      ).toThrow();
    });
  });

  describe('personUpdateSchema', () => {
    it('allows partial update with empty object', () => {
      const parsed = personUpdateSchema.parse({});
      expect(parsed).toEqual({});
    });

    it('allows fast archiving with PATCH { is_active: false }', () => {
      const parsed = personUpdateSchema.parse({ is_active: false });
      expect(parsed).toEqual({ is_active: false });
    });

    it('allows nullifying color_hex or name', () => {
      const parsed = personUpdateSchema.parse({
        name: null,
        color_hex: null,
        is_active: null,
      });
      expect(parsed.color_hex).toBeNull();
      expect(parsed.name).toBeNull();
      expect(parsed.is_active).toBeNull();
    });

    it('rejects extra unknown properties due to .strict()', () => {
      expect(() =>
        personUpdateSchema.parse({
          is_active: false,
          unknown_field: 123,
        }),
      ).toThrow();
    });

    it('validates color_hex format if provided and non-null', () => {
      expect(() => personUpdateSchema.parse({ color_hex: '#invalid' })).toThrow();
    });
  });
});
