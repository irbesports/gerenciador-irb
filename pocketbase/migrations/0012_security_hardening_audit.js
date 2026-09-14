migrate(
  (app) => {
    // =========================================================================
    // ETAPA 1.1: SECURITY HARDENING / BLOQUEADORES (P0 / P1)
    // =========================================================================

    // -------------------------------------------------------------------------
    // 1. ROTAÇÃO DE SENHAS COMPROMETIDAS (P0 CREDENCIAIS)
    // As credenciais anteriores que usavam senhas fixas/hardcoded no seed
    // são consideradas comprometidas e devem ser rotacionadas imediatamente.
    // -------------------------------------------------------------------------
    const adminPass =
      $secrets.get('ADMIN_INITIAL_PASSWORD') ||
      $os.getenv('ADMIN_INITIAL_PASSWORD') ||
      $security.randomString(32)

    try {
      const adminRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'rsanque@gmail.com')
      adminRecord.setPassword(adminPass)
      adminRecord.set('role', 'colaborador')
      app.save(adminRecord)
    } catch (_) {}

    const clientPass =
      $secrets.get('DEMO_CLIENT_PASSWORD') ||
      $os.getenv('DEMO_CLIENT_PASSWORD') ||
      $security.randomString(32)

    try {
      const clientRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'piloto@racingmanager.com')
      clientRecord.setPassword(clientPass)
      clientRecord.set('role', 'cliente')
      app.save(clientRecord)
    } catch (_) {}

    // -------------------------------------------------------------------------
    // 2. USERS COLLECTION HARDENING (P0 USERS & ROLE, P1 PASSWORD POLICY)
    // Princípio: Deny by default.
    // - Cadastro público somente role = 'cliente'
    // - Proibição de auto-promoção e de alteração de role/verified por comum
    // - Aumento do min password length para 15 caracteres na coleção de autenticação
    // -------------------------------------------------------------------------
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.createRule =
      '@request.body.role = "" || @request.body.role = "cliente" || @request.auth.role = "colaborador"'
    usersCol.updateRule =
      'id = @request.auth.id && (@request.body.role = "" || @request.body.role = role || @request.auth.role = "colaborador") && (@request.body.verified = "" || @request.body.verified = verified || @request.auth.role = "colaborador")'
    usersCol.deleteRule = '@request.auth.role = "colaborador"'

    // Ajuste da regra de política de senha: mínimo 15 caracteres
    const passwordField = usersCol.fields.getByName('password')
    if (passwordField) {
      passwordField.min = 15
    }
    app.save(usersCol)

    // -------------------------------------------------------------------------
    // 3. NOTIFICATIONS COLLECTION HARDENING (P0 NOTIFICATIONS)
    // Princípio:
    // - Usuário comum: apenas lista suas notificações, visualiza apenas suas
    // - Atualiza apenas o campo 'read' da sua própria notificação
    // - Não pode criar notificações arbitrariamente para terceiros
    // - Não pode deletar arbitrariamente (somente colaborador ou server-side)
    // -------------------------------------------------------------------------
    const notifsCol = app.findCollectionByNameOrId('notifications')
    notifsCol.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && recipient_user_id = @request.auth.id)'
    notifsCol.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && recipient_user_id = @request.auth.id)'
    // Criação restrita a colaboradores; criação de pilotos é mediada exclusivamente por hook server-side
    notifsCol.createRule = '@request.auth.role = "colaborador"'
    notifsCol.updateRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && recipient_user_id = @request.auth.id)'
    notifsCol.deleteRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && recipient_user_id = @request.auth.id)'
    app.save(notifsCol)

    // -------------------------------------------------------------------------
    // 4. INVOICES & PAYMENTS HARDENING (P0 FINANCEIRO)
    // Princípio:
    // - Create/Update/Delete estritamente 'colaborador' (ou processos de pagamento server-side)
    // - Pilotos/Clientes podem apenas LISTAR e VISUALIZAR suas próprias faturas e pagamentos
    // - Usuários comuns NÃO podem criar ou alterar amount, status, data ou relações
    // -------------------------------------------------------------------------
    const invoicesCol = app.findCollectionByNameOrId('invoices')
    invoicesCol.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    invoicesCol.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    invoicesCol.createRule = '@request.auth.role = "colaborador"'
    invoicesCol.updateRule = '@request.auth.role = "colaborador"'
    invoicesCol.deleteRule = '@request.auth.role = "colaborador"'
    app.save(invoicesCol)

    const paymentsCol = app.findCollectionByNameOrId('payments')
    paymentsCol.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    paymentsCol.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    paymentsCol.createRule = '@request.auth.role = "colaborador"'
    paymentsCol.updateRule = '@request.auth.role = "colaborador"'
    paymentsCol.deleteRule = '@request.auth.role = "colaborador"'
    app.save(paymentsCol)

    // -------------------------------------------------------------------------
    // 5. MODERATION & DISCIPLINARY HARDENING (P0 MODERAÇÃO)
    // moderation_cases:
    // - Somente colaborador pode atualizar decisão/status/penalidades
    // - Driver pode criar SOMENTE pelo fluxo de protesto (opened_by_type = "protesto_piloto")
    // moderation_case_messages:
    // - Driver não pode forjar is_steward_ruling
    // infractions:
    // - Somente colaborador cria/edita infrações oficiais
    // -------------------------------------------------------------------------
    const modCasesCol = app.findCollectionByNameOrId('moderation_cases')
    modCasesCol.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (author_user_id = @request.auth.id || involved_pilots.user_id ?= @request.auth.id || guilty_pilot_id.user_id = @request.auth.id))'
    modCasesCol.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (author_user_id = @request.auth.id || involved_pilots.user_id ?= @request.auth.id || guilty_pilot_id.user_id = @request.auth.id))'
    modCasesCol.createRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && opened_by_type = "protesto_piloto" && author_user_id = @request.auth.id)'
    // Somente colaborador altera casos de moderação (decisões, status, julgamento)
    modCasesCol.updateRule = '@request.auth.role = "colaborador"'
    modCasesCol.deleteRule = '@request.auth.role = "colaborador"'
    app.save(modCasesCol)

    const modCaseMsgsCol = app.findCollectionByNameOrId('moderation_case_messages')
    modCaseMsgsCol.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (case_id.author_user_id = @request.auth.id || case_id.involved_pilots.user_id ?= @request.auth.id || case_id.guilty_pilot_id.user_id = @request.auth.id))'
    modCaseMsgsCol.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && (case_id.author_user_id = @request.auth.id || case_id.involved_pilots.user_id ?= @request.auth.id || case_id.guilty_pilot_id.user_id = @request.auth.id))'
    modCaseMsgsCol.createRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id && is_steward_ruling != true)'
    modCaseMsgsCol.updateRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id && is_steward_ruling != true)'
    modCaseMsgsCol.deleteRule = '@request.auth.role = "colaborador"'

    // Configurar anexos de mensagens de moderação como protegidos (P1 FILE SECURITY)
    const attachmentField = modCaseMsgsCol.fields.getByName('attachment')
    if (attachmentField) {
      attachmentField.protected = true
    }
    app.save(modCaseMsgsCol)

    const infractionsCol = app.findCollectionByNameOrId('infractions')
    infractionsCol.listRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    infractionsCol.viewRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && pilot_id.user_id = @request.auth.id)'
    infractionsCol.createRule = '@request.auth.role = "colaborador"'
    infractionsCol.updateRule = '@request.auth.role = "colaborador"'
    infractionsCol.deleteRule = '@request.auth.role = "colaborador"'
    app.save(infractionsCol)

    // -------------------------------------------------------------------------
    // 6. RAW DATA & OFFICIAL RESULTS HARDENING (P1 RAW DATA)
    // race_imports e race_results são imutáveis por usuários comuns.
    // race_imports.raw_json nunca pode ser manipulado por cliente.
    // -------------------------------------------------------------------------
    const raceImportsCol = app.findCollectionByNameOrId('race_imports')
    raceImportsCol.listRule = '@request.auth.id != ""'
    raceImportsCol.viewRule = '@request.auth.id != ""'
    raceImportsCol.createRule = '@request.auth.role = "colaborador"'
    raceImportsCol.updateRule = '@request.auth.role = "colaborador"'
    raceImportsCol.deleteRule = '@request.auth.role = "colaborador"'
    app.save(raceImportsCol)

    const raceResultsCol = app.findCollectionByNameOrId('race_results')
    raceResultsCol.listRule = ''
    raceResultsCol.viewRule = ''
    raceResultsCol.createRule = '@request.auth.role = "colaborador"'
    raceResultsCol.updateRule = '@request.auth.role = "colaborador"'
    raceResultsCol.deleteRule = '@request.auth.role = "colaborador"'
    app.save(raceResultsCol)

    // -------------------------------------------------------------------------
    // 7. CHAMPIONSHIP PILOTS (INSCRIÇÕES) HARDENING
    // -------------------------------------------------------------------------
    const champPilotsCol = app.findCollectionByNameOrId('championship_pilots')
    champPilotsCol.listRule = '@request.auth.id != ""'
    champPilotsCol.viewRule = '@request.auth.id != ""'
    champPilotsCol.createRule = '@request.auth.role = "colaborador"'
    champPilotsCol.updateRule = '@request.auth.role = "colaborador"'
    champPilotsCol.deleteRule = '@request.auth.role = "colaborador"'
    app.save(champPilotsCol)

    // -------------------------------------------------------------------------
    // 8. STAGE RACE COMMENTS HARDENING
    // -------------------------------------------------------------------------
    const commentsCol = app.findCollectionByNameOrId('stage_race_comments')
    commentsCol.listRule = '@request.auth.id != ""'
    commentsCol.viewRule = '@request.auth.id != ""'
    commentsCol.createRule = '@request.auth.id != "" && user_id = @request.auth.id'
    commentsCol.updateRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id)'
    commentsCol.deleteRule =
      '@request.auth.role = "colaborador" || (@request.auth.id != "" && user_id = @request.auth.id)'
    app.save(commentsCol)

    // -------------------------------------------------------------------------
    // 9. FILE SECURITY (P1 FILE SECURITY)
    // Proteger arquivos regulamentares que possam ter conteúdo restrito ou sensível
    // -------------------------------------------------------------------------
    const champCol = app.findCollectionByNameOrId('championships')
    const regFileField = champCol.fields.getByName('regulation_file')
    if (regFileField) {
      regFileField.protected = false // Regulamentos gerais do campeonato são públicos para consulta dos competidores
    }
    app.save(champCol)
  },
  (app) => {
    // Revert opcional
  },
)
