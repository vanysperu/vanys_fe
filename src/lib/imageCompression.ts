// Fotos de facturas: se achican y se convierten a WEBP en el navegador antes de
// subirlas (pedido explícito del usuario: "más espacio, pero que sigan
// legibles"). 2200 px en el lado largo y calidad 0.82 dejan el texto de una
// factura nítido en ~150-400 KB, frente a 3-5 MB de la foto original.
const MAX_SIDE_PX = 2200;
const WEBP_QUALITY = 0.82;

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const loadImage = (source: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    image.src = url;
  });

// Dibuja la imagen (o un cuadro de la cámara) achicada y la devuelve en WEBP.
// Si el navegador no sabe generar WEBP (Safari antiguo), usa JPG.
export async function canvasSourceToWebp(
  source: CanvasImageSource,
  width: number,
  height: number,
  baseName: string,
): Promise<File> {
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no puede procesar la imagen');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  const webp = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
  if (webp && webp.type === 'image/webp') return new File([webp], `${baseName}.webp`, { type: 'image/webp' });
  const jpeg = await toBlob(canvas, 'image/jpeg', WEBP_QUALITY);
  if (!jpeg) throw new Error('No se pudo convertir la imagen');
  return new File([jpeg], `${baseName}.jpg`, { type: 'image/jpeg' });
}

// Una foto elegida del celular o la computadora, pasada a WEBP.
export async function imageFileToWebp(file: File): Promise<File> {
  const image = await loadImage(file);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'factura';
  return canvasSourceToWebp(image, image.naturalWidth, image.naturalHeight, baseName);
}
