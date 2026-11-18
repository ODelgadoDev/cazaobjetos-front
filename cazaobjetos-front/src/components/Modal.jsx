import { useEffect, useId, useRef } from 'react'

export default function Modal({ open, onClose, title, children }) {
  const dialog = useRef(null)
  const titleId = useId()
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal()
    if (!open && dialog.current.open) dialog.current.close()
  }, [open])
  return (
    <dialog ref={dialog} className="app-dialog" aria-labelledby={titleId} onCancel={onClose} onClick={(event) => {
      if (event.target !== event.currentTarget) return
      const box = event.currentTarget.getBoundingClientRect()
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose()
    }}>
      <div className="app-dialog__heading"><h2 id={titleId}>{title}</h2><button type="button" className="app-dialog__close" onClick={onClose} aria-label="Cerrar ventana">×</button></div>
      {children}
    </dialog>
  )
}
