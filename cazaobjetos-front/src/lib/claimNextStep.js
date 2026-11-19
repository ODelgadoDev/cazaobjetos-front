export function claimNextStep(claim, role = claim.rolEnReclamo) {
  const mine = role === 'solicitante'
  const responsible = claim.gestor?.nombre || 'La persona responsable'
  const claimant = claim.solicitante?.nombre || 'El solicitante'
  const item = claim.hallazgo
  const custodyType = item?.resguardo
  const finder = item?.autor?.id === claim.gestor?.id ? responsible : item?.autor?.nombre || responsible
  const location = item?.ubicacionResguardo?.trim()
  const office = location || item?.custodia || 'Oficina de profesores · mesa de objetos perdidos · edificio I'
  const teacher = item?.docente?.trim() || 'el docente indicado en la ficha'
  const custody = custodyType === 'oficina' ? office
    : custodyType === 'docente' ? `Con ${teacher}${location ? ` · ${location}` : ''}`
    : item ? `Con ${finder}` : claim.custodia || 'Consulta el resguardo en la ficha del hallazgo'
  const context = { custody, responsible }

  if (claim.estado === 'entregado') return {
    title: 'Entrega confirmada',
    description: mine ? 'Confirmaste que recibiste el objeto. Puedes consultar las pruebas y el historial de tu reclamo.'
      : `${claimant} confirmó que recibió el objeto. Puedes consultar las pruebas y el historial del reclamo.`,
  }
  if (claim.estado === 'rechazado') return {
    title: 'Solicitud rechazada',
    description: 'Consulta el motivo y las pruebas en el historial del reclamo.',
  }
  if (claim.estado === 'cancelado') return {
    title: 'Solicitud cancelada',
    description: mine ? 'Cancelaste esta solicitud. Puedes consultar su historial.' : `${claimant} canceló esta solicitud. Puedes consultar su historial.`,
  }
  if (claim.estado === 'cerrado') return {
    title: 'Reclamo cerrado',
    description: 'El hallazgo dejó de estar disponible. Consulta el motivo del cierre en el historial.',
  }
  if (claim.estado === 'aprobado') {
    if (!mine) return {
      ...context,
      title: `Falta que ${claimant} confirme la recepción`,
      description: custodyType === 'persona' ? 'Aceptaste el reclamo. Acuerden la entrega en los comentarios. El solicitante confirmará cuando tenga el objeto en sus manos.'
        : 'Aceptaste el reclamo. El solicitante puede recoger el objeto en el resguardo indicado y confirmar cuando lo tenga en sus manos.',
      action: 'comments',
      actionLabel: custodyType === 'persona' ? 'Acordar entrega' : 'Ver comentarios',
    }
    if (custodyType === 'oficina') return {
      ...context,
      title: 'Tu reclamo fue aceptado. Recoge el objeto en oficina',
      description: `Acude a ${office}. Cuando tengas el objeto en tus manos, confirma que lo recibiste.`,
      action: 'receive',
    }
    if (custodyType === 'docente') return {
      ...context,
      title: 'Tu reclamo fue aceptado. Recoge el objeto con el docente',
      description: `Recógelo con ${teacher}${location ? ` en ${location}` : ''}. Puedes acordar la recogida con ${responsible} en los comentarios. Confirma cuando tengas el objeto en tus manos.`,
      action: 'receive',
    }
    return {
      ...context,
      title: 'Tu reclamo fue aceptado. Acuerda la entrega',
      description: `Acuerda con ${responsible} dónde y cuándo recibir el objeto usando los comentarios. Confirma la recepción cuando lo tengas en tus manos.`,
      action: 'comments', actionLabel: 'Acordar entrega',
    }
  }
  if (claim.estado === 'requiere_pruebas') return {
    ...context,
    title: mine ? 'Hace falta más información de tu objeto' : 'Esperando más información del solicitante',
    description: mine ? `${responsible} te pidió más datos. Consulta su comentario y aporta la información que te solicita.`
      : `${claimant} puede aportar más datos y pruebas antes de que decidas.`,
    action: 'comments', actionLabel: mine ? 'Aportar información' : 'Ver comentarios',
  }
  if (['enviado', 'en_revision'].includes(claim.estado)) return {
    ...context,
    title: mine ? 'Esperando la revisión del responsable' : 'Te toca revisar esta solicitud',
    description: mine ? `${responsible} revisará tu solicitud. Puedes aportar pruebas y responder sus preguntas en los comentarios.`
      : `${claimant} solicita este objeto. Revisa su descripción y las pruebas. Puedes pedir más información en los comentarios antes de decidir.`,
    action: mine ? 'comments' : 'evidence', actionLabel: mine ? 'Aportar información' : 'Revisar pruebas',
  }
  return { title: 'Consulta el estado del reclamo', description: 'Abre el historial para ver la información disponible.' }
}
