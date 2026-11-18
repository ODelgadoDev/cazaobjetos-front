import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { listExtravios, listHallazgos } from '../lib/api.js'
import { CATEGORIAS, UBICACIONES } from '../lib/constants.js'
import ObjectCard, { ExtravioCard } from '../components/ObjectCard.jsx'
import { IconInfo, IconSearch } from '../components/Icons.jsx'

const PAGE_SIZE = 5
const scrollPositions = new Map()

export default function Explorar() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'encontrados' ? 'hallazgos' : 'extravios' // por defecto: Se buscan
  const { usuario } = useAuth()
  const location = useLocation()
  const scrollKey = `${usuario.id}:${location.key}`
  const restoreScroll = useRef(true)
  const savedScroll = useRef(scrollPositions.get(scrollKey) || 0)
  const estado = ['recuperado', 'Todos'].includes(params.get('estado')) ? params.get('estado') : 'activo'
  const q = params.get('q') || ''
  const categoria = CATEGORIAS.includes(params.get('categoria')) ? params.get('categoria') : 'Todos'
  const zona = params.get('zona') || 'Todos'
  const orden = params.get('orden') === 'antiguos' ? 'antiguos' : 'recientes'
  const page = Math.max(1, Math.min(10001, Number.parseInt(params.get('page'), 10) || 1))
  function changeFilter(key, value) {
    const next = new URLSearchParams(params)
    if (!value || value === { categoria: 'Todos', zona: 'Todos', orden: 'recientes', estado: 'activo' }[key]) next.delete(key)
    else next.set(key, value)
    next.delete('page')
    restoreScroll.current = false
    setParams(next, { replace: true })
  }
  function setPage(nextPage) {
    const next = new URLSearchParams(params)
    next.set('page', nextPage)
    restoreScroll.current = false
    setParams(next)
    window.scrollTo(0, 0)
  }
  const [data, setData] = useState({ items: [], total: 0 })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    setCargando(true)
    const t = setTimeout(() => {
      const pedir = tab === 'extravios'
        ? listExtravios({ q, categoria, zona, orden, estado, page, pageSize: PAGE_SIZE })
        : listHallazgos({ q, categoria, zona, orden, page, pageSize: PAGE_SIZE })
      pedir
        .then((d) => { if (vivo) { setData(d); setError('') } })
        .catch((e) => vivo && setError(e.message))
        .finally(() => vivo && setCargando(false))
    }, 250)
    return () => { vivo = false; clearTimeout(t) }
  }, [tab, q, categoria, zona, orden, estado, page])

  const totalPag = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const cambiarTab = (nextTab) => {
    setData({ items: [], total: 0 })
    changeFilter('tab', nextTab === 'hallazgos' ? 'encontrados' : '')
  }
  useEffect(() => {
    const save = () => {
      if (restoreScroll.current) return
      scrollPositions.set(scrollKey, window.scrollY)
      if (scrollPositions.size > 40) scrollPositions.delete(scrollPositions.keys().next().value)
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [scrollKey])
  useEffect(() => {
    if (cargando || !restoreScroll.current) return
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, savedScroll.current)
      restoreScroll.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [cargando, scrollKey])
  const extr = tab === 'extravios'

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Qué quieres ver">
        <button role="tab" aria-selected={extr} className={extr ? 'is-active' : ''} onClick={() => cambiarTab('extravios')}>Se buscan</button>
        <button role="tab" aria-selected={!extr} className={!extr ? 'is-active' : ''} onClick={() => cambiarTab('hallazgos')}>Encontrados</button>
      </div>

      {extr ? (
        <div className="notice notice--info">
          <IconInfo width={20} height={20} />
          <span className="grow">¿Encontraste uno de estos? Publícalo para que su dueño pueda encontrarlo.</span>
          <button className="btn btn--dark" onClick={() => navigate('/reportar')}>Reportar</button>
        </div>
      ) : (
      <div className="notice notice--info">
        <IconInfo width={20} height={20} />
        <span className="grow">¿Perdiste algo y no lo ves?</span>
        <button className="btn btn--dark" onClick={() => navigate('/reportar?tab=perdi')}>Reportar extravío</button>
      </div>
      )}

      <div className="field">
        <div style={{ position: 'relative' }}>
          <IconSearch width={18} height={18} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--texto-tenue)' }} />
          <input id="q" aria-label="Buscar por palabra clave" className="input" style={{ paddingLeft: 38 }} placeholder="Buscar por palabra clave" value={q} onChange={(e) => changeFilter('q', e.target.value)} />
        </div>
      </div>

      <div className="chips" role="group" aria-label="Filtrar por categoría">
        {['Todos', ...CATEGORIAS].map((c) => (
          <button key={c} className={`filter ${categoria === c ? 'is-active' : ''}`} aria-pressed={categoria === c} onClick={() => changeFilter('categoria', c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="row2">
        <select className="select select--tenue" aria-label="Ordenar por fecha" value={orden} onChange={(e) => changeFilter('orden', e.target.value)}>
          <option value="recientes">Fecha: Más recientes</option>
          <option value="antiguos">Fecha: Más antiguos</option>
        </select>
        <div><input className="input" list="explore-locations" aria-label="Filtrar por ubicación" placeholder="Ubicación, salón o edificio" value={zona === 'Todos' ? '' : zona} onChange={(event) => changeFilter('zona', event.target.value)} /><datalist id="explore-locations">{UBICACIONES.map((place) => <option key={place} value={place} />)}</datalist></div>
      </div>
      {extr && (
        <select className="select select--tenue" aria-label="Filtrar por estado" value={estado} onChange={(e) => changeFilter('estado', e.target.value)}>
          <option value="activo">Estado: Se buscan</option>
          <option value="recuperado">Estado: Recuperados</option>
          <option value="Todos">Estado: Todos</option>
        </select>
      )}

      <div className="pager">
        <strong>{data.total} {extr ? 'reportes de extravío' : 'objetos encontrados'}</strong>
        <span className="mono muted" style={{ fontSize: 12 }}>PÁG {page} / {totalPag}</span>
      </div>

      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      {cargando && !data.items.length && <p className="empty">{extr ? 'Cargando reportes…' : 'Cargando objetos…'}</p>}
      {!cargando && !error && !data.items.length && (
        <div className="card empty"><p>{extr ? 'No hay reportes de extravío con esos filtros.' : 'No hay hallazgos con esos filtros.'}</p><div className="btn-row"><button type="button" className="btn btn--secondary" onClick={() => { restoreScroll.current = false; setParams(extr ? {} : { tab: 'encontrados' }, { replace: true }) }}>Quitar filtros</button><button type="button" className="btn btn--primary" onClick={() => navigate('/reportar?tab=perdi', { state: { search: { titulo: q, lugar: zona === 'Todos' ? '' : zona, categoria: categoria === 'Todos' ? 'Electrónica' : categoria } } })}>Reportar mi extravío</button></div></div>
      )}
      <div className="cards">
        {data.items.map((it) => (extr ? <ExtravioCard key={it.id} e={it} /> : <ObjectCard key={it.id} h={it} />))}
      </div>

      <div className="pager">
        <button className="btn btn--secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Anterior</button>
        <span className="mono muted">{page} / {totalPag}</span>
        <button className="btn btn--secondary" disabled={page >= totalPag} onClick={() => setPage(page + 1)}>Siguiente ›</button>
      </div>
    </>
  )
}
