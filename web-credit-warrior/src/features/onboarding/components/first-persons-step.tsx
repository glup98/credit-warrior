import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, ArrowRight, ArrowLeft, Loader2, Users, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { personCreateSchema, type PersonCreateInput } from '@/schemas/person.schema';
import { useCreatePerson, useDeletePerson } from '@/hooks/queries/use-persons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PersonChip } from '@/components/shared/person-chip';
import { ApiError } from '@/services/api-client';
import { mapPydanticErrorsToForm, cn } from '@/lib/utils';
import type { PersonRead } from '@/types/api.types';

export interface FirstPersonsStepProps {
  persons: PersonRead[];
  onPersonAdded: (person: PersonRead) => void;
  onPersonDeleted: (personId: string) => void;
  onReviewCard: () => void;
  onFinish: () => void;
  isFinishing?: boolean;
}

const PRESET_COLORS = [
  '#10B981', // Esmeralda
  '#38BDF8', // Celeste
  '#3B82F6', // Azul
  '#8B5CF6', // Violeta
  '#EC4899', // Rosa
  '#F43F5E', // Carmín
  '#F59E0B', // Ámbar
  '#14B8A6', // Turquesa
];

export function FirstPersonsStep({
  persons,
  onPersonAdded,
  onPersonDeleted,
  onReviewCard,
  onFinish,
  isFinishing = false,
}: FirstPersonsStepProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const createPersonMutation = useCreatePerson();
  const deletePersonMutation = useDeletePerson();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors },
  } = useForm<PersonCreateInput>({
    resolver: zodResolver(personCreateSchema),
    defaultValues: {
      name: '',
      color_hex: '#10B981',
      is_active: true,
    },
  });

  const selectedColor = watch('color_hex');

  const onSubmit = async (values: PersonCreateInput) => {
    try {
      const newPerson = await createPersonMutation.mutateAsync({
        name: values.name.trim(),
        color_hex: values.color_hex ?? null,
        is_active: true,
      });

      toast.success('Participante agregado');
      reset({
        name: '',
        color_hex: values.color_hex,
        is_active: true,
      });
      onPersonAdded(newPerson);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setError('name', {
          type: 'manual',
          message:
            typeof err.detail === 'string'
              ? err.detail
              : 'Ya existe una persona registrada con este nombre',
        });
        return;
      }

      const handled = mapPydanticErrorsToForm(err, setError);
      if (!handled) {
        toast.error('No fue posible agregar al participante. Revisa tu conexión.');
      }
    }
  };

  const handleDelete = async (person: PersonRead) => {
    try {
      setDeletingId(person.id);
      await deletePersonMutation.mutateAsync(person.id);
      toast.success('Participante eliminado');
      onPersonDeleted(person.id);
    } catch {
      toast.error('No fue posible eliminar al participante.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      {/* Encabezado */}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          ¿Quiénes comparten los gastos?
        </h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          Agrega a las personas que participan en las compras de esta tarjeta.
        </p>
      </div>

      {/* Formulario de Alta Rápida */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-5 shadow-sm"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="person-name">Nombre o apodo</Label>
          <Input
            id="person-name"
            placeholder="Ej. Anyi, Augusto, Mamá"
            error={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name?.message && (
            <p className="text-xs text-accent-danger">{errors.name.message}</p>
          )}
        </div>

        {/* Selector de Color y Opción Neutra */}
        <div className="space-y-2">
          <Label>Color identificador</Label>
          <div className="flex flex-wrap items-center gap-2">
            {/* Opción Neutra */}
            <button
              type="button"
              onClick={() => setValue('color_hex', null, { shouldValidate: true })}
              aria-label="Neutro"
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-primary',
                selectedColor === null
                  ? 'border-text-primary bg-elevated text-text-primary ring-1 ring-text-primary'
                  : 'border-border-subtle bg-canvas/60 text-text-muted hover:text-text-primary',
              )}
            >
              <Ban className="h-3 w-3" />
              <span>Neutro</span>
            </button>

            {/* Colores Predefinidos */}
            {PRESET_COLORS.map((color) => {
              const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color_hex', color, { shouldValidate: true })}
                  aria-label={`Color ${color}`}
                  style={{ backgroundColor: color }}
                  className={cn(
                    'h-8 w-8 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                    isSelected
                      ? 'scale-110 ring-2 ring-text-primary ring-offset-2 ring-offset-canvas'
                      : 'hover:scale-105 opacity-85 hover:opacity-100',
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Botón de Agregar */}
        <Button
          type="submit"
          disabled={createPersonMutation.isPending}
          className="w-full justify-center gap-2 border-border-subtle bg-elevated text-text-primary hover:bg-elevated/80"
        >
          {createPersonMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 stroke-[2.5]" />
          )}
          <span>Agregar participante</span>
        </Button>
      </form>

      {/* Bandeja de Participantes Creados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text-primary">
              Participantes agregados ({persons.length})
            </h3>
          </div>
        </div>

        {persons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-subtle p-6 text-center text-xs text-text-muted">
            Aún no has agregado participantes. Agrega al menos uno para continuar.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {persons.map((person) => (
              <div
                key={person.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-xs shadow-xs"
              >
                <PersonChip
                  name={person.name}
                  colorHex={person.color_hex}
                  size="sm"
                  className="border-0 bg-transparent p-0 shadow-none"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(person)}
                  disabled={deletingId === person.id}
                  aria-label={`Eliminar a ${person.name}`}
                  className="rounded-full p-0.5 text-text-muted hover:bg-elevated hover:text-accent-danger transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-danger"
                >
                  {deletingId === person.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navegación y Finalización */}
      <div className="space-y-4 pt-2">
        {/* Botón de Finalización */}
        <Button
          type="button"
          onClick={onFinish}
          disabled={persons.length === 0 || isFinishing}
          className="w-full justify-center gap-2 bg-accent-clp py-5 text-base font-semibold text-canvas hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isFinishing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Finalizando configuración...</span>
            </>
          ) : (
            <>
              <span>Finalizar y ver Dashboard</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>

        {persons.length === 0 && (
          <p className="text-center text-xs text-text-muted">
            Agrega al menos 1 participante para continuar
          </p>
        )}

        {/* Botón de Retroceso a Revisión */}
        <div className="text-center">
          <button
            type="button"
            onClick={onReviewCard}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Revisar tarjeta creada</span>
          </button>
        </div>
      </div>
    </div>
  );
}
