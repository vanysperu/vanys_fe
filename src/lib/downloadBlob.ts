// Descarga un archivo recibido como blob (PDF, Excel) con el nombre dado.
// Un solo lugar para el truco del <a download>: antes cada pantalla lo
// repetía a mano. El objectURL se libera en el siguiente ciclo para que el
// navegador alcance a iniciar la descarga (Safari la cancelaba si se liberaba
// en el mismo instante).
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
