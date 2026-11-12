import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import vanysIcon from '@/assets/branding/vanys-icon.webp';

interface AuthBrandLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

// Fondo y tarjeta de marca de las pantallas sin sesión (login, recuperar
// contraseña, activar cuenta): el formulario centrado sobre azul marino con la
// franja naranja, igual que el diseño de referencia y en todos los tamaños de
// pantalla. Extraído del login para que todas se vean igual.
export function AuthBrandLayout({ title, subtitle, children }: AuthBrandLayoutProps) {
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
          <h1 className="pt-2 text-2xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-white/60">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
