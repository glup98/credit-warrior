'use client';

import * as React from 'react';
import { MoreVertical, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useUpdatePerson } from '@/hooks/queries/use-persons';
import type { PersonRead } from '@/types/api.types';

export interface PersonItemProps {
  person: PersonRead;
  onEdit?: (person: PersonRead) => void;
  onDelete?: (person: PersonRead) => void;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || '';
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

/**
 * Ficha visual de participante con avatar de color e interacción contextual de edición y archivado.
 */
export function PersonItem({
  person,
  onEdit,
  onDelete,
  className,
}: PersonItemProps) {
  const updatePersonMutation = useUpdatePerson();
  const initials = getInitials(person.name);
  const avatarBg = person.color_hex || '#8A93A6';

  const handleToggleActive = async () => {
    const nextActive = !person.is_active;
    try {
      await updatePersonMutation.mutateAsync({
        id: person.id,
        data: { is_active: nextActive },
      });
      toast.success(
        nextActive ? 'Persona reactivada exitosamente' : 'Persona archivada exitosamente',
      );
    } catch {
      toast.error('No se pudo actualizar el estado de la persona');
    }
  };

  return (
    <article
      className={cn(
        'group relative flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-4 sm:p-5 shadow-sm transition-all hover:border-border-subtle/80 hover:bg-surface/90',
        !person.is_active && 'opacity-75 bg-canvas/60',
        className,
      )}
      aria-label={`Participante ${person.name}`}
    >
      {/* Avatar e Información Principal */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          style={{ backgroundColor: avatarBg }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-white text-sm shadow-sm ring-1 ring-border-subtle"
        >
          {initials}
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="truncate text-base font-semibold text-text-primary">
              {person.name}
            </h3>
            <Badge
              variant={person.is_active ? 'default' : 'secondary'}
              className={cn(
                'text-[10px] font-medium tracking-wide uppercase',
                person.is_active
                  ? 'border-accent-clp/30 bg-accent-clp/15 text-accent-clp'
                  : 'border-border-subtle bg-canvas text-text-muted',
              )}
            >
              {person.is_active ? 'Activo' : 'Archivado'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Menú de acciones contextuales */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp"
            aria-label={`Acciones para ${person.name}`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit?.(person)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleToggleActive}>
            {person.is_active ? (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archivar
              </>
            ) : (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Reactivar
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete?.(person)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
}
