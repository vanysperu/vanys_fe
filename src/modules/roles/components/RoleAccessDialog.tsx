import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

import { resolveIcon } from '@/lib/resolveIcon';
import { cn } from '@/lib/utils';
import { useRoleResourceTree, useSetRoleResources } from '@/modules/roles/hooks/useRoleResourceTree';
import type { ModuleTreeItem, ResourceTreeItem, Role } from '@/modules/roles/types/role.types';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

const TYPE_LABEL: Record<ResourceTreeItem['type'], string> = {
  view: 'Vista',
  button: 'Botón',
  endpoint: 'Endpoint',
};

interface RoleAccessDialogProps {
  role: Role | null;
  onClose: () => void;
}

// Panel de asignación de accesos: marca/desmarca recursos (vistas, botones,
// endpoints) de un rol y guarda solo el diff (add/remove) contra el backend
// (CLAUDE.md sección 2 - RBAC, PUT /roles/:roleId/resources).
export function RoleAccessDialog({ role, onClose }: RoleAccessDialogProps) {
  const open = Boolean(role);
  const { data, isLoading } = useRoleResourceTree(role?.id ?? 0, open);
  const { mutate: save, isPending } = useSetRoleResources(role?.id ?? 0);

  // Esta pantalla es exclusiva del Super Administrador (el backend lo exige
  // con requireSystemRole), así que puede editar también los roles de
  // plantilla (Administrador/Especialista/Gestor, company_id NULL). Son una
  // sola fila compartida por todas las empresas: se avisa que el cambio
  // alcanza a todas. Solo un rol de plataforma queda de solo lectura (ya
  // tiene todo otorgado).
  const isSharedTemplate = Boolean(role) && !role!.is_system && role!.company_id == null;
  const isDisabledRole = role?.status === false;
  const readOnly = Boolean(role?.is_system) || isDisabledRole;

  const [granted, setGranted] = useState<Set<number>>(new Set());
  const [initialGranted, setInitialGranted] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!data) return;
    const ids = new Set<number>();
    const walk = (items: ResourceTreeItem[]) => {
      for (const item of items) {
        if (item.granted) ids.add(item.id);
        if (item.children.length > 0) walk(item.children);
      }
    };
    data.modules.forEach((module) => walk(module.resources));
    setGranted(new Set(ids));
    setInitialGranted(new Set(ids));
  }, [data]);

  // Un resource con hijos (ej. "Usuarios" agrupando "Crear usuario",
  // "Actualizar usuario", etc.) actúa como "seleccionar todo" de su propio
  // subárbol al marcarlo/desmarcarlo — antes el checkbox del padre solo se
  // marcaba a sí mismo, sin tocar ninguno de sus hijos (bug reportado por
  // QA: "agilizar la configuración de accesos").
  const collectIds = (resource: ResourceTreeItem): number[] => [
    resource.id,
    ...resource.children.flatMap(collectIds),
  ];

  const toggle = (resource: ResourceTreeItem) => {
    if (readOnly) return;
    const ids = collectIds(resource);
    const willGrant = !granted.has(resource.id);
    setGranted((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (willGrant) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const hasChanges = useMemo(() => {
    if (granted.size !== initialGranted.size) return true;
    for (const id of granted) if (!initialGranted.has(id)) return true;
    return false;
  }, [granted, initialGranted]);

  const handleSave = () => {
    const add = [...granted].filter((id) => !initialGranted.has(id));
    const remove = [...initialGranted].filter((id) => !granted.has(id));

    save(
      { resourceIds: { add, remove } },
      {
        onSuccess: () => {
          toast.success('Accesos del rol actualizados');
          setInitialGranted(new Set(granted));
        },
        onError: () => toast.error('No se pudieron guardar los accesos'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="max-w-2xl overflow-hidden p-0 sm:p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Accesos de {role?.name}</DialogTitle>
          <DialogDescription>
            Marca los módulos, vistas, botones y endpoints que este rol puede usar.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin max-h-[55vh] overflow-y-auto px-6 py-4">
          {role?.is_system && (
            <p className="mb-4 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              Este es un rol de plataforma (<code>is_system</code>): tiene todos los accesos otorgados
              automáticamente, sin importar lo que se marque aquí.
            </p>
          )}

          {isSharedTemplate && (
            <p className="mb-4 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              Este es un rol de plantilla compartido con todas las empresas: lo que cambies aquí se aplica a
              todos los usuarios de todas las empresas que tengan este rol.
            </p>
          )}

          {isDisabledRole && (
            <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Este rol está inactivo: sus accesos quedan de solo lectura hasta que lo actives de nuevo.
            </p>
          )}

          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!isLoading &&
            data?.modules.map((module, index) => (
              <ModuleGroup key={module.id} module={module} granted={granted} onToggle={toggle} readOnly={readOnly} index={index} />
            ))}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            <X className="size-4" />
            Cerrar
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={!hasChanges || isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModuleGroup({
  module,
  granted,
  onToggle,
  readOnly,
  index,
}: {
  module: ModuleTreeItem;
  granted: Set<number>;
  onToggle: (resource: ResourceTreeItem) => void;
  readOnly: boolean;
  index: number;
}) {
  const ModuleIcon = resolveIcon(module.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="mb-4 rounded-xl border"
    >
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <ModuleIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{module.name}</span>
      </div>
      <div className="divide-y">
        {module.resources.map((resource) => (
          <ResourceRow key={resource.id} resource={resource} granted={granted} onToggle={onToggle} readOnly={readOnly} />
        ))}
      </div>
    </motion.div>
  );
}

function ResourceRow({
  resource,
  granted,
  onToggle,
  readOnly,
  depth = 0,
}: {
  resource: ResourceTreeItem;
  granted: Set<number>;
  onToggle: (resource: ResourceTreeItem) => void;
  readOnly: boolean;
  depth?: number;
}) {
  return (
    <div>
      <label
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
          readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-muted/40',
        )}
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <Checkbox checked={granted.has(resource.id)} onCheckedChange={() => onToggle(resource)} disabled={readOnly} />
        <span className="flex-1">{resource.name}</span>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          {TYPE_LABEL[resource.type]}
        </Badge>
      </label>
      {resource.children.map((child) => (
        <ResourceRow key={child.id} resource={child} granted={granted} onToggle={onToggle} readOnly={readOnly} depth={depth + 1} />
      ))}
    </div>
  );
}
