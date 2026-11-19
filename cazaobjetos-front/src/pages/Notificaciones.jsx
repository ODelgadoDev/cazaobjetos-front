import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clearReadNotifications, listNotifications, readNotification, notificationPhotos } from '../lib/api.js'
import { useNotifications } from '../context/NotificationContext.jsx'
import DeviceNotifications from '../components/DeviceNotifications.jsx'
import { useToast } from '../components/Toast.jsx'
import { IconTrash, IconArrowRight } from '../components/Icons.jsx'
import ObjectThumbnails from '../components/ObjectThumbnails.jsx'
import './flujo-simple.css'


const date = (value) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

function destination(notice) {
  if (!notice?.targetId) return null
  if (notice.targetType === 'LOST_REPORT') return `/extravio/${notice.targetId}${notice.responseId ? `#respuesta-${notice.responseId}` : ''}`
  if (notice.targetType === 'FOUND_ITEM') return `/reclamo/${notice.targetId}`
  if (notice.targetType === 'CLAIM') return `/reclamos/${notice.targetId}`
  return null
}

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
  const [images, setImages] = useState({})
  const imageKey = data?.items.map((notice) => notice.id).join(',') || ''
  useEffect(() => {
    let active = true
    if (!data?.items.length) { setImages({}); return }
    notificationPhotos(data.items).then((result) => { if (active) setImages(result) }).catch(() => {})
    return () => { active = false }
  }, [imageKey])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [hovered, setHovered] = useState(null)
  const reading = useRef(new Map())
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
    }).catch((e) => {
      if (active && e.name !== 'AbortError') setError(e.message)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [filter, page, version, revision])

  useEffect(() => {
    if (!nativeNotice || nativeAttempt.current === nativeNotice) return
    nativeAttempt.current = nativeNotice
    function unavailable(message) {
      if (!live.current) return
      setError(message)
      setParams((current) => { current.delete('aviso'); return current }, { replace: true })
    }
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(nativeNotice)) {
      unavailable('Aviso no disponible.')
      return
    }
    readNotification(nativeNotice).then((notice) => {
      if (!live.current) return
      const target = destination(notice)
      refresh()
      if (target) navigate(target, { replace: true })
      else unavailable('Aviso no disponible.')
    }).catch((e) => unavailable(e.message))
  }, [nativeNotice, navigate, refresh, setParams])

  function markRead(notice) {
    if (notice.readAt || reading.current.has(notice.id)) return
    const pending = readNotification(notice.id).then((updated) => {
      if (!live.current) return
      setData((current) => current && {
        ...current,
        items: current.items.map((item) => item.id === notice.id ? { ...item, ...updated } : item),
      })
      setHovered((current) => current?.notice.id === notice.id
        ? { ...current, notice: { ...current.notice, ...updated } } : current)
      refresh()
    }).catch(() => {
      // Another hover or opening the notice can retry.
    }).finally(() => reading.current.delete(notice.id))
    reading.current.set(notice.id, pending)
  }

  function open(notice) {
    const target = destination(notice)
    if (!target) { setError('Aviso no disponible.'); return }
    markRead(notice)
    navigate(target)
  }

  async function clear() {
    if (clearing) return
    setClearing(true); setError('')
    try {
      const result = await clearReadNotifications()
      if (live.current) {
        setHovered(null); setPage(0); setRevision((value) => value + 1); refresh()
        toast(result.cleared ? 'Avisos leídos eliminados.' : 'Sin avisos leídos.')
      }
    } catch (e) { if (live.current) setError(e.message) }
    finally { if (live.current) setClearing(false) }
  }

  const notices = data?.items.filter((notice) => filter !== 'UNREAD' || !notice.readAt || notice.id === hovered?.notice.id) || []
  // Keep the item under the mouse clickable in Pendientes until the pointer leaves.
  if (filter === 'UNREAD' && hovered?.notice.readAt && !notices.some((notice) => notice.id === hovered.notice.id)) {
    notices.splice(hovered.index, 0, hovered.notice)
  }

  return (
    <div className="notifications-page notifications-simple">
      <div className="notification-toolbar">
        <span className="notification-summary" aria-live="polite">{unread} {unread === 1 ? 'pendiente' : 'pendientes'}</span>
        <button type="button" className="btn btn--secondary" disabled={clearing || total <= unread} onClick={clear}>
          <IconTrash width={17} height={17} /> Limpiar leídas
        </button>
      </div>
      <div className="tabs" role="tablist" aria-label="Filtrar notificaciones">
        {[['ALL', 'Todas'], ['UNREAD', 'Pendientes']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? 'is-active' : ''}
            onClick={() => { if (filter !== id) { setHovered(null); setData(null); setFilter(id); setPage(0) } }}>{label}</button>
        ))}
      </div>
      {(error || summaryError) && <p className="notice notice--peligro" role="alert">{error || summaryError}</p>}
      {loading && !data && <p className="empty">Cargando avisos…</p>}
      {data && !notices.length && <p className="empty">{filter === 'UNREAD' ? 'Sin avisos pendientes.' : 'Sin avisos.'}</p>}
      <ol className="notification-list" aria-label="Tus notificaciones" aria-busy={loading}>
        {notices.map((notice, index) => (
          <li key={notice.id}>
            <button type="button" className={`notification-card${notice.readAt ? '' : ' notification-card--unread'}`}
              data-notification-id={notice.id} disabled={clearing}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'mouse') return
                setHovered({ notice, index })
                markRead(notice)
              }}
              onPointerLeave={() => setHovered((current) => current?.notice.id === notice.id ? null : current)}
              onClick={() => open(notice)}>
              <ObjectThumbnails images={images[notice.id] || []} />
              <span className="notification-card__content">
                <strong className="notice-object">{notice.objectTitle || notice.title}</strong>
                <span className={`notice-action${notice.kind === 'ACCEPTED' ? ' notice-action--ready' : ''}`}>{notice.kind === 'ACCEPTED' ? 'Listo para recoger' : notice.action || notice.title}</span>
                {notice.actorName && <span className="notice-actor">{notice.actorName}</span>}
                <time dateTime={notice.createdAt}>{date(notice.createdAt)}</time>
              </span>
              <IconArrowRight className="notification-card__arrow" width={18} height={18} />
            </button>
          </li>
        ))}
      </ol>
      {data && data.totalPages > 1 && <div className="pager" aria-label="Paginación de notificaciones">
        <button type="button" className="btn btn--secondary" disabled={loading || clearing || !data.hasPrevious} onClick={() => { setHovered(null); setPage((value) => value - 1) }}>Anterior</button>
        <span>Página {data.page + 1} de {data.totalPages}</span>
        <button type="button" className="btn btn--secondary" disabled={loading || clearing || !data.hasNext} onClick={() => { setHovered(null); setPage((value) => value + 1) }}>Siguiente</button>
      </div>}
      <DeviceNotifications />
    </div>
  )
}
