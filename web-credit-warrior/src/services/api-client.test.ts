import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiClient,
  ApiError,
  buildQueryString,
} from './api-client';
import { checkHealth } from './health.service';
import { mapPydanticErrorsToForm } from '@/lib/utils';
import type { ValidationErrorItem, HealthResponse } from '@/types/api.types';

describe('HTTP Client & Error Normalization', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('buildQueryString', () => {
    it('returns empty string for empty, null, or undefined params', () => {
      expect(buildQueryString()).toBe('');
      expect(buildQueryString({})).toBe('');
      expect(buildQueryString({ key: undefined, other: null, empty: '' })).toBe('');
    });

    it('filters out falsy and null values while preserving valid parameters', () => {
      const params = {
        is_active: true,
        currency: 'CLP',
        search: '',
        count: 0,
        page: undefined,
        filter: null,
      };
      const qs = buildQueryString(params);
      expect(qs).toBe('?is_active=true&currency=CLP&count=0');
    });

    it('converts boolean values to string representations', () => {
      expect(buildQueryString({ is_active: false })).toBe('?is_active=false');
      expect(buildQueryString({ is_active: true })).toBe('?is_active=true');
    });
  });

  describe('ApiError class', () => {
    it('instantiates correctly for string detail (domain error)', () => {
      const err = new ApiError(404, 'Tarjeta no encontrada');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.name).toBe('ApiError');
      expect(err.status).toBe(404);
      expect(err.detail).toBe('Tarjeta no encontrada');
      expect(err.message).toBe('Tarjeta no encontrada');
      expect(err.isDomainError).toBe(true);
      expect(err.isValidationError).toBe(false);
      expect(err.validationErrors).toEqual([]);
    });

    it('instantiates correctly for validation error array', () => {
      const valErrors: ValidationErrorItem[] = [
        { loc: ['body', 'name'], msg: 'Field required', type: 'value_error.missing' },
      ];
      const err = new ApiError(422, valErrors);
      expect(err.status).toBe(422);
      expect(err.isDomainError).toBe(false);
      expect(err.isValidationError).toBe(true);
      expect(err.validationErrors).toEqual(valErrors);
      expect(err.message).toBe('Error de validación en los datos enviados');
    });
  });

  describe('apiClient HTTP methods', () => {
    it('executes GET requests successfully with parsed JSON response', async () => {
      const mockData = [{ id: '1', name: 'Visa' }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      } as unknown as Response);

      const result = await apiClient.get<typeof mockData>('/api/v1/cards');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/cards'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockData);
    });

    it('attaches query parameters on GET request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } as unknown as Response);

      await apiClient.get('/api/v1/cards', { is_active: true, currency: 'USD' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/cards?is_active=true&currency=USD'),
        expect.anything(),
      );
    });

    it('executes POST request with JSON payload and Content-Type header', async () => {
      const payload = { name: 'Santander', closing_day: 25, due_day: 10 };
      const responseData = { id: 'uuid-1', ...payload };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => responseData,
      } as unknown as Response);

      const result = await apiClient.post<typeof responseData>('/api/v1/cards', payload);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/cards'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
      expect(result).toEqual(responseData);
    });

    it('executes PUT request serializing JSON body', async () => {
      const payload = { description: 'Updated' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1', ...payload }),
      } as unknown as Response);

      await apiClient.put('/api/v1/expenses/1', payload);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/expenses/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(payload),
        }),
      );
    });

    it('executes PATCH request serializing JSON body', async () => {
      const payload = { is_active: false };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1', ...payload }),
      } as unknown as Response);

      await apiClient.patch('/api/v1/cards/1', payload);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/cards/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(payload),
        }),
      );
    });

    it('executes DELETE request and safely handles 204 No Content without invoking response.json()', async () => {
      const jsonMock = vi.fn();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: jsonMock,
      } as unknown as Response);

      const result = await apiClient.delete('/api/v1/cards/uuid-1');
      expect(jsonMock).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('Error handling in apiClient', () => {
    it('throws ApiError with detail message on 400 Bad Request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Parámetros inválidos' }),
      } as unknown as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
      try {
        await apiClient.get('/test');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(400);
        expect(apiErr.detail).toBe('Parámetros inválidos');
      }
    });

    it('throws ApiError on 409 Conflict (e.g. card has expenses)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ detail: 'Esta tarjeta tiene compras asociadas' }),
      } as unknown as Response);

      try {
        await apiClient.delete('/api/v1/cards/uuid-1');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.detail).toBe('Esta tarjeta tiene compras asociadas');
      }
    });

    it('throws ApiError on 422 Unprocessable Entity with validation details array', async () => {
      const validationPayload: ValidationErrorItem[] = [
        { loc: ['body', 'splits', 0, 'percentage'], msg: 'Excede 100%', type: 'value_error' },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ detail: validationPayload }),
      } as unknown as Response);

      try {
        await apiClient.post('/api/v1/expenses', {});
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(422);
        expect(apiErr.isValidationError).toBe(true);
        expect(apiErr.validationErrors).toEqual(validationPayload);
      }
    });

    it('handles network failure by throwing ApiError with status 0', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      try {
        await apiClient.get('/api/v1/cards');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(0);
        expect(apiErr.detail).toBe('No se pudo conectar con el servidor');
      }
    });
  });

  describe('mapPydanticErrorsToForm', () => {
    it('returns false for non-ApiError or non-validation errors', () => {
      const setError = vi.fn();
      expect(mapPydanticErrorsToForm(new Error('Generic'), setError)).toBe(false);
      expect(mapPydanticErrorsToForm(new ApiError(500, 'Server error'), setError)).toBe(false);
      expect(setError).not.toHaveBeenCalled();
    });

    it('maps 422 validation errors to form fields removing body prefix', () => {
      const setError = vi.fn();
      const valErrors: ValidationErrorItem[] = [
        { loc: ['body', 'name'], msg: 'Nombre obligatorio', type: 'value_error' },
        { loc: ['body', 'splits', 1, 'fixed_amount'], msg: 'Monto inválido', type: 'value_error' },
      ];
      const error = new ApiError(422, valErrors);

      const handled = mapPydanticErrorsToForm(error, setError);
      expect(handled).toBe(true);
      expect(setError).toHaveBeenCalledTimes(2);
      expect(setError).toHaveBeenCalledWith('name', {
        type: 'manual',
        message: 'Nombre obligatorio',
      });
      expect(setError).toHaveBeenCalledWith('splits.1.fixed_amount', {
        type: 'manual',
        message: 'Monto inválido',
      });
    });
  });

  describe('Health Service', () => {
    it('invokes GET /health and returns HealthResponse', async () => {
      const mockHealth: HealthResponse = { status: 'ok' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockHealth,
      } as unknown as Response);

      const health = await checkHealth();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(health).toEqual({ status: 'ok' });
    });
  });
});
