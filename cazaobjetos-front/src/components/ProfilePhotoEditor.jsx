import FormHelp from './FormHelp.jsx'
import { useEffect, useRef, useState } from 'react'
import { quitarFotoPerfil, subirFotoPerfil } from '../lib/api.js'
import { profilePhotoError } from '../lib/profile.js'
import UserAvatar from './UserAvatar.jsx'
import { IconImage, IconTrash } from './Icons.jsx'

export default function ProfilePhotoEditor({ perfil, disabled, onSaved, onBusy }) {
  const input = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [remove, setRemove] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const pending = !!file || remove

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function cancel() { setFile(null); setRemove(false); setError('') }
  function choose(event) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    const problem = profilePhotoError(selected)
    setError(problem)
    if (problem) return
    setFile(selected); setRemove(false)
  }
  async function save() {
    if (!pending || saving || disabled) return
    setSaving(true); onBusy(true); setError('')
    try {
      const updated = remove ? await quitarFotoPerfil() : await subirFotoPerfil(file)
      onSaved(updated, remove ? 'Foto de perfil eliminada.' : 'Foto de perfil actualizada.')
      cancel()
    } catch (e) { setError(e.message) }
    finally { setSaving(false); onBusy(false) }
  }

  return (
    <div className="account-photo-editor">
      <span className="account-photo" aria-label={pending ? 'Vista previa de la foto de perfil' : 'Foto de perfil'}>
        <UserAvatar user={perfil} src={file ? preview : remove ? null : perfil.fotoPerfil} />
      </span>
      <div className="account-photo-editor__controls">
        <FormHelp title="Cómo cambiar tu foto">Elige una foto y revisa la vista previa. Pulsa «Guardar foto» para que aparezca en tu cuenta.</FormHelp>
        <div className="account-photo-editor__buttons">
          <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png" aria-label="Elegir foto de perfil" onChange={choose} disabled={disabled} tabIndex={-1} />
          <button type="button" className="btn btn--secondary" onClick={() => input.current?.click()} disabled={disabled}>
            <IconImage width={18} height={18} /> {perfil.fotoPerfil || file ? 'Cambiar foto' : 'Agregar foto'}
          </button>
          {perfil.fotoPerfil && !remove && <button type="button" className="btn btn--link-danger" onClick={() => { setRemove(true); setFile(null); setError('') }} disabled={disabled}><IconTrash width={18} height={18} /> Quitar</button>}
        </div>
        <p className="account-help">JPG o PNG, hasta 5 MB. Recorte cuadrado al centro.</p>
        {pending && (
          <>
            <p className="account-photo-editor__pending" role="status">{remove ? 'Se quitará tu foto al guardar.' : 'Vista previa: tu foto aún no se ha guardado.'}</p>
            <div className="account-photo-editor__buttons">
              <button type="button" className="btn btn--primary" disabled={disabled} onClick={save}>{saving ? 'Guardando foto…' : 'Guardar foto'}</button>
              <button type="button" className="btn btn--secondary" disabled={disabled} onClick={cancel}>Cancelar foto</button>
            </div>
          </>
        )}
        {error && <p className="help help--error" role="alert">{error}</p>}
      </div>
    </div>
  )
}
