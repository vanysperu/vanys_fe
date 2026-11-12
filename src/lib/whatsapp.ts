// Enlaces de WhatsApp gratis (wa.me), sin la API de Meta: abren WhatsApp con
// el mensaje ya escrito y la persona solo presiona Enviar (plan del Sprint 2,
// sección 5b.3). Se usa para mandar enlaces de contraseña y cotizaciones.

const PERU_COUNTRY_CODE = '51';

/**
 * Número en formato internacional, solo dígitos (lo que pide wa.me). Un celular
 * peruano de 9 dígitos que empieza con 9 recibe el 51 delante; uno que ya trae
 * código de país se respeta. Vacío o inválido → null.
 */
export function toWhatsAppPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `${PERU_COUNTRY_CODE}${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

/** wa.me con el número (si hay) y el texto. Sin número, WhatsApp deja elegir el chat. */
export function buildWhatsAppLink({ phone, text }: { phone?: string | null; text: string }): string {
  const target = toWhatsAppPhone(phone);
  const query = `text=${encodeURIComponent(text)}`;
  return target ? `https://wa.me/${target}?${query}` : `https://wa.me/?${query}`;
}
