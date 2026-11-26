import { sendCommentOnEnter } from '../lib/commentKeys.js'
import FormHelp from './FormHelp.jsx'
import ConversationAuthor from './ConversationAuthor.jsx'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import { useToast } from './Toast.jsx'
import LostResponseCustodyFields, { DEFAULT_OFFICE } from './LostResponseCustodyFields.jsx'
import { fechaCorta } from '../lib/format.js'
import { cancelLostResponse, completeLostResponse, getLostResponseComments, lostResponsePhoto, postLostResponseComment, updateLostResponseCustody } from '../lib/lostResponses.js'
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
  const [editingCustody, setEditingCustody] = useState(false)
  const [custody, setCustody] = useState('WITH_FINDER')
  const [custodyLocation, setCustodyLocation] = useState(DEFAULT_OFFICE)
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
      const updated = owner ? await completeLostResponse(lostReportId, id) : await cancelLostResponse(lostReportId, id)
      toast(owner ? 'Entrega confirmada.' : 'Respuesta retirada.')
      await onChanged(updated)
    } catch (err) {
      setError(err.message)
      if (err.status === 409) onChanged()
    } finally {
      setBusy(false)
    }
  }

  function editCustody() {
    setCustody(response.custody || 'WITH_FINDER')
    setCustodyLocation(response.custodyLocation || DEFAULT_OFFICE)
    setEditingCustody(true)
  }

  async function saveCustody(event) {
    event.preventDefault()
    if (busy || !active || owner) return
    setBusy(true)
    setError('')
    try {
      const updated = await updateLostResponseCustody(lostReportId, id, custody, custodyLocation.trim())
      setEditingCustody(false)
      setRevision((value) => value + 1)
      toast('Entrega actualizada.')
      await onChanged(updated)
    } catch (err) {
      setError(err.message)
      if (err.status === 409) { setEditingCustody(false); onChanged() }
    } finally {
      setBusy(false)
    }
  }

  return <article ref={section} id={`respuesta-${id}`} className="card lost-response">
    <div className="lost-response__head">
      <h3><ConversationAuthor name={finderName} degree={response.finderDegree} avatarVersion={response.finderAvatarVersion} photoPath={`/lost-reports/${lostReportId}/responses/${id}/authors/${response.finderId}/photo`} /></h3>
      <span className={`chip ${status === 'OPEN' || status === 'COMPLETED' ? 'chip--ok' : 'chip--cat'}`}>{stateLabels[status]}</span>
    </div>
    <div className="lost-response__byline"><span>{location}</span><time dateTime={createdAt}>{fechaCorta(createdAt)}</time></div>
    <p className="lost-response__body">{body}</p>
    {photo && !imageFailed && <img className="lost-response__photo" src={photo} alt="Imagen adjunta a la respuesta" referrerPolicy="no-referrer" loading="lazy" onError={() => setImageFailed(true)} />}
    <div className="response-custody" role="status">
      <div><strong>{response.custody === 'OFFICE' ? (active ? 'Recoger en oficina' : 'Entrega en oficina') : 'Entrega personal'}</strong>
        <p>{response.custody === 'OFFICE' ? response.custodyLocation || DEFAULT_OFFICE : `Con ${finderName}`}</p>
      </div>
      {active && !owner && !editingCustody && <button className="btn btn--secondary" type="button" onClick={editCustody} disabled={busy}>Cambiar entrega</button>}
    </div>
    {active && !owner && editingCustody && <form className="lost-response__form" onSubmit={saveCustody}>
        <FormHelp title="Para qué actualizar la entrega">Indica dónde está ahora el objeto para que la otra persona sepa cómo recogerlo.</FormHelp>
      <LostResponseCustodyFields custody={custody} location={custodyLocation} onCustodyChange={setCustody} onLocationChange={setCustodyLocation} officeLocked={response.custody === 'OFFICE'} disabled={busy} />
      <div className="btn-row">
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar entrega'}</button>
        <button className="btn btn--secondary" type="button" onClick={() => setEditingCustody(false)} disabled={busy}>Cancelar</button>
      </div>
    </form>}
    {error && <div className="notice notice--peligro" role="alert">{error}</div>}
    <details className="lost-response__thread" open={opened} onToggle={(event) => setOpened(event.currentTarget.open)}>
      <summary>Comentarios{comments?.length ? ` (${comments.length})` : ''}</summary>
      {comments?.length > 0 && <ol className="lost-response__comments">{comments.map((comment) =>
        <li key={comment.id}><div className="lost-response__head"><ConversationAuthor name={comment.authorName} degree={comment.authorDegree} avatarVersion={comment.authorAvatarVersion} photoPath={`/lost-reports/${lostReportId}/responses/${id}/authors/${comment.authorId}/photo`} /><time dateTime={comment.createdAt}>{fechaCorta(comment.createdAt)}</time></div><p>{comment.body}</p></li>
      )}</ol>}
      {opened && !comments && !error && <p className="muted">Cargando comentarios…</p>}
      {active && <form className="lost-response__form" onSubmit={send}>
        <FormHelp title="Para qué sirve el comentario">Usa este espacio para resolver dudas o acordar la entrega con la otra persona.</FormHelp>
        <label htmlFor={`comentario-${id}`}><ConversationAuthor name={usuario.nombre} degree={usuario.carrera} photo={usuario.fotoPerfil} /></label>
        <textarea id={`comentario-${id}`} onKeyDown={sendCommentOnEnter} className="textarea" placeholder="Escribe un comentario" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} disabled={busy} />
        <button type="submit" className="btn btn--secondary" disabled={busy || !draft.trim()}>Enviar comentario</button>
      </form>}
    </details>
    {active && <button className={`btn ${owner ? 'btn--primary' : 'btn--secondary'}`} type="button" onClick={finish} disabled={busy}>{owner ? 'Confirmar que lo recibí' : 'Retirar respuesta'}</button>}
  </article>
}
