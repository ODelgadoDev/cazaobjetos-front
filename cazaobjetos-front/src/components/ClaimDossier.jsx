import { useCallback, useEffect, useRef, useState } from 'react'
import { agregarEnlaceEvidenciaReclamo, agregarEvidenciaReclamo, comentarReclamo, getActividadReclamo, getEvidenciasReclamo } from '../lib/api.js'
import { useNotifications } from '../context/NotificationContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './Toast.jsx'
import EvidencePicker, { selectedEvidenceUrls } from './EvidencePicker.jsx'
import ClaimSection from './ClaimSection.jsx'

const labels = {
  SUBMITTED: 'Envió el reclamo', ACCEPTED: 'Aceptó el reclamo', REJECTED: 'Rechazó el reclamo',
  CANCELLED: 'Canceló el reclamo', COMPLETED: 'Confirmó la entrega', CLOSED: 'Cerró el reclamo',
  EVIDENCE_ADDED: 'Añadió una foto', CUSTODY_CHANGED: 'Cambió el resguardo',
  PUBLICATION_EDITED: 'Editó el hallazgo', DELEGATED: 'Cambió al responsable', HISTORY_IMPORTED: 'Importó el historial',
}
const date = (value) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

export default function ClaimDossier({ id, canContribute, onUpdated }) {
  const toast = useToast()
  const { usuario } = useAuth()
  const { version } = useNotifications()
  const sequence = useRef(0)
  const [activity, setActivity] = useState({ items: [], page: 0, hasNext: false })
  const [images, setImages] = useState([])
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState({ files: [], urls: [], draftUrl: '' })
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [olderLoading, setOlderLoading] = useState(false)
  const attempt = useRef(null)
  const photoKey = useRef(crypto.randomUUID())

  const load = useCallback(async () => {
    const current = ++sequence.current
    try {
      const [timeline, evidence] = await Promise.all([getActividadReclamo(id), getEvidenciasReclamo(id)])
      if (current !== sequence.current) return
      setActivity((previous) => {
        const entries = [...new Map([...timeline.items, ...previous.items].map((entry) => [entry.id, entry])).values()]
        return { ...timeline, items: entries, page: previous.page, hasNext: previous.page ? previous.hasNext : timeline.hasNext }
      })
      setImages(evidence)
      setLoadError('')
    } catch (e) { if (current === sequence.current) setLoadError(e.message) }
    finally { if (current === sequence.current) setLoading(false) }
  }, [id])

  useEffect(() => {
    load()
    return () => { sequence.current += 1 }
  }, [load, version, canContribute])

  async function older() {
    setOlderLoading(true); setError('')
    try {
      const olderPage = await getActividadReclamo(id, activity.page + 1)
      setActivity((current) => ({ ...olderPage, items: [...new Map([...current.items, ...olderPage.items].map((entry) => [entry.id, entry])).values()] }))
    } catch (e) { setError(e.message) }
    finally { setOlderLoading(false) }
  }

  async function send(event) {
    event.preventDefault()
    const content = body.trim()
    if (!content || saving || !canContribute) return
    if (attempt.current?.body !== content) attempt.current = { body: content, key: crypto.randomUUID() }
    setSaving(true); setError('')
    try {
      await comentarReclamo(id, content, attempt.current.key)
      setBody(''); attempt.current = null
      await load()
    } catch (e) { setError(e.message); if ([404, 409].includes(e.status)) onUpdated() }
    finally { setSaving(false) }
  }

  async function upload() {
    const [file] = photos.files
    if ((!file && !photos.urls.length && !photos.draftUrl?.trim()) || saving || !canContribute) return
    setSaving(true); setError('')
    try {
      const [url] = selectedEvidenceUrls(photos, 1)
      if (file) await agregarEvidenciaReclamo(id, file, photoKey.current)
      else await agregarEnlaceEvidenciaReclamo(id, url, photoKey.current)
      setPhotos({ files: [], urls: [], draftUrl: '' }); photoKey.current = crypto.randomUUID()
      await load()
      toast('Foto añadida.')
    } catch (e) { setError(e.message); if ([404, 409].includes(e.status)) onUpdated() }
    finally { setSaving(false) }
  }

  const comments = activity.items.filter((entry) => entry.kind === 'COMMENT')
  const history = activity.items.filter((entry) => entry.kind !== 'COMMENT')
  const hasPhotos = photos.files.length > 0 || photos.urls.length > 0 || !!photos.draftUrl?.trim()
  return (
    <div className="claim-dossier">
      {(error || loadError) && <p className="notice notice--peligro" role="alert">{error || loadError}</p>}
      <ClaimSection id="claim-comments" title="Comentarios" defaultOpen={true}>
        {!loading && !comments.length && <p className="muted">Sin comentarios.</p>}
        {comments.length > 0 && <ol className="claim-timeline">
          {[...comments].reverse().map((entry) => <li key={entry.id} className="claim-entry claim-entry--comment">
            <header><strong>{entry.actorName}</strong><time dateTime={entry.createdAt}>{date(entry.createdAt)}</time></header>
            <p>{entry.body}</p>
          </li>)}
        </ol>}
        {canContribute && <form className="claim-comment-form" onSubmit={send}>
          <div className="field">
            <label htmlFor={`comment-${id}`}>Comentar · {usuario.nombre}</label>
            <textarea id={`comment-${id}`} className="textarea" value={body} maxLength={2000} disabled={saving}
              placeholder="Coordina la entrega o pregunta por el objeto" onChange={(e) => setBody(e.target.value)} />
          </div>
          <button className="btn btn--primary" disabled={!body.trim() || saving}>{saving ? 'Guardando…' : 'Enviar comentario'}</button>
        </form>}
        {activity.hasNext && <button type="button" className="btn btn--secondary" onClick={older} disabled={olderLoading}>{olderLoading ? 'Cargando…' : 'Ver registros anteriores'}</button>}
        {history.length > 0 && <details className="claim-attachments">
          <summary>Historial</summary>
          <ol className="claim-timeline claim-section__body">{[...history].reverse().map((entry) => <li key={entry.id} className="claim-entry">
            <header><strong>{entry.actorName}</strong><time dateTime={entry.createdAt}>{date(entry.createdAt)}</time></header>
            <p>{entry.kind === 'REJECTED' && entry.body ? entry.body : labels[entry.kind] || entry.body}</p>
          </li>)}</ol>
        </details>}
      </ClaimSection>
      {(images.length > 0 || canContribute) && <ClaimSection id="claim-evidence" title={images.length ? `Fotos (${images.length})` : 'Fotos'} defaultOpen={false}>
        {images.length > 0 && <div className="evidence-grid">{images.map((image, index) => <figure key={image.id} className="evidence-preview">
          <a href={image.url} target="_blank" rel="noreferrer" aria-label={`Abrir foto ${index + 1}`}>
            <img src={image.url} alt={`Foto ${index + 1}`} referrerPolicy="no-referrer" loading="lazy" />
          </a>
          {image.reference && <figcaption className="muted">Imagen de referencia</figcaption>}
        </figure>)}</div>}
        {canContribute && images.length < 5 && <div className="claim-evidence-upload">
          <EvidencePicker files={photos.files} urls={photos.urls} draftUrl={photos.draftUrl} max={1}
            onDraftUrlChange={(draftUrl) => { setPhotos((current) => ({ ...current, draftUrl })); photoKey.current = crypto.randomUUID() }} disabled={saving || loading}
            onChange={(files, urls) => { setPhotos({ files, urls }); photoKey.current = crypto.randomUUID() }} />
          {hasPhotos && <button type="button" className="btn btn--primary" disabled={saving} onClick={upload}>
            {saving ? 'Guardando…' : 'Guardar foto'}
          </button>}
        </div>}
      </ClaimSection>}
    </div>
  )
}
