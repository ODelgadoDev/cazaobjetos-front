/**
 * Capa de datos del front, alineada a los diagramas del back
 * (flujo de devolución, ER, estados del reclamo y secuencia).
 *
 * - Sin VITE_API_URL -> datos de prueba (mock) en memoria.
 * - Con VITE_API_URL -> back real. Los endpoints son el CONTRATO PROPUESTO:
 *   acuérdenlo con quien hace el back y ajusten solo este archivo.
 */
import { seed } from './mockData.js'
import { ESTADOS_ACTIVOS, ESTADOS_CERRADOS } from './constants.js'

const BASE = import.meta.env.VITE_API_URL || ''
export const USE_MOCK = !BASE

let token = sessionStorage.getItem('co_token') || null
let yo = null
export const setToken = (t) => {
  token = t
  t ? sessionStorage.setItem('co_token', t) : sessionStorage.removeItem('co_token')
}
export const setUsuario = (u) => { yo = u }

async function http(method, path, body, isForm = false) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body && !isForm) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined })
  if (!res.ok) {
    let cuerpo = {}
    try { cuerpo = await res.json() } catch {}
    const err = new Error(cuerpo.message || 'Ocurrió un error. Intenta de nuevo.')
    err.status = res.status
    err.code = cuerpo.code // p. ej. 'CORREO_NO_VERIFICADO'
    throw err
  }
  if (res.status === 204) return null
  return (res.headers.get('content-type') || '').includes('json') ? res.json() : res.text()
}

// ---------- Mock ----------
const db = structuredClone(seed)
db.pendientes = {} // registros sin verificar: correo -> usuario
db.passwords = {} // solo usuarios creados o cambiados en el mock; los del seed aceptan cualquier contraseña
let nextId = 1000
const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 250))
const fail = (m, code) => Promise.reject(Object.assign(new Error(m), { code }))
const hallazgoDe = (r) => db.hallazgos.find((h) => h.id === r.hallazgoId)
const estadoLibre = (h) => (h.resguardo === 'oficina' ? 'bajo_custodia' : 'con_finder')
const reclamo = (id) => db.reclamos.find((r) => r.id === Number(id))
const extravio = (id) => db.extravios.find((e) => e.id === Number(id))
const esStaff = () => ['vigilancia', 'administrador'].includes(yo?.rol)
const CODIGO_MOCK = '123456'
const persona = ({ id, nombre, correo }) => ({ id, nombre, correo })
const leerArchivo = (file) => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(r.result)
  r.onerror = () => rej(new Error('No pudimos leer la imagen.'))
  r.readAsDataURL(file)
})
// Fecha + hora del formulario -> ISO
const aISO = (fecha, hora) => new Date(`${fecha}T${hora || '00:00'}`).toISOString()

// Permisos por publicación. Con el back real, se espera que cada item llegue con su objeto `permisos`.
function permisosHallazgo(h) {
  const soyAutor = h.autor?.id === yo.id
  const soyGestor = h.gestor?.id === yo.id
  const abierto = h.estado !== 'entregado'
  const conReclamo = db.reclamos.some((r) => r.hallazgoId === h.id && ESTADOS_ACTIVOS.includes(r.estado))
  const puedo = soyAutor || soyGestor || esStaff()
  return {
    editar: puedo && abierto,
    dejarEnOficina: puedo && abierto && h.resguardo === 'persona',
    delegar: (soyGestor || esStaff()) && abierto && !conReclamo,
    retirar: (soyAutor || esStaff()) && abierto && !conReclamo,
  }
}
function permisosExtravio(e) {
  const mio = e.autor?.id === yo.id || esStaff()
  const activo = e.estado === 'activo'
  return { editar: mio && activo, retirar: mio && activo, marcarRecuperado: mio && activo }
}

// ---------- Auth ----------
export async function login(email, password) {
  if (!USE_MOCK) return http('POST', '/auth/login', { email, password })
  const correo = email.trim().toLowerCase()
  if (db.pendientes[correo]) return fail('Tu correo aún no está verificado. Ingresa el código que te enviamos.', 'CORREO_NO_VERIFICADO')
  const u = db.usuarios[correo]
  if (!u) return fail('Correo o contraseña incorrectos.')
  if (db.passwords[correo] && db.passwords[correo] !== password) return fail('Correo o contraseña incorrectos.')
  return wait({ token: 'mock-token', usuario: u })
}

// data: { nombre, correo, password } -> el back envía un código al correo
export async function registrar({ nombre, correo, password }) {
  if (!USE_MOCK) return http('POST', '/auth/registro', { nombre, correo, password })
  const c = correo.trim().toLowerCase()
  if (db.usuarios[c] || db.pendientes[c]) return fail('Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.')
  const id = nextId++
  db.pendientes[c] = { id, nombre: nombre.trim(), correo: c, matricula: c.split('@')[0].replace(/\D/g, '') || null, carrera: null, rol: 'estudiante' }
  db.passwords[c] = password
  return wait({ ok: true })
}

export async function verificarCorreo(correo, codigo) {
  if (!USE_MOCK) return http('POST', '/auth/verificar', { correo, codigo })
  const c = correo.trim().toLowerCase()
  if (!db.pendientes[c]) return fail(db.usuarios[c] ? 'Este correo ya está verificado. Inicia sesión.' : 'No hay un registro pendiente con ese correo.')
  if (codigo !== CODIGO_MOCK) return fail('El código no es correcto o ya expiró.')
  db.usuarios[c] = db.pendientes[c]
  delete db.pendientes[c]
  return wait({ ok: true })
}

export async function reenviarCodigo(correo) {
  if (!USE_MOCK) return http('POST', '/auth/verificar/reenviar', { correo })
  return wait({ ok: true })
}

// Recuperar contraseña: 1) pedir código  2) usarlo para poner una nueva
export async function solicitarRecuperacion(correo) {
  if (!USE_MOCK) return http('POST', '/auth/recuperar', { correo })
  return wait({ ok: true }) // siempre ok: no revelamos si el correo existe
}

export async function restablecerPassword({ correo, codigo, password }) {
  if (!USE_MOCK) return http('POST', '/auth/recuperar/confirmar', { correo, codigo, password })
  if (codigo !== CODIGO_MOCK) return fail('El código no es correcto o ya expiró.')
  db.passwords[correo.trim().toLowerCase()] = password
  return wait({ ok: true })
}

// ---------- Mi cuenta ----------
export async function getPerfil() {
  if (!USE_MOCK) return http('GET', '/usuarios/yo')
  return wait(yo)
}

export async function cambiarPassword({ actual, nueva }) {
  if (!USE_MOCK) return http('POST', '/usuarios/yo/password', { actual, nueva })
  if (db.passwords[yo.correo] && db.passwords[yo.correo] !== actual) return fail('La contraseña actual no es correcta.')
  db.passwords[yo.correo] = nueva
  return wait({ ok: true })
}

// ---------- Hallazgos ----------
export async function listHallazgos({ q = '', categoria = 'Todos', zona = 'Todos', orden = 'recientes', page = 1, pageSize = 5 } = {}) {
  if (!USE_MOCK) return http('GET', `/hallazgos?${new URLSearchParams({ q, categoria, zona, orden, page, pageSize })}`) // -> { items, total }
  let items = db.hallazgos.filter((h) => h.estado !== 'entregado')
  if (q) items = items.filter((h) => (h.titulo + h.lugar + h.categoria).toLowerCase().includes(q.toLowerCase()))
  if (categoria !== 'Todos') items = items.filter((h) => h.categoria === categoria)
  if (zona !== 'Todos') items = items.filter((h) => h.zona === zona)
  items.sort((a, b) => (orden === 'recientes' ? new Date(b.fecha) - new Date(a.fecha) : new Date(a.fecha) - new Date(b.fecha)))
  return wait({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length })
}

export async function getHallazgo(id) {
  if (!USE_MOCK) return http('GET', `/hallazgos/${id}`)
  const h = db.hallazgos.find((x) => x.id === Number(id))
  return h ? wait({ ...h, permisos: permisosHallazgo(h) }) : fail('No encontramos ese objeto.')
}

// Responsables posibles al delegar: docentes o secretaría
export async function listDelegados() {
  if (!USE_MOCK) return http('GET', '/usuarios/delegados')
  return wait(db.delegados)
}

/**
 * data: { titulo, categoria, lugar, fecha, hora, descripcion, foto, fotoPreview,
 *         gestion: 'yo' | 'delegar', delegadoId, enOficina: bool, caseta }
 */
export async function crearHallazgo(data) {
  if (!USE_MOCK) {
    const f = new FormData()
    const { fotoPreview, ...resto } = data
    Object.entries(resto).forEach(([k, v]) => v != null && f.append(k, v))
    return http('POST', '/hallazgos', f, true)
  }
  const gestor = data.gestion === 'yo' ? { id: yo.id, nombre: yo.nombre, correo: yo.correo } : db.delegados.find((d) => d.id === Number(data.delegadoId))
  const id = nextId++
  const h = {
    id, autor: persona(yo), fotos: data.fotoPreview ? [{ id: nextId++, url: data.fotoPreview }] : [],
    folio: `#UTCH-2026-${String(id).padStart(4, '0')}`, titulo: data.titulo, categoria: data.categoria,
    estado: data.enOficina ? 'bajo_custodia' : 'con_finder', resguardo: data.enOficina ? 'oficina' : 'persona',
    custodia: data.enOficina ? data.caseta : null, gestor,
    fecha: new Date(`${data.fecha}T${data.hora || '00:00'}`).toISOString(), lugar: data.lugar, zona: 'Salones',
    foto: data.fotoPreview || null, descripcionPublica: data.descripcion,
  }
  db.hallazgos.unshift(h)
  return wait(h)
}

// "Lo dejé en oficina": actualiza el lugar de resguardo
export async function marcarEnOficina(id, caseta) {
  if (!USE_MOCK) return http('POST', `/hallazgos/${id}/resguardo`, { caseta })
  const h = db.hallazgos.find((x) => x.id === Number(id))
  h.resguardo = 'oficina'; h.custodia = caseta
  if (h.estado === 'con_finder') h.estado = 'bajo_custodia'
  return wait(h)
}

// Delegar la gestión de un hallazgo a un docente o a la secretaría
export async function delegarHallazgo(id, delegadoId) {
  if (!USE_MOCK) return http('POST', `/hallazgos/${id}/delegar`, { delegadoId })
  const h = db.hallazgos.find((x) => x.id === Number(id))
  const d = db.delegados.find((x) => x.id === Number(delegadoId))
  if (!d) return fail('Elige a quién delegar.')
  h.gestor = d
  return wait(h)
}

// ---------- Extravíos ----------
// data: { titulo, categoria, lugar, fecha, descripcion, alertas }
export async function crearExtravio(data) {
  if (!USE_MOCK) return http('POST', '/extravios', data)
  const id = nextId++
  const e = {
    id, folio: `#EXT-${id}`, titulo: data.titulo, categoria: data.categoria, estado: 'activo', autor: persona(yo),
    fecha: aISO(data.fecha), lugar: data.lugar, zona: 'Salones', descripcion: data.descripcion, alertas: data.alertas, fotos: [], foto: null,
  }
  db.extravios.unshift(e)
  return wait(e)
}

// -> { items, total }. estado: 'activo' | 'recuperado' | 'Todos'
export async function listExtravios({ q = '', categoria = 'Todos', zona = 'Todos', orden = 'recientes', estado = 'activo', page = 1, pageSize = 5 } = {}) {
  if (!USE_MOCK) return http('GET', `/extravios?${new URLSearchParams({ q, categoria, zona, orden, estado, page, pageSize })}`)
  let items = db.extravios.filter((e) => estado === 'Todos' || e.estado === estado)
  if (q) items = items.filter((e) => (e.titulo + e.lugar + e.categoria + (e.descripcion || '')).toLowerCase().includes(q.toLowerCase()))
  if (categoria !== 'Todos') items = items.filter((e) => e.categoria === categoria)
  if (zona !== 'Todos') items = items.filter((e) => e.zona === zona)
  items.sort((a, b) => (orden === 'recientes' ? new Date(b.fecha) - new Date(a.fecha) : new Date(a.fecha) - new Date(b.fecha)))
  return wait({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length })
}

export async function getExtravio(id) {
  if (!USE_MOCK) return http('GET', `/extravios/${id}`)
  const e = extravio(id)
  return e ? wait({ ...e, permisos: permisosExtravio(e) }) : fail('No encontramos ese reporte de extravío.')
}

export async function editarExtravio(id, cambios) {
  if (!USE_MOCK) return http('PATCH', `/extravios/${id}`, cambios)
  const e = extravio(id)
  const { fecha, hora, ...resto } = cambios
  Object.assign(e, resto, fecha ? { fecha: aISO(fecha, hora) } : {})
  return wait(e)
}

export async function retirarExtravio(id) {
  if (!USE_MOCK) return http('DELETE', `/extravios/${id}`)
  db.extravios = db.extravios.filter((e) => e.id !== Number(id))
  return wait({ ok: true })
}

export async function marcarExtravioRecuperado(id) {
  if (!USE_MOCK) return http('POST', `/extravios/${id}/recuperado`)
  extravio(id).estado = 'recuperado'
  return wait({ ok: true })
}

// ---------- Mis publicaciones ----------
// -> { hallazgos, delegados, extravios }, cada item con `permisos`
export async function misPublicaciones() {
  if (!USE_MOCK) return http('GET', '/publicaciones/mias')
  const conP = (h) => ({ ...h, permisos: permisosHallazgo(h) })
  return wait({
    hallazgos: db.hallazgos.filter((h) => h.autor?.id === yo.id).map(conP),
    delegados: db.hallazgos.filter((h) => h.gestor?.id === yo.id && h.autor?.id !== yo.id).map(conP),
    extravios: db.extravios.filter((e) => e.autor?.id === yo.id).map((e) => ({ ...e, permisos: permisosExtravio(e) })),
  })
}

// ---------- Fotos de una publicación ----------
// tipo: 'hallazgos' | 'extravios'
export async function agregarFoto(tipo, id, archivo) {
  if (!USE_MOCK) {
    const f = new FormData()
    f.append('foto', archivo)
    return http('POST', `/${tipo}/${id}/fotos`, f, true) // -> { id, url }
  }
  const p = db[tipo].find((x) => x.id === Number(id))
  const foto = { id: nextId++, url: await leerArchivo(archivo) }
  p.fotos.push(foto)
  p.foto = p.fotos[0].url
  return wait(foto)
}

export async function eliminarFoto(tipo, id, fotoId) {
  if (!USE_MOCK) return http('DELETE', `/${tipo}/${id}/fotos/${fotoId}`)
  const p = db[tipo].find((x) => x.id === Number(id))
  p.fotos = p.fotos.filter((f) => f.id !== fotoId)
  p.foto = p.fotos[0]?.url ?? null
  return wait({ ok: true })
}

export async function reportarInformacionIncorrecta(hallazgoId) {
  if (!USE_MOCK) return http('POST', `/hallazgos/${hallazgoId}/reportar-incorrecto`)
  return wait({ ok: true })
}

// ---------- Reclamos: solicitante ----------
// data: { hallazgoId, descripcionPrivada, declaracion, evidencia }
export async function crearReclamo(data) {
  if (!USE_MOCK) {
    const f = new FormData()
    f.append('hallazgoId', data.hallazgoId)
    f.append('descripcionPrivada', data.descripcionPrivada)
    f.append('declaracion', data.declaracion)
    if (data.evidencia) f.append('evidencia', data.evidencia)
    return http('POST', '/reclamos', f, true)
  }
  const h = db.hallazgos.find((x) => x.id === Number(data.hallazgoId))
  if (h.gestor.id === yo.id) return fail('Este objeto lo gestionas tú. No puedes reclamarlo.')
  const id = nextId++
  const r = {
    id, folio: `#REC-${id}`, hallazgoId: h.id, titulo: h.titulo, estado: 'enviado',
    descripcionPrivada: data.descripcionPrivada, observaciones: '', creado: new Date().toISOString(),
    evidencia: data.evidencia ? { nombre: data.evidencia.name } : null,
    solicitante: { id: yo.id, nombre: yo.nombre, correo: yo.correo, matricula: yo.matricula, carrera: yo.carrera },
  }
  db.reclamos.unshift(r)
  h.estado = 'en_revision'
  return wait(r)
}

// -> { activos, porRevisar, alertas, historial }
export async function misReclamos() {
  if (!USE_MOCK) return http('GET', '/reclamos/mios')
  const mios = db.reclamos.filter((r) => r.solicitante.id === yo.id).map((r) => ({ ...r, gestor: hallazgoDe(r)?.gestor, custodia: hallazgoDe(r)?.custodia }))
  const porRevisar = db.reclamos
    .filter((r) => hallazgoDe(r)?.gestor.id === yo.id && ESTADOS_ACTIVOS.includes(r.estado))
  return wait({
    activos: mios.filter((r) => ESTADOS_ACTIVOS.includes(r.estado)),
    porRevisar,
    alertas: db.alertas,
    historial: mios.filter((r) => ESTADOS_CERRADOS.includes(r.estado)),
  })
}

/**
 * Detalle de un reclamo enviado o recibido.
 * -> { ...reclamo, hallazgo, gestor, rolEnReclamo: 'solicitante' | 'responsable', permisos }
 * Los datos privados (descripción, evidencia) y el contacto institucional solo los devuelve el back
 * al solicitante y al responsable.
 */
export async function getReclamo(id) {
  if (!USE_MOCK) return http('GET', `/reclamos/${id}`)
  const r = reclamo(id)
  if (!r) return fail('No encontramos ese reclamo.')
  const h = hallazgoDe(r)
  const soySolicitante = r.solicitante.id === yo.id
  const soyResponsable = h?.gestor?.id === yo.id || esStaff()
  if (!soySolicitante && !soyResponsable) return fail('No tienes acceso a este reclamo.')
  const activo = ESTADOS_ACTIVOS.includes(r.estado)
  const resp = soyResponsable && !soySolicitante
  return wait({
    ...r,
    hallazgo: h ? { id: h.id, folio: h.folio, titulo: h.titulo, foto: h.foto, lugar: h.lugar, custodia: h.custodia, resguardo: h.resguardo } : null,
    gestor: h?.gestor ?? null,
    rolEnReclamo: soySolicitante ? 'solicitante' : 'responsable',
    permisos: {
      iniciarRevision: resp && r.estado === 'enviado',
      aceptar: resp && ['enviado', 'en_revision'].includes(r.estado),
      rechazar: resp && ['enviado', 'en_revision', 'requiere_pruebas'].includes(r.estado),
      pedirPruebas: resp && r.estado === 'en_revision',
      responder: soySolicitante && r.estado === 'requiere_pruebas',
      cancelar: soySolicitante && activo,
      confirmarRecibido: soySolicitante && r.estado === 'aprobado',
    },
  })
}

export async function cancelarReclamo(id) {
  if (!USE_MOCK) return http('POST', `/reclamos/${id}/cancelar`)
  const r = reclamo(id); r.estado = 'cancelado'
  const h = hallazgoDe(r); if (h) h.estado = estadoLibre(h)
  return wait(r)
}

export async function responderPruebas(id, texto) {
  if (!USE_MOCK) return http('POST', `/reclamos/${id}/respuesta`, { texto })
  const r = reclamo(id); r.estado = 'en_revision'; r.descripcionPrivada += `\n${texto}`
  return wait(r)
}

// Secuencia: el solicitante marca «Ya recuperé mi objeto» y se cierra el reclamo y el hallazgo
export async function marcarRecuperado(id) {
  if (!USE_MOCK) return http('POST', `/reclamos/${id}/recuperado`)
  const r = reclamo(id)
  if (r.estado !== 'aprobado') return fail('Solo puedes cerrar un reclamo aprobado.')
  r.estado = 'entregado'
  r.entrega = { fecha: new Date().toISOString(), agente: `Confirmado por ${r.solicitante.nombre}` }
  const h = hallazgoDe(r); if (h) h.estado = 'entregado'
  return wait(r)
}

// ---------- Reclamos: responsable (quien lo encontró, docente, secretaría o vigilancia) ----------
export async function iniciarRevision(id) {
  if (!USE_MOCK) return http('POST', `/reclamos/${id}/revision`)
  reclamo(id).estado = 'en_revision'; return wait({ ok: true })
}
export async function aprobarReclamo(id) {
  if (!USE_MOCK) return http('POST', `/reclamos/${id}/aprobar`)
  reclamo(id).estado = 'aprobado'; return wait({ ok: true })
}
export async function rechazarReclamo(id, observaciones) {
  if (!USE_MOCK) return http('POST', `/reclamos/${id}/rechazar`, { observaciones })
  const r = reclamo(id); r.estado = 'rechazado'; r.observaciones = observaciones
  const h = hallazgoDe(r); if (h) h.estado = estadoLibre(h)
  return wait({ ok: true })
}
export async function pedirPruebas(id, observaciones) {
  if (!USE_MOCK) return http('POST', `/reclamos/${id}/pedir-pruebas`, { observaciones })
  const r = reclamo(id); r.estado = 'requiere_pruebas'; r.observaciones = observaciones
  return wait({ ok: true })
}

// ---------- Vigilancia / Administrador ----------
export async function colaVigilancia() {
  if (!USE_MOCK) return http('GET', '/vigilancia/cola') // -> { stats, reclamos, entregas, publicaciones }
  const reclamos = db.reclamos.filter((r) => ['enviado', 'en_revision'].includes(r.estado))
  const entregas = db.reclamos.filter((r) => r.estado === 'aprobado').map((r) => ({ ...r, custodia: hallazgoDe(r)?.custodia }))
  return wait({
    stats: {
      enCustodia: db.hallazgos.filter((h) => h.resguardo === 'oficina' && h.estado !== 'entregado').length,
      porAprobar: reclamos.length,
      entregasHoy: entregas.length,
    },
    reclamos, entregas,
    publicaciones: db.hallazgos.filter((h) => h.estado !== 'entregado').slice(0, 3),
  })
}
export async function editarHallazgo(id, cambios) {
  if (!USE_MOCK) return http('PATCH', `/hallazgos/${id}`, cambios)
  const h = db.hallazgos.find((x) => x.id === Number(id))
  const { fecha, hora, descripcion, ...resto } = cambios
  Object.assign(h, resto, fecha ? { fecha: aISO(fecha, hora) } : {}, descripcion != null ? { descripcionPublica: descripcion } : {})
  return wait(h)
}
export async function retirarHallazgo(id) {
  if (!USE_MOCK) return http('DELETE', `/hallazgos/${id}`)
  db.hallazgos = db.hallazgos.filter((h) => h.id !== Number(id)); return wait({ ok: true })
}
// Estado diagrama: Aprobado -> Entregado «Vigilancia confirma entrega física» (acta con matrícula y código)
export async function registrarEntrega(id, { matricula, codigo }) {
  if (!USE_MOCK) return http('POST', `/reclamos/${id}/entrega`, { matricula, codigo })
  if (!/^\d{6}$/.test(codigo)) return fail('El código de entrega tiene 6 dígitos.')
  const r = reclamo(id)
  if (matricula !== r.solicitante.matricula) return fail('La matrícula no coincide con la del solicitante.')
  r.estado = 'entregado'; r.entrega = { fecha: new Date().toISOString(), agente: `Of. ${yo.nombre}` }
  const h = hallazgoDe(r); if (h) h.estado = 'entregado'
  return wait({ ok: true })
}
export async function auditoriaCSV() {
  if (!USE_MOCK) return http('GET', '/vigilancia/auditoria.csv')
  const filas = [['folio', 'tipo', 'estado', 'fecha']]
  db.hallazgos.forEach((h) => filas.push([h.folio, 'hallazgo', h.estado, h.fecha]))
  db.reclamos.forEach((r) => filas.push([r.folio, 'reclamo', r.estado, r.creado]))
  return wait(filas.map((f) => f.join(',')).join('\n'))
}
