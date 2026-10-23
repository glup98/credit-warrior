import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ApiError } from '@/services/api-client';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Merges class names combining clsx and tailwind-merge to avoid Tailwind class conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Maps FastAPI / Pydantic V2 422 validation errors directly to form field errors.
 * Removes the "body" prefix from location tuples and sets manual error messages.
 */
export function mapPydanticErrorsToForm<TFieldValues extends FieldValues = FieldValues>(
  error: unknown,
  setError:
    | UseFormSetError<TFieldValues>
    | ((name: Path<TFieldValues> | string, error: { type: string; message: string }) => void),
): boolean {
  if (!(error instanceof ApiError) || !error.isValidationError) {
    return false;
  }

  for (const item of error.validationErrors) {
    if (!item.loc || !Array.isArray(item.loc)) continue;
    const cleanPath = item.loc
      .filter((segment) => segment !== 'body')
      .join('.');

    if (cleanPath) {
      setError(cleanPath as Path<TFieldValues>, {
        type: 'manual',
        message: item.msg,
      });
    }
  }

  return true;
}
