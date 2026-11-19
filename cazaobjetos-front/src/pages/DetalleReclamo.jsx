import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api.js'
import { useToast } from '../components/Toast.jsx'
import { Chip, ChipReclamo } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import ClaimProgress from '../components/ClaimProgress.jsx'
import ClaimNextStep from '../components/ClaimNextStep.jsx'
import { claimNextStep } from '../lib/claimNextStep.js'
import ClaimDossier from '../components/ClaimDossier.jsx'
import CustodyEditor from '../components/CustodyEditor.jsx'
import ClaimSection from '../components/ClaimSection.jsx'
import { PushInvitation } from '../components/DeviceNotifications.jsx'
import { IconCheck } from '../components/Icons.jsx'
import { fechaCorta } from '../lib/format.js'

export default function DetalleReclamo() {
  const { id } = useParams()
  return <Expediente key={id} id={id} />
}

function Expediente({ id }) {
  const toast = useToast()
  const [r, setR] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [custodyOpen, setCustodyOpen] = useState(false)
  const cargar = useCallback(async () => {
    try { setR(await api.getReclamo(id)); setError('') }
    catch (e) { setError(e.message); if ([401, 403, 404].includes(e.status)) setR(null) }
  }, [id])
  useEffect(() => { setR(null); cargar() }, [cargar])
  async function run(action, message) {
    if (busy) return
    setBusy(true); setError('')
    try {
      await action()
      setRejecting(false); setReason(''); toast(message)
      await cargar()
      requestAnimationFrame(() => document.getElementById('claim-next')?.scrollIntoView())
    }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  if (error && !r) return <div className="notice notice--peligro" role="alert">{error}</div>
  if (!r) return <p className="empty">Cargando expediente…</p>
  const h = r.hallazgo
  const mine = r.rolEnReclamo === 'solicitante'
  const p = r.permisos || {}
  const active = !!r.puedeAportar
  const next = claimNextStep(r)
  const commentsFirst = next.action === 'comments'
  function sectionLink(section, label, primary = false) {
    return <a className={`btn ${primary ? 'btn--primary' : 'btn--secondary'}`} href={`#${section}`}
      onClick={() => {
        const target = document.getElementById(section)
        if (target) {
          target.open = true
          target.querySelector('summary')?.focus({ preventScroll: true })
        }
      }}>{label}</a>
  }
  function receiveButton(primary = false) {
    return <button type="button" className={`btn ${primary ? 'btn--primary' : 'btn--secondary'}`} disabled={busy}
      onClick={() => {
        if (window.confirm('¿Confirmas que ya tienes tu objeto? Se cerrará el reclamo.'))
          run(() => api.marcarRecuperado(id), 'Recuperación confirmada.')
      }}><IconCheck width={18} height={18} /> Ya recibí mi objeto</button>
  }
  return (
    <div className="claim-page">
      <section className="card claim-summary" aria-label="Siguiente paso del reclamo" id="claim-next">
        <div className="pager"><span className="folio">{r.folio}</span><ChipReclamo estado={r.estado} /></div>
        <h2>{r.titulo}</h2>
        <ClaimNextStep claim={r}>
          {active && next.action === 'evidence' && sectionLink('claim-evidence', 'Revisar pruebas', true)}
          {active && commentsFirst && sectionLink('claim-comments', next.actionLabel, true)}
          {p.confirmarRecibido && receiveButton(next.action === 'receive')}
        </ClaimNextStep>
        {active && <details className="claim-more"><summary>Más acciones del reclamo</summary>
          <div className="claim-section__body">
            {next.action !== 'evidence' && sectionLink('claim-evidence', 'Ver pruebas')}
            {!commentsFirst && sectionLink('claim-comments', 'Ir a comentarios')}
            {p.cancelar && <button type="button" className="btn btn--link-danger" disabled={busy} onClick={() => { if (window.confirm('¿Cancelar este reclamo? Conservarás su historial.')) run(() => api.cancelarReclamo(id), 'Reclamo cancelado. Su historial se conserva.') }}>Cancelar reclamo</button>}
          </div>
        </details>}
      </section>
      {active && mine && <PushInvitation claimId={id} />}
      {h && <ClaimSection id="claim-object" title="Ficha del objeto y resguardo">
        <div className="chips"><Chip tipo="info">{mine ? 'Solicitud enviada por ti' : 'Solicitud que gestionas'}</Chip><Chip>Creado {fechaCorta(r.creado)}</Chip></div>
        <ClaimProgress estado={r.estado} />
        {r.entrega && <p className="account-help">Recepción confirmada el {fechaCorta(r.entrega.fecha)} por {r.solicitante.nombre}.</p>}
        <Foto src={h.foto} folio={h.folio} />
        <div className="metabox"><div><span className="k">ENCONTRADO EN</span>{h.lugar}</div><div><span className="k">AHORA ESTÁ</span>{h.custodia || 'Con quien lo encontró'}</div><div><span className="k">REVISA EL RECLAMO</span>{r.gestor?.nombre}</div><div><span className="k">SOLICITA</span>{r.solicitante.nombre}</div></div>
        {active && h.permisos?.cambiarResguardo && !custodyOpen && <button type="button" className="btn btn--secondary" onClick={() => setCustodyOpen(true)}>Cambiar resguardo</button>}
        {active && custodyOpen && <CustodyEditor item={h} onCancel={() => setCustodyOpen(false)} onSaved={() => { setCustodyOpen(false); toast('Resguardo actualizado.'); cargar() }} />}
        <Link className="link-green" to={`/reclamo/${h.id}`}>Ver ficha del hallazgo</Link>
      </ClaimSection>}
      <ClaimDossier id={id} description={r.descripcionPrivada} canContribute={active} onUpdated={cargar}>
        {(p.aceptar || p.rechazar) && <div className="claim-review">
          {rejecting && p.rechazar ? <form className="claim-comment-form" onSubmit={(event) => { event.preventDefault(); if (reason.trim().length >= 10) run(() => api.rechazarReclamo(id, reason.trim()), 'Reclamo rechazado. El motivo quedó en el historial.') }}>
            <div className="field"><label htmlFor="reject-reason">Motivo del rechazo</label><textarea id="reject-reason" className="textarea" value={reason} maxLength={2000} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Explica qué información no coincide con el objeto." /><span className="help">MÍN. 10 CARACTERES</span></div>
            <div className="btn-row"><button type="button" className="btn btn--secondary" onClick={() => setRejecting(false)} disabled={busy}>Volver</button><button className="btn btn--danger" disabled={busy || reason.trim().length < 10}>Confirmar rechazo</button></div>
          </form> : <>
            {p.aceptar && <button type="button" className="btn btn--primary" disabled={busy} onClick={() => run(() => api.aprobarReclamo(id), 'Reclamo aceptado. Consulta el siguiente paso para la entrega.')}><IconCheck width={18} height={18} /> Aceptar reclamo</button>}
            {p.rechazar && <button type="button" className="btn btn--danger" disabled={busy} onClick={() => setRejecting(true)}>Rechazar reclamo</button>}
          </>}
        </div>}
      </ClaimDossier>
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}

    </div>
  )
}
