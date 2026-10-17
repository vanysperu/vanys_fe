import { useState } from 'react';

import { cn } from '@/lib/utils';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

// Para textos largos (notas, descripciones de gastos/compras que pueden
// tener hasta 500 caracteres) — se corta a un tamaño legible con "ver más"
// en vez de mostrar el párrafo completo de una sola vez, que se veía mal y
// dominaba toda la tarjeta.
export function ExpandableText({ text, maxLength = 140, className }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > maxLength;

  if (!isLong) {
    return <p className={cn('text-sm whitespace-pre-wrap', className)}>{text}</p>;
  }

  return (
    <p className={cn('text-sm whitespace-pre-wrap', className)}>
      {expanded ? text : `${text.slice(0, maxLength).trimEnd()}…`}{' '}
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="text-xs font-medium text-primary hover:underline"
      >
        {expanded ? 'ver menos' : 'ver más'}
      </button>
    </p>
  );
}
