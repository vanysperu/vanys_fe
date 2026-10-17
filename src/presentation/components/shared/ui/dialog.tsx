import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Maximize2, Minimize2, XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  );
}

interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  // Muestra el botón de expandir/contraer a pantalla casi-completa — útil
  // para modales con contenido denso (pestañas, tablas, kanbans) que se
  // sienten apretados en el ancho fijo por defecto. Apagado por defecto
  // para no cambiar el look de diálogos simples (confirmaciones, forms
  // cortos) que sí encajan bien en el tamaño chico.
  expandable?: boolean;
  // Arranca ya expandido (útil para modales que siempre se sienten
  // apretados en su tamaño chico, ej. el de cotización) — el botón de
  // contraer/expandir sigue funcionando igual, esto solo cambia el estado
  // inicial. Sin efecto si `expandable` es false. Por defecto false, no
  // cambia el comportamiento de ningún diálogo existente.
  defaultExpanded?: boolean;
}

function DialogContent({
  className,
  children,
  expandable = false,
  defaultExpanded = false,
  ...props
}: DialogContentProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // min-w-0 en el grid: sin esto, un hijo ancho (ej. un kanban con
          // scroll horizontal propio) se niega a encogerse y en vez de
          // scrollear adentro empuja TODO el modal a scrollear — overflow-x
          // se queda oculto acá arriba a propósito, el scroll horizontal
          // vive únicamente donde se pidió explícitamente (ver
          // QuotationsKanbanBoard/QuotationItemsKanban).
          'scrollbar-thin bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid min-w-0 max-h-[85vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-x-hidden overflow-y-auto rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          // className (el max-w-* que cada diálogo pide, ej. "sm:max-w-3xl")
          // va ANTES que `expanded`: si quedara después, tailwind-merge se
          // queda con la última clase en conflicto y el ancho fijo del
          // caller le ganaba siempre al expand — el botón se veía roto.
          className,
          expanded && 'max-h-[92vh] w-[96vw] max-w-none sm:max-w-none',
        )}
        {...props}
      >
        {children}
        <div className="absolute top-4 right-4 flex items-center gap-1">
          {expandable && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="ring-offset-background text-muted-foreground hover:text-foreground rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden"
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              <span className="sr-only">{expanded ? 'Contraer' : 'Expandir'}</span>
            </button>
          )}
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <XIcon />
            <span className="sr-only">Cerrar</span>
          </DialogPrimitive.Close>
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
