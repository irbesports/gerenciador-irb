// Regras de integridade server-side para moderação e protestos:
// - Um Driver pode abrir protesto somente com opened_by_type = 'protesto_piloto'
// - Um Driver NÃO pode alterar decisões, status de comissários, penalidades ou campos de julgamento:
//   penalty_applied, penalty_points, penalty_seconds, penalty_positions, guilty_pilot_id, status, cancelled, ruling.
// - Decisões e punições somente colaboradores podem definir/alterar.

onRecordCreateRequest((e) => {
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  if (!isCollab) {
    const openedByType = e.record.getString('opened_by_type')
    if (openedByType !== 'protesto_piloto') {
      throw new BadRequestError('Pilotos só podem submeter casos do tipo protesto_piloto.')
    }

    // Driver não pode autodeclarar piloto culpado nem aplicar penalidade na abertura
    e.record.set('penalty_applied', '')
    e.record.set('penalty_points', 0)
    e.record.set('penalty_seconds', 0)
    e.record.set('penalty_positions', 0)
    e.record.set('penalty_type', '')
    e.record.set('guilty_pilot_id', null)
    e.record.set('status', 'Em análise')
    e.record.set('cancelled', false)
  }

  e.next()
}, 'moderation_cases')

onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  if (!isCollab) {
    // Somente colaboradores podem alterar ou julgar casos de moderação
    throw new BadRequestError(
      'Apenas comissários e colaboradores podem alterar incidentes ou aplicar penalidades.',
    )
  }

  e.next()
}, 'moderation_cases')

onRecordCreateRequest((e) => {
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  if (!isCollab) {
    // Um piloto nunca pode enviar uma mensagem marcada como parecer de comissário (steward ruling)
    e.record.set('is_steward_ruling', false)
  }

  e.next()
}, 'moderation_case_messages')
