export default function InstitutionBrand({ compact = false }) {
  return (
    <span className={`brand-identity${compact ? ' brand-identity--compact' : ''}`}>
      <span className="brand-identity__logo"><img src="/utch-logo.png" alt="Universidad Tecnológica de Chihuahua" /></span>
      {!compact && <span className="brand-identity__text"><strong>CazaObjetos</strong><small>Comunidad UTCH</small></span>}
    </span>
  )
}
