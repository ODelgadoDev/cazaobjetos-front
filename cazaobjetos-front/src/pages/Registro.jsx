import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registrar } from '../lib/api.js'
import { DOMINIO, MIN_PASSWORD } from '../lib/constants.js'
import PasswordInput from '../components/PasswordInput.jsx'
import AuthShell, { VolverAlLogin } from '../components/AuthShell.jsx'

export default function Registro() {
  const navigate = useNavigate()
  const [f, setF] = useState({ nombre: '', correo: '', password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const correo = f.correo.trim().toLowerCase()
    if (f.nombre.trim().length < 3) return setError('Escribe tu nombre completo.')
    if (!correo.endsWith(DOMINIO)) return setError(`Usa tu correo institucional que termina en ${DOMINIO}.`)
    if (f.password.length < MIN_PASSWORD) return setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
    if (new TextEncoder().encode(f.password).length > 72) return setError('La contraseña admite hasta 72 bytes UTF-8.')
    if (f.password !== f.confirmar) return setError('Las contraseñas no coinciden.')
    setEnviando(true)
    try {
      await registrar({ nombre: f.nombre.trim(), correo, password: f.password })
      navigate('/verificar', { state: { correo, recienCreada: true } })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <AuthShell titulo="Crea tu cuenta" intro="Regístrate con tu correo institucional. Te enviaremos un código para confirmarlo." pie={<VolverAlLogin />}>
      <form className="card" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="r-nombre">Nombre completo</label>
          <input id="r-nombre" className="input" autoComplete="name" value={f.nombre} onChange={set('nombre')} />
        </div>
        <div className="field">
          <label htmlFor="r-correo">Correo institucional</label>
          <input id="r-correo" className="input" type="email" autoComplete="email" placeholder={`matricula${DOMINIO}`} value={f.correo} onChange={set('correo')} />
        </div>
        <div className="field">
          <label htmlFor="r-pass">Contraseña</label>
          <PasswordInput id="r-pass" className="input" autoComplete="new-password" value={f.password} onChange={set('password')} aria-describedby="r-pass-ayuda" />
          <span id="r-pass-ayuda" className="help">MÍN. {MIN_PASSWORD} CARACTERES</span>
        </div>
        <div className="field">
          <label htmlFor="r-conf">Confirma la contraseña</label>
          <PasswordInput id="r-conf" className="input" visibilityLabel="confirmación de contraseña" autoComplete="new-password" value={f.confirmar} onChange={set('confirmar')} />
        </div>
        {error && <div className="notice notice--peligro" role="alert">{error}</div>}
        <button className="btn btn--primary" disabled={enviando}>{enviando ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>
    </AuthShell>
  )
}
