// Configuración del frontend en tiempo de ejecución.
//
// Este archivo NO se compila: se copia tal cual y se puede editar
// directamente en el servidor (administrador de archivos del hosting) sin
// volver a compilar ni subir la app.
//
// apiUrl:
//   - Déjalo vacío ("") cuando el backend sirve también el frontend (mismo
//     dominio): la app usa "/api" automáticamente. Es el caso recomendado.
//   - Si el backend está en otro dominio, pon su URL completa, por ejemplo:
//       apiUrl: "https://api.tudominio.com/api"
window.__APP_CONFIG__ = {
  apiUrl: "",
};
