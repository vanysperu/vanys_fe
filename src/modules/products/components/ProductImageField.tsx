import { useUploadProductImage } from '@/modules/products/hooks/useProducts';
import { ImageUploadField } from '@/presentation/components/shared/ImageUploadField';

interface ProductImageFieldProps {
  // Ruta relativa ("/uploads/company-assets/..."), o null sin foto.
  value: string | null | undefined;
  onChange: (path: string | null) => void;
  // Empresa del producto (la manda el Super Administrador al subir).
  companyId: number | undefined;
}

// Foto del producto: se sube al ELEGIR el archivo y se asigna al producto
// recién al guardar el formulario (campo compartido ImageUploadField).
export function ProductImageField({ value, onChange, companyId }: ProductImageFieldProps) {
  const { mutateAsync: upload, isPending } = useUploadProductImage();

  return (
    <ImageUploadField
      label="Foto"
      optional
      value={value}
      onChange={onChange}
      upload={(file) => upload({ file, companyId })}
      isUploading={isPending}
      previewAlt="Foto del producto"
      previewTestId="product-image-preview"
    />
  );
}
