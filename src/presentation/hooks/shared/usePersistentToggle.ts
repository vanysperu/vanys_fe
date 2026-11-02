import { useCallback, useState } from 'react';

const readFlag = (key: string, defaultOpen: boolean): boolean => {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? defaultOpen : stored === '1';
  } catch {
    return defaultOpen;
  }
};

const saveFlag = (key: string, open: boolean): void => {
  try {
    localStorage.setItem(key, open ? '1' : '0');
  } catch {
    // Sin storage (modo privado, bloqueado): solo no se recuerda.
  }
};

// Abierto/cerrado de un bloque plegable, recordado en este navegador. Es solo
// una comodidad de UI (por usuario y navegador): si el storage no está
// disponible, el bloque arranca con `defaultOpen` y funciona igual.
export function usePersistentToggle(storageKey: string, defaultOpen = false): [boolean, () => void] {
  const [open, setOpen] = useState(() => readFlag(storageKey, defaultOpen));

  const toggle = useCallback(() => {
    setOpen((current) => {
      saveFlag(storageKey, !current);
      return !current;
    });
  }, [storageKey]);

  return [open, toggle];
}
