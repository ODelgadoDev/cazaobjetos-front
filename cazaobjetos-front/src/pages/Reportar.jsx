import { CustodyFields } from '../components/CustodyEditor.jsx'
import { useReportDraft, useReportDrafts } from '../context/ReportDraftContext.jsx'
import Modal from '../components/Modal.jsx'
import ImageAttachment from '../components/ImageAttachment.jsx'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { USE_MOCK, crearExtravio, crearHallazgo, getExtravio } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { CATEGORIAS, UBICACIONES } from '../lib/constants.js'
import { ahoraHora, hoyISO } from '../lib/format.js'
import { IconImage, IconInfo, IconSend } from '../components/Icons.jsx'

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
export function FormEncontre({ edicion, origen }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [draft, setDraft, clearDraft, resetDraft] = useReportDraft(edicion ? null : `found:${origen?.id || 'new'}`, () => ({
    form: { titulo: '', categoria: 'Electrónica', lugar: '', fecha: hoyISO(), hora: ahoraHora(), descripcion: '', resguardo: 'persona', docente: '', ubicacionResguardo: '', ...(origen ? { titulo: origen.titulo, categoria: origen.categoria } : {}), ...edicion?.inicial },
    foto: null, preview: '', requestKey: crypto.randomUUID(),
  }))
  const f = draft.form
  const setF = (form) => setDraft((current) => ({ ...current, form }))
  const { foto, preview } = draft
  const setFoto = (foto) => setDraft((current) => ({ ...current, foto }))
  const setPreview = (preview) => setDraft((current) => ({ ...current, preview }))
  const [discarding, setDiscarding] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  function onFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) return setError('Sube una imagen JPG o PNG.')
    if (file.size > 5 * 1024 * 1024) return setError('La imagen pesa más de 5 MB.')
    setError('')
    setFoto(file)
    const r = new FileReader()
    r.onload = () => setPreview(r.result)
    r.readAsDataURL(file)
  }

  const valido = f.titulo.trim() && f.lugar.trim() && f.descripcion.trim() && f.fecha && (edicion || f.resguardo !== 'docente' || f.docente.trim())

  async function enviar(e) {
    e.preventDefault()
    if (!valido) return setError(edicion ? 'Completa el nombre, el lugar y la fecha.' : 'Completa el nombre, la descripción, el lugar, la fecha y el nombre del docente si lo dejaste con él.')
    if (!edicion && f.resguardo === 'oficina' && !f.officeConfirmed) return setError('Confirma que ya dejaste el objeto en oficina.')
    if (!edicion && !foto) return setError('Adjunta una foto real del objeto encontrado.')
    setEnviando(true)
    setError('')
    if (edicion) {
      const { titulo, categoria, lugar, fecha, hora, descripcion } = f
      try { await edicion.onGuardar({ titulo: titulo.trim(), categoria, lugar: lugar.trim(), fecha, hora, descripcion }) } catch (err) { setError(err.message); setEnviando(false) }
      return
    }
    try {
      const h = await crearHallazgo({ ...f, sourceLostReportId: origen?.id || null, foto, fotoPreview: preview, requestKey: draft.requestKey })
      clearDraft()
      toast(origen ? 'Hallazgo publicado. Su dueño recibió un aviso para compararlo.' : `Hallazgo publicado. Folio ${h.folio}`)
      navigate(`/reclamo/${h.id}`)
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <form className="card" onSubmit={enviar} noValidate>
      {!edicion && <label className="dropzone">
        {preview ? <img src={preview} alt="Vista previa del objeto" /> : <IconImage width={28} height={28} />}
        <strong>Tomar o subir foto del objeto · Obligatoria</strong>
        <span className="muted">Evita mostrar datos personales</span>
        <input type="file" accept="image/jpeg,image/png" onChange={onFoto} aria-label="Foto del objeto" />
      </label>}
      {!edicion && draft.dirty && <div className="draft-actions"><span className="muted">Borrador conservado durante esta sesión.</span><button type="button" className="link-green" onClick={() => setDiscarding(true)}>Descartar borrador</button></div>}
      <Modal open={discarding} onClose={() => setDiscarding(false)} title="¿Descartar el borrador?"><p>Se quitarán el texto y la foto de esta publicación.</p><div className="btn-row"><button type="button" className="btn btn--secondary" onClick={() => setDiscarding(false)}>Seguir editando</button><button type="button" className="btn btn--danger" onClick={() => { resetDraft(); setError(''); setDiscarding(false) }}>Descartar</button></div></Modal>
      <datalist id="report-locations">{UBICACIONES.map((place) => <option key={place} value={place} />)}</datalist>
      <div className="field"><label htmlFor="titulo">Nombre del objeto</label><input id="titulo" className="input" placeholder="ej. Calculadora Casio fx-991" value={f.titulo} onChange={set('titulo')} /></div>
      <div className="field"><span className="label">Categoría</span><Categorias value={f.categoria} onChange={(c) => setF({ ...f, categoria: c })} /></div>
      <div className="field"><label htmlFor="lugar">¿Dónde lo encontraste?</label><input id="lugar" className="input" list="report-locations" placeholder="ej. Salón 15, edificio I" value={f.lugar} onChange={set('lugar')} /></div>
      <div className="row2">
        <div className="field"><label htmlFor="fecha">Fecha</label><input id="fecha" type="date" className="input mono" max={hoyISO()} value={f.fecha} onChange={set('fecha')} /></div>
        {USE_MOCK && <div className="field"><label htmlFor="hora">Hora</label><input id="hora" type="time" className="input mono" value={f.hora} onChange={set('hora')} /></div>}
      </div>
      {!edicion && <div className="inline-form">
        <p className="account-help">Tú gestionas la devolución. Registrar el resguardo no transfiere la revisión del reclamo.</p>
        <CustodyFields value={f} onChange={setF} disabled={enviando} />
      </div>}
      <div className="field"><label htmlFor="desc">Descripción visible</label><textarea id="desc" className="textarea" placeholder="Color, marca, estado… (no describas detalles privados)" value={f.descripcion} onChange={set('descripcion')} /></div>
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      {edicion ? (
        <button className="btn btn--primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar cambios'}</button>
      ) : (
        <>
          <button className="btn btn--primary" disabled={enviando}><IconSend width={18} height={18} /> {enviando ? 'Publicando…' : 'Publicar hallazgo'}</button>
          <p className="help" style={{ textAlign: 'center', margin: 0 }}>SE GENERARÁ UN IDENTIFICADOR DE PUBLICACIÓN</p>
        </>
      )}
    </form>
  )
}

/** Formulario de extravío. Con `edicion = { inicial, onGuardar }` corrige uno existente. */
export function FormPerdi({ edicion }) {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
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
      {!edicion && draft.dirty && <div className="draft-actions"><span className="muted">Borrador conservado durante esta sesión.</span><button type="button" className="link-green" onClick={() => setDiscarding(true)}>Descartar borrador</button></div>}
      <Modal open={discarding} onClose={() => setDiscarding(false)} title="¿Descartar el borrador?"><p>Se quitarán los datos y la imagen de este reporte.</p><div className="btn-row"><button type="button" className="btn btn--secondary" onClick={() => setDiscarding(false)}>Seguir editando</button><button type="button" className="btn btn--danger" onClick={() => { resetDraft({ form: { titulo: '', categoria: 'Electrónica', lugar: '', fecha: hoyISO(), descripcion: '', alertas: true }, imagen: null, requestKey: crypto.randomUUID() }); setError(''); setDiscarding(false) }}>Descartar</button></div></Modal>
      <datalist id="lost-locations">{UBICACIONES.map((place) => <option key={place} value={place} />)}</datalist>
      <div className="field"><label htmlFor="p-titulo">¿Qué perdiste?</label><input id="p-titulo" className="input" placeholder="ej. Mouse inalámbrico negro" value={f.titulo} onChange={set('titulo')} /></div>
      <div className="field"><span className="label">Categoría</span><Categorias value={f.categoria} onChange={(c) => setF({ ...f, categoria: c })} /></div>
      <div className="field"><label htmlFor="p-lugar">¿Dónde crees que lo perdiste?</label><input id="p-lugar" className="input" list="lost-locations" placeholder="ej. Salón 15, edificio I" value={f.lugar} onChange={set('lugar')} /></div>
      <div className="field"><label htmlFor="p-fecha">Fecha aproximada</label><input id="p-fecha" type="date" className="input mono" max={hoyISO()} value={f.fecha} onChange={set('fecha')} /></div>
      <div className="field"><label htmlFor="p-desc">Descripción</label><textarea id="p-desc" className="textarea" placeholder="Color, marca, señas particulares…" value={f.descripcion} onChange={set('descripcion')} /></div>
      {!edicion && <ImageAttachment value={imagen} onChange={setImagen} disabled={enviando} />}
      {USE_MOCK && <label className="check">
        <input type="checkbox" checked={f.alertas} onChange={(e) => setF({ ...f, alertas: e.target.checked })} />
        <span>Avísame por correo cuando aparezca un objeto parecido.</span>
      </label>}
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      {edicion
        ? <button className="btn btn--primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar cambios'}</button>
        : <button className="btn btn--primary" disabled={enviando}><IconSend width={18} height={18} /> {enviando ? 'Enviando…' : 'Crear reporte de extravío'}</button>}
    </form>
  )
}

export default function Reportar() {
  const [params, setParams] = useSearchParams()
  const { usuario } = useAuth()
  const sourceId = params.get('sourceLostReportId') || ''
  const drafts = useReportDrafts()
  const linkedDrafts = [...drafts.entries()].filter(([key, draft]) => key.startsWith('found:') && key !== 'found:new' && draft.dirty)
  const [source, setSource] = useState(null)
  const [sourceError, setSourceError] = useState('')
  useEffect(() => {
    let active = true; setSource(null); setSourceError('')
    if (sourceId) getExtravio(sourceId).then((item) => {
      if (!active) return
      if (item.estado !== 'activo') setSourceError('El reporte original ya no está activo. Revisa su estado antes de publicar.')
      else if (item.autor?.id === usuario.id) setSourceError('Este es tu propio reporte. Si ya recuperaste el objeto, ciérralo desde Tu reporte.')
      else setSource(item)
    }).catch((err) => { if (active) setSourceError(err.message) })
    return () => { active = false }
  }, [sourceId, usuario.id])
  const tab = params.get('tab') === 'perdi' ? 'perdi' : 'encontre'

  return (
    <>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'encontre'} className={tab === 'encontre' ? 'is-active' : ''} onClick={() => setParams(sourceId ? { sourceLostReportId: sourceId } : {})}>Encontré algo</button>
        <button role="tab" aria-selected={tab === 'perdi'} className={tab === 'perdi' ? 'is-active' : ''} onClick={() => setParams({ ...(sourceId ? { sourceLostReportId: sourceId } : {}), tab: 'perdi' })}>Perdí algo</button>
      </div>
      {tab === 'encontre' && !sourceId && linkedDrafts.length > 0 && <section className="card"><h2 className="section-title">Hallazgos sin publicar</h2>{linkedDrafts.map(([key, draft]) => <Link key={key} className="btn btn--secondary" to={`/reportar?sourceLostReportId=${key.slice(6)}`}>Continuar hallazgo de {draft.form.titulo}</Link>)}</section>}
      {tab === 'encontre' && (
        <div className="notice notice--info"><IconInfo width={20} height={20} /><span>Tú gestionas la devolución. Revisa las solicitudes, las pruebas y los comentarios dentro de la app.</span></div>
      )}
      {tab === 'encontre' && sourceId && <section className="card source-report">
        <h2 className="section-title">Este hallazgo responde a un extravío</h2>
        {source && <><strong>{source.titulo}</strong><p>Completa dónde lo encontraste y sube una foto real. Al publicar se avisará al dueño; él decidirá si inicia un reclamo.</p><Link className="link-green" to={`/extravio/${sourceId}`}>Ver reporte original</Link></>}
        {sourceError && <div className="notice notice--peligro" role="alert">{sourceError}</div>}
        {!source && !sourceError && <p>Cargando reporte original…</p>}
        <Link className="link-green" to="/reportar">Publicar sin vincular a este reporte</Link>
      </section>}
      {tab === 'encontre' ? (!sourceId || source) && <FormEncontre key={sourceId} origen={source} /> : <FormPerdi />}
    </>
  )
}
