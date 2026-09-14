migrate(
  (app) => {
    const championships = app.findCollectionByNameOrId('championships')
    const seasons = app.findCollectionByNameOrId('seasons')
    const pilots = app.findCollectionByNameOrId('pilots')
    const tracks = app.findCollectionByNameOrId('tracks')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. championship_editions
    let championshipEditionsCol
    try {
      championshipEditionsCol = app.findCollectionByNameOrId('championship_editions')
    } catch (_) {
      championshipEditionsCol = new Collection({
        name: 'championship_editions',
        type: 'base',
        listRule:
          '@request.auth.role = "colaborador" || visible_to_pilots = true || visible_to_pilots = null',
        viewRule:
          '@request.auth.role = "colaborador" || visible_to_pilots = true || visible_to_pilots = null',
        createRule: '@request.auth.role = "colaborador"',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'championship_id',
            type: 'relation',
            required: true,
            collectionId: championships.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'season_id',
            type: 'relation',
            required: true,
            collectionId: seasons.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'edition_code', type: 'text' },
          { name: 'custom_title', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['rascunho', 'ativo', 'concluido'],
            maxSelect: 1,
            required: true,
          },
          { name: 'start_date', type: 'date' },
          { name: 'end_date', type: 'date' },
          { name: 'visible_to_pilots', type: 'bool' },
          { name: 'stages_scoring', type: 'json' },
          { name: 'regulation_rules', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_championship_editions_champ_season ON championship_editions (championship_id, season_id)',
          'CREATE INDEX idx_championship_editions_season ON championship_editions (season_id)',
        ],
      })
      app.save(championshipEditionsCol)
    }

    // 2. teams
    let teamsCol
    try {
      teamsCol = app.findCollectionByNameOrId('teams')
    } catch (_) {
      teamsCol = new Collection({
        name: 'teams',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.role = "colaborador" || @request.auth.id != ""',
        updateRule:
          '@request.auth.role = "colaborador" || (@request.auth.id != "" && owner_id = @request.auth.id)',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'short_name', type: 'text' },
          { name: 'logo', type: 'file', maxSelect: 1, maxSize: 5242880 },
          { name: 'description', type: 'text' },
          { name: 'country_code', type: 'text' },
          {
            name: 'owner_id',
            type: 'relation',
            collectionId: users.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'status',
            type: 'select',
            values: ['ativa', 'inativa'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_teams_name ON teams (name)'],
      })
      app.save(teamsCol)
    }

    // 3. team_participations (Team -> Team Participation -> Championship Edition)
    let teamParticipationsCol
    try {
      teamParticipationsCol = app.findCollectionByNameOrId('team_participations')
    } catch (_) {
      teamParticipationsCol = new Collection({
        name: 'team_participations',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.role = "colaborador" || @request.auth.id != ""',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'team_id',
            type: 'relation',
            required: true,
            collectionId: teamsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'championship_edition_id',
            type: 'relation',
            required: true,
            collectionId: championshipEditionsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'status',
            type: 'select',
            values: ['inscrita', 'confirmada', 'suspensa', 'encerrada'],
            maxSelect: 1,
          },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_team_part_unique ON team_participations (team_id, championship_edition_id)',
          'CREATE INDEX idx_team_part_edition ON team_participations (championship_edition_id)',
        ],
      })
      app.save(teamParticipationsCol)
    }

    // 4. sub_teams (Team -> Team Participation -> Sub-team)
    let subTeamsCol
    try {
      subTeamsCol = app.findCollectionByNameOrId('sub_teams')
    } catch (_) {
      subTeamsCol = new Collection({
        name: 'sub_teams',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.role = "colaborador" || @request.auth.id != ""',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'team_participation_id',
            type: 'relation',
            required: true,
            collectionId: teamParticipationsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'identifier', type: 'text' },
          { name: 'car_class', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['ativa', 'inativa'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sub_teams_part_name ON sub_teams (team_participation_id, name)',
          'CREATE INDEX idx_sub_teams_part ON sub_teams (team_participation_id)',
        ],
      })
      app.save(subTeamsCol)
    }

    // 5. team_memberships (Driver <-> Team organizational relationship)
    let teamMembershipsCol
    try {
      teamMembershipsCol = app.findCollectionByNameOrId('team_memberships')
    } catch (_) {
      teamMembershipsCol = new Collection({
        name: 'team_memberships',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.role = "colaborador" || @request.auth.id != ""',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'driver_id',
            type: 'relation',
            required: true,
            collectionId: pilots.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'team_id',
            type: 'relation',
            required: true,
            collectionId: teamsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'role',
            type: 'select',
            values: ['driver', 'team_manager', 'spotter', 'engineer'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: ['ativo', 'encerrado', 'suspenso'],
            maxSelect: 1,
            required: true,
          },
          { name: 'start_date', type: 'date', required: true },
          { name: 'end_date', type: 'date' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_team_memberships_driver ON team_memberships (driver_id)',
          'CREATE INDEX idx_team_memberships_team ON team_memberships (team_id)',
          'CREATE INDEX idx_team_memberships_status ON team_memberships (driver_id, status)',
        ],
      })
      app.save(teamMembershipsCol)
    }

    // 6. registrations (Driver -> Registration -> Championship Edition)
    // INDEPENDENTE de Team
    let registrationsCol
    try {
      registrationsCol = app.findCollectionByNameOrId('registrations')
    } catch (_) {
      registrationsCol = new Collection({
        name: 'registrations',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule:
          '@request.auth.role = "colaborador" || (@request.auth.id != "" && driver_id.user_id = @request.auth.id)',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'driver_id',
            type: 'relation',
            required: true,
            collectionId: pilots.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'championship_edition_id',
            type: 'relation',
            required: true,
            collectionId: championshipEditionsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'car_number', type: 'number', onlyInt: true },
          { name: 'car_class', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['pendente', 'aprovada', 'recusada', 'cancelada'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'payment_status',
            type: 'select',
            values: ['pendente', 'pago', 'isento', 'reembolsado', 'cancelado'],
            maxSelect: 1,
          },
          { name: 'approved_at', type: 'date' },
          { name: 'paid_at', type: 'date' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_registrations_driver_edition ON registrations (driver_id, championship_edition_id)',
          'CREATE INDEX idx_registrations_edition ON registrations (championship_edition_id)',
        ],
      })
      app.save(registrationsCol)
    }

    // 7. driver_championship_representations
    // Histórico de representação esportiva de Driver para Sub-team dentro da Edition
    let representationsCol
    try {
      representationsCol = app.findCollectionByNameOrId('driver_championship_representations')
    } catch (_) {
      representationsCol = new Collection({
        name: 'driver_championship_representations',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.role = "colaborador"',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'driver_id',
            type: 'relation',
            required: true,
            collectionId: pilots.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'registration_id',
            type: 'relation',
            required: true,
            collectionId: registrationsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'championship_edition_id',
            type: 'relation',
            required: true,
            collectionId: championshipEditionsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'team_participation_id',
            type: 'relation',
            required: true,
            collectionId: teamParticipationsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'sub_team_id',
            type: 'relation',
            required: true,
            collectionId: subTeamsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'start_date', type: 'date', required: true },
          { name: 'end_date', type: 'date' },
          {
            name: 'status',
            type: 'select',
            values: ['ativa', 'encerrada', 'transferida'],
            maxSelect: 1,
            required: true,
          },
          { name: 'change_reason', type: 'text' },
          { name: 'previous_representation_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_driver_rep_driver ON driver_championship_representations (driver_id)',
          'CREATE INDEX idx_driver_rep_edition ON driver_championship_representations (championship_edition_id)',
          'CREATE INDEX idx_driver_rep_subteam ON driver_championship_representations (sub_team_id)',
          'CREATE INDEX idx_driver_rep_active ON driver_championship_representations (driver_id, championship_edition_id, status)',
        ],
      })
      app.save(representationsCol)
    }

    // 8. sessions (independente de quantidades fixas de Race 1/Race 2; Stage -> Session)
    let sessionsCol
    try {
      sessionsCol = app.findCollectionByNameOrId('sessions')
    } catch (_) {
      sessionsCol = new Collection({
        name: 'sessions',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.role = "colaborador"',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'stage_id',
            type: 'relation',
            required: true,
            collectionId: app.findCollectionByNameOrId('championship_stages').id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'name', type: 'text', required: true },
          {
            name: 'session_type',
            type: 'select',
            values: ['practice', 'qualifying', 'race', 'warmup', 'heat', 'feature'],
            maxSelect: 1,
            required: true,
          },
          { name: 'order', type: 'number', required: true, onlyInt: true },
          {
            name: 'duration_type',
            type: 'select',
            values: ['Minutos', 'Voltas', 'Horas'],
            maxSelect: 1,
          },
          { name: 'duration', type: 'number', onlyInt: true },
          { name: 'scheduled_time', type: 'date' },
          { name: 'weather_config', type: 'text' },
          { name: 'inverted_positions', type: 'number', onlyInt: true },
          {
            name: 'status',
            type: 'select',
            values: ['agendada', 'em_andamento', 'concluida', 'cancelada'],
            maxSelect: 1,
          },
          { name: 'legacy_stage_race_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sessions_stage ON sessions (stage_id)',
          'CREATE INDEX idx_sessions_stage_order ON sessions (stage_id, order)',
        ],
      })
      app.save(sessionsCol)
    }

    // 9. domain_audit_logs (auditoria de eventos desportivos e organizacionais)
    let auditLogsCol
    try {
      auditLogsCol = app.findCollectionByNameOrId('domain_audit_logs')
    } catch (_) {
      auditLogsCol = new Collection({
        name: 'domain_audit_logs',
        type: 'base',
        listRule: '@request.auth.role = "colaborador"',
        viewRule: '@request.auth.role = "colaborador"',
        createRule: '@request.auth.id != ""',
        updateRule: null, // imutável
        deleteRule: null, // imutável
        fields: [
          {
            name: 'actor_user_id',
            type: 'relation',
            collectionId: users.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'event_type', type: 'text', required: true },
          { name: 'entity_name', type: 'text', required: true },
          { name: 'entity_id', type: 'text', required: true },
          { name: 'previous_state', type: 'json' },
          { name: 'new_state', type: 'json' },
          { name: 'reason', type: 'text' },
          { name: 'context', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_audit_entity ON domain_audit_logs (entity_name, entity_id)',
          'CREATE INDEX idx_audit_event ON domain_audit_logs (event_type)',
        ],
      })
      app.save(auditLogsCol)
    }

    // 10. Atualizar championship_stages com campo opcional championship_edition_id
    const stagesCol = app.findCollectionByNameOrId('championship_stages')
    if (!stagesCol.fields.getByName('championship_edition_id')) {
      stagesCol.fields.add(
        new RelationField({
          name: 'championship_edition_id',
          collectionId: championshipEditionsCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(stagesCol)
      stagesCol.addIndex('idx_stages_edition', false, 'championship_edition_id', '')
      app.save(stagesCol)
    }
  },
  (app) => {
    // Reversão
  },
)
