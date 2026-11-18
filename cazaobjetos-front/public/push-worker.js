/* Imported by the single Workbox service worker. No private message text is received. */
(() => {
  const dbName = 'cazaobjetos-push-binding'
  function storage(mode, action) {
    return new Promise((resolve, reject) => {
      const opening = indexedDB.open(dbName, 1)
      opening.onupgradeneeded = () => opening.result.createObjectStore('state')
      opening.onerror = () => reject(opening.error)
      opening.onsuccess = () => {
        const db = opening.result, tx = db.transaction('state', mode), store = tx.objectStore('state')
        let request
        try { request = action(store) } catch (e) { db.close(); reject(e); return }
        tx.oncomplete = () => { const result = request?.result; db.close(); resolve(result) }
        tx.onerror = () => { db.close(); reject(tx.error) }
      }
    })
  }
  const current = () => storage('readonly', (store) => store.get('current'))
  const uuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  let changes = Promise.resolve()
  self.addEventListener('message', (event) => {
    const data = event.data || {}
    if (!['CO_PUSH_BIND', 'CO_PUSH_CLEAR', 'CO_PUSH_STATUS'].includes(data.type)) return
    changes = changes.catch(() => {}).then(async () => {
      const old = await current()
      if (data.type === 'CO_PUSH_BIND') {
        if (!uuid(data.userId) || typeof data.binding !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.binding)) throw new Error('Invalid binding')
        await storage('readwrite', (store) => store.put({ userId: data.userId, binding: data.binding }, 'current'))
        if (old?.binding !== data.binding) for (const n of await self.registration.getNotifications()) n.close()
      } else if (data.type === 'CO_PUSH_CLEAR' && (!data.expectedUserId || old?.userId === data.expectedUserId)) {
        await storage('readwrite', (store) => store.delete('current'))
        for (const n of await self.registration.getNotifications()) n.close()
      }
      event.ports[0]?.postMessage({ ok: true, active: data.type === 'CO_PUSH_STATUS' ? !!old : undefined })
    }).catch(() => { event.ports[0]?.postMessage({ ok: false }) })
    event.waitUntil(changes)
  })
  self.addEventListener('push', (event) => {
    event.waitUntil((async () => {
      let payload
      try { payload = event.data?.json() } catch { return }
      await changes.catch(() => {})
      const state = await current()
      if (!state || payload?.binding !== state.binding || !uuid(payload.deliveryId) || !['EVENT', 'REMINDER', 'TEST'].includes(payload.kind)) return
      if (payload.kind === 'EVENT' && !uuid(payload.notificationId)) return
      const title = payload.kind === 'TEST' ? 'Notificaciones activadas' : payload.kind === 'REMINDER' ? 'Recordatorio de CazaObjetos' : 'CazaObjetos UTCH'
      const body = payload.kind === 'TEST' ? 'Este dispositivo puede mostrar avisos de CazaObjetos.' : payload.kind === 'REMINDER' ? 'Revisa tus avisos pendientes, reclamos en curso o reportes de extravío.' : 'Hay novedades en tus publicaciones o reclamos. Abre la app para revisarlas.'
      await self.registration.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: `caza-${payload.deliveryId}`, renotify: false, data: { binding: state.binding, notificationId: payload.kind === 'EVENT' ? payload.notificationId : null } })
    })())
  })
  self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil((async () => {
      await changes.catch(() => {})
      const state = await current(), data = event.notification.data
      if (!state || state.binding !== data?.binding) return
      const path = '/notificaciones' + (uuid(data.notificationId) ? `?aviso=${encodeURIComponent(data.notificationId)}` : '')
      const url = new URL(path, self.location.origin).href
      for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
        if (new URL(client.url).origin === self.location.origin) { await client.navigate(url); await client.focus(); return }
      }
      await self.clients.openWindow(url)
    })())
  })
})()
