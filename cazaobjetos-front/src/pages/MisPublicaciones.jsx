import PersonName from '../components/PersonName.jsx'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api.js'
import CustodyEditor from '../components/CustodyEditor.jsx'
import { useToast } from '../components/Toast.jsx'
import { Chip, ChipExtravio, ChipHallazgo } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import { IconCheck, IconEdit, IconTrash } from '../components/Icons.jsx'
import { fechaCorta } from '../lib/format.js'

const TABS = [
  { id: 'hallazgos', label: 'Encontrados' },
  { id: 'extravios', label: 'Perdidos' },
]

function HallazgoItem({ h, run }) {
  const [abierto, setAbierto] = useState(null) // Editor de resguardo
  const p = h.permisos || {}

  return (
    <article className="card">
      <Foto src={h.foto} reference={h.fotos?.[0]?.referenceImage} />
      <h3><Link to={`/reclamo/${h.id}`}>{h.titulo}</Link></h3>
      <div className="chips"><ChipHallazgo estado={h.estado} custodia={h.custodia} /></div>
      <p className="account-help">{h.lugar} · {fechaCorta(h.fecha)}</p>
      {h.autor?.nombre && <p className="account-help">Publicado por <PersonName name={h.autor.nombre} degree={h.autor.carrera} /></p>}

      {abierto === 'resguardo' && <CustodyEditor item={h} onCancel={() => setAbierto(null)} onSaved={() => { setAbierto(null); run(async () => {}, 'Resguardo actualizado.') }} />}

      {!abierto && (p.editar || p.cambiarResguardo || p.retirar) && (
        <div className="acciones">
          {p.editar && <Link className="btn btn--secondary" to={`/editar/hallazgo/${h.id}`}><IconEdit width={18} height={18} /> Editar</Link>}
          {p.cambiarResguardo && <button className="btn btn--secondary" onClick={() => setAbierto('resguardo')}>Cambiar resguardo</button>}
          {p.retirar && (
            <button className="btn btn--link-danger" onClick={() => { if (window.confirm(`¿Retirar la publicación ${h.folio}? Dejará de verse en Explorar.`)) run(() => api.retirarHallazgo(h.id), 'Publicación retirada.') }}>
              <IconTrash width={18} height={18} /> Retirar publicación
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function ExtravioItem({ e, run }) {
  const p = e.permisos || {}
  return (
    <article className="card">
      <Foto src={e.foto} reference={e.fotos?.[0]?.referenceImage} />
      <h3><Link to={`/extravio/${e.id}`}>{e.titulo}</Link></h3>
      <div className="chips"><ChipExtravio estado={e.estado} />{(e.tieneRespuesta || e.estado === 'encontrado') && <Chip tipo="ok">Posible hallazgo</Chip>}</div>
      <p className="account-help">{e.lugar} · {fechaCorta(e.fecha)}</p>
      {e.autor?.nombre && <p className="account-help">Publicado por <PersonName name={e.autor.nombre} degree={e.autor.carrera} /></p>}
      {(p.marcarRecuperado || p.editar || p.retirar) && <div className="acciones">
        {e.tieneRespuesta && <Link className="btn btn--primary" to={`/extravio/${e.id}`}>Ver respuestas</Link>}
        {p.marcarRecuperado && !e.tieneRespuesta && (
          <button className="btn btn--primary" onClick={() => { if (window.confirm('¿Ya recuperaste este objeto? Se cerrará el reporte.')) run(() => api.marcarExtravioRecuperado(e.id), '¡Qué bien! Reporte marcado como recuperado.') }}>
            <IconCheck width={18} height={18} /> Ya lo recuperé
          </button>
        )}
        {p.editar && <Link className="btn btn--secondary" to={`/editar/extravio/${e.id}`}><IconEdit width={18} height={18} /> Editar</Link>}
        {p.retirar && (
          <button className="btn btn--link-danger" onClick={() => { if (window.confirm(`¿Retirar el reporte ${e.folio}? Dejará de verse en Explorar.`)) run(() => api.retirarExtravio(e.id), 'Reporte retirado.') }}>
            <IconTrash width={18} height={18} /> Retirar reporte
          </button>
        )}
      </div>}
    </article>
  )
}

export default function MisPublicaciones() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'hallazgos'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const cargar = useCallback(() => { api.misPublicaciones().then((d) => { setData(d); setError('') }).catch((e) => setError(e.message)) }, [])
  useEffect(cargar, [cargar])

  async function run(fn, mensaje) {
    setError('')
    try { await fn(); toast(mensaje); cargar(); return true } catch (e) { setError(e.message); return false }
  }

  if (error && !data) return <div className="notice notice--peligro" role="alert">{error}</div>
  if (!data) return <p className="empty">Cargando tus publicaciones…</p>

  const lista = data[tab]
  const vacio = {
    hallazgos: 'Aún no has publicado objetos encontrados.',
    extravios: 'Aún no has publicado objetos perdidos.',
  }[tab]

  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setParams(t.id === 'hallazgos' ? {} : { tab: t.id })}>
            {t.label} <span>({data[t.id].length})</span>
          </button>
        ))}
      </div>

      {error && <div className="notice notice--peligro" role="alert">{error}</div>}

      <div className="cards">
        {tab === 'extravios'
          ? lista.map((e) => <ExtravioItem key={e.id} e={e} run={run} />)
          : lista.map((h) => <HallazgoItem key={h.id} h={h} run={run} />)}
      </div>
      {!lista.length && <p className="empty">{vacio}</p>}

    </>
  )
}
