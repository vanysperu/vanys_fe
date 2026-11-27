// Tonos vivos de la interfaz (27-nov, "colores vivos tipo WordPress"). Los
// colores viven en index.css (--tone-*); aquí solo están las clases ya armadas,
// escritas completas para que Tailwind las encuentre al compilar.

export type Tone = 'blue' | 'green' | 'red' | 'orange' | 'amber' | 'purple' | 'pink' | 'teal';

// Ícono sobre fondo suave (títulos de pantalla, tarjetas de resumen).
export const TONE_CHIP: Record<Tone, string> = {
  blue: 'bg-tone-blue-soft text-tone-blue',
  green: 'bg-tone-green-soft text-tone-green',
  red: 'bg-tone-red-soft text-tone-red',
  orange: 'bg-tone-orange-soft text-tone-orange',
  amber: 'bg-tone-amber-soft text-tone-amber',
  purple: 'bg-tone-purple-soft text-tone-purple',
  pink: 'bg-tone-pink-soft text-tone-pink',
  teal: 'bg-tone-teal-soft text-tone-teal',
};

// Solo el color del ícono, sobre fondo claro.
export const TONE_TEXT: Record<Tone, string> = {
  blue: 'text-tone-blue',
  green: 'text-tone-green',
  red: 'text-tone-red',
  orange: 'text-tone-orange',
  amber: 'text-tone-amber',
  purple: 'text-tone-purple',
  pink: 'text-tone-pink',
  teal: 'text-tone-teal',
};

// El color del ícono sobre el menú azul marino (versión clara del tono).
export const TONE_ON_DARK: Record<Tone, string> = {
  blue: 'text-tone-blue-bright',
  green: 'text-tone-green-bright',
  red: 'text-tone-red-bright',
  orange: 'text-tone-orange-bright',
  amber: 'text-tone-amber-bright',
  purple: 'text-tone-purple-bright',
  pink: 'text-tone-pink-bright',
  teal: 'text-tone-teal-bright',
};

// Barra de color arriba de una tarjeta de resumen.
export const TONE_BAR: Record<Tone, string> = {
  blue: 'before:bg-tone-blue',
  green: 'before:bg-tone-green',
  red: 'before:bg-tone-red',
  orange: 'before:bg-tone-orange',
  amber: 'before:bg-tone-amber',
  purple: 'before:bg-tone-purple',
  pink: 'before:bg-tone-pink',
  teal: 'before:bg-tone-teal',
};
