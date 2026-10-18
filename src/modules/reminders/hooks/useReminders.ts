import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createReminder,
  getDueReminders,
  getReminderRecipients,
  getReminders,
  markReminderRead,
  toggleReminderStatus,
  updateReminder,
} from '@/modules/reminders/api/reminders.api';
import { remindersKeys } from '@/modules/reminders/hooks/reminders.keys';
import type { ReminderDto, ReminderListParams } from '@/modules/reminders/types/reminder.types';

// Cada cuánto se pregunta "¿me toca algún recordatorio?". No hay sockets ni
// cron: el backend calcula qué venció al consultar, así que como máximo el
// aviso llega un minuto tarde.
const DUE_POLL_INTERVAL_MS = 60_000;

export function useReminders(params: ReminderListParams) {
  return useQuery({
    queryKey: remindersKeys.list(params),
    queryFn: () => getReminders(params),
    placeholderData: keepPreviousData,
  });
}

// `enabled` corta el polling si el usuario no tiene el módulo (sin acceso,
// el endpoint respondería 403 cada minuto).
export function useDueReminders(enabled: boolean) {
  return useQuery({
    queryKey: remindersKeys.due(),
    queryFn: getDueReminders,
    enabled,
    refetchInterval: enabled ? DUE_POLL_INTERVAL_MS : false,
    // Sigue preguntando con la pestaña en segundo plano: justo ahí es cuando
    // más sirve el aviso del navegador.
    refetchIntervalInBackground: true,
    retry: 1,
  });
}

export function useReminderRecipients(enabled: boolean) {
  return useQuery({
    queryKey: remindersKeys.recipients(),
    queryFn: getReminderRecipients,
    enabled,
    staleTime: 5 * 60_000,
  });
}

// Crear/editar/cancelar/marcar visto cambian tanto los listados como la campana.
function useInvalidateReminders() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: remindersKeys.lists() });
    queryClient.invalidateQueries({ queryKey: remindersKeys.due() });
  };
}

export function useCreateReminder() {
  const invalidate = useInvalidateReminders();
  return useMutation({ mutationFn: (dto: ReminderDto) => createReminder(dto), onSuccess: invalidate });
}

export function useUpdateReminder() {
  const invalidate = useInvalidateReminders();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ReminderDto }) => updateReminder(id, dto),
    onSuccess: invalidate,
  });
}

export function useToggleReminderStatus() {
  const invalidate = useInvalidateReminders();
  return useMutation({ mutationFn: (id: number) => toggleReminderStatus(id), onSuccess: invalidate });
}

export function useMarkReminderRead() {
  const invalidate = useInvalidateReminders();
  return useMutation({ mutationFn: (id: number) => markReminderRead(id), onSuccess: invalidate });
}
