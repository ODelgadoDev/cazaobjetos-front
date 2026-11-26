import FormHelp from '../components/FormHelp.jsx'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api.js'
import { useNotifications } from '../context/NotificationContext.jsx'
import { Chip, ChipReclamo } from '../components/Chip.jsx'
import { fechaCorta } from '../lib/format.js'
import ClaimProgress, { nextClaimStep } from '../components/ClaimProgress.jsx'
import ObjectThumbnails from '../components/ObjectThumbnails.jsx'
import './flujo-simple.css'

const empty = {
  activos: 'Todavía no tienes solicitudes en curso.',
  revisar: 'Todavía no has recibido solicitudes.',
  historial: 'Todavía no hay solicitudes cerradas.',
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
  if (!data) return <p className="empty">Cargando solicitudes…</p>

  const lists = { activos: data.activos, revisar: data.porRevisar, historial: data.historial, alertas: data.alertas }
  const tabs = [
    ['activos', 'Enviadas'],
    ['revisar', 'Recibidas'],
    ['historial', 'Historial'],
    ...(api.USE_MOCK ? [['alertas', 'Alertas']] : []),
  ]
  const requested = params.get('tab')
  const defaultTab = data.activos.length || !data.porRevisar.length ? 'activos' : 'revisar'
  const tab = tabs.some(([id]) => id === requested) ? requested : defaultTab
  const items = lists[tab]

  return (
    <>
      <FormHelp title="Cómo seguir una solicitud">
        En «Enviadas» están las solicitudes que tú hiciste. En «Recibidas» revisas las de objetos que encontraste. En «Historial» puedes consultar las solicitudes cerradas.
      </FormHelp>
      <div className="tabs" role="tablist" aria-label="Filtrar solicitudes">
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
        const nextStep = nextClaimStep(claim.estado, mine)
        return <article key={claim.id} className="card claim-list-card">
          <div className="claim-list-card__summary">
            <ObjectThumbnails images={photo ? [{ url: photo, label: claim.titulo }] : []} delivered={claim.estado === 'entregado'} />
            <div className="claim-list-card__content">
              <h3><Link to={`/reclamos/${claim.id}`}>{claim.titulo}</Link></h3>
              <div className="claim-list-card__state">{claim.estado === 'aprobado'
                ? <Chip tipo="ok">{mine ? 'Listo para recoger' : 'Pendiente de entrega'}</Chip>
                : <ChipReclamo estado={claim.estado} />}</div>
              <p className="notice-actor">{mine ? 'Gestiona' : 'Solicita'} {mine ? claim.gestor?.nombre || 'Usuario UTCH' : claim.solicitante?.nombre || 'Usuario UTCH'}</p>
            </div>
          </div>
          <ClaimProgress status={claim.estado} />
          {nextStep && <p className="account-help">{nextStep}</p>}
          <div className="btn-row claim-simple-actions">
            <Link className="btn btn--secondary" to={`/reclamos/${claim.id}`}>Ver seguimiento</Link>
            {claim.estado === 'entregado' && claim.entrega && <button type="button" className="btn btn--secondary" onClick={() => download(claim)}>Descargar comprobante</button>}
          </div>
        </article>
      })}
    </>
  )
}
