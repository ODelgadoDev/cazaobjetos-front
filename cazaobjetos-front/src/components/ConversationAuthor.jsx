import UserAvatar from './UserAvatar.jsx'
import PersonName from './PersonName.jsx'

const API = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')

export default function ConversationAuthor({ name, degree, photoPath, avatarVersion, photo }) {
  const src = photo || (avatarVersion && photoPath ? `${API}${photoPath}?v=${encodeURIComponent(avatarVersion)}` : null)
  return <span className="conversation-author">
    <span className="avatar conversation-author__avatar"><UserAvatar user={{ nombre: name }} src={src} /></span>
    <PersonName name={name} degree={degree} />
  </span>
}
