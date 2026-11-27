import FormHelp from '../components/FormHelp.jsx'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import useRegistrationOptions from '../lib/useRegistrationOptions.js'
import { USE_MOCK, activarCuentaPrueba, reenviarCodigo, verificarCorreo } from '../lib/api.js'
import { validEmail } from '../lib/profile.js'
import AuthShell, { VolverAlLogin } from '../components/AuthShell.jsx'

const ESPERA = 60 // segundos entre reenvíos

export function useCuentaAtras() {
  const [seg, setSeg] = useState(0)
  useEffect(() => {
    if (seg <= 0) return
    const t = setTimeout(() => setSeg(seg - 1), 1000)
    return () => clearTimeout(t)
  }, [seg])
  return [seg, () => setSeg(ESPERA)]
}

export default function Verificar() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { demoVerification, openRegistration, loading: loadingMode, error: modeError, retry: retryMode } = useRegistrationOptions()
  const [correo, setCorreo] = useState(state?.correo ?? '')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [espera, iniciarEspera] = useCuentaAtras()

  useEffect(() => { if (state?.recienCreada && !loadingMode && !modeError && !demoVerification) iniciarEspera() }, [loadingMode, modeError, demoVerification]) // eslint-disable-line react-hooks/exhaustive-deps

  const correoOk = validEmail(correo)

  async function verificar(e) {
    e.preventDefault()
    if (enviando || loadingMode || modeError) return
    setError('')
    if (!correoOk) return setError('Escribe un correo válido.')
    if (!demoVerification && !(USE_MOCK ? /^\d{6}$/ : /^[A-Za-z0-9_-]{43}$/).test(codigo.trim())) return setError('Copia el código completo recibido por correo.')
    setEnviando(true)
    try {
      if (demoVerification) await activarCuentaPrueba(correoOk)
      else await verificarCorreo(correoOk, codigo)
      navigate('/login', { replace: true, state: { correo: correoOk, aviso: demoVerification ? 'Cuenta de prueba activada. Ya puedes iniciar sesión.' : 'Correo verificado. Ya puedes iniciar sesión.' } })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  async function reenviar() {
    setError('')
    setAviso('')
    if (!correoOk) return setError('Escribe un correo válido para recibir otro código.')
    try {
      await reenviarCodigo(correoOk)
      setAviso('Te enviamos un código nuevo. Revisa también la carpeta de spam.')
      iniciarEspera()
    } catch (err) { setError(err.message) }
  }

  if (openRegistration) return <Navigate to="/login" replace state={{ correo, aviso: 'Ya puedes iniciar sesión con tu contraseña.' }} />

  return (
    <AuthShell titulo="Verifica tu correo" intro={demoVerification ? "Activa tu cuenta de prueba sin código." : loadingMode ? "Preparando la verificación…" : "Ingresa el código que recibiste en tu correo para activar tu cuenta."} pie={<VolverAlLogin />}>
      <form className="card" onSubmit={verificar} noValidate>
        <FormHelp title="Para qué se activa la cuenta">{demoVerification ? 'Activa la cuenta de prueba con el correo que registraste. Después podrás iniciar sesión con tu contraseña.' : 'Usa el código que llegó a tu correo para activar tu cuenta. Después podrás iniciar sesión.'}</FormHelp>
        {modeError && <div className="notice notice--peligro" role="alert"><span>{modeError}</span><button type="button" className="btn btn--secondary" onClick={retryMode}>Reintentar</button></div>}
        {!loadingMode && !modeError && demoVerification && <div className="notice notice--info" role="status">Modo de prueba · no necesitas recibir un correo.</div>}
        {!loadingMode && !modeError && (aviso || state?.recienCreada) && <div className="notice notice--ok" role="status">{aviso || (demoVerification ? 'Cuenta creada. Pulsa «Verificar correo» para activarla.' : `Cuenta creada. Enviamos un código de verificación a ${state.correo}.`)}</div>}
        <div className="field">
          <label htmlFor="v-correo">Correo</label>
          <input id="v-correo" className="input" type="email" autoComplete="email" value={correo} disabled={enviando} onChange={(e) => { setCorreo(e.target.value); setError(''); setAviso('') }} />
        </div>
        {!loadingMode && !modeError && !demoVerification && <CampoCodigo id="v-codigo" value={codigo} onChange={setCodigo} />}
        {error && <div className="notice notice--peligro" role="alert">{error}</div>}
        <button className="btn btn--primary" disabled={enviando || loadingMode || !!modeError}>{enviando ? 'Verificando…' : 'Verificar correo'}</button>
        {!loadingMode && !modeError && !demoVerification && <button type="button" className="btn btn--secondary" onClick={reenviar} disabled={espera > 0 || enviando}>
          {espera > 0 ? `Pedir otro código en ${espera} s` : 'Enviarme otro código'}
        </button>}
      </form>
      {USE_MOCK && !demoVerification && <div className="notice notice--info"><span>Modo de prueba: el código es <b className="mono">123456</b>.</span></div>}
    </AuthShell>
  )
}

export function CampoCodigo({ id, value, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{USE_MOCK ? 'Código de 6 dígitos' : 'Código de verificación'}</label>
      <input
        id={id} className="input mono code-input" inputMode={USE_MOCK ? "numeric" : "text"} autoComplete="one-time-code" maxLength={USE_MOCK ? 6 : 43} placeholder={USE_MOCK ? "000000" : "Pega el código completo del correo"}
        value={value} onChange={(e) => onChange(USE_MOCK ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value.trim())}
      />
    </div>
  )
}
