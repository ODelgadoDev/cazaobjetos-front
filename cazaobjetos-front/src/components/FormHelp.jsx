import { useId } from 'react'

export default function FormHelp({ title, children }) {
  const id = useId()
  return (
    <details className="form-help">
      <summary aria-controls={id}>
        <span className="form-help__icon" aria-hidden="true">?</span>
        {title}
      </summary>
      <div className="form-help__bubble" id={id}>{children}</div>
    </details>
  )
}
