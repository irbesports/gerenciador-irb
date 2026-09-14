migrate(
  (app) => {
    const championshipsCol = app.findCollectionByNameOrId('championships')
    const seasonsCol = app.findCollectionByNameOrId('seasons')
    const championshipEditionsCol = app.findCollectionByNameOrId('championship_editions')
    const stagesCol = app.findCollectionByNameOrId('championship_stages')
    const stageRacesCol = app.findCollectionByNameOrId('stage_races')
    const sessionsCol = app.findCollectionByNameOrId('sessions')
    const champPilotsCol = app.findCollectionByNameOrId('championship_pilots')
    const pilotsCol = app.findCollectionByNameOrId('pilots')
    const teamsCol = app.findCollectionByNameOrId('teams')
    const teamPartCol = app.findCollectionByNameOrId('team_participations')
    const subTeamsCol = app.findCollectionByNameOrId('sub_teams')
    const membershipsCol = app.findCollectionByNameOrId('team_memberships')
    const registrationsCol = app.findCollectionByNameOrId('registrations')
    const representationsCol = app.findCollectionByNameOrId('driver_championship_representations')

    // 1. Criar Championship Editions a partir de cada Championship existente
    const allChampionships = app.findRecordsByFilter('championships', '', 'created', 100, 0)
    const champEditionMap = {} // championship.id -> championship_edition record

    for (const champ of allChampionships) {
      const seasonId = champ.getString('season_id')
      if (!seasonId) continue

      // Verificar se Season existe
      let seasonExists = false
      try {
        app.findCollectionByNameOrId('seasons')
        const s = app.findRecordsByFilter('seasons', `id = "${seasonId}"`, '', 1, 0)
        if (s.length > 0) seasonExists = true
      } catch (_) {}

      if (!seasonExists) continue

      // Verificar se já existe Edition para champ + season
      let editionRecord = null
      try {
        const existingEditions = app.findRecordsByFilter(
          'championship_editions',
          `championship_id = "${champ.id}" && season_id = "${seasonId}"`,
          '',
          1,
          0,
        )
        if (existingEditions.length > 0) {
          editionRecord = existingEditions[0]
        }
      } catch (_) {}

      if (!editionRecord) {
        editionRecord = new Record(championshipEditionsCol)
        editionRecord.set('championship_id', champ.id)
        editionRecord.set('season_id', seasonId)
        editionRecord.set('edition_code', champ.getString('short_code') || '')
        editionRecord.set('custom_title', champ.getString('name') || '')
        editionRecord.set('status', champ.getString('status') || 'rascunho')
        editionRecord.set('visible_to_pilots', champ.getBool('visible_to_pilots'))
        editionRecord.set('stages_scoring', champ.get('stages_scoring'))
        editionRecord.set('regulation_rules', champ.get('regulation_rules'))
        app.save(editionRecord)
      }

      champEditionMap[champ.id] = editionRecord
    }

    // 2. Vincular championship_stages ao championship_edition_id correspondente
    const allStages = app.findRecordsByFilter('championship_stages', '', 'order', 200, 0)
    for (const stage of allStages) {
      const champId = stage.getString('championship_id')
      if (champId && champEditionMap[champId]) {
        stage.set('championship_edition_id', champEditionMap[champId].id)
        app.save(stage)
      }
    }

    // 3. Migrar stage_races para sessions (preservando stage_races para compatibilidade legada)
    const allStageRaces = app.findRecordsByFilter('stage_races', '', 'order', 500, 0)
    for (const sr of allStageRaces) {
      const stageId = sr.getString('stage_id')
      const existingSessions = app.findRecordsByFilter(
        'sessions',
        `legacy_stage_race_id = "${sr.id}"`,
        '',
        1,
        0,
      )
      if (existingSessions.length === 0) {
        const sess = new Record(sessionsCol)
        sess.set('stage_id', stageId)
        sess.set('name', sr.getString('name') || `Sessão ${sr.getInt('order')}`)
        sess.set('session_type', 'race')
        sess.set('order', sr.getInt('order') || 1)
        sess.set('duration_type', sr.getString('duration_type') || 'Minutos')
        sess.set('duration', sr.getInt('duration') || 50)
        sess.set('weather_config', sr.getString('weather') || '')
        sess.set('inverted_positions', sr.getInt('inverted_positions') || 0)
        sess.set('status', sr.getBool('is_closed') ? 'concluida' : 'agendada')
        sess.set('legacy_stage_race_id', sr.id)
        app.save(sess)
      }
    }

    // 4. Migrar Teams e Pilotos a partir de championship_pilots e pilots
    const teamsCache = {} // teamName -> team record

    // Criar Teams encontradas em pilots (campo team_name) e championship_pilots (campo team)
    const allPilots = app.findRecordsByFilter('pilots', '', 'name', 200, 0)
    for (const p of allPilots) {
      const rawTeamName = (p.getString('team_name') || '').trim()
      if (rawTeamName && !teamsCache[rawTeamName]) {
        let tRec = null
        try {
          const found = app.findRecordsByFilter('teams', `name = "${rawTeamName}"`, '', 1, 0)
          if (found.length > 0) tRec = found[0]
        } catch (_) {}

        if (!tRec) {
          tRec = new Record(teamsCol)
          tRec.set('name', rawTeamName)
          tRec.set('status', 'ativa')
          app.save(tRec)
        }
        teamsCache[rawTeamName] = tRec

        // Criar Team Membership inicial para o piloto se não existir
        const existingMemberships = app.findRecordsByFilter(
          'team_memberships',
          `driver_id = "${p.id}" && team_id = "${tRec.id}"`,
          '',
          1,
          0,
        )
        if (existingMemberships.length === 0) {
          const mb = new Record(membershipsCol)
          mb.set('driver_id', p.id)
          mb.set('team_id', tRec.id)
          mb.set('role', 'driver')
          mb.set('status', 'ativo')
          mb.set('start_date', '2025-01-01 00:00:00.000Z')
          mb.set('notes', 'Migração inicial de vínculo de equipe histórica')
          app.save(mb)
        }
      }
    }

    // 5. Migrar championship_pilots para Registrations, Team Participations, Sub-teams e Driver Championship Representations
    const allChampPilots = app.findRecordsByFilter('championship_pilots', '', 'created', 500, 0)
    const teamPartCache = {} // `${teamId}_${editionId}` -> team_participation record
    const subTeamsCache = {} // `${teamPartId}_${subTeamName}` -> sub_team record

    for (const cp of allChampPilots) {
      const champId = cp.getString('championship_id')
      const edition = champEditionMap[champId]
      if (!edition) continue // Se o championship não tinha Season ou Edition válida, pular com segurança

      // Localizar piloto
      let pilotId = cp.getString('pilot')
      if (!pilotId) {
        // Tentar encontrar piloto por iracing_id ou nome
        const iracingId = (cp.getString('iracing_id') || '').trim()
        if (iracingId) {
          const found = app.findRecordsByFilter('pilots', `iracing_id = "${iracingId}"`, '', 1, 0)
          if (found.length > 0) pilotId = found[0].id
        }
      }

      if (!pilotId) {
        // Se ainda não achou, tentar por nome exato
        const name = (cp.getString('name') || '').trim()
        if (name) {
          const found = app.findRecordsByFilter('pilots', `name = "${name}"`, '', 1, 0)
          if (found.length > 0) pilotId = found[0].id
        }
      }

      // Se piloto não existir na coleção `pilots`, criar registro básico para integridade relacional
      if (!pilotId) {
        const newPilot = new Record(pilotsCol)
        newPilot.set('name', cp.getString('name') || 'Piloto Migrado')
        newPilot.set('iracing_id', cp.getString('iracing_id') || '')
        newPilot.set('number', cp.getInt('number') || 0)
        newPilot.set('status', 'ativo')
        app.save(newPilot)
        pilotId = newPilot.id
      }

      // 5.1 Criar Registration (Driver -> Registration -> Championship Edition)
      let regRecord = null
      const existingRegs = app.findRecordsByFilter(
        'registrations',
        `driver_id = "${pilotId}" && championship_edition_id = "${edition.id}"`,
        '',
        1,
        0,
      )
      if (existingRegs.length > 0) {
        regRecord = existingRegs[0]
      } else {
        regRecord = new Record(registrationsCol)
        regRecord.set('driver_id', pilotId)
        regRecord.set('championship_edition_id', edition.id)
        regRecord.set('car_number', cp.getInt('number') || 0)
        regRecord.set('car_class', cp.getString('car_class') || '')
        regRecord.set('status', cp.getString('registration_status') || 'aprovada')
        regRecord.set('payment_status', cp.getString('payment_status') || 'pago')
        regRecord.set('notes', cp.getString('notes') || 'Inscrição migrada do modelo legado')
        app.save(regRecord)
      }

      // 5.2 Se tiver equipe associada, criar/obter Team Participation, Sub-team e Driver Championship Representation
      const teamRawName = (cp.getString('team') || '').trim()
      if (teamRawName) {
        let teamRec = teamsCache[teamRawName]
        if (!teamRec) {
          const foundTeams = app.findRecordsByFilter('teams', `name = "${teamRawName}"`, '', 1, 0)
          if (foundTeams.length > 0) {
            teamRec = foundTeams[0]
          } else {
            teamRec = new Record(teamsCol)
            teamRec.set('name', teamRawName)
            teamRec.set('status', 'ativa')
            app.save(teamRec)
          }
          teamsCache[teamRawName] = teamRec
        }

        // Team Participation (UNIQUE: team_id, championship_edition_id)
        const teamPartKey = `${teamRec.id}_${edition.id}`
        let teamPartRec = teamPartCache[teamPartKey]
        if (!teamPartRec) {
          const foundPart = app.findRecordsByFilter(
            'team_participations',
            `team_id = "${teamRec.id}" && championship_edition_id = "${edition.id}"`,
            '',
            1,
            0,
          )
          if (foundPart.length > 0) {
            teamPartRec = foundPart[0]
          } else {
            teamPartRec = new Record(teamPartCol)
            teamPartRec.set('team_id', teamRec.id)
            teamPartRec.set('championship_edition_id', edition.id)
            teamPartRec.set('status', 'confirmada')
            teamPartRec.set('notes', 'Participação gerada a partir das inscrições existentes')
            app.save(teamPartRec)
          }
          teamPartCache[teamPartKey] = teamPartRec
        }

        // Sub-team obrigatória dentro da Team Participation (mesmo que com nome da equipe)
        const subTeamKey = `${teamPartRec.id}_${teamRawName}`
        let subTeamRec = subTeamsCache[subTeamKey]
        if (!subTeamRec) {
          const foundSub = app.findRecordsByFilter(
            'sub_teams',
            `team_participation_id = "${teamPartRec.id}" && name = "${teamRawName}"`,
            '',
            1,
            0,
          )
          if (foundSub.length > 0) {
            subTeamRec = foundSub[0]
          } else {
            subTeamRec = new Record(subTeamsCol)
            subTeamRec.set('team_participation_id', teamPartRec.id)
            subTeamRec.set('name', teamRawName)
            subTeamRec.set('status', 'ativa')
            app.save(subTeamRec)
          }
          subTeamsCache[subTeamKey] = subTeamRec
        }

        // Driver Championship Representation
        const existingReps = app.findRecordsByFilter(
          'driver_championship_representations',
          `driver_id = "${pilotId}" && championship_edition_id = "${edition.id}" && status = "ativa"`,
          '',
          1,
          0,
        )
        if (existingReps.length === 0) {
          const rep = new Record(representationsCol)
          rep.set('driver_id', pilotId)
          rep.set('registration_id', regRecord.id)
          rep.set('championship_edition_id', edition.id)
          rep.set('team_participation_id', teamPartRec.id)
          rep.set('sub_team_id', subTeamRec.id)
          rep.set('start_date', '2025-01-01 00:00:00.000Z')
          rep.set('status', 'ativa')
          rep.set('change_reason', 'Representação desportiva inicial migrada')
          app.save(rep)
        }
      }
    }
  },
  (app) => {
    // Reversão segura
  },
)
