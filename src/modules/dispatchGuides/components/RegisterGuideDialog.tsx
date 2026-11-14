import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { todayLocalDateString } from '@/lib/dateUtils';
import { InvoiceFileField } from '@/modules/invoices/components/InvoiceFileField';
import { useRegisterGuide } from '@/modules/dispatchGuides/hooks/useDispatchGuides';
import { registerGuideSchema, type RegisterGuideFormValues } from '@/modules/dispatchGuides/schemas/dispatchGuide.schema';
import { GUIDE_INCOMPLETE_CODE, type GuideSummary } from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { DateField } from '@/presentation/components/shared/DateField';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';

interface RegisterGuideDialogProps {
  guide: GuideSummary;
  onClose: () => void;
}

/**
 * Registrar la guía ya emitida en SUNAT (modo manual): serie T###, número,
 * fecha de emisión y, si se tiene, el PDF que dio SUNAT (en el mismo paso).
 * Si a la guía le faltan datos, el backend responde todos los faltantes juntos.
 */
export function RegisterGuideDialog({ guide, onClose }: RegisterGuideDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const { mutate: registerGuide, isPending } = useRegisterGuide();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterGuideFormValues>({ resolver: zodResolver(registerGuideSchema), defaultValues: { series: 'T001', issue_date: todayLocalDateString() } });

  const submit = (values: RegisterGuideFormValues) =>
    registerGuide(
      { id: guide.id, dto: { series: values.series.toUpperCase(), number: values.number, issue_date: values.issue_date || null, file } },
      {
        onSuccess: (saved) => {
          toast.success(`Guía ${saved.number_text} registrada`);
          onClose();
        },
        onError: (error) => {
          const apiError = error as ApiClientError;
          if (apiError.code === GUIDE_INCOMPLETE_CODE) {
            setMissing(((apiError.errors as { missing?: string[] } | undefined)?.missing) ?? []);
            return;
          }
          toast.error(apiError.message);
        },
      },
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="register-guide-dialog">
        <DialogHeader>
          <DialogTitle>Registrar guía emitida</DialogTitle>
          <DialogDescription>Escribe la serie y el número que te dio SUNAT al emitirla en SEE-SOL o App Emprender.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.stopPropagation();
            void handleSubmit(submit)(event);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="guide-series">Serie</Label>
              <Input id="guide-series" maxLength={4} placeholder="T001" {...register('series')} />
              {errors.series && <p className="text-xs text-destructive">{errors.series.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="guide-number">Número</Label>
              <Input id="guide-number" type="number" min="1" {...register('number', { valueAsNumber: true })} />
              {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Fecha de emisión</Label>
            <DateField id="guide-issue-date" value={watch('issue_date') || undefined} onChange={(value) => setValue('issue_date', value)} />
          </div>
          <div className="space-y-1">
            <Label>PDF de SUNAT (opcional, se puede subir después)</Label>
            <InvoiceFileField value={file} onChange={setFile} />
          </div>
          {missing.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs" data-testid="guide-missing">
              <p className="font-medium text-destructive">Faltan datos de la guía. Complétalos en el borrador:</p>
              <ul className="mt-1 list-disc pl-4">
                {missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Registrando…' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
