import { CircleAlert, FileDown, MessageCircle } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';

import { formatDate } from '@/lib/dateUtils';
import { formatSoles } from '@/lib/money';
import { buildAssetUrl } from '@/lib/utils';
import { buildWhatsAppLink, toWhatsAppPhone } from '@/lib/whatsapp';
import { publicQuotationPdfUrl } from '@/modules/quotations/api/share.api';
import { PublicQuotationItems } from '@/modules/quotations/components/public/PublicQuotationItems';
import { usePublicQuotation } from '@/modules/quotations/hooks/useQuotationShare';
import type { PublicQuotationView } from '@/modules/quotations/types/share.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

// Estados en los que la cotización ya no está vigente: se avisa arriba.
const CLOSED_NOTICE: Record<string, string> = {
  expired: 'Esta cotización venció. Escríbenos si quieres una actualización.',
  rejected: 'Esta cotización fue rechazada.',
  cancelled: 'Esta cotización fue cancelada.',
};

// Que la cotización de un cliente no aparezca en buscadores ni filtre la URL.
function usePrivatePageMeta(title: string | null) {
  useEffect(() => {
    const metas = [
      Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' }),
      Object.assign(document.createElement('meta'), { name: 'referrer', content: 'no-referrer' }),
    ];
    metas.forEach((meta) => document.head.appendChild(meta));
    return () => metas.forEach((meta) => meta.remove());
  }, []);
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      {title && <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>}
      {children}
    </section>
  );
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

function QuotationContent({ code, view }: { code: string; view: PublicQuotationView }) {
  const { company } = view;
  const logo = buildAssetUrl(company.logoUrl);
  const companyPhone = toWhatsAppPhone(company.phone);
  const closedNotice = CLOSED_NOTICE[view.status];

  return (
    <div className="min-h-svh bg-muted/30">
      <header style={{ backgroundColor: company.brandColor }} className="text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-5">
          {logo && <img src={logo} alt="" className="size-14 shrink-0 rounded-lg bg-white object-contain p-1" />}
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{company.name}</p>
            <p className="text-xs text-white/80">
              {[company.ruc && `RUC ${company.ruc}`, company.phone, company.email].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {closedNotice && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            {closedNotice}
          </p>
        )}

        <Section>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold">Cotización {view.code}</h1>
              <p className="text-sm text-muted-foreground">
                Emitida el {formatDate(view.createdAt)}
                {view.validUntil && ` · Válida hasta el ${formatDate(view.validUntil)}`}
              </p>
            </div>
            <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">{view.statusLabel}</span>
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Cliente: </span>
              {view.billingName ?? view.client.name}
            </p>
            {(view.billingDocumentNumber ?? view.client.documentNumber) && (
              <p>
                <span className="text-muted-foreground">Documento: </span>
                {view.billingDocumentNumber ?? view.client.documentNumber}
              </p>
            )}
            {view.productionDays && (
              <p>
                <span className="text-muted-foreground">Producción: </span>
                {view.productionDays} días
              </p>
            )}
            {view.store?.address && (
              <p>
                <span className="text-muted-foreground">Tienda: </span>
                {view.store.address}
              </p>
            )}
          </div>
        </Section>

        <Section title="Productos">
          <PublicQuotationItems items={view.items} includesIgv={view.includesIgv} />
          <dl className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatSoles(view.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">IGV</dt>
              <dd className="tabular-nums">{view.includesIgv ? formatSoles(view.igv) : 'No incluido'}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums" style={{ color: company.brandColor }}>
                {formatSoles(view.total)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            {[view.includesDelivery ? 'Incluye delivery' : 'No incluye delivery', view.includesDesign ? 'incluye diseño' : 'no incluye diseño'].join(' · ')}
          </p>
        </Section>

        {view.notes && (
          <Section title="Notas">
            <p className="text-sm whitespace-pre-line">{view.notes}</p>
          </Section>
        )}

        {view.paymentAccounts.length > 0 && (
          <Section title="Métodos de pago">
            <ul className="grid gap-3 sm:grid-cols-2">
              {view.paymentAccounts.map((account) => {
                const qr = buildAssetUrl(account.qrUrl);
                return (
                  <li key={account.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {qr && <img src={qr} alt={`QR de ${account.name}`} className="size-20 shrink-0 rounded bg-white object-contain" />}
                    <div className="min-w-0">
                      <p className="font-medium">{account.name}</p>
                      {account.number && <p className="text-sm break-all text-muted-foreground">{account.number}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {company.terms.length > 0 && (
          <Section title="Términos y condiciones">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {company.terms.map((term, index) => (
                <li key={index}>{term}</li>
              ))}
            </ol>
          </Section>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {companyPhone && (
            <Button asChild variant="outline">
              <a
                href={buildWhatsAppLink({ phone: companyPhone, text: `Hola, les escribo por la cotización ${view.code}.` })}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" />
                Escribir por WhatsApp
              </a>
            </Button>
          )}
          <Button asChild style={{ backgroundColor: company.brandColor }} className="text-white hover:opacity-90">
            <a href={publicQuotationPdfUrl(code)} target="_blank" rel="noreferrer">
              <FileDown className="size-4" />
              Descargar PDF
            </a>
          </Button>
        </div>
      </main>

      <footer className="pb-8 text-center text-xs text-muted-foreground">Cotización enviada con Vanys</footer>
    </div>
  );
}

// Vista de la cotización para el cliente, sin iniciar sesión (Sprint 2, ítem 7,
// pedido explícito del usuario: "una vista para que el cliente pueda ver la
// cotización, así podremos enviarle por WhatsApp"). Muestra lo mismo que el PDF.
export function QuotationPublicPage() {
  const { code = '' } = useParams<{ code: string }>();
  const { data: view, isLoading, isError } = usePublicQuotation(code);
  usePrivatePageMeta(view ? `Cotización ${view.code} · ${view.company.name}` : null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }
  if (isError || !view) return <Unavailable />;
  return <QuotationContent code={code} view={view} />;
}
