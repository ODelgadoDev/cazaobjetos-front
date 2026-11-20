# CazaObjetos UTCH — Front (React + Vite)

## Arrancar la app local integrada

Esta rama usa el backend de prueba de `cazaobjetos-backend-primer-uso` con la migración V14.

```bash
cd ~/Documentos/cazaobjetos-front-primer-uso/cazaobjetos-front
./run.sh
```

El frontend abre en http://127.0.0.1:4173 y su API usa el puerto 18090. El launcher reutiliza una API activa. Si tiene que iniciarla, el backend de prueba requiere un PostgreSQL preparado y su archivo local `.env`. Se puede configurar otro backend compatible mediante `CAZA_API_PROXY`.

La prueba local utiliza una copia independiente de la base habitual. Las operaciones que hagas en esta variante se guardan en esa copia.

Cuentas demo del backend: `alumno.demo@utch.edu.mx`, `reclamante.demo@utch.edu.mx`, `docente.demo@utch.edu.mx` y `secretaria.demo@utch.edu.mx`. Usan DEV_PASSWORD de la configuración local del backend cuando se crean. Cambiar esa variable después no cambia sus contraseñas existentes.

## Registro y correo local

Si el backend local tiene habilitado el correo de desarrollo, consulta el buzón Mailpit en http://127.0.0.1:8025. Para registrar una cuenta ficticia usa Crear cuenta, abre el mensaje de Mailpit y pega el código completo de 43 caracteres en Verificar correo. La contraseña requiere al menos 12 caracteres y admite hasta 72 bytes UTF-8.

La recuperación de contraseña usa otro código de 43 caracteres. Cambiarla revoca las sesiones anteriores y devuelve a la pantalla de acceso. Las pruebas locales capturan el correo en Mailpit. La entrega institucional real requiere la configuración SMTP autorizada del backend.

## Conexión de las pantallas

`src/lib/realApi.js` adapta los modelos de las pantallas al contrato Java. El backend real se usa por defecto, incluso sin `VITE_API_URL`; la ruta predeterminada es `/api/v1`. La simulación en memoria requiere `VITE_USE_MOCK=true` y `npm run dev`, y sus cambios se pierden al recargar. Las compilaciones de producción/PWA siempre usan el backend. La activación de cuentas de prueba sin código sigue guardando los datos en PostgreSQL.

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

En la rama de prueba se puede responder «Lo encontré» desde el reporte original. El canal privado conserva la respuesta, las imágenes opcionales y los comentarios. El dueño confirma la recepción desde ese expediente. Los hallazgos independientes mantienen su propio flujo de reclamo.

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
- El service worker también se habilita en desarrollo para las pruebas de Web Push. Para comprobar el paquete de producción:
  ```bash
  VITE_API_URL=/api/v1 npm run build
  CAZA_API_PROXY=http://127.0.0.1:18090 npm run preview
  ```
  y abre http://localhost:4173. El botón «Instalar» aparece en el inicio de sesión y en la barra superior; abre el diálogo nativo cuando el navegador lo permite y muestra instrucciones manuales en los demás casos.
- Para instalarla en un celular necesita **HTTPS**: súbanla a Vercel o Netlify.
- Android/Chrome: botón «Instalar» o menú ⋮ → «Instalar aplicación». iPhone/Safari: botón «Instalar» → Compartir → «Agregar a pantalla de inicio».
- Sin conexión abre la app y lo ya cargado; los datos de la API siempre van a la red (no se guardan en caché) y se muestra un aviso.
- En celular se conserva la navegación inferior; en tabletas (520–899 px) el contenido y las tarjetas aprovechan el ancho disponible; desde 900 px el menú pasa a barra lateral y los objetos a rejilla.
- Si la app se despliega en una subcarpeta, cambia `start_url` y `scope` en `vite.config.js`.


## Ajustes de interfaz e imágenes opcionales

La barra inferior comparte el ancho del contenido hasta 760 px y respeta las áreas seguras. Desde 900 px se presenta como navegación lateral. El acceso usa una distribución de dos columnas en escritorio y un formulario adaptable en pantallas pequeñas.

«Perdí algo» ofrece una imagen opcional desde el dispositivo, pegada del portapapeles o importada por enlace HTTPS directo. Los archivos admitidos son JPG/PNG de hasta 5 MB. El backend incorpora V7 para etiquetar imágenes de referencia y el endpoint POST `/lost-reports/{id}/photos/import`. Si falla la imagen después de guardar el reporte, la pantalla de edición permite volver a adjuntarla. El enlace importado queda guardado como una copia de la imagen.

Verificado en anchos de 320, 390, 635, 820 y 1440 px, y acceso de escritorio a 1920 px. Se comprobaron en navegador la creación sin imagen y con los tres métodos de carga. Los cambios de esta revisión se guardan localmente.

### Mi cuenta

Permite guardar o cancelar nombre, alias y datos académicos, y ver la matrícula derivada del correo cuando corresponda. El avatar tiene vista previa, guardado y cancelación propios; cambiarlo también actualiza la barra superior. JPEG/PNG de hasta 5 MiB, recortados al centro por el servidor. El apartado Contraseña y acceso incluye mostrar/ocultar en sus tres campos. Requiere el backend con la migración V9 y las operaciones PUT /auth/me y GET/PUT/DELETE /auth/me/photo.

### Interfaz, navegación y apariencia

La identidad UTCH conserva la imagen original: cabecera clara durante el día y placa integrada sobre fondo oscuro durante la noche. El icono Apariencia está en la barra superior y en el acceso; permite Automático, Claro u Oscuro. Automático sigue el dispositivo, y la selección se guarda en localStorage con la clave co_theme, se aplica antes de iniciar React y se sincroniza entre pestañas. No cambia al cerrar sesión. Los colores de formularios, tarjetas, avisos, navegación y diálogos se adaptan al tema.

En escritorio, el menú agrega Mi cuenta y Cerrar sesión; en móvil conserva cuatro accesos, con Mis publicaciones escrito completo. El avatar de la barra superior se resalta al entrar al perfil y usa aria-current. El cierre espera la confirmación del servidor, bloquea clics repetidos y permite reintentar si falla la red. Un CSRF vencido se renueva una vez. El mismo comportamiento se usa en Mi cuenta.

Instalar app usa el diálogo nativo cuando el navegador lo ofrece; en otro caso abre instrucciones accesibles. Cancelar el diálogo nativo no abre avisos adicionales. En modo standalone o tras appinstalled se oculta. La instalación depende del soporte del navegador; las pruebas del prompt se simularon y no instalaron software en el equipo. Los diálogos de apariencia e instalación permiten Escape, mantienen el foco dentro y lo devuelven al botón de origen.

Verificación del 18 de noviembre de 2026: compilación de producción/PWA; revisión entre 320 y 1920 px en ambos temas; persistencia, cambio de sistema y sincronización de apariencia; perfil activo y etiqueta Mis publicaciones; logout real con 401 posterior, fallo de red, CSRF vencido y deduplicación; eventos de instalación simulados. Sin errores de JavaScript. Las cuentas ficticias Héctor, Ángel, Orlando y Docente se crearon y verificaron por el registro local; Docente recibió TEACHER mediante el script auditado. Las credenciales se guardaron fuera de los repositorios.

## Avisos nativos y recordatorios

La campana incluye el panel desplegable **Avisos en este dispositivo**. La activación solicita permiso solo al pulsar el botón; rechazarlo no afecta la bandeja interna. Tras instalar y entrar aparece una invitación opcional. Se reutiliza el service worker PWA con `public/push-worker.js` y se vincula la suscripción a la cuenta activa; al salir se eliminan la vinculación y los avisos del dispositivo. Nunca se muestran pruebas o comentarios privados en el aviso del sistema.

Pulsar una novedad nativa abre el destino y lee únicamente ese aviso; una prueba o recordatorio abre la bandeja sin consumir pendientes. Los recordatorios se guardan en el backend: desactivados, una vez o dos veces al día (10:00/18:00 de Chihuahua). Se envían solo con motivos vigentes. La integración real necesita el backend con V13; el modo ficticio muestra la función deshabilitada.

Se recibió Web Push real cifrado en Chrome con todas las ventanas de la app cerradas. Se comprobaron reapertura, preferencias, permisos rechazados y limpieza al cerrar sesión. Queda probar físicamente Android/iPhone usando HTTPS accesible desde el dispositivo; en iPhone/iPad se abre la PWA desde la pantalla de inicio.


Comprobación de persistencia del 19 de noviembre de 2026: los siete campos del perfil y la foto se conservaron al recargar, reiniciar una instancia aislada del backend e iniciar sesión desde un navegador nuevo. Se comprobaron también publicaciones con fotos, reclamos aceptados, evidencias, comentarios, respuestas a extravíos y notificaciones. Se verificó el acceso al backend sin `VITE_API_URL` y se restauró un respaldo en una base separada. La base de la demostración permaneció encendida durante las pruebas.
