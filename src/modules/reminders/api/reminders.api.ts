import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  DueRemindersResult,
  Reminder,
  ReminderDto,
  ReminderListParams,
  ReminderListResult,
  ReminderRecipient,
} from '@/modules/reminders/types/reminder.types';

export async function getReminders(params: ReminderListParams): Promise<ReminderListResult> {
  const response = await apiClient.get<ApiResponse<ReminderListResult>>('/reminder/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getDueReminders(): Promise<DueRemindersResult> {
  const response = await apiClient.get<ApiResponse<DueRemindersResult>>('/reminder/due');
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getReminderRecipients(): Promise<ReminderRecipient[]> {
  const response = await apiClient.get<ApiResponse<ReminderRecipient[]>>('/reminder/recipients');
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createReminder(dto: ReminderDto): Promise<Reminder> {
  const response = await apiClient.post<ApiResponse<Reminder>>('/reminder/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateReminder(id: number, dto: ReminderDto): Promise<Reminder> {
  const response = await apiClient.put<ApiResponse<Reminder>>(`/reminder/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function toggleReminderStatus(id: number): Promise<Reminder> {
  const response = await apiClient.put<ApiResponse<Reminder>>(`/reminder/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function markReminderRead(id: number): Promise<Reminder> {
  const response = await apiClient.put<ApiResponse<Reminder>>(`/reminder/read/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
