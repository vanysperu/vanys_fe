// Evita que la rueda del mouse o el scroll del touchpad cambien el valor de un
// <input type="number"> (pedido del usuario, 21-nov): con el input enfocado,
// el navegador sube/baja el número al hacer scroll encima — un 100 podía
// quedar en 97 sin que nadie lo note.
//
// Un solo listener en el documento cubre TODOS los inputs numéricos, también
// los que se agreguen después. Si el scroll cae sobre el input numérico que
// tiene el foco, se le quita el foco: el navegador ya no cambia el valor y la
// página sigue bajando normal. `passive: true` porque no se cancela el scroll.

const isFocusedNumberInput = (target: EventTarget | null): target is HTMLInputElement =>
  target instanceof HTMLInputElement && target.type === 'number' && target === document.activeElement;

export function preventNumberInputWheelChange(): void {
  document.addEventListener(
    'wheel',
    (event) => {
      if (!isFocusedNumberInput(event.target)) return;
      event.target.blur();
    },
    { passive: true },
  );
}
