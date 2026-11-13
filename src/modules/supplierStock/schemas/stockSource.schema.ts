import { z } from 'zod';

// Mismas reglas que el backend (supplier_stock.validator.ts). El mapeo de
// columnas va "aplanado" en el formulario y se arma al enviar.
const column = (label: string) => z.string().trim().min(1, `Indica la columna de ${label}`).max(60, 'Máximo 60 caracteres');
const optionalColumn = z.string().trim().max(60, 'Máximo 60 caracteres').optional();

export const stockSourceSchema = z
  .object({
    supplier_id: z.number({ error: 'Elige el proveedor' }).int().positive('Elige el proveedor'),
    name: z.string().trim().min(1, 'Ponle un nombre').max(120, 'Máximo 120 caracteres'),
    source_type: z.enum(['url', 'upload']),
    url: z.string().trim().max(2000, 'El enlace es demasiado largo').optional(),
    // Editando una fuente con enlace: vacío = se conserva el guardado.
    hasSavedUrl: z.boolean(),
    sheet_name: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
    header_row: z.number({ error: 'Indica la fila' }).int().min(1, 'Desde la fila 1').max(50, 'Hasta la fila 50'),
    code_column: column('código'),
    quantity_column: column('stock'),
    color_column: optionalColumn,
    description_column: optionalColumn,
    price_column: optionalColumn,
    refresh_minutes: z.number().int().min(30).max(10080),
    // Solo lo elige el Super Administrador.
    company_id: z.number().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.source_type !== 'url') return;
    if (values.url) {
      if (!/^https:\/\//i.test(values.url)) ctx.addIssue({ code: 'custom', path: ['url'], message: 'El enlace tiene que empezar con https://' });
      return;
    }
    if (!values.hasSavedUrl) ctx.addIssue({ code: 'custom', path: ['url'], message: 'Pega el enlace del Excel del proveedor' });
  });

export type StockSourceFormValues = z.infer<typeof stockSourceSchema>;

// Frecuencias que se ofrecen (minutos).
export const REFRESH_OPTIONS = [
  { value: 60, label: 'Cada hora' },
  { value: 180, label: 'Cada 3 horas' },
  { value: 360, label: 'Cada 6 horas' },
  { value: 720, label: 'Cada 12 horas' },
  { value: 1440, label: 'Una vez al día' },
] as const;
