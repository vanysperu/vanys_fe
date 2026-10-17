import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { login } from '@/modules/auth/api/auth.api';
import { useAuthStore } from '@/modules/auth/hooks/useAuthStore';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import type { ApiClientError } from '@/config/api.types';
import grullaLoginImage from '@/assets/branding/grulla-login.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Acceso rápido SOLO para desarrollo (import.meta.env.DEV) — para no estar
// reescribiendo credenciales en cada prueba manual mientras no hay un flujo
// real de invitación/registro. Nunca se incluye en el build de producción
// (Vite elimina en build todo lo que solo depende de import.meta.env.DEV).
const DEV_QUICK_LOGIN_USERS = [
  { email: 'jharol@gmail.com', label: 'Jharol — Super Administrador' },
  { email: 'admin@acme.test', label: 'Admin — Acme Corp' },
  { email: 'admin.arequipa@acme.test', label: 'Admin — Acme Corp (Arequipa)' },
  { email: 'admin@globex.test', label: 'Admin — Globex Corp' },
] as const;
const DEV_QUICK_LOGIN_PASSWORD = 'Test1234';

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
    <div className="flex h-svh w-full overflow-hidden bg-[oklch(0.98_0.005_240)]">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="hidden w-1/2 shrink-0 md:block"
      >
        <img
          src={grullaLoginImage}
          alt="Grulla — Gestionas tus tiendas, sin complicaciones"
          className="h-full w-full object-cover"
        />
      </motion.div>

      <div className="relative flex w-full items-center justify-center overflow-hidden bg-[oklch(0.22_0.09_255)] px-4 md:w-1/2">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-40 size-96 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute -right-40 -bottom-40 size-96 rounded-full bg-blue-600/30 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-blue-500/30">
              <LogIn className="size-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white">Bienvenido de vuelta</h1>
            <p className="text-sm text-white/50">Ingresa tus credenciales para continuar</p>
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
              <div className="flex items-center gap-2 text-xs text-white/30">
                <div className="h-px flex-1 bg-white/10" />
                o con tus credenciales
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit((values) => mutate(values))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/70">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/70">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                {...register('password')}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            {apiError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {apiError.message}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-blue-500/25 hover:from-sky-500 hover:to-blue-700"
              disabled={isPending}
            >
              <LogIn className="size-4" />
              {isPending ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
