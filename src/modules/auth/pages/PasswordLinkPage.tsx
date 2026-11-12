import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, KeyRound, Lock, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { AuthBrandLayout } from '@/modules/auth/components/AuthBrandLayout';
import { PasswordStrengthMeter } from '@/modules/auth/components/PasswordStrengthMeter';
import {
  AUTH_ALERT_CLASS,
  AUTH_FIELD_ERROR_CLASS,
  AUTH_FIELD_INPUT_CLASS,
  AUTH_LINK_CLASS,
  AUTH_NOTICE_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from '@/modules/auth/components/authStyles';
import type { PasswordLinkPurpose, PasswordLinkState } from '@/modules/auth/api/password.api';
import { useAuthStore } from '@/modules/auth/hooks/useAuthStore';
import { useCompletePasswordLink, usePasswordLinkCheck } from '@/modules/auth/hooks/usePasswordLinks';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import type { ApiClientError } from '@/config/api.types';

// Misma política que el backend (grulla_be: core/validators/password.policy.ts):
// 8 a 128 caracteres. Las contraseñas demasiado comunes las rechaza el backend
// con su propio mensaje.
const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(128, 'La contraseña debe tener como máximo 128 caracteres'),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmation'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const COPY: Record<PasswordLinkPurpose, { title: string; button: string }> = {
  invite: { title: 'Crea tu contraseña', button: 'Crear mi contraseña' },
  reset: { title: 'Elige una nueva contraseña', button: 'Guardar contraseña' },
};

const UNUSABLE_MESSAGE: Record<Exclude<PasswordLinkState, 'valid'>, string> = {
  expired: 'Este enlace venció.',
  used: 'Este enlace ya se usó.',
  invalid: 'Este enlace no es válido.',
};

// El token llega en el fragmento (#token=...): el navegador nunca lo manda al
// servidor, así que no queda en los logs de acceso (ver grulla_be auth/README).
const readTokenFromHash = (): string => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') ?? '';

// Sin Referer en esta pantalla: la URL lleva el token (OWASP).
function useNoReferrer() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

interface PasswordLinkPageProps {
  // Qué pantalla es (la ruta): /activar-cuenta = invite, /restablecer-contrasena = reset.
  purpose: PasswordLinkPurpose;
}

// Pantalla del enlace del correo (Sprint 2, pedido explícito del usuario:
// "quiero que llegue link para crear contraseña o link para recuperarla").
// Primero pregunta si el enlace sirve; si sirve, pide la contraseña dos veces.
// Al terminar NO inicia sesión: la persona entra con su correo y la nueva.
export function PasswordLinkPage({ purpose }: PasswordLinkPageProps) {
  useNoReferrer();
  const [token] = useState(readTokenFromHash);
  const queryClient = useQueryClient();
  const clearToken = useAuthStore((state) => state.clearToken);
  const { data: link, isLoading, error: checkError } = usePasswordLinkCheck(token);
  const { mutate, isPending, isSuccess, data: successMessage, error } = useCompletePasswordLink();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const copy = COPY[link?.purpose ?? purpose];
  const apiError = (error ?? checkError) as ApiClientError | null;
  const linkState: PasswordLinkState = token ? (link?.state ?? 'invalid') : 'invalid';

  if (isSuccess) {
    return (
      <AuthBrandLayout title="¡Listo!" subtitle={successMessage}>
        <div className="flex justify-center">
          <CheckCircle2 className="size-12 text-emerald-400" aria-hidden />
        </div>
        <Button asChild className={AUTH_PRIMARY_BUTTON_CLASS}>
          <Link to="/login">
            <LogIn className="size-4" />
            Ir a iniciar sesión
          </Link>
        </Button>
      </AuthBrandLayout>
    );
  }

  if (token && isLoading) {
    return (
      <AuthBrandLayout title={copy.title}>
        <Skeleton className="h-11 w-full bg-white/10" />
        <Skeleton className="h-11 w-full bg-white/10" />
      </AuthBrandLayout>
    );
  }

  if (linkState !== 'valid') {
    return (
      <AuthBrandLayout title={copy.title}>
        <p role="alert" className={AUTH_ALERT_CLASS}>
          {UNUSABLE_MESSAGE[linkState]}{' '}
          {purpose === 'reset'
            ? 'Pide uno nuevo y usa el último que te llegue.'
            : 'Pide a tu administrador que te reenvíe la invitación.'}
        </p>
        {purpose === 'reset' ? (
          <Link to="/recuperar-contrasena" className={AUTH_LINK_CLASS}>
            Pedir un enlace nuevo
          </Link>
        ) : (
          <Link to="/login" className={AUTH_LINK_CLASS}>
            Ir a iniciar sesión
          </Link>
        )}
      </AuthBrandLayout>
    );
  }

  const password = watch('password') ?? '';

  return (
    <AuthBrandLayout title={copy.title} subtitle={link?.recipientName ? `Hola, ${link.recipientName}` : undefined}>
      <form
        onSubmit={handleSubmit((values) =>
          mutate(
            { token, password: values.password },
            {
              // El backend cierra todas las sesiones al cambiar la contraseña:
              // si este navegador tenía una abierta, se olvida también acá.
              onSuccess: () => {
                clearToken();
                queryClient.clear();
              },
            },
          ),
        )}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white">
            Contraseña nueva
          </Label>
          <div className="relative">
            <Lock aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className={AUTH_FIELD_INPUT_CLASS}
              {...register('password')}
            />
          </div>
          <PasswordStrengthMeter password={password} />
          {errors.password && <p className={AUTH_FIELD_ERROR_CLASS}>{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmation" className="text-white">
            Repite la contraseña
          </Label>
          <div className="relative">
            <KeyRound aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              className={AUTH_FIELD_INPUT_CLASS}
              {...register('confirmation')}
            />
          </div>
          {errors.confirmation && <p className={AUTH_FIELD_ERROR_CLASS}>{errors.confirmation.message}</p>}
        </div>

        <p className={AUTH_NOTICE_CLASS}>Mínimo 8 caracteres. Mejor una frase larga que una palabra con símbolos.</p>

        {apiError && (
          <p role="alert" className={AUTH_ALERT_CLASS}>
            {apiError.message}
          </p>
        )}

        <Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={isPending}>
          {isPending ? 'Guardando...' : copy.button}
        </Button>
      </form>
    </AuthBrandLayout>
  );
}
