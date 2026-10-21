import { PERIOD_PRESET_LABEL, type PeriodPreset } from '@/lib/periodPresets';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';

export interface PeriodFilterValue {
  preset: PeriodPreset;
  // Solo se usa con preset "custom".
  customRange: DateRangeValue;
}

interface PeriodFilterProps {
  value: PeriodFilterValue;
  onChange: (value: PeriodFilterValue) => void;
  // Atajos a ofrecer (por defecto, todos).
  presets?: PeriodPreset[];
}

const ALL_PRESETS = Object.keys(PERIOD_PRESET_LABEL) as PeriodPreset[];

// Selector de periodo para tableros: lista de atajos y, si se elige "Rango
// personalizado", el calendario de rango al lado. Genérico: no sabe qué se
// filtra con él.
export function PeriodFilter({ value, onChange, presets = ALL_PRESETS }: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        aria-label="Periodo"
        hideAll
        className="w-48"
        value={value.preset}
        onChange={(preset) => onChange({ ...value, preset: (preset as PeriodPreset | undefined) ?? value.preset })}
        options={presets.map((preset) => ({ value: preset, label: PERIOD_PRESET_LABEL[preset] }))}
      />
      {value.preset === 'custom' && (
        <DateRangeFilter
          placeholder="Elige el rango"
          value={value.customRange}
          onChange={(customRange) => onChange({ ...value, customRange })}
        />
      )}
    </div>
  );
}
