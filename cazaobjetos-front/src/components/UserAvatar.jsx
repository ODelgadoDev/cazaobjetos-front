import { useState } from 'react'

export default function UserAvatar({ user, src = user?.fotoPerfil }) {
  const [failed, setFailed] = useState(null)
  const words = (user?.nombre || 'Usuario UTCH').trim().split(/\s+/)
  const initials = words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)
  return src && failed !== src
    ? <img className="user-avatar__image" src={src} alt="" onError={() => setFailed(src)} />
    : <span className="user-avatar__initials" aria-hidden="true">{initials.toLocaleUpperCase('es-MX')}</span>
}
