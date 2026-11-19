import { useId, useState } from 'react'
import { IconImage } from './Icons.jsx'

export default function EvidencePicker({ files, urls, onChange, disabled = false, max = 5 }) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const total = files.length + urls.length
  function select(event) {
    const selected = [...(event.target.files || [])]
    event.target.value = ''
    if (!selected.length) return
    if (total + selected.length > max) { setError(`Puedes añadir hasta ${max} imágenes.`); return }
    if (selected.some((file) => !['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) {
      setError('Usa archivos JPG o PNG de hasta 5 MB.')
      return
    }
    setError('')
    onChange([...files, ...selected], urls)
  }
  function addUrl() {
    try {
      const url = new URL(draft.trim())
      if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) throw new Error()
      if (urls.includes(url.href)) { setError('La imagen ya está añadida.'); return }
      onChange(files, [...urls, url.href])
      setDraft('')
      setError('')
    } catch { setError('Usa un enlace HTTPS directo de imagen.') }
  }
  return (
    <details className="claim-attachments">
      <summary><IconImage width={17} height={17} /> Fotos opcionales{total > 0 && ` (${total})`}</summary>
      <div className="claim-section__body">
        {total < max && <>
          <div className="field">
            <label htmlFor={id}>Subir foto</label>
            <input id={id} type="file" className="input" multiple={max > 1} accept="image/jpeg,image/png" disabled={disabled} onChange={select} />
          </div>
          <div className="field">
            <label htmlFor={`${id}-url`}>Enlace de imagen</label>
            <div className="inline-field">
              <input id={`${id}-url`} type="text" inputMode="url" className="input" autoComplete="off" placeholder="https://…" value={draft} disabled={disabled} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) addUrl() } }} />
              <button type="button" className="btn btn--secondary" onClick={addUrl} disabled={disabled || !draft.trim()}>Añadir enlace</button>
            </div>
          </div>
        </>}
        {(total > 0) && <ul className="attachment-list">
          {files.map((file, index) => <li key={`file-${index}`}>
            <span>{file.name}</span>
            <button type="button" className="link-green" aria-label={`Quitar ${file.name}`} disabled={disabled} onClick={() => { setError(''); onChange(files.filter((_, i) => i !== index), urls) }}>Quitar</button>
          </li>)}
          {urls.map((url, index) => <li key={url}>
            <span>Imagen por enlace {index + 1}</span>
            <button type="button" className="link-green" aria-label={`Quitar enlace ${index + 1}`} disabled={disabled} onClick={() => { setError(''); onChange(files, urls.filter((value) => value !== url)) }}>Quitar</button>
          </li>)}
        </ul>}
        {error && <p className="help help--error" role="alert">{error}</p>}
      </div>
    </details>
  )
}
