// Mismas reglas que valida el backend al subir un logo o QR
// (grulla_be/src/middlewares/upload-image.ts): si cambian allá, cambiar acá.
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_MB = 2;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

// Valor del atributo `accept` de los <input type="file"> de imágenes.
export const IMAGE_INPUT_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',');

// Texto de ayuda junto a cada selector de imagen.
export const IMAGE_UPLOAD_HINT = `PNG, JPG o WEBP · máx. ${MAX_IMAGE_SIZE_MB} MB`;

const isAcceptedImageType = (type: string): boolean => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);

// Se valida antes de subir para avisar al instante (el backend igual
// revalida). Devuelve el mensaje de error, o null si la imagen sirve.
export function validateImageFile(file: File): string | null {
  if (!isAcceptedImageType(file.type)) return 'Solo se permiten imágenes PNG, JPG o WEBP';
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB, el máximo es ${MAX_IMAGE_SIZE_MB} MB`;
  }
  return null;
}
