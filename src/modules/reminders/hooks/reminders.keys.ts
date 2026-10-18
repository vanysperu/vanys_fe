import type { ReminderListParams } from '@/modules/reminders/types/reminder.types';

export const remindersKeys = {
  all: ['reminders'] as const,
  lists: () => [...remindersKeys.all, 'list'] as const,
  list: (params: ReminderListParams) => [...remindersKeys.lists(), params] as const,
  due: () => [...remindersKeys.all, 'due'] as const,
  recipients: () => [...remindersKeys.all, 'recipients'] as const,
};
