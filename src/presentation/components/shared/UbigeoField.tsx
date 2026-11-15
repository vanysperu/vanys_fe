import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { detectUbigeo, findUbigeo, formatUbigeo, normalizeText, searchUbigeo } from '@/lib/ubigeo/ubigeo';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { useUbigeoTable } from '@/presentation/hooks/shared/useUbigeoTable';

interface UbigeoFieldProps {
  // Código de 6 dígitos, o '' si todavía no se eligió.
  value: string;
  onChange: (code: string) => void;
  // Dirección escrita del mismo punto: de ahí se detecta el distrito.
  address?: string;
  id?: string;
  ariaLabel: string;
  disabled?: boolean;
}

const SUGGESTIONS_SHOWN = 3;

// Distrito (ubigeo de SUNAT) sin buscar el código: se escribe unas letras del
// distrito y se elige, o se rellena solo desde la dirección cuando está clara.
// Ante la duda (nombre repetido en varias provincias) no rellena: ofrece las
// opciones. El valor que sale es el código de 6 dígitos de siempre.
export function UbigeoField({ value, onChange, address = '', id, ariaLabel, disabled }: UbigeoFieldProps) {
  const { data: table = [] } = useUbigeoTable();
  const [query, setQuery] = useState('');
  const [autoFilledCode, setAutoFilledCode] = useState<string | null>(null);
  // Última dirección sobre la que ya se actuó: si la persona borra el distrito,
  // no se vuelve a rellenar solo con la misma dirección.
  const handledAddress = useRef<string | null>(null);

  const detection = useMemo(() => detectUbigeo(table, address), [table, address]);
  const addressKey = normalizeText(address);

  useEffect(() => {
    if (value || !detection.best || handledAddress.current === addressKey) return;
    handledAddress.current = addressKey;
    setAutoFilledCode(detection.best.code);
    onChange(detection.best.code);
  }, [value, detection.best, addressKey, onChange]);

  const options = useMemo(() => {
    const entries = query.trim() ? searchUbigeo(table, query) : detection.candidates;
    return entries.map((entry) => ({ value: entry.code, label: formatUbigeo(entry), hint: entry.code }));
  }, [table, query, detection.candidates]);

  const current = findUbigeo(table, value);
  const handleChange = (code: string) => {
    handledAddress.current = addressKey;
    setAutoFilledCode(null);
    onChange(code);
  };
  const suggestions = value ? [] : detection.candidates.slice(0, SUGGESTIONS_SHOWN);

  return (
    <div className="space-y-1">
      <SearchableSelect
        id={id}
        ariaLabel={ariaLabel}
        disabled={disabled}
        options={options}
        value={value || undefined}
        onChange={handleChange}
        onClear={() => handleChange('')}
        clearLabel="Sin distrito"
        onSearchChange={setQuery}
        serverSearch
        placeholder="Distrito (escribe para buscar)"
        emptyText={query.trim() ? 'No hay un distrito con ese nombre' : 'Escribe el distrito, provincia o código'}
        selectedLabel={current ? formatUbigeo(current) : value}
      />
      {current && (
        <p className="truncate text-xs text-muted-foreground">
          {autoFilledCode === value ? (
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3" aria-hidden /> Detectado de la dirección, verifícalo · ubigeo {current.code}
            </span>
          ) : (
            <>Ubigeo {current.code}</>
          )}
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>¿Será?</span>
          {suggestions.map((entry) => (
            <button
              key={entry.code}
              type="button"
              onClick={() => handleChange(entry.code)}
              className="rounded-full border px-2 py-0.5 text-foreground transition-colors hover:bg-accent"
            >
              {formatUbigeo(entry)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
