migrate(
  (app) => {
    // 1. Extend stage_races collection with closed/status fields
    const stageRacesCol = app.findCollectionByNameOrId('stage_races')
    if (!stageRacesCol.fields.getByName('is_closed')) {
      stageRacesCol.fields.add(new BoolField({ name: 'is_closed' }))
    }
    if (!stageRacesCol.fields.getByName('closed_at')) {
      stageRacesCol.fields.add(new DateField({ name: 'closed_at' }))
    }
    if (!stageRacesCol.fields.getByName('closed_by')) {
      stageRacesCol.fields.add(
        new RelationField({
          name: 'closed_by',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }
    app.save(stageRacesCol)

    // 2. Ensure moderation_cases has all required fields for observations & edit
    const modCasesCol = app.findCollectionByNameOrId('moderation_cases')
    if (!modCasesCol.fields.getByName('description')) {
      modCasesCol.fields.add(new TextField({ name: 'description', max: 120 }))
      app.save(modCasesCol)
    }
  },
  (app) => {
    try {
      const stageRacesCol = app.findCollectionByNameOrId('stage_races')
      stageRacesCol.fields.removeByName('is_closed')
      stageRacesCol.fields.removeByName('closed_at')
      stageRacesCol.fields.removeByName('closed_by')
      app.save(stageRacesCol)
    } catch (_) {}
  },
)
