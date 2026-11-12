import { cn } from '@/lib/utils';

// Medidor orientativo (plan del Sprint 2, sección 5.5): premia largo y variedad.
// La regla real la decide el backend (mínimo 8, máximo 128 y sin las
// contraseñas más comunes); esto solo ayuda a elegir una mejor.
const scoreOf = (password: string): number => {
  if (password.length === 0) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  const lengthScore = password.length >= 14 ? 2 : password.length >= 10 ? 1 : 0;
  return Math.min(3, Math.max(1, lengthScore + variety - 1));
};

const LEVELS = [
  { label: '', bar: 'bg-white/15' },
  { label: 'Débil', bar: 'bg-red-400' },
  { label: 'Aceptable', bar: 'bg-amber-400' },
  { label: 'Fuerte', bar: 'bg-emerald-400' },
] as const;

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = scoreOf(password);
  const level = LEVELS[score] ?? LEVELS[0];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map((step) => (
          <div key={step} className={cn('h-1 rounded-full', step <= score ? level.bar : 'bg-white/15')} />
        ))}
      </div>
      {level.label && <p className="text-xs text-white/60">Seguridad: {level.label}</p>}
    </div>
  );
}
