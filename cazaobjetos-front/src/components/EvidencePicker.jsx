import { useEffect, useId, useState } from 'react'
import { IconImage, IconTrash } from './Icons.jsx'

export default function EvidencePicker({ files, onChange, disabled = false, max = 5 }) {
  const id = useId()
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])
  function select(event) {
    const selected = [...(event.target.files || [])]; event.target.value = ''; setError('')
    if (!selected.length) return
    if (files.length + selected.length > max) return setError(`Puedes adjuntar hasta ${max} imágenes.`)
    if (selected.some((file) => !['image/jpeg', 'image/png'].includes(file.type))) return setError('Las evidencias deben ser imágenes JPG o PNG.')
    if (selected.some((file) => !file.size || file.size > 5 * 1024 * 1024)) return setError('Cada evidencia debe pesar entre 1 byte y 5 MB.')
    onChange([...files, ...selected])
  }
  return (
    <div className="evidence-picker">
      <label htmlFor={id} className="label"><span><IconImage width={17} height={17} /> Adjuntar imágenes de prueba</span><span className="muted">Opcional</span></label>
      <p className="account-help" id={`${id}-help`}>JPG o PNG · hasta 5 MB y 12 megapíxeles por imagen. Solo las ven los participantes del reclamo.</p>
      {files.length < max && <input id={id} type="file" className="input" multiple accept="image/jpeg,image/png" disabled={disabled} onChange={select} aria-describedby={`${id}-help`} aria-label="Adjuntar imágenes de prueba" />}
      <div className="evidence-grid">{files.map((file, index) => <figure className="evidence-preview" key={`${file.name}-${index}`}>
        <img src={previews[index]} alt={`Vista previa de evidencia ${index + 1}`} />
        <button type="button" className="evidence-remove" aria-label={`Quitar evidencia ${index + 1}`} disabled={disabled} onClick={() => { onChange(files.filter((_, i) => i !== index)); setError('') }}><IconTrash width={17} height={17} /></button>
        <figcaption>{file.name}</figcaption>
      </figure>)}</div>
      {!!files.length && <p className="help">{files.length} de {max} imágenes seleccionadas. Puedes quitarlas antes de enviar.</p>}
      {error && <p className="help help--error" role="alert">{error}</p>}
    </div>
  )
}
