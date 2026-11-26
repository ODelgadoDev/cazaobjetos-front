import FormHelp from './FormHelp.jsx'
import { useId, useState } from 'react'
import { IconImage } from './Icons.jsx'

export function selectedEvidenceUrls({ files, urls, draftUrl = '' }, max = 5) {
  const links = [...urls]
  if (draftUrl.trim()) {
    let url
    try { url = new URL(draftUrl.trim()) }
    catch { throw new Error('Usa un enlace HTTPS directo de imagen.') }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.href.length > 2048) {
      throw new Error('Usa un enlace HTTPS directo de imagen.')
    }
    if (!links.includes(url.href)) links.push(url.href)
  }
  if (files.length + links.length > max) throw new Error(`Puedes añadir hasta ${max} imágenes.`)
  return links
}

export default function EvidencePicker({ files, urls, draftUrl = '', onDraftUrlChange, onChange, disabled = false, max = 5 }) {
  const id = useId()
  const [error, setError] = useState('')
  const total = files.length + urls.length
  function select(selected) {
    if (disabled) return
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
      const links = selectedEvidenceUrls({ files, urls, draftUrl }, max)
      onChange(files, links)
      onDraftUrlChange('')
      setError('')
    } catch (e) { setError(e.message) }
  }
  function paste(event) {
    const images = [...event.clipboardData.files].filter((file) => file.type.startsWith('image/'))
    if (images.length) { event.preventDefault(); select(images) }
  }
  return (
    <section className="claim-attachments" aria-label="Fotos opcionales" onPaste={paste}>
      <h3 className="photo-options-heading"><IconImage width={17} height={17} /> Agregar foto <span className="account-optional">Opcional</span>{total > 0 && ` (${total})`}</h3>
      <FormHelp title="Cómo adjuntar una foto">Puedes elegir un archivo JPG o PNG, pegar una imagen copiada en esta sección o usar un enlace directo.</FormHelp>
      <div className="claim-section__body">
        {total < max && <div className="photo-evidence-inputs" tabIndex={0} aria-label="Área donde puedes pegar una imagen">
          <div className="field">
            <label htmlFor={id}>Subir foto</label>
            <input id={id} type="file" className="input" multiple={max > 1} accept="image/jpeg,image/png" disabled={disabled} onChange={(event) => { select([...(event.target.files || [])]); event.target.value = '' }} />
          </div>
          <div className="field">
            <label htmlFor={`${id}-url`}>Enlace de imagen</label>
            <div className="inline-field">
              <input id={`${id}-url`} type="text" inputMode="url" className="input" autoComplete="off" placeholder="https://…" value={draftUrl} disabled={disabled} onChange={(e) => { onDraftUrlChange(e.target.value); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (draftUrl.trim()) addUrl() } }} />
              <button type="button" className="btn btn--secondary" onClick={addUrl} disabled={disabled || !draftUrl.trim()}>Añadir enlace</button>
            </div>
          </div>
        </div>}
        {draftUrl.trim() && <p className="account-help">El enlace se adjuntará al enviar.</p>}
        {(total > 0) && <ul className="attachment-list">
          {files.map((file, index) => <li key={`file-${index}`}>
            <span>{file.name}</span>
            <button type="button" className="link-green" aria-label={`Quitar ${file.name}`} disabled={disabled} onClick={() => { setError(''); onChange(files.filter((_, i) => i !== index), urls) }}>Quitar</button>
          </li>)}
          {urls.map((url, index) => <li key={url}>
            <span className="evidence-link" title={url}>{url}</span>
            <button type="button" className="link-green" aria-label={`Quitar enlace ${index + 1}`} disabled={disabled} onClick={() => { setError(''); onChange(files, urls.filter((value) => value !== url)) }}>Quitar</button>
          </li>)}
        </ul>}
        {error && <p className="help help--error" role="alert">{error}</p>}
      </div>
    </section>
  )
}
