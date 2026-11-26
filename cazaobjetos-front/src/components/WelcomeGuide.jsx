import { useState } from 'react'
import Modal from './Modal.jsx'

export default function WelcomeGuide({ userId }) {
  const key = `caza-guia-inicial-v1.2:${userId}`
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(key) !== 'vista' } catch { return true }
  })

  function dismiss() {
    try { localStorage.setItem(key, 'vista') } catch { /* La guía sigue siendo descartable. */ }
    setOpen(false)
  }

  return (
    <Modal open={open} onClose={dismiss} title="Empieza con CazaObjetos">
      <ul className="welcome-guide">
        <li><strong>Buscar objetos.</strong> Revisa lo que la comunidad perdió o encontró.</li>
        <li><strong>Publicar.</strong> Avisa cuando pierdas o encuentres un objeto.</li>
        <li><strong>Solicitudes.</strong> Consulta las que enviaste y las que debes revisar.</li>
        <li><strong>Mis publicaciones.</strong> Revisa y edita tus propios reportes.</li>
      </ul>
      <button type="button" className="btn btn--primary" onClick={dismiss}>Entendido</button>
    </Modal>
  )
}
