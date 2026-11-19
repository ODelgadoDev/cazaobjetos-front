import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import { useToast } from './Toast.jsx'
import { fechaCorta } from '../lib/format.js'
import { cancelLostResponse, completeLostResponse, getLostResponseComments, lostResponsePhoto, postLostResponseComment } from '../lib/lostResponses.js'
import '../pages/lostResponses.css'

const stateLabels = { OPEN: 'Encontrado', COMPLETED: 'Entregado', CANCELLED: 'Cancelado' }

export default function LostResponseThread({ response, reportActive, selected, onChanged }) {
  const { usuario } = useAuth()
  const { version } = useNotifications()
  const toast = useToast()
  const { id, lostReportId, finderName, ownerId, location, body, status, createdAt } = response
  const active = reportActive && status === 'OPEN'
  const owner = usuario.id === ownerId
  const photo = lostResponsePhoto(response)
  const [imageFailed, setImageFailed] = useState(false)
  const [opened, setOpened] = useState(selected)
  const [comments, setComments] = useState(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const section = useRef(null)
  const attempt = useRef(null)

  useEffect(() => {
    if (selected) {
      setOpened(true)
      section.current?.scrollIntoView({ block: 'start' })
    }
  }, [selected])

  useEffect(() => {
    if (!opened) return
    const controller = new AbortController()
    getLostResponseComments(lostReportId, id, controller.signal).then((items) => {
      if (!controller.signal.aborted) setComments(items)
    }).catch((err) => {
      if (!controller.signal.aborted) setError(err.message)
    })
    return () => controller.abort()
  }, [id, lostReportId, opened, revision, version])

  async function send(event) {
    event.preventDefault()
    const text = draft.trim()
    if (busy || !active || !text) return
    if (attempt.current?.body !== text) attempt.current = { body: text, key: crypto.randomUUID() }
    setBusy(true)
    setError('')
    try {
      await postLostResponseComment(lostReportId, id, text, attempt.current.key)
      setDraft('')
      attempt.current = null
      setRevision((value) => value + 1)
    } catch (err) {
      setError(err.message)
      if (err.status === 409) onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    if (busy || !active) return
    if (!owner && !window.confirm('¿Retirar esta respuesta?')) return
    setBusy(true)
    setError('')
    try {
      if (owner) await completeLostResponse(lostReportId, id)
      else await cancelLostResponse(lostReportId, id)
      toast(owner ? 'Entrega confirmada.' : 'Respuesta retirada.')
      await onChanged()
    } catch (err) {
      setError(err.message)
      if (err.status === 409) onChanged()
    } finally {
      setBusy(false)
    }
  }

  return <article ref={section} id={`respuesta-${id}`} className="card lost-response">
    <div className="lost-response__head">
      <h3>{finderName}</h3>
      <span className={`chip ${status === 'OPEN' || status === 'COMPLETED' ? 'chip--ok' : 'chip--cat'}`}>{stateLabels[status]}</span>
    </div>
    <div className="lost-response__byline"><span>{location}</span><time dateTime={createdAt}>{fechaCorta(createdAt)}</time></div>
    <p className="lost-response__body">{body}</p>
    {photo && !imageFailed && <img className="lost-response__photo" src={photo} alt="Imagen adjunta a la respuesta" referrerPolicy="no-referrer" loading="lazy" onError={() => setImageFailed(true)} />}
    {error && <div className="notice notice--peligro" role="alert">{error}</div>}
    <details className="lost-response__thread" open={opened} onToggle={(event) => setOpened(event.currentTarget.open)}>
      <summary>Comentarios{comments?.length ? ` (${comments.length})` : ''}</summary>
      {comments?.length > 0 && <ol className="lost-response__comments">{comments.map((comment) =>
        <li key={comment.id}><div className="lost-response__head"><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{fechaCorta(comment.createdAt)}</time></div><p>{comment.body}</p></li>
      )}</ol>}
      {opened && !comments && !error && <p className="muted">Cargando comentarios…</p>}
      {active && <form className="lost-response__form" onSubmit={send}>
        <label htmlFor={`comentario-${id}`}>{usuario.nombre}</label>
        <textarea id={`comentario-${id}`} className="textarea" placeholder="Escribe un comentario" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} disabled={busy} />
        <button type="submit" className="btn btn--secondary" disabled={busy || !draft.trim()}>Enviar comentario</button>
      </form>}
    </details>
    {active && <button className={`btn ${owner ? 'btn--primary' : 'btn--secondary'}`} type="button" onClick={finish} disabled={busy}>{owner ? 'Confirmar que lo recibí' : 'Retirar respuesta'}</button>}
  </article>
}
