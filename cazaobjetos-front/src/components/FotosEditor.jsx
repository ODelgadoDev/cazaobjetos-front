import ImageAttachment from './ImageAttachment.jsx'
import { useState } from 'react'
import { agregarFoto, eliminarFoto, importarFoto } from '../lib/api.js'
import { useToast } from './Toast.jsx'
import { IconImage, IconTrash } from './Icons.jsx'

const MAX_FOTOS = 3

/** Agrega o quita fotos de una publicación ya creada. tipo: 'hallazgos' | 'extravios'. */
export default function FotosEditor({ tipo, id, fotos: iniciales = [] }) {
  const toast = useToast()
  const [fotos, setFotos] = useState(iniciales)
  const [imagen, setImagen] = useState(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function agregarImagen() {
    if (!imagen || ocupado) return
    setError('')
    setOcupado(true)
    try {
      const foto = imagen.file
        ? await agregarFoto(tipo, id, imagen.file, imagen.referenceImage)
        : await importarFoto(id, imagen.url, imagen.referenceImage, tipo)
      setFotos((previous) => [...previous, foto])
      setImagen(null)
      toast('Imagen agregada.')
    } catch (error) { setError(error.message) } finally { setOcupado(false) }
  }

  async function quitar(fotoId) {
    if (!window.confirm('¿Quitar esta foto de la publicación?')) return
    setError('')
    setOcupado(true)
    try {
      await eliminarFoto(tipo, id, fotoId)
      setFotos((prev) => prev.filter((f) => f.id !== fotoId))
      toast('Foto eliminada.')
    } catch (err) { setError(err.message) } finally { setOcupado(false) }
  }

  return (
    <section className="card">
      <h2 className="section-title"><IconImage width={20} height={20} /> Fotos</h2>
      {fotos.length > 0 && <div className="fotos">
        {fotos.map((f, i) => (
          <figure key={f.id} className="fotos__item">
            <img src={f.url} alt={`Foto ${i + 1}`} />
            {f.referenceImage && <figcaption className="photo__reference">Referencia</figcaption>}
            <button type="button" className="fotos__quitar" onClick={() => quitar(f.id)} disabled={ocupado} aria-label={`Quitar foto ${i + 1}`}>
              <IconTrash width={18} height={18} />
            </button>
          </figure>
        ))}
      </div>}
      {fotos.length < MAX_FOTOS && <>
        <ImageAttachment compact value={imagen} onChange={setImagen} disabled={ocupado} />
        {imagen && <button type="button" className="btn btn--primary" onClick={agregarImagen} disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar foto'}</button>}
      </>}
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
    </section>
  )
}
