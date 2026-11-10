import { ChevronRight, Download, EllipsisVertical, Share, SquarePlus, Smartphone, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { promptInstall } from '@/lib/installPrompt';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import { useInstallPrompt } from '@/presentation/hooks/shared/useInstallPrompt';
import { usePersistentToggle } from '@/presentation/hooks/shared/usePersistentToggle';
import type { LucideIcon } from 'lucide-react';

// navigator.standalone solo existe en Safari de iOS (no viene en lib.dom).
interface IosNavigator extends Navigator {
  standalone?: boolean;
}

type MobilePlatform = 'ios' | 'android';

interface InstallStep {
  icon: LucideIcon;
  text: ReactNode;
}

interface InstallGuide {
  deviceLabel: string;
  steps: InstallStep[];
  hint: string;
}

// "1" = el aviso sigue visible; al cerrarlo se guarda "0" en este navegador.
const PROMPT_STORAGE_KEY = 'vanys-install-prompt';

// iPhone/iPad. iPadOS 13+ se presenta como una Mac en el user-agent; se
// distingue por la pantalla táctil (una Mac real no tiene).
const isIosDevice = (): boolean => {
  const { userAgent, maxTouchPoints } = navigator;
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return userAgent.includes('Macintosh') && maxTouchPoints > 1;
};

// Solo celulares/tablets: en la PC no se ofrece instalar (el navegador ya
// tiene su propio ícono en la barra de direcciones).
const detectMobilePlatform = (): MobilePlatform | null => {
  if (isIosDevice()) return 'ios';
  if (/Android/i.test(navigator.userAgent)) return 'android';
  return null;
};

// Ya abierta desde la pantalla de inicio (a pantalla completa): no hay nada
// que instalar.
const isRunningInstalled = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as IosNavigator).standalone === true;

// Guía paso a paso por plataforma. iPhone no deja instalar desde un botón de
// la página, así que siempre es la guía. En Android la guía es el respaldo
// cuando el navegador todavía no ofreció instalar con un toque (Chrome lo
// ofrece recién después de que la persona interactúa con la página).
const INSTALL_GUIDES: Record<MobilePlatform, InstallGuide> = {
  ios: {
    deviceLabel: 'iPhone',
    // Desde iOS 26 el botón Compartir queda dentro de "⋯" en la barra compacta.
    steps: [
      {
        icon: Share,
        text: (
          <>
            Toca <strong>Compartir</strong> en Safari (el cuadrado con una flecha hacia arriba). Si no lo ves, toca
            primero <strong>⋯</strong>.
          </>
        ),
      },
      {
        icon: SquarePlus,
        text: (
          <>
            Elige <strong>Agregar a pantalla de inicio</strong>. Si no aparece, desliza la lista hacia abajo o toca{' '}
            <strong>Ver más</strong>.
          </>
        ),
      },
      {
        icon: Smartphone,
        text: (
          <>
            Toca <strong>Agregar</strong>. Si aparece <strong>Abrir como app web</strong>, déjalo activado.
          </>
        ),
      },
    ],
    hint: '¿No aparece la opción? Abre este enlace en Safari.',
  },
  android: {
    deviceLabel: 'celular',
    steps: [
      {
        icon: EllipsisVertical,
        text: (
          <>
            Toca el menú <strong>⋮</strong> de Chrome (arriba a la derecha).
          </>
        ),
      },
      {
        icon: Download,
        text: (
          <>
            Elige <strong>Instalar app</strong> o <strong>Agregar a la pantalla principal</strong>.
          </>
        ),
      },
      {
        icon: Smartphone,
        text: (
          <>
            Confirma con <strong>Instalar</strong>. Vanys queda junto a tus otras apps.
          </>
        ),
      },
    ],
    hint: '¿No aparece la opción? Abre este enlace en Chrome.',
  },
};

// Aviso para instalar Vanys como app en el celular (pantalla de inicio, a
// pantalla completa), en iPhone y Android. Aparece mientras la app se usa
// desde el navegador y hasta que la persona lo cierre o la instale. Se monta
// una sola vez en App.tsx, así se ve tanto en el login como con sesión.
export function InstallAppPrompt() {
  const [visible, dismiss] = usePersistentToggle(PROMPT_STORAGE_KEY, true);
  const [guideOpen, setGuideOpen] = useState(false);
  const { event: installEvent, installed } = useInstallPrompt();

  if (!visible || installed) return null;
  const platform = detectMobilePlatform();
  if (!platform || isRunningInstalled()) return null;

  const guide = INSTALL_GUIDES[platform];
  // Android con el evento del navegador: se instala con un toque, sin guía.
  const canInstallDirectly = installEvent !== null;

  const handleInstall = async () => {
    if (!canInstallDirectly) {
      setGuideOpen(true);
      return;
    }
    const accepted = await promptInstall();
    if (!accepted) return;
    toast.success('Vanys se instaló. Ábrela desde tu pantalla de inicio.');
    dismiss();
  };

  return (
    <>
      {/* z-30: por encima del botón flotante de "Nueva cotización" (z-20).
          Una sola fila baja (toda la fila es el botón): con un botón aparte
          el texto se partía en varias líneas y en un iPhone chico el aviso
          tapaba el botón "Ingresar" del login. */}
      <div
        role="region"
        aria-label="Instalar la app"
        className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center gap-1 rounded-xl border bg-background p-1.5 shadow-lg"
      >
        <button
          type="button"
          onClick={handleInstall}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <img src="/apple-touch-icon.png?v=2" alt="" className="size-10 shrink-0 rounded-lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">Instala Vanys en tu {guide.deviceLabel}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {canInstallDirectly ? 'Toca aquí para instalarla' : 'Toca aquí para ver cómo'}
            </span>
          </span>
          {canInstallDirectly ? (
            <Download className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        <Button size="icon" variant="ghost" aria-label="Ahora no" title="Ahora no" onClick={dismiss}>
          <X />
        </Button>
      </div>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar Vanys en tu {guide.deviceLabel}</DialogTitle>
            <DialogDescription>
              Queda en tu pantalla de inicio y se abre a pantalla completa, como cualquier app, sin pasar por la
              tienda de apps.
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-4">
            {guide.steps.map(({ icon: Icon, text }, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white">
                  <Icon className="size-4" />
                </span>
                <span className="pt-1.5">
                  <span className="font-semibold">{index + 1}.</span> {text}
                </span>
              </li>
            ))}
          </ol>

          <p className="text-xs text-muted-foreground">
            {guide.hint} La primera vez que abras la app tendrás que iniciar sesión.
          </p>

          <DialogFooter>
            <Button onClick={() => setGuideOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
