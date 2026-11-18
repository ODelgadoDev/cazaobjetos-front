import { useState } from 'react'
import { IconEye, IconEyeOff } from './Icons.jsx'

export default function PasswordInput({ id, visibilityLabel = 'contraseña', ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const action = visible ? 'Ocultar' : 'Mostrar'

  return (
    <div className="password-input">
      <input
        {...inputProps}
        id={id}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="password-input__toggle"
        aria-label={`${action} ${visibilityLabel}`}
        disabled={inputProps.disabled}
        aria-controls={id}
        aria-pressed={visible}
        title={`${action} ${visibilityLabel}`}
        onClick={() => setVisible((previous) => !previous)}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  )
}
