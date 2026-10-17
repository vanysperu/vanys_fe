import { useState } from 'react';
import { Check, Loader2, Trash2, X } from 'lucide-react';

import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

// Confirmación reutilizable para acciones destructivas reales (DELETE físico
// — a diferencia del toggle habilitar/deshabilitar, que no necesita
// confirmación porque es reversible con un solo clic).
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  variant = 'destructive',
  onConfirm,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            <X className="size-4" />
            Cancelar
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : variant === 'destructive' ? (
              <Trash2 className="size-4" />
            ) : (
              <Check className="size-4" />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
