import { claimNextStep } from '../lib/claimNextStep.js'

export default function ClaimNextStep({ claim, role, children }) {
  const next = claimNextStep(claim, role)
  return <div className="claim-next-step">
    <span className="section-title">Siguiente paso</span>
    <h3>{next.title}</h3>
    {next.custody && <dl className="claim-next-step__context">
      <div><dt>Dónde está el objeto</dt><dd>{next.custody}</dd></div>
      <div><dt>Quién revisa la solicitud</dt><dd>{next.responsible}</dd></div>
    </dl>}
    <p>{next.description}</p>
    {children}
  </div>
}
