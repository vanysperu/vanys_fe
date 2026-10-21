export interface ChartTooltipRow {
  label: string;
  value: string;
  // Color de la serie (clave de línea al lado del texto). Sin color = dato
  // complementario (ej. "Cotizaciones: 3").
  color?: string;
}

// Contenido del tooltip de las gráficas: el VALOR manda (fuerte, alineado a
// la derecha) y el nombre de la serie acompaña, con una clave de línea corta
// en vez de un cuadrado. Los textos se renderizan como texto de React
// (nunca HTML crudo), aunque vengan de datos cargados por usuarios.
export function ChartTooltipPanel({ title, rows }: { title: string; rows: ChartTooltipRow[] }) {
  return (
    <div className="grid min-w-44 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <p className="font-medium text-muted-foreground">{title}</p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {row.color && (
              <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            )}
            {row.label}
          </span>
          <span className="font-semibold text-foreground tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
