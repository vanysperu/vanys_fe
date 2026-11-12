import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { AuthBrandLayout } from '@/modules/auth/components/AuthBrandLayout';
import {
  AUTH_ALERT_CLASS,
  AUTH_FIELD_ERROR_CLASS,
  AUTH_FIELD_INPUT_CLASS,
  AUTH_LINK_CLASS,
  AUTH_NOTICE_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from '@/modules/auth/components/authStyles';
import { useRequestPasswordReset } from '@/modules/auth/hooks/usePasswordLinks';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';

const forgotSchema = z.object({ email: z.string().email('Email inválido') });
type ForgotFormValues = z.infer<typeof forgotSchema>;

// "¿Olvidaste tu contraseña?" (Sprint 2, pedido explícito del usuario: "quiero
// que llegue link para recuperarla al correo"). Siempre muestra el mismo
// mensaje, exista o no el correo: así nadie averigua qué correos están
// registrados.
export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({ resolver: zodResolver(forgotSchema) });
  const { mutate, isPending, isSuccess, data: message, error } = useRequestPasswordReset();
  const apiError = error as ApiClientError | null;

  return (
    <AuthBrandLayout
      title="Recupera tu contraseña"
      subtitle="Te enviaremos un enlace a tu correo para elegir una nueva"
    >
      {isSuccess ? (
        <div className="space-y-4">
          <p role="status" className={AUTH_NOTICE_CLASS}>
            {message}
          </p>
          <p className="text-xs text-white/60">
            Revisa también la carpeta de spam. El enlace vence en 30 minutos y sirve una sola vez.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(({ email }) => mutate(email))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <div className="relative">
              <Mail aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="usuario@vanysperu.com"
                className={AUTH_FIELD_INPUT_CLASS}
                {...register('email')}
              />
            </div>
            {errors.email && <p className={AUTH_FIELD_ERROR_CLASS}>{errors.email.message}</p>}
          </div>

          {apiError && (
            <p role="alert" className={AUTH_ALERT_CLASS}>
              {apiError.message}
            </p>
          )}

          <Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={isPending}>
            <Send className="size-4" />
            {isPending ? 'Enviando...' : 'Enviarme el enlace'}
          </Button>
        </form>
      )}

      <Link to="/login" className={`${AUTH_LINK_CLASS} inline-flex items-center gap-1`}>
        <ArrowLeft className="size-4" />
        Volver a iniciar sesión
      </Link>
    </AuthBrandLayout>
  );
}
