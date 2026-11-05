import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { IMAGE_INPUT_ACCEPT, IMAGE_UPLOAD_HINT, validateImageFile } from '@/lib/imageUpload';
import { buildAssetUrl, cn } from '@/lib/utils';
import { Button } from '@/presentation/components/shared/ui/button';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';

interface ImageUploadFieldProps {
  label: string;
  // Ruta relativa ("/uploads/company-assets/..."), o null sin imagen.
  value: string | null | undefined;
  onChange: (path: string | null) => void;
  // Sube el archivo y devuelve su ruta (la mutación de React Query del módulo).
  upload: (file: File) => Promise<{ path: string }>;
  isUploading: boolean;
  previewAlt: string;
  // "(opcional)" junto al título y botón "Quitar". Una imagen obligatoria
  // solo se cambia.
  optional?: boolean;
  // Palabra de los botones ("Subir foto" / "Cambiar foto").
  noun?: string;
  // Por defecto, miniatura cuadrada (foto de producto).
  previewClassName?: string;
  previewTestId?: string;
  hint?: string;
  error?: string;
}

// Imagen de un formulario: se sube al ELEGIR el archivo y se asigna al
// registro recién al guardar (mismo flujo que el logo en Documentos). Lo usan
// la foto de un producto y la imagen de un anuncio.
export function ImageUploadField({
  label,
  value,
  onChange,
  upload,
  isUploading,
  previewAlt,
  optional = false,
  noun = 'foto',
  previewClassName = 'size-20',
  previewTestId,
  hint,
  error,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = buildAssetUrl(value);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      const { path } = await upload(file);
      onChange(path);
    } catch (uploadError) {
      toast.error((uploadError as ApiClientError).message);
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40',
            previewClassName,
            error && 'border-destructive',
          )}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={previewAlt} className="size-full object-contain" data-testid={previewTestId} />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
              <ImagePlus className="size-4" />
              {isUploading ? 'Subiendo…' : value ? `Cambiar ${noun}` : `Subir ${noun}`}
            </Button>
            {optional && value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                <Trash2 className="size-4 text-destructive" />
                Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{hint ? `${IMAGE_UPLOAD_HINT} · ${hint}` : IMAGE_UPLOAD_HINT}</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_INPUT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            // Permite volver a elegir el mismo archivo.
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
