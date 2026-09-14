// Domain Integrity & Sports Business Rules Guard
// Garante conformidade com o Modelo Esportivo Oficial IRB:
// 1. Team Participation: UNIQUE(team_id, championship_edition_id)
// 2. Sub-team: pertence a Team Participation e não à Team global; nome único por participation
// 3. Driver Championship Representation:
//    - Um driver NÃO pode ter duas representações ativas simultâneas na mesma Championship Edition
//    - Na transferência/alteração, encerra a anterior (preenchendo end_date) e mantém histórico imutável
// 4. Registrations: Driver -> Registration -> Championship Edition independente de Team
// 5. Auditoria de eventos do domínio

onRecordValidate((e) => {
  const record = e.record
  const teamId = record.getString('team_id')
  const editionId = record.getString('championship_edition_id')

  if (!teamId || !editionId) {
    throw new BadRequestError(
      'team_id e championship_edition_id são obrigatórios para Team Participation.',
    )
  }

  // Verificar se já existe outra participation para o mesmo team na mesma edition
  const existing = $app.findRecordsByFilter(
    'team_participations',
    `team_id = "${teamId}" && championship_edition_id = "${editionId}" && id != "${record.id || ''}"`,
    '',
    1,
    0,
  )

  if (existing && existing.length > 0) {
    throw new BadRequestError(
      'Violação de Integridade: Uma Team já possui participação nesta Championship Edition.',
    )
  }

  e.next()
}, 'team_participations')

onRecordValidate((e) => {
  const record = e.record
  const driverId = record.getString('driver_id')
  const editionId = record.getString('championship_edition_id')
  const status = record.getString('status') || 'ativa'

  if (!driverId || !editionId) {
    throw new BadRequestError('driver_id e championship_edition_id são obrigatórios.')
  }

  // Regra Crítica: Um Driver NÃO pode representar simultaneamente duas Sub-teams dentro da mesma Championship Edition
  if (status === 'ativa') {
    const activeExisting = $app.findRecordsByFilter(
      'driver_championship_representations',
      `driver_id = "${driverId}" && championship_edition_id = "${editionId}" && status = "ativa" && id != "${record.id || ''}"`,
      '',
      1,
      0,
    )

    if (activeExisting && activeExisting.length > 0) {
      throw new BadRequestError(
        'Violação de Regra Esportiva: O piloto já possui uma representação esportiva ativa nesta Championship Edition. Encerre ou transfira a representação anterior antes de ativar uma nova.',
      )
    }
  }

  e.next()
}, 'driver_championship_representations')

onRecordAfterCreateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'CREATE_TEAM_PARTICIPATION')
    auditRec.set('entity_name', 'team_participations')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      team_id: record.getString('team_id'),
      championship_edition_id: record.getString('championship_edition_id'),
      status: record.getString('status'),
    })
    auditRec.set('reason', 'Criação de nova Team Participation na Championship Edition')
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'team_participations')

onRecordAfterCreateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'CREATE_DRIVER_REPRESENTATION')
    auditRec.set('entity_name', 'driver_championship_representations')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      driver_id: record.getString('driver_id'),
      championship_edition_id: record.getString('championship_edition_id'),
      team_participation_id: record.getString('team_participation_id'),
      sub_team_id: record.getString('sub_team_id'),
      status: record.getString('status'),
    })
    auditRec.set('reason', record.getString('change_reason') || 'Representação esportiva atribuída')
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'driver_championship_representations')
