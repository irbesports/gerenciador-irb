migrate(
  (app) => {
    const championships = app.findCollectionByNameOrId('championships')
    const tracks = app.findCollectionByNameOrId('tracks')
    const pilots = app.findCollectionByNameOrId('pilots')

    // 1. Extend championships with stages_scoring (JSON)
    if (!championships.fields.getByName('stages_scoring')) {
      championships.fields.add(new JSONField({ name: 'stages_scoring' }))
      app.save(championships)
    }

    // 2. Create scoring_presets collection
    let scoringPresetsCol
    try {
      scoringPresetsCol = app.findCollectionByNameOrId('scoring_presets')
    } catch (_) {
      scoringPresetsCol = new Collection({
        name: 'scoring_presets',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.role = "colaborador"',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'rules', type: 'json', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_scoring_presets_name ON scoring_presets (name)'],
      })
      app.save(scoringPresetsCol)
    }

    // Seed default presets
    const stockCarRules = [
      { position: 1, points: 80 },
      { position: 2, points: 74 },
      { position: 3, points: 69 },
      { position: 4, points: 64 },
      { position: 5, points: 59 },
      { position: 6, points: 55 },
      { position: 7, points: 51 },
      { position: 8, points: 47 },
      { position: 9, points: 43 },
      { position: 10, points: 40 },
      { position: 11, points: 37 },
      { position: 12, points: 36 },
      { position: 13, points: 31 },
      { position: 14, points: 28 },
      { position: 15, points: 25 },
      { position: 16, points: 22 },
      { position: 17, points: 19 },
      { position: 18, points: 17 },
      { position: 19, points: 15 },
      { position: 20, points: 13 },
      { position: 21, points: 12 },
      { position: 22, points: 11 },
      { position: 23, points: 10 },
      { position: 24, points: 9 },
      { position: 25, points: 8 },
      { position: 26, points: 7 },
      { position: 27, points: 6 },
      { position: 28, points: 5 },
      { position: 29, points: 4 },
      { position: 30, points: 3 },
      { position: 31, points: 2 },
      { position: 32, points: 1 },
      { position: 33, points: 0 },
      { position: 34, points: 0 },
      { position: 35, points: 0 },
      { position: 36, points: 0 },
      { position: 37, points: 0 },
      { position: 38, points: 0 },
      { position: 39, points: 0 },
      { position: 40, points: 0 },
    ]

    try {
      app.findFirstRecordByData('scoring_presets', 'name', 'Stock Car Brasil')
    } catch (_) {
      const p1 = new Record(scoringPresetsCol)
      p1.set('name', 'Stock Car Brasil')
      p1.set(
        'description',
        'Sistema de pontuação padrão da Stock Car Brasil Pro Series (até 40 posições)',
      )
      p1.set('rules', stockCarRules)
      app.save(p1)
    }

    const f1Rules = [
      { position: 1, points: 25 },
      { position: 2, points: 18 },
      { position: 3, points: 15 },
      { position: 4, points: 12 },
      { position: 5, points: 10 },
      { position: 6, points: 8 },
      { position: 7, points: 6 },
      { position: 8, points: 4 },
      { position: 9, points: 2 },
      { position: 10, points: 1 },
    ]

    try {
      app.findFirstRecordByData('scoring_presets', 'name', 'F1 Padrão')
    } catch (_) {
      const p2 = new Record(scoringPresetsCol)
      p2.set('name', 'F1 Padrão')
      p2.set('description', 'Sistema clássico FIA Formula 1 (Top 10)')
      p2.set('rules', f1Rules)
      app.save(p2)
    }

    // 3. Create championship_stages collection
    let stagesCol
    try {
      stagesCol = app.findCollectionByNameOrId('championship_stages')
    } catch (_) {
      stagesCol = new Collection({
        name: 'championship_stages',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
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
            cascadeDelete: true,
          },
          { name: 'order', type: 'number', required: true, onlyInt: true },
          { name: 'date', type: 'date' },
          {
            name: 'duration_type',
            type: 'select',
            values: ['Minutos', 'Voltas'],
            maxSelect: 1,
            required: true,
          },
          { name: 'duration', type: 'number', required: true, onlyInt: true },
          { name: 'points_multiplier', type: 'number' },
          {
            name: 'track',
            type: 'relation',
            collectionId: tracks.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'track_layout', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['Agendada', 'Em andamento', 'Finalizada'],
            maxSelect: 1,
            required: true,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_championship_stages_champ ON championship_stages (championship_id)',
          'CREATE INDEX idx_championship_stages_order ON championship_stages (championship_id, order)',
        ],
      })
      app.save(stagesCol)
    }

    // 4. Create stage_races collection (races within a stage)
    let stageRacesCol
    try {
      stageRacesCol = app.findCollectionByNameOrId('stage_races')
    } catch (_) {
      stageRacesCol = new Collection({
        name: 'stage_races',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.role = "colaborador"',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'stage_id',
            type: 'relation',
            required: true,
            collectionId: stagesCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'order', type: 'number', required: true, onlyInt: true },
          {
            name: 'duration_type',
            type: 'select',
            values: ['Minutos', 'Voltas'],
            maxSelect: 1,
            required: true,
          },
          { name: 'duration', type: 'number', required: true, onlyInt: true },
          { name: 'start_time', type: 'text' },
          { name: 'weather', type: 'text' },
          { name: 'inverted_positions', type: 'number', onlyInt: true },
          { name: 'name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_stage_races_stage ON stage_races (stage_id)'],
      })
      app.save(stageRacesCol)
    }

    // 5. Create stage_race_comments collection (discussion thread for race)
    let commentsCol
    try {
      commentsCol = app.findCollectionByNameOrId('stage_race_comments')
    } catch (_) {
      commentsCol = new Collection({
        name: 'stage_race_comments',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != "" && user_id = @request.auth.id',
        deleteRule: '@request.auth.role = "colaborador" || user_id = @request.auth.id',
        fields: [
          {
            name: 'race_id',
            type: 'relation',
            required: true,
            collectionId: stageRacesCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'message', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_stage_race_comments_race ON stage_race_comments (race_id)'],
      })
      app.save(commentsCol)
    }

    // 6. Create championship_pilots collection (pilot registrations in a championship)
    let champPilotsCol
    try {
      champPilotsCol = app.findCollectionByNameOrId('championship_pilots')
    } catch (_) {
      champPilotsCol = new Collection({
        name: 'championship_pilots',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
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
            cascadeDelete: true,
          },
          {
            name: 'pilot',
            type: 'relation',
            collectionId: pilots.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'name', type: 'text' },
          { name: 'iracing_id', type: 'text' },
          { name: 'number', type: 'number', onlyInt: true },
          { name: 'team', type: 'text' },
          { name: 'number_options', type: 'text' },
          { name: 'car_class', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_champ_pilots_champ ON championship_pilots (championship_id)',
          'CREATE INDEX idx_champ_pilots_pilot ON championship_pilots (pilot)',
        ],
      })
      app.save(champPilotsCol)
    }

    // Seed sample stages and registered pilots for existing championships if empty
    const allChamps = app.findRecordsByFilter('championships', '', '-created', 5, 0)
    const allTracks = app.findRecordsByFilter('tracks', '', 'name', 10, 0)
    const interlagos =
      allTracks.find((t) => t.getString('name').includes('Interlagos')) || allTracks[0]
    const curitiba = allTracks.find((t) => t.getString('name').includes('Curitiba')) || allTracks[0]

    for (const ch of allChamps) {
      // Check existing stages
      const existingStages = app.findRecordsByFilter(
        'championship_stages',
        `championship_id = "${ch.id}"`,
        'order',
        10,
        0,
      )

      if (existingStages.length === 0) {
        // Stage 1
        const s1 = new Record(stagesCol)
        s1.set('championship_id', ch.id)
        s1.set('order', 1)
        s1.set('date', '2025-10-19 14:00:00.000Z')
        s1.set('duration_type', 'Minutos')
        s1.set('duration', 50)
        s1.set('points_multiplier', 1)
        if (interlagos) s1.set('track', interlagos.id)
        s1.set('track_layout', 'Grand Prix')
        s1.set('status', 'Finalizada')
        app.save(s1)

        // Race 1 for stage 1
        const r1 = new Record(stageRacesCol)
        r1.set('stage_id', s1.id)
        r1.set('order', 1)
        r1.set('name', 'Corrida 1')
        r1.set('duration_type', 'Minutos')
        r1.set('duration', 50)
        r1.set('start_time', '14:00')
        r1.set('weather', 'Céu limpo / 24°C')
        r1.set('inverted_positions', 0)
        app.save(r1)

        // Stage 2
        const s2 = new Record(stagesCol)
        s2.set('championship_id', ch.id)
        s2.set('order', 2)
        s2.set('date', '2025-10-26 15:00:00.000Z')
        s2.set('duration_type', 'Minutos')
        s2.set('duration', 50)
        s2.set('points_multiplier', 1)
        if (curitiba) s2.set('track', curitiba.id)
        s2.set('track_layout', 'Circuito Principal')
        s2.set('status', 'Finalizada')
        app.save(s2)

        const r2 = new Record(stageRacesCol)
        r2.set('stage_id', s2.id)
        r2.set('order', 1)
        r2.set('name', 'Corrida 1')
        r2.set('duration_type', 'Minutos')
        r2.set('duration', 50)
        r2.set('start_time', '15:00')
        r2.set('weather', 'Parcialmente nublado')
        r2.set('inverted_positions', 10)
        app.save(r2)

        // Stage 3 - Em andamento
        const s3 = new Record(stagesCol)
        s3.set('championship_id', ch.id)
        s3.set('order', 3)
        s3.set('date', '2025-11-16 16:00:00.000Z')
        s3.set('duration_type', 'Minutos')
        s3.set('duration', 50)
        s3.set('points_multiplier', 1)
        if (interlagos) s3.set('track', interlagos.id)
        s3.set('track_layout', 'Grand Prix')
        s3.set('status', 'Em andamento')
        app.save(s3)

        const r3 = new Record(stageRacesCol)
        r3.set('stage_id', s3.id)
        r3.set('order', 1)
        r3.set('name', 'Corrida 1')
        r3.set('duration_type', 'Minutos')
        r3.set('duration', 50)
        r3.set('start_time', '16:00')
        r3.set('weather', 'Sol forte')
        r3.set('inverted_positions', 0)
        app.save(r3)
      }

      // Check registered pilots in championship
      const existingChampPilots = app.findRecordsByFilter(
        'championship_pilots',
        `championship_id = "${ch.id}"`,
        'number',
        10,
        0,
      )

      if (existingChampPilots.length === 0) {
        const seedPilotsData = [
          {
            iracing_id: '1019454',
            number: 46,
            name: 'André Nassutti',
            team: 'Kings By TK',
            number_options: '(46, 460, 69)',
          },
          {
            iracing_id: '569362',
            number: 466,
            name: 'Azevedo Filho',
            team: 'Rockets E-Sports',
            number_options: '',
          },
          {
            iracing_id: '533336',
            number: 115,
            name: 'Caio Sofiato',
            team: 'Kings By TK',
            number_options: '(15, 115, 215)',
          },
          {
            iracing_id: '697846',
            number: 5,
            name: 'Carlos Erwig',
            team: 'MW GP',
            number_options: '',
          },
          {
            iracing_id: '254486',
            number: 93,
            name: 'Cristiano Bohessef',
            team: 'Pro Racing Simuladores',
            number_options: '',
          },
          {
            iracing_id: '39163',
            number: 82,
            name: 'Daniel Mageste',
            team: 'W2 e-ProGP',
            number_options: '(82, 81, 28)',
          },
          {
            iracing_id: '278408',
            number: 114,
            name: 'Emanuel Santos',
            team: 'AC7-SG28 Racing',
            number_options: '(114)',
          },
          {
            iracing_id: '240638',
            number: 10,
            name: 'Erick Goldner',
            team: 'W2 e-ProGP',
            number_options: '(10, 77, 99)',
          },
          {
            iracing_id: '926908',
            number: 18,
            name: 'Erik Queiroz',
            team: 'Torresmo Racing',
            number_options: '(82, 11, 26)',
          },
          {
            iracing_id: '770692',
            number: 107,
            name: 'Ernani Kuhn',
            team: '',
            number_options: '(107, 7, 87)',
          },
        ]

        for (const sp of seedPilotsData) {
          const rec = new Record(champPilotsCol)
          rec.set('championship_id', ch.id)
          rec.set('iracing_id', sp.iracing_id)
          rec.set('number', sp.number)
          rec.set('name', sp.name)
          rec.set('team', sp.team)
          rec.set('number_options', sp.number_options)
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    try {
      const c = app.findCollectionByNameOrId('stage_race_comments')
      app.delete(c)
    } catch (_) {}
    try {
      const r = app.findCollectionByNameOrId('stage_races')
      app.delete(r)
    } catch (_) {}
    try {
      const s = app.findCollectionByNameOrId('championship_stages')
      app.delete(s)
    } catch (_) {}
    try {
      const cp = app.findCollectionByNameOrId('championship_pilots')
      app.delete(cp)
    } catch (_) {}
    try {
      const sp = app.findCollectionByNameOrId('scoring_presets')
      app.delete(sp)
    } catch (_) {}
  },
)
