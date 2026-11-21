import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { downloadBlob } from '@/lib/downloadBlob';
import { Button } from '@/presentation/components/shared/ui/button';

interface ExportExcelButtonProps {
  // Pide el archivo al backend (con los mismos filtros que la pantalla).
  onExport: () => Promise<Blob>;
  fileName: string;
  label?: string;
  size?: 'sm' | 'default';
}

// "Exportar Excel" de cualquier listado (pedido del usuario, 21-nov). El
// backend arma el archivo con los mismos filtros y alcance de la pantalla;
// este botón solo lo pide y lo descarga. Genérico: no conoce ningún módulo.
export function ExportExcelButton({ onExport, fileName, label = 'Exportar Excel', size = 'default' }: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = async () => {
    setIsExporting(true);
    try {
      downloadBlob(await onExport(), fileName);
    } catch (error) {
      toast.error((error as ApiClientError).message ?? 'No se pudo generar el Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button type="button" variant="outline" size={size} onClick={() => void handleClick()} disabled={isExporting}>
      {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
      {isExporting ? 'Generando...' : label}
    </Button>
  );
}
