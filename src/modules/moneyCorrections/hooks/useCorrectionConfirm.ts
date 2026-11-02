import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { adjustmentToastSuffix } from '@/modules/cashClosings/utils/adjustment';

interface UseCorrectionConfirmOptions<TDto> {
  // Llama al endpoint de corrección/anulación de la fuente (mutateAsync).
  submit: (dto: TDto) => Promise<unknown>;
  successMessage: string;
  // Texto si el backend no manda mensaje (error de red, etc.).
  fallbackErrorMessage?: string;
  // Tras guardar con éxito (normalmente cerrar el diálogo).
  onSuccess?: () => void;
}

export interface CorrectionConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export interface UseCorrectionConfirmResult<TDto> {
  pendingDto: TDto | null;
  // El formulario ya validó: guarda el DTO y abre la confirmación.
  request: (dto: TDto) => void;
  cancel: () => void;
  // Para esparcir en <ConfirmDialog {...confirmProps} title=… description=… />.
  confirmProps: CorrectionConfirmProps;
}

// Paso de confirmación compartido por todos los diálogos de corrección y
// anulación de dinero: el formulario arma el DTO, se pide "¿Confirmas?" con el
// resumen Antes → Después, y recién ahí se envía.
//
// Los errores se avisan SOLO con toast (antes además se repetían en rojo
// dentro del diálogo). La confirmación se cierra siempre y el diálogo queda
// abierto con lo escrito, para corregir y reintentar.
export function useCorrectionConfirm<TDto>({
  submit,
  successMessage,
  fallbackErrorMessage = 'No se pudo guardar la corrección',
  onSuccess,
}: UseCorrectionConfirmOptions<TDto>): UseCorrectionConfirmResult<TDto> {
  const [pendingDto, setPendingDto] = useState<TDto | null>(null);

  const cancel = () => setPendingDto(null);

  const confirm = async () => {
    if (pendingDto === null) return;
    // try/catch solo para cerrar la confirmación y avisar: el mensaje ya viene
    // normalizado por el interceptor de apiClient.
    try {
      const result = await submit(pendingDto);
      setPendingDto(null);
      toast.success(successMessage + adjustmentToastSuffix(result));
      onSuccess?.();
    } catch (mutationError) {
      setPendingDto(null);
      toast.error((mutationError as ApiClientError).message ?? fallbackErrorMessage);
    }
  };

  return {
    pendingDto,
    request: (dto: TDto) => setPendingDto(() => dto),
    cancel,
    confirmProps: {
      open: pendingDto !== null,
      onOpenChange: (open: boolean) => {
        if (!open) cancel();
      },
      onConfirm: confirm,
    },
  };
}
