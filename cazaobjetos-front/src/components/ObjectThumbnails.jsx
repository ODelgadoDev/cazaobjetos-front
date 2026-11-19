import { useState } from 'react'

export default function ObjectThumbnails({ images }) {
  const [failed, setFailed] = useState([])
  const visible = images.filter((image) => !failed.includes(image.url))
  if (!visible.length) return null
  return <span className={`notice-images${visible.length > 1 ? ' notice-images--pair' : ''}`}>
    {visible.map((image) => <img key={image.url} src={image.url} alt={image.label} loading="lazy" referrerPolicy="no-referrer"
      onError={() => setFailed((current) => [...current, image.url])} />)}
  </span>
}
