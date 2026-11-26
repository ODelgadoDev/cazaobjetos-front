import FormHelp from '../components/FormHelp.jsx'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cambiarPassword, getPerfil, guardarPerfil } from '../lib/api.js'
import { PROFILE_FIELDS, normalizedProfile, profileError, profileForm } from '../lib/profile.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { Chip } from '../components/Chip.jsx'
import LogoutButton from '../components/LogoutButton.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import ProfilePhotoEditor from '../components/ProfilePhotoEditor.jsx'
import { IconArrowRight, IconBox, IconLock, IconUser } from '../components/Icons.jsx'
import { MIN_PASSWORD, ROLES } from '../lib/constants.js'

function CambiarPassword({ disabled, onBusy }) {
  const toast = useToast()
  const [f, setF] = useState({ actual: '', nueva: '', confirmar: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function guardar(e) {
    e.preventDefault()
    if (enviando || disabled) return
    setError('')
    if (!f.actual) return setError('Escribe tu contraseña actual.')
    if (f.nueva.length < MIN_PASSWORD) return setError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
    if (new TextEncoder().encode(f.nueva).length > 72) return setError('La contraseña admite hasta 72 bytes UTF-8.')
    if (f.nueva === f.actual) return setError('La nueva contraseña debe ser distinta de la actual.')
    if (f.nueva !== f.confirmar) return setError('Las contraseñas nuevas no coinciden.')
    setEnviando(true); onBusy(true)
    try {
      await cambiarPassword({ actual: f.actual, nueva: f.nueva })
      setF({ actual: '', nueva: '', confirmar: '' })
      toast('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')
    } catch (err) { setError(err.message) }
    finally { setEnviando(false); onBusy(false) }
  }

  return (
    <form className="account-password" onSubmit={guardar} noValidate>
      <FormHelp title="Cómo cambiar tu contraseña">Escribe tu contraseña actual y confirma la nueva. Al guardar, vuelve a iniciar sesión con la nueva contraseña.</FormHelp>
      <p className="account-help">Al guardar, se cerrarán tus sesiones y podrás entrar con la nueva contraseña.</p>
      <div className="field">
        <label htmlFor="c-actual">Contraseña actual</label>
        <PasswordInput id="c-actual" className="input" visibilityLabel="contraseña actual" autoComplete="current-password" value={f.actual} onChange={set('actual')} disabled={disabled} />
      </div>
      <div className="account-fields">
        <div className="field">
          <label htmlFor="c-nueva">Nueva contraseña</label>
          <PasswordInput id="c-nueva" className="input" visibilityLabel="nueva contraseña" autoComplete="new-password" value={f.nueva} onChange={set('nueva')} disabled={disabled} aria-describedby="c-ayuda" />
          <span id="c-ayuda" className="help">MÍN. {MIN_PASSWORD} CARACTERES</span>
        </div>
        <div className="field">
          <label htmlFor="c-conf">Confirma la nueva contraseña</label>
          <PasswordInput id="c-conf" className="input" visibilityLabel="confirmación de contraseña" autoComplete="new-password" value={f.confirmar} onChange={set('confirmar')} disabled={disabled} />
        </div>
      </div>
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      <button className="btn btn--primary" disabled={disabled}>{enviando ? 'Guardando…' : 'Guardar contraseña'}</button>
    </form>
  )
}

function DatosPerfil({ perfil, disabled, onSaved, onBusy }) {
  const baseline = JSON.stringify(profileForm(perfil))
  const [form, setForm] = useState(() => profileForm(perfil))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(form) !== baseline
  useEffect(() => { setForm(JSON.parse(baseline)) }, [baseline])

  async function save(event) {
    event.preventDefault()
    if (disabled || saving || !dirty) return
    const problem = profileError(form)
    setError(problem)
    if (problem) return
    setSaving(true); onBusy(true)
    try {
      const updated = await guardarPerfil(normalizedProfile(form))
      setForm(profileForm(updated))
      onSaved(updated, 'Tu perfil se guardó correctamente.')
    } catch (e) { setError(e.message) }
    finally { setSaving(false); onBusy(false) }
  }
  function field({ name, label, max, placeholder, required, autoComplete }) {
    return (
      <div className={`field${name === 'carrera' ? ' account-field--wide' : ''}`} key={name}>
        <label htmlFor={`perfil-${name}`}>{label}{!required && <span className="account-optional">Opcional</span>}</label>
        <input id={`perfil-${name}`} name={name} className="input" value={form[name]} maxLength={max} placeholder={placeholder} autoComplete={autoComplete || 'off'} required={required} minLength={name === 'nombre' ? 3 : undefined}
          onChange={(e) => { setForm((old) => ({ ...old, [name]: e.target.value })); setError('') }} />
      </div>
    )
  }
  return (
    <form className="card account-form" onSubmit={save} noValidate aria-label="Editar perfil">
      <FormHelp title="Cómo actualizar tu perfil">Edita los datos que quieras corregir y pulsa «Guardar cambios». Tu nombre y carrera o área ayudan a identificar tus publicaciones y comentarios.</FormHelp>
      <fieldset className="account-section" disabled={disabled}>
        <legend className="account-section__title"><IconUser width={20} height={20} /> Tus datos</legend>
        <p className="account-help">Tu nombre identifica tu cuenta. El alias es una forma adicional de presentarte.</p>
        <div className="account-fields">{PROFILE_FIELDS.slice(0, 2).map(field)}</div>
      </fieldset>
      <fieldset className="account-section account-section--academic" disabled={disabled}>
        <legend className="account-section__title">Información académica</legend>
        <p className="account-help">Tu carrera o área es obligatoria. El edificio y los demás datos son opcionales.</p>
        <div className="account-fields">{PROFILE_FIELDS.slice(2).map(field)}</div>
      </fieldset>
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      <div className="account-savebar">
        <span className="account-help" role="status">{dirty ? 'Tienes cambios sin guardar.' : 'Tus datos están guardados.'}</span>
        <div className="account-savebar__buttons">
          <button type="button" className="btn btn--secondary" disabled={disabled || !dirty} onClick={() => { setForm(profileForm(perfil)); setError('') }}>Cancelar cambios</button>
          <button className="btn btn--primary" disabled={disabled || !dirty}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </div>
    </form>
  )
}

export default function MiCuenta() {
  const { usuario, actualizarPerfil } = useAuth()
  const toast = useToast()
  const [perfil, setPerfil] = useState(usuario)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [intento, setIntento] = useState(0)
  const update = useCallback((datos, mensaje) => {
    setPerfil(datos); actualizarPerfil(datos)
    if (mensaje) toast(mensaje)
  }, [actualizarPerfil, toast])

  useEffect(() => {
    let activo = true
    setCargando(true); setError('')
    getPerfil()
      .then((datos) => { if (activo) update(datos) })
      .catch(() => { if (activo) setError('No pudimos actualizar tu perfil. Se muestran los datos de tu sesión. Comprueba la conexión y vuelve a intentarlo.') })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [intento, update])
  const disabled = cargando || ocupado || !!error

  return (
    <div className="account-page">
      {error && <div className="notice notice--peligro" role="alert"><span className="grow">{error}</span><button type="button" className="btn btn--secondary" onClick={() => setIntento((v) => v + 1)}>Reintentar</button></div>}
      {cargando && <p className="help" role="status">Actualizando perfil…</p>}
      <section className="card account-summary" aria-busy={cargando} aria-label="Resumen de tu cuenta">
        <div className="account-summary__heading">
          <p className="account-eyebrow">TU ESPACIO EN CAZAOBJETOS</p>
          <h2>{perfil.nombre}</h2>
          <div className="account-summary__tags"><Chip tipo="info">{perfil.rol === 'estudiante' && !perfil.matricula ? 'Comunidad UTCH' : ROLES[perfil.rol] ?? perfil.rol}</Chip>{perfil.alias && <span className="account-alias">Alias: {perfil.alias}</span>}</div>
        </div>
        <ProfilePhotoEditor perfil={perfil} disabled={disabled} onSaved={update} onBusy={setOcupado} />
        <dl className="account-identifiers">
          <div><dt>Correo institucional</dt><dd>{perfil.correo}</dd></div>
          <div><dt>Matrícula</dt><dd className="mono">{perfil.matricula || (perfil.rol === 'estudiante' ? 'El correo no incluye matrícula' : 'No aplica a esta cuenta')}</dd></div>
        </dl>
        <p className="account-help">El correo y la matrícula se obtienen de tu cuenta y no se editan aquí.</p>
      </section>
      <DatosPerfil perfil={perfil} disabled={disabled} onSaved={update} onBusy={setOcupado} />
      <Link to="/publicaciones" className="btn btn--secondary account-publications"><IconBox width={18} height={18} /> Mis publicaciones <IconArrowRight width={18} height={18} /></Link>
      <details className="card account-security">
        <summary><IconLock width={20} height={20} /><span>Contraseña y acceso<small>Cambiar tu contraseña</small></span></summary>
        <CambiarPassword disabled={disabled} onBusy={setOcupado} />
      </details>
      <LogoutButton disabled={ocupado} />
    </div>
  )
}
