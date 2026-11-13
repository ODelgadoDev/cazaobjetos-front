import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getExtravio, marcarExtravioRecuperado } from '../lib/api.js'
import { useToast } from '../components/Toast.jsx'
import { Chip, ChipExtravio } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import { IconCheck, IconEdit, IconInfo, IconSend } from '../components/Icons.jsx'
import { fechaCorta } from '../lib/format.js'

export default function DetalleExtravio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [e, setE] = useState(null)
  const [error, setError] = useState('')

  const cargar = useCallback(() => { getExtravio(id).then(setE).catch((err) => setError(err.message)) }, [id])
  useEffect(cargar, [cargar])

  async function recuperado() {
    if (!window.confirm('¿Ya recuperaste este objeto? Se cerrará el reporte.')) return
    try { await marcarExtravioRecuperado(e.id); toast('¡Qué bien! Reporte marcado como recuperado.'); cargar() } catch (err) { setError(err.message) }
  }

  if (error && !e) return <div className="notice notice--peligro" role="alert">{error}</div>
  if (!e) return <p className="empty">Cargando reporte…</p>
  const p = e.permisos || {}
  const mio = p.editar || p.marcarRecuperado

  return (
    <>
      <Foto src={e.foto} />
      {e.fotos?.length > 1 && (
        <div className="fotos">
          {e.fotos.slice(1).map((f, i) => <figure key={f.id} className="fotos__item"><img src={f.url} alt={`Foto ${i + 2}`} /></figure>)}
        </div>
      )}

      <section className="card">
        <span className="folio">FOLIO {e.folio}</span>
        <h3>{e.titulo}</h3>
        <div className="chips"><Chip>{e.categoria}</Chip><ChipExtravio estado={e.estado} /></div>
        <div className="metabox">
          <div><span className="k">PERDIDO</span> {fechaCorta(e.fecha)}</div>
          <div><span className="k">LUGAR</span> {e.lugar}</div>
          {e.autor && <div><span className="k">REPORTÓ</span> {e.autor.nombre}</div>}
        </div>
        {e.descripcion && <p style={{ margin: 0 }}>{e.descripcion}</p>}
      </section>

      {error && <div className="notice notice--peligro" role="alert">{error}</div>}

      {mio ? (
        <section className="card">
          <h2 className="section-title">Tu reporte</h2>
          {p.marcarRecuperado && <button className="btn btn--primary" onClick={recuperado}><IconCheck width={18} height={18} /> Ya lo recuperé</button>}
          {p.editar && <Link className="btn btn--secondary" to={`/editar/extravio/${e.id}`}><IconEdit width={18} height={18} /> Editar reporte</Link>}
        </section>
      ) : e.estado === 'activo' ? (
        <section className="card">
          <div className="notice notice--info">
            <IconInfo width={20} height={20} />
            <span>¿Lo encontraste? Publícalo como hallazgo. Su dueño recibirá una alerta y podrá reclamarlo con datos que solo él conoce.</span>
          </div>
          <button className="btn btn--primary" onClick={() => navigate('/reportar')}><IconSend width={18} height={18} /> Reportar que lo encontré</button>
        </section>
      ) : (
        <div className="notice notice--ok"><span>Este objeto ya fue recuperado por su dueño.</span></div>
      )}
    </>
  )
}
