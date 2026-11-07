import { z } from 'zod';
import { es } from 'zod/locales';

// Red de seguridad para todos los formularios: un campo sin mensaje propio ya
// no muestra el texto técnico de Zod en inglés ("Invalid input: expected
// number, received NaN", reporte de QA). Un mensaje definido en el schema
// siempre tiene prioridad sobre estos.
z.config({
  ...es(),
  // Faltó el dato o no tiene el tipo esperado: al usuario solo le sirve saber
  // que tiene que completarlo.
  customError: (issue) => (issue.code === 'invalid_type' ? 'Este campo es obligatorio' : undefined),
});
