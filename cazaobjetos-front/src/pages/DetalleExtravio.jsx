import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getExtravio, getPosiblesHallazgos, marcarExtravioRecuperado } from '../lib/api.js'
import { useToast } from '../components/Toast.jsx'
import { Chip, ChipExtravio } from '../components/Chip.jsx'
import { Foto } from '../components/ObjectCard.jsx'
import { IconCheck, IconEdit, IconInfo, IconSend } from '../components/Icons.jsx'
import { fechaCorta } from '../lib/format.js'

export default function DetalleExtravio() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [e, setE] = useState(null)
  const [error, setError] = useState('')
  const [matches, setMatches] = useState(null)
  const [matchesPage, setMatchesPage] = useState(0)
  const [matchesError, setMatchesError] = useState('')

  const cargar = useCallback(() => { getExtravio(id).then(setE).catch((err) => setError(err.message)) }, [id])
  useEffect(() => { setE(null); setError(''); setMatches(null); setMatchesPage(0); cargar() }, [cargar])
  useEffect(() => {
    let active = true
    if (e?.autor?.id === usuario?.id) getPosiblesHallazgos(id, matchesPage).then((data) => { if (active) { setMatches(data); setMatchesError('') } }).catch((err) => { if (active) setMatchesError(err.message) })
    return () => { active = false }
  }, [id, e?.autor?.id, usuario?.id, matchesPage])

  async function recuperado() {
    if (!window.confirm('¿Ya recuperaste este objeto? Se cerrará el reporte.')) return
    try { await marcarExtravioRecuperado(e.id); toast('¡Qué bien! Reporte marcado como recuperado.'); cargar() } catch (err) { setError(err.message) }
  }

  if (error && !e) return <div className="notice notice--peligro" role="alert">{error}</div>
  if (!e) return <p className="empty">Cargando reporte…</p>
  const p = e.permisos || {}
  const mio = e.autor?.id === usuario?.id

  return (
    <>
      {e.foto && <Foto src={e.foto} reference={e.fotos?.[0]?.referenceImage} />}
      {e.fotos?.length > 1 && (
        <div className="fotos">
          {e.fotos.slice(1).map((f, i) => <figure key={f.id} className="fotos__item"><img src={f.url} alt={`Foto ${i + 2}`} />{f.referenceImage && <figcaption className="photo__reference">Imagen de referencia</figcaption>}</figure>)}
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

      {mio && <section className="card possible-matches" aria-label="Posibles hallazgos de tu reporte">
        <h2 className="section-title">Posibles hallazgos de tu reporte</h2>
        <p className="account-help">{e.estado === 'activo' ? 'Son publicaciones hechas desde este extravío. Compara los detalles antes de reclamar; el vínculo no confirma que sean tu objeto.' : 'El reporte está cerrado. Estas publicaciones se conservan como parte de su historial.'}</p>
        {matchesError && <div className="notice notice--peligro" role="alert">{matchesError}</div>}
        {!matches && !matchesError && <p>Cargando posibles hallazgos…</p>}
        {matches && !matches.items.length && <p className="muted">Aún no hay hallazgos publicados desde este reporte.</p>}
        {matches?.items.map((h) => <article className="possible-match" key={h.id}><Foto src={h.foto} /><div><h3><Link to={`/reclamo/${h.id}`}>{h.titulo}</Link></h3><p>{h.lugar} · {fechaCorta(h.fecha)}</p><Link className="btn btn--secondary" to={`/reclamo/${h.id}`}>{h.estado === 'entregado' ? 'Ver hallazgo entregado' : 'Comparar hallazgo'}</Link></div></article>)}
        {matches && matches.totalPages > 1 && <div className="pager"><button className="btn btn--secondary" disabled={!matches.hasPrevious} onClick={() => setMatchesPage((v) => v - 1)}>Anteriores</button><span>Página {matches.page + 1} de {matches.totalPages}</span><button className="btn btn--secondary" disabled={!matches.hasNext} onClick={() => setMatchesPage((v) => v + 1)}>Siguientes</button></div>}
      </section>}
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}

      {mio ? (
        <section className="card">
          <h2 className="section-title">Tu reporte</h2>
          {e.estado === 'activo' && !p.marcarRecuperado && <p>Hay un reclamo vinculado en curso. Revísalo en Mis reclamos.</p>}
          {p.marcarRecuperado && <button className="btn btn--primary" onClick={recuperado}><IconCheck width={18} height={18} /> Ya lo recuperé</button>}
          {p.editar && <Link className="btn btn--secondary" to={`/editar/extravio/${e.id}`}><IconEdit width={18} height={18} /> Editar reporte</Link>}
        </section>
      ) : e.estado === 'activo' ? (
        <section className="card">
          <div className="notice notice--info">
            <IconInfo width={20} height={20} />
            <span>¿Lo encontraste? Publícalo como hallazgo. Cuando completes la publicación, su dueño recibirá un aviso para comparar el hallazgo y decidir si lo reclama.</span>
          </div>
          <button className="btn btn--primary" onClick={() => navigate(`/reportar?sourceLostReportId=${encodeURIComponent(e.id)}`)}><IconSend width={18} height={18} /> Reportar que lo encontré</button>
        </section>
      ) : (
        <div className="notice notice--ok"><span>{e.estado === 'retirado' ? 'Esta publicación fue retirada.' : 'Este objeto ya fue recuperado por su dueño.'}</span></div>
      )}
    </>
  )
}
