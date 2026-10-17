import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  // min-w-0: Tabs es un flex-col — sin esto, un TabsContent ancho (una
  // tabla grande, un kanban con scroll propio) se niega a encogerse y
  // termina empujando todo hacia afuera en vez de scrollear en su propio
  // recuadro (mismo motivo que min-w-0 en DialogContent/TabsContent).
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex min-w-0 flex-col gap-2', className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    // max-w-full + overflow-x-auto: si hay más pestañas de las que caben
    // (ej. el detalle de cotización: Productos/Pagos/Gastos/Compras/
    // Historial), esta fila scrollea sola en vez de recortarse sin forma
    // de verla — antes el modal tenía overflow-x-hidden y la lista, al ser
    // `w-fit` sin tope, simplemente desaparecía de los bordes para afuera.
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'scrollbar-thin bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center justify-center gap-0.5 overflow-x-auto rounded-lg p-1',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:ring-ring/50 inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content data-slot="tabs-content" className={cn('min-w-0 flex-1 outline-none', className)} {...props} />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
