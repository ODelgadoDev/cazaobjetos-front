import { Link } from 'react-router-dom'
import AppearanceControl from './AppearanceControl.jsx'
import InstitutionBrand from './InstitutionBrand.jsx'
import InstallApp from './InstallApp.jsx'
import { IconArrowRight, IconBox, IconSearch } from './Icons.jsx'

export default function AuthShell({ titulo, intro, children, pie, conInstalar = false }) {
  return (
    <div className="app app--login">
      <div className="auth-layout">
        <aside className="auth-brand" aria-label="CazaObjetos UTCH">
          <Link to="/" className="auth-brand__identity"><InstitutionBrand /></Link>
          <div className="auth-brand__message">
            <span className="auth-brand__eyebrow">COMUNIDAD UTCH</span>
            <h2>Lo que perdiste puede estar más cerca de lo que crees.</h2>
            <p>Un lugar para encontrar tus cosas y ayudar a que otros recuperen las suyas.</p>
            <div className="auth-brand__flow"><span><IconSearch /> Busca</span><IconArrowRight /><span><IconBox /> Recupera</span></div>
          </div>
          <p className="auth-brand__footer">Universidad Tecnológica de Chihuahua</p>
        </aside>
        <main className="login">
          <div className="login__heading">
            <div className="login__identity"><InstitutionBrand /></div>
            <h1>{titulo}</h1>
            {intro && <p className="muted">{intro}</p>}
          </div>
          {children}
          {pie}
          <div className="login__tools">{conInstalar && <InstallApp />}<AppearanceControl /></div>
        </main>
      </div>
    </div>
  )
}

export function VolverAlLogin() {
  return <p className="auth-links"><Link to="/">Volver a iniciar sesión</Link></p>
}
