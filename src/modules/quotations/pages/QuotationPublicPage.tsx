import { CircleAlert, FileDown } from 'lucide-react';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { publicQuotationPdfUrl } from '@/modules/quotations/api/share.api';
import { usePublicQuotation } from '@/modules/quotations/hooks/useQuotationShare';
import { Button } from '@/presentation/components/shared/ui/button';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

// Que la cotización de un cliente no aparezca en buscadores ni filtre la URL.
function usePrivatePageMeta() {
  useEffect(() => {
    const metas = [
      Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' }),
      Object.assign(document.createElement('meta'), { name: 'referrer', content: 'no-referrer' }),
    ];
    metas.forEach((meta) => document.head.appendChild(meta));
    return () => metas.forEach((meta) => meta.remove());
  }, []);
}

function Unavailable() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <div className="max-w-sm space-y-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <CircleAlert className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">Esta cotización ya no está disponible</h1>
        <p className="text-sm text-muted-foreground">Comunícate con la empresa que te la envió.</p>
      </div>
    </div>
  );
}

// Enlace de la cotización para el cliente, sin iniciar sesión (Sprint 2, ítem 7).
// Desde el 21-nov abre el PDF MISMO, igual al botón "Ver PDF" del sistema
// (pedido del usuario: "ese link lo que abre es el pdf mismo, no una
// cotización con formato diferente"). Primero se pide la vista JSON: valida
// que el enlace siga encendido y registra "La abrió el cliente"; después se
// reemplaza la página por el PDF (el visor del navegador o del celular).
// Los enlaces ya enviados siguen funcionando: la URL /c/<código> no cambia.
export function QuotationPublicPage() {
  const { code = '' } = useParams<{ code: string }>();
  const { data: view, isLoading, isError } = usePublicQuotation(code);
  usePrivatePageMeta();
  const pdfUrl = publicQuotationPdfUrl(code);

  useEffect(() => {
    if (!view) return;
    document.title = `Cotización ${view.code}`;
    // replace: el botón "atrás" no vuelve a esta página intermedia.
    window.location.replace(pdfUrl);
  }, [view, pdfUrl]);

  if (isError) return <Unavailable />;
  if (isLoading || !view) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Skeleton className="h-40 w-full max-w-sm" />
      </div>
    );
  }
  // Mientras el navegador abre el PDF; si algo lo bloquea, queda el botón.
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <div className="max-w-sm space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Cotización {view.code}</h1>
        <p className="text-sm text-muted-foreground">Abriendo el PDF de la cotización…</p>
        <Button asChild>
          <a href={pdfUrl}>
            <FileDown className="size-4" />
            Abrir el PDF
          </a>
        </Button>
      </div>
    </div>
  );
}
