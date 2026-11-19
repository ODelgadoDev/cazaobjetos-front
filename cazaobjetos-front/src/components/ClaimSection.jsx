import { useEffect, useRef, useState } from 'react'

export default function ClaimSection({ id, title, children, defaultOpen }) {
  const section = useRef(null)
  const [initiallyOpen] = useState(() => defaultOpen ?? window.matchMedia('(min-width: 900px)').matches)
  useEffect(() => {
    function followLink() {
      if (window.location.hash !== '#' + id) return
      section.current.open = true
      section.current.scrollIntoView()
    }
    followLink()
    window.addEventListener('hashchange', followLink)
    return () => window.removeEventListener('hashchange', followLink)
  }, [id])
  return <details className="card claim-section" id={id} ref={section} open={initiallyOpen}>
    <summary>{title}</summary>
    <div className="claim-section__body">{children}</div>
  </details>
}
