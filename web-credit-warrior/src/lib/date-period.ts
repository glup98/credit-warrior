/**
 * Regex para validar cadenas de período en formato estricto YYYY-MM (meses 01 a 12).
 */
export const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Valida deterministamente si un período tiene el formato estricto YYYY-MM.
 */
export function isValidPeriod(period?: string | null): boolean {
  if (!period || typeof period !== 'string') return false;
  return PERIOD_REGEX.test(period.trim());
}

/**
 * Calcula el siguiente período cronológico (sumando un mes) mediante aritmética
 * entera determinista para evitar desvíos provocados por zonas horarias UTC negativas
 * al usar el objeto Date de JavaScript.
 *
 * Ejemplos:
 * - "2026-11" -> "2026-12"
 * - "2026-12" -> "2027-01"
 */
export function getNextPeriod(period: string): string {
  const trimmed = typeof period === 'string' ? period.trim() : '';
  if (!isValidPeriod(trimmed)) {
    throw new Error(`Invalid period: ${period}`);
  }
  const [yearStr, monthStr] = trimmed.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  if (month === 12) {
    year += 1;
    month = 1;
  } else {
    month += 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Calcula el período cronológico anterior (restando un mes) mediante aritmética
 * entera determinista para evitar desvíos provocados por zonas horarias UTC negativas
 * al usar el objeto Date de JavaScript.
 *
 * Ejemplos:
 * - "2026-12" -> "2026-11"
 * - "2027-01" -> "2026-12"
 */
export function getPreviousPeriod(period: string): string {
  const trimmed = typeof period === 'string' ? period.trim() : '';
  if (!isValidPeriod(trimmed)) {
    throw new Error(`Invalid period: ${period}`);
  }
  const [yearStr, monthStr] = trimmed.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  if (month === 1) {
    year -= 1;
    month = 12;
  } else {
    month -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}
