import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { IconLogout } from './Icons.jsx'

export default function LogoutButton({ inNavigation = false, disabled = false }) {
  const { logout, cerrandoSesion } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  async function salir() {
    setError('')
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      setError('No se pudo cerrar la sesión. Revisa tu conexión y vuelve a intentarlo.')
    }
  }
  return (
    <div className={`logout-control${inNavigation ? ' logout-control--nav' : ''}`}>
      <button type="button" className={inNavigation ? 'nav-logout' : 'btn btn--link-danger'} disabled={disabled || cerrandoSesion} onClick={salir}>
        <IconLogout width={20} height={20} /><span>{cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
      </button>
      {error && <p className="logout-error" role="alert">{error}</p>}
    </div>
  )
}
