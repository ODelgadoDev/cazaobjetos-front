import { CustodyFields } from '../components/CustodyEditor.jsx'
import { useReportDraft } from '../context/ReportDraftContext.jsx'
import Modal from '../components/Modal.jsx'
import ImageAttachment from '../components/ImageAttachment.jsx'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { USE_MOCK, crearExtravio, crearHallazgo } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { CATEGORIAS, UBICACIONES } from '../lib/constants.js'
import { ahoraHora, hoyISO } from '../lib/format.js'
import { IconSend } from '../components/Icons.jsx'

function Categorias({ value, onChange }) {
  return (
    <div className="chips" role="group" aria-label="Categoría">
      {CATEGORIAS.map((c) => (
        <button type="button" key={c} className={`filter ${value === c ? 'is-active' : ''}`} aria-pressed={value === c} onClick={() => onChange(c)}>{c}</button>
      ))}
    </div>
  )
}

/**
 * Formulario de hallazgo. Sin props publica uno nuevo.
 * Con `edicion = { inicial, onGuardar }` corrige uno existente: solo datos del objeto
 * (las fotos y el resguardo se gestionan aparte).
 */
export function FormEncontre({ edicion }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { usuario } = useAuth()
  const [draft, setDraft, clearDraft, resetDraft] = useReportDraft(edicion ? null : 'found:new', () => ({
    form: { titulo: '', categoria: 'Electrónica', lugar: '', fecha: hoyISO(), hora: ahoraHora(), descripcion: '', resguardo: 'persona', docente: '', ubicacionResguardo: '', ...edicion?.inicial },
    imagen: null, requestKey: crypto.randomUUID(),
  }))
  const f = draft.form
  const setF = (form) => setDraft((current) => ({ ...current, form }))
  const imagen = draft.imagen ?? null
  const setImagen = (imagen) => setDraft((current) => ({ ...current, imagen }))
  const [discarding, setDiscarding] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    if (enviando) return
    if (!f.titulo.trim() || !f.lugar.trim() || !f.descripcion.trim() || !f.fecha) return setError('Completa el objeto, el lugar, la fecha y la descripción.')
    if (!edicion && f.resguardo === 'docente' && !f.docente.trim()) return setError('Escribe el nombre del docente.')
    if (!edicion && f.resguardo === 'oficina' && !f.officeConfirmed) return setError('Confirma que ya dejaste el objeto en oficina.')
    setEnviando(true)
    setError('')
    if (edicion) {
      const { titulo, categoria, lugar, fecha, hora, descripcion } = f
      try { await edicion.onGuardar({ titulo: titulo.trim(), categoria, lugar: lugar.trim(), fecha, hora, descripcion }) } catch (err) { setError(err.message); setEnviando(false) }
      return
    }
    try {
      let fotoPreview = imagen?.url
      if (USE_MOCK && imagen?.file) {
        fotoPreview = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('No se pudo cargar la imagen.'))
          reader.readAsDataURL(imagen.file)
        })
      }
      const h = await crearHallazgo({ ...f, imagen, fotoPreview, requestKey: draft.requestKey })
      clearDraft()
      toast(h.aviso || 'Objeto encontrado publicado.')
      navigate(h.aviso ? `/editar/hallazgo/${h.id}` : `/reclamo/${h.id}`, { state: { aviso: h.aviso } })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <form className="card" onSubmit={enviar} noValidate>
      {!edicion && <p className="account-help">Publicas como <strong>{usuario.nombre}</strong></p>}
      {!edicion && draft.dirty && <div className="draft-actions"><button type="button" className="link-green" onClick={() => setDiscarding(true)}>Descartar borrador</button></div>}
      <Modal open={discarding} onClose={() => setDiscarding(false)} title="¿Descartar el borrador?"><div className="btn-row"><button type="button" className="btn btn--secondary" onClick={() => setDiscarding(false)}>Seguir editando</button><button type="button" className="btn btn--danger" onClick={() => { resetDraft(); setError(''); setDiscarding(false) }}>Descartar</button></div></Modal>
      <datalist id="report-locations">{UBICACIONES.map((place) => <option key={place} value={place} />)}</datalist>
      <div className="field"><label htmlFor="titulo">¿Qué encontraste?</label><input id="titulo" className="input" placeholder="Ej. Calculadora Casio" value={f.titulo} onChange={set('titulo')} /></div>
      <div className="field"><span className="label">Categoría</span><Categorias value={f.categoria} onChange={(c) => setF({ ...f, categoria: c })} /></div>
      <div className="field"><label htmlFor="lugar">¿Dónde lo encontraste?</label><input id="lugar" className="input" list="report-locations" placeholder="ej. Salón 15, edificio I" value={f.lugar} onChange={set('lugar')} /></div>
      <div className="row2">
        <div className="field"><label htmlFor="fecha">Fecha</label><input id="fecha" type="date" className="input mono" max={hoyISO()} value={f.fecha} onChange={set('fecha')} /></div>
        {USE_MOCK && <div className="field"><label htmlFor="hora">Hora</label><input id="hora" type="time" className="input mono" value={f.hora} onChange={set('hora')} /></div>}
      </div>
      <div className="field"><label htmlFor="desc">Descripción</label><textarea id="desc" className="textarea" placeholder="Color, marca o estado" value={f.descripcion} onChange={set('descripcion')} /></div>
      {!edicion && <CustodyFields value={f} onChange={setF} disabled={enviando} />}
      {!edicion && <ImageAttachment compact value={imagen} onChange={setImagen} disabled={enviando} />}
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      {edicion
        ? <button className="btn btn--primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar cambios'}</button>
        : <button className="btn btn--primary" disabled={enviando}><IconSend width={18} height={18} /> {enviando ? 'Publicando…' : 'Publicar objeto encontrado'}</button>}
    </form>
  )
}

/** Formulario de extravío. Con `edicion = { inicial, onGuardar }` corrige uno existente. */
export function FormPerdi({ edicion }) {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { usuario } = useAuth()
  const [draft, setDraft, clearDraft, resetDraft] = useReportDraft(edicion ? null : 'lost:new', () => ({
    form: { titulo: '', categoria: 'Electrónica', lugar: '', fecha: hoyISO(), descripcion: '', alertas: true, ...location.state?.search, ...edicion?.inicial },
    imagen: null, requestKey: crypto.randomUUID(),
  }))
  const f = draft.form
  const setF = (form) => setDraft((current) => ({ ...current, form }))
  const imagen = draft.imagen
  const setImagen = (imagen) => setDraft((current) => ({ ...current, imagen }))
  const [discarding, setDiscarding] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    if (enviando) return
    if (!f.titulo.trim() || !f.lugar.trim() || !f.descripcion.trim()) return setError('Escribe qué perdiste, su descripción y dónde crees que fue.')
    setEnviando(true)
    setError('')
    if (edicion) {
      const { titulo, categoria, lugar, fecha, descripcion, alertas } = f
      try { await edicion.onGuardar({ titulo: titulo.trim(), categoria, lugar: lugar.trim(), fecha, descripcion, alertas }) } catch (err) { setError(err.message); setEnviando(false) }
      return
    }
    try {
      const reporte = await crearExtravio({ ...f, imagen, requestKey: draft.requestKey })
      clearDraft()
      toast(reporte.aviso || 'Reporte de extravío creado.')
      navigate(reporte.aviso ? `/editar/extravio/${reporte.id}` : '/publicaciones?tab=extravios', { state: { aviso: reporte.aviso } })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <form className="card" onSubmit={enviar} noValidate>
      {!edicion && <p className="account-help">Publicas como <strong>{usuario.nombre}</strong></p>}
      {!edicion && draft.dirty && <div className="draft-actions"><button type="button" className="link-green" onClick={() => setDiscarding(true)}>Descartar borrador</button></div>}
      <Modal open={discarding} onClose={() => setDiscarding(false)} title="¿Descartar el borrador?"><div className="btn-row"><button type="button" className="btn btn--secondary" onClick={() => setDiscarding(false)}>Seguir editando</button><button type="button" className="btn btn--danger" onClick={() => { resetDraft({ form: { titulo: '', categoria: 'Electrónica', lugar: '', fecha: hoyISO(), descripcion: '', alertas: true }, imagen: null, requestKey: crypto.randomUUID() }); setError(''); setDiscarding(false) }}>Descartar</button></div></Modal>
      <datalist id="lost-locations">{UBICACIONES.map((place) => <option key={place} value={place} />)}</datalist>
      <div className="field"><label htmlFor="p-titulo">¿Qué perdiste?</label><input id="p-titulo" className="input" placeholder="ej. Mouse inalámbrico negro" value={f.titulo} onChange={set('titulo')} /></div>
      <div className="field"><span className="label">Categoría</span><Categorias value={f.categoria} onChange={(c) => setF({ ...f, categoria: c })} /></div>
      <div className="field"><label htmlFor="p-lugar">¿Dónde crees que lo perdiste?</label><input id="p-lugar" className="input" list="lost-locations" placeholder="ej. Salón 15, edificio I" value={f.lugar} onChange={set('lugar')} /></div>
      <div className="field"><label htmlFor="p-fecha">Fecha aproximada</label><input id="p-fecha" type="date" className="input mono" max={hoyISO()} value={f.fecha} onChange={set('fecha')} /></div>
      <div className="field"><label htmlFor="p-desc">Descripción</label><textarea id="p-desc" className="textarea" placeholder="Color, marca, señas particulares…" value={f.descripcion} onChange={set('descripcion')} /></div>
      {!edicion && <ImageAttachment compact value={imagen} onChange={setImagen} disabled={enviando} />}
      {USE_MOCK && <label className="check">
        <input type="checkbox" checked={f.alertas} onChange={(e) => setF({ ...f, alertas: e.target.checked })} />
        <span>Avísame por correo cuando aparezca un objeto parecido.</span>
      </label>}
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      {edicion
        ? <button className="btn btn--primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar cambios'}</button>
        : <button className="btn btn--primary" disabled={enviando}><IconSend width={18} height={18} /> {enviando ? 'Publicando…' : 'Publicar objeto perdido'}</button>}
    </form>
  )
}

export default function Reportar() {
  const [params, setParams] = useSearchParams()
  const sourceId = params.get('sourceLostReportId')
  const lost = params.get('tab') === 'perdi'
  if (sourceId) return <Navigate replace to={`/extravio/${encodeURIComponent(sourceId)}/responder`} />

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Tipo de reporte">
        <button type="button" role="tab" aria-selected={!lost} className={!lost ? 'is-active' : ''} onClick={() => setParams({})}>Objeto encontrado</button>
        <button type="button" role="tab" aria-selected={lost} className={lost ? 'is-active' : ''} onClick={() => setParams({ tab: 'perdi' })}>Objeto perdido</button>
      </div>
      {lost ? <FormPerdi /> : <FormEncontre />}
    </>
  )
}
