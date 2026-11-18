import { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../lib/api.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  function update(user) {
    api.setUsuario(user)
    if (api.USE_MOCK && user) sessionStorage.setItem('co_user', JSON.stringify(user))
    else sessionStorage.removeItem('co_user')
    sessionStorage.removeItem('co_token')
    setUsuario(user)
  }
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
  }, [])
  async function login(email, password) {
    const result = await api.login(email, password)
    update(result.usuario)
  }
  async function logout() {
    try { await api.logout() } finally { update(null) }
  }
  const esStaff = api.USE_MOCK && !!usuario && ['vigilancia', 'administrador'].includes(usuario.rol)
  return <AuthContext.Provider value={{ usuario, login, logout, esStaff, cargando }}>{children}</AuthContext.Provider>
}
