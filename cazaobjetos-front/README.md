# CazaObjetos UTCH — Front (React + Vite)

## Arrancar la app local integrada

La integración local usa la rama `pantallas-mvp` del frontend y el backend Java de CazaObjetos. El launcher busca el backend en `~/Documentos/cazaobjetos-backend` cuando ambos repositorios están juntos en Documentos.

```bash
cd ~/Documentos/cazaobjetos-front/cazaobjetos-front
./run.sh
```

Requiere Node.js, npm, curl, setsid y los requisitos del launcher del backend (Java 21, Maven cuando se recompila y Docker Compose). Instala dependencias cuando hace falta, inicia el backend si está detenido y levanta Vite en http://127.0.0.1:5173. Si el backend está en otra carpeta, configura BACKEND_DIR. Ctrl+C cierra los procesos iniciados por este launcher. PostgreSQL y Mailpit conservan su estado. Una instancia de backend que ya estuviera activa continúa bajo el control de quien la inició.

El proxy de Vite envía `/api` a http://127.0.0.1:8080. `.env.local` contiene `VITE_API_URL=/api/v1`. En el `.env` del backend se configuraron orígenes locales explícitos para 127.0.0.1/localhost en 5173 y 4173. Usa el mismo host al navegar para conservar las cookies. Las fotos se consultan por la misma API autenticada.

Cuentas demo del backend: `alumno.demo@utch.edu.mx`, `reclamante.demo@utch.edu.mx`, `docente.demo@utch.edu.mx` y `secretaria.demo@utch.edu.mx`. Usan DEV_PASSWORD de la configuración local del backend cuando se crean. Cambiar esa variable después no cambia sus contraseñas existentes.

## Registro y correo local

El buzón Mailpit está en http://127.0.0.1:8025. Para registrar una cuenta ficticia usa Crear cuenta, abre el mensaje de Mailpit y pega el código completo de 43 caracteres en Verificar correo. La contraseña requiere al menos 12 caracteres y admite hasta 72 bytes UTF-8.

La recuperación de contraseña usa otro código de 43 caracteres. Cambiarla revoca las sesiones anteriores y devuelve a la pantalla de acceso. Las pruebas locales capturan el correo en Mailpit. La entrega institucional real requiere la configuración SMTP autorizada del backend.

## Conexión de las pantallas

`src/lib/realApi.js` adapta los modelos de las pantallas al contrato Java. `api.js` selecciona el backend cuando VITE_API_URL tiene valor. El demo anterior puede revisarse con VITE_API_URL vacío usando npm run dev.

| Función | API del backend |
|---|---|
| Sesión | GET `/auth/csrf`, POST `/auth/login` con formulario, GET `/auth/me`, POST `/auth/logout` |
| Registro y verificación | POST `/auth/register`, `/auth/verify-email`, `/auth/resend-verification` |
| Contraseñas | POST `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-password` |
| Catálogo y mis publicaciones | GET `/found-items`, `/lost-reports` y sus rutas `/mine` |
| Edición y retiro | PUT `/found-items/{id}` o `/lost-reports/{id}`, POST `/{id}/withdraw` |
| Resguardo y delegación | POST `/found-items/{id}/office`, `/{id}/delegate`, GET `/responsibles` |
| Fotos | POST/GET `/{publicación}/{id}/photos`, GET/DELETE `/{publicación}/{id}/photos/{fotoId}` |
| Reclamos | POST `/found-items/{id}/claims`, GET `/claims/search`, GET `/claims/{id}` |
| Decisiones | POST `/claims/{id}/accept`, `/reject`, `/cancel`, `/complete` |

Todas las rutas de la tabla llevan `/api/v1`. Las escrituras incluyen CSRF y la sesión usa cookies. El adaptador traduce enums, fechas sin hora, IDs UUID y páginas que comienzan en cero. Los formularios de creación conservan una clave de idempotencia para los reintentos. Las publicaciones conservan su historial al retirarse.

El MVP permite aceptar/rechazar un reclamo, cancelarlo y confirmar su recepción después de aceptarlo. La comunicación adicional se realiza por correo institucional. Las acciones adicionales del demo (vigilancia, petición de pruebas, adjuntos privados y alertas automáticas de coincidencia) solo se presentan en modo de datos ficticios. Las fotos actuales se guardan en PostgreSQL. El bucket local y la importación de imágenes desde enlaces se trataron como una ampliación y siguen pendientes.

## Comprobaciones locales del 17 de noviembre de 2026

- Compilación de producción y generación del service worker correctas.
- Adaptador probado con cuentas ficticias nuevas y la API real a través del proxy. Registro/verificación en Mailpit, creación y reintento, foto y eliminación, edición, oficina, búsqueda, reclamo privado, aceptación, devolución y cierre de extravío vinculado.
- Historial de publicaciones retiradas, recuperación de contraseña, cambio y revocación de sesión comprobados.
- Launcher probado desde otra carpeta y apagado de sus procesos comprobado.
- Flujo visual entre alumno.demo y reclamante.demo comprobado hasta Cerrado · Entregado. Se crearon publicaciones y cuentas ficticias para estas pruebas.

## Estructura
- `src/index.css` — tokens y componentes de la guía de estilo (colores, tipografía, chips, botones…)
- `public/utch-logo.png` — logotipo de la Universidad Tecnológica de Chihuahua
- `src/lib/constants.js` — categorías, casetas y estados de reclamo
- `src/pages/` — Login, Registro, Verificar, Recuperar, Explorar (abre en «Se buscan»; «Encontrados» con `?tab=encontrados`), Reclamo, MisReclamos, DetalleReclamo, Reportar, MisPublicaciones, EditarPublicacion, DetalleExtravio, MiCuenta, Vigilancia
- En modo de datos ficticios, el código de verificación y de recuperación es `123456`.
- `src/components/` — Layout (barra superior e inferior), Chip, ObjectCard, Toast, Icons

## Flujo del demo con datos ficticios
1. Quien encuentra un objeto lo publica y elige quién gestiona la devolución: él mismo o un docente/secretaría. Opcional: «Lo dejé en oficina» con lugar de resguardo.
2. El solicitante envía el reclamo con detalles privados. Se comunican por correo institucional.
3. El responsable revisa: Enviado → En revisión → Aprobado / Rechazado, o Requiere pruebas (el solicitante responde y vuelve a revisión).
4. Aprobado → Entregado: el solicitante marca «Ya recuperé mi objeto» o vigilancia registra el acta de entrega. El reclamo se puede cancelar antes de la entrega.

## PWA (computadora y teléfono)
- Es una PWA instalable: manifest, íconos y service worker los genera `vite-plugin-pwa` (config en `vite.config.js`, íconos en `public/icons/`).
- El service worker **no** funciona con `npm run dev`. Pruébalo con:
  ```bash
  npm run build
  npm run preview
  ```
  y abre http://localhost:4173. El botón «Instalar» aparece en el inicio de sesión y en la barra superior; abre el diálogo nativo cuando el navegador lo permite y muestra instrucciones manuales en los demás casos.
- Para instalarla en un celular necesita **HTTPS**: súbanla a Vercel o Netlify.
- Android/Chrome: botón «Instalar» o menú ⋮ → «Instalar aplicación». iPhone/Safari: botón «Instalar» → Compartir → «Agregar a pantalla de inicio».
- Sin conexión abre la app y lo ya cargado; los datos de la API siempre van a la red (no se guardan en caché) y se muestra un aviso.
- En celular se conserva la navegación inferior; en tabletas (520–899 px) el contenido y las tarjetas aprovechan el ancho disponible; desde 900 px el menú pasa a barra lateral y los objetos a rejilla.
- Si la app se despliega en una subcarpeta, cambia `start_url` y `scope` en `vite.config.js`.
