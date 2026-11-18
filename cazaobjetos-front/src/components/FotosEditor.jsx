import ImageAttachment from './ImageAttachment.jsx'
import { useState } from 'react'
import { agregarFoto, eliminarFoto, importarFoto } from '../lib/api.js'
import { useToast } from './Toast.jsx'
import { IconImage, IconTrash } from './Icons.jsx'

const MAX_FOTOS = 3
const MAX_MB = 5

/** Agrega o quita fotos de una publicación ya creada. tipo: 'hallazgos' | 'extravios'. */
export default function FotosEditor({ tipo, id, fotos: iniciales = [] }) {
  const toast = useToast()
  const [fotos, setFotos] = useState(iniciales)
  const [imagen, setImagen] = useState(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function subir(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!['image/jpeg', 'image/png'].includes(file.type)) return setError('Sube una imagen JPG o PNG.')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`La imagen pesa más de ${MAX_MB} MB.`)
    setOcupado(true)
    try {
      const f = await agregarFoto(tipo, id, file)
      setFotos((prev) => [...prev, f])
      toast('Foto agregada.')
    } catch (err) { setError(err.message) } finally { setOcupado(false) }
  }

  async function agregarImagen() {
    if (!imagen || ocupado) return
    setError('')
    setOcupado(true)
    try {
      const foto = imagen.file
        ? await agregarFoto(tipo, id, imagen.file, imagen.referenceImage)
        : await importarFoto(id, imagen.url, imagen.referenceImage)
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
      <p className="help" style={{ margin: 0 }}>SE GUARDAN AL MOMENTO · LA PRIMERA ES LA PORTADA · MÁX {MAX_FOTOS}</p>
      <div className="fotos">
        {fotos.map((f, i) => (
          <figure key={f.id} className="fotos__item">
            <img src={f.url} alt={`Foto ${i + 1}`} />
            {f.referenceImage && <figcaption className="photo__reference">Referencia</figcaption>}
            <button type="button" className="fotos__quitar" onClick={() => quitar(f.id)} disabled={ocupado} aria-label={`Quitar foto ${i + 1}`}>
              <IconTrash width={18} height={18} />
            </button>
          </figure>
        ))}
        {tipo !== 'extravios' && fotos.length < MAX_FOTOS && (
          <label className="dropzone fotos__nueva">
            <IconImage width={24} height={24} />
            <strong>{ocupado ? 'Subiendo…' : 'Agregar foto'}</strong>
            <input type="file" accept="image/jpeg,image/png" onChange={subir} disabled={ocupado} aria-label="Agregar foto" />
          </label>
        )}
      </div>
      {tipo === 'extravios' && fotos.length < MAX_FOTOS && <>
        <ImageAttachment value={imagen} onChange={setImagen} disabled={ocupado} />
        {imagen && <button type="button" className="btn btn--primary" onClick={agregarImagen} disabled={ocupado}>{ocupado ? 'Guardando imagen…' : 'Agregar imagen al reporte'}</button>}
      </>}
      {!fotos.length && <p className="muted" style={{ margin: 0 }}>Sin fotos. Una foto ayuda a reconocer el objeto; evita mostrar datos personales.</p>}
      {error && <div className="notice notice--peligro" role="alert">{error}</div>}
    </section>
  )
}
