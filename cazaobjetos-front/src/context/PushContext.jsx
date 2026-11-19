import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import * as api from '../lib/api.js'
import { applicationKey, bindPush, clearPushBinding, optedIn, pushRegistration, pushSupported, pushEpoch, rememberPush, silencePushDevice, subscribePush } from '../lib/pushDevice.js'

const PushContext = createContext(null)
export const usePush = () => useContext(PushContext)
export function PushProvider({ children }) {
  const { usuario } = useAuth()
  const userId = usuario.id
  const [config, setConfig] = useState(null)
  const [preference, setPreference] = useState(null)
  const [device, setDevice] = useState(null)
  const [permission, setPermission] = useState(() => 'Notification' in window ? Notification.permission : 'unsupported')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)
  const invitationKey = `co_push_first_claim:${userId}`
  const [invitationClaim, setInvitationClaim] = useState(() => {
    try { return localStorage.getItem(invitationKey) } catch { return null }
  })
  function saveInvitation(value) {
    setInvitationClaim(value)
    try { localStorage.setItem(invitationKey, value) } catch { /* Keep the decision for this session. */ }
  }
  function claimSubmitted(id) {
    if (!invitationClaim && !device && permission !== 'denied' && supported) saveInvitation(String(id))
  }
  const live = useRef(true)
  const setup = useRef(null)
  const supported = !api.USE_MOCK && pushSupported()
  useEffect(() => {
    live.current = true
    let active = true
    const startEpoch = pushEpoch()
    const install = () => setInstalled(true)
    window.addEventListener('appinstalled', install)
    async function load() {
      try {
        const [settings, pref] = await Promise.all([api.getPushConfig(), api.getPushPreference()])
        if (!active || pushEpoch() !== startEpoch) return
        setConfig(settings); setPreference(pref)
        if (supported && settings.enabled) {
          const reg = await pushRegistration()
          if (!active || pushEpoch() !== startEpoch) return
          setup.current = reg
          if (Notification.permission === 'granted' && optedIn(userId)) {
            const subscription = await reg.pushManager.getSubscription()
            if (subscription) {
              const saved = await api.registerPush({ expectedUserId: userId, ...subscription.toJSON() })
              if (!active || pushEpoch() !== startEpoch || saved.userId !== userId) return
              await bindPush(reg, userId, saved.bindingToken)
              if (active) setDevice(saved)
            }
          }
        }
      } catch (e) { if (active) setError(e.message) }
      finally { if (active) setLoading(false) }
    }
    load()
    const focus = () => { if (active && 'Notification' in window) { setPermission(Notification.permission); if (Notification.permission !== 'granted') { setDevice(null); clearPushBinding(userId).catch(() => {}) } } }
    window.addEventListener('focus', focus)
    return () => { active = false; live.current = false; window.removeEventListener('appinstalled', install); window.removeEventListener('focus', focus) }
  }, [userId, supported])
  async function enable() {
    if (busy || !supported || !config?.enabled || !setup.current) return
    setBusy(true); setError('')
    const startEpoch = pushEpoch()
    try {
      // Ask synchronously from the user's click, before network work (required on iOS).
      const result = await Notification.requestPermission()
      if (!live.current || pushEpoch() !== startEpoch) return
      setPermission(result)
      if (result !== 'granted') return
      const reg = setup.current
      let subscription = await reg.pushManager.getSubscription()
      if (subscription && subscription.options.applicationServerKey && !Array.from(new Uint8Array(subscription.options.applicationServerKey)).every((value, index) => value === applicationKey(config.applicationServerKey)[index])) { await subscription.unsubscribe(); subscription = null }
      if (!subscription) subscription = await subscribePush(reg, config.applicationServerKey)
      if (!live.current || pushEpoch() !== startEpoch) return
      const saved = await api.registerPush({ expectedUserId: userId, ...subscription.toJSON() })
      if (!live.current || pushEpoch() !== startEpoch || saved.userId !== userId) return
      await bindPush(reg, userId, saved.bindingToken)
      if (live.current) { rememberPush(userId); setDevice(saved); saveInvitation('dismissed') }
    } catch (e) { if (live.current) setError(e.status ? e.message : 'No se pudieron conectar los avisos del dispositivo. Comprueba la conexión e inténtalo de nuevo.') }
    finally { if (live.current) setBusy(false) }
  }
  async function disable() {
    if (busy) return
    setBusy(true); setError('')
    try { await silencePushDevice(); if (device) await api.disablePush(device.id); if (live.current) setDevice(null) }
    catch (e) { if (live.current) { setDevice(null); setError('Los avisos se silenciaron en este navegador. Vuelve a intentarlo con conexión para confirmar la desactivación en el servidor.') } }
    finally { if (live.current) setBusy(false) }
  }
  async function saveFrequency(value) {
    if (busy) return
    setBusy(true); setError('')
    try { const pref = await api.savePushPreference(Number(value)); if (live.current) setPreference(pref) }
    catch (e) { if (live.current) setError(e.message) }
    finally { if (live.current) setBusy(false) }
  }
  async function test() {
    if (!device || busy) return false
    setBusy(true); setError('')
    try { await api.testPush(device.id); return true }
    catch (e) { if (live.current) setError(e.message); return false }
    finally { if (live.current) setBusy(false) }
  }
  return <PushContext.Provider value={{ supported, config, preference, device, permission, busy, loading, error, enable, disable, saveFrequency, test, installed, invitationClaim, claimSubmitted, dismiss: () => saveInvitation('dismissed') }}>{children}</PushContext.Provider>
}
