import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clearReadNotifications, listNotifications, readNotification } from '../lib/api.js'
import { useNotifications } from '../context/NotificationContext.jsx'
import DeviceNotifications from '../components/DeviceNotifications.jsx'
import { useToast } from '../components/Toast.jsx'
import { IconBell, IconTrash, IconArrowRight } from '../components/Icons.jsx'

const date = (value) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const destination = (n) => ({ CLAIM: `/reclamos/${n.targetId}`, FOUND_ITEM: `/reclamo/${n.targetId}`, LOST_REPORT: `/extravio/${n.targetId}` })[n.targetType]
export default function Notificaciones() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const nativeNotice = params.get('aviso')
  const nativeAttempt = useRef(null)
  const toast = useToast()
  const { unread, total, version, error: summaryError, refresh } = useNotifications()
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const live = useRef(true)
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    listNotifications({ filter, page, pageSize: 20 }, controller.signal).then((result) => {
      if (!active) return
      if (!result.items.length && page > 0) { setPage(Math.max(0, result.totalPages - 1)); return }
      setData(result); setError('')
    }).catch((e) => { if (active && e.name !== 'AbortError') setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [filter, page, version, revision])
  useEffect(() => {
    if (!nativeNotice || nativeAttempt.current === nativeNotice) return
    nativeAttempt.current = nativeNotice
    if (!/^[0-9a-f-]{36}$/i.test(nativeNotice)) { setError('El aviso no está disponible.'); setParams({}, { replace: true }); return }
    readNotification(nativeNotice).then((notification) => {
      if (!live.current) return
      const target = destination(notification)
      refresh(); if (target) navigate(target, { replace: true })
    }).catch((e) => { if (live.current) { setError(e.message); setParams({}, { replace: true }); refresh() } })
  }, [nativeNotice, navigate, refresh, setParams])
  async function open(notification) {
    if (busy) return
    const target = destination(notification)
    if (!target) return setError('El destino de este aviso no está disponible.')
    setBusy(true); setError('')
    try {
      await readNotification(notification.id)
      if (live.current) { refresh(); navigate(target) }
    } catch (e) { if (live.current) { setError(e.message); refresh() } }
    finally { if (live.current) setBusy(false) }
  }
  async function clear() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = await clearReadNotifications()
      if (live.current) { setPage(0); setRevision((v) => v + 1); refresh(); toast(result.cleared ? 'Se retiraron los avisos leídos. Los pendientes siguen aquí.' : 'No hay avisos leídos por limpiar.') }
    } catch (e) { if (live.current) setError(e.message) }
    finally { if (live.current) setBusy(false) }
  }
  return <div className="notifications-page">
    <DeviceNotifications />
    <section className="card notifications-intro">
      <h2 className="section-title"><IconBell width={22} height={22} /> Tu estación de notificaciones</h2>
      <p>Consulta publicaciones y novedades de tus reclamos. Un aviso queda leído cuando lo pulsas para abrir su destino.</p>
      <div className="notification-toolbar"><span className="notification-summary" aria-live="polite">{unread} {unread === 1 ? 'pendiente' : 'pendientes'} · {total} {total === 1 ? 'aviso' : 'avisos'}</span><div className="btn-row"><button type="button" className="btn btn--secondary" disabled={busy || loading} onClick={() => { refresh(); setRevision((v) => v + 1) }}>Actualizar notificaciones</button><button type="button" className="btn btn--secondary" disabled={busy || total <= unread} onClick={clear}><IconTrash width={17} height={17} /> Limpiar leídas</button></div></div>
      <p className="account-help">Limpiar retira solo los avisos ya leídos. Los comentarios, las pruebas y el historial del reclamo se conservan.</p>
    </section>
    <div className="tabs" role="tablist" aria-label="Filtrar notificaciones">{[['ALL', 'Todas'], ['UNREAD', 'Pendientes']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? 'is-active' : ''} onClick={() => { if (filter !== id) { setData(null); setFilter(id); setPage(0) } }}>{label}</button>)}</div>
    {(error || summaryError) && <div className="notice notice--peligro" role="alert">{error || summaryError}</div>}
    {loading && !data && <p className="empty">Cargando tus notificaciones…</p>}
    {data && !data.items.length && <div className="card notification-empty"><IconBell width={32} height={32} /><h3>{filter === 'UNREAD' ? 'No tienes avisos pendientes' : 'Tu estación está al día'}</h3><p>Aquí aparecerán las novedades de tus publicaciones y reclamos.</p></div>}
    <ol className="notification-list" aria-label="Tus notificaciones" aria-busy={loading}>{data?.items.map((n) => <li key={n.id}><button type="button" className={`notification-card${n.readAt ? '' : ' notification-card--unread'}`} data-notification-id={n.id} disabled={busy} onClick={() => open(n)}>
      <span className="notification-card__icon"><IconBell width={22} height={22} /></span><span className="notification-card__content"><span className="notification-card__heading"><strong>{n.title}</strong><span className={`notification-state${n.readAt ? '' : ' notification-state--unread'}`}>{n.readAt ? 'Leída' : 'Pendiente'}</span></span><span className="notification-card__body">{n.body}</span><time dateTime={n.createdAt}>{date(n.createdAt)}</time></span><IconArrowRight className="notification-card__arrow" width={18} height={18} />
    </button></li>)}</ol>
    {data && data.totalPages > 1 && <div className="pager" aria-label="Paginación de notificaciones"><button type="button" className="btn btn--secondary" disabled={loading || busy || !data.hasPrevious} onClick={() => setPage((v) => v - 1)}>Anterior</button><span>Página {data.page + 1} de {data.totalPages}</span><button type="button" className="btn btn--secondary" disabled={loading || busy || !data.hasNext} onClick={() => setPage((v) => v + 1)}>Siguiente</button></div>}
  </div>
}
