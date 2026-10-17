import { useEffect } from 'react';

import { useThemes } from '@/modules/platform/hooks/useCompanies';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

// Código de la paleta por defecto (grulla_be: seeders/20260912233650-seed-themes.js
// -> "blue"/"Azul (por defecto)"), la misma que ya define index.css como
// valor estático — cuando la empresa usa esta paleta (o no tiene ninguna
// seteada) no hace falta sobreescribir nada, se deja el CSS tal cual.
const DEFAULT_THEME_CODE = 'blue';

// "--accent"/"--accent-foreground" quedan fuera a propósito: el catálogo de
// paletas (grulla_be: seed-themes.js) solo trae UN set de colores, pensado
// para modo claro — pisarlos también en modo oscuro dejaba el hover de
// botones como el de tema (día/noche) con un cuadro claro roto/ilegible
// sobre fondo oscuro (bug reportado por el usuario: "el botón de noche y
// día falla"). "--primary"/"--ring"/"--sidebar-accent" sí quedan porque son
// siempre texto claro sobre el color sólido, se ven bien en los dos modos.
const OVERRIDE_VARS = ['--primary', '--ring', '--sidebar-accent'] as const;

// Aplica la paleta de marca de la empresa (CompaniesPage -> "Paleta de
// marca") a TODA la app: hoy `themeColor` viajaba en /access/me pero nada lo
// leía, así que elegir un color ahí no cambiaba nada visualmente (pedido
// explícito del usuario). Se resuelve con variables CSS en :root, que pisan
// los valores estáticos de index.css sin importar modo claro/oscuro.
export function useBrandTheme(): void {
  const { data: access } = useAccess();
  const { data: themes } = useThemes();

  useEffect(() => {
    const root = document.documentElement;
    const code = access?.themeColor || DEFAULT_THEME_CODE;

    if (code === DEFAULT_THEME_CODE) {
      OVERRIDE_VARS.forEach((cssVar) => root.style.removeProperty(cssVar));
      return;
    }

    const theme = themes?.find((item) => item.code === code);
    if (!theme) return;

    root.style.setProperty('--primary', theme.primary_color);
    root.style.setProperty('--ring', theme.primary_clarity_color);
    root.style.setProperty('--sidebar-accent', theme.primary_color);

    return () => {
      OVERRIDE_VARS.forEach((cssVar) => root.style.removeProperty(cssVar));
    };
  }, [access?.themeColor, themes]);
}
