import { useId } from 'react'

export default function ChoiceField({ label, options, value, onChange, disabled }) {
  const name = useId()
  return (
    <fieldset className="choice-field" disabled={disabled}>
      <legend>{label}</legend>
      <div className="choice-field__options">
        {options.map(([key, text]) => (
          <label className="choice-field__option" key={key}>
            <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
