migrate(
  (app) => {
    // 1. Extend championships collection with new fields
    const championships = app.findCollectionByNameOrId('championships')
    const cars = app.findCollectionByNameOrId('cars')

    // championship_type
    if (!championships.fields.getByName('championship_type')) {
      championships.fields.add(
        new SelectField({
          name: 'championship_type',
          values: ['Road', 'Oval', 'Dirt Road'],
          maxSelect: 1,
        }),
      )
    }

    // Number fields
    if (!championships.fields.getByName('drop_scores')) {
      championships.fields.add(new NumberField({ name: 'drop_scores', onlyInt: true }))
    }
    if (!championships.fields.getByName('pilots_per_team')) {
      championships.fields.add(new NumberField({ name: 'pilots_per_team', onlyInt: true }))
    }
    if (!championships.fields.getByName('scoring_pilots_per_team')) {
      championships.fields.add(new NumberField({ name: 'scoring_pilots_per_team', onlyInt: true }))
    }
    if (!championships.fields.getByName('min_lap_percentage_points')) {
      championships.fields.add(new NumberField({ name: 'min_lap_percentage_points' }))
    }
    if (!championships.fields.getByName('bonus_fastest_lap')) {
      championships.fields.add(new NumberField({ name: 'bonus_fastest_lap', onlyInt: true }))
    }
    if (!championships.fields.getByName('bonus_pole_position')) {
      championships.fields.add(new NumberField({ name: 'bonus_pole_position', onlyInt: true }))
    }
    if (!championships.fields.getByName('bonus_no_incidents')) {
      championships.fields.add(new NumberField({ name: 'bonus_no_incidents', onlyInt: true }))
    }
    if (!championships.fields.getByName('bonus_most_positions_gained')) {
      championships.fields.add(
        new NumberField({ name: 'bonus_most_positions_gained', onlyInt: true }),
      )
    }
    if (!championships.fields.getByName('bonus_most_laps_led')) {
      championships.fields.add(new NumberField({ name: 'bonus_most_laps_led', onlyInt: true }))
    }
    if (!championships.fields.getByName('bonus_lead_lap')) {
      championships.fields.add(new NumberField({ name: 'bonus_lead_lap', onlyInt: true }))
    }
    if (!championships.fields.getByName('penalty_points_suspension')) {
      championships.fields.add(
        new NumberField({ name: 'penalty_points_suspension', onlyInt: true }),
      )
    }
    if (!championships.fields.getByName('penalty_points_pit_start')) {
      championships.fields.add(new NumberField({ name: 'penalty_points_pit_start', onlyInt: true }))
    }

    // Boolean fields (never required)
    if (!championships.fields.getByName('loss_points_change_car')) {
      championships.fields.add(new BoolField({ name: 'loss_points_change_car' }))
    }
    if (!championships.fields.getByName('team_championship')) {
      championships.fields.add(new BoolField({ name: 'team_championship' }))
    }
    if (!championships.fields.getByName('fixed_setup')) {
      championships.fields.add(new BoolField({ name: 'fixed_setup' }))
    }
    if (!championships.fields.getByName('visible_to_pilots')) {
      championships.fields.add(new BoolField({ name: 'visible_to_pilots' }))
    }
    if (!championships.fields.getByName('multi_class')) {
      championships.fields.add(new BoolField({ name: 'multi_class' }))
    }

    // Image field
    if (!championships.fields.getByName('image')) {
      championships.fields.add(
        new FileField({
          name: 'image',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        }),
      )
    }

    // Car relation field (multi-select relation to cars collection)
    if (!championships.fields.getByName('cars')) {
      championships.fields.add(
        new RelationField({
          name: 'cars',
          collectionId: cars.id,
          maxSelect: 99,
          cascadeDelete: false,
        }),
      )
    }

    // Update listRule and viewRule to allow pilots (clients) to view visible championships or all if collaborator
    championships.listRule =
      '@request.auth.id != "" && (@request.auth.role = "colaborador" || visible_to_pilots = true || visible_to_pilots = null)'
    championships.viewRule =
      '@request.auth.id != "" && (@request.auth.role = "colaborador" || visible_to_pilots = true || visible_to_pilots = null)'

    app.save(championships)

    // 2. Create championship_batteries collection
    let batteriesCol
    try {
      batteriesCol = app.findCollectionByNameOrId('championship_batteries')
    } catch (_) {
      batteriesCol = new Collection({
        name: 'championship_batteries',
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
            collectionId: championships.id,
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
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_championship_batteries_champ ON championship_batteries (championship_id)',
        ],
      })
      app.save(batteriesCol)
    }

    // Seed sample Stock Car Brasil manufacturer and cars if not existing
    const manufacturersCol = app.findCollectionByNameOrId('manufacturers')
    const carsCol = app.findCollectionByNameOrId('cars')

    let stockManufacturer
    try {
      stockManufacturer = app.findFirstRecordByData('manufacturers', 'name', 'Stock Car Brasil')
    } catch (_) {
      stockManufacturer = new Record(manufacturersCol)
      stockManufacturer.set('name', 'Stock Car Brasil')
      stockManufacturer.set('country', 'Brasil')
      stockManufacturer.set('founded_year', 1979)
      app.save(stockManufacturer)
    }

    const stockCars = ['Corolla', 'Cruze']
    for (const modelName of stockCars) {
      try {
        app.findFirstRecordByData('cars', 'model', modelName)
      } catch (_) {
        const carRec = new Record(carsCol)
        carRec.set('manufacturer_id', stockManufacturer.id)
        carRec.set('model', modelName)
        carRec.set('year', 2024)
        carRec.set('category', 'Stock Car')
        app.save(carRec)
      }
    }
  },
  (app) => {
    try {
      const batteriesCol = app.findCollectionByNameOrId('championship_batteries')
      app.delete(batteriesCol)
    } catch (_) {}
  },
)
