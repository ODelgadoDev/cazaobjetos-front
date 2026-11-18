import { Link } from 'react-router-dom'
import { usePush } from '../context/PushContext.jsx'
import { useToast } from './Toast.jsx'
import { IconBell } from './Icons.jsx'
export function PushInvitation() {
  const push = usePush()
  if (!push.installed || push.dismissed || push.device || push.loading || !push.supported || !push.config?.enabled || push.permission === 'denied') return null
  return <aside className="notice notice--info push-invitation"><IconBell width={22} height={22} /><div><strong>Recibe las novedades en tu dispositivo</strong><p>Activa los avisos para enterarte aunque la app esté cerrada. Tú eliges los recordatorios.</p><div className="btn-row"><button type="button" className="btn btn--primary" disabled={push.busy} onClick={push.enable}>Activar notificaciones</button><button type="button" className="btn btn--secondary" onClick={push.dismiss}>Ahora no</button><Link className="link-green" to="/notificaciones">Ver opciones</Link></div>{push.error && <p role="alert">{push.error}</p>}</div></aside>
}
export default function DeviceNotifications() {
  const push = usePush()
  const toast = useToast()
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return <details className="card device-notifications" aria-label="Notificaciones del dispositivo">
    <summary className="push-options-summary"><span><IconBell width={20} height={20} /> Avisos en este dispositivo</span><span className={`chip ${push.device ? 'chip--ok' : 'chip--cat'}`}>{push.loading ? 'Preparando…' : push.device ? 'Activadas' : push.permission === 'denied' ? 'Bloqueadas' : 'Configurar'}</span></summary>
    <div className="device-notifications__body">
    <p>Recibe novedades de tus publicaciones y reclamos aunque cierres la app. El permiso es opcional: tus avisos internos siguen disponibles.</p>
    {push.loading ? <p className="muted">Preparando opciones…</p> : !push.supported ? <p className="notice notice--info">{ios ? 'Agrega CazaObjetos a la pantalla de inicio y ábrelo desde su icono para activar las notificaciones.' : 'Para activar avisos necesitas un navegador compatible y una conexión segura. Puedes seguir usando la estación de notificaciones.'}</p> : !push.config?.enabled ? <p className="notice notice--info">Los avisos del dispositivo todavía no están habilitados en esta instalación.</p> : push.permission === 'denied' ? <p className="notice notice--pend">El navegador bloqueó los avisos. Para habilitarlos, cambia el permiso de notificaciones de este sitio y vuelve a la app.</p> : push.device ? <div className="notice notice--ok">Notificaciones activas en este dispositivo.</div> : <p className="muted">Todavía no están activadas en este dispositivo.</p>}
    {push.error && <div className="notice notice--peligro" role="alert">{push.error}</div>}
    {push.supported && push.config?.enabled && <div className="btn-row">
      {push.device ? <><button type="button" className="btn btn--secondary" disabled={push.busy} onClick={async () => { if (await push.test()) toast('Prueba programada. Revisa las notificaciones del dispositivo.') }}>Probar notificación</button><button type="button" className="btn btn--secondary" disabled={push.busy} onClick={push.disable}>Desactivar en este dispositivo</button></> : push.permission !== 'denied' && <button type="button" className="btn btn--primary" disabled={push.busy || push.loading} onClick={push.enable}>{push.busy ? 'Activando…' : 'Activar notificaciones'}</button>}
    </div>}
    {push.preference && <div className="field"><label htmlFor="reminder-frequency">Recordatorios diarios</label><select id="reminder-frequency" className="select" value={push.preference.dailyReminders} disabled={push.busy} onChange={(event) => push.saveFrequency(event.target.value)}><option value={0}>Desactivados</option><option value={1}>Una vez al día</option><option value={2}>Dos veces al día</option></select><p className="account-help">{push.preference.dailyReminders === 0 ? 'Recordatorios desactivados. Esto no desactiva los avisos de novedades.' : <>A las {push.preference.firstHour}:00{push.preference.dailyReminders === 2 ? ` y ${push.preference.secondHour}:00` : ''}, hora de Chihuahua. Se envían solo si tienes avisos pendientes, un reclamo en curso o un extravío activo y este dispositivo está habilitado.</>}</p></div>}
    <p className="account-help">Los avisos del sistema muestran un resumen. Las pruebas y comentarios privados se consultan dentro de la app. Cerrar sesión desactiva los avisos de esa cuenta en este dispositivo.</p>
    </div>
  </details>
}
