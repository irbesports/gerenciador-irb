migrate(
  (app) => {
    // 1. Add regulation fields to championships collection if not present
    const champCol = app.findCollectionByNameOrId('championships')
    if (!champCol.fields.getByName('regulation_text')) {
      champCol.fields.add(new EditorField({ name: 'regulation_text' }))
    }
    if (!champCol.fields.getByName('regulation_file')) {
      champCol.fields.add(
        new FileField({
          name: 'regulation_file',
          maxSelect: 1,
          maxSize: 20971520, // 20MB
          mimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        }),
      )
    }
    if (!champCol.fields.getByName('regulation_rules')) {
      // List of punishable items / infractions extracted from regulation
      champCol.fields.add(new JSONField({ name: 'regulation_rules' }))
    }
    app.save(champCol)

    // 2. Resolve collections for relations
    const stageRaces = app.findCollectionByNameOrId('stage_races')
    const championships = app.findCollectionByNameOrId('championships')
    const pilots = app.findCollectionByNameOrId('pilots')

    // 3. Create moderation_cases collection
    let modCasesCol
    try {
      modCasesCol = app.findCollectionByNameOrId('moderation_cases')
    } catch (_) {
      modCasesCol = new Collection({
        name: 'moderation_cases',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'stage_race_id',
            type: 'relation',
            required: true,
            collectionId: stageRaces.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'championship_id',
            type: 'relation',
            required: true,
            collectionId: championships.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'lap', type: 'number', onlyInt: true, required: true },
          {
            name: 'involved_pilots',
            type: 'relation',
            collectionId: pilots.id,
            maxSelect: 10,
          },
          {
            name: 'guilty_pilot_id',
            type: 'relation',
            collectionId: pilots.id,
            maxSelect: 1,
          },
          {
            name: 'opened_by_type',
            type: 'select',
            values: ['comissarios', 'protesto_piloto'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'author_user_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          {
            name: 'author_pilot_id',
            type: 'relation',
            collectionId: pilots.id,
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: [
              'Em análise',
              'Aplicado em corrida',
              'Aplicado pós corrida',
              'Nenhuma ação necessária',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'infraction_cited', type: 'text' },
          { name: 'penalty_applied', type: 'text' },
          { name: 'description', type: 'text' },
          { name: 'deadline', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mod_cases_race ON moderation_cases (stage_race_id)',
          'CREATE INDEX idx_mod_cases_champ ON moderation_cases (championship_id)',
          'CREATE INDEX idx_mod_cases_status ON moderation_cases (status)',
        ],
      })
      app.save(modCasesCol)
    }

    // 4. Create moderation_case_messages (responses/thread)
    let modMessagesCol
    try {
      modMessagesCol = app.findCollectionByNameOrId('moderation_case_messages')
    } catch (_) {
      modMessagesCol = new Collection({
        name: 'moderation_case_messages',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != "" && user_id = @request.auth.id',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'case_id',
            type: 'relation',
            required: true,
            collectionId: modCasesCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          {
            name: 'pilot_id',
            type: 'relation',
            collectionId: pilots.id,
            maxSelect: 1,
          },
          { name: 'message', type: 'text', required: true },
          { name: 'attachment', type: 'file', maxSelect: 1, maxSize: 10485760 },
          { name: 'is_steward_ruling', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_mod_msg_case ON moderation_case_messages (case_id)'],
      })
      app.save(modMessagesCol)
    }

    // 5. Create notifications collection
    let notificationsCol
    try {
      notificationsCol = app.findCollectionByNameOrId('notifications')
    } catch (_) {
      notificationsCol = new Collection({
        name: 'notifications',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          {
            name: 'recipient_user_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          {
            name: 'recipient_pilot_id',
            type: 'relation',
            collectionId: pilots.id,
            maxSelect: 1,
          },
          {
            name: 'type',
            type: 'select',
            values: ['protesto', 'comissarios', 'decisao', 'geral'],
            maxSelect: 1,
            required: true,
          },
          { name: 'title', type: 'text', required: true },
          { name: 'message', type: 'text', required: true },
          { name: 'target_link', type: 'text' },
          { name: 'read', type: 'bool' },
          {
            name: 'moderation_case_id',
            type: 'relation',
            collectionId: modCasesCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_notif_user ON notifications (recipient_user_id)',
          'CREATE INDEX idx_notif_pilot ON notifications (recipient_pilot_id)',
          'CREATE INDEX idx_notif_read ON notifications (read)',
        ],
      })
      app.save(notificationsCol)
    }
  },
  (app) => {
    try {
      const notif = app.findCollectionByNameOrId('notifications')
      app.delete(notif)
    } catch (_) {}
    try {
      const msg = app.findCollectionByNameOrId('moderation_case_messages')
      app.delete(msg)
    } catch (_) {}
    try {
      const mc = app.findCollectionByNameOrId('moderation_cases')
      app.delete(mc)
    } catch (_) {}
    try {
      const champCol = app.findCollectionByNameOrId('championships')
      champCol.fields.removeByName('regulation_text')
      champCol.fields.removeByName('regulation_file')
      champCol.fields.removeByName('regulation_rules')
      app.save(champCol)
    } catch (_) {}
  },
)
