import { z } from 'zod';

// Mismos topes que el backend (title VARCHAR(150), message VARCHAR(500)).
export const reminderSchema = z
  .object({
    title: z
      .string({ error: 'El título es obligatorio' })
      .trim()
      .min(1, 'El título es obligatorio')
      .max(150, 'Máximo 150 caracteres'),
    message: z.string().max(500, 'Máximo 500 caracteres').optional(),
    remind_date: z.string({ error: 'Elige la fecha' }).min(1, 'Elige la fecha'),
    remind_time: z.string({ error: 'Elige la hora' }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Elige la hora'),
    // null = para mí.
    recipient_user_id: z.number().nullable().optional(),
  })
  // Solo UX: el backend lo vuelve a validar en hora de Lima.
  .refine((data) => new Date(`${data.remind_date}T${data.remind_time}:00`).getTime() >= Date.now() - 60_000, {
    message: 'Esa fecha y hora ya pasaron: elige un momento futuro',
    path: ['remind_time'],
  });

export type ReminderFormValues = z.infer<typeof reminderSchema>;
