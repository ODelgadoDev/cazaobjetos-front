import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { USE_MOCK, restablecerPassword, solicitarRecuperacion } from '../lib/api.js'
import { DOMINIO, MIN_PASSWORD } from '../lib/constants.js'
import AuthShell, { VolverAlLogin } from '../components/AuthShell.jsx'
import { CampoCodigo, useCuentaAtras } from './Verificar.jsx'

export default function Recuperar() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [paso, setPaso] = useState(1)
  const [correo, setCorreo] = useState(state?.correo ?? '')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [espera, iniciarEspera] = useCuentaAtras()
  const c = correo.trim().toLowerCase()

  async function pedirCodigo(e) {
    e?.preventDefault()
    setError('')
    if (!c.endsWith(DOMINIO)) return setError(`Escribe tu correo institucional ${DOMINIO}.`)
    setEnviando(true)
    try {
      await solicitarRecuperacion(c)
      setAviso(`Si ${c} tiene cuenta, recibirás un código de 6 dígitos.`)
      setPaso(2)
      iniciarEspera()
    } catch (err) { setError(err.message) } finally { setEnviando(false) }
  }

  async function restablecer(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(codigo)) return setError('El código tiene 6 dígitos.')
    if (password.length < MIN_PASSWORD) return setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
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

  return (
    <AuthShell
      titulo="Recupera tu contraseña"
      intro={paso === 1 ? 'Te enviaremos un código a tu correo institucional para que pongas una contraseña nueva.' : 'Ingresa el código que recibiste y elige tu nueva contraseña.'}
      pie={<VolverAlLogin />}
    >
      {paso === 1 ? (
        <form className="card" onSubmit={pedirCodigo} noValidate>
          <div className="field">
            <label htmlFor="rc-correo">Correo institucional</label>
            <input id="rc-correo" className="input" type="email" autoComplete="email" placeholder={`matricula${DOMINIO}`} value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          {error && <div className="notice notice--peligro" role="alert">{error}</div>}
          <button className="btn btn--primary" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviarme un código'}</button>
        </form>
      ) : (
        <form className="card" onSubmit={restablecer} noValidate>
          {aviso && <div className="notice notice--ok" role="status">{aviso}</div>}
          <CampoCodigo id="rc-codigo" value={codigo} onChange={setCodigo} />
          <div className="field">
            <label htmlFor="rc-pass">Nueva contraseña</label>
            <input id="rc-pass" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="help">MÍN. {MIN_PASSWORD} CARACTERES</span>
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
