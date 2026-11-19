import { Link } from 'react-router-dom'
import { Chip, ChipExtravio, ChipHallazgo } from './Chip.jsx'
import { IconArrowRight, IconCalendar, IconImage, IconPin } from './Icons.jsx'
import { fechaCorta } from '../lib/format.js'

export function Foto({ folio, src, reference = false }) {
  return (
    <div className="photo">
      {folio && <span className="folio">FOLIO {folio}</span>}
      {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <IconImage width={28} height={28} />}
      {src && reference && <span className="photo__reference">Imagen de referencia</span>}
    </div>
  )
}

export default function ObjectCard({ h }) {
  return (
    <article className="card">
      <Foto src={h.foto} reference={h.fotos?.[0]?.referenceImage} />
      <h3>{h.titulo}</h3>
      <div className="chips">
        <Chip>{h.categoria}</Chip>
        <ChipHallazgo estado={h.estado} />
      </div>
      <div className="metabox">
        <div><IconCalendar width={16} height={16} /> <span><span className="k">Encontrado:</span> {fechaCorta(h.fecha)}</span></div>
        <div><IconPin width={16} height={16} /> <span><span className="k">Lugar:</span> {h.lugar}</span></div>
      </div>
      {h.autor?.nombre && <p className="account-help">Publicado por {h.autor.nombre}</p>}
      <Link to={`/reclamo/${h.id}`} className="btn btn--primary">
        Ver hallazgo <IconArrowRight width={18} height={18} />
      </Link>
    </article>
  )
}

export function ExtravioCard({ e }) {
  return (
    <article className="card">
      <Foto src={e.foto} reference={e.fotos?.[0]?.referenceImage} />
      <h3>{e.titulo}</h3>
      <div className="chips">
        <Chip>{e.categoria}</Chip>
        <ChipExtravio estado={e.estado} />
        {e.tieneRespuesta && e.estado === 'activo' && <Chip tipo="ok">Posible hallazgo</Chip>}
      </div>
      <div className="metabox">
        <div><IconCalendar width={16} height={16} /> <span><span className="k">Perdido:</span> {fechaCorta(e.fecha)}</span></div>
        <div><IconPin width={16} height={16} /> <span><span className="k">Lugar:</span> {e.lugar}</span></div>
      </div>
      {e.autor?.nombre && <p className="account-help">Publicado por {e.autor.nombre}</p>}
      <Link to={`/extravio/${e.id}`} className="btn btn--secondary">
        Ver ficha <IconArrowRight width={18} height={18} />
      </Link>
    </article>
  )
}
