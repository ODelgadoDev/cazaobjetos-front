import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { editarExtravio, editarHallazgo, getExtravio, getHallazgo } from '../lib/api.js'
import { useToast } from '../components/Toast.jsx'
import FotosEditor from '../components/FotosEditor.jsx'
import { FormEncontre, FormPerdi } from './Reportar.jsx'

const p = (n) => String(n).padStart(2, '0')
const fechaLocal = (iso) => { const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const horaLocal = (iso) => { const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso); return `${p(d.getHours())}:${p(d.getMinutes())}` }

const TIPOS = {
  hallazgo: {
    cargar: getHallazgo, guardar: editarHallazgo, fotos: 'hallazgos', Form: FormEncontre,
    inicial: (h) => ({ titulo: h.titulo, categoria: h.categoria, lugar: h.lugar, fecha: fechaLocal(h.fecha), hora: horaLocal(h.fecha), descripcion: h.descripcionPublica ?? '' }),
  },
  extravio: {
    cargar: getExtravio, guardar: editarExtravio, fotos: 'extravios', Form: FormPerdi,
    inicial: (e) => ({ titulo: e.titulo, categoria: e.categoria, lugar: e.lugar, fecha: fechaLocal(e.fecha), descripcion: e.descripcion ?? '', alertas: !!e.alertas }),
  },
}

export default function EditarPublicacion() {
  const { tipo, id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const cfg = TIPOS[tipo]
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { cfg?.cargar(id).then(setItem).catch((e) => setError(e.message)) }, [cfg, id])

  if (!cfg) return <Navigate to="/publicaciones" replace />
  if (error) return <div className="notice notice--peligro" role="alert">{error}</div>
  if (!item) return <p className="empty">Cargando publicación…</p>
  if (item.permisos && !item.permisos.editar) {
    return <div className="notice notice--pend" role="alert"><span>No puedes editar esta publicación: ya se cerró o no la gestionas tú.</span></div>
  }

  const { Form } = cfg
  async function onGuardar(cambios) {
    await cfg.guardar(item.id, cambios)
    toast('Cambios guardados.')
    navigate(`/publicaciones${tipo === 'extravio' ? '?tab=extravios' : ''}`)
  }

  return (
    <>
      <p className="folio" style={{ margin: 0 }}>FOLIO {item.folio}</p>
      <FotosEditor tipo={cfg.fotos} id={item.id} fotos={item.fotos ?? []} />
      <Form edicion={{ inicial: cfg.inicial(item), onGuardar }} />
    </>
  )
}
