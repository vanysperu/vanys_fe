import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import type { VariableGeneral } from '@/modules/variableGeneral/types/variableGeneral.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';

// Cuentas de la empresa (banco, Yape, Plin): filas de "Variables generales"
// con esta categoría, las que se cargan en "Documentos de la empresa".
export const PAYMENT_ACCOUNT_CATEGORY = 'payment_account';

const ACCOUNT_TYPE_LABEL: Record<string, string> = { bank: 'Banco', yape: 'Yape', plin: 'Plin' };

// Valor interno del <Select> para "sin cuenta" (Radix no admite value="").
const CASH_VALUE = 'cash';

// companyId: solo para el Super Administrador (las cuentas de la empresa que
// eligió en el formulario); para un usuario de empresa el backend siempre
// devuelve las suyas.
export function usePaymentAccounts(companyId?: number) {
  return useVariableGenerals({ category: PAYMENT_ACCOUNT_CATEGORY, ignorePagination: true, companyId });
}

export function describePaymentAccount(account: Pick<VariableGeneral, 'name' | 'prefix_id' | 'ref1'>): string {
  const type = ACCOUNT_TYPE_LABEL[account.prefix_id] ?? account.prefix_id;
  return account.ref1 ? `${account.name} · ${type} · ${account.ref1}` : `${account.name} · ${type}`;
}

interface PaymentAccountSelectProps {
  id?: string;
  // null = efectivo (sin cuenta).
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  // false cuando el medio no admite efectivo (ej. un pago por transferencia):
  // solo se ofrecen las cuentas.
  allowCash?: boolean;
  cashLabel?: string;
  placeholder?: string;
  companyId?: number;
}

// Selector de "a qué cuenta entró / de qué cuenta salió el dinero" (pedido
// explícito del usuario: "no especifica a qué banco fue realizado"). Se usa
// igual en pagos recibidos, caja y reposiciones a trabajadores.
export function PaymentAccountSelect({
  id,
  value,
  onChange,
  allowCash = true,
  cashLabel = 'Efectivo (sin cuenta)',
  placeholder = 'Selecciona la cuenta',
  companyId,
}: PaymentAccountSelectProps) {
  const { data } = usePaymentAccounts(companyId);
  const accounts = (data?.data ?? []).filter(
    (account) => !account.is_deleted && (companyId === undefined || account.company_id === companyId),
  );

  const selected = value == null ? (allowCash ? CASH_VALUE : undefined) : String(value);

  return (
    <div className="space-y-1">
      <Select value={selected} onValueChange={(next) => onChange(next === CASH_VALUE ? null : Number(next))}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowCash && <SelectItem value={CASH_VALUE}>{cashLabel}</SelectItem>}
          {accounts.map((account) => (
            <SelectItem key={account.id} value={String(account.id)}>
              {describePaymentAccount(account)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {accounts.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No hay cuentas configuradas. Puedes agregarlas en "Documentos de la empresa".
        </p>
      )}
    </div>
  );
}
