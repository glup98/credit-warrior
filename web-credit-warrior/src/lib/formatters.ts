export type Currency = 'CLP' | 'USD';
export type PeriodFormat = 'full' | 'short' | 'compact';

const MONTH_NAMES_ES: Record<string, { full: string; short: string }> = {
  '01': { full: 'Enero', short: 'Ene' },
  '02': { full: 'Febrero', short: 'Feb' },
  '03': { full: 'Marzo', short: 'Mar' },
  '04': { full: 'Abril', short: 'Abr' },
  '05': { full: 'Mayo', short: 'May' },
  '06': { full: 'Junio', short: 'Jun' },
  '07': { full: 'Julio', short: 'Jul' },
  '08': { full: 'Agosto', short: 'Ago' },
  '09': { full: 'Septiembre', short: 'Sep' },
  '10': { full: 'Octubre', short: 'Oct' },
  '11': { full: 'Noviembre', short: 'Nov' },
  '12': { full: 'Diciembre', short: 'Dic' },
};

/**
 * Convierte de forma determinista un string numérico a unidades enteras (centavos/centésimas)
 * evitando imprecisiones de coma flotante IEEE 754.
 *
 * Ejemplos:
 * - "100" -> 10000
 * - "33.34" -> 3334
 * - "33.3" -> 3330
 * - "0" o inválido -> 0
 */
export function toCents(val?: string | null): number {
  if (!val || typeof val !== 'string') return 0;
  const trimmed = val.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(trimmed)) return 0;
  const [intPart = '0', decPart = ''] = trimmed.split('.');
  return Number(intPart) * 100 + Number(decPart.padEnd(2, '0').slice(0, 2));
}

/**
 * Formatea montos monetarios sobre strings puros:
 * - CLP: Entero con puntos separadores de miles y prefijo $ (ej. "$100.000", "$0")
 * - USD: Prefijo US$ y exactamente 2 decimales con punto (ej. "US$33.34", "US$0.00")
 */
export function formatCurrency(
  amount: string | null | undefined,
  currency: Currency,
): string {
  if (!amount || typeof amount !== 'string') {
    return currency === 'CLP' ? '$0' : 'US$0.00';
  }

  const trimmed = amount.trim();
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return currency === 'CLP' ? '$0' : 'US$0.00';
  }

  const [intPart = '0', decPart = ''] = trimmed.split('.');
  const cleanInt = intPart.replace(/^0+(?=\d)/, '') || '0';
  const formattedInt = cleanInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (currency === 'CLP') {
    return `$${formattedInt}`;
  }

  const safeDec = decPart.padEnd(2, '0').slice(0, 2);
  return `US$${formattedInt}.${safeDec}`;
}

/**
 * Formatea porcentajes a 2 decimales fijos con sufijo % (ej. "70" -> "70.00%").
 */
export function formatPercentage(percentage: string | null | undefined): string {
  if (!percentage || typeof percentage !== 'string') {
    return '0.00%';
  }

  const trimmed = percentage.trim();
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return '0.00%';
  }

  const [intPart = '0', decPart = ''] = trimmed.split('.');
  const cleanInt = intPart.replace(/^0+(?=\d)/, '') || '0';
  const safeDec = decPart.padEnd(2, '0').slice(0, 2);
  return `${cleanInt}.${safeDec}%`;
}

/**
 * Formatea un período en formato YYYY-MM en nombres de mes en español sin desvío UTC.
 *
 * Ejemplos:
 * - "2026-11", "full" -> "Noviembre 2026"
 * - "2026-11", "short" -> "Nov 2026"
 */
export function formatPeriod(
  period: string | null | undefined,
  format: PeriodFormat = 'full',
): string {
  if (!period || typeof period !== 'string') {
    return '';
  }

  const trimmed = period.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) {
    return trimmed;
  }

  const [year, month] = trimmed.split('-');
  const monthData = MONTH_NAMES_ES[month];
  if (!monthData) {
    return trimmed;
  }

  const name = format === 'short' || format === 'compact' ? monthData.short : monthData.full;
  return `${name} ${year}`;
}

/**
 * Formatea una fecha YYYY-MM-DD en fecha civil legible en español (ej. "16 oct 2026").
 * Parsea el string directamente para evitar desfases de medianoche UTC en husos horarios occidentales.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return '';
  }

  const trimmed = dateStr.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(trimmed)) {
    return trimmed;
  }

  const [year, month, day] = trimmed.split('-');
  const monthData = MONTH_NAMES_ES[month];
  if (!monthData) {
    return trimmed;
  }

  return `${Number(day)} ${monthData.short.toLowerCase()} ${year}`;
}

/**
 * Enmascara los últimos 4 dígitos de una tarjeta de crédito como "•••• 1234".
 * Retorna cadena vacía si no cumple con exactamente 4 dígitos.
 */
export function formatMaskedCard(lastFourDigits: string | null | undefined): string {
  if (!lastFourDigits || typeof lastFourDigits !== 'string') {
    return '';
  }

  const trimmed = lastFourDigits.trim();
  if (!/^\d{4}$/.test(trimmed)) {
    return '';
  }

  return `•••• ${trimmed}`;
}

/**
 * Formatea un objeto Date a formato civil local "YYYY-MM-DD".
 * Usa getFullYear(), getMonth() y getDate() locales para evitar desfases UTC.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
