import { PASSWORD_REQUIREMENTS, passwordError } from '../lib/password.js'
import FormHelp from '../components/FormHelp.jsx'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { USE_MOCK, restablecerPassword, solicitarRecuperacion } from '../lib/api.js'
import { validEmail } from '../lib/profile.js'
import useRegistrationOptions from '../lib/useRegistrationOptions.js'
import AuthShell, { VolverAlLogin } from '../components/AuthShell.jsx'
import { CampoCodigo, useCuentaAtras } from './Verificar.jsx'

export default function Recuperar() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { openRegistration, loading: loadingMode, error: modeError } = useRegistrationOptions()
  const [paso, setPaso] = useState(1)
  const [correo, setCorreo] = useState(state?.correo ?? '')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [espera, iniciarEspera] = useCuentaAtras()
  const c = validEmail(correo)

  async function pedirCodigo(e) {
    e?.preventDefault()
    setError('')
    if (!c) return setError('Escribe un correo válido.')
    setEnviando(true)
    try {
      await solicitarRecuperacion(c)
      setAviso(`Si ${c} tiene cuenta, recibirás un código de recuperación.`)
      setPaso(2)
      iniciarEspera()
    } catch (err) { setError(err.message) } finally { setEnviando(false) }
  }

  async function restablecer(e) {
    e.preventDefault()
    setError('')
    if (!(USE_MOCK ? /^\d{6}$/ : /^[A-Za-z0-9_-]{43}$/).test(codigo.trim())) return setError('Copia el código completo recibido por correo.')
    const passwordProblem = passwordError(password)
    if (passwordProblem) return setError(passwordProblem)
    if (password !== confirmar) return setError('Las contraseñas no coinciden.')
    setEnviando(true)
    try {
      await restablecerPassword({ correo: c, codigo, password })
      navigate('/', { replace: true, state: { correo: c, aviso: 'Contraseña actualizada. Inicia sesión con la nueva.' } })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  if (openRegistration) return <Navigate to="/login" replace state={{ correo }} />

  return (
    <AuthShell
      titulo="Recupera tu contraseña"
      intro={paso === 1 ? 'Te enviaremos un código a tu correo para que pongas una contraseña nueva.' : 'Ingresa el código que recibiste y elige tu nueva contraseña.'}
      pie={<VolverAlLogin />}
    >
      {modeError && <div className="notice notice--peligro" role="alert">{modeError}</div>}
      {paso === 1 ? (
        <form className="card" onSubmit={pedirCodigo} noValidate>
          <FormHelp title="Cómo recuperar el acceso">Escribe el correo de tu cuenta. Si está registrado, recibirás un código para elegir una contraseña nueva.</FormHelp>
          <div className="field">
            <label htmlFor="rc-correo">Correo</label>
            <input id="rc-correo" className="input" type="email" autoComplete="email" placeholder="nombre@ejemplo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          {error && <div className="notice notice--peligro" role="alert">{error}</div>}
          <button className="btn btn--primary" disabled={enviando || loadingMode || !!modeError}>{enviando ? 'Enviando…' : 'Enviarme un código'}</button>
        </form>
      ) : (
        <form className="card" onSubmit={restablecer} noValidate>
          <FormHelp title="Cómo cambiar la contraseña">Pega el código de recuperación y elige una contraseña nueva. Con ella podrás volver a iniciar sesión.</FormHelp>
          {aviso && <div className="notice notice--ok" role="status">{aviso}</div>}
          <CampoCodigo id="rc-codigo" value={codigo} onChange={setCodigo} />
          <div className="field">
            <label htmlFor="rc-pass">Nueva contraseña</label>
            <input id="rc-pass" aria-describedby="rc-pass-ayuda" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <span id="rc-pass-ayuda" className="help">{PASSWORD_REQUIREMENTS}</span>
          </div>
          <div className="field">
            <label htmlFor="rc-conf">Confirma la contraseña</label>
            <input id="rc-conf" className="input" type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>
          {error && <div className="notice notice--peligro" role="alert">{error}</div>}
          <button className="btn btn--primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar nueva contraseña'}</button>
          <button type="button" className="btn btn--secondary" onClick={() => pedirCodigo()} disabled={espera > 0 || enviando}>
            {espera > 0 ? `Pedir otro código en ${espera} s` : 'Enviarme otro código'}
          </button>
          <button type="button" className="link-green" onClick={() => { setPaso(1); setError(''); setCodigo('') }}>Usar otro correo</button>
        </form>
      )}
      {USE_MOCK && paso === 2 && <div className="notice notice--info"><span>Modo de prueba: el código es <b className="mono">123456</b>.</span></div>}
    </AuthShell>
  )
}
