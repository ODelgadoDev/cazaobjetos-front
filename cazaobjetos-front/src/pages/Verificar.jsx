import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { USE_MOCK, reenviarCodigo, verificarCorreo } from '../lib/api.js'
import { DOMINIO } from '../lib/constants.js'
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
  const [correo, setCorreo] = useState(state?.correo ?? '')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState(state?.recienCreada ? `Cuenta creada. Enviamos un código de 6 dígitos a ${state.correo}.` : '')
  const [enviando, setEnviando] = useState(false)
  const [espera, iniciarEspera] = useCuentaAtras()

  useEffect(() => { if (state?.recienCreada) iniciarEspera() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const correoOk = correo.trim().toLowerCase().endsWith(DOMINIO)

  async function verificar(e) {
    e.preventDefault()
    setError('')
    if (!correoOk) return setError(`Escribe tu correo institucional ${DOMINIO}.`)
    if (!/^\d{6}$/.test(codigo)) return setError('El código tiene 6 dígitos.')
    setEnviando(true)
    try {
      await verificarCorreo(correo.trim().toLowerCase(), codigo)
      navigate('/', { replace: true, state: { correo: correo.trim().toLowerCase(), aviso: 'Correo verificado. Ya puedes iniciar sesión.' } })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  async function reenviar() {
    setError('')
    setAviso('')
    if (!correoOk) return setError(`Escribe tu correo institucional ${DOMINIO} para enviarte otro código.`)
    try {
      await reenviarCodigo(correo.trim().toLowerCase())
      setAviso('Te enviamos un código nuevo. Revisa también la carpeta de spam.')
      iniciarEspera()
    } catch (err) { setError(err.message) }
  }

  return (
    <AuthShell titulo="Verifica tu correo" intro="Ingresa el código que recibiste en tu correo institucional para activar tu cuenta." pie={<VolverAlLogin />}>
      <form className="card" onSubmit={verificar} noValidate>
        {aviso && <div className="notice notice--ok" role="status">{aviso}</div>}
        <div className="field">
          <label htmlFor="v-correo">Correo institucional</label>
          <input id="v-correo" className="input" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        <CampoCodigo id="v-codigo" value={codigo} onChange={setCodigo} />
        {error && <div className="notice notice--peligro" role="alert">{error}</div>}
        <button className="btn btn--primary" disabled={enviando}>{enviando ? 'Verificando…' : 'Verificar correo'}</button>
        <button type="button" className="btn btn--secondary" onClick={reenviar} disabled={espera > 0}>
          {espera > 0 ? `Pedir otro código en ${espera} s` : 'Enviarme otro código'}
        </button>
      </form>
      {USE_MOCK && <div className="notice notice--info"><span>Modo de prueba: el código es <b className="mono">123456</b>.</span></div>}
    </AuthShell>
  )
}

export function CampoCodigo({ id, value, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>Código de 6 dígitos</label>
      <input
        id={id} className="input mono code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
        value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
    </div>
  )
}
