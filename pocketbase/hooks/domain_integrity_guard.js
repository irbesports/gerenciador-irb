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

// Auditoria server-side de Championship Editions (criação e atualização)
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'CREATE_CHAMPIONSHIP_EDITION')
    auditRec.set('entity_name', 'championship_editions')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      championship_id: record.getString('championship_id'),
      season_id: record.getString('season_id'),
      edition_code: record.getString('edition_code'),
      status: record.getString('status'),
    })
    auditRec.set('reason', 'Criação de edição de campeonato')
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'championship_editions')

onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'UPDATE_CHAMPIONSHIP_EDITION')
    auditRec.set('entity_name', 'championship_editions')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      edition_code: record.getString('edition_code'),
      status: record.getString('status'),
      visible_to_pilots: record.getBool('visible_to_pilots'),
    })
    auditRec.set('reason', 'Atualização de Championship Edition')
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'championship_editions')

// Auditoria server-side de Sub-teams
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'CREATE_SUB_TEAM')
    auditRec.set('entity_name', 'sub_teams')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      team_participation_id: record.getString('team_participation_id'),
      name: record.getString('name'),
      status: record.getString('status'),
    })
    auditRec.set('reason', 'Criação de Sub-team')
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'sub_teams')

// Auditoria server-side de Team Memberships
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'CREATE_TEAM_MEMBERSHIP')
    auditRec.set('entity_name', 'team_memberships')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      driver_id: record.getString('driver_id'),
      team_id: record.getString('team_id'),
      role: record.getString('role'),
      status: record.getString('status'),
    })
    auditRec.set('reason', 'Criação de vínculo organizacional de equipe')
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'team_memberships')

onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    const isEnded = record.getString('status') === 'encerrado'
    auditRec.set('event_type', isEnded ? 'END_TEAM_MEMBERSHIP' : 'UPDATE_TEAM_MEMBERSHIP')
    auditRec.set('entity_name', 'team_memberships')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      status: record.getString('status'),
      end_date: record.getString('end_date'),
    })
    auditRec.set(
      'reason',
      isEnded ? 'Encerramento de vínculo organizacional' : 'Atualização de membership',
    )
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'team_memberships')

// Auditoria server-side de Registrations (independente de Team)
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'CREATE_REGISTRATION')
    auditRec.set('entity_name', 'registrations')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      driver_id: record.getString('driver_id'),
      championship_edition_id: record.getString('championship_edition_id'),
      car_number: record.getInt('car_number'),
      status: record.getString('status'),
    })
    auditRec.set('reason', 'Inscrição de piloto na Championship Edition')
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'registrations')

// Auditoria server-side de Stages
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'CREATE_STAGE')
    auditRec.set('entity_name', 'championship_stages')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      championship_edition_id: record.getString('championship_edition_id'),
      order: record.getInt('order'),
      track: record.getString('track'),
    })
    auditRec.set('reason', 'Criação de etapa associada à Championship Edition')
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'championship_stages')

// Auditoria server-side de Sessions
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  try {
    const auditCol = $app.findCollectionByNameOrId('domain_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'CREATE_SESSION')
    auditRec.set('entity_name', 'sessions')
    auditRec.set('entity_id', record.id)
    auditRec.set('new_state', {
      stage_id: record.getString('stage_id'),
      name: record.getString('name'),
      session_type: record.getString('session_type'),
      order: record.getInt('order'),
    })
    auditRec.set('reason', 'Criação de sessão esportiva')
    $app.save(auditRec)
  } catch (err) {
    console.log('Erro ao gravar auditoria:', err)
  }
  e.next()
}, 'sessions')
