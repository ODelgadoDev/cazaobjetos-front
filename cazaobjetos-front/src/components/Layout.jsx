import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useNotifications } from '../context/NotificationContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useOnline } from '../lib/pwa.js'
import { PushInvitation } from './DeviceNotifications.jsx'
import AppearanceControl from './AppearanceControl.jsx'
import InstitutionBrand from './InstitutionBrand.jsx'
import LogoutButton from './LogoutButton.jsx'
import UserAvatar from './UserAvatar.jsx'
import InstallApp from './InstallApp.jsx'
import { IconBell, IconBack, IconBox, IconClipboard, IconGrid, IconPlus, IconSearch, IconShield } from './Icons.jsx'

const TITULOS = {
  '/': 'Explorar',
  '/reportar': 'Reportar',
  '/reclamos': 'Mis reclamos',
  '/publicaciones': 'Mis publicaciones',
  '/cuenta': 'Mi cuenta',
  '/notificaciones': 'Notificaciones',
  '/vigilancia': 'Admin Vig',
}
// Pantallas de detalle: muestran botón «Volver» en lugar de la marca
const DETALLES = [
  [/^\/reclamo\/[^/]+$/, 'Detalle del hallazgo'],
  [/^\/reclamos\/[^/]+$/, 'Reclamo'],
  [/^\/extravio\/[^/]+$/, 'Objeto perdido'],
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
    { to: '/', label: 'Explorar', icon: <IconGrid />, end: true },
    { to: '/reportar', label: 'Reportar', icon: <IconPlus /> },
    { to: '/reclamos', label: 'Reclamos', icon: <IconClipboard /> },
    { to: '/publicaciones', label: 'Mis publicaciones', title: 'Mis publicaciones', icon: <IconBox /> },
    ...(esStaff ? [{ to: '/vigilancia', label: 'Admin/Vig', icon: <IconShield /> }] : []),
  ]

  return (
    <div className="app app--shell">
      <header className="topbar">
        {enReclamo && (
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
            <IconBack />
          </button>
        )}
        <div className="topbar__main">
          {!enReclamo && (
            <InstitutionBrand />
          )}
          <h1 className="topbar__title">{titulo}</h1>
        </div>
        {enReclamo && <span className="topbar__institution"><InstitutionBrand compact /></span>}
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
        {pathname !== '/notificaciones' && <PushInvitation />}
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
