import { describe, it, expect } from 'vitest';
import {
  isLeapYear,
  getDaysInMonth,
  isValidCivilDate,
  parseIsoToDisplay,
  parseDisplayToIso,
  formatDateMask,
  normalizePastedDate,
} from './date-format';

describe('Date Format & Civil Calendar Utilities (Spec 008 T1)', () => {
  describe('isLeapYear', () => {
    it('determina correctamente años bisiestos estándar múltiplos de 4', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2020)).toBe(true);
    });

    it('determina correctamente años no bisiestos', () => {
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2019)).toBe(false);
    });

    it('maneja la regla secular de múltiplos de 100 y 400', () => {
      // Múltiplos de 400 son bisiestos
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2400)).toBe(true);
      expect(isLeapYear(1600)).toBe(true);

      // Múltiplos de 100 no múltiplos de 400 NO son bisiestos
      expect(isLeapYear(2100)).toBe(false);
      expect(isLeapYear(1900)).toBe(false);
      expect(isLeapYear(1800)).toBe(false);
    });
  });

  describe('getDaysInMonth', () => {
    it('retorna 31 días para meses largos (Ene, Mar, May, Jul, Ago, Oct, Dic)', () => {
      expect(getDaysInMonth(1, 2026)).toBe(31);
      expect(getDaysInMonth(3, 2026)).toBe(31);
      expect(getDaysInMonth(5, 2026)).toBe(31);
      expect(getDaysInMonth(7, 2026)).toBe(31);
      expect(getDaysInMonth(8, 2026)).toBe(31);
      expect(getDaysInMonth(10, 2026)).toBe(31);
      expect(getDaysInMonth(12, 2026)).toBe(31);
    });

    it('retorna 30 días para meses de 30 días (Abr, Jun, Sep, Nov)', () => {
      expect(getDaysInMonth(4, 2026)).toBe(30);
      expect(getDaysInMonth(6, 2026)).toBe(30);
      expect(getDaysInMonth(9, 2026)).toBe(30);
      expect(getDaysInMonth(11, 2026)).toBe(30);
    });

    it('retorna 29 días para febrero en año bisiesto y 28 en no bisiesto', () => {
      expect(getDaysInMonth(2, 2024)).toBe(29);
      expect(getDaysInMonth(2, 2000)).toBe(29);
      expect(getDaysInMonth(2, 2026)).toBe(28);
      expect(getDaysInMonth(2, 2100)).toBe(28);
    });

    it('retorna 0 para meses fuera del rango 1..12', () => {
      expect(getDaysInMonth(0, 2026)).toBe(0);
      expect(getDaysInMonth(13, 2026)).toBe(0);
      expect(getDaysInMonth(-1, 2026)).toBe(0);
    });
  });

  describe('isValidCivilDate', () => {
    it('valida fechas civiles estándar existentes', () => {
      expect(isValidCivilDate(1, 1, 2026)).toBe(true);
      expect(isValidCivilDate(22, 10, 2026)).toBe(true);
      expect(isValidCivilDate(31, 12, 2026)).toBe(true);
      expect(isValidCivilDate(30, 4, 2026)).toBe(true);
    });

    it('valida el 29 de febrero solo en años bisiestos', () => {
      expect(isValidCivilDate(29, 2, 2024)).toBe(true);
      expect(isValidCivilDate(29, 2, 2000)).toBe(true);
      expect(isValidCivilDate(29, 2, 2026)).toBe(false);
      expect(isValidCivilDate(29, 2, 2100)).toBe(false);
    });

    it('rechaza días imposibles para el mes especificado', () => {
      expect(isValidCivilDate(31, 4, 2026)).toBe(false); // Abril tiene 30
      expect(isValidCivilDate(31, 6, 2026)).toBe(false); // Junio tiene 30
      expect(isValidCivilDate(31, 9, 2026)).toBe(false); // Septiembre tiene 30
      expect(isValidCivilDate(31, 11, 2026)).toBe(false); // Noviembre tiene 30
      expect(isValidCivilDate(30, 2, 2024)).toBe(false); // Febrero nunca tiene 30
      expect(isValidCivilDate(32, 1, 2026)).toBe(false); // Días > 31
      expect(isValidCivilDate(0, 5, 2026)).toBe(false);  // Día 0
      expect(isValidCivilDate(-5, 5, 2026)).toBe(false); // Día negativo
    });

    it('rechaza meses fuera del rango 1..12', () => {
      expect(isValidCivilDate(15, 0, 2026)).toBe(false);
      expect(isValidCivilDate(15, 13, 2026)).toBe(false);
      expect(isValidCivilDate(15, -1, 2026)).toBe(false);
    });

    it('valida el rango de años aceptables (1900 a 2100)', () => {
      expect(isValidCivilDate(1, 1, 1900)).toBe(true);
      expect(isValidCivilDate(31, 12, 2100)).toBe(true);
      expect(isValidCivilDate(1, 1, 1899)).toBe(false);
      expect(isValidCivilDate(1, 1, 2101)).toBe(false);
    });
  });

  describe('parseIsoToDisplay', () => {
    it('convierte fechas ISO válidas YYYY-MM-DD a DD/MM/AAAA', () => {
      expect(parseIsoToDisplay('2026-10-22')).toBe('22/10/2026');
      expect(parseIsoToDisplay('2024-02-29')).toBe('29/02/2024');
      expect(parseIsoToDisplay('2026-01-05')).toBe('05/01/2026');
    });

    it('retorna cadena vacía si el valor es nulo, indefinido o vacío', () => {
      expect(parseIsoToDisplay(null)).toBe('');
      expect(parseIsoToDisplay(undefined)).toBe('');
      expect(parseIsoToDisplay('')).toBe('');
    });

    it('retorna cadena vacía si el formato ISO no es válido o fecha inexistente', () => {
      expect(parseIsoToDisplay('invalido')).toBe('');
      expect(parseIsoToDisplay('2026/10/22')).toBe('');
      expect(parseIsoToDisplay('2026-02-29')).toBe(''); // No bisiesto
      expect(parseIsoToDisplay('2026-04-31')).toBe(''); // Abril 31 no existe
    });
  });

  describe('parseDisplayToIso', () => {
    it('convierte fechas visuales válidas DD/MM/AAAA a ISO YYYY-MM-DD', () => {
      expect(parseDisplayToIso('22/10/2026')).toBe('2026-10-22');
      expect(parseDisplayToIso('29/02/2024')).toBe('2024-02-29');
      expect(parseDisplayToIso('05/01/2026')).toBe('2026-01-05');
    });

    it('retorna null si la fecha está incompleta', () => {
      expect(parseDisplayToIso('22/10')).toBeNull();
      expect(parseDisplayToIso('22/10/202')).toBeNull();
      expect(parseDisplayToIso('2')).toBeNull();
      expect(parseDisplayToIso('')).toBeNull();
      expect(parseDisplayToIso(null)).toBeNull();
      expect(parseDisplayToIso(undefined)).toBeNull();
    });

    it('retorna null si la fecha contiene días o meses inexistentes en el calendario civil', () => {
      expect(parseDisplayToIso('31/04/2026')).toBeNull(); // Abril no tiene 31
      expect(parseDisplayToIso('29/02/2026')).toBeNull(); // 2026 no es bisiesto
      expect(parseDisplayToIso('32/01/2026')).toBeNull();
      expect(parseDisplayToIso('00/10/2026')).toBeNull();
      expect(parseDisplayToIso('15/13/2026')).toBeNull();
      expect(parseDisplayToIso('15/00/2026')).toBeNull();
      expect(parseDisplayToIso('15/10/1850')).toBeNull(); // Año fuera de rango
    });
  });

  describe('formatDateMask', () => {
    it('permite ingresar hasta 2 dígitos sin separador', () => {
      expect(formatDateMask('2')).toBe('2');
      expect(formatDateMask('22')).toBe('22');
    });

    it('agrega automáticamente el primer separador tras ingresar el tercer dígito', () => {
      expect(formatDateMask('221')).toBe('22/1');
      expect(formatDateMask('2210')).toBe('22/10');
    });

    it('agrega automáticamente el segundo separador tras ingresar el quinto dígito', () => {
      expect(formatDateMask('22102')).toBe('22/10/2');
      expect(formatDateMask('22102026')).toBe('22/10/2026');
    });

    it('trunca a 8 dígitos máximos (DDMMAAAA)', () => {
      expect(formatDateMask('221020269999')).toBe('22/10/2026');
    });

    it('ignora caracteres no numéricos excepto el separador natural', () => {
      expect(formatDateMask('22a10b2026')).toBe('22/10/2026');
      expect(formatDateMask('abc')).toBe('');
    });

    it('normaliza entradas rápidas con slash: "5/" a "05/" y "22/5/" a "22/05/"', () => {
      expect(formatDateMask('5/')).toBe('05/');
      expect(formatDateMask('1/')).toBe('01/');
      expect(formatDateMask('9/')).toBe('09/');
      expect(formatDateMask('22/5/')).toBe('22/05/');
      expect(formatDateMask('22/1/')).toBe('22/01/');
    });

    it('facilita el borrado por retroceso (Backspace) cuando se elimina sobre una barra separadora', () => {
      // Usuario tenía "22/" y presiona backspace -> input es "22"
      // Si previousValue era "22/" y nuevo valor es "22", debe permitir borrar el dígito anterior si se vuelve a pulsar
      expect(formatDateMask('22', '22/')).toBe('2');
      // Usuario tenía "22/10/" y presiona backspace -> input es "22/10"
      expect(formatDateMask('22/10', '22/10/')).toBe('22/1');
    });

    it('mantiene el valor si no hay cambios o borrado normal', () => {
      expect(formatDateMask('22/1', '22/10')).toBe('22/1');
      expect(formatDateMask('', '2')).toBe('');
    });
  });

  describe('normalizePastedDate', () => {
    it('normaliza fechas pegadas en formato DD/MM/AAAA', () => {
      expect(normalizePastedDate('22/10/2026')).toBe('22/10/2026');
      expect(normalizePastedDate('29/02/2024')).toBe('29/02/2024');
    });

    it('normaliza fechas pegadas con guiones DD-MM-AAAA', () => {
      expect(normalizePastedDate('22-10-2026')).toBe('22/10/2026');
      expect(normalizePastedDate('05-01-2026')).toBe('05/01/2026');
    });

    it('normaliza fechas pegadas en formato ISO YYYY-MM-DD a DD/MM/AAAA', () => {
      expect(normalizePastedDate('2026-10-22')).toBe('22/10/2026');
      expect(normalizePastedDate('2024-02-29')).toBe('29/02/2024');
    });

    it('normaliza fechas pegadas en formato ISO con barras YYYY/MM/DD', () => {
      expect(normalizePastedDate('2026/10/22')).toBe('22/10/2026');
    });

    it('normaliza fechas con un solo dígito para día o mes (D/M/AAAA o D-M-AAAA)', () => {
      expect(normalizePastedDate('5/3/2026')).toBe('05/03/2026');
      expect(normalizePastedDate('5-3-2026')).toBe('05/03/2026');
      expect(normalizePastedDate('22/5/2026')).toBe('22/05/2026');
      expect(normalizePastedDate('5/10/2026')).toBe('05/10/2026');
    });

    it('limpia espacios en blanco alrededor de la fecha pegada', () => {
      expect(normalizePastedDate('  22/10/2026 \n')).toBe('22/10/2026');
      expect(normalizePastedDate('\t2026-10-22  ')).toBe('22/10/2026');
    });

    it('retorna null para textos o fechas pegadas que no sean válidas en el calendario civil', () => {
      expect(normalizePastedDate('31/04/2026')).toBeNull(); // Abril no tiene 31
      expect(normalizePastedDate('29/02/2026')).toBeNull(); // 2026 no es bisiesto
      expect(normalizePastedDate('no-es-una-fecha')).toBeNull();
      expect(normalizePastedDate('22/10/2500')).toBeNull(); // Año fuera de rango
      expect(normalizePastedDate('')).toBeNull();
    });
  });
});
