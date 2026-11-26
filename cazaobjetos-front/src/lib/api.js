/**
 * Capa de datos del front, alineada a los diagramas del back
 * (flujo de devolución, ER, estados del reclamo y secuencia).
 *
 * - Backend real por defecto, con /api/v1 cuando no se define VITE_API_URL.
 * - Los datos simulados en memoria requieren VITE_USE_MOCK=true y modo dev.
 *   Las compilaciones de producción/PWA siempre usan el backend.
 */
import * as real from './realApi.js'
import { normalizedProfile, profileError, profilePhotoError, studentNumber, validEmail } from './profile.js'
import { seed } from './mockData.js'
import { ESTADOS_ACTIVOS, ESTADOS_CERRADOS } from './constants.js'

export const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'

let token = sessionStorage.getItem('co_token') || null
let yo = null
export const setToken = (t) => {
  token = t
  t ? sessionStorage.setItem('co_token', t) : sessionStorage.removeItem('co_token')
}
export const setUsuario = (u) => { yo = u; real.setUsuario(u) }

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
    editarFotos: puedo && abierto && !conReclamo,
    cambiarResguardo: puedo && abierto,
    retirar: (soyAutor || esStaff()) && abierto && !conReclamo,
  }
}
function permisosExtravio(e) {
  const mio = e.autor?.id === yo.id || esStaff()
  const activo = e.estado === 'activo'
  return { editar: mio && activo, editarFotos: mio && activo, vincular: mio && activo, retirar: mio && activo, marcarRecuperado: mio && activo }
}

// ---------- Auth ----------
export async function login(email, password) {
  if (!USE_MOCK) return real.login(email, password)
  const correo = email.trim().toLowerCase()
  if (db.pendientes[correo]) return fail('Tu correo aún no está verificado. Ingresa el código que te enviamos.', 'CORREO_NO_VERIFICADO')
  const u = db.usuarios[correo]
  if (!u) return fail('Correo o contraseña incorrectos.')
  if (db.passwords[correo] && db.passwords[correo] !== password) return fail('Correo o contraseña incorrectos.')
  return wait({ token: 'mock-token', usuario: u })
}

// data: { nombre, correo, password, carrera, edificio } -> el back envía un código al correo
export async function registrar({ nombre, correo, password, carrera, edificio }) {
  if (!USE_MOCK) return real.registrar({ nombre, correo, password, carrera, edificio })
  if (!validEmail(correo)) return fail('Escribe un correo válido.')
  const problem = profileError({ nombre, carrera, edificio })
  if (problem) return fail(problem)
  const c = correo.trim().toLowerCase()
  if (db.usuarios[c] || db.pendientes[c]) return fail('Este correo ya está registrado. Inicia sesión o verifica tu cuenta.')
  const id = nextId++
  db.pendientes[c] = { id, nombre: nombre.trim(), correo: c, matricula: studentNumber(c, 'estudiante'), carrera: carrera.trim(), edificio: edificio?.trim() || null, rol: 'estudiante' }
  db.passwords[c] = password
  return wait({ ok: true })
}

export const getRegistrationOptions = (signal) => USE_MOCK ? wait({ demoVerification: true }) : real.getRegistrationOptions(signal)
export const activarCuentaPrueba = (correo) => USE_MOCK ? verificarCorreo(correo, CODIGO_MOCK) : real.activarCuentaPrueba(correo)

export async function verificarCorreo(correo, codigo) {
  if (!USE_MOCK) return real.verificarCorreo(correo, codigo)
  const c = correo.trim().toLowerCase()
  if (!db.pendientes[c]) return fail(db.usuarios[c] ? 'Este correo ya está verificado. Inicia sesión.' : 'No hay un registro pendiente con ese correo.')
  if (codigo !== CODIGO_MOCK) return fail('El código no es correcto o ya expiró.')
  db.usuarios[c] = db.pendientes[c]
  delete db.pendientes[c]
  return wait({ ok: true })
}

export async function reenviarCodigo(correo) {
  if (!USE_MOCK) return real.reenviarCodigo(correo)
  return wait({ ok: true })
}

// Recuperar contraseña: 1) pedir código  2) usarlo para poner una nueva
export async function solicitarRecuperacion(correo) {
  if (!USE_MOCK) return real.solicitarRecuperacion(correo)
  return wait({ ok: true }) // siempre ok: no revelamos si el correo existe
}

export async function restablecerPassword({ correo, codigo, password }) {
  if (!USE_MOCK) return real.restablecerPassword({ correo, codigo, password })
  if (codigo !== CODIGO_MOCK) return fail('El código no es correcto o ya expiró.')
  db.passwords[correo.trim().toLowerCase()] = password
  return wait({ ok: true })
}

// ---------- Mi cuenta ----------
export async function getPerfil() {
  if (!USE_MOCK) return real.getPerfil()
  return wait(yo)
}

export async function guardarPerfil(data) {
  const error = profileError(data)
  if (error) return fail(error)
  const clean = normalizedProfile(data)
  if (!USE_MOCK) return real.guardarPerfil(clean)
  yo = { ...yo, ...clean, matricula: studentNumber(yo.correo, yo.rol) }
  db.usuarios[yo.correo] = yo
  return wait(yo)
}
export async function subirFotoPerfil(file) {
  const error = profilePhotoError(file)
  if (error) return fail(error)
  if (!USE_MOCK) return real.subirFotoPerfil(file)
  yo = { ...yo, fotoPerfil: await leerArchivo(file) }
  db.usuarios[yo.correo] = yo
  return wait(yo)
}
export async function quitarFotoPerfil() {
  if (!USE_MOCK) return real.quitarFotoPerfil()
  yo = { ...yo, fotoPerfil: null }
  db.usuarios[yo.correo] = yo
  return wait(yo)
}

export async function cambiarPassword({ actual, nueva }) {
  if (!USE_MOCK) return real.cambiarPassword({ actual, nueva })
  if (db.passwords[yo.correo] && db.passwords[yo.correo] !== actual) return fail('La contraseña actual no es correcta.')
  db.passwords[yo.correo] = nueva
  return wait({ ok: true })
}

// ---------- Hallazgos ----------
export async function listHallazgos({ q = '', categoria = 'Todos', zona = 'Todos', orden = 'recientes', page = 1, pageSize = 5 } = {}) {
  if (!USE_MOCK) return real.listHallazgos({ q, categoria, zona, orden, page, pageSize })
  let items = db.hallazgos.filter((h) => h.estado !== 'entregado')
  if (q) items = items.filter((h) => (h.titulo + h.lugar + h.categoria).toLowerCase().includes(q.toLowerCase()))
  if (categoria !== 'Todos') items = items.filter((h) => h.categoria === categoria)
  if (zona !== 'Todos') items = items.filter((h) => h.zona === zona)
  items.sort((a, b) => (orden === 'recientes' ? new Date(b.fecha) - new Date(a.fecha) : new Date(a.fecha) - new Date(b.fecha)))
  return wait({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length })
}

export async function getHallazgo(id) {
  if (!USE_MOCK) return real.getHallazgo(id)
  const h = db.hallazgos.find((x) => x.id === Number(id))
  const existing = db.reclamos.find((claim) => claim.hallazgoId === h?.id && claim.solicitante.id === yo.id && (ESTADOS_ACTIVOS.includes(claim.estado) || claim.estado === 'entregado'))
  return h ? wait({ ...h, miSolicitudId: existing?.id || null, permisos: permisosHallazgo(h) }) : fail('No encontramos ese objeto.')
}

// Responsables posibles al delegar: docentes o secretaría
export async function listDelegados() {
  if (!USE_MOCK) return real.listDelegados()
  return wait(db.delegados)
}

/**
 * data: { titulo, categoria, lugar, fecha, hora, descripcion, foto, fotoPreview,
 *         gestion: 'yo' | 'delegar', delegadoId, enOficina: bool, caseta }
 */
export async function crearHallazgo(data) {
  if (!USE_MOCK) return real.crearHallazgo(data)
  if (data.sourceLostReportId) { const source = extravio(data.sourceLostReportId); if (!source || source.estado !== 'activo' || source.autor.id === yo.id) return fail('El reporte original no está disponible para publicar un hallazgo vinculado.') }
  const imageUrl = data.fotoPreview || (data.imagen?.file ? await leerArchivo(data.imagen.file) : data.imagen?.url)
  const gestor = persona(yo)
  const resguardo = data.resguardo || 'persona'
  const custodia = resguardo === 'docente' ? `Con ${data.docente} · ${data.ubicacionResguardo || ''}` : resguardo === 'oficina' ? data.ubicacionResguardo || 'Oficina de profesores · edificio I' : null
  const id = nextId++
  const h = {
    id, sourceLostReportId: data.sourceLostReportId || null, autor: persona(yo), fotos: imageUrl ? [{ id: nextId++, url: imageUrl, referenceImage: !!data.imagen?.referenceImage }] : [],
    folio: `#UTCH-2026-${String(id).padStart(4, '0')}`, titulo: data.titulo, categoria: data.categoria,
    estado: resguardo === 'persona' ? 'con_finder' : 'bajo_custodia', resguardo,
    custodia, gestor, docente: data.docente, ubicacionResguardo: data.ubicacionResguardo,
    fecha: new Date(`${data.fecha}T${data.hora || '00:00'}`).toISOString(), lugar: data.lugar, zona: 'Salones',
    foto: imageUrl || null, descripcionPublica: data.descripcion,
  }
  db.hallazgos.unshift(h)
  return wait(h)
}

// "Lo dejé en oficina": actualiza el lugar de resguardo
export async function marcarEnOficina(id, caseta) {
  if (!USE_MOCK) return real.marcarEnOficina(id, caseta)
  const h = db.hallazgos.find((x) => x.id === Number(id))
  h.resguardo = 'oficina'; h.custodia = caseta
  if (h.estado === 'con_finder') h.estado = 'bajo_custodia'
  return wait(h)
}

// Delegar la gestión de un hallazgo a un docente o a la secretaría
export async function delegarHallazgo(id, delegadoId) {
  if (!USE_MOCK) return real.delegarHallazgo(id, delegadoId)
  const h = db.hallazgos.find((x) => x.id === Number(id))
  const d = db.delegados.find((x) => x.id === Number(delegadoId))
  if (!d) return fail('Elige a quién delegar.')
  h.gestor = d
  return wait(h)
}

// ---------- Extravíos ----------
// data: { titulo, categoria, lugar, fecha, descripcion, alertas }
export async function crearExtravio(data) {
  if (!USE_MOCK) return real.crearExtravio(data)
  const id = nextId++
  const e = {
    id, folio: `#EXT-${id}`, titulo: data.titulo, categoria: data.categoria, estado: 'activo', autor: persona(yo),
    fecha: aISO(data.fecha), lugar: data.lugar, zona: 'Salones', descripcion: data.descripcion, alertas: data.alertas, fotos: [], foto: null,
  }
  if (data.imagen) {
    const image = { id: nextId++, url: data.imagen.file ? await leerArchivo(data.imagen.file) : data.imagen.url, referenceImage: data.imagen.referenceImage }
    e.fotos.push(image)
    e.foto = image.url
  }
  db.extravios.unshift(e)
  return wait(e)
}

// -> { items, total }. estado: 'activo' | 'recuperado' | 'Todos'
export async function listExtravios({ q = '', categoria = 'Todos', zona = 'Todos', orden = 'recientes', estado = 'activo', page = 1, pageSize = 5 } = {}) {
  if (!USE_MOCK) return real.listExtravios({ q, categoria, zona, orden, estado, page, pageSize })
  let items = db.extravios.filter((e) => estado === 'Todos' || e.estado === estado)
  if (q) items = items.filter((e) => (e.titulo + e.lugar + e.categoria + (e.descripcion || '')).toLowerCase().includes(q.toLowerCase()))
  if (categoria !== 'Todos') items = items.filter((e) => e.categoria === categoria)
  if (zona !== 'Todos') items = items.filter((e) => e.zona === zona)
  items.sort((a, b) => (orden === 'recientes' ? new Date(b.fecha) - new Date(a.fecha) : new Date(a.fecha) - new Date(b.fecha)))
  return wait({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length })
}

export async function getExtravio(id) {
  if (!USE_MOCK) return real.getExtravio(id)
  const e = extravio(id)
  return e ? wait({ ...e, permisos: permisosExtravio(e) }) : fail('No encontramos ese reporte de extravío.')
}

export async function editarExtravio(id, cambios) {
  if (!USE_MOCK) return real.editarExtravio(id, cambios)
  const e = extravio(id)
  const { fecha, hora, ...resto } = cambios
  Object.assign(e, resto, fecha ? { fecha: aISO(fecha, hora) } : {})
  return wait(e)
}

export async function retirarExtravio(id) {
  if (!USE_MOCK) return real.retirarExtravio(id)
  db.extravios = db.extravios.filter((e) => e.id !== Number(id))
  return wait({ ok: true })
}

export async function marcarExtravioRecuperado(id) {
  if (!USE_MOCK) return real.marcarExtravioRecuperado(id)
  extravio(id).estado = 'recuperado'
  return wait({ ok: true })
}

// ---------- Mis publicaciones ----------
// -> { hallazgos, delegados, extravios }, cada item con `permisos`
export const misExtraviosParaReclamo = () => USE_MOCK ? wait([]) : real.misExtraviosParaReclamo()
export async function misPublicaciones() {
  if (!USE_MOCK) return real.misPublicaciones()
  const conP = (h) => ({ ...h, permisos: permisosHallazgo(h) })
  return wait({
    hallazgos: db.hallazgos.filter((h) => h.autor?.id === yo.id).map(conP),
    delegados: db.hallazgos.filter((h) => h.gestor?.id === yo.id && h.autor?.id !== yo.id).map(conP),
    extravios: db.extravios.filter((e) => e.autor?.id === yo.id).map((e) => ({ ...e, permisos: permisosExtravio(e) })),
  })
}

// ---------- Fotos de una publicación ----------
// tipo: 'hallazgos' | 'extravios'
export async function agregarFoto(tipo, id, archivo, referenceImage = false) {
  if (!USE_MOCK) return real.agregarFoto(tipo, id, archivo, referenceImage)
  const p = db[tipo].find((x) => x.id === Number(id))
  const foto = { id: nextId++, url: await leerArchivo(archivo), referenceImage }
  p.fotos.push(foto)
  p.foto = p.fotos[0].url
  return wait(foto)
}

export async function eliminarFoto(tipo, id, fotoId) {
  if (!USE_MOCK) return real.eliminarFoto(tipo, id, fotoId)
  const p = db[tipo].find((x) => x.id === Number(id))
  p.fotos = p.fotos.filter((f) => f.id !== fotoId)
  p.foto = p.fotos[0]?.url ?? null
  return wait({ ok: true })
}

export async function reportarInformacionIncorrecta(hallazgoId) {
  if (!USE_MOCK) throw new Error('Esta acción no está disponible en el flujo actual.')
  return wait({ ok: true })
}

// ---------- Reclamos: solicitante ----------
// data: { hallazgoId, descripcionPrivada, declaracion, evidencia }
export async function crearReclamo(data) {
  if (!USE_MOCK) return real.crearReclamo(data)
  const h = db.hallazgos.find((x) => x.id === Number(data.hallazgoId))
  if (h.gestor.id === yo.id) return fail('Este objeto lo gestionas tú. No puedes reclamarlo.')
  const id = nextId++
  const r = {
    id, folio: `#REC-${id}`, hallazgoId: h.id, titulo: h.titulo, estado: 'enviado',
    descripcionPrivada: data.descripcionPrivada, observaciones: '', creado: new Date().toISOString(),
    evidencias: [
      ...await Promise.all((data.evidencias || []).map(async (file) => ({ id: nextId++, url: await leerArchivo(file), authorId: yo.id, createdAt: new Date().toISOString() }))),
      ...(data.evidenceUrls || []).map((url) => ({ id: nextId++, url, reference: true, authorId: yo.id, createdAt: new Date().toISOString() })),
    ],
    actividad: [{ id: nextId++, kind: 'SUBMITTED', actorId: yo.id, actorName: yo.nombre, body: 'Reclamo registrado.', createdAt: new Date().toISOString() }],
    solicitante: { id: yo.id, nombre: yo.nombre, correo: yo.correo, matricula: yo.matricula, carrera: yo.carrera },
  }
  db.reclamos.unshift(r)
  h.estado = 'en_revision'
  return wait(r)
}

// -> { activos, porRevisar, alertas, historial }
export async function misReclamos() {
  if (!USE_MOCK) return real.misReclamos()
  const mios = db.reclamos.filter((r) => r.solicitante.id === yo.id).map((r) => ({ ...r, hallazgo: hallazgoDe(r), gestor: hallazgoDe(r)?.gestor, custodia: hallazgoDe(r)?.custodia }))
  const porRevisar = db.reclamos
    .filter((r) => hallazgoDe(r)?.gestor.id === yo.id && ESTADOS_ACTIVOS.includes(r.estado))
    .map((r) => ({ ...r, hallazgo: hallazgoDe(r), gestor: hallazgoDe(r)?.gestor }))
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
  if (!USE_MOCK) return real.getReclamo(id)
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
    hallazgo: h ? { ...h, permisos: permisosHallazgo(h) } : null,
    gestor: h?.gestor ?? null,
    puedeAportar: activo,
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
  if (!USE_MOCK) return real.cancelarReclamo(id)
  const r = reclamo(id); r.estado = 'cancelado'
  const h = hallazgoDe(r); if (h) h.estado = estadoLibre(h)
  return wait(r)
}

export async function responderPruebas(id, texto) {
  if (!USE_MOCK) throw new Error('Esta acción no está disponible en el flujo actual.')
  const r = reclamo(id); r.estado = 'en_revision'; r.descripcionPrivada += `\n${texto}`
  return wait(r)
}

// Secuencia: el solicitante marca «Ya recuperé mi objeto» y se cierra el reclamo y el hallazgo
export async function marcarRecuperado(id) {
  if (!USE_MOCK) return real.marcarRecuperado(id)
  const r = reclamo(id)
  if (r.estado !== 'aprobado') return fail('Solo puedes cerrar un reclamo aprobado.')
  r.estado = 'entregado'
  r.entrega = { fecha: new Date().toISOString(), agente: `Confirmado por ${r.solicitante.nombre}` }
  const h = hallazgoDe(r); if (h) h.estado = 'entregado'
  return wait(r)
}

// ---------- Reclamos: responsable (quien lo encontró, docente, secretaría o vigilancia) ----------
export async function iniciarRevision(id) {
  if (!USE_MOCK) throw new Error('Esta acción no está disponible en el flujo actual.')
  reclamo(id).estado = 'en_revision'; return wait({ ok: true })
}
export async function aprobarReclamo(id) {
  if (!USE_MOCK) return real.aprobarReclamo(id)
  reclamo(id).estado = 'aprobado'; return wait({ ok: true })
}
export async function rechazarReclamo(id, observaciones) {
  if (!USE_MOCK) return real.rechazarReclamo(id, observaciones)
  const r = reclamo(id); r.estado = 'rechazado'; r.observaciones = observaciones
  const h = hallazgoDe(r); if (h) h.estado = estadoLibre(h)
  return wait({ ok: true })
}
export async function pedirPruebas(id, observaciones) {
  if (!USE_MOCK) throw new Error('Esta acción no está disponible en el flujo actual.')
  const r = reclamo(id); r.estado = 'requiere_pruebas'; r.observaciones = observaciones
  return wait({ ok: true })
}

// ---------- Vigilancia / Administrador ----------
export async function colaVigilancia() {
  if (!USE_MOCK) throw new Error('Esta acción no está disponible en el flujo actual.')
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
  if (!USE_MOCK) return real.editarHallazgo(id, cambios)
  const h = db.hallazgos.find((x) => x.id === Number(id))
  const { fecha, hora, descripcion, ...resto } = cambios
  Object.assign(h, resto, fecha ? { fecha: aISO(fecha, hora) } : {}, descripcion != null ? { descripcionPublica: descripcion } : {})
  return wait(h)
}
export async function retirarHallazgo(id) {
  if (!USE_MOCK) return real.retirarHallazgo(id)
  db.hallazgos = db.hallazgos.filter((h) => h.id !== Number(id)); return wait({ ok: true })
}
// Estado diagrama: Aprobado -> Entregado «Vigilancia confirma entrega física» (acta con matrícula y código)
export async function registrarEntrega(id, { matricula, codigo }) {
  if (!USE_MOCK) throw new Error('Esta acción no está disponible en el flujo actual.')
  if (!/^\d{6}$/.test(codigo)) return fail('El código de entrega tiene 6 dígitos.')
  const r = reclamo(id)
  if (matricula !== r.solicitante.matricula) return fail('La matrícula no coincide con la del solicitante.')
  r.estado = 'entregado'; r.entrega = { fecha: new Date().toISOString(), agente: `Of. ${yo.nombre}` }
  const h = hallazgoDe(r); if (h) h.estado = 'entregado'
  return wait({ ok: true })
}
export async function auditoriaCSV() {
  if (!USE_MOCK) throw new Error('Esta acción no está disponible en el flujo actual.')
  const filas = [['folio', 'tipo', 'estado', 'fecha']]
  db.hallazgos.forEach((h) => filas.push([h.folio, 'hallazgo', h.estado, h.fecha]))
  db.reclamos.forEach((r) => filas.push([r.folio, 'reclamo', r.estado, r.creado]))
  return wait(filas.map((f) => f.join(',')).join('\n'))
}

export async function logout() { if (!USE_MOCK) await real.logout() }

export async function importarFoto(id, url, referenceImage = true) {
  if (!USE_MOCK) return real.importarFoto(id, url, referenceImage)
  const item = extravio(id)
  const foto = { id: nextId++, url, referenceImage }
  item.fotos.push(foto)
  item.foto = item.fotos[0].url
  return wait(foto)
}

// Expediente: el adaptador real aplica permisos y conserva las aportaciones.
export async function getActividadReclamo(id, page = 0) {
  if (!USE_MOCK) return real.getActividadReclamo(id, page)
  await getReclamo(id)
  const entries = [...(reclamo(id).actividad || [])].reverse()
  return wait({ items: entries.slice(page * 20, (page + 1) * 20), page, hasNext: entries.length > (page + 1) * 20, total: entries.length })
}
export async function comentarReclamo(id, body, key) {
  if (!USE_MOCK) return real.comentarReclamo(id, body, key)
  const r = await getReclamo(id)
  if (!r.puedeAportar) return fail('El expediente es de solo lectura.')
  const item = { id: nextId++, kind: 'COMMENT', actorId: yo.id, actorName: yo.nombre, body, createdAt: new Date().toISOString() }
  ;(reclamo(id).actividad ||= []).push(item)
  return wait(item)
}
export async function getEvidenciasReclamo(id) {
  if (!USE_MOCK) return real.getEvidenciasReclamo(id)
  await getReclamo(id); return wait(reclamo(id).evidencias || [])
}
export async function agregarEvidenciaReclamo(id, file, key) {
  if (!USE_MOCK) return real.agregarEvidenciaReclamo(id, file, key)
  const r = await getReclamo(id)
  if (!r.puedeAportar) return fail('El expediente es de solo lectura.')
  if ((reclamo(id).evidencias || []).length >= 5) return fail('Máximo 5 evidencias.')
  const image = { id: nextId++, url: await leerArchivo(file), authorId: yo.id, createdAt: new Date().toISOString() }
  ;(reclamo(id).evidencias ||= []).push(image)
  return wait(image)
}
export async function agregarEnlaceEvidenciaReclamo(id, url, key) {
  if (!USE_MOCK) return real.agregarEnlaceEvidenciaReclamo(id, url, key)
  const r = await getReclamo(id)
  if (!r.puedeAportar) return fail('El expediente es de solo lectura.')
  if ((reclamo(id).evidencias || []).length >= 5) return fail('Máximo 5 evidencias.')
  const image = { id: nextId++, url, reference: true, authorId: yo.id, createdAt: new Date().toISOString() }
  ;(reclamo(id).evidencias ||= []).push(image)
  return wait(image)
}
export async function cambiarResguardo(id, data) {
  if (!USE_MOCK) return real.cambiarResguardo(id, data)
  const h = db.hallazgos.find((item) => item.id === Number(id))
  if (!permisosHallazgo(h).cambiarResguardo) return fail('No puedes cambiar el resguardo.')
  if (h.resguardo === 'oficina' && data.resguardo !== 'oficina') return fail('El objeto permanece en oficina.')
  Object.assign(h, data, { custodia: data.resguardo === 'persona' ? null : data.resguardo === 'docente' ? `Con ${data.docente} · ${data.ubicacionResguardo || ''}` : data.ubicacionResguardo || 'Oficina de profesores · edificio I', estado: data.resguardo === 'persona' ? 'con_finder' : 'bajo_custodia' })
  return wait(h)
}

// La estación real es persistente; el demo mantiene una bandeja separada por usuario.
const mockNotifications = () => (db.notifications ||= []).filter((n) => n.recipientId === yo?.id && !n.clearedAt)
export async function getNotificationSummary(signal) {
  if (!USE_MOCK) return real.getNotificationSummary(signal)
  const rows = mockNotifications(); return wait({ unread: rows.filter((n) => !n.readAt).length, total: rows.length })
}
export async function listNotifications({ filter = 'ALL', page = 0, pageSize = 20 } = {}, signal) {
  if (!USE_MOCK) return real.listNotifications({ filter, page, pageSize }, signal)
  const rows = mockNotifications().filter((n) => filter !== 'UNREAD' || !n.readAt)
  return wait({ items: rows.slice(page * pageSize, (page + 1) * pageSize), total: rows.length, page, pageSize, totalPages: Math.ceil(rows.length / pageSize), hasNext: rows.length > (page + 1) * pageSize, hasPrevious: page > 0 })
}
export async function readNotification(id) {
  if (!USE_MOCK) return real.readNotification(id)
  const n = mockNotifications().find((row) => row.id === id)
  if (!n) return fail('Notificación no disponible')
  n.readAt ||= new Date().toISOString(); window.dispatchEvent(new Event('co-notifications-refresh')); return wait(n)
}
export async function clearReadNotifications() {
  if (!USE_MOCK) return real.clearReadNotifications()
  const rows = mockNotifications().filter((n) => n.readAt); rows.forEach((n) => { n.clearedAt = new Date().toISOString() }); window.dispatchEvent(new Event('co-notifications-refresh')); return wait({ cleared: rows.length })
}

export async function getPosiblesHallazgos(id, page = 0) {
  if (!USE_MOCK) return real.getPosiblesHallazgos(id, page)
  const source = extravio(id)
  if (!source || source.autor.id !== yo?.id) return fail('Reporte no disponible.')
  const rows = db.hallazgos.filter((h) => String(h.sourceLostReportId) === String(id) && h.estado !== 'retirado')
  return wait({ items: rows.slice(page * 10, (page + 1) * 10), total: rows.length, page, totalPages: Math.ceil(rows.length / 10), hasNext: rows.length > (page + 1) * 10, hasPrevious: page > 0 })
}

export async function getPushConfig() { return USE_MOCK ? { enabled: false, applicationServerKey: null } : real.getPushConfig() }
export async function getPushPreference() { return USE_MOCK ? { dailyReminders: 1, timeZone: 'America/Chihuahua', firstHour: 10, secondHour: 18 } : real.getPushPreference() }
export const savePushPreference = (frequency) => USE_MOCK ? Promise.resolve({ dailyReminders: frequency, timeZone: 'America/Chihuahua', firstHour: 10, secondHour: 18 }) : real.savePushPreference(frequency)
export const registerPush = (data) => real.registerPush(data)
export const disablePush = (id) => real.disablePush(id)
export const testPush = (id) => real.testPush(id)

export const notificationPhotos = (notices) => USE_MOCK ? wait({}) : real.notificationPhotos(notices)
