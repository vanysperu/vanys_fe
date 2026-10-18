import { Bell, Check, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ReminderFormDialog } from '@/modules/reminders/components/ReminderFormDialog';
import { useMarkReminderRead, useReminders, useToggleReminderStatus } from '@/modules/reminders/hooks/useReminders';
import {
  REMINDER_STATE_LABEL,
  type Reminder,
  type ReminderBox,
  type ReminderState,
  type ReminderStatusFilter,
} from '@/modules/reminders/types/reminder.types';
import { cn } from '@/lib/utils';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Button } from '@/presentation/components/shared/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

const STATE_CLASS: Record<ReminderState, string> = {
  due: 'bg-destructive/10 text-destructive',
  upcoming: 'bg-primary/10 text-primary',
  read: 'bg-[var(--success)]/10 text-[var(--success)]',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

const STATUS_OPTIONS: { value: ReminderState; label: string }[] = [
  { value: 'upcoming', label: REMINDER_STATE_LABEL.upcoming },
  { value: 'due', label: REMINDER_STATE_LABEL.due },
  { value: 'read', label: REMINDER_STATE_LABEL.read },
  { value: 'cancelled', label: REMINDER_STATE_LABEL.cancelled },
];

const formatWhen = (date: string, time: string) =>
  `${new Date(`${date}T00:00:00`).toLocaleDateString('es-PE')} ${time}`;

// Recordatorios (pedido explícito del usuario: "notificaciones que salgan en
// el tiempo que yo le coloque para que me recuerde cosas a mí o a otro
// usuario"). "Para mí" = los que me llegan; "Programados por mí" = los que
// creé (para mí o para otro), que son los únicos que puedo editar/cancelar.
export function RemindersPage() {
  const [box, setBox] = useState<ReminderBox>('received');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);

  const canCreate = usePermissionButton('reminder.create.button');
  const canUpdate = usePermissionButton('reminder.update.button');
  const canDisable = usePermissionButton('reminder.disable.button');

  const { data, isLoading } = useReminders({
    page,
    limit: pageSize,
    box,
    // Sin filtro: todo menos los cancelados.
    status: (statusFilter as ReminderStatusFilter | undefined) ?? 'active',
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
  const { mutate: markRead } = useMarkReminderRead();
  const { mutate: toggleStatus, isPending: isToggling } = useToggleReminderStatus();

  const hasActiveFilters = Boolean(statusFilter || dateRange.dateFrom || dateRange.dateTo);
  const clearFilters = () => {
    setStatusFilter(undefined);
    setDateRange({});
    setPage(1);
  };
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (reminder: Reminder) => {
    setEditing(reminder);
    setFormOpen(true);
  };
  const onError = (error: unknown) => toast.error((error as ApiClientError).message);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recordatorios"
        description="Avisos programados para ti o para otro usuario, en la fecha y hora que elijas"
        action={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nuevo recordatorio
            </Button>
          )
        }
      />

      <Tabs value={box} onValueChange={(value) => withPageReset(setBox)(value as ReminderBox)}>
        <TabsList>
          <TabsTrigger value="received">Para mí</TabsTrigger>
          <TabsTrigger value="sent">Programados por mí</TabsTrigger>
        </TabsList>
      </Tabs>

      <FiltersBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
        <FilterSelect
          aria-label="Estado"
          allLabel="Todos (sin cancelados)"
          className="w-52"
          value={statusFilter}
          onChange={withPageReset(setStatusFilter)}
          options={STATUS_OPTIONS}
        />
        <DateRangeFilter placeholder="Fecha del aviso" value={dateRange} onChange={withPageReset(setDateRange)} />
      </FiltersBar>

      <DataTable<Reminder>
        columns={[
          {
            header: 'Cuándo',
            cell: (row) => <span className="font-mono-nums text-xs">{formatWhen(row.remind_date, row.remind_time)}</span>,
          },
          {
            header: 'Recordatorio',
            cell: (row) => (
              <div>
                <p className="font-medium">{row.title}</p>
                {row.message && <p className="text-xs text-muted-foreground">{row.message}</p>}
              </div>
            ),
          },
          box === 'received'
            ? { header: 'De', cell: (row: Reminder) => row.creator.name }
            : { header: 'Para', cell: (row: Reminder) => row.recipient.name },
          {
            header: 'Estado',
            cell: (row) => (
              <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold', STATE_CLASS[row.state])}>
                {REMINDER_STATE_LABEL[row.state]}
              </span>
            ),
          },
          {
            header: '',
            align: 'right',
            cell: (row) => (
              <ReminderActions
                reminder={row}
                box={box}
                canUpdate={canUpdate}
                canDisable={canDisable}
                isToggling={isToggling}
                onMarkRead={() => markRead(row.id, { onSuccess: () => toast.success('Marcado como visto'), onError })}
                onEdit={() => openEdit(row)}
                onToggle={() =>
                  toggleStatus(row.id, {
                    onSuccess: (updated) =>
                      toast.success(updated.state === 'cancelled' ? 'Recordatorio cancelado' : 'Recordatorio reactivado'),
                    onError,
                  })
                }
              />
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyIcon={Bell}
        emptyTitle={box === 'received' ? 'No tienes recordatorios' : 'No programaste recordatorios'}
      />

      {data && (
        <Pagination
          result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <ReminderFormDialog open={formOpen} onOpenChange={setFormOpen} reminder={editing} />
    </div>
  );
}

interface ReminderActionsProps {
  reminder: Reminder;
  box: ReminderBox;
  canUpdate: boolean;
  canDisable: boolean;
  isToggling: boolean;
  onMarkRead: () => void;
  onEdit: () => void;
  onToggle: () => void;
}

// Orden estándar de la fila de acciones (CLAUDE.md sección 7): editar ->
// deshabilitar. "Marcar visto" solo le corresponde al destinatario.
function ReminderActions({ reminder, box, canUpdate, canDisable, isToggling, onMarkRead, onEdit, onToggle }: ReminderActionsProps) {
  const isPendingForMe = box === 'received' && (reminder.state === 'due' || reminder.state === 'upcoming');
  const isEditable = box === 'sent' && canUpdate && (reminder.state === 'due' || reminder.state === 'upcoming');
  // Uno ya visto no se cancela: ya cumplió su función.
  const isToggleable = box === 'sent' && canDisable && reminder.state !== 'read';

  return (
    <div className="flex items-center justify-end gap-1">
      {isPendingForMe && (
        <Button size="icon" variant="ghost" title="Marcar como visto" aria-label="Marcar como visto" onClick={onMarkRead}>
          <Check className="size-4" />
        </Button>
      )}
      {isEditable && (
        <Button size="icon" variant="ghost" title="Editar recordatorio" aria-label="Editar recordatorio" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
      )}
      {isToggleable && (
        <ToggleStatusButton
          active={reminder.state !== 'cancelled'}
          onToggle={onToggle}
          disabled={isToggling}
          entityLabel="recordatorio"
        />
      )}
    </div>
  );
}
