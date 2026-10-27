/**
 * Utilidades puras de fecha civil, formateo, máscara y normalización (Spec 008 T1).
 * Implementa validación estricta de calendario civil sin usar constructores Date UTC
 * para evitar desplazamientos por zona horaria.
 */

/**
 * Determina de forma determinista si un año es bisiesto según el calendario gregoriano.
 * Un año es bisiesto si es divisible por 4 y no por 100, o si es divisible por 400.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Retorna el número exacto de días que tiene un mes en un año específico.
 * Para meses fuera del rango 1..12 retorna 0.
 */
export function getDaysInMonth(month: number, year: number): number {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

/**
 * Valida si una combinación de día, mes y año corresponde a una fecha real del calendario civil
 * dentro del rango admisible de la aplicación (1900 a 2100).
 */
export function isValidCivilDate(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return false;
  }
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(month, year);
  return day >= 1 && day <= maxDays;
}

/**
 * Convierte una fecha ISO "YYYY-MM-DD" a formato visual "DD/MM/AAAA".
 * Realiza descomposición de subcadenas sin invocar constructores Date de JS.
 * Retorna cadena vacía si el valor es nulo, indefinido o no representa una fecha civil válida.
 */
export function parseIsoToDisplay(isoDate: string | null | undefined): string {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const trimmed = isoDate.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (!isValidCivilDate(day, month, year)) {
    return '';
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Convierte una fecha visual "DD/MM/AAAA" a formato ISO "YYYY-MM-DD".
 * Valida la existencia real de la fecha en el calendario civil.
 * Retorna null si la fecha está incompleta o es inválida.
 */
export function parseDisplayToIso(displayDate: string | null | undefined): string | null {
  if (!displayDate || typeof displayDate !== 'string') return null;
  const trimmed = displayDate.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (!isValidCivilDate(day, month, year)) {
    return null;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Aplica una máscara dinámica en tiempo real al texto que el usuario digita para fechas DD/MM/AAAA.
 * - Filtra caracteres no numéricos.
 * - Inserta automáticamente las barras "/" tras el día y el mes.
 * - Soporta retroceso (Backspace) sobre las barras sin quedar atascado.
 * - Normaliza entradas rápidas como "5/" a "05/" y "22/5/" a "22/05/".
 */
export function formatDateMask(input: string, previousValue?: string): string {
  if (!input) return '';

  // Detección de retroceso sobre barra separadora
  if (previousValue && previousValue.endsWith('/') && input === previousValue.slice(0, -1)) {
    return input.slice(0, -1);
  }

  // Normalización de entradas rápidas con slash: "5/" -> "05/" y "22/5/" -> "22/05/"
  let processed = input;
  if (/^[1-9]\/$/.test(processed)) {
    processed = `0${processed}`;
  } else if (/^\d{2}\/[1-9]\/$/.test(processed)) {
    const parts = processed.split('/');
    processed = `${parts[0]}/0${parts[1]}/`;
  }

  const endsWithSlash = processed.endsWith('/');
  const digits = processed.replace(/\D/g, '').slice(0, 8);

  if (digits.length === 0) return '';

  if (digits.length <= 2) {
    return digits.length === 2 && endsWithSlash ? `${digits}/` : digits;
  }

  if (digits.length <= 4) {
    const formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits.length === 4 && endsWithSlash ? `${formatted}/` : formatted;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Normaliza fechas pegadas desde el portapapeles en formatos DD/MM/AAAA, DD-MM-AAAA o YYYY-MM-DD.
 * Rellena con ceros iniciales días y meses de un solo dígito (D/M/AAAA -> DD/MM/AAAA).
 * Retorna la fecha formateada en "DD/MM/AAAA" si es válida civilmente, o null en caso contrario.
 */
export function normalizePastedDate(pasted: string): string | null {
  if (!pasted || typeof pasted !== 'string') return null;
  const trimmed = pasted.trim();
  if (!trimmed) return null;

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  // 1. Formato DD/MM/AAAA o D/M/AAAA
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    day = parseInt(slashMatch[1], 10);
    month = parseInt(slashMatch[2], 10);
    year = parseInt(slashMatch[3], 10);
  }

  // 2. Formato DD-MM-AAAA o D-M-AAAA
  const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!slashMatch && dashMatch) {
    day = parseInt(dashMatch[1], 10);
    month = parseInt(dashMatch[2], 10);
    year = parseInt(dashMatch[3], 10);
  }

  // 3. Formato ISO YYYY-MM-DD o YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!slashMatch && !dashMatch && isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  }

  if (day === null || month === null || year === null) {
    return null;
  }

  if (!isValidCivilDate(day, month, year)) {
    return null;
  }

  const dayStr = day.toString().padStart(2, '0');
  const monthStr = month.toString().padStart(2, '0');
  const yearStr = year.toString();

  return `${dayStr}/${monthStr}/${yearStr}`;
}
