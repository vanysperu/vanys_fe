import { z } from 'zod';

// Mismas reglas que valida el backend (advertisement.validator.ts).
export const advertisementFormSchema = z.object({
  // Solo el Super Administrador elige la empresa (al crear).
  company_id: z.number().optional(),
  zone_id: z.number().optional(),
  title: z.string().trim().min(1, 'El título es obligatorio').max(120, 'Máximo 120 caracteres'),
  // Opcional; solo http o https (la web lo pone en un enlace).
  link_url: z
    .string()
    .trim()
    .max(500, 'Máximo 500 caracteres')
    .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), 'Debe empezar con http:// o https://'),
  image_path: z.string({ error: 'Sube la imagen del anuncio' }).min(1, 'Sube la imagen del anuncio'),
  // Solo al editar: posición dentro de su zona.
  position: z.number({ error: 'Indica la posición' }).int('Debe ser un número entero').min(1, 'Empieza en 1').optional(),
});

export type AdvertisementFormValues = z.infer<typeof advertisementFormSchema>;

// Zona nueva: el código va en la dirección que pide la web (?zone=codigo), así
// que sin espacios ni símbolos raros.
export const advertisementZoneSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  code: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-z0-9_-]+$/i, 'Solo letras, números, guion y guion bajo (sin espacios)'),
});

export type AdvertisementZoneFormValues = z.infer<typeof advertisementZoneSchema>;

// "Banner de inicio" -> "banner-de-inicio": código sugerido a partir del nombre.
export function suggestZoneCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}
