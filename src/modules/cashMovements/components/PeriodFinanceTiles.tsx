import { ArrowDownToLine, ArrowUpFromLine, Calculator, Info, Landmark, PiggyBank, Scale, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { TONE_BAR, TONE_CHIP, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { exportIgvBreakdown } from '@/modules/cashMovements/api/cashMovements.api';
import { IgvBreakdownDialog } from '@/modules/cashMovements/components/IgvBreakdownDialog';
import type { MonthSummaryParams, PeriodFinance } from '@/modules/cashMovements/types/cashMovement.types';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { ExportExcelButton } from '@/presentation/components/shared/ExportExcelButton';
import { Button } from '@/presentation/components/shared/ui/button';

const money = (amount: number) =>
  'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface TileProps {
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'negative' | 'strong';
  // Color e ícono de la tarjeta (27-nov, "colores vivos").
  color: Tone;
  icon: LucideIcon;
  testId: string;
  action?: ReactNode;
}

function Tile({ label, value, hint, tone = 'default', color, icon: Icon, testId, action }: TileProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-3 shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-['']",
        TONE_BAR[color],
        tone === 'strong' && 'border-primary/40 bg-primary/5',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <span aria-hidden className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', TONE_CHIP[color])}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className={cn('font-mono-nums text-lg font-semibold', tone === 'negative' && 'text-destructive')} data-testid={testId}>
        {money(value)}
      </p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}

interface PeriodFinanceTilesProps {
  finance: PeriodFinance;
  // Columnas en pantallas anchas: 5 en Caja (ancho completo), menos en el
  // panel de detalle de Cierres.
  wideColumns?: 3 | 5;
  // Con esto, el recuadro del IGV ofrece "Ver cómo se calculó" (21-nov).
  // Solo Caja lo pasa: su alcance (empresa y tienda) es el mismo del detalle.
  breakdownParams?: MonthSummaryParams;
}

// Resultado de un mes (ingresos − egresos), IGV estimado para SUNAT y lo que
// queda después del IGV. Lo usan Caja (resumen del mes) y el detalle de cada
// cierre, con el mismo cálculo del backend (period_finance.ts).
export function PeriodFinanceTiles({ finance, wideColumns = 5, breakdownParams }: PeriodFinanceTilesProps) {
  const canSeeBreakdown = usePermissionButton('cash_movement.igvBreakdown.button');
  const canExportBreakdown = usePermissionButton('cash_movement.igvBreakdown.export.button');
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const showBreakdown = Boolean(breakdownParams) && canSeeBreakdown;
  const igvHint = `IGV de cobros ${money(finance.igv_sales)} − IGV de compras con factura ${money(finance.igv_purchases)}`;
  const igvInFavor = finance.igv_balance < 0;

  return (
    <div className="space-y-2">
      <div className={cn('stagger-children grid grid-cols-2 gap-2', wideColumns === 5 ? 'md:grid-cols-5' : 'md:grid-cols-3')}>
        <Tile label="Ingresos" value={finance.income} color="green" icon={ArrowDownToLine} testId="month-income" />
        <Tile label="Egresos" value={finance.expenses} color="red" icon={ArrowUpFromLine} testId="month-expenses" />
        <Tile
          label="Resultado (ingresos − egresos)"
          color="blue"
          icon={Scale}
          value={finance.result}
          hint={finance.adjustments !== 0 ? `Incluye ajustes de meses cerrados por ${money(finance.adjustments)}` : undefined}
          tone={finance.result < 0 ? 'negative' : 'default'}
          testId="month-result"
        />
        <Tile
          label={igvInFavor ? 'IGV: saldo a favor' : 'IGV a pagar a SUNAT (estimado)'}
          value={igvInFavor ? -finance.igv_balance : finance.igv_payable}
          color="amber"
          icon={Landmark}
          hint={igvHint}
          testId="month-igv"
          action={
            showBreakdown && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1 h-auto gap-1 p-0 text-xs"
                onClick={() => setBreakdownOpen(true)}
              >
                <Calculator className="size-3.5" />
                Ver cómo se calculó
              </Button>
            )
          }
        />
        <Tile
          label="Neto después del IGV"
          value={finance.net_after_igv}
          color="purple"
          icon={PiggyBank}
          tone={finance.net_after_igv < 0 ? 'negative' : 'strong'}
          testId="month-net"
        />
      </div>
      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-px size-3 shrink-0" />
        El IGV es una estimación con lo cobrado y lo comprado con factura en el mes. El monto oficial lo calcula tu contador con los
        comprobantes.
      </p>
      {breakdownParams && showBreakdown && (
        <IgvBreakdownDialog
          params={breakdownParams}
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          actions={
            canExportBreakdown && (
              <ExportExcelButton
                size="sm"
                onExport={() => exportIgvBreakdown(breakdownParams)}
                fileName={`igv-${breakdownParams.period}.xlsx`}
              />
            )
          }
        />
      )}
    </div>
  );
}
