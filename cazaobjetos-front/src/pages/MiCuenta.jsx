import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cambiarPassword, getPerfil } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { Chip } from '../components/Chip.jsx'
import { IconArrowRight, IconBox, IconLock, IconUser } from '../components/Icons.jsx'
import { MIN_PASSWORD, ROLES } from '../lib/constants.js'

function CambiarPassword() {
  const toast = useToast()
  const [f, setF] = useState({ actual: '', nueva: '', confirmar: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!f.actual) return setError('Escribe tu contraseña actual.')
    if (f.nueva.length < MIN_PASSWORD) return setError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
    if (new TextEncoder().encode(f.nueva).length > 72) return setError('La contraseña admite hasta 72 bytes UTF-8.')
    if (f.nueva === f.actual) return setError('La nueva contraseña debe ser distinta de la actual.')
    if (f.nueva !== f.confirmar) return setError('Las contraseñas nuevas no coinciden.')
    setEnviando(true)
    try {
      await cambiarPassword({ actual: f.actual, nueva: f.nueva })
      setF({ actual: '', nueva: '', confirmar: '' })
      toast('Contraseña actualizada.')
    } catch (err) { setError(err.message) } finally { setEnviando(false) }
  }

  return (
    <form className="card" onSubmit={guardar} noValidate>
      <h2 className="section-title"><IconLock width={20} height={20} /> Cambiar contraseña</h2>
      <div className="field">
        <label htmlFor="c-actual">Contraseña actual</label>
        <input id="c-actual" className="input" type="password" autoComplete="current-password" value={f.actual} onChange={set('actual')} />
      </div>
      <div className="field">
        <label htmlFor="c-nueva">Nueva contraseña</label>
        <input id="c-nueva" className="input" type="password" autoComplete="new-password" value={f.nueva} onChange={set('nueva')} />
        <span className="help">MÍN. {MIN_PASSWORD} CARACTERES</span>
      </div>
      <div className="field">
        <label htmlFor="c-conf">Confirma la nueva contraseña</label>
        <input id="c-conf" className="input" type="password" autoComplete="new-password" value={f.confirmar} onChange={set('confirmar')} />
      </div>
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      <button className="btn btn--primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar contraseña'}</button>
    </form>
  )
}

export default function MiCuenta() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(usuario)
  const [error, setError] = useState('')

  useEffect(() => { getPerfil().then(setPerfil).catch((e) => setError(e.message)) }, [])

  return (
    <>
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
      <section className="card">
        <div className="perfil">
          <span className="avatar avatar--lg"><IconUser width={28} height={28} /></span>
          <div>
            <h3>{perfil.nombre}</h3>
            <Chip tipo="info">{ROLES[perfil.rol] ?? perfil.rol}</Chip>
          </div>
        </div>
        <div className="metabox">
          <div><span className="k">CORREO</span> {perfil.correo}</div>
          {perfil.matricula && <div><span className="k">MATRÍCULA</span> {perfil.matricula}</div>}
          {perfil.carrera && <div><span className="k">CARRERA</span> {perfil.carrera}</div>}
        </div>
      </section>

      <Link to="/publicaciones" className="btn btn--secondary">
        <IconBox width={18} height={18} /> Mis publicaciones <IconArrowRight width={18} height={18} />
      </Link>

      <CambiarPassword />

      <button className="btn btn--link-danger" onClick={() => { if (window.confirm('¿Quieres cerrar sesión?')) { navigate('/', { replace: true }); logout() } }}>Cerrar sesión</button>
    </>
  )
}
