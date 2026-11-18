import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { clearPushBinding, silencePushDevice } from '../lib/pushDevice.js'
import * as api from '../lib/api.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const currentUser = useRef(null)
  const [cargando, setCargando] = useState(true)
  const [cerrandoSesion, setCerrandoSesion] = useState(false)
  const logoutRequest = useRef(null)
  const update = useCallback((user) => {
    const previous = currentUser.current
    if (previous && previous.id !== user?.id) clearPushBinding(previous.id).catch(() => {})
    currentUser.current = user
    api.setUsuario(user)
    if (api.USE_MOCK && user) sessionStorage.setItem('co_user', JSON.stringify(user))
    else sessionStorage.removeItem('co_user')
    sessionStorage.removeItem('co_token')
    setUsuario(user)
  }, [])
  const actualizarPerfil = useCallback((user) => {
    // A late profile response must not restore an expired session or another login.
    if (user && currentUser.current?.id === user.id) update(user)
  }, [update])
  useEffect(() => {
    let active = true
    const clear = () => update(null)
    window.addEventListener('co-session-expired', clear)
    const restore = api.USE_MOCK
      ? Promise.resolve().then(() => JSON.parse(sessionStorage.getItem('co_user') || 'null'))
      : api.getPerfil()
    restore.then((user) => { if (active) update(user) }).catch(() => { if (active) update(null) })
      .finally(() => { if (active) setCargando(false) })
    return () => { active = false; window.removeEventListener('co-session-expired', clear) }
  }, [update])
  async function login(email, password) {
    const result = await api.login(email, password)
    update(result.usuario)
  }
  function logout() {
    if (logoutRequest.current) return logoutRequest.current
    setCerrandoSesion(true)
    logoutRequest.current = silencePushDevice().then(() => api.logout()).then(() => update(null)).finally(() => {
      logoutRequest.current = null
      setCerrandoSesion(false)
    })
    return logoutRequest.current
  }
  const esStaff = api.USE_MOCK && !!usuario && ['vigilancia', 'administrador'].includes(usuario.rol)
  return <AuthContext.Provider value={{ usuario, login, logout, esStaff, cargando, actualizarPerfil, cerrandoSesion }}>{children}</AuthContext.Provider>
}
