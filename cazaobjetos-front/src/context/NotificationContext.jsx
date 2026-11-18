import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getNotificationSummary } from '../lib/api.js'

const NotificationContext = createContext(null)
export const useNotifications = () => useContext(NotificationContext)
export function NotificationProvider({ children }) {
  const [summary, setSummary] = useState({ unread: 0, total: 0 })
  const [version, setVersion] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const action = useRef(null)
  const refresh = useCallback(() => action.current?.(), [])
  useEffect(() => {
    let live = true, running = false, again = false
    const controller = new AbortController()
    async function load() {
      if (!live || !navigator.onLine) { if (live) setLoading(false); return }
      if (running) { again = true; return }
      running = true
      try {
        const data = await getNotificationSummary(controller.signal)
        if (live) { setSummary(data); setError(''); setVersion((v) => v + 1) }
      } catch (e) { if (live && e.name !== 'AbortError') setError('No se pudieron actualizar las notificaciones. Vuelve a intentarlo.') }
      finally { running = false; if (live) { setLoading(false); if (again) { again = false; load() } } }
    }
    action.current = load
    const visible = () => { if (!document.hidden) load() }
    const timer = setInterval(visible, 30000)
    window.addEventListener('focus', visible)
    window.addEventListener('online', load)
    window.addEventListener('co-notifications-refresh', load)
    document.addEventListener('visibilitychange', visible)
    load()
    return () => {
      live = false; action.current = null; controller.abort(); clearInterval(timer)
      window.removeEventListener('focus', visible); window.removeEventListener('online', load)
      window.removeEventListener('co-notifications-refresh', load); document.removeEventListener('visibilitychange', visible)
    }
  }, [])
  return <NotificationContext.Provider value={{ ...summary, version, loading, error, refresh }}>{children}</NotificationContext.Provider>
}
