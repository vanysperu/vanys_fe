import type { PagedListResult } from '@/config/api.types';

// Espejo de grulla_be: reminder/types/reminder.types.ts.
//   upcoming  -> todavía no llega su hora
//   due       -> ya llegó su hora y el destinatario no lo vio
//   read      -> el destinatario lo marcó como visto
//   cancelled -> quien lo creó lo canceló
export type ReminderState = 'upcoming' | 'due' | 'read' | 'cancelled';

export const REMINDER_STATE_LABEL: Record<ReminderState, string> = {
  upcoming: 'Programado',
  due: 'Pendiente de ver',
  read: 'Visto',
  cancelled: 'Cancelado',
};

// "active" = todo lo que no está cancelado.
export type ReminderStatusFilter = 'active' | ReminderState;

// "received" = los que me llegan; "sent" = los que yo programé.
export type ReminderBox = 'received' | 'sent';

export interface ReminderPerson {
  id: number;
  name: string;
}

export interface Reminder {
  id: number;
  title: string;
  message: string | null;
  // Hora de Lima, separadas (YYYY-MM-DD y HH:mm).
  remind_date: string;
  remind_time: string;
  state: ReminderState;
  read_at: { date: string; time: string } | null;
  recipient: ReminderPerson;
  creator: ReminderPerson;
  created_at: { date: string; time: string };
}

// Destinatario posible; is_me = el usuario logueado.
export interface ReminderRecipient extends ReminderPerson {
  is_me: boolean;
}

export type ReminderListResult = PagedListResult<Reminder>;

export interface DueRemindersResult {
  data: Reminder[];
  total: number;
}

export interface ReminderListParams {
  page?: number;
  limit?: number;
  box?: ReminderBox;
  status?: ReminderStatusFilter;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReminderDto {
  title: string;
  message?: string | null;
  remind_date: string;
  remind_time: string;
  // Vacío = uno mismo.
  recipient_user_id?: number | null;
}
