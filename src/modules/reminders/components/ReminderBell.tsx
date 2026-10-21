import { Bell, BellRing, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useDueReminders, useMarkReminderRead } from '@/modules/reminders/hooks/useReminders';
import type { Reminder } from '@/modules/reminders/types/reminder.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/components/shared/ui/popover';
import { usePermission } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

const formatWhen = (reminder: Reminder) =>
  `${new Date(`${reminder.remind_date}T00:00:00`).toLocaleDateString('es-PE')} ${reminder.remind_time}`;

// Aviso del sistema operativo solo si la pestaña no está a la vista (si
// está a la vista ya se ve el toast) y el usuario dio permiso.
function showBrowserNotification(reminder: Reminder) {
  if (!notificationsSupported() || Notification.permission !== 'granted' || !document.hidden) return;
  new Notification(reminder.title, { body: reminder.message ?? `Recordatorio de ${reminder.creator.name}`, tag: `reminder-${reminder.id}` });
}

// Campana de recordatorios en la barra superior (pedido explícito del
// usuario: "notificaciones que salgan en el tiempo que yo le coloque").
// Pregunta cada minuto qué recordatorios ya vencieron y, por cada uno nuevo,
// muestra un aviso; quedan en la campana hasta marcarlos como vistos.
export function ReminderBell() {
  const canUseReminders = usePermission('reminder');
  const { data } = useDueReminders(canUseReminders);
  const { mutate: markRead } = useMarkReminderRead();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(() =>
    notificationsSupported() ? Notification.permission : 'denied',
  );
  // Ids ya avisados en esta sesión: el polling devuelve los mismos vencidos
  // cada minuto y no hay que repetir el toast por cada consulta.
  const notifiedIds = useRef(new Set<number>());

  const handleMarkRead = (id: number) =>
    markRead(id, { onError: (error) => toast.error((error as ApiClientError).message) });

  // Solo avisa; no cambia nada que este efecto observe (sin riesgo de bucle).
  // `markRead` de React Query es estable entre renders.
  useEffect(() => {
    const fresh = (data?.data ?? []).filter((reminder) => !notifiedIds.current.has(reminder.id));
    fresh.forEach((reminder) => {
      notifiedIds.current.add(reminder.id);
      toast(reminder.title, {
        id: `reminder-${reminder.id}`,
        description: reminder.message ?? `Recordatorio de ${reminder.creator.name}`,
        icon: <BellRing className="size-4" />,
        duration: 15_000,
        action: {
          label: 'Visto',
          onClick: () => markRead(reminder.id, { onError: (error) => toast.error((error as ApiClientError).message) }),
        },
      });
      showBrowserNotification(reminder);
    });
  }, [data, markRead]);

  if (!canUseReminders) return null;

  const dueReminders = data?.data ?? [];
  const total = data?.total ?? 0;

  const requestPermission = async () => {
    if (!notificationsSupported()) return;
    setPermission(await Notification.requestPermission());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={total > 0 ? `Recordatorios: ${total} pendientes` : 'Recordatorios'}
          title="Recordatorios"
        >
          {total > 0 ? <BellRing className="size-5" /> : <Bell className="size-5" />}
          {total > 0 && (
            <span
              data-testid="reminder-bell-count"
              className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
            >
              {total > 99 ? '99+' : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      {/* Nunca más ancho que la pantalla menos 1rem: en un celular de 320 px
          los 20rem fijos se salían por el borde izquierdo. */}
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1rem))] p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-semibold">Recordatorios</p>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? `${total} pendiente${total === 1 ? '' : 's'} de ver` : 'No tienes recordatorios pendientes'}
          </p>
        </div>

        <div className="scrollbar-thin max-h-80 divide-y overflow-y-auto">
          {dueReminders.map((reminder) => (
            <div key={reminder.id} className="flex items-start gap-2 px-3 py-2" data-testid="reminder-bell-item">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{reminder.title}</p>
                {reminder.message && <p className="text-xs text-muted-foreground">{reminder.message}</p>}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatWhen(reminder)} · de {reminder.creator.name}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                title="Marcar como visto"
                aria-label={`Marcar "${reminder.title}" como visto`}
                onClick={() => handleMarkRead(reminder.id)}
              >
                <Check className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
          <Link to="/recordatorios" className="text-xs font-medium text-primary hover:underline" onClick={() => setOpen(false)}>
            Ver todos
          </Link>
          {permission === 'default' && (
            <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={requestPermission}>
              Activar avisos del navegador
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
