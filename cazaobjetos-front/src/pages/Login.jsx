import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { USE_MOCK } from '../lib/api.js'
import { DOMINIO } from '../lib/constants.js'
import AuthShell from '../components/AuthShell.jsx'

export default function Login() {
  const { login } = useAuth()
  const { state } = useLocation()
  const [email, setEmail] = useState(state?.correo ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim().toLowerCase().endsWith(DOMINIO)) {
      setError({ message: `Usa tu correo institucional que termina en ${DOMINIO}.` })
      return
    }
    setCargando(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err)
      setCargando(false)
    }
  }

  return (
    <AuthShell
      titulo="Inicia sesión en CazaObjetos"
      intro="Solo la comunidad UTCH puede reclamar objetos. Entra con tu correo institucional."
      conInstalar
      pie={
        <>
          <p className="auth-links">¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
          {USE_MOCK && (
            <div className="notice notice--info">
              <span>
                Modo de prueba. Entra con <b>estudiante@</b>, <b>docente@</b> o <b>vigilancia@utch.edu.mx</b> (cualquier contraseña).
              </span>
            </div>
          )}
        </>
      }
    >
      <form className="card" onSubmit={onSubmit} noValidate>
        {state?.aviso && <div className="notice notice--ok" role="status">{state.aviso}</div>}
        <div className="field">
          <label htmlFor="email">Correo institucional</label>
          <input id="email" className="input" type="email" autoComplete="username" placeholder={`matricula${DOMINIO}`} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pass">Contraseña <Link className="link" to="/recuperar" state={{ correo: email }}>¿La olvidaste?</Link></label>
          <input id="pass" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <div className="notice notice--peligro" role="alert">
            <span>
              {error.message}
              {error.code === 'CORREO_NO_VERIFICADO' && <> <Link className="link" to="/verificar" state={{ correo: email.trim().toLowerCase() }}>Verificar ahora</Link></>}
            </span>
          </div>
        )}
        <button className="btn btn--primary" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </AuthShell>
  )
}
