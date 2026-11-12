// Clases compartidas de las pantallas sin sesión (AuthBrandLayout).
//
// Campo con ícono a la izquierda: el input claro resalta sobre el fondo azul
// marino. !bg-white/!text-brand-navy (con important): el input compartido
// (ui/input.tsx) trae `dark:bg-input/30` para el modo oscuro del resto de la
// app, pero estas pantallas SIEMPRE son la tarjeta sobre el fondo de marca
// (nunca siguen el tema claro/oscuro); sin el important, en modo oscuro esa
// clase le ganaba a `bg-white` y el texto quedaba casi invisible (bug de QA).
export const AUTH_FIELD_INPUT_CLASS =
  'h-11 border-0 !bg-white pl-10 !text-brand-navy shadow-sm placeholder:text-slate-400 focus-visible:ring-brand-orange/60';

export const AUTH_PRIMARY_BUTTON_CLASS =
  'h-11 w-full bg-gradient-to-r from-brand-orange to-brand-orange-deep text-base font-semibold text-white shadow-lg shadow-brand-orange/30 hover:from-brand-orange-deep hover:to-brand-orange-deep';

// Rojo claro: el rojo normal casi no se lee sobre el azul marino.
export const AUTH_FIELD_ERROR_CLASS = 'text-sm text-red-300';

export const AUTH_ALERT_CLASS = 'rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm text-red-200';

export const AUTH_NOTICE_CLASS = 'rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/85';

export const AUTH_LINK_CLASS = 'text-sm font-medium text-brand-orange hover:underline';
