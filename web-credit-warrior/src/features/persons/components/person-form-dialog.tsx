'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePerson, useUpdatePerson } from '@/hooks/queries/use-persons';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { ColorPicker } from './color-picker';
import { mapPydanticErrorsToForm } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import type { PersonRead, PersonCreate, PersonUpdate } from '@/types/api.types';

const personFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre del participante es obligatorio')
      .max(100, 'Máximo 100 caracteres'),
    color_hex: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato hexadecimal requerido (ej. #FF5733)')
      .nullable()
      .optional(),
    is_active: z.boolean().default(true),
  })
  .strict();

type PersonFormValues = z.infer<typeof personFormSchema>;

export interface PersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: PersonRead | null;
  onSuccess?: (person: PersonRead) => void;
}

/**
 * Formulario modal adaptativo (Dialog en desktop, Drawer en mobile) para crear y editar personas participantes.
 * Intercepta conflictos 409 (nombre duplicado) inyectando el error inline bajo el campo name sin perder el color seleccionado.
 */
export function PersonFormDialog({
  open,
  onOpenChange,
  person,
  onSuccess,
}: PersonFormDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)', true);
  const isEditing = Boolean(person);

  const createPersonMutation = useCreatePerson();
  const updatePersonMutation = useUpdatePerson();
  const isPending = createPersonMutation.isPending || updatePersonMutation.isPending;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      name: '',
      color_hex: null,
      is_active: true,
    },
  });

  const selectedColor = watch('color_hex');
  const isActive = watch('is_active');

  React.useEffect(() => {
    if (open) {
      if (person) {
        reset({
          name: person.name,
          color_hex: person.color_hex ?? null,
          is_active: person.is_active,
        });
      } else {
        reset({
          name: '',
          color_hex: null,
          is_active: true,
        });
      }
    }
  }, [open, person, reset]);

  const onSubmit = async (values: PersonFormValues) => {
    try {
      if (isEditing && person) {
        const payload: PersonUpdate = {
          name: values.name.trim(),
          color_hex: values.color_hex ?? null,
          is_active: values.is_active,
        };
        const updated = await updatePersonMutation.mutateAsync({
          id: person.id,
          data: payload,
        });
        toast.success('Participante actualizado exitosamente');
        onSuccess?.(updated);
        onOpenChange(false);
      } else {
        const payload: PersonCreate = {
          name: values.name.trim(),
          color_hex: values.color_hex ?? null,
          is_active: values.is_active,
        };
        const created = await createPersonMutation.mutateAsync(payload);
        toast.success('Participante registrado exitosamente');
        onSuccess?.(created);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setError('name', {
          type: 'manual',
          message: 'Ya existe una persona registrada con este nombre',
        });
        return;
      }

      const handled = mapPydanticErrorsToForm(err, setError);
      if (!handled) {
        toast.error(
          isEditing
            ? 'No se pudo actualizar al participante'
            : 'No se pudo crear el participante',
        );
      }
    }
  };

  const formBody = (
    <form
      id="person-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 py-2"
    >
      {/* Nombre del participante */}
      <div className="space-y-1.5">
        <Label htmlFor="person-name">Nombre del participante</Label>
        <Input
          id="person-name"
          placeholder="Ej. Juan Pérez, Valentina"
          error={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-accent-danger">{errors.name.message}</p>
        )}
      </div>

      {/* Selector cromático */}
      <div className="space-y-2">
        <Label htmlFor="person-color-picker">Color identificador</Label>
        <p className="text-xs text-text-muted">
          Elige un color para facilitar la identificación visual del participante en los desgloses de compras.
        </p>
        <ColorPicker
          id="person-color-picker"
          value={selectedColor}
          onChange={(hex) => setValue('color_hex', hex, { shouldValidate: true })}
        />
        {errors.color_hex && (
          <p className="text-xs text-accent-danger">{errors.color_hex.message}</p>
        )}
      </div>

      {/* Switch Participante Activo */}
      <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-canvas/40 p-3">
        <div className="space-y-0.5">
          <Label htmlFor="person-is-active" className="cursor-pointer">
            Participante Activo
          </Label>
          <p className="text-xs text-text-muted">
            Los participantes activos están disponibles para asociarles compras y repartos.
          </p>
        </div>
        <Switch
          id="person-is-active"
          aria-label="Participante Activo"
          checked={isActive}
          onCheckedChange={(val) => setValue('is_active', val)}
        />
      </div>
    </form>
  );

  const titleText = isEditing ? 'Editar Participante' : 'Nuevo Participante';
  const descriptionText = isEditing
    ? 'Modifica los datos del participante.'
    : 'Ingresa los datos para registrar a una persona participante.';
  const HeaderIcon = isEditing ? UserCheck : UserPlus;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeaderIcon className="h-5 w-5 text-accent-clp" />
              {titleText}
            </DialogTitle>
            <DialogDescription>{descriptionText}</DialogDescription>
          </DialogHeader>

          {formBody}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="person-form"
              disabled={isPending}
              className="bg-accent-clp text-canvas hover:bg-accent-clp/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Participante'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh] overflow-y-auto px-4">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <HeaderIcon className="h-5 w-5 text-accent-clp" />
            {titleText}
          </DrawerTitle>
          <DrawerDescription>{descriptionText}</DrawerDescription>
        </DrawerHeader>

        <div className="px-2">{formBody}</div>

        <DrawerFooter className="px-2 pb-6">
          <Button
            type="submit"
            form="person-form"
            disabled={isPending}
            className="w-full bg-accent-clp text-canvas hover:bg-accent-clp/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 'Guardando...' : 'Creando...'}
              </>
            ) : isEditing ? (
              'Guardar Cambios'
            ) : (
              'Crear Participante'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
