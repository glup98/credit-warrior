import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { QuickDatePicker } from './quick-date-picker';
import { formatLocalDate } from '@/lib/formatters';

describe('QuickDatePicker (Spec 008 T2)', () => {
  it('1. Renderiza el input de texto en formato DD/MM/AAAA, placeholder y teclado numérico', () => {
    render(<QuickDatePicker value="2026-10-22" onChange={vi.fn()} />);

    const dateInput = screen.getByLabelText(/fecha de compra/i);
    expect(dateInput).toBeInTheDocument();
    // Muestra formato visible DD/MM/AAAA aunque la prop value sea ISO
    expect(dateInput).toHaveValue('22/10/2026');
    expect(dateInput).toHaveAttribute('type', 'text');
    expect(dateInput).toHaveAttribute('inputMode', 'numeric');
    expect(dateInput).toHaveAttribute('placeholder', 'DD/MM/AAAA');
    expect(dateInput).toHaveAttribute('maxLength', '10');

    expect(screen.getByRole('button', { name: /^hoy$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ayer$/i })).toBeInTheDocument();
  });

  it('2. Invoca onChange con fecha ISO al pulsar el atajo "Hoy" y marca aria-pressed="true"', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = formatLocalDate(yesterday);
    const todayIso = formatLocalDate(new Date());

    const { rerender } = render(
      <QuickDatePicker value={yesterdayIso} onChange={handleChange} />
    );

    const todayButton = screen.getByRole('button', { name: /^hoy$/i });
    expect(todayButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(todayButton);
    expect(handleChange).toHaveBeenCalledWith(todayIso);

    // Re-render con nuevo valor
    rerender(<QuickDatePicker value={todayIso} onChange={handleChange} />);
    expect(todayButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('3. Invoca onChange con fecha ISO al pulsar el atajo "Ayer" y marca aria-pressed="true"', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const todayIso = formatLocalDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = formatLocalDate(yesterday);

    const { rerender } = render(
      <QuickDatePicker value={todayIso} onChange={handleChange} />
    );

    const yesterdayButton = screen.getByRole('button', { name: /^ayer$/i });
    expect(yesterdayButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(yesterdayButton);
    expect(handleChange).toHaveBeenCalledWith(yesterdayIso);

    rerender(<QuickDatePicker value={yesterdayIso} onChange={handleChange} />);
    expect(yesterdayButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('4. Aplica máscara dinámica al tipear y emite valor ISO al completar una fecha válida', () => {
    const handleChange = vi.fn();
    render(<QuickDatePicker value="" onChange={handleChange} />);

    const dateInput = screen.getByLabelText(/fecha de compra/i);

    // Escribir día
    fireEvent.change(dateInput, { target: { value: '2' } });
    expect(dateInput).toHaveValue('2');
    expect(handleChange).not.toHaveBeenCalled();

    // Escribir segundo dígito
    fireEvent.change(dateInput, { target: { value: '22' } });
    expect(dateInput).toHaveValue('22');
    expect(handleChange).not.toHaveBeenCalled();

    // Escribir mes (se inserta /)
    fireEvent.change(dateInput, { target: { value: '221' } });
    expect(dateInput).toHaveValue('22/1');

    fireEvent.change(dateInput, { target: { value: '2210' } });
    expect(dateInput).toHaveValue('22/10');

    // Escribir año
    fireEvent.change(dateInput, { target: { value: '22102026' } });
    expect(dateInput).toHaveValue('22/10/2026');
    // Al completarse una fecha válida emite ISO
    expect(handleChange).toHaveBeenCalledWith('2026-10-22');
  });

  it('5. Normaliza entrada rápida con slash directo "5/" a "05/"', () => {
    render(<QuickDatePicker value="" onChange={vi.fn()} />);

    const dateInput = screen.getByLabelText(/fecha de compra/i);
    fireEvent.change(dateInput, { target: { value: '5/' } });
    expect(dateInput).toHaveValue('05/');
  });

  it('6. Normaliza fecha pegada desde el portapapeles y emite ISO si es válida', () => {
    const handleChange = vi.fn();
    render(<QuickDatePicker value="" onChange={handleChange} />);

    const dateInput = screen.getByLabelText(/fecha de compra/i);

    // Simula evento paste con formato ISO
    fireEvent.paste(dateInput, {
      clipboardData: {
        getData: () => '2026-10-22',
      },
    });

    expect(dateInput).toHaveValue('22/10/2026');
    expect(handleChange).toHaveBeenCalledWith('2026-10-22');
  });

  it('7. Muestra error accesible y aria-invalid="true" en onBlur si la fecha está incompleta', () => {
    render(<QuickDatePicker value="" onChange={vi.fn()} />);

    const dateInput = screen.getByLabelText(/fecha de compra/i);

    fireEvent.change(dateInput, { target: { value: '22/10' } });
    fireEvent.blur(dateInput);

    expect(dateInput).toHaveAttribute('aria-invalid', 'true');
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/fecha incompleta o inválida/i);
  });

  it('8. Muestra error accesible en onBlur ante fechas inexistentes en el calendario civil (ej. 31 de abril o 29/02 no bisiesto)', () => {
    render(<QuickDatePicker value="" onChange={vi.fn()} />);

    const dateInput = screen.getByLabelText(/fecha de compra/i);

    // 31 de abril (abril solo tiene 30 días)
    fireEvent.change(dateInput, { target: { value: '31/04/2026' } });
    fireEvent.blur(dateInput);

    expect(dateInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(/fecha inexistente/i);
  });

  it('9. Limpia el error al escribir una fecha válida nuevamente', () => {
    render(<QuickDatePicker value="" onChange={vi.fn()} />);

    const dateInput = screen.getByLabelText(/fecha de compra/i);

    fireEvent.change(dateInput, { target: { value: '31/04/2026' } });
    fireEvent.blur(dateInput);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Ahora escribe fecha válida
    fireEvent.change(dateInput, { target: { value: '30/04/2026' } });
    fireEvent.blur(dateInput);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(dateInput).toHaveAttribute('aria-invalid', 'false');
  });

  it('10. Muestra mensaje de error cuando se provee la prop error externa', () => {
    render(
      <QuickDatePicker
        value="2026-10-22"
        onChange={vi.fn()}
        error="Fecha de compra requerida"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/fecha de compra requerida/i);
    expect(screen.getByLabelText(/fecha de compra/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('11. Respeta la propiedad disabled deshabilitando el input y los atajos', () => {
    render(<QuickDatePicker value="2026-10-22" onChange={vi.fn()} disabled />);

    expect(screen.getByLabelText(/fecha de compra/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /^hoy$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^ayer$/i })).toBeDisabled();
  });

  it('12. Renderiza el botón de calendario accesible fijado en el extremo derecho y añade padding pr-11 al input', () => {
    render(<QuickDatePicker value="2026-10-22" onChange={vi.fn()} />);

    const calBtn = screen.getByRole('button', { name: /abrir calendario/i });
    expect(calBtn).toBeInTheDocument();
    expect(calBtn).toHaveAttribute('type', 'button');

    const dateInput = screen.getByLabelText(/fecha de compra/i);
    expect(dateInput.className).toContain('pr-11');
  });

  it('13. Dispara showPicker() en el input auxiliar de fecha al hacer clic en el botón de calendario', async () => {
    const user = userEvent.setup();
    render(<QuickDatePicker value="2026-10-22" onChange={vi.fn()} />);

    const hiddenDateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(hiddenDateInput).toBeInTheDocument();
    expect(hiddenDateInput).toHaveAttribute('aria-hidden', 'true');
    expect(hiddenDateInput).toHaveClass('sr-only');

    const showPickerMock = vi.fn();
    hiddenDateInput.showPicker = showPickerMock;

    const calBtn = screen.getByRole('button', { name: /abrir calendario/i });
    await user.click(calBtn);

    expect(showPickerMock).toHaveBeenCalledTimes(1);
  });

  it('14. Sincroniza la selección del input auxiliar nativo actualizando el valor visual y emitiendo ISO', () => {
    const handleChange = vi.fn();
    render(<QuickDatePicker value="2026-10-22" onChange={handleChange} />);

    const hiddenDateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    const visibleInput = screen.getByLabelText(/fecha de compra/i);

    // Usuario escoge una fecha en el picker del sistema
    fireEvent.change(hiddenDateInput, { target: { value: '2026-11-15' } });

    expect(visibleInput).toHaveValue('15/11/2026');
    expect(handleChange).toHaveBeenCalledWith('2026-11-15');
  });

  it('15. Deshabilita el botón de calendario cuando la prop disabled es true', () => {
    render(<QuickDatePicker value="2026-10-22" onChange={vi.fn()} disabled />);

    const calBtn = screen.getByRole('button', { name: /abrir calendario/i });
    expect(calBtn).toBeDisabled();
  });
});
