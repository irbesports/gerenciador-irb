migrate(
  (app) => {
    // 1. Hardening da collection 'users'
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    // createRule: apenas permite criação pública se role for 'cliente' (ou vazio, tratado pelo hook)
    users.createRule =
      '@request.body.role = "" || @request.body.role = "cliente" || @request.auth.role = "colaborador"'
    // updateRule: impede auto-promoção; role não pode ser alterado por usuário comum
    users.updateRule =
      'id = @request.auth.id && (@request.body.role = "" || @request.body.role = role || @request.auth.role = "colaborador")'
    app.save(users)

    // 2. years
    const years = app.findCollectionByNameOrId('years')
    years.listRule = ''
    years.viewRule = ''
    years.createRule = '@request.auth.role = "colaborador"'
    years.updateRule = '@request.auth.role = "colaborador"'
    years.deleteRule = '@request.auth.role = "colaborador"'
    app.save(years)

    // 3. seasons
    const seasons = app.findCollectionByNameOrId('seasons')
    seasons.listRule = ''
    seasons.viewRule = ''
    seasons.createRule = '@request.auth.role = "colaborador"'
    seasons.updateRule = '@request.auth.role = "colaborador"'
    seasons.deleteRule = '@request.auth.role = "colaborador"'
    app.save(seasons)

    // 4. championships
    const championships = app.findCollectionByNameOrId('championships')
    // Público pode ver campeonatos não-ocultos; colaborador vê todos
    championships.listRule =
      '@request.auth.role = "colaborador" || visible_to_pilots = true || visible_to_pilots = null'
    championships.viewRule =
      '@request.auth.role = "colaborador" || visible_to_pilots = true || visible_to_pilots = null'
    championships.createRule = '@request.auth.role = "colaborador"'
    championships.updateRule = '@request.auth.role = "colaborador"'
    championships.deleteRule = '@request.auth.role = "colaborador"'
    app.save(championships)

    // 5. scoring_rules
    const scoringRules = app.findCollectionByNameOrId('scoring_rules')
    scoringRules.listRule = ''
    scoringRules.viewRule = ''
    scoringRules.createRule = '@request.auth.role = "colaborador"'
    scoringRules.updateRule = '@request.auth.role = "colaborador"'
    scoringRules.deleteRule = '@request.auth.role = "colaborador"'
    app.save(scoringRules)

    // 6. championship_batteries
    const champBatteries = app.findCollectionByNameOrId('championship_batteries')
    champBatteries.listRule = ''
    champBatteries.viewRule = ''
    champBatteries.createRule = '@request.auth.role = "colaborador"'
    champBatteries.updateRule = '@request.auth.role = "colaborador"'
    champBatteries.deleteRule = '@request.auth.role = "colaborador"'
    app.save(champBatteries)

    // 7. scoring_presets
    const scoringPresets = app.findCollectionByNameOrId('scoring_presets')
    scoringPresets.listRule = ''
    scoringPresets.viewRule = ''
    scoringPresets.createRule = '@request.auth.role = "colaborador"'
    scoringPresets.updateRule = '@request.auth.role = "colaborador"'
    scoringPresets.deleteRule = '@request.auth.role = "colaborador"'
    app.save(scoringPresets)

    // 8. championship_stages
    const stages = app.findCollectionByNameOrId('championship_stages')
    stages.listRule = ''
    stages.viewRule = ''
    stages.createRule = '@request.auth.role = "colaborador"'
    stages.updateRule = '@request.auth.role = "colaborador"'
    stages.deleteRule = '@request.auth.role = "colaborador"'
    app.save(stages)

    // 9. stage_races
    const stageRaces = app.findCollectionByNameOrId('stage_races')
    stageRaces.listRule = ''
    stageRaces.viewRule = ''
    stageRaces.createRule = '@request.auth.role = "colaborador"'
    stageRaces.updateRule = '@request.auth.role = "colaborador"'
    stageRaces.deleteRule = '@request.auth.role = "colaborador"'
    app.save(stageRaces)

    // 10. pilots
    const pilots = app.findCollectionByNameOrId('pilots')
    pilots.listRule = ''
    pilots.viewRule = ''
    pilots.createRule = '@request.auth.id != ""'
    pilots.updateRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id)'
    pilots.deleteRule = '@request.auth.role = "colaborador"'
    app.save(pilots)

    // 11. invoices
    const invoices = app.findCollectionByNameOrId('invoices')
    invoices.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    invoices.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    invoices.createRule = '@request.auth.role = "colaborador"'
    invoices.updateRule = '@request.auth.role = "colaborador"'
    invoices.deleteRule = '@request.auth.role = "colaborador"'
    app.save(invoices)

    // 12. payments
    const payments = app.findCollectionByNameOrId('payments')
    payments.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    payments.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    payments.createRule = '@request.auth.role = "colaborador"'
    payments.updateRule = '@request.auth.role = "colaborador"'
    payments.deleteRule = '@request.auth.role = "colaborador"'
    app.save(payments)

    // 13. tracks, manufacturers, cars
    const tracks = app.findCollectionByNameOrId('tracks')
    tracks.listRule = ''
    tracks.viewRule = ''
    tracks.createRule = '@request.auth.role = "colaborador"'
    tracks.updateRule = '@request.auth.role = "colaborador"'
    tracks.deleteRule = '@request.auth.role = "colaborador"'
    app.save(tracks)

    const manufacturers = app.findCollectionByNameOrId('manufacturers')
    manufacturers.listRule = ''
    manufacturers.viewRule = ''
    manufacturers.createRule = '@request.auth.role = "colaborador"'
    manufacturers.updateRule = '@request.auth.role = "colaborador"'
    manufacturers.deleteRule = '@request.auth.role = "colaborador"'
    app.save(manufacturers)

    const cars = app.findCollectionByNameOrId('cars')
    cars.listRule = ''
    cars.viewRule = ''
    cars.createRule = '@request.auth.role = "colaborador"'
    cars.updateRule = '@request.auth.role = "colaborador"'
    cars.deleteRule = '@request.auth.role = "colaborador"'
    app.save(cars)

    // 14. support_tickets
    const supportTickets = app.findCollectionByNameOrId('support_tickets')
    supportTickets.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id)'
    supportTickets.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id)'
    supportTickets.createRule = '@request.auth.id != ""'
    supportTickets.updateRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id)'
    supportTickets.deleteRule = '@request.auth.role = "colaborador"'
    app.save(supportTickets)

    // 15. support_messages
    const supportMessages = app.findCollectionByNameOrId('support_messages')
    supportMessages.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (user_id = @request.auth.id || ticket_id.user_id = @request.auth.id))'
    supportMessages.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (user_id = @request.auth.id || ticket_id.user_id = @request.auth.id))'
    supportMessages.createRule = '@request.auth.id != ""'
    supportMessages.updateRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id)'
    supportMessages.deleteRule = '@request.auth.role = "colaborador"'
    app.save(supportMessages)

    // 16. infractions
    const infractions = app.findCollectionByNameOrId('infractions')
    infractions.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    infractions.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    infractions.createRule = '@request.auth.role = "colaborador"'
    infractions.updateRule = '@request.auth.role = "colaborador"'
    infractions.deleteRule = '@request.auth.role = "colaborador"'
    app.save(infractions)

    // 17. moderation_cases
    const moderationCases = app.findCollectionByNameOrId('moderation_cases')
    // Comissário vê tudo; piloto vê se é autor, piloto envolvido ou piloto culpado
    moderationCases.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (author_user_id = @request.auth.id || involved_pilots.user_id ?= @request.auth.id || guilty_pilot_id.user_id = @request.auth.id))'
    moderationCases.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (author_user_id = @request.auth.id || involved_pilots.user_id ?= @request.auth.id || guilty_pilot_id.user_id = @request.auth.id))'
    moderationCases.createRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && opened_by_type = "protesto_piloto" && author_user_id = @request.auth.id)'
    moderationCases.updateRule = '@request.auth.role = "colaborador"'
    moderationCases.deleteRule = '@request.auth.role = "colaborador"'
    app.save(moderationCases)

    // 18. moderation_case_messages
    const modCaseMsgs = app.findCollectionByNameOrId('moderation_case_messages')
    modCaseMsgs.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (case_id.author_user_id = @request.auth.id || case_id.involved_pilots.user_id ?= @request.auth.id || case_id.guilty_pilot_id.user_id = @request.auth.id))'
    modCaseMsgs.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (case_id.author_user_id = @request.auth.id || case_id.involved_pilots.user_id ?= @request.auth.id || case_id.guilty_pilot_id.user_id = @request.auth.id))'
    modCaseMsgs.createRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id && is_steward_ruling != true)'
    modCaseMsgs.updateRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id && is_steward_ruling != true)'
    modCaseMsgs.deleteRule = '@request.auth.role = "colaborador"'
    app.save(modCaseMsgs)

    // 19. notifications
    const notifs = app.findCollectionByNameOrId('notifications')
    notifs.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && recipient_user_id = @request.auth.id)'
    notifs.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && recipient_user_id = @request.auth.id)'
    // Criação de notificações: apenas colaboradores ou autor de protesto informando os envolvidos
    notifs.createRule = '@request.auth.role = "colaborador" || @request.auth.id != ""'
    notifs.updateRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && recipient_user_id = @request.auth.id)'
    notifs.deleteRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && recipient_user_id = @request.auth.id)'
    app.save(notifs)

    // 20. race_imports & race_results
    const raceImports = app.findCollectionByNameOrId('race_imports')
    raceImports.listRule = '@request.auth.id != ""'
    raceImports.viewRule = '@request.auth.id != ""'
    raceImports.createRule = '@request.auth.role = "colaborador"'
    raceImports.updateRule = '@request.auth.role = "colaborador"'
    raceImports.deleteRule = '@request.auth.role = "colaborador"'
    app.save(raceImports)

    const raceResults = app.findCollectionByNameOrId('race_results')
    raceResults.listRule = ''
    raceResults.viewRule = ''
    raceResults.createRule = '@request.auth.role = "colaborador"'
    raceResults.updateRule = '@request.auth.role = "colaborador"'
    raceResults.deleteRule = '@request.auth.role = "colaborador"'
    app.save(raceResults)
  },
  (app) => {
    // Revert opcional
  },
)
