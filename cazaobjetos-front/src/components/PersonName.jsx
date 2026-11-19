export default function PersonName({ name, degree }) {
  return <span className="person-name"><strong>{name}</strong>{degree?.trim() && <small className="person-name__degree" title={`Carrera: ${degree}`}>{degree}</small>}</span>
}
