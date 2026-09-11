/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Criar coleção 'series' (entidade SÉRIE: 1 campeonato = 1 série, competição própria de referência)
    const seriesCollection = new Collection({
      name: 'series',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'short_name',
          type: 'text',
        },
        {
          name: 'description',
          type: 'text',
        },
        {
          name: 'iracing_series_id',
          type: 'text',
        },
        {
          name: 'logo',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
        },
        {
          name: 'status',
          type: 'select',
          values: ['ativa', 'inativa'],
        },
      ],
    })
    app.save(seriesCollection)

    // 2. Adicionar campo 'series_id' na coleção 'championships' (relação N:1 - todo campeonato possui 1 série)
    const championshipsCollection = app.findCollectionByNameOrId('championships')
    championshipsCollection.fields.add(
      new Field({
        name: 'series_id',
        type: 'relation',
        collectionId: seriesCollection.id,
        maxSelect: 1,
      }),
    )
    app.save(championshipsCollection)

    // 3. Estender 'championship_pilots' (entidade INSCRIÇÃO com estados e dados financeiros)
    // Estados segundo especificação mestre: 'pendente', 'aprovada', 'recusada', 'cancelada'
    const champPilotsCollection = app.findCollectionByNameOrId('championship_pilots')
    champPilotsCollection.fields.add(
      new Field({
        name: 'registration_status',
        type: 'select',
        values: ['pendente', 'aprovada', 'recusada', 'cancelada'],
      }),
    )
    champPilotsCollection.fields.add(
      new Field({
        name: 'payment_status',
        type: 'select',
        values: ['pendente', 'pago', 'isento', 'reembolsado', 'cancelado'],
      }),
    )
    champPilotsCollection.fields.add(
      new Field({
        name: 'paid_at',
        type: 'text',
      }),
    )
    champPilotsCollection.fields.add(
      new Field({
        name: 'approved_at',
        type: 'text',
      }),
    )
    champPilotsCollection.fields.add(
      new Field({
        name: 'notes',
        type: 'text',
      }),
    )
    app.save(champPilotsCollection)

    // Atualizar registros existentes de championship_pilots para 'aprovada' e 'pago' para retrocompatibilidade
    const existingCPs = app.findRecordsByFilter(
      'championship_pilots',
      'registration_status = "" || registration_status = null',
      '',
      500,
    )
    for (const cp of existingCPs) {
      cp.set('registration_status', 'aprovada')
      if (!cp.get('payment_status')) {
        cp.set('payment_status', 'pago')
      }
      app.save(cp)
    }

    // 4. Estender 'invoices' com 'championship_pilot_id' (vincular fatura/cobrança diretamente à inscrição)
    const invoicesCollection = app.findCollectionByNameOrId('invoices')
    invoicesCollection.fields.add(
      new Field({
        name: 'championship_pilot_id',
        type: 'relation',
        collectionId: champPilotsCollection.id,
        maxSelect: 1,
      }),
    )
    app.save(invoicesCollection)

    // 5. Inserir algumas Séries padrão iniciais para uso imediato
    const defaultSeries = [
      {
        name: 'Stock Car Pro Series Brasil',
        short_name: 'Stock Car',
        status: 'ativa',
        description: 'Categoria oficial de Turismo e Stock Cars',
      },
      {
        name: 'Porsche Carrera Cup Brasil',
        short_name: 'Porsche Cup',
        status: 'ativa',
        description: 'Monotipo GT3 Cup',
      },
      {
        name: 'Fórmula Inter Brasil',
        short_name: 'F-Inter',
        status: 'ativa',
        description: 'Monopostos de alta performance',
      },
      {
        name: 'iRacing GT Challenge Tour',
        short_name: 'GT Challenge',
        status: 'ativa',
        description: 'Competição multi-classe GT3 / GT4',
      },
    ]
    for (const s of defaultSeries) {
      const r = new Record(seriesCollection)
      r.set('name', s.name)
      r.set('short_name', s.short_name)
      r.set('status', s.status)
      r.set('description', s.description)
      app.save(r)
    }
  },
  (app) => {
    // Revert
    try {
      const inv = app.findCollectionByNameOrId('invoices')
      inv.fields.removeByName('championship_pilot_id')
      app.save(inv)
    } catch (_) {}

    try {
      const cp = app.findCollectionByNameOrId('championship_pilots')
      cp.fields.removeByName('registration_status')
      cp.fields.removeByName('payment_status')
      cp.fields.removeByName('paid_at')
      cp.fields.removeByName('approved_at')
      cp.fields.removeByName('notes')
      app.save(cp)
    } catch (_) {}

    try {
      const champ = app.findCollectionByNameOrId('championships')
      champ.fields.removeByName('series_id')
      app.save(champ)
    } catch (_) {}

    try {
      const series = app.findCollectionByNameOrId('series')
      app.delete(series)
    } catch (_) {}
  },
)
