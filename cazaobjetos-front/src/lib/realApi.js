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

export async function request(method, path, body, key) {
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
  const response = await fetch(`${BASE}${path}`, { method, body, headers, credentials: 'include' })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const fallback = { 401: 'Correo o contraseña incorrectos, cuenta sin verificar o sesión vencida.', 403: 'No tienes permiso o venció la sesión. Actualiza la página e intenta de nuevo.', 429: 'Demasiados intentos. Espera un minuto.' }
    if ([401, 403].includes(response.status)) csrf = null
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('co-session-expired'))
    throw Object.assign(new Error(errorBody.message || fallback[response.status] || `No se pudo completar la operación (${response.status}).`), { status: response.status })
  }
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
const person = (user) => ({ id: user.id, nombre: user.displayName || user.email || 'Usuario UTCH', correo: user.email, rol: roles[user.role] })
const knownPerson = (id) => id === usuario?.id ? usuario : { id, nombre: 'Usuario UTCH' }
const routeFor = (tipo) => tipo === 'hallazgos' ? '/found-items' : '/lost-reports'
const office = 'Oficina de profesores · mesa de objetos perdidos · edificio I'

export async function login(email, password) {
  await request('POST', '/auth/login', new URLSearchParams({ username: email.trim().toLowerCase(), password }))
  csrf = null
  await getCsrf()
  return { usuario: await getPerfil(), token: null }
}
export async function logout() {
  try { await request('POST', '/auth/logout') } finally { csrf = null; usuario = null }
}
export const getPerfil = async () => person(await request('GET', '/auth/me'))
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
    editar: responsible && open && !active,
    retirar: responsible && open && !active,
    delegar: responsible && open,
    dejarEnOficina: open && item.custody !== 'OFFICE' && (responsible || item.reporterId === usuario?.id),
  }
}
function mapFound(item, images = [], claims = [], delegates = []) {
  return {
    id: item.id, folio: folio('HAL', item.id), titulo: item.title, categoria: categoryLabels[item.category],
    estado: item.status === 'WITHDRAWN' ? 'retirado' : item.status === 'RETURNED' ? 'entregado' : item.custody === 'OFFICE' ? 'bajo_custodia' : 'con_finder',
    resguardo: item.custody === 'OFFICE' ? 'oficina' : 'persona', custodia: item.custody === 'OFFICE' ? office : null,
    autor: knownPerson(item.reporterId), gestor: delegates.find((d) => d.id === item.responsibleId) || knownPerson(item.responsibleId),
    fecha: item.foundOn, lugar: item.foundLocation, descripcionPublica: item.description,
    fotos: images, foto: images[0]?.url || null, permisos: permissionsFound(item, claims),
    puedeReclamar: item.status === 'AVAILABLE' && item.reporterId !== usuario?.id && item.responsibleId !== usuario?.id,
  }
}
function mapLost(item, images = [], claims = []) {
  const mine = item.ownerId === usuario?.id && item.status === 'ACTIVE'
  const linked = claims.some((claim) => claim.lostReportId === item.id && activeClaim(claim))
  return {
    id: item.id, folio: folio('EXT', item.id), titulo: item.title, categoria: categoryLabels[item.category],
    estado: { ACTIVE: 'activo', RECOVERED: 'recuperado', WITHDRAWN: 'retirado' }[item.status],
    autor: knownPerson(item.ownerId), fecha: item.lostOn, lugar: item.lostLocation, descripcion: item.description,
    fotos: images, foto: images[0]?.url || null, alertas: false,
    permisos: { editar: mine && !linked, retirar: mine && !linked, marcarRecuperado: mine && !linked },
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
    const [claims, delegates] = await Promise.all([item.responsibleId === usuario?.id ? myClaims() : [], listDelegados()])
    return mapFound(item, images, claims, delegates)
  }
  return mapLost(item, images, item.ownerId === usuario?.id ? await myClaims() : [])
}
export const getHallazgo = (id) => getPublication('hallazgos', id)
export const getExtravio = (id) => getPublication('extravios', id)
export async function misPublicaciones() {
  const [found, lost, claims, delegates] = await Promise.all([allPages('/found-items/mine'), allPages('/lost-reports/mine'), myClaims(), listDelegados()])
  const mapped = found.map((item) => mapFound(item, [], claims, delegates))
  return {
    hallazgos: mapped.filter((item) => item.autor.id === usuario.id),
    delegados: mapped.filter((item) => item.gestor.id === usuario.id && item.autor.id !== usuario.id),
    extravios: lost.map((item) => mapLost(item, [], claims)),
  }
}
const reportBody = (data) => ({ title: data.titulo.trim(), description: data.descripcion.trim(), category: categories[data.categoria], location: data.lugar.trim(), occurredOn: data.fecha })
export async function crearHallazgo(data) {
  const { id } = await request('POST', '/found-items', reportBody(data), data.requestKey)
  try {
    if (data.foto && !(await photos('hallazgos', id)).length) await agregarFoto('hallazgos', id, data.foto)
    if (data.enOficina) await marcarEnOficina(id)
    if (data.gestion === 'delegar') await delegarHallazgo(id, data.delegadoId)
  } catch (error) {
    // La publicación ya existe. Devolver su ID evita duplicarla al repetir el formulario.
    return { id, folio: folio('HAL', id), aviso: `El hallazgo se publicó. Completa sus fotos, resguardo o delegación desde Mis publicaciones. ${error.message}` }
  }
  return { id, folio: folio('HAL', id) }
}
export async function crearExtravio(data) {
  const result = await request('POST', '/lost-reports', reportBody(data), data.requestKey)
  return { id: result.id, folio: folio('EXT', result.id) }
}
export const editarHallazgo = (id, data) => request('PUT', `/found-items/${id}`, reportBody(data))
export const editarExtravio = (id, data) => request('PUT', `/lost-reports/${id}`, reportBody(data))
export const retirarHallazgo = (id) => request('POST', `/found-items/${id}/withdraw`)
export const retirarExtravio = (id) => request('POST', `/lost-reports/${id}/withdraw`)
export const marcarExtravioRecuperado = (id) => request('POST', `/lost-reports/${id}/recover`)
export const marcarEnOficina = (id) => request('POST', `/found-items/${id}/office`)
export async function delegarHallazgo(id, responsibleId) {
  const item = await request('GET', `/found-items/${id}`)
  if (item.responsibleId !== responsibleId) await request('POST', `/found-items/${id}/delegate`, { responsibleId })
}
export async function agregarFoto(tipo, id, file) {
  const form = new FormData(); form.append('file', file)
  const photo = await request('POST', `${routeFor(tipo)}/${id}/photos`, form)
  return { ...photo, url: `${BASE}${routeFor(tipo)}/${id}/photos/${photo.id}` }
}
export const eliminarFoto = (tipo, id, photoId) => request('DELETE', `${routeFor(tipo)}/${id}/photos/${photoId}`)
export async function crearReclamo(data) {
  const result = await request('POST', `/found-items/${data.hallazgoId}/claims`, { privateDescription: data.descripcionPrivada, lostReportId: data.lostReportId || null }, data.requestKey)
  return { id: result.id }
}
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
export const rechazarReclamo = (id) => request('POST', `/claims/${id}/reject`)
export const cancelarReclamo = (id) => request('POST', `/claims/${id}/cancel`)
export const marcarRecuperado = (id) => request('POST', `/claims/${id}/complete`)
