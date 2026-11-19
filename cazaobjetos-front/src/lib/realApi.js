import { mutePushForLogin } from './pushDevice.js'
// Adaptador del contrato REST del backend Java a los modelos de las pantallas.
const BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
let usuario = null
let csrf = null
let csrfRequest = null
export function setUsuario(value) { usuario = value }

async function getCsrf() {
  if (!csrfRequest) {
    csrfRequest = fetch(`${BASE}/auth/csrf`, { credentials: 'include' })
      .then(async (response) => {
        // Una sesión revocada se descarta en su siguiente petición.
        if (response.status === 401) response = await fetch(`${BASE}/auth/csrf`, { credentials: 'include' })
        if (!response.ok) throw new Error('No se pudo iniciar la sesión. Comprueba que el backend esté disponible.')
        csrf = await response.json()
      })
      .finally(() => { csrfRequest = null })
  }
  await csrfRequest
}

export async function request(method, path, body, key, { signal } = {}) {
  const headers = new Headers()
  const write = !['GET', 'HEAD'].includes(method)
  if (write) {
    if (!csrf) await getCsrf()
    headers.set(csrf.headerName, csrf.token)
  }
  if (key) headers.set('Idempotency-Key', key)
  if (body != null && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }
  const response = await fetch(`${BASE}${path}`, { method, body, headers, credentials: 'include', signal })
  if (signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError')
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const fallback = { 401: 'Correo o contraseña incorrectos, cuenta sin verificar o sesión vencida.', 403: 'No tienes permiso o venció la sesión. Actualiza la página e intenta de nuevo.', 429: 'Demasiados intentos. Espera un minuto.' }
    if ([401, 403].includes(response.status)) csrf = null
    if (response.status === 401 && (path === '/auth/me' || !path.startsWith('/auth/'))) window.dispatchEvent(new Event('co-session-expired'))
    throw Object.assign(new Error(errorBody.message || fallback[response.status] || `No se pudo completar la operación (${response.status}).`), { status: response.status })
  }
  if (write && !path.startsWith('/auth/')) window.dispatchEvent(new Event('co-notifications-refresh'))
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

const categories = { 'Electrónica': 'ELECTRONICS', 'Documentos': 'DOCUMENTS', 'Llaves': 'KEYS', 'Ropa/Mochilas': 'CLOTHING', 'Otro': 'OTHER' }
const categoryLabels = Object.fromEntries(Object.entries(categories).map(([label, value]) => [value, label]))
const roles = { STUDENT: 'estudiante', TEACHER: 'docente', SECRETARY: 'secretaria' }
const claimStates = { PENDING: 'enviado', ACCEPTED: 'aprobado', REJECTED: 'rechazado', CANCELLED: 'cancelado', COMPLETED: 'entregado', CLOSED: 'cerrado' }
const activeClaim = (claim) => ['PENDING', 'ACCEPTED'].includes(claim.status)
const folio = (prefix, id) => `#${prefix}-${id.slice(0, 8).toUpperCase()}`
const person = (user) => ({
  id: user.id, nombre: user.displayName || user.email || 'Usuario UTCH', correo: user.email, rol: roles[user.role],
  alias: user.alias ?? null, salon: user.classroom ?? null, grupo: user.groupName ?? null,
  curso: user.course ?? null, carrera: user.degree ?? null, edificio: user.building ?? null,
  matricula: user.studentNumber ?? null,
  fotoPerfil: user.avatarVersion ? `${BASE}/auth/me/photo?v=${encodeURIComponent(user.avatarVersion)}` : null,
})
const knownPerson = (id, nombre, carrera) => id === usuario?.id ? { ...usuario, carrera: carrera === undefined ? usuario.carrera : carrera } : { id, nombre: nombre || 'Usuario UTCH', carrera }
const routeFor = (tipo) => tipo === 'hallazgos' ? '/found-items' : '/lost-reports'
const office = 'Oficina de profesores · mesa de objetos perdidos · edificio I'

export async function login(email, password) {
  await mutePushForLogin()
  await request('POST', '/auth/login', new URLSearchParams({ username: email.trim().toLowerCase(), password }))
  csrf = null
  await getCsrf()
  return { usuario: await getPerfil(), token: null }
}
export async function logout() {
  try {
    await request('POST', '/auth/logout')
  } catch (error) {
    // Refresh a stale CSRF token once; a failed logout keeps the local session visible.
    if (error.status === 403) await request('POST', '/auth/logout')
    else if (error.status !== 401) throw error
  }
  csrf = null; usuario = null
}
export const getPerfil = async () => person(await request('GET', '/auth/me'))
export const guardarPerfil = async (data) => person(await request('PUT', '/auth/me', {
  displayName: data.nombre, alias: data.alias, classroom: data.salon, groupName: data.grupo,
  course: data.curso, degree: data.carrera, building: data.edificio,
}))
export async function subirFotoPerfil(file) {
  const body = new FormData()
  body.set('file', file)
  return person(await request('PUT', '/auth/me/photo', body))
}
export const quitarFotoPerfil = async () => person(await request('DELETE', '/auth/me/photo'))
export const registrar = ({ nombre, correo, password }) => request('POST', '/auth/register', { displayName: nombre, email: correo, password })
export const verificarCorreo = (correo, codigo) => request('POST', '/auth/verify-email', { token: codigo.trim() })
export const reenviarCodigo = (correo) => request('POST', '/auth/resend-verification', { email: correo })
export const solicitarRecuperacion = (correo) => request('POST', '/auth/forgot-password', { email: correo })
export const restablecerPassword = ({ codigo, password }) => request('POST', '/auth/reset-password', { token: codigo.trim(), newPassword: password })
export async function cambiarPassword({ actual, nueva }) {
  await request('POST', '/auth/change-password', { currentPassword: actual, newPassword: nueva })
  csrf = null
  // Consume la sesión anterior para poder obtener un CSRF anónimo al volver al login.
  await request('GET', '/auth/me').catch(() => {})
  window.dispatchEvent(new Event('co-session-expired'))
}

async function allPages(path, params = {}) {
  const rows = []
  for (let page = 0; page <= 10000; page++) {
    const result = await request('GET', `${path}?${new URLSearchParams({ ...params, page, pageSize: 100 })}`)
    rows.push(...result.items)
    if (!result.hasNext) return rows
  }
  throw new Error('El listado es demasiado grande. Usa los filtros del catálogo.')
}
async function myClaims() { return allPages('/claims/search') }
async function photos(tipo, id) {
  const path = `${routeFor(tipo)}/${id}/photos`
  return (await request('GET', path)).map((photo) => ({ ...photo, url: `${BASE}${path}/${photo.id}` }))
}
function permissionsFound(item, claims = []) {
  const responsible = item.responsibleId === usuario?.id
  const open = item.status === 'AVAILABLE'
  const active = claims.some((claim) => claim.foundItemId === item.id && activeClaim(claim))
  return {
    editar: responsible && open,
    editarFotos: responsible && open && !active,
    cambiarResguardo: open && (responsible || item.reporterId === usuario?.id),
    retirar: responsible && open && !active,
    delegar: false,
    dejarEnOficina: open && item.custody !== 'OFFICE' && (responsible || item.reporterId === usuario?.id),
  }
}
function mapFound(item, images = [], claims = [], delegates = []) {
  return {
    id: item.id, sourceLostReportId: item.sourceLostReportId || null, folio: folio('HAL', item.id), titulo: item.title, categoria: categoryLabels[item.category],
    estado: item.status === 'WITHDRAWN' ? 'retirado' : item.status === 'RETURNED' ? 'entregado' : item.custody !== 'WITH_FINDER' ? 'bajo_custodia' : 'con_finder',
    resguardo: { OFFICE: 'oficina', WITH_TEACHER: 'docente', WITH_FINDER: 'persona' }[item.custody],
    custodia: item.custody === 'OFFICE' ? (item.custodyLocation || office) : item.custody === 'WITH_TEACHER' ? `Con ${item.teacherName}${item.custodyLocation ? ' · ' + item.custodyLocation : ''}` : null,
    docente: item.teacherName || '', ubicacionResguardo: item.custodyLocation || '',
    autor: knownPerson(item.reporterId, item.reporterName, item.reporterDegree), gestor: delegates.find((d) => d.id === item.responsibleId) || knownPerson(item.responsibleId, item.responsibleName, item.responsibleDegree),
    fecha: item.foundOn, lugar: item.foundLocation, descripcionPublica: item.description,
    fotos: images, foto: images[0]?.url || null, permisos: permissionsFound(item, claims),
    reclamoActivoId: claims.find((claim) => claim.foundItemId === item.id && claim.claimantId === usuario?.id && activeClaim(claim))?.id || null,
    puedeReclamar: item.status === 'AVAILABLE' && item.reporterId !== usuario?.id && item.responsibleId !== usuario?.id,
  }
}
function mapLost(item, images = [], claims = []) {
  const mine = item.ownerId === usuario?.id && item.status === 'ACTIVE'
  const linked = claims.some((claim) => claim.lostReportId === item.id && activeClaim(claim))
  return {
    id: item.id, folio: folio('EXT', item.id), titulo: item.title, categoria: categoryLabels[item.category],
    estado: { ACTIVE: 'activo', RECOVERED: 'recuperado', WITHDRAWN: 'retirado' }[item.status],
    autor: knownPerson(item.ownerId, item.ownerName, item.ownerDegree), fecha: item.lostOn, lugar: item.lostLocation, descripcion: item.description, tieneRespuesta: !!item.hasResponse,
    fotos: images, foto: images[0]?.url || null, alertas: false,
    permisos: { editar: mine, editarFotos: mine && !linked, vincular: mine && !linked, retirar: mine && !linked, marcarRecuperado: mine && !linked },
  }
}
function catalogParams({ q = '', categoria = 'Todos', zona = 'Todos', orden = 'recientes', estado = 'activo', page = 1, pageSize = 5 }, found) {
  const params = new URLSearchParams({ q, page: page - 1, pageSize, sort: orden === 'antiguos' ? 'OLDEST' : 'RECENT' })
  if (categoria !== 'Todos') params.set('category', categories[categoria])
  if (zona !== 'Todos') params.set('location', zona)
  if (found) params.set('status', 'AVAILABLE')
  else if (estado !== 'Todos') params.set('status', estado === 'recuperado' ? 'RECOVERED' : 'ACTIVE')
  return params
}
export async function listHallazgos(params = {}) {
  const data = await request('GET', `/found-items?${catalogParams(params, true)}`)
  return { ...data, items: await Promise.all(data.items.map(async (item) => mapFound(item, await photos('hallazgos', item.id)))) }
}
export async function listExtravios(params = {}) {
  const data = await request('GET', `/lost-reports?${catalogParams(params, false)}`)
  return { ...data, items: await Promise.all(data.items.map(async (item) => mapLost(item, await photos('extravios', item.id)))) }
}
export const listDelegados = async () => (await allPages('/responsibles')).map(person)

async function getPublication(tipo, id) {
  const path = routeFor(tipo)
  let item
  try { item = await request('GET', `${path}/${id}`) } catch (error) {
    if (error.status !== 404) throw error
    // Los retirados se recuperan del historial autorizado del usuario.
    item = (await allPages(`${path}/mine`, { status: 'WITHDRAWN' })).find((row) => row.id === id)
    if (!item) throw error
  }
  const images = await photos(tipo, id)
  if (tipo === 'hallazgos') {
    const [claims, delegates] = await Promise.all([myClaims(), listDelegados()])
    return mapFound(item, images, claims, delegates)
  }
  return mapLost(item, images, item.ownerId === usuario?.id ? await myClaims() : [])
}
export const getHallazgo = (id) => getPublication('hallazgos', id)
export const getExtravio = (id) => getPublication('extravios', id)
export async function misExtraviosParaReclamo() {
  const [lost, claims] = await Promise.all([allPages('/lost-reports/mine', { status: 'ACTIVE' }), myClaims()])
  return lost.map((item) => mapLost(item, [], claims)).filter((item) => item.permisos.vincular)
}
export async function misPublicaciones() {
  const [found, lost, claims, delegates] = await Promise.all([allPages('/found-items/mine'), allPages('/lost-reports/mine'), myClaims(), listDelegados()])
  const mapped = await Promise.all(found.map(async (item) => mapFound(item, await photos('hallazgos', item.id), claims, delegates)))
  return {
    hallazgos: mapped.filter((item) => item.autor.id === usuario.id),
    delegados: mapped.filter((item) => item.gestor.id === usuario.id && item.autor.id !== usuario.id),
    extravios: await Promise.all(lost.map(async (item) => mapLost(item, await photos('extravios', item.id), claims))),
  }
}
const reportBody = (data) => ({ title: data.titulo.trim(), description: data.descripcion.trim(), category: categories[data.categoria], location: data.lugar.trim(), occurredOn: data.fecha })
export async function crearHallazgo(data) {
  const body = new FormData()
  body.append('request', new Blob([JSON.stringify({ report: reportBody(data), sourceLostReportId: data.sourceLostReportId || null, custody: custodyBody(data), photoUrl: data.imagen?.url || null, referenceImage: !!data.imagen?.referenceImage })], { type: 'application/json' }))
  const file = data.imagen?.file || data.foto
  if (file) body.append('file', file)
  const { id } = await request('POST', '/found-items/publish', body, data.requestKey)
  return { id, folio: folio('HAL', id) }
}
export async function getPosiblesHallazgos(id, page = 0) {
  const result = await request('GET', `/lost-reports/${id}/matches?page=${page}&pageSize=10`)
  return { ...result, items: await Promise.all(result.items.map(async (item) => mapFound(item, await photos('hallazgos', item.id)))) }
}
export async function crearExtravio(data) {
  const result = await request('POST', '/lost-reports', reportBody(data), data.requestKey)
  if (data.imagen) {
    try {
      if (!(await photos('extravios', result.id)).length) {
        if (data.imagen.file) await agregarFoto('extravios', result.id, data.imagen.file, data.imagen.referenceImage)
        else await importarFoto(result.id, data.imagen.url, data.imagen.referenceImage)
      }
    } catch (error) {
      return { id: result.id, aviso: `El reporte se guardó. Vuelve a adjuntar la imagen desde aquí. ${error.message}` }
    }
  }
  return { id: result.id, folio: folio('EXT', result.id) }
}
export const editarHallazgo = (id, data) => request('PUT', `/found-items/${id}`, reportBody(data))
export const editarExtravio = (id, data) => request('PUT', `/lost-reports/${id}`, reportBody(data))
export const retirarHallazgo = (id) => request('POST', `/found-items/${id}/withdraw`)
export const retirarExtravio = (id) => request('POST', `/lost-reports/${id}/withdraw`)
export const marcarExtravioRecuperado = (id) => request('POST', `/lost-reports/${id}/recover`)
const custodyBody = (data) => ({ custody: { persona: 'WITH_FINDER', docente: 'WITH_TEACHER', oficina: 'OFFICE' }[data.resguardo || 'persona'], teacherName: data.resguardo === 'docente' ? data.docente.trim() : null, location: data.ubicacionResguardo?.trim() || null })
export const cambiarResguardo = (id, data) => request('PUT', `/found-items/${id}/custody`, custodyBody(data))
export const marcarEnOficina = (id) => request('POST', `/found-items/${id}/office`)
export async function delegarHallazgo(id, responsibleId) {
  const item = await request('GET', `/found-items/${id}`)
  if (item.responsibleId !== responsibleId) await request('POST', `/found-items/${id}/delegate`, { responsibleId })
}
export async function agregarFoto(tipo, id, file, referenceImage = false) {
  const form = new FormData(); form.append('file', file)
  form.append('referenceImage', String(referenceImage))
  const photo = await request('POST', `${routeFor(tipo)}/${id}/photos`, form)
  return { ...photo, url: `${BASE}${routeFor(tipo)}/${id}/photos/${photo.id}` }
}
export async function importarFoto(id, url, referenceImage = true, tipo = 'extravios') {
  const path = `${routeFor(tipo)}/${id}/photos`
  const photo = await request('POST', `${path}/import`, { url, referenceImage })
  return { ...photo, url: `${BASE}${path}/${photo.id}` }
}
export const eliminarFoto = (tipo, id, photoId) => request('DELETE', `${routeFor(tipo)}/${id}/photos/${photoId}`)
export async function crearReclamo(data) {
  const requestBody = { privateDescription: data.descripcionPrivada, lostReportId: data.lostReportId || null }
  let body = requestBody
  if (data.evidencias?.length || data.evidenceUrls?.length) {
    body = new FormData()
    body.append('request', new Blob([JSON.stringify(requestBody)], { type: 'application/json' }))
    data.evidencias?.forEach((file) => body.append('files', file))
    if (data.evidenceUrls?.length) body.append('urls', new Blob([JSON.stringify(data.evidenceUrls)], { type: 'application/json' }))
  }
  return request('POST', `/found-items/${data.hallazgoId}/claims`, body, data.requestKey)
}
export const getActividadReclamo = (id, page = 0) => request('GET', `/claims/${id}/activity?page=${page}&pageSize=20`)
export const comentarReclamo = (id, body, key) => request('POST', `/claims/${id}/comments`, { body }, key)
export const getEvidenciasReclamo = async (id) => (await request('GET', `/claims/${id}/evidence`)).map((image) => ({ ...image, url: `${BASE}/claims/${id}/evidence/${image.id}` }))
export async function agregarEvidenciaReclamo(id, file, key) {
  const body = new FormData(); body.append('file', file)
  return request('POST', `/claims/${id}/evidence`, body, key)
}
export const agregarEnlaceEvidenciaReclamo = (id, url, key) =>
  request('POST', `/claims/${id}/evidence/import`, { url, referenceImage: true }, key)
export async function getReclamo(id) {
  const detail = await request('GET', `/claims/${id}`)
  const { claim, foundItem, responsible, claimant } = detail
  let images = []
  // El detalle de un reclamo cerrado puede seguir visible al solicitante tras un retiro.
  if (foundItem.status !== 'WITHDRAWN' || foundItem.responsibleId === usuario?.id || foundItem.reporterId === usuario?.id) images = await photos('hallazgos', foundItem.id)
  const found = mapFound(foundItem, images)
  const mine = claim.claimantId === usuario?.id
  return {
    id: claim.id, folio: folio('REC', claim.id), titulo: found.titulo, hallazgoId: found.id,
    estado: claimStates[claim.status], descripcionPrivada: claim.privateDescription, creado: claim.createdAt,
    gestor: person(responsible), solicitante: person(claimant), hallazgo: found, custodia: found.custodia,
    entrega: claim.completedAt ? { fecha: claim.completedAt, agente: `Confirmado por ${claimant.displayName}` } : null,
    puedeAportar: detail.canContribute,
    rolEnReclamo: mine ? 'solicitante' : 'responsable',
    permisos: {
      aceptar: !mine && claim.status === 'PENDING', rechazar: !mine && claim.status === 'PENDING',
      cancelar: mine && activeClaim(claim), confirmarRecibido: mine && claim.status === 'ACCEPTED',
    },
  }
}
export async function misReclamos() {
  const claims = await myClaims()
  const details = await Promise.all(claims.map((claim) => getReclamo(claim.id)))
  return {
    activos: details.filter((claim) => claim.rolEnReclamo === 'solicitante' && ['enviado', 'aprobado'].includes(claim.estado)),
    porRevisar: details.filter((claim) => claim.rolEnReclamo === 'responsable' && ['enviado', 'aprobado'].includes(claim.estado)),
    historial: details.filter((claim) => !['enviado', 'aprobado'].includes(claim.estado)), alertas: [],
  }
}
export const aprobarReclamo = (id) => request('POST', `/claims/${id}/accept`)
export const rechazarReclamo = (id, reason) => request('POST', `/claims/${id}/reject`, reason ? { reason } : undefined)
export const cancelarReclamo = (id) => request('POST', `/claims/${id}/cancel`)
export const marcarRecuperado = (id) => request('POST', `/claims/${id}/complete`)

export const getNotificationSummary = (signal) => request('GET', '/notifications/summary', undefined, undefined, { signal })
export const listNotifications = ({ filter = 'ALL', page = 0, pageSize = 20 } = {}, signal) => request('GET', `/notifications?${new URLSearchParams({ filter, page, pageSize })}`, undefined, undefined, { signal })
export const readNotification = (id) => request('POST', `/notifications/${id}/read`)
export const clearReadNotifications = () => request('POST', '/notifications/clear-read')

export const getPushConfig = () => request('GET', '/push/config')
export const getPushPreference = () => request('GET', '/push/preferences')
export const savePushPreference = (dailyReminders) => request('PUT', '/push/preferences', { dailyReminders })
export const registerPush = (data) => request('POST', '/push/subscriptions', { expectedUserId: data.expectedUserId, endpoint: data.endpoint, keys: data.keys })
export const disablePush = (id) => request('DELETE', `/push/subscriptions/${id}`)
export const testPush = (subscriptionId) => request('POST', '/push/test', { subscriptionId })

// Deduplicate publication lookups for notifications referring to the same object.
export async function notificationPhotos(notices) {
  const cache = new Map()
  const get = (path) => {
    if (!cache.has(path)) cache.set(path, request('GET', path).catch(() => null))
    return cache.get(path)
  }
  const firstPhoto = async (path, label) => {
    const images = await get(path)
    return images?.[0] ? { url: `${BASE}${path}/${images[0].id}`, label } : null
  }
  return Object.fromEntries(await Promise.all(notices.map(async (notice) => {
    const images = []
    if (notice.targetType === 'CLAIM') {
      const detail = await get(`/claims/${notice.targetId}`)
      const found = detail?.foundItem
      if (found && (found.status !== 'WITHDRAWN' || [found.reporterId, found.responsibleId].includes(usuario?.id))) {
        images.push(await firstPhoto(`/found-items/${found.id}/photos`, 'Objeto encontrado'))
      }
      if (detail?.claim.lostReportId) images.push(await firstPhoto(`/lost-reports/${detail.claim.lostReportId}/photos`, 'Objeto perdido'))
    } else if (notice.targetType === 'FOUND_ITEM') {
      images.push(await firstPhoto(`/found-items/${notice.targetId}/photos`, 'Objeto encontrado'))
    } else if (notice.targetType === 'LOST_REPORT') {
      images.push(await firstPhoto(`/lost-reports/${notice.targetId}/photos`, 'Objeto perdido'))
      if (notice.responseId) {
        const replies = await get(`/lost-reports/${notice.targetId}/responses`)
        const reply = replies?.find((item) => item.id === notice.responseId)
        if (reply?.photoType === 'UPLOAD') images.push({ url: `${BASE}/lost-reports/${notice.targetId}/responses/${reply.id}/photo`, label: 'Posible hallazgo' })
      }
    }
    return [notice.id, images.filter(Boolean).slice(0, 2)]
  })))
}
