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
import { IconCheck, IconShield } from '../components/Icons.jsx'
import { fechaCorta } from '../lib/format.js'

export default function DetalleReclamo() {
  const { id } = useParams()
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
    try { await action(); setRejecting(false); setReason(''); toast(message); await cargar() }
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
  return (
    <div className="claim-page">
      <section className="card claim-summary">
        <div className="pager"><span className="folio">{r.folio}</span><ChipReclamo estado={r.estado} /></div>
        <h2>{r.titulo}</h2>
        <div className="chips"><Chip tipo="info">{mine ? 'Solicitud enviada por ti' : 'Solicitud que gestionas'}</Chip><Chip>Creado {fechaCorta(r.creado)}</Chip></div>
        <ClaimProgress estado={r.estado} />
        {r.entrega && <p className="account-help">Recuperación confirmada el {fechaCorta(r.entrega.fecha)} por {r.solicitante.nombre}.</p>}
      </section>
      <section className="card" aria-label="Siguiente paso del reclamo" id="claim-next">
        <ClaimNextStep claim={r}>
          {active && <>
            <a className={`btn ${next.action === 'evidence' ? 'btn--primary' : 'btn--secondary'}`} href="#claim-evidence">Revisar pruebas</a>
            <a className={`btn ${next.action === 'comments' ? 'btn--primary' : 'btn--secondary'}`} href="#claim-comments">{next.action === 'comments' ? next.actionLabel : 'Ir a comentarios'}</a>
          </>}
          {rejecting ? <form className="claim-comment-form" onSubmit={(event) => { event.preventDefault(); if (reason.trim().length >= 10) run(() => api.rechazarReclamo(id, reason.trim()), 'Reclamo rechazado. El motivo quedó en el historial.') }}>
            <div className="field"><label htmlFor="reject-reason">Motivo del rechazo</label><textarea id="reject-reason" className="textarea" value={reason} maxLength={2000} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Explica qué información no coincide con el objeto." /><span className="help">MÍN. 10 CARACTERES</span></div>
            <div className="btn-row"><button type="button" className="btn btn--secondary" onClick={() => setRejecting(false)} disabled={busy}>Volver</button><button className="btn btn--danger" disabled={busy || reason.trim().length < 10}>Confirmar rechazo</button></div>
          </form> : <>
            {p.aceptar && <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => run(() => api.aprobarReclamo(id), 'Reclamo aceptado. Consulta el siguiente paso para la entrega.')}><IconCheck width={18} height={18} /> Aceptar reclamo</button>}
            {p.rechazar && <button type="button" className="btn btn--danger" disabled={busy} onClick={() => setRejecting(true)}>Rechazar reclamo</button>}
            {p.confirmarRecibido && <button type="button" className={`btn ${next.action === 'receive' ? 'btn--primary' : 'btn--secondary'}`} disabled={busy} onClick={() => { if (window.confirm('¿Confirmas que ya tienes tu objeto? El expediente quedará finalizado y de solo lectura.')) run(() => api.marcarRecuperado(id), 'Recuperación confirmada. El expediente quedó finalizado.') }}><IconCheck width={18} height={18} /> Ya recibí mi objeto</button>}
            {p.cancelar && <button type="button" className="btn btn--link-danger" disabled={busy} onClick={() => { if (window.confirm('¿Cancelar este reclamo? Conservarás su historial.')) run(() => api.cancelarReclamo(id), 'Reclamo cancelado. Su historial se conserva.') }}>Cancelar reclamo</button>}
          </>}
        </ClaimNextStep>
      </section>
      {h && <section className="card">
        <h2 className="section-title">Objeto y resguardo</h2>
        <Foto src={h.foto} folio={h.folio} />
        <div className="metabox"><div><span className="k">ENCONTRADO EN</span>{h.lugar}</div><div><span className="k">AHORA ESTÁ</span>{h.custodia || 'Con quien lo encontró'}</div><div><span className="k">REVISA EL RECLAMO</span>{r.gestor?.nombre}</div><div><span className="k">SOLICITA</span>{r.solicitante.nombre}</div></div>
        {active && h.permisos?.cambiarResguardo && !custodyOpen && <button type="button" className="btn btn--secondary" onClick={() => setCustodyOpen(true)}>Cambiar resguardo</button>}
        {active && custodyOpen && <CustodyEditor item={h} onCancel={() => setCustodyOpen(false)} onSaved={() => { setCustodyOpen(false); toast('Resguardo actualizado.'); cargar() }} />}
        <Link className="link-green" to={`/reclamo/${h.id}`}>Ver ficha del hallazgo</Link>
      </section>}
      <section className="card"><h2 className="section-title"><IconShield width={20} height={20} /> Descripción privada de propiedad</h2><p className="claim-private-description">{r.descripcionPrivada}</p><p className="account-help">Solo la pueden consultar el solicitante y el responsable autorizado.</p></section>
      <ClaimDossier id={id} canContribute={active} onUpdated={cargar} />
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}

    </div>
  )
}
