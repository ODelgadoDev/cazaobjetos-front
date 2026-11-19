import { useId } from 'react'

export const DEFAULT_OFFICE = 'Oficina de profesores · edificio I'

export default function LostResponseCustodyFields({ custody, location, onCustodyChange, onLocationChange, officeLocked = false, disabled = false }) {
  const id = useId()
  return <fieldset className="response-custody-fields" disabled={disabled}>
    <legend>Entrega</legend>
    <div className="response-custody-options">
      <label className={`response-custody-option${custody === 'WITH_FINDER' ? ' is-selected' : ''}`}>
        <input type="radio" name={id} value="WITH_FINDER" checked={custody === 'WITH_FINDER'} disabled={officeLocked} onChange={() => onCustodyChange('WITH_FINDER')} />
        Lo tengo yo
      </label>
      <label className={`response-custody-option${custody === 'OFFICE' ? ' is-selected' : ''}`}>
        <input type="radio" name={id} value="OFFICE" checked={custody === 'OFFICE'} onChange={() => onCustodyChange('OFFICE')} />
        Lo dejé en oficina
      </label>
    </div>
    {custody === 'OFFICE' && <div className="field">
      <label htmlFor={`${id}-location`}>Lugar de recogida</label>
      <input id={`${id}-location`} className="input" value={location} placeholder={DEFAULT_OFFICE} maxLength={200} onChange={(event) => onLocationChange(event.target.value)} />
    </div>}
  </fieldset>
}
