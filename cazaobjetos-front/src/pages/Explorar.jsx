import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listExtravios, listHallazgos } from '../lib/api.js'
import { CATEGORIAS, UBICACIONES } from '../lib/constants.js'
import ObjectCard, { ExtravioCard } from '../components/ObjectCard.jsx'
import { IconInfo, IconSearch } from '../components/Icons.jsx'

const PAGE_SIZE = 5

export default function Explorar() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'encontrados' ? 'hallazgos' : 'extravios' // por defecto: Se buscan
  const [estado, setEstado] = useState('activo')
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [zona, setZona] = useState('Todos')
  const [orden, setOrden] = useState('recientes')
  const [page, setPage] = useState(1)
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
  const cambiar = (setter) => (v) => { setter(v); setPage(1) }
  const cambiarTab = (t) => { setData({ items: [], total: 0 }); setPage(1); setParams(t === 'hallazgos' ? { tab: 'encontrados' } : {}) }
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
          <span className="grow">¿Encontraste uno de estos? Publícalo y su dueño recibirá una alerta.</span>
          <button className="btn btn--dark" onClick={() => navigate('/reportar')}>Reportar</button>
        </div>
      ) : (
      <div className="notice notice--info">
        <IconInfo width={20} height={20} />
        <span className="grow">¿Perdiste algo y no lo ves?</span>
        <button className="btn btn--dark" onClick={() => navigate('/reportar?tab=perdi')}>Crear alerta</button>
      </div>
      )}

      <div className="field">
        <div style={{ position: 'relative' }}>
          <IconSearch width={18} height={18} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--texto-tenue)' }} />
          <input id="q" aria-label="Buscar por palabra clave" className="input" style={{ paddingLeft: 38 }} placeholder="Buscar por palabra clave" value={q} onChange={(e) => cambiar(setQ)(e.target.value)} />
        </div>
      </div>

      <div className="chips" role="group" aria-label="Filtrar por categoría">
        {['Todos', ...CATEGORIAS].map((c) => (
          <button key={c} className={`filter ${categoria === c ? 'is-active' : ''}`} aria-pressed={categoria === c} onClick={() => cambiar(setCategoria)(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="row2">
        <select className="select select--tenue" aria-label="Ordenar por fecha" value={orden} onChange={(e) => cambiar(setOrden)(e.target.value)}>
          <option value="recientes">Fecha: Más recientes</option>
          <option value="antiguos">Fecha: Más antiguos</option>
        </select>
        <select className="select select--tenue" aria-label="Filtrar por ubicación" value={zona} onChange={(e) => cambiar(setZona)(e.target.value)}>
          <option value="Todos">Ubicación: Todos</option>
          {UBICACIONES.map((u) => <option key={u}>{u}</option>)}
        </select>
      </div>
      {extr && (
        <select className="select select--tenue" aria-label="Filtrar por estado" value={estado} onChange={(e) => cambiar(setEstado)(e.target.value)}>
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
        <p className="empty">{extr ? 'No hay reportes de extravío con esos filtros.' : 'No hay objetos con esos filtros. Prueba con otra palabra o crea una alerta y te avisamos cuando aparezca.'}</p>
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
