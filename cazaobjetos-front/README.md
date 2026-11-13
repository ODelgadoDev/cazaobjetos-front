# CazaObjetos UTCH — Front (React + Vite)

## Arrancar
```bash
npm install
npm run dev
```
Abre http://localhost:5173. Sin back, funciona con datos de prueba (mock).
Usuarios de prueba (cualquier contraseña): `estudiante@utch.edu.mx`, `docente@utch.edu.mx`, `vigilancia@utch.edu.mx`, `admin@utch.edu.mx`.

## Conectar con el back
1. Copia `.env.example` a `.env` y pon `VITE_API_URL=http://localhost:3000/api` (la URL de su back).
2. Todo el acceso a datos está en `src/lib/api.js`. Los endpoints ahí escritos son el **contrato propuesto**: acuérdenlo con quien hace el back y ajusten solo ese archivo.

### Endpoints que espera el front (por acordar con el back)
| Pantalla | Método y ruta |
|---|---|
| Crear cuenta | `POST /auth/registro` `{ nombre, correo, password }` |
| Verificar correo | `POST /auth/verificar` `{ correo, codigo }` · `POST /auth/verificar/reenviar` `{ correo }` |
| Recuperar contraseña | `POST /auth/recuperar` `{ correo }` · `POST /auth/recuperar/confirmar` `{ correo, codigo, password }` |
| Iniciar sesión | `POST /auth/login` → si falta verificar, error con `code: 'CORREO_NO_VERIFICADO'` |
| Mi cuenta | `GET /usuarios/yo` · `POST /usuarios/yo/password` `{ actual, nueva }` |
| Mis publicaciones | `GET /publicaciones/mias` → `{ hallazgos, delegados, extravios }`, cada item con `permisos` |
| Acciones de hallazgo | `POST /hallazgos/:id/resguardo` · `POST /hallazgos/:id/delegar` · `DELETE /hallazgos/:id` |
| Acciones de extravío | `POST /extravios/:id/recuperado` · `DELETE /extravios/:id` |
| Editar publicación | `PATCH /hallazgos/:id` · `PATCH /extravios/:id` · `POST/DELETE /{hallazgos\|extravios}/:id/fotos[/:fotoId]` |
| Consultar extravíos | `GET /extravios?q&categoria&zona&orden&estado&page&pageSize` → `{ items, total }` · `GET /extravios/:id` |
| Detalle de reclamo | `GET /reclamos/:id` → reclamo + `hallazgo`, `gestor`, `rolEnReclamo`, `permisos` |

Los botones de cada publicación y reclamo se muestran según el objeto `permisos` que devuelve el back (en el mock se calcula en `api.js`).
Errores: el front lee `message` (texto para el usuario) y `code` del cuerpo JSON.

## Estructura
- `src/index.css` — tokens y componentes de la guía de estilo (colores, tipografía, chips, botones…)
- `public/utch-logo.png` — logotipo de la Universidad Tecnológica de Chihuahua
- `src/lib/constants.js` — categorías, casetas y estados de reclamo
- `src/pages/` — Login, Registro, Verificar, Recuperar, Explorar (abre en «Se buscan»; «Encontrados» con `?tab=encontrados`), Reclamo, MisReclamos, DetalleReclamo, Reportar, MisPublicaciones, EditarPublicacion, DetalleExtravio, MiCuenta, Vigilancia
- En modo de prueba, el código de verificación y de recuperación es `123456`.
- `src/components/` — Layout (barra superior e inferior), Chip, ObjectCard, Toast, Icons

## Flujo implementado (según los diagramas del back)
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
