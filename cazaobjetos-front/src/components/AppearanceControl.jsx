import { useId, useState } from 'react'
import { useTheme } from '../context/ThemeContext.jsx'
import Modal from './Modal.jsx'
import { IconMoon, IconSun, IconMonitor } from './Icons.jsx'

const modes = [
  { value: 'auto', label: 'Automático', text: 'Sigue el tema de tu dispositivo.', Icon: IconMonitor },
  { value: 'light', label: 'Claro', text: 'Fondos claros y colores de la UTCH.', Icon: IconSun },
  { value: 'dark', label: 'Oscuro', text: 'Fondos oscuros para la noche.', Icon: IconMoon },
]
export default function AppearanceControl({ compact = false }) {
  const { preference, resolved, choose } = useTheme()
  const [open, setOpen] = useState(false)
  const group = useId()
  const Icon = resolved === 'dark' ? IconMoon : IconSun
  return (
    <>
      <button type="button" className={`appearance-button${compact ? ' appearance-button--compact' : ''}`} aria-label="Apariencia" title={`Apariencia: ${modes.find((mode) => mode.value === preference).label}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Icon width={20} height={20} />{!compact && <span>Apariencia</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Apariencia">
        <p className="account-help">Elige cómo quieres ver CazaObjetos. Se guardará en este dispositivo.</p>
        <fieldset className="theme-options"><legend className="sr-only">Tema de la aplicación</legend>
          {modes.map(({ value, label, text, Icon }) => (
            <label key={value} className={`theme-option${value === preference ? ' is-selected' : ''}`}>
              <Icon width={24} height={24} /><span><strong>{label}</strong><small>{text}</small></span>
              <input type="radio" name={group} value={value} checked={preference === value} onChange={() => choose(value)} />
            </label>
          ))}
        </fieldset>
        <button type="button" className="btn btn--primary" onClick={() => setOpen(false)}>Listo</button>
      </Modal>
    </>
  )
}
