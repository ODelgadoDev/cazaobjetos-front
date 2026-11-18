const OPT_IN = 'co_push_optin_user'
let operations = Promise.resolve()
let epoch = 0
export const pushEpoch = () => epoch
const serial = (task) => { operations = operations.catch(() => {}).then(task); return operations }
const timeout = (promise, ms = 10000) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('No se pudo preparar el dispositivo. Recarga la app e intenta de nuevo.')), ms); promise.then((v) => { clearTimeout(timer); resolve(v) }, (e) => { clearTimeout(timer); reject(e) }) })
export const pushSupported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const optedIn = (id) => { try { return localStorage.getItem(OPT_IN) === id } catch { return false } }
export function rememberPush(id) { try { if (id) localStorage.setItem(OPT_IN, id); else localStorage.removeItem(OPT_IN) } catch {} }
export async function pushRegistration() {
  if (!pushSupported()) throw new Error('Este navegador necesita una conexión segura y soporte para notificaciones.')
  await navigator.serviceWorker.register(import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js', { scope: '/', updateViaCache: 'none' })
  return timeout(navigator.serviceWorker.ready)
}
async function message(registration, body) {
  const worker = registration.active
  if (!worker) throw new Error('Recarga la app para terminar de preparar las notificaciones.')
  return timeout(new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (event) => { channel.port1.close(); event.data?.ok ? resolve(event.data) : reject(new Error('No se pudo actualizar la vinculación del dispositivo.')) }
    worker.postMessage(body, [channel.port2])
  }))
}
export const bindPush = (registration, userId, binding) => serial(() => message(registration, { type: 'CO_PUSH_BIND', userId, binding }))
async function deleteLocalBinding(expectedUserId) {
  if (!('indexedDB' in window)) return
  await new Promise((resolve, reject) => {
    const opening = indexedDB.open('cazaobjetos-push-binding', 1)
    opening.onupgradeneeded = () => opening.result.createObjectStore('state')
    opening.onerror = () => reject(opening.error)
    opening.onsuccess = () => {
      const db = opening.result, tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state'), read = store.get('current')
      read.onsuccess = () => { if (!expectedUserId || read.result?.userId === expectedUserId) store.delete('current') }
      tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) }
    }
  })
}
export function clearPushBinding(expectedUserId) {
  return serial(() => deleteLocalBinding(expectedUserId))
}
async function mute(unsubscribe) {
  if (!('serviceWorker' in navigator)) return
  await deleteLocalBinding()
  const reg = await navigator.serviceWorker.getRegistration('/')
  if (reg) for (const notification of await reg.getNotifications()) notification.close()
  if (unsubscribe) { const subscription = await reg?.pushManager?.getSubscription(); if (subscription) await subscription.unsubscribe() }
}
export function mutePushForLogin() { epoch++; return serial(() => mute(false)) }
export function silencePushDevice() { epoch++; rememberPush(null); return serial(() => mute(true)) }
export function applicationKey(base64) {
  const text = atob((base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(text, (c) => c.charCodeAt(0))
}

export const subscribePush = (registration, key) => timeout(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(key) }), 20000)
