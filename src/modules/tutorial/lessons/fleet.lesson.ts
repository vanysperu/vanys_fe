import { Truck } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const VEHICLE_FORM = dialogWith('Nuevo vehículo');
const DRIVER_FORM = dialogWith('Nuevo conductor');

export const fleetLesson: TutorialLesson = {
  code: 'fleet',
  section: 'operations',
  title: 'Vehículos y conductores',
  summary: 'Registra tus vehículos y conductores una vez y elígelos en cada guía.',
  minutes: 3,
  icon: Truck,
  requires: {
    buttons: ['dispatch_guide.vehicles.create.button', 'dispatch_guide.drivers.create.button'],
    routes: ['/logistica/vehiculos', '/logistica/conductores'],
  },
  steps: () => [
    navigateStep({ id: 'go-vehicles', path: '/logistica/vehiculos', label: 'Vehículos', group: 'Logística', body: 'Los vehículos con los que despachas.' }),
    {
      id: 'new-vehicle',
      title: 'Agrega un vehículo',
      body: 'Presiona "Nuevo vehículo".',
      target: { css: 'main button', text: 'Nuevo vehículo' },
      done: { kind: 'appear', target: VEHICLE_FORM },
    },
    {
      id: 'vehicle-form',
      title: 'Su placa',
      body: 'La placa y una descripción para reconocerlo.',
      hint: 'Ejemplo: "BXK-482", "Furgón blanco". Luego "Guardar".',
      target: VEHICLE_FORM,
      pointer: '#vehicle-plate',
      done: { kind: 'toast', texts: ['Vehículo creado'] },
      checkpoint: true,
    },
    navigateStep({ id: 'go-drivers', path: '/logistica/conductores', label: 'Conductores', group: 'Logística', body: 'Quiénes manejan.' }),
    {
      id: 'new-driver',
      title: 'Agrega un conductor',
      body: 'Presiona "Nuevo conductor".',
      target: { css: 'main button', text: 'Nuevo conductor' },
      done: { kind: 'appear', target: DRIVER_FORM },
    },
    {
      id: 'driver-form',
      title: 'Su documento y su licencia',
      body: 'Documento, nombres, apellidos y número de licencia (los pide SUNAT en la guía).',
      hint: 'Ejemplo: DNI 41234567, Rosa Huamán, licencia Q41234567. Luego "Guardar".',
      target: DRIVER_FORM,
      pointer: '#driver-doc-number',
      done: { kind: 'toast', texts: ['Conductor creado'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Listos para despachar!',
      body: 'En cada guía de remisión solo los eliges.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
