import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Lock, LogIn, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { login } from '@/modules/auth/api/auth.api';
import { AuthBrandLayout } from '@/modules/auth/components/AuthBrandLayout';
import {
  AUTH_ALERT_CLASS,
  AUTH_FIELD_ERROR_CLASS,
  AUTH_FIELD_INPUT_CLASS,
  AUTH_LINK_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from '@/modules/auth/components/authStyles';
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
// reescribiendo credenciales en cada prueba manual. Nunca se incluye en el
// build de producción (Vite elimina en build todo lo que solo depende de
// import.meta.env.DEV). Cuentas que siembran `npm run db:seed-qa` y
// `npm run db:reset-factory` (grulla_be/scripts).
const DEV_QUICK_LOGIN_USERS = [
  { email: 'admin.qa@acme.test', label: 'Administrador — Acme Corp QA' },
  { email: 'gestor.qa@acme.test', label: 'Gestor — Acme Corp QA' },
  { email: 'qa.superadmin@grulla.test', label: 'Super Administrador (QA)' },
  { email: 'admin@acme.test', label: 'Super Administrador (fábrica)' },
] as const;
const DEV_QUICK_LOGIN_PASSWORD = 'Test1234';

// Login con la marca Vanys (AuthBrandLayout). Sin el póster a la izquierda (se
// quitó a pedido del usuario).
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
    <AuthBrandLayout title="Bienvenido de vuelta" subtitle="Ingresa tus credenciales para continuar">
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
              className={AUTH_FIELD_INPUT_CLASS}
              {...register('email')}
            />
          </div>
          {errors.email && <p className={AUTH_FIELD_ERROR_CLASS}>{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-white">
              Contraseña
            </Label>
            {/* Pedido explícito del usuario (Sprint 2): recuperar con un enlace al correo. */}
            <Link to="/recuperar-contrasena" className={AUTH_LINK_CLASS}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Lock aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={AUTH_FIELD_INPUT_CLASS}
              {...register('password')}
            />
          </div>
          {errors.password && <p className={AUTH_FIELD_ERROR_CLASS}>{errors.password.message}</p>}
        </div>

        {apiError && (
          <motion.p role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={AUTH_ALERT_CLASS}>
            {apiError.message}
          </motion.p>
        )}

        <Button type="submit" className={AUTH_PRIMARY_BUTTON_CLASS} disabled={isPending}>
          <LogIn className="size-4" />
          {isPending ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>
    </AuthBrandLayout>
  );
}
