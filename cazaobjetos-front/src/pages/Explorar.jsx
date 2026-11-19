import { useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { listExtravios, listHallazgos } from '../lib/api.js'
import { CATEGORIAS, UBICACIONES } from '../lib/constants.js'
import ObjectCard, { ExtravioCard } from '../components/ObjectCard.jsx'
import { IconSearch } from '../components/Icons.jsx'
import './Catalogo.css'

const PAGE_SIZE = 5
const scrollPositions = new Map()

export default function Explorar() {
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
  const extr = tab === 'extravios'
  const activeFilters = [categoria !== 'Todos', zona !== 'Todos', orden !== 'recientes', extr && estado !== 'activo'].filter(Boolean).length
  const [showFilters, setShowFilters] = useState(false)
  function clearFilters() {
    const next = new URLSearchParams(params)
    for (const key of ['categoria', 'zona', 'orden', 'estado', 'page']) next.delete(key)
    restoreScroll.current = false
    setParams(next, { replace: true })
  }
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
    let loading = false
    setCargando(true)
    async function load() {
      if (!vivo || loading || document.hidden || !navigator.onLine) return
      loading = true
      try {
        const filters = { q, categoria, zona, orden, estado, page, pageSize: PAGE_SIZE }
        const result = await (tab === 'extravios' ? listExtravios(filters) : listHallazgos(filters))
        if (vivo) { setData(result); setError('') }
      } catch (error) {
        if (vivo) setError(error.message)
      } finally {
        loading = false
        if (vivo) setCargando(false)
      }
    }
    const initial = setTimeout(load, 250)
    const timer = setInterval(load, 5000)
    window.addEventListener('focus', load)
    window.addEventListener('online', load)
    document.addEventListener('visibilitychange', load)
    return () => {
      vivo = false
      clearTimeout(initial); clearInterval(timer)
      window.removeEventListener('focus', load)
      window.removeEventListener('online', load)
      document.removeEventListener('visibilitychange', load)
    }
  }, [tab, q, categoria, zona, orden, estado, page])

  const totalPag = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const cambiarTab = (nextTab) => {
    if (nextTab === tab) return
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
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Qué quieres ver">
        <button type="button" role="tab" aria-selected={extr} className={extr ? 'is-active' : ''} onClick={() => cambiarTab('extravios')}>Se buscan</button>
        <button type="button" role="tab" aria-selected={!extr} className={!extr ? 'is-active' : ''} onClick={() => cambiarTab('hallazgos')}>Encontrados</button>
      </div>

      <div className="catalog-search">
        <div className="catalog-search__field">
          <IconSearch width={18} height={18} />
          <input id="q" type="search" className="input" aria-label={extr ? 'Buscar objetos perdidos' : 'Buscar objetos encontrados'}
            placeholder="Buscar objetos" value={q} onChange={(e) => changeFilter('q', e.target.value)} />
        </div>
        <button type="button" className="btn btn--secondary" aria-expanded={showFilters} aria-controls="catalog-filters"
          onClick={() => setShowFilters((visible) => !visible)}>
          Filtrar{activeFilters > 0 && ` (${activeFilters})`}
        </button>
      </div>

      <div id="catalog-filters" className="card catalog-filters" hidden={!showFilters}>
        <div className="chips" role="group" aria-label="Filtrar por categoría">
          {['Todos', ...CATEGORIAS].map((c) => (
            <button type="button" key={c} className={`filter ${categoria === c ? 'is-active' : ''}`} aria-pressed={categoria === c} onClick={() => changeFilter('categoria', c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="row2">
          <select className="select select--tenue" aria-label="Ordenar por fecha" value={orden} onChange={(e) => changeFilter('orden', e.target.value)}>
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
          </select>
          <div><input className="input" list="explore-locations" aria-label="Filtrar por ubicación" placeholder="Ubicación" value={zona === 'Todos' ? '' : zona} onChange={(event) => changeFilter('zona', event.target.value)} /><datalist id="explore-locations">{UBICACIONES.map((place) => <option key={place} value={place} />)}</datalist></div>
        </div>
        {extr && (
          <select className="select select--tenue" aria-label="Filtrar por estado" value={estado} onChange={(e) => changeFilter('estado', e.target.value)}>
            <option value="activo">Se buscan</option>
            <option value="recuperado">Recuperados</option>
            <option value="Todos">Todos los estados</option>
          </select>
        )}
        {activeFilters > 0 && <button type="button" className="btn btn--secondary" onClick={clearFilters}>Quitar filtros</button>}
      </div>

      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      {cargando && !data.items.length && <p className="empty">{extr ? 'Cargando reportes…' : 'Cargando objetos…'}</p>}
      {!cargando && !error && !data.items.length && (
        <p className="empty">No hay resultados.</p>
      )}
      <div className="cards">
        {data.items.map((it) => (extr ? <ExtravioCard key={it.id} e={it} /> : <ObjectCard key={it.id} h={it} />))}
      </div>

      {totalPag > 1 && <div className="pager">
        <button className="btn btn--secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Anterior</button>
        <span className="mono muted">{page} / {totalPag}</span>
        <button className="btn btn--secondary" disabled={page >= totalPag} onClick={() => setPage(page + 1)}>Siguiente ›</button>
      </div>}
    </>
  )
}
