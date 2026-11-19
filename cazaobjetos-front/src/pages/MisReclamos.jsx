import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api.js'
import { useNotifications } from '../context/NotificationContext.jsx'
import { Chip, ChipReclamo } from '../components/Chip.jsx'
import { fechaCorta } from '../lib/format.js'
import ObjectThumbnails from '../components/ObjectThumbnails.jsx'
import './flujo-simple.css'

const empty = {
  activos: 'Sin reclamos activos.',
  revisar: 'Sin reclamos recibidos.',
  historial: 'Sin reclamos cerrados.',
  alertas: 'Sin alertas.',
}

function download(claim) {
  const content = `COMPROBANTE DE ENTREGA\nFolio: ${claim.folio}\nObjeto: ${claim.titulo}\nFecha: ${fechaCorta(claim.entrega.fecha)}\nCierre: ${claim.entrega.agente ?? ''}\n`
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
  anchor.download = `comprobante-${claim.folio.replace('#', '')}.txt`
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

export default function MisReclamos() {
  const [params, setParams] = useSearchParams()
  const { version } = useNotifications()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.misReclamos().then((claims) => {
      if (active) { setData(claims); setError('') }
    }).catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [version])

  if (error && !data) return <p className="notice notice--peligro" role="alert">{error}</p>
  if (!data) return <p className="empty">Cargando reclamos…</p>

  const lists = { activos: data.activos, revisar: data.porRevisar, historial: data.historial, alertas: data.alertas }
  const tabs = [
    ['activos', 'Enviados'],
    ['revisar', 'Recibidos'],
    ['historial', 'Historial'],
    ...(api.USE_MOCK ? [['alertas', 'Alertas']] : []),
  ]
  const requested = params.get('tab')
  const tab = tabs.some(([id]) => id === requested)
    ? requested : data.porRevisar.some((claim) => claim.estado === 'enviado') ? 'revisar' : 'activos'
  const items = lists[tab]

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Filtrar reclamos">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id}
          className={tab === id ? 'is-active' : ''} onClick={() => setParams({ tab: id })}>{label}</button>)}
      </div>
      {error && <p className="notice notice--peligro" role="alert">{error}</p>}
      {!items.length && <p className="empty">{empty[tab]}</p>}
      {tab === 'alertas' ? items.map((alert) => (
        <article key={alert.id} className="card claim-form-simple">
          <h3>{alert.titulo}</h3>
          <Link className="btn btn--secondary" to={`/reclamo/${alert.hallazgoId}`}>Ver hallazgo</Link>
        </article>
      )) : items.map((claim) => {
        const mine = claim.rolEnReclamo ? claim.rolEnReclamo === 'solicitante' : tab === 'activos'
        const photo = claim.hallazgo?.foto || claim.foto
        return <article key={claim.id} className="card claim-list-card">
          <div className="claim-list-card__summary">
            <ObjectThumbnails images={photo ? [{ url: photo, label: claim.titulo }] : []} />
            <div className="claim-list-card__content">
              <h3><Link to={`/reclamos/${claim.id}`}>{claim.titulo}</Link></h3>
              <div className="claim-list-card__state">{claim.estado === 'aprobado'
                ? <Chip tipo="ok">{mine ? 'Listo para recoger' : 'Pendiente de entrega'}</Chip>
                : <ChipReclamo estado={claim.estado} />}</div>
              <p className="notice-actor">{mine ? 'Gestiona' : 'Solicita'} {mine ? claim.gestor?.nombre || 'Usuario UTCH' : claim.solicitante?.nombre || 'Usuario UTCH'}</p>
            </div>
          </div>
          <div className="btn-row claim-simple-actions">
            <Link className="btn btn--secondary" to={`/reclamos/${claim.id}`}>Ver reclamo</Link>
            {claim.estado === 'entregado' && claim.entrega && <button type="button" className="btn btn--secondary" onClick={() => download(claim)}>Descargar comprobante</button>}
          </div>
        </article>
      })}
    </>
  )
}
