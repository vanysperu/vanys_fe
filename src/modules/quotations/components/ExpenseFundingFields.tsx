import { FUNDING_SOURCE_LABEL, type FundingSource } from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';

export interface ExpenseWorkerOption {
  id: number;
  name: string;
  paternal_lastname: string;
  email: string;
}

interface ExpenseFundingFieldsProps {
  idPrefix: string;
  fundingSource: FundingSource;
  paidByUserId: number | null | undefined;
  workers: ExpenseWorkerOption[];
  onFundingChange: (value: FundingSource) => void;
  onWorkerChange: (userId: number) => void;
  workerError?: string;
  // Ya se le repuso algo: no se puede cambiar quién pagó (el backend lo revalida).
  lockedNote?: string;
}

// Quién puso la plata de un gasto de cotización (pedido explícito del usuario).
// Con la de un trabajador nace su deuda, y no sale de Caja hasta reponérsela.
export function ExpenseFundingFields({
  idPrefix,
  fundingSource,
  paidByUserId,
  workers,
  onFundingChange,
  onWorkerChange,
  workerError,
  lockedNote,
}: ExpenseFundingFieldsProps) {
  const locked = lockedNote !== undefined;
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-funding`}>¿Con qué plata se pagó?</Label>
        <Select value={fundingSource} disabled={locked} onValueChange={(value) => onFundingChange(value as FundingSource)}>
          <SelectTrigger id={`${idPrefix}-funding`}>
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="company">{FUNDING_SOURCE_LABEL.company}</SelectItem>
            <SelectItem value="employee">Plata de un trabajador</SelectItem>
          </SelectContent>
        </Select>
        {lockedNote && <p className="text-[11px] text-muted-foreground">{lockedNote}</p>}
      </div>

      {fundingSource === 'employee' && (
        <div className="space-y-1">
          <Label>Trabajador que puso el dinero</Label>
          {workers.length > 0 ? (
            <SearchableSelect
              placeholder="Selecciona una persona"
              disabled={locked}
              value={paidByUserId ? String(paidByUserId) : undefined}
              onChange={(value) => onWorkerChange(Number(value))}
              options={workers.map((user) => ({
                value: String(user.id),
                label: `${user.name} ${user.paternal_lastname} · ${user.email}`,
              }))}
            />
          ) : (
            // Quien no puede ver la lista de usuarios lo registra a su nombre.
            <p className="text-xs text-muted-foreground">Se registrará a tu nombre.</p>
          )}
          {workerError && <p className="text-xs text-destructive">{workerError}</p>}
          <p className="text-[11px] text-muted-foreground">
            No sale de Caja hasta que se le reponga (Deudas a personal). El número de operación va en esa reposición.
          </p>
        </div>
      )}
    </>
  );
}
