// Mismas reglas que valida el backend al subir un logo o QR
// (grulla_be/src/middlewares/upload-image.ts): si cambian allá, cambiar acá.
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_MB = 2;

// Valor del atributo `accept` de los <input type="file"> de imágenes.
export const IMAGE_INPUT_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',');

// Texto de ayuda junto a cada selector de imagen.
export const imageUploadHint = (maxSizeMb: number = MAX_IMAGE_SIZE_MB): string => `PNG, JPG o WEBP · máx. ${maxSizeMb} MB`;
export const IMAGE_UPLOAD_HINT = imageUploadHint();

const isAcceptedImageType = (type: string): boolean => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);

// Se valida antes de subir para avisar al instante (el backend igual
// revalida). Devuelve el mensaje de error, o null si la imagen sirve.
// `maxSizeMb` es opcional: sin él vale el máximo de siempre (2 MB); los anuncios
// de la web piden uno mayor.
export function validateImageFile(file: File, maxSizeMb: number = MAX_IMAGE_SIZE_MB): string | null {
  if (!isAcceptedImageType(file.type)) return 'Solo se permiten imágenes PNG, JPG o WEBP';
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB, el máximo es ${maxSizeMb} MB`;
  }
  return null;
}
