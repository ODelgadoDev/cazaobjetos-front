import { useInstall } from '../lib/pwa.js'
import { IconDownload } from './Icons.jsx'
import Modal from './Modal.jsx'

function instruccionesInstalacion() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) return ['Abre CazaObjetos en Safari.', 'Toca Compartir y elige «Agregar a pantalla de inicio».']
  if (/Android/i.test(navigator.userAgent)) return ['Abre CazaObjetos en Chrome.', 'Toca el menú ⋮ y elige «Instalar aplicación» o «Agregar a pantalla principal».']
  return ['Abre el menú de Chrome o Edge.', 'Elige «Instalar CazaObjetos UTCH». También puede aparecer un icono de instalación en la barra de direcciones.']
}

export default function InstallApp({ compact = false }) {
  const { instalada, instalando, mostrarAyuda, cerrarAyuda, instalar } = useInstall()
  if (instalada) return null
  return (
    <div className={`install-control${compact ? ' install-control--compact' : ''}`}>
      <button type="button" className={compact ? 'install-btn' : 'install-action'} onClick={instalar} disabled={instalando} aria-label="Instalar CazaObjetos" title="Instalar CazaObjetos" aria-haspopup="dialog">
        <IconDownload width={19} height={19} /><span className="install-btn__txt">{instalando ? 'Abriendo…' : 'Instalar app'}</span>
      </button>
      <Modal open={mostrarAyuda} onClose={cerrarAyuda} title="Instala CazaObjetos">
        <p className="account-help">Ten la app a la mano, con su propio acceso en tu dispositivo.</p>
        <ol className="install-steps">{instruccionesInstalacion().map((paso) => <li key={paso}>{paso}</li>)}</ol>
        <p className="account-help">Si ya la instalaste, puedes abrirla desde las aplicaciones de tu dispositivo o navegador.</p>
        {!window.isSecureContext && <p className="help">Para instalar, abre la app con una conexión segura (HTTPS).</p>}
        <button type="button" className="btn btn--primary" onClick={cerrarAyuda}>Entendido</button>
      </Modal>
    </div>
  )
}
