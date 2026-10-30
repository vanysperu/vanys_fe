import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Lock, LogIn, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import vanysIcon from '@/assets/branding/vanys-icon.webp';
import { login } from '@/modules/auth/api/auth.api';
import { useAuthStore } from '@/modules/auth/hooks/useAuthStore';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import type { ApiClientError } from '@/config/api.types';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Acceso rápido SOLO para desarrollo (import.meta.env.DEV) — para no estar
// reescribiendo credenciales en cada prueba manual mientras no hay un flujo
// real de invitación/registro. Nunca se incluye en el build de producción
// (Vite elimina en build todo lo que solo depende de import.meta.env.DEV).
// Cuentas que siembran `npm run db:seed-qa` y `npm run db:reset-factory`
// (grulla_be/scripts).
const DEV_QUICK_LOGIN_USERS = [
  { email: 'admin.qa@acme.test', label: 'Administrador — Acme Corp QA' },
  { email: 'gestor.qa@acme.test', label: 'Gestor — Acme Corp QA' },
  { email: 'qa.superadmin@grulla.test', label: 'Super Administrador (QA)' },
  { email: 'admin@acme.test', label: 'Super Administrador (fábrica)' },
] as const;
const DEV_QUICK_LOGIN_PASSWORD = 'Test1234';

// Campo con ícono a la izquierda (como el diseño de marca): el input claro
// resalta sobre el fondo azul marino.
// !bg-white/!text-brand-navy (con important): el input compartido
// (ui/input.tsx) trae `dark:bg-input/30` para el modo oscuro del resto de
// la app, pero el login SIEMPRE es la tarjeta blanca sobre el fondo marca
// (nunca debe seguir el tema claro/oscuro) — sin el important, en modo
// oscuro esa clase le ganaba a `bg-white` y el texto (navy) quedaba casi
// invisible sobre un fondo oscuro (bug reportado por QA, seguía
// reproduciéndose).
const FIELD_INPUT_CLASS =
  'h-11 border-0 !bg-white pl-10 !text-brand-navy shadow-sm placeholder:text-slate-400 focus-visible:ring-brand-orange/60';

// Login con la marca Vanys: el formulario centrado sobre azul marino con la
// franja naranja, igual que el diseño de referencia y en todos los tamaños de
// pantalla. Sin el póster a la izquierda (se quitó a pedido del usuario).
export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const { mutate, isPending, error } = useMutation({
    mutationFn: login,
    onSuccess: ({ Jwt, MustChangePassword, FullName, Email }) => {
      toast.success(`Bienvenido, ${FullName.trim()}`);
      setUser({ fullName: FullName.trim(), email: Email });
      // Todo lo cacheado (accesos, clientes, cotizaciones, etc.) pertenece
      // a la sesión anterior — si no se limpia, un login rápido (ej. el
      // selector de dev) puede servir por unos segundos datos/permisos de
      // OTRO usuario/empresa mientras el staleTime no vence (bug real: el
      // admin veía "Empresas" porque la respuesta de /access/me del
      // superadmin anterior seguía en caché).
      queryClient.clear();
      // navigate() actualiza la URL del history compartido antes de que
      // useAuthStore dispare el swap Public -> PrivateRoutes (app/App.tsx),
      // así PrivateRoutes ya monta directo en la ruta correcta.
      navigate(MustChangePassword ? '/change-password' : '/', { replace: true });
      setToken(Jwt);
    },
  });

  const apiError = error as ApiClientError | null;

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-gradient-to-b from-brand-navy-light via-brand-navy to-brand-navy-deep px-4 py-10">
      {/* Fondo de marca: planos diagonales suaves y la franja naranja en la
          esquina inferior derecha. Solo decoración. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/3 -left-1/2 h-[120%] w-full rotate-[28deg] bg-white/[0.035]" />
        <div className="absolute top-1/3 -right-1/2 h-[90%] w-full rotate-[28deg] bg-black/[0.12]" />
        <div className="absolute -right-24 -bottom-10 h-16 w-[26rem] -rotate-[32deg] bg-white/10" />
        <div className="absolute -right-28 -bottom-24 h-20 w-[26rem] -rotate-[32deg] bg-gradient-to-r from-brand-orange-deep to-brand-orange" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-brand-panel/80 p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="space-y-2 text-center">
          <img
            src={vanysIcon}
            alt=""
            className="mx-auto size-16 rounded-2xl bg-white object-cover shadow-lg shadow-black/30 ring-1 ring-white/20"
          />
          <h1 className="pt-2 text-2xl font-semibold text-white">Bienvenido de vuelta</h1>
          <p className="text-sm text-white/60">Ingresa tus credenciales para continuar</p>
        </div>

        {import.meta.env.DEV && (
          <div className="space-y-1.5">
            <Label className="text-white/70">Acceso rápido (solo desarrollo)</Label>
            <Select
              onValueChange={(email) => {
                setValue('email', email);
                setValue('password', DEV_QUICK_LOGIN_PASSWORD);
                mutate({ email, password: DEV_QUICK_LOGIN_PASSWORD });
              }}
            >
              <SelectTrigger className="border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Selecciona un usuario de prueba" />
              </SelectTrigger>
              <SelectContent>
                {DEV_QUICK_LOGIN_USERS.map((user) => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <div className="h-px flex-1 bg-white/10" />
              o con tus credenciales
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit((values) => mutate(values))} className="space-y-4">
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
                className={FIELD_INPUT_CLASS}
                {...register('email')}
              />
            </div>
            {/* Rojo claro: el rojo normal casi no se lee sobre el azul marino. */}
            {errors.email && <p className="text-sm text-red-300">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white">
              Contraseña
            </Label>
            <div className="relative">
              <Lock aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={FIELD_INPUT_CLASS}
                {...register('password')}
              />
            </div>
            {errors.password && <p className="text-sm text-red-300">{errors.password.message}</p>}
          </div>

          {apiError && (
            <motion.p
              role="alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm text-red-200"
            >
              {apiError.message}
            </motion.p>
          )}

          <Button
            type="submit"
            className="h-11 w-full bg-gradient-to-r from-brand-orange to-brand-orange-deep text-base font-semibold text-white shadow-lg shadow-brand-orange/30 hover:from-brand-orange-deep hover:to-brand-orange-deep"
            disabled={isPending}
          >
            <LogIn className="size-4" />
            {isPending ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
