import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api.js'
import CustodyEditor from '../components/CustodyEditor.jsx'
import { useToast } from '../components/Toast.jsx'
import { Chip, ChipExtravio, ChipHallazgo } from '../components/Chip.jsx'
import { IconCheck, IconEdit, IconPlus, IconTrash } from '../components/Icons.jsx'
import { fechaCorta } from '../lib/format.js'

const TABS = [
  { id: 'hallazgos', label: 'Encontré' },
  { id: 'delegados', label: 'Delegados a mí' },
  { id: 'extravios', label: 'Perdí' },
]

function HallazgoItem({ h, run }) {
  const [abierto, setAbierto] = useState(null) // Editor de resguardo
  const p = h.permisos || {}

  return (
    <article className="card">
      <div className="pager"><span className="folio">{h.folio}</span><ChipHallazgo estado={h.estado} custodia={h.custodia} /></div>
      <h3><Link to={`/reclamo/${h.id}`}>{h.titulo}</Link></h3>
      <div className="metabox">
        <div><span className="k">FECHA</span> {fechaCorta(h.fecha)}</div>
        <div><span className="k">LUGAR</span> {h.lugar}</div>
        <div><span className="k">RESGUARDO</span> {h.custodia ?? 'Con quien lo encontró'}</div>
        <div><span className="k">GESTIONA</span> {h.gestor?.nombre}</div>
        {h.autor && h.gestor && h.autor.id !== h.gestor.id && <div><span className="k">REPORTÓ</span> {h.autor.nombre}</div>}
      </div>

      {abierto === 'resguardo' && <CustodyEditor item={h} onCancel={() => setAbierto(null)} onSaved={() => { setAbierto(null); run(async () => {}, 'Resguardo actualizado.') }} />}

      {!abierto && (
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
      {!p.editar && !p.cambiarResguardo && !p.retirar && (
        <p className="help" style={{ margin: 0 }}>{h.estado === 'retirado' ? 'PUBLICACIÓN RETIRADA' : h.estado === 'entregado' ? 'OBJETO ENTREGADO · SIN ACCIONES' : 'SIN ACCIONES DISPONIBLES PARA TU CUENTA EN ESTE ESTADO'}</p>
      )}
    </article>
  )
}

function ExtravioItem({ e, run }) {
  const p = e.permisos || {}
  return (
    <article className="card">
      <div className="pager"><span className="folio">{e.folio}</span><ChipExtravio estado={e.estado} /></div>
      <h3><Link to={`/extravio/${e.id}`}>{e.titulo}</Link></h3>
      <div className="chips"><Chip>{e.categoria}</Chip>{e.alertas && <Chip tipo="info">Alertas por correo</Chip>}</div>
      <div className="metabox">
        <div><span className="k">FECHA</span> {fechaCorta(e.fecha)}</div>
        <div><span className="k">LUGAR</span> {e.lugar}</div>
      </div>
      <div className="acciones">
        {p.marcarRecuperado && (
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
      </div>
    </article>
  )
}

export default function MisPublicaciones() {
  const navigate = useNavigate()
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
    hallazgos: 'Aún no has publicado hallazgos. Si encuentras algo, repórtalo para que su dueño lo encuentre.',
    delegados: 'Nadie te ha delegado objetos. Aquí verás los hallazgos cuya devolución gestionas por encargo.',
    extravios: 'No tienes reportes de extravío. Si pierdes algo, crea uno para que puedan identificarlo.',
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

      {tab !== 'delegados' && (
        <button className="btn btn--dark" onClick={() => navigate(tab === 'extravios' ? '/reportar?tab=perdi' : '/reportar')}>
          <IconPlus width={18} height={18} /> {tab === 'extravios' ? 'Reportar un extravío' : 'Reportar un hallazgo'}
        </button>
      )}
    </>
  )
}
