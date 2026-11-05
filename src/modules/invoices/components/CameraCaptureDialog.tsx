import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { canvasSourceToWebp } from '@/lib/imageCompression';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';

interface CameraCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

// Cámara para fotografiar la factura (pedido explícito del usuario: "antes de
// guardar se abre la cámara"). Usa la cámara trasera del celular si existe.
// La foto sale ya en WEBP. Si no hay cámara o se niega el permiso, se avisa y
// queda "Subir archivo".
export function CameraCaptureDialog({ open, onClose, onCapture }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setError(null);

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador no permite usar la cámara. Usa "Subir archivo".');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError('No se pudo abrir la cámara. Revisa el permiso del navegador o usa "Subir archivo".');
      }
    };
    void start();

    // Al cerrar se apaga la cámara (nunca queda encendida en segundo plano).
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setIsCapturing(true);
    try {
      const file = await canvasSourceToWebp(video, video.videoWidth, video.videoHeight, `factura-${Date.now()}`);
      onCapture(file);
      onClose();
    } catch (captureError) {
      toast.error((captureError as Error).message);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Foto de la factura</DialogTitle>
          <DialogDescription>Encuadra la factura completa, con buena luz y sin reflejos.</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">{error}</p>
        ) : (
          <video ref={videoRef} className="max-h-[60vh] w-full rounded-lg bg-black object-contain" playsInline muted />
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            <RotateCcw className="size-4" />
            Cancelar
          </Button>
          <Button type="button" onClick={capture} disabled={Boolean(error) || isCapturing}>
            <Camera className="size-4" />
            {isCapturing ? 'Procesando…' : 'Tomar foto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
