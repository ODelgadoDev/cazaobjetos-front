import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useRegistrationOptions from '../lib/useRegistrationOptions.js'
import { registrar } from '../lib/api.js'
import ChoiceField from '../components/ChoiceField.jsx'
import FormHelp from '../components/FormHelp.jsx'
import { emailFromStudentNumber, institutionalEmail, profileError } from '../lib/profile.js'
import { DOMINIO, MIN_PASSWORD } from '../lib/constants.js'
import PasswordInput from '../components/PasswordInput.jsx'
import AuthShell, { VolverAlLogin } from '../components/AuthShell.jsx'

export default function Registro() {
  const navigate = useNavigate()
  const { demoVerification, loading: loadingMode, error: modeError, retry: retryMode } = useRegistrationOptions()
  const [f, setF] = useState({ nombre: '', correo: '', carrera: '', matricula: '', password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conMatricula, setConMatricula] = useState('si')
  const correo = conMatricula === 'si' ? emailFromStudentNumber(f.matricula) : institutionalEmail(f.correo)
  const set = (k) => (e) => {
    const value = e.target.value
    setF((current) => ({ ...current, [k]: value }))
    setError('')
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (enviando || loadingMode || modeError) return
    setError('')
    if (f.nombre.trim().length < 3) return setError('Escribe tu nombre completo.')
    if (!correo) return setError(conMatricula === 'si'
      ? 'Escribe los 10 dígitos de tu matrícula.'
      : `Escribe un correo institucional que termine en ${DOMINIO}.`)
    const profileProblem = profileError({ nombre: f.nombre, carrera: f.carrera })
    if (profileProblem) return setError(profileProblem)
    if (f.password.length < MIN_PASSWORD) return setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
    if (new TextEncoder().encode(f.password).length > 72) return setError('La contraseña admite hasta 72 bytes UTF-8.')
    if (f.password !== f.confirmar) return setError('Las contraseñas no coinciden.')
    setEnviando(true)
    try {
      await registrar({ nombre: f.nombre.trim(), correo, password: f.password, carrera: f.carrera.trim() })
      navigate('/verificar', { state: { correo, recienCreada: true } })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <AuthShell titulo="Crea tu cuenta" intro={demoVerification ? "Completa tus datos para crear tu cuenta de prueba." : loadingMode ? "Regístrate con tu correo institucional." : "Regístrate con tu correo institucional. Te enviaremos un código para confirmarlo."} pie={<VolverAlLogin />}>
      <form className="card" onSubmit={onSubmit} noValidate>
        <FormHelp title="Cómo crear tu cuenta">
          Completa tus datos, elige una contraseña y activa tu cuenta en la pantalla siguiente para poder iniciar sesión.
        </FormHelp>
        {modeError && <div className="notice notice--peligro" role="alert"><span>{modeError}</span><button type="button" className="btn btn--secondary" onClick={retryMode}>Reintentar</button></div>}
        <div className="field">
          <label htmlFor="r-nombre">Nombre completo</label>
          <input id="r-nombre" className="input" autoComplete="name" required minLength={3} maxLength={120} disabled={enviando} value={f.nombre} onChange={set('nombre')} />
        </div>
        <ChoiceField label="¿Tienes matrícula?" options={[['si', 'Sí'], ['no', 'No']]}
          value={conMatricula} onChange={(value) => { setConMatricula(value); setError('') }} disabled={enviando} />
        <FormHelp title="Ayuda con la matrícula">
          Escribe los 10 dígitos de tu matrícula para generar tu correo. Si eres docente o personal y no tienes matrícula, elige «No» y escribe tu correo institucional.
        </FormHelp>
        {conMatricula === 'si' ? <>
          <div className="field">
            <label htmlFor="r-matricula">Matrícula</label>
            <input id="r-matricula" className="input mono" inputMode="numeric" pattern="[0-9]{10}" required maxLength={10}
              placeholder="1234567890" value={f.matricula} onChange={(e) => {
                setF((current) => ({ ...current, matricula: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                setError('')
              }} disabled={enviando} />
          </div>
          <div className="field">
            <label htmlFor="r-correo-generado">Correo institucional</label>
            <input id="r-correo-generado" className="input" value={correo} placeholder="Se completa con tu matrícula" readOnly />
          </div>
        </> : <div className="field">
          <label htmlFor="r-correo">Correo institucional</label>
          <input id="r-correo" className="input" type="email" autoComplete="email" placeholder={`nombre${DOMINIO}`}
            required maxLength={254} disabled={enviando} value={f.correo} onChange={set('correo')} />
        </div>}
        <div className="field">
          <label htmlFor="r-carrera">{conMatricula === 'si' ? 'Carrera' : 'Carrera o área'}</label>
          <input id="r-carrera" className="input" value={f.carrera} onChange={set('carrera')} required maxLength={160} disabled={enviando} />
        </div>
        <div className="field">
          <label htmlFor="r-pass">Contraseña</label>
          <PasswordInput id="r-pass" className="input" autoComplete="new-password" required disabled={enviando} value={f.password} onChange={set('password')} aria-describedby="r-pass-ayuda" />
          <span id="r-pass-ayuda" className="help">MÍN. {MIN_PASSWORD} CARACTERES</span>
        </div>
        <div className="field">
          <label htmlFor="r-conf">Confirma la contraseña</label>
          <PasswordInput id="r-conf" className="input" visibilityLabel="confirmación de contraseña" autoComplete="new-password" required disabled={enviando} value={f.confirmar} onChange={set('confirmar')} />
        </div>
        {error && <div className="notice notice--peligro" role="alert">{error}</div>}
        <button className="btn btn--primary" disabled={enviando || loadingMode || !!modeError}>{enviando ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>
    </AuthShell>
  )
}
