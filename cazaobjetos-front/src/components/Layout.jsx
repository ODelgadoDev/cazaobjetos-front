import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useNotifications } from '../context/NotificationContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useOnline } from '../lib/pwa.js'
import AppearanceControl from './AppearanceControl.jsx'
import InstitutionBrand from './InstitutionBrand.jsx'
import LogoutButton from './LogoutButton.jsx'
import UserAvatar from './UserAvatar.jsx'
import InstallApp from './InstallApp.jsx'
import WelcomeGuide from './WelcomeGuide.jsx'
import { IconBell, IconBack, IconBox, IconClipboard, IconGrid, IconPlus, IconSearch, IconShield } from './Icons.jsx'

const TITULOS = {
  '/': 'Buscar objetos',
  '/reportar': 'Publicar',
  '/reclamos': 'Solicitudes',
  '/publicaciones': 'Mis publicaciones',
  '/cuenta': 'Mi cuenta',
  '/notificaciones': 'Notificaciones',
  '/vigilancia': 'Admin Vig',
}
// Pantallas de detalle: muestran botón «Volver» en lugar de la marca
const DETALLES = [
  [/^\/reclamo\/[^/]+$/, 'Detalle del hallazgo'],
  [/^\/reclamos\/[^/]+$/, 'Seguimiento'],
  [/^\/extravio\/[^/]+$/, 'Extravío'],
  [/^\/extravio\/[^/]+\/responder$/, 'Lo encontré'],
  [/^\/editar\/[^/]+\/[^/]+$/, 'Editar publicación'],
  [/^\/cuenta$/, 'Mi cuenta'],
]

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { usuario, esStaff } = useAuth()
  const online = useOnline()
  const { unread, refresh } = useNotifications()
  useEffect(() => { refresh(); window.scrollTo(0, 0) }, [pathname, refresh])
  const detalle = DETALLES.find(([re]) => re.test(pathname))
  const enReclamo = !!detalle
  const titulo = detalle ? detalle[1] : TITULOS[pathname] || 'CazaObjetos'

  const items = [
    { to: '/', label: 'Buscar objetos', icon: <IconGrid />, end: true },
    { to: '/reportar', label: 'Publicar', icon: <IconPlus /> },
    { to: '/reclamos', label: 'Solicitudes', icon: <IconClipboard /> },
    { to: '/publicaciones', label: 'Mis publicaciones', title: 'Mis publicaciones', icon: <IconBox /> },
    ...(esStaff ? [{ to: '/vigilancia', label: 'Admin/Vig', icon: <IconShield /> }] : []),
  ]

  return (
    <div className="app app--shell">
      {usuario && <WelcomeGuide key={usuario.id} userId={usuario.id} />}
      <header className="topbar">
        {enReclamo && (
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
            <IconBack />
          </button>
        )}
        <div className="topbar__main">
          {!enReclamo && (
            <Link to="/" aria-label="Ir a Buscar objetos" title="Buscar objetos"><InstitutionBrand /></Link>
          )}
          <h1 className="topbar__title">{titulo}</h1>
        </div>
        {enReclamo && <Link to="/" className="topbar__institution" aria-label="Ir a Buscar objetos" title="Buscar objetos"><InstitutionBrand compact /></Link>}
        <div className="topbar__actions">
        <InstallApp compact />
        <AppearanceControl compact />
        <button type="button" className={`icon-btn notification-bell${pathname === '/notificaciones' ? ' notification-bell--active' : ''}`} aria-label={`Notificaciones${unread ? `, ${unread} pendientes` : ''}`} title="Notificaciones" aria-current={pathname === '/notificaciones' ? 'page' : undefined} onClick={() => navigate('/notificaciones')}>
          <IconBell />{unread > 0 && <span className="notification-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
        </button>
        {!enReclamo && (
          <button className="icon-btn topbar__search" aria-label="Buscar" onClick={() => navigate('/')}>
            <IconSearch />
          </button>
        )}
        <button
          className={`avatar${pathname === '/cuenta' ? ' avatar--active' : ''}`}
          aria-current={pathname === '/cuenta' ? 'page' : undefined}
          aria-label={`Mi cuenta (${usuario?.nombre ?? ''})`}
          title="Mi cuenta"
          onClick={() => navigate('/cuenta')}
        >
          <UserAvatar user={usuario} />
        </button>
        </div>
      </header>

      <main className="screen">
        {!online && (
          <div className="notice notice--pend" role="status">
            Sin conexión. Verás lo último que cargaste, pero no podrás enviar ni revisar solicitudes hasta reconectarte.
          </div>
        )}
        <Outlet />
      </main>

      <nav className="bottomnav" aria-label="Navegación principal" style={{ '--nav-items': items.length }}>
        <div className="nav-links">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} title={it.title} aria-label={(it.title || it.label) + (it.to === '/reclamos' && unread ? `, ${unread} notificaciones pendientes` : '')} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="pill">{it.icon}{it.to === '/reclamos' && unread > 0 && <span className="notification-badge notification-badge--nav" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}</span>
            {it.title ? <><span className="nav-label--short">{it.label}</span><span className="nav-label--full">{it.title}</span></> : it.label}
          </NavLink>
        ))}
        </div>
        <div className="nav-account">
          <NavLink to="/cuenta" className={({ isActive }) => isActive ? 'nav-account__link active' : 'nav-account__link'}>
            <span className="avatar nav-account__avatar"><UserAvatar user={usuario} /></span>
            <span>Mi cuenta</span>
          </NavLink>
          <LogoutButton inNavigation />
        </div>
      </nav>
    </div>
  )
}
