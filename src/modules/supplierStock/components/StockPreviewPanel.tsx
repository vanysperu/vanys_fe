import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import type { StockPreview } from '@/modules/supplierStock/types/supplierStock.types';
import { Badge } from '@/presentation/components/shared/ui/badge';

const numberFormatter = new Intl.NumberFormat('es-PE');

// 0 -> "A", 25 -> "Z", 26 -> "AA" (la letra de columna de Excel).
const columnLetter = (index: number): string =>
  index < 26 ? String.fromCharCode(65 + index) : columnLetter(Math.floor(index / 26) - 1) + String.fromCharCode(65 + (index % 26));

// Resultado de "Probar fuente": hojas, encabezado y cómo se leyeron las
// primeras filas con el mapeo actual. Al tocar una hoja se elige esa.
export function StockPreviewPanel({ preview, onPickSheet }: { preview: StockPreview; onPickSheet: (sheet: string) => void }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-sm" data-testid="stock-preview">
      {preview.sheets.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Hojas:</span>
          {preview.sheets.map((sheet) => (
            <button
              key={sheet}
              type="button"
              onClick={() => onPickSheet(sheet)}
              className="rounded-md border bg-card px-2 py-0.5 text-xs hover:bg-muted data-[active=true]:border-primary data-[active=true]:text-primary"
              data-active={sheet === preview.sheetName}
            >
              {sheet}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Columnas del encabezado (hoja "{preview.sheetName}", {numberFormatter.format(preview.totalRows)} filas debajo):
        </p>
        <div className="flex flex-wrap gap-1">
          {preview.headers.filter(Boolean).length === 0 && <span className="text-xs text-warning">La fila elegida está vacía</span>}
          {preview.headers.map((header, index) =>
            header ? (
              <Badge key={`${header}-${index}`} variant="muted">
                {columnLetter(index)}: {header}
              </Badge>
            ) : null,
          )}
        </div>
      </div>

      {preview.mappingError ? (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="size-3.5" aria-hidden />
          {preview.mappingError}
        </p>
      ) : (
        preview.parsedCount > 0 && (
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-[var(--success)]">
              <CheckCircle2 className="size-3.5" aria-hidden />
              {numberFormatter.format(preview.parsedCount)} filas con código. Así se leen las primeras:
            </p>
            <div className="max-h-56 overflow-auto rounded-md border bg-card">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60 text-left">
                  <tr>
                    <th className="px-2 py-1 font-medium">Código</th>
                    <th className="px-2 py-1 font-medium">Color</th>
                    <th className="px-2 py-1 font-medium">Descripción</th>
                    <th className="px-2 py-1 text-right font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.parsed.map((row, index) => (
                    <tr key={`${row.codeNorm}-${index}`} className="border-t">
                      <td className="px-2 py-1 font-mono">{row.codeRaw}</td>
                      <td className="px-2 py-1">{row.color ?? '—'}</td>
                      <td className="max-w-48 truncate px-2 py-1">{row.description ?? '—'}</td>
                      <td className="px-2 py-1 text-right font-mono-nums">
                        {row.quantity === null ? <span className="text-warning">{row.quantityText ?? '—'}</span> : numberFormatter.format(row.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
