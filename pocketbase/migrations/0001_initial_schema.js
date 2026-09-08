migrate(
  (app) => {
    // 1. Update users collection: add 'role' field
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['cliente', 'colaborador'],
          maxSelect: 1,
        }),
      )
      app.save(users)
    }

    // 2. years
    const years = new Collection({
      name: 'years',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        { name: 'year', type: 'number', required: true, onlyInt: true },
        { name: 'name', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_years_year ON years (year)'],
    })
    app.save(years)
    const yearsId = years.id

    // 3. seasons
    const seasons = new Collection({
      name: 'seasons',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        { name: 'year_id', type: 'relation', required: true, collectionId: yearsId, maxSelect: 1 },
        { name: 'name', type: 'text', required: true },
        { name: 'start_date', type: 'date' },
        { name: 'end_date', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: ['planejada', 'ativa', 'concluida'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_seasons_year_id ON seasons (year_id)'],
    })
    app.save(seasons)
    const seasonsId = seasons.id

    // 4. championships
    const championships = new Collection({
      name: 'championships',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        {
          name: 'season_id',
          type: 'relation',
          required: true,
          collectionId: seasonsId,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['rascunho', 'ativo', 'concluido'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_championships_season_id ON championships (season_id)'],
    })
    app.save(championships)
    const championshipsId = championships.id

    // 5. scoring_rules
    const scoringRules = new Collection({
      name: 'scoring_rules',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        {
          name: 'championship_id',
          type: 'relation',
          required: true,
          collectionId: championshipsId,
          maxSelect: 1,
        },
        { name: 'position', type: 'number', required: true, onlyInt: true },
        { name: 'points', type: 'number', required: true, onlyInt: true },
        { name: 'bonus_fastest_lap', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_scoring_rules_championship_id ON scoring_rules (championship_id)',
      ],
    })
    app.save(scoringRules)

    // 6. pilots
    const pilots = new Collection({
      name: 'pilots',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        { name: 'user_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'name', type: 'text', required: true },
        { name: 'number', type: 'number', onlyInt: true },
        { name: 'team_name', type: 'text' },
        { name: 'avatar', type: 'file', maxSelect: 1, maxSize: 5242880 },
        { name: 'status', type: 'select', values: ['ativo', 'inativo'], maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pilots_user_id ON pilots (user_id)'],
    })
    app.save(pilots)
    const pilotsId = pilots.id

    // 7. infractions
    const infractions = new Collection({
      name: 'infractions',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        {
          name: 'pilot_id',
          type: 'relation',
          required: true,
          collectionId: pilotsId,
          maxSelect: 1,
        },
        {
          name: 'championship_id',
          type: 'relation',
          required: true,
          collectionId: championshipsId,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          values: [
            'ultrapassagem_perigosa',
            'toque_na_traseira',
            'bloqueio_de_trajetoria',
            'excesso_de_velocidade',
            'conduta_antidesportiva',
            'outros',
          ],
          maxSelect: 1,
        },
        { name: 'description', type: 'text' },
        { name: 'severity', type: 'select', values: ['baixa', 'media', 'alta'], maxSelect: 1 },
        {
          name: 'status',
          type: 'select',
          values: ['aberta', 'em_revisao', 'resolvida', 'descartada'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_infractions_pilot_id ON infractions (pilot_id)',
        'CREATE INDEX idx_infractions_championship_id ON infractions (championship_id)',
      ],
    })
    app.save(infractions)

    // 8. invoices
    const invoices = new Collection({
      name: 'invoices',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        {
          name: 'pilot_id',
          type: 'relation',
          required: true,
          collectionId: pilotsId,
          maxSelect: 1,
        },
        {
          name: 'championship_id',
          type: 'relation',
          required: true,
          collectionId: championshipsId,
          maxSelect: 1,
        },
        { name: 'amount', type: 'number', required: true },
        { name: 'description', type: 'text' },
        { name: 'due_date', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'pago', 'atrazado', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_invoices_pilot_id ON invoices (pilot_id)',
        'CREATE INDEX idx_invoices_championship_id ON invoices (championship_id)',
      ],
    })
    app.save(invoices)
    const invoicesId = invoices.id

    // 9. payments
    const payments = new Collection({
      name: 'payments',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        {
          name: 'invoice_id',
          type: 'relation',
          required: true,
          collectionId: invoicesId,
          maxSelect: 1,
        },
        {
          name: 'pilot_id',
          type: 'relation',
          required: true,
          collectionId: pilotsId,
          maxSelect: 1,
        },
        { name: 'amount', type: 'number', required: true },
        { name: 'payment_date', type: 'date' },
        {
          name: 'method',
          type: 'select',
          values: ['pix', 'cartao', 'transferencia', 'dinheiro'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_payments_invoice_id ON payments (invoice_id)'],
    })
    app.save(payments)

    // 10. tracks
    const tracks = new Collection({
      name: 'tracks',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'country', type: 'text' },
        { name: 'length', type: 'number' },
        { name: 'image', type: 'file', maxSelect: 1, maxSize: 5242880 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(tracks)

    // 11. manufacturers
    const manufacturers = new Collection({
      name: 'manufacturers',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'country', type: 'text' },
        { name: 'founded_year', type: 'number', onlyInt: true },
        { name: 'image', type: 'file', maxSelect: 1, maxSize: 5242880 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(manufacturers)
    const manufacturersId = manufacturers.id

    // 12. cars
    const cars = new Collection({
      name: 'cars',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        {
          name: 'manufacturer_id',
          type: 'relation',
          required: true,
          collectionId: manufacturersId,
          maxSelect: 1,
        },
        { name: 'model', type: 'text', required: true },
        { name: 'year', type: 'number', onlyInt: true },
        { name: 'category', type: 'text' },
        { name: 'image', type: 'file', maxSelect: 1, maxSize: 5242880 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_cars_manufacturer_id ON cars (manufacturer_id)'],
    })
    app.save(cars)

    // 13. support_tickets
    const supportTickets = new Collection({
      name: 'support_tickets',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        { name: 'user_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'subject', type: 'text', required: true },
        { name: 'content', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['aberto', 'em_andamento', 'resolvido', 'fechado'],
          maxSelect: 1,
        },
        { name: 'priority', type: 'select', values: ['baixa', 'media', 'alta'], maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(supportTickets)
    const supportTicketsId = supportTickets.id

    // 14. support_messages
    const supportMessages = new Collection({
      name: 'support_messages',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.role = "colaborador"',
      fields: [
        {
          name: 'ticket_id',
          type: 'relation',
          required: true,
          collectionId: supportTicketsId,
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'content', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_support_messages_ticket_id ON support_messages (ticket_id)'],
    })
    app.save(supportMessages)
  },
  (app) => {
    const toDrop = [
      'support_messages',
      'support_tickets',
      'cars',
      'manufacturers',
      'tracks',
      'payments',
      'invoices',
      'infractions',
      'pilots',
      'scoring_rules',
      'championships',
      'seasons',
      'years',
    ]
    for (const name of toDrop) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
