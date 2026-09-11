/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const championshipsCollection = app.findCollectionByNameOrId('championships')

    // 1. Adicionar campo opcional iracing_series_id na tabela championships (se ainda não existir)
    if (!championshipsCollection.fields.getByName('iracing_series_id')) {
      championshipsCollection.fields.add(
        new TextField({
          name: 'iracing_series_id',
        }),
      )
      app.save(championshipsCollection)
    }

    // 2. Migrar iracing_series_id de qualquer campeonato que tenha series_id preenchido
    try {
      app
        .db()
        .newQuery(`
        UPDATE championships
        SET iracing_series_id = (
          SELECT s.iracing_series_id
          FROM series s
          WHERE s.id = championships.series_id
        )
        WHERE series_id IS NOT NULL
          AND series_id != ''
          AND (iracing_series_id IS NULL OR iracing_series_id = '')
      `)
        .execute()
    } catch (e) {
      console.log('Aviso ao sincronizar iracing_series_id:', e)
    }

    // 3. Remover campo relation series_id de championships
    try {
      const champ = app.findCollectionByNameOrId('championships')
      if (champ.fields.getByName('series_id')) {
        champ.fields.removeByName('series_id')
        app.save(champ)
      }
    } catch (e) {
      console.log('Erro ao remover series_id de championships:', e)
    }

    // 4. Excluir a coleção series
    try {
      const seriesCol = app.findCollectionByNameOrId('series')
      app.delete(seriesCol)
    } catch (e) {
      console.log('Erro ao excluir coleção series:', e)
    }
  },
  (app) => {
    // Reverter: recriar coleção series e recolocar relation series_id
    try {
      const seriesCollection = new Collection({
        name: 'series',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'short_name', type: 'text' },
          { name: 'description', type: 'text' },
          { name: 'iracing_series_id', type: 'text' },
          { name: 'logo', type: 'file', maxSelect: 1, maxSize: 5242880 },
          { name: 'status', type: 'select', values: ['ativa', 'inativa'] },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(seriesCollection)

      const championshipsCollection = app.findCollectionByNameOrId('championships')
      championshipsCollection.fields.add(
        new RelationField({
          name: 'series_id',
          collectionId: seriesCollection.id,
          maxSelect: 1,
        }),
      )
      app.save(championshipsCollection)
    } catch (e) {
      console.log('Erro no down da migração:', e)
    }
  },
)
