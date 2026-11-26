import FormHelp from '../components/FormHelp.jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api.js'
import { useNotifications } from '../context/NotificationContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { ChipReclamo } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import ClaimProgress, { nextClaimStep } from '../components/ClaimProgress.jsx'
import ClaimDossier from '../components/ClaimDossier.jsx'
import CustodyEditor from '../components/CustodyEditor.jsx'
import ClaimSection from '../components/ClaimSection.jsx'
import { PushInvitation } from '../components/DeviceNotifications.jsx'
import { IconCheck, IconPin } from '../components/Icons.jsx'
import './flujo-simple.css'

export default function DetalleReclamo() {
  const { id } = useParams()
  return <Expediente key={id} id={id} />
}

function Expediente({ id }) {
  const toast = useToast()
  const { version } = useNotifications()
  const request = useRef(0)
  const [claim, setClaim] = useState(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [answer, setAnswer] = useState('')
  const [custodyOpen, setCustodyOpen] = useState(false)

  const load = useCallback(async () => {
    const sequence = ++request.current
    try {
      const data = await api.getReclamo(id)
      if (sequence !== request.current) return
      setClaim(data)
      setLoadError('')
    } catch (e) {
      if (sequence !== request.current) return
      setLoadError(e.message)
      if ([401, 403, 404].includes(e.status)) setClaim(null)
    }
  }, [id])
  useEffect(() => {
    load()
    return () => { request.current += 1 }
  }, [load, version])

  async function run(action, message) {
    if (busy) return
    setBusy(true); setError('')
    try {
      await action()
      setRejecting(false); setReason('')
      toast(message)
      await load()
    } catch (e) {
      setError(e.message)
      if (e.status === 409) await load()
    } finally { setBusy(false) }
  }

  if (!claim) {
    return loadError ? <p className="notice notice--peligro" role="alert">{loadError}</p> : <p className="empty">Cargando reclamo…</p>
  }
  const item = claim.hallazgo
  const mine = claim.rolEnReclamo === 'solicitante'
  const permissions = claim.permisos || {}
  const active = Boolean(claim.puedeAportar)
  const location = item?.custodia || (item?.resguardo === 'persona' ? `Con ${item.autor?.nombre || claim.gestor?.nombre || 'quien lo encontró'}` : '')
  const canDecide = permissions.aceptar || permissions.rechazar
  const nextStep = nextClaimStep(claim.estado, mine)

  function requestMoreDetails() {
    const question = window.prompt('¿Qué detalle necesitas?')?.trim()
    if (question) run(async () => {
      if (permissions.iniciarRevision) await api.iniciarRevision(id)
      await api.pedirPruebas(id, question)
    }, 'Solicitud de información enviada.')
  }

  return (
    <div className="claim-page claim-page-simple">
      <section className="card claim-summary" id="claim-next" aria-label="Reclamo">
        <div className="pager"><span className="folio">{claim.folio}</span><ChipReclamo estado={claim.estado} /></div>
        <h2>{claim.titulo}</h2>
        <ClaimProgress status={claim.estado} />
        {nextStep && <p className="account-help">{nextStep}</p>}
        {claim.estado === 'entregado' && item?.foto && <Foto src={item.foto} delivered reference={item.fotos?.[0]?.referenceImage} />}
        {claim.estado === 'aprobado' && <div className="claim-ready" role="status">
          <IconCheck width={28} height={28} />
          <div className="claim-ready__content">
            <strong>{mine ? 'Tu objeto está listo para recoger' : 'Reclamo aceptado · pendiente de entrega'}</strong>
            <span className="claim-ready__location"><IconPin width={18} height={18} />
              {item?.resguardo === 'oficina' ? (mine ? 'Recoge en oficina' : 'Entrega en oficina') : item?.resguardo === 'docente' ? `Con ${item.docente || 'el docente'}` : `Entrega con ${mine ? claim.gestor?.nombre || item?.autor?.nombre : claim.solicitante?.nombre}`}
            </span>
            {item?.resguardo === 'oficina' && <span>{item.ubicacionResguardo || 'Oficina de profesores · edificio I'}</span>}
            {item?.resguardo === 'docente' && item.ubicacionResguardo && <span>{item.ubicacionResguardo}</span>}
            {item?.resguardo === 'persona' && <a href="#claim-comments">Acordar encuentro</a>}
          </div>
        </div>}
        <dl className="claim-participants">
          <div><dt>Solicita</dt><dd>{claim.solicitante?.nombre}</dd></div>
          <div><dt>Gestiona</dt><dd>{claim.gestor?.nombre}</dd></div>
        </dl>
        {claim.descripcionPrivada && <p className="claim-private-description">{claim.descripcionPrivada}</p>}
        {(error || loadError) && <p className="notice notice--peligro" role="alert">{error || loadError}</p>}
        {canDecide && rejecting ? <form className="claim-comment-form" onSubmit={(e) => {
          e.preventDefault()
          if (reason.trim().length >= 10) run(() => api.rechazarReclamo(id, reason.trim()), 'Reclamo rechazado.')
        }}>
          <div className="field">
            <FormHelp title="Sobre el rechazo">El motivo se comparte con quien hizo la solicitud y queda en el historial.</FormHelp>
            <label htmlFor="reject-reason">Motivo del rechazo</label>
            <textarea id="reject-reason" className="textarea" required value={reason}
              maxLength={2000} disabled={busy} onChange={(e) => setReason(e.target.value)} />
            <span className="help">Mínimo 10 caracteres.</span>
          </div>
          <div className="btn-row">
            <button className="btn btn--danger" disabled={busy || reason.trim().length < 10}>Confirmar rechazo</button>
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setRejecting(false)}>Volver</button>
          </div>
        </form> : <div className="claim-simple-actions">
          {permissions.aceptar && <button type="button" className="btn btn--primary" disabled={busy} onClick={() => run(() => api.aprobarReclamo(id), 'Reclamo aceptado.')}>Aceptar solicitud</button>}
          {permissions.rechazar && <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setRejecting(true)}>Rechazar</button>}
          {permissions.confirmarRecibido && <button type="button" className="btn btn--primary" disabled={busy}
            onClick={() => run(() => api.marcarRecuperado(id), 'Entrega confirmada.')}>Confirmar que lo recibí</button>}
          {permissions.cancelar && <button type="button" className="btn btn--link-danger" disabled={busy}
            onClick={() => { if (window.confirm('¿Cancelar el reclamo?')) run(() => api.cancelarReclamo(id), 'Reclamo cancelado.') }}>Cancelar solicitud</button>}
        </div>}
        {api.USE_MOCK && (permissions.pedirPruebas || permissions.iniciarRevision) && <details className="claim-attachments">
          <summary>Más acciones</summary>
          <div className="claim-section__body"><button type="button" className="btn btn--secondary" onClick={requestMoreDetails} disabled={busy}>Pedir información</button></div>
        </details>}
        {permissions.responder && <form className="claim-comment-form" onSubmit={(e) => {
          e.preventDefault()
          if (answer.trim().length >= 10) run(async () => { await api.responderPruebas(id, answer.trim()); setAnswer('') }, 'Respuesta enviada.')
        }}>
          <div className="field">
            <FormHelp title="Sobre la respuesta">Quien revisa la solicitud podrá leer esta información en el seguimiento.</FormHelp>
            <label htmlFor="claim-answer">{claim.observaciones || 'Información solicitada'}</label>
            <textarea id="claim-answer" className="textarea" maxLength={2000} disabled={busy}
              value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </div>
          <button className="btn btn--primary" disabled={busy || answer.trim().length < 10}>Responder</button>
        </form>}
      </section>
      {active && mine && <PushInvitation claimId={id} />}
      <ClaimDossier id={id} canContribute={active} onUpdated={load} />
      {item && <ClaimSection id="claim-object" title="Hallazgo y resguardo" defaultOpen={false}>
        {item.foto && <Foto src={item.foto} reference={item.fotos?.[0]?.referenceImage} />}
        <dl className="claim-participants">
          <div><dt>Encontrado en</dt><dd>{item.lugar}</dd></div>
          {location && <div><dt>Resguardo</dt><dd>{location}</dd></div>}
        </dl>
        {active && item.permisos?.cambiarResguardo && !custodyOpen && <button type="button" className="btn btn--secondary" onClick={() => setCustodyOpen(true)}>Cambiar resguardo</button>}
        {active && custodyOpen && <CustodyEditor item={item} onCancel={() => setCustodyOpen(false)} onSaved={() => { setCustodyOpen(false); toast('Resguardo actualizado.'); load() }} />}
        <Link className="link-green" to={`/reclamo/${item.id}`}>Ver hallazgo</Link>
      </ClaimSection>}
    </div>
  )
}
