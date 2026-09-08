migrate(
  (app) => {
    // 1. Add iracing_id and country_code to pilots collection if not present
    const pilotsCol = app.findCollectionByNameOrId('pilots')
    if (!pilotsCol.fields.getByName('iracing_id')) {
      pilotsCol.fields.add(new TextField({ name: 'iracing_id' }))
    }
    if (!pilotsCol.fields.getByName('country_code')) {
      pilotsCol.fields.add(new TextField({ name: 'country_code' }))
    }
    app.save(pilotsCol)

    // Add unique index on pilots (iracing_id) where iracing_id is not null and not empty
    try {
      pilotsCol.addIndex(
        'idx_pilots_iracing_id',
        true,
        'iracing_id',
        'iracing_id != "" AND iracing_id IS NOT NULL',
      )
      app.save(pilotsCol)
    } catch (_) {}

    // 2. Collections needed for relations
    const stageRaces = app.findCollectionByNameOrId('stage_races')
    const championships = app.findCollectionByNameOrId('championships')

    // 3. Create race_imports collection
    let raceImportsCol
    try {
      raceImportsCol = app.findCollectionByNameOrId('race_imports')
    } catch (_) {
      raceImportsCol = new Collection({
        name: 'race_imports',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.role = "colaborador"',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          { name: 'subsession_id', type: 'number', required: true, onlyInt: true },
          { name: 'session_name', type: 'text' },
          { name: 'file_name', type: 'text' },
          { name: 'track_name', type: 'text' },
          { name: 'track_config', type: 'text' },
          { name: 'simulated_start_time', type: 'text' },
          {
            name: 'championship_id',
            type: 'relation',
            required: true,
            collectionId: championships.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'stage_race_id',
            type: 'relation',
            required: true,
            collectionId: stageRaces.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'imported_by',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'status',
            type: 'select',
            values: ['ativo', 'substituido', 'excluido'],
            maxSelect: 1,
            required: true,
          },
          { name: 'raw_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_race_imports_race ON race_imports (stage_race_id)',
          'CREATE INDEX idx_race_imports_champ ON race_imports (championship_id)',
          'CREATE INDEX idx_race_imports_subsession ON race_imports (subsession_id)',
        ],
      })
      app.save(raceImportsCol)
    }

    // 4. Create race_results collection
    let raceResultsCol
    try {
      raceResultsCol = app.findCollectionByNameOrId('race_results')
    } catch (_) {
      raceResultsCol = new Collection({
        name: 'race_results',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.role = "colaborador"',
        updateRule: '@request.auth.role = "colaborador"',
        deleteRule: '@request.auth.role = "colaborador"',
        fields: [
          {
            name: 'race_import_id',
            type: 'relation',
            required: true,
            collectionId: raceImportsCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
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
          {
            name: 'pilot_id',
            type: 'relation',
            collectionId: pilotsCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'cust_id', type: 'number', required: true, onlyInt: true },
          { name: 'display_name', type: 'text', required: true },
          { name: 'finish_position', type: 'number', required: true, onlyInt: true },
          { name: 'finish_position_in_class', type: 'number', required: true, onlyInt: true },
          { name: 'starting_position', type: 'number', onlyInt: true },
          { name: 'starting_position_in_class', type: 'number', onlyInt: true },
          { name: 'car_id', type: 'number', onlyInt: true },
          { name: 'car_name', type: 'text' },
          { name: 'car_class_id', type: 'number', onlyInt: true },
          { name: 'car_class_name', type: 'text' },
          { name: 'car_class_short_name', type: 'text' },
          { name: 'best_lap_num', type: 'number', onlyInt: true },
          { name: 'best_lap_time', type: 'number', onlyInt: true },
          { name: 'best_lap_time_str', type: 'text' },
          { name: 'best_qual_lap_num', type: 'number', onlyInt: true },
          { name: 'best_qual_lap_time', type: 'number', onlyInt: true },
          { name: 'best_qual_lap_time_str', type: 'text' },
          { name: 'average_lap', type: 'number', onlyInt: true },
          { name: 'average_lap_str', type: 'text' },
          { name: 'laps_complete', type: 'number', onlyInt: true },
          { name: 'laps_lead', type: 'number', onlyInt: true },
          { name: 'incidents', type: 'number', onlyInt: true },
          { name: 'points', type: 'number' },
          { name: 'bonus_points', type: 'number' },
          { name: 'total_points', type: 'number' },
          { name: 'is_pole', type: 'bool' },
          { name: 'is_fastest_lap', type: 'bool' },
          { name: 'is_winner', type: 'bool' },
          { name: 'is_podium', type: 'bool' },
          { name: 'weight_penalty_kg', type: 'number' },
          { name: 'drop_race', type: 'bool' },
          { name: 'country_code', type: 'text' },
          { name: 'car_number', type: 'text' },
          { name: 'reason_out', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['ativo', 'substituido', 'excluido'],
            maxSelect: 1,
            required: true,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_race_results_race ON race_results (stage_race_id)',
          'CREATE INDEX idx_race_results_champ ON race_results (championship_id)',
          'CREATE INDEX idx_race_results_pilot ON race_results (pilot_id)',
          'CREATE INDEX idx_race_results_cust_id ON race_results (cust_id)',
          'CREATE INDEX idx_race_results_status ON race_results (status)',
        ],
      })
      app.save(raceResultsCol)
    }
  },
  (app) => {
    try {
      const rr = app.findCollectionByNameOrId('race_results')
      app.delete(rr)
    } catch (_) {}
    try {
      const ri = app.findCollectionByNameOrId('race_imports')
      app.delete(ri)
    } catch (_) {}
  },
)
