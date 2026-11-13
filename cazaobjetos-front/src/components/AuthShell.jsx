import { Link } from 'react-router-dom'
import InstallApp from './InstallApp.jsx'

/** Marco común de las pantallas sin sesión: iniciar sesión, crear cuenta, verificar y recuperar. */
export default function AuthShell({ titulo, intro, children, pie, conInstalar = false }) {
  return (
    <div className="app app--login">
      <div className="login">
        <div>
          <img className="login__logo" src="/utch-logo.png" alt="Universidad Tecnológica de Chihuahua" />
          <h1>{titulo}</h1>
          {intro && <p className="muted">{intro}</p>}
          {conInstalar && <InstallApp />}
        </div>
        {children}
        {pie}
      </div>
    </div>
  )
}

export function VolverAlLogin() {
  return <p className="auth-links"><Link to="/">Volver a iniciar sesión</Link></p>
}
