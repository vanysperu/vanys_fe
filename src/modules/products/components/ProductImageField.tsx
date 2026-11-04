import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useUploadProductImage } from '@/modules/products/hooks/useProducts';
import { IMAGE_INPUT_ACCEPT, IMAGE_UPLOAD_HINT, validateImageFile } from '@/lib/imageUpload';
import { buildAssetUrl } from '@/lib/utils';
import { Button } from '@/presentation/components/shared/ui/button';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';

interface ProductImageFieldProps {
  // Ruta relativa ("/uploads/company-assets/..."), o null sin foto.
  value: string | null | undefined;
  onChange: (path: string | null) => void;
  // Empresa del producto (la manda el Super Administrador al subir).
  companyId: number | undefined;
}

// Foto del producto: se sube al ELEGIR el archivo y se asigna al producto
// recién al guardar el formulario (mismo flujo que el logo en Documentos).
export function ProductImageField({ value, onChange, companyId }: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: upload, isPending } = useUploadProductImage();
  const previewUrl = buildAssetUrl(value);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    upload(
      { file, companyId },
      {
        onSuccess: ({ path }) => onChange(path),
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <div className="space-y-2">
      <Label>
        Foto <span className="font-normal text-muted-foreground">(opcional)</span>
      </Label>
      <div className="flex items-center gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {previewUrl ? (
            <img src={previewUrl} alt="Foto del producto" className="size-full object-contain" data-testid="product-image-preview" />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
              <ImagePlus className="size-4" />
              {isPending ? 'Subiendo…' : value ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                <Trash2 className="size-4 text-destructive" />
                Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{IMAGE_UPLOAD_HINT}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_INPUT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            // Permite volver a elegir el mismo archivo.
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
