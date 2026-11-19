import { useCallback, useEffect, useRef, useState } from 'react'
import { agregarEvidenciaReclamo, comentarReclamo, getActividadReclamo, getEvidenciasReclamo } from '../lib/api.js'
import { useNotifications } from '../context/NotificationContext.jsx'
import { useToast } from './Toast.jsx'
import EvidencePicker from './EvidencePicker.jsx'
import ClaimSection from './ClaimSection.jsx'
import { IconSend } from './Icons.jsx'

const labels = { SUBMITTED: 'Solicitud', ACCEPTED: 'Aceptado', REJECTED: 'Rechazado', CANCELLED: 'Cancelado', COMPLETED: 'Entregado', CLOSED: 'Cerrado', COMMENT: 'Comentario', EVIDENCE_ADDED: 'Evidencia', CUSTODY_CHANGED: 'Resguardo', PUBLICATION_EDITED: 'Ficha actualizada', DELEGATED: 'Responsable', HISTORY_IMPORTED: 'Expediente previo' }
const when = (date) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
const custody = { WITH_FINDER: 'Con quien lo encontró', WITH_TEACHER: 'Con un docente', OFFICE: 'En oficina' }
function Snapshot({ value }) {
  if (!value) return null
  let data
  try { data = JSON.parse(value) } catch { return null }
  const snapshots = data.foundItem ? [['Ficha registrada', data.foundItem]] : data.before && data.after ? [['Antes', data.before], ['Después', data.after]] : []
  if (!snapshots.length) return null
  const fields = [['title', 'Objeto'], ['description', 'Descripción'], ['foundLocation', 'Lugar del hallazgo'], ['lostLocation', 'Lugar del extravío'], ['custody', 'Resguardo'], ['teacherName', 'Docente de referencia'], ['custodyLocation', 'Ubicación de resguardo']]
  return <details className="claim-snapshot"><summary>Ver ficha registrada</summary>{snapshots.map(([label, record]) => <div key={label}><strong>{label}</strong><dl>{fields.filter(([key]) => record[key]).map(([key, title]) => <div key={key}><dt>{title}</dt><dd>{key === 'custody' ? custody[record[key]] : record[key]}</dd></div>)}</dl></div>)}</details>
}
export default function ClaimDossier({ id, description, canContribute, onUpdated, children }) {
  const toast = useToast()
  const { version } = useNotifications()
  const [hasUpdates, setHasUpdates] = useState(false)
  const latestVisible = useRef(null)
  const [activity, setActivity] = useState({ items: [], page: 0, hasNext: false })
  const [images, setImages] = useState([])
  const [body, setBody] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [olderLoading, setOlderLoading] = useState(false)
  const attempt = useRef(null)
  const fileKey = useRef(crypto.randomUUID())
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [timeline, evidence] = await Promise.all([getActividadReclamo(id), getEvidenciasReclamo(id)])
      setActivity(timeline); setImages(evidence); setError(''); setHasUpdates(false)
      latestVisible.current = timeline.items[0]?.id || ''
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [id])
  useEffect(() => { load() }, [load, canContribute])
  useEffect(() => {
    if (latestVisible.current === null || !canContribute) return
    let active = true
    getActividadReclamo(id).then((timeline) => {
      if (active) setHasUpdates((timeline.items[0]?.id || '') !== latestVisible.current)
    }).catch(() => {})
    return () => { active = false }
  }, [id, version, canContribute])
  async function older() {
    setOlderLoading(true)
    try {
      const next = await getActividadReclamo(id, activity.page + 1)
      setActivity((current) => ({ ...next, items: [...new Map([...current.items, ...next.items].map((entry) => [entry.id, entry])).values()] }))
    } catch (e) { setError(e.message) }
    finally { setOlderLoading(false) }
  }
  async function send(event) {
    event.preventDefault(); const clean = body.trim()
    if (!clean || saving || !canContribute) return
    if (!attempt.current || attempt.current.body !== clean) attempt.current = { body: clean, key: crypto.randomUUID() }
    setSaving(true); setError('')
    try {
      await comentarReclamo(id, clean, attempt.current.key)
      setBody(''); attempt.current = null
      await load(); toast('Comentario publicado en el expediente.')
    } catch (e) { setError(e.message); if (e.status === 409 || e.status === 404) onUpdated() }
    finally { setSaving(false) }
  }
  async function upload() {
    if (!files.length || saving || !canContribute) return
    setSaving(true); setError('')
    try {
      await agregarEvidenciaReclamo(id, files[0], fileKey.current)
      setFiles([]); fileKey.current = crypto.randomUUID()
      await load(); toast('Evidencia guardada en el expediente.')
    } catch (e) { setError(e.message); if (e.status === 409 || e.status === 404) onUpdated() }
    finally { setSaving(false) }
  }
  return (
    <div className="claim-dossier">
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      {hasUpdates && <div className="notice notice--info" role="status"><span>Hay novedades en este expediente.</span><button type="button" className="btn btn--secondary" disabled={saving || loading} onClick={async () => { await load(); onUpdated() }}>Ver novedades</button></div>}
      <ClaimSection id="claim-evidence" title={`Pruebas de propiedad · ${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}`}>
        <h3>Descripción del solicitante</h3>
        <p className="claim-private-description">{description}</p>
        <h3>Imágenes privadas</h3>
        <p className="account-help">Solo las ven el solicitante y el responsable. Las imágenes enviadas se conservan como parte del expediente.</p>
        {loading && !images.length ? <p className="muted">Cargando evidencias…</p> : !images.length && <p className="muted">Sin imágenes adjuntas.</p>}
        <div className="evidence-grid">{images.map((image, index) => <figure key={image.id} className="evidence-preview">
          <a href={image.url} target="_blank" rel="noreferrer" aria-label={`Abrir evidencia ${index + 1}`}><img src={image.url} alt={`Evidencia privada ${index + 1}`} /></a>
          <figcaption>Evidencia {index + 1} · {when(image.createdAt)}</figcaption>
        </figure>)}</div>
        {canContribute && images.length < 5 && <div className="claim-evidence-upload">
          <EvidencePicker files={files} onChange={(next) => { setFiles(next); fileKey.current = crypto.randomUUID() }} max={1} disabled={saving || loading} />
          {!!files.length && <div className="btn-row"><button type="button" className="btn btn--secondary" disabled={saving} onClick={() => setFiles([])}>Cancelar evidencia</button><button type="button" className="btn btn--primary" disabled={saving} onClick={upload}>{saving ? 'Guardando…' : 'Guardar evidencia'}</button></div>}
        </div>}
        {children}
      </ClaimSection>
      <ClaimSection id="claim-comments" title="Comentarios e historial">
        <button type="button" className="btn btn--secondary" onClick={async () => { await load(); onUpdated() }} disabled={saving || loading}>{loading ? 'Actualizando…' : 'Actualizar expediente'}</button>
        {canContribute ? <form className="claim-comment-form" onSubmit={send}>
          <div className="field"><label htmlFor={`comment-${id}`}>Publicar comentario</label><textarea id={`comment-${id}`} className="textarea" value={body} maxLength={2000} disabled={saving} onChange={(event) => setBody(event.target.value)} placeholder="Pide una prueba, responde una pregunta o acuerda dónde entregar el objeto…" /><span className="help">{body.length}/2000 · SOLO LOS PARTICIPANTES DEL RECLAMO</span></div>
          <button className="btn btn--primary" disabled={!body.trim() || saving}><IconSend width={18} height={18} /> {saving ? 'Guardando…' : 'Publicar comentario'}</button>
        </form> : <div className="notice notice--info" role="status">Este reclamo finalizó. Puedes consultar su historial y evidencias; ya no admite comentarios ni archivos nuevos.</div>}
        {activity.hasNext && <button type="button" className="btn btn--secondary" onClick={older} disabled={olderLoading}>{olderLoading ? 'Cargando…' : 'Ver registros anteriores'}</button>}
        <ol className="claim-timeline">{[...activity.items].reverse().map((entry) => <li key={entry.id} className={`claim-entry${entry.kind === 'COMMENT' ? ' claim-entry--comment' : ''}`}>
          <header><span className="claim-entry__kind">{labels[entry.kind] || entry.kind}</span><span>{entry.actorName}</span><time dateTime={entry.createdAt}>{when(entry.createdAt)}</time></header>
          <p>{entry.body}</p>
          <Snapshot value={entry.detailsJson} />
          {entry.evidenceId && images.some((image) => image.id === entry.evidenceId) && <a className="link-green" href={images.find((image) => image.id === entry.evidenceId).url} target="_blank" rel="noreferrer">Abrir evidencia registrada</a>}
        </li>)}</ol>
        {!loading && !activity.items.length && <p className="muted">Todavía no hay aportaciones en este expediente.</p>}
      </ClaimSection>
    </div>
  )
}
