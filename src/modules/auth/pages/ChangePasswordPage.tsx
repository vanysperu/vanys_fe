import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Check } from 'lucide-react';

import { changeMyPassword } from '@/modules/auth/api/me.api';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// El backend bloquea cualquier otro endpoint mientras el usuario tenga una
// contraseña temporal pendiente (grulla_be: require-password-changed.ts) —
// esta pantalla vive fuera del guard de accesos, solo requiere sesión.
export function ChangePasswordPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const { mutate, isPending, error } = useMutation({
    mutationFn: changeMyPassword,
    onSuccess: () => navigate('/', { replace: true }),
  });

  const apiError = error as ApiClientError | null;

  return (
    <div className="flex h-svh items-center justify-center bg-muted/30">
      <form
        onSubmit={handleSubmit((values) => mutate(values))}
        className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold">Actualiza tu contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Tu contraseña actual es temporal, debes cambiarla para continuar
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="oldPassword">Contraseña actual</Label>
          <Input id="oldPassword" type="password" {...register('oldPassword')} />
          {errors.oldPassword && (
            <p className="text-sm text-destructive">{errors.oldPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">Nueva contraseña</Label>
          <Input id="newPassword" type="password" {...register('newPassword')} />
          {errors.newPassword && (
            <p className="text-sm text-destructive">{errors.newPassword.message}</p>
          )}
        </div>

        {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

        <Button type="submit" className="w-full" disabled={isPending}>
          <Check className="size-4" />
          {isPending ? 'Guardando...' : 'Cambiar contraseña'}
        </Button>
      </form>
    </div>
  );
}
