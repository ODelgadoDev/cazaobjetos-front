# Flujo de recuperación y piloto

Actualización local del 18 de noviembre de 2026.

## Ocho ajustes

| Ajuste | Comportamiento |
| --- | --- |
| Ficha y solicitud | Detalle del hallazgo muestra información pública. Creo que es mío abre la solicitud. Escribir evidencia no adelanta una etapa de verificación. |
| Continuidad y estados | Una solicitud activa ofrece Ver mi reclamo. Listado y expediente comparten progreso. Rechazo/cancelación terminan en su resultado y la aceptación muestra que falta entregar. |
| Turno y acciones | El expediente indica quién debe actuar. Sus acciones y enlaces a pruebas/comentarios aparecen al principio. Mis reclamos abre las solicitudes por revisar cuando las hay, conservando la pestaña elegida explícitamente. |
| Resguardo | Seleccionar oficina explica su permanencia y requiere confirmar que el objeto ya se dejó allí antes de publicar o guardar. La ubicación original y la actual tienen etiquetas distintas. |
| Exploración | Búsqueda, ubicación, categoría, orden, estado y página van en la URL. Volver desde una ficha restaura también la posición del listado. Ubicaciones sugeridas compartidas en publicación y búsqueda, con texto libre para salones. |
| Borradores | Se conservan datos, archivos y clave de reintento mientras la cuenta sigue abierta en esta pestaña. Cambiar de pantalla o de pestaña de Reportar mantiene los borradores. Los vinculados se pueden continuar desde Reportar. Descartar pide confirmación. |
| Comparación | El propietario del extravío puede ver su reporte y el hallazgo vinculado juntos, con foto, fecha, lugar y descripción. Puede seguir buscando o iniciar la solicitud. |
| Novedades | El expediente avisa cuando hay eventos nuevos. Ver novedades actualiza historial/estado y conserva el comentario sin enviar. La bandeja mantiene sus pendientes. Mis reclamos distingue avisos sin leer de solicitudes que esperan revisión. |

Los borradores viven en memoria de la pestaña y se descartan al cerrar sesión. El navegador pide confirmación al recargar/cerrar si existe un borrador modificado. Una recarga confirmada pierde ese borrador y sus archivos. La búsqueda usa coincidencia de texto en ubicaciones existentes. Las sugerencias no reclasifican registros antiguos.

## Verificación local

Recorrido automatizado en Chrome con tres cuentas contra una base PostgreSQL desechable. Se comprobaron publicación del extravío sin imagen, hallazgo vinculado con foto real, confirmación previa de oficina, solicitud con prueba, comentarios nuevos sin pérdida del borrador, aceptación, entrega física confirmada por el solicitante y cierre del extravío vinculado. También rechazo, cancelación, acceso al reclamo existente, filtros/paginación/posición al volver, descarte de borradores y distinción entre pendientes y tareas.

Compilación Vite/PWA y revisión de cinco pantallas a 320, 390, 635, 820 y 1440 px en claro/oscuro. Las pruebas se ejecutaron con datos temporales.

## Render, Netlify e imágenes

Las fotos públicas, avatares y evidencias privadas se guardan actualmente como bytes en PostgreSQL. Para un piloto pequeño pueden continuar ahí, usando una base persistente con capacidad suficiente. La versión actual no conecta a R2.

Para Netlify y Render, la arquitectura recomendada es servir React/PWA en Netlify y enviar `/api/*` al backend Render mediante un proxy del mismo origen. Conservar `VITE_API_URL=/api/v1`, cookies HttpOnly/Secure y CSRF. La regla de API debe ir antes del fallback SPA a `/index.html`. Se necesita el hostname real de Render para configurarla. Validar inicio de sesión, fotos privadas y códigos por correo a través de ese origen HTTPS antes de invitar usuarios.

Cloudflare R2 encaja si se decide separar las imágenes de PostgreSQL. La integración pendiente debe utilizar un bucket privado y operaciones desde Java mediante su API compatible con S3. Guardar identificador, propietario y clave del archivo en la base. Las lecturas de evidencias deben seguir pasando por la autorización del reclamo. Conservar fotos anteriores durante la migración y coordinar las cargas/borrados con las transacciones y reintentos actuales antes de reemplazar su almacenamiento. El frontend no necesita credenciales de R2.

R2 Standard incluye 10 GB-mes, un millón de operaciones clase A y diez millones clase B al mes, con salida a Internet sin cargo por transferencia. Hay cobro al superar las franquicias. Referencia vigente consultada en [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/).

En Render Free el servicio se suspende tras 15 minutos sin tráfico entrante y el disco es efímero. Los recordatorios del servidor necesitan un proceso activo. Las claves VAPID actuales se guardan en archivo, así que el despliegue necesita un disco persistente o adaptar su carga a secretos duraderos antes de usar un disco efímero. PostgreSQL gratuito de Render tiene 1 GB y caduca a los 30 días. Sus servicios gratuitos bloquean SMTP saliente en 25, 465 y 587. El correo institucional también requiere resolver proveedor/transporte y probar entrega real. Referencia consultada en [Render](https://render.com/docs/free).

El proxy de Netlify tiene un límite de 26 segundos por solicitud, relevante si el backend tarda en despertar. [Rewrites y proxies de Netlify](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

Estos son preparativos y decisiones para el piloto. Quedan la configuración de las cuentas de hosting, hostname, base persistente, claves push, transporte de correo y prueba HTTPS en teléfono.
