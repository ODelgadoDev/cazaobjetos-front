import FormHelp from './FormHelp.jsx'
import { useEffect, useId, useRef, useState } from 'react'
import { IconImage, IconUpload, IconX } from './Icons.jsx'
import './ImageAttachment.css'

export default function ImageAttachment({ value, onChange, disabled = false, compact = false }) {
  const inputId = useId()
  const pasteArea = useRef(null)
  const [mode, setMode] = useState('archivo')
  const [draftUrl, setDraftUrl] = useState('')
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!value?.file) { setPreview(''); return }
    const objectUrl = URL.createObjectURL(value.file)
    setPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [value?.file])

  function selectFile(file) {
    if (!file || disabled) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Usa una imagen JPG o PNG.')
      return
    }
    if (!file.size || file.size > 5 * 1024 * 1024) { setError('Elige una imagen de hasta 5 MB.'); return }
    setError('')
    onChange({ file, referenceImage: value?.referenceImage ?? !compact })
  }

  function paste(event) {
    if (disabled) return
    const image = [...event.clipboardData.items].find((item) => item.type.startsWith('image/'))
    if (image) {
      event.preventDefault()
      selectFile(image.getAsFile())
      return
    }
    if (event.target.tagName === 'INPUT') return
    const text = event.clipboardData.getData('text/plain').trim()
    if (text.startsWith('https://')) {
      event.preventDefault()
      setMode('enlace')
      setDraftUrl(text)
    }
  }

  async function readClipboard() {
    setError('')
    pasteArea.current?.focus()
    if (!navigator.clipboard?.read) {
      setError('Haz clic en el área de pegado y usa Ctrl+V o la opción Pegar de tu dispositivo.')
      return
    }
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find((mime) => ['image/png', 'image/jpeg'].includes(mime))
        if (type) {
          const blob = await item.getType(type)
          selectFile(new File([blob], 'imagen-pegada', { type }))
          return
        }
      }
      setError('Copia una imagen desde el navegador y pégala aquí. Si copiaste su dirección, usa Enlace.')
    } catch {
      setError('Haz clic en el área de pegado y presiona Ctrl+V, o sube la imagen desde tu dispositivo.')
    }
  }

  function useUrl() {
    try {
      const url = new URL(draftUrl.trim())
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error()
      onChange({ url: url.href, referenceImage: true })
      setError('')
    } catch { setError('Pega el enlace HTTPS directo de la imagen.') }
  }

  const picker = (
    <section className={`image-attachment${compact ? ' image-attachment--compact' : ''}`}
      aria-label={compact ? 'Adjuntar imagen' : undefined} aria-labelledby={compact ? undefined : `${inputId}-title`} onPaste={paste}>
      <div className="image-attachment__heading">
        <h2 id={`${inputId}-title`}>Agregar foto</h2>
        <span className="image-attachment__optional">Opcional</span>
      </div>
      <FormHelp title="Cómo agregar una foto">Sube un archivo, pega una imagen o usa un enlace. Si la foto es de un objeto parecido, márcala como imagen de referencia.</FormHelp>
      <div className="image-attachment__methods" role="group" aria-label="Cómo agregar la imagen">
        {['archivo', 'pegar', 'enlace'].map((option) => (
          <button key={option} type="button" className={`filter ${mode === option ? 'is-active' : ''}`}
            aria-pressed={mode === option} onClick={() => { setMode(option); setError('') }} disabled={disabled}>
            {{ archivo: compact ? 'Archivo' : 'Subir imagen', pegar: 'Pegar imagen', enlace: compact ? 'Enlace' : 'Enlace de internet' }[option]}
          </button>
        ))}
      </div>
      {mode === 'archivo' && (
        <div className="image-attachment__file">
          {!compact && <IconUpload width={26} height={26} />}
          <label htmlFor={inputId}>{compact ? 'Elegir imagen' : 'Elegir una imagen del dispositivo'}</label>
          <input id={inputId} type="file" accept="image/jpeg,image/png" disabled={disabled}
            onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = '' }} />
          <span className="help">JPG o PNG · hasta 5 MB</span>
        </div>
      )}
      {mode === 'pegar' && (
        <div className="image-attachment__paste" tabIndex={0} ref={pasteArea} aria-label="Área para pegar una imagen copiada">
          {!compact && <IconImage width={28} height={28} />}
          {compact ? <p>Pega una imagen copiada.</p> : <p>Copia la imagen en tu navegador. Haz clic aquí y presiona <kbd>Ctrl</kbd> + <kbd>V</kbd>.</p>}
          <button type="button" className="btn btn--secondary" onClick={readClipboard} disabled={disabled}>Pegar desde el portapapeles</button>
        </div>
      )}
      {mode === 'enlace' && (
        <div className="field">
          <label htmlFor={`${inputId}-url`}>Enlace directo de la imagen</label>
          <div className="image-attachment__url">
            <input id={`${inputId}-url`} type="url" className="input" placeholder="https://ejemplo.com/imagen.jpg"
              value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} disabled={disabled} />
            <button type="button" className="btn btn--secondary" onClick={useUrl} disabled={disabled || !draftUrl.trim()}>Usar enlace</button>
          </div>
          {!compact && <span className="help">Usa «Copiar dirección de imagen» en tu navegador.</span>}
        </div>
      )}
      {value && (
        <div className="image-attachment__selection">
          {preview ? <img src={preview} alt="Vista previa de la imagen elegida" /> : <IconImage width={32} height={32} />}
          <div><strong>{value.file?.name || 'Imagen desde enlace'}</strong>{!compact && <span>{value.url || 'Lista para adjuntar al reporte'}</span>}</div>
          <button type="button" className="image-attachment__remove" onClick={() => onChange(null)} disabled={disabled} aria-label="Quitar imagen elegida"><IconX /></button>
        </div>
      )}
      {value && <label className="check"><input type="checkbox" checked={value.referenceImage}
        onChange={(event) => onChange({ ...value, referenceImage: event.target.checked })} disabled={disabled} />
        <span>{compact ? 'Imagen de referencia' : 'Es una imagen de referencia de un objeto parecido.'}</span></label>}
      {error && <p className="help help--error" role="alert">{error}</p>}
    </section>
  )
  return picker
}
