import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useEffect, useRef } from 'react';

import { useCreateReminder, useReminderRecipients, useUpdateReminder } from '@/modules/reminders/hooks/useReminders';
import { reminderSchema, type ReminderFormValues } from '@/modules/reminders/schemas/reminder.schema';
import type { Reminder } from '@/modules/reminders/types/reminder.types';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { DateField } from '@/presentation/components/shared/DateField';
import { MultiSelect } from '@/presentation/components/shared/MultiSelect';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Button } from '@/presentation/components/shared/ui/button';
import { disablePast } from '@/presentation/components/shared/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import type { ApiClientError } from '@/config/api.types';
import { todayLocalDateString } from '@/lib/dateUtils';

const MESSAGE_MAX_LENGTH = 500;
// Valor del selector para "para mí" (el backend toma al usuario logueado).
const MYSELF = 'me';

// Próxima hora en punto: un valor por defecto razonable y siempre futuro.
function nextFullHour(): string {
  const hour = (new Date().getHours() + 1) % 24;
  return `${String(hour).padStart(2, '0')}:00`;
}

interface ReminderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Con valor = editar ese recordatorio; sin valor = crear uno nuevo.
  reminder?: Reminder | null;
}

export function ReminderFormDialog({ open, onOpenChange, reminder = null }: ReminderFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Se vuelve a montar por recordatorio: los valores iniciales cambian. */}
        {open && <ReminderForm key={reminder?.id ?? 'new'} reminder={reminder} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ReminderForm({ reminder, onDone }: { reminder: Reminder | null; onDone: () => void }) {
  const isEditing = reminder !== null;
  const { data: recipients } = useReminderRecipients(true);
  const { mutate: createReminder, isPending: isCreating } = useCreateReminder();
  const { mutate: updateReminder, isPending: isUpdating } = useUpdateReminder();
  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: reminder
      ? {
          title: reminder.title,
          message: reminder.message ?? '',
          remind_date: reminder.remind_date,
          remind_time: reminder.remind_time,
          recipient_user_id: reminder.recipient.id,
        }
      : { remind_date: todayLocalDateString(), remind_time: nextFullHour(), recipient_user_ids: [] },
  });

  const me = recipients?.find((recipient) => recipient.is_me);
  const recipientOptions = [
    { value: MYSELF, label: me ? `Yo (${me.name})` : 'Yo' },
    ...(recipients ?? [])
      .filter((recipient) => !recipient.is_me)
      .map((recipient) => ({ value: String(recipient.id), label: recipient.name })),
  ];
  const recipientId = watch('recipient_user_id');
  const recipientValue = recipientId == null || recipientId === me?.id ? MYSELF : String(recipientId);

  // Multi-select (crear): usa ids reales, no el sentinel MYSELF — cada
  // entrada del array debe ser un id de usuario válido (ver create.service.ts).
  const multiRecipientOptions = (recipients ?? []).map((recipient) => ({
    value: String(recipient.id),
    label: recipient.is_me ? `Yo (${recipient.name})` : recipient.name,
  }));
  const selectedRecipientIds = (watch('recipient_user_ids') ?? []).map(String);

  // Selector múltiple (solo al crear): arranca con "Yo" pre-elegido en
  // cuanto se conoce quién es "yo" — el usuario puede sumar a otros o
  // deseleccionarse a sí mismo. Solo corre una vez (ref), para no pisar una
  // deselección deliberada del usuario en renders posteriores.
  const didPreselectMyself = useRef(false);
  useEffect(() => {
    if (isEditing || !me || didPreselectMyself.current) return;
    didPreselectMyself.current = true;
    setValue('recipient_user_ids', [me.id]);
  }, [isEditing, me, setValue]);

  const onSubmit = (values: ReminderFormValues) => {
    const dto = {
      title: values.title,
      message: values.message?.trim() || null,
      remind_date: values.remind_date,
      remind_time: values.remind_time,
      recipient_user_id: values.recipient_user_id ?? null,
      recipient_user_ids: values.recipient_user_ids,
    };
    const callbacks = {
      onSuccess: () => {
        toast.success(isEditing ? 'Recordatorio actualizado' : 'Recordatorio programado');
        onDone();
      },
      onError: (error: unknown) => toast.error((error as ApiClientError).message),
    };
    if (reminder) {
      updateReminder({ id: reminder.id, dto }, callbacks);
      return;
    }
    createReminder(dto, callbacks);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar recordatorio' : 'Nuevo recordatorio'}</DialogTitle>
        <DialogDescription>Te aparecerá un aviso (a ti o a quien elijas) en la fecha y hora indicadas.</DialogDescription>
      </DialogHeader>

      <div className="space-y-1">
        <Label htmlFor="reminder-title">¿Qué hay que recordar?</Label>
        <Input id="reminder-title" maxLength={150} placeholder="Ej. Llamar al cliente por el adelanto" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="reminder-message">Detalle (opcional)</Label>
        <Textarea id="reminder-message" rows={3} maxLength={MESSAGE_MAX_LENGTH} {...register('message')} />
        <CharCounter value={watch('message')} max={MESSAGE_MAX_LENGTH} />
        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="reminder-date">Fecha</Label>
          <DateField
            id="reminder-date"
            value={watch('remind_date')}
            onChange={(value) => setValue('remind_date', value, { shouldValidate: true })}
            disabled={disablePast}
          />
          {errors.remind_date && <p className="text-xs text-destructive">{errors.remind_date.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="reminder-time">Hora</Label>
          <Input id="reminder-time" type="time" {...register('remind_time')} />
          {errors.remind_time && <p className="text-xs text-destructive">{errors.remind_time.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="reminder-recipient">¿Para quién?</Label>
        {isEditing ? (
          <SearchableSelect
            id="reminder-recipient"
            options={recipientOptions}
            value={recipientValue}
            onChange={(value) =>
              setValue('recipient_user_id', value === MYSELF ? null : Number(value), { shouldValidate: true })
            }
            placeholder="Elige a quién avisar"
            emptyText="No se encontró ese usuario"
          />
        ) : (
          // Selector múltiple (pedido de QA): se puede avisar a varias
          // personas a la vez sin duplicar la tarea — una fila de
          // recordatorio por destinatario elegido.
          <MultiSelect
            options={multiRecipientOptions}
            value={selectedRecipientIds}
            onChange={(values) => setValue('recipient_user_ids', values.map(Number), { shouldValidate: true })}
            placeholder="Elige a quién avisar"
            emptyText="No se encontró ese usuario"
          />
        )}
        {errors.recipient_user_ids && <p className="text-xs text-destructive">{errors.recipient_user_ids.message}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={isPending}>
          <X className="size-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {isEditing ? 'Guardar cambios' : 'Programar recordatorio'}
        </Button>
      </DialogFooter>
    </form>
  );
}
