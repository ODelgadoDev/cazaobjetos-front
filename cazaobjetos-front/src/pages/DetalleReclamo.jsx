import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api.js'
import { useToast } from '../components/Toast.jsx'
import { Chip, ChipReclamo } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import ClaimProgress from '../components/ClaimProgress.jsx'
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
  const approved = r.estado === 'aprobado'
  return (
    <div className="claim-page">
      <section className="card claim-summary">
        <div className="pager"><span className="folio">{r.folio}</span><ChipReclamo estado={r.estado} /></div>
        <h2>{r.titulo}</h2>
        <div className="chips"><Chip tipo="info">{mine ? 'Solicitud enviada por ti' : 'Solicitud que gestionas'}</Chip><Chip>Creado {fechaCorta(r.creado)}</Chip></div>
        <ClaimProgress estado={r.estado} />
        {active && <h3>{approved ? mine ? 'Recoge tu objeto y confirma cuando lo tengas' : 'Esperando que el solicitante reciba el objeto' : mine ? 'Esperando la revisión del responsable' : 'Te toca revisar esta solicitud'}</h3>}
        {active && <p className="account-help">{approved ? 'La propiedad fue aceptada. Coordinen la entrega en los comentarios; el solicitante confirma al recibir el objeto.' : mine ? 'El responsable revisará tus datos. Puedes aportar pruebas y responder en los comentarios.' : 'Revisa la descripción y las evidencias. Puedes pedir más información en los comentarios antes de decidir.'}</p>}
        {r.entrega && <p className="account-help">Recuperación confirmada el {fechaCorta(r.entrega.fecha)} por {r.solicitante.nombre}.</p>}
      </section>
      {(p.aceptar || p.rechazar || p.cancelar || p.confirmarRecibido) && <section className="card" aria-label="Acciones del reclamo" id="claim-next">
        <h2 className="section-title">Siguiente paso</h2>
        <a className={`btn ${p.aceptar ? 'btn--primary' : 'btn--secondary'}`} href="#claim-evidence">Ver pruebas</a>
        <a className="btn btn--secondary" href="#claim-comments">Ir a comentarios</a>
        {rejecting ? <form className="claim-comment-form" onSubmit={(event) => { event.preventDefault(); if (reason.trim().length >= 10) run(() => api.rechazarReclamo(id, reason.trim()), 'Reclamo rechazado. El motivo quedó en el historial.') }}>
          <div className="field"><label htmlFor="reject-reason">Motivo del rechazo</label><textarea id="reject-reason" className="textarea" value={reason} maxLength={2000} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Explica qué información no coincide con el objeto." /><span className="help">MÍN. 10 CARACTERES</span></div>
          <div className="btn-row"><button type="button" className="btn btn--secondary" onClick={() => setRejecting(false)} disabled={busy}>Volver</button><button className="btn btn--danger" disabled={busy || reason.trim().length < 10}>Confirmar rechazo</button></div>
        </form> : <>
          {p.aceptar && <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => run(() => api.aprobarReclamo(id), 'Reclamo aceptado. Coordinen la entrega en los comentarios.')}><IconCheck width={18} height={18} /> Aceptar reclamo</button>}
          {p.rechazar && <button type="button" className="btn btn--danger" disabled={busy} onClick={() => setRejecting(true)}>Rechazar reclamo</button>}
          {p.confirmarRecibido && <button type="button" className="btn btn--primary" disabled={busy} onClick={() => { if (window.confirm('¿Confirmas que ya tienes tu objeto? El expediente quedará finalizado y de solo lectura.')) run(() => api.marcarRecuperado(id), 'Recuperación confirmada. El expediente quedó finalizado.') }}><IconCheck width={18} height={18} /> Ya recibí mi objeto</button>}
          {p.cancelar && <button type="button" className="btn btn--link-danger" disabled={busy} onClick={() => { if (window.confirm('¿Cancelar este reclamo? Conservarás su historial.')) run(() => api.cancelarReclamo(id), 'Reclamo cancelado. Su historial se conserva.') }}>Cancelar reclamo</button>}
        </>}
      </section>}
      {h && <section className="card">
        <h2 className="section-title">Objeto y resguardo</h2>
        <Foto src={h.foto} folio={h.folio} />
        <div className="metabox"><div><span className="k">ENCONTRADO EN</span>{h.lugar}</div><div><span className="k">AHORA ESTÁ</span>{h.custodia || 'Con quien lo encontró'}</div><div><span className="k">GESTIONA</span>{r.gestor?.nombre}</div><div><span className="k">SOLICITA</span>{r.solicitante.nombre}</div></div>
        <p className="account-help">El resguardo indica dónde está el objeto. La revisión continúa con el responsable del hallazgo.</p>
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
