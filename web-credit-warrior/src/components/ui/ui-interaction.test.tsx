import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from './drawer';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './dropdown-menu';
import { Switch } from './switch';

describe('UI Interaction Primitives (Spec 003 T1)', () => {
  describe('Tabs', () => {
    it('renders tabs with defaultValue and switches content on trigger click', async () => {
      const onValueChange = vi.fn();
      render(
        <Tabs defaultValue="cards" onValueChange={onValueChange}>
          <TabsList aria-label="Catálogos">
            <TabsTrigger value="cards">Tarjetas</TabsTrigger>
            <TabsTrigger value="persons">Personas</TabsTrigger>
          </TabsList>
          <TabsContent value="cards">Contenido de Tarjetas</TabsContent>
          <TabsContent value="persons">Contenido de Personas</TabsContent>
        </Tabs>,
      );

      const cardsTab = screen.getByRole('tab', { name: /tarjetas/i });
      const personsTab = screen.getByRole('tab', { name: /personas/i });

      expect(cardsTab).toHaveAttribute('aria-selected', 'true');
      expect(personsTab).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByText('Contenido de Tarjetas')).toBeInTheDocument();
      expect(screen.queryByText('Contenido de Personas')).not.toBeInTheDocument();

      await userEvent.click(personsTab);

      expect(onValueChange).toHaveBeenCalledWith('persons');
      expect(cardsTab).toHaveAttribute('aria-selected', 'false');
      expect(personsTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Contenido de Personas')).toBeInTheDocument();
      expect(screen.queryByText('Contenido de Tarjetas')).not.toBeInTheDocument();
    });

    it('supports controlled value', async () => {
      function ControlledTabs() {
        const [value, setValue] = useState('active');
        return (
          <Tabs value={value} onValueChange={setValue}>
            <TabsList>
              <TabsTrigger value="active">Activas</TabsTrigger>
              <TabsTrigger value="archived">Archivadas</TabsTrigger>
            </TabsList>
            <TabsContent value="active">Lista Activas</TabsContent>
            <TabsContent value="archived">Lista Archivadas</TabsContent>
          </Tabs>
        );
      }

      render(<ControlledTabs />);
      expect(screen.getByText('Lista Activas')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('tab', { name: /archivadas/i }));
      expect(screen.getByText('Lista Archivadas')).toBeInTheDocument();
    });

    it('navigates tabs using keyboard arrow keys', async () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">Uno</TabsTrigger>
            <TabsTrigger value="two">Dos</TabsTrigger>
            <TabsTrigger value="three">Tres</TabsTrigger>
          </TabsList>
          <TabsContent value="one">Panel 1</TabsContent>
          <TabsContent value="two">Panel 2</TabsContent>
          <TabsContent value="three">Panel 3</TabsContent>
        </Tabs>,
      );

      const tab1 = screen.getByRole('tab', { name: 'Uno' });
      tab1.focus();
      expect(tab1).toHaveFocus();

      fireEvent.keyDown(tab1, { key: 'ArrowRight' });
      const tab2 = screen.getByRole('tab', { name: 'Dos' });
      expect(tab2).toHaveFocus();
      expect(tab2).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Panel 2')).toBeInTheDocument();
    });
  });

  describe('Dialog', () => {
    it('renders trigger and opens dialog content on click', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button type="button">Abrir Diálogo</button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Tarjeta</DialogTitle>
              <DialogDescription>Ingresa los datos para registrar la tarjeta.</DialogDescription>
            </DialogHeader>
            <p>Cuerpo del diálogo</p>
            <DialogFooter>
              <DialogClose asChild>
                <button type="button">Cancelar</button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /abrir diálogo/i }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /nueva tarjeta/i })).toBeInTheDocument();
      expect(screen.getByText(/ingresa los datos/i)).toBeInTheDocument();
      expect(screen.getByText('Cuerpo del diálogo')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      await userEvent.click(cancelButton);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('respects controlled open state', () => {
      const { rerender } = render(
        <Dialog open={false}>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('AlertDialog', () => {
    it('opens alert dialog and triggers action callbacks', async () => {
      const onConfirm = vi.fn();
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button">Eliminar Registro</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>Confirmar Eliminación</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
      );

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /eliminar registro/i }));

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('¿Confirmas la eliminación?')).toBeInTheDocument();
      expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /confirmar eliminación/i });
      await userEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Drawer', () => {
    it('renders drawer trigger and content when opened', async () => {
      render(
        <Drawer>
          <DrawerTrigger asChild>
            <button type="button">Abrir Drawer</button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Detalles en Móvil</DrawerTitle>
              <DrawerDescription>Información contextual deslizable.</DrawerDescription>
            </DrawerHeader>
            <div>Contenido del drawer</div>
            <DrawerFooter>
              <DrawerClose asChild>
                <button type="button">Cerrar Drawer</button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>,
      );

      expect(screen.queryByText('Detalles en Móvil')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /abrir drawer/i }));

      expect(screen.getByText('Detalles en Móvil')).toBeInTheDocument();
      expect(screen.getByText('Contenido del drawer')).toBeInTheDocument();
    });
  });

  describe('DropdownMenu', () => {
    it('opens menu on trigger click and calls item onClick', async () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button">Acciones</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Opciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /acciones/i }));

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(screen.getByText('Opciones')).toBeInTheDocument();

      const editItem = screen.getByRole('menuitem', { name: /editar/i });
      const deleteItem = screen.getByRole('menuitem', { name: /eliminar/i });

      expect(editItem).toBeInTheDocument();
      expect(deleteItem).toBeInTheDocument();

      await userEvent.click(editItem);
      expect(onEdit).toHaveBeenCalledTimes(1);
      // Tras hacer click en un item, el menú se cierra
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes on Escape key press', async () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button">Opciones</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Copiar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      await userEvent.click(screen.getByRole('button', { name: /opciones/i }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('does not trigger onClick when item is disabled', async () => {
      const onClick = vi.fn();
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger asChild>
            <button type="button">Menu</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled onClick={onClick}>
              Desactivado
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      const item = screen.getByRole('menuitem', { name: /desactivado/i });
      expect(item).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(item);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Switch', () => {
    it('renders with role switch and toggles checked state', async () => {
      const onCheckedChange = vi.fn();
      render(
        <Switch
          aria-label="Activo"
          defaultChecked={false}
          onCheckedChange={onCheckedChange}
        />,
      );

      const switchEl = screen.getByRole('switch', { name: /activo/i });
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
      expect(switchEl).toHaveAttribute('data-state', 'unchecked');

      await userEvent.click(switchEl);

      expect(onCheckedChange).toHaveBeenCalledWith(true);
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
      expect(switchEl).toHaveAttribute('data-state', 'checked');

      await userEvent.click(switchEl);
      expect(onCheckedChange).toHaveBeenCalledWith(false);
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
      expect(switchEl).toHaveAttribute('data-state', 'unchecked');
    });

    it('supports controlled checked prop', async () => {
      function ControlledSwitch() {
        const [checked, setChecked] = useState(true);
        return (
          <Switch
            aria-label="Toggle"
            checked={checked}
            onCheckedChange={setChecked}
          />
        );
      }

      render(<ControlledSwitch />);
      const switchEl = screen.getByRole('switch', { name: /toggle/i });
      expect(switchEl).toHaveAttribute('aria-checked', 'true');

      await userEvent.click(switchEl);
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });

    it('does not toggle when disabled', async () => {
      const onCheckedChange = vi.fn();
      render(
        <Switch
          disabled
          aria-label="Deshabilitado"
          onCheckedChange={onCheckedChange}
        />,
      );

      const switchEl = screen.getByRole('switch', { name: /deshabilitado/i });
      expect(switchEl).toBeDisabled();

      await userEvent.click(switchEl);
      expect(onCheckedChange).not.toHaveBeenCalled();
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });
  });
});
