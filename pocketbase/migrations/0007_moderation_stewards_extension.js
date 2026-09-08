migrate(
  (app) => {
    // 1. Extend moderation_cases collection
    const modCasesCol = app.findCollectionByNameOrId('moderation_cases')
    if (!modCasesCol.fields.getByName('code')) {
      modCasesCol.fields.add(new TextField({ name: 'code' }))
    }
    if (!modCasesCol.fields.getByName('case_number')) {
      modCasesCol.fields.add(new NumberField({ name: 'case_number', onlyInt: true }))
    }
    if (!modCasesCol.fields.getByName('penalty_points')) {
      modCasesCol.fields.add(new NumberField({ name: 'penalty_points' }))
    }
    if (!modCasesCol.fields.getByName('penalty_seconds')) {
      modCasesCol.fields.add(new NumberField({ name: 'penalty_seconds' }))
    }
    if (!modCasesCol.fields.getByName('penalty_positions')) {
      modCasesCol.fields.add(new NumberField({ name: 'penalty_positions', onlyInt: true }))
    }
    if (!modCasesCol.fields.getByName('penalty_type')) {
      modCasesCol.fields.add(new TextField({ name: 'penalty_type' }))
    }
    if (!modCasesCol.fields.getByName('cancelled')) {
      modCasesCol.fields.add(new BoolField({ name: 'cancelled' }))
    }
    app.save(modCasesCol)

    // Add index on code
    try {
      modCasesCol.addIndex('idx_mod_cases_code', false, 'code', '')
      app.save(modCasesCol)
    } catch (_) {}

    // 2. Extend stage_races collection with case counter
    const stageRacesCol = app.findCollectionByNameOrId('stage_races')
    if (!stageRacesCol.fields.getByName('case_counter')) {
      stageRacesCol.fields.add(new NumberField({ name: 'case_counter', onlyInt: true }))
      app.save(stageRacesCol)
    }

    // 3. Extend championships collection with short_code if missing
    const champCol = app.findCollectionByNameOrId('championships')
    if (!champCol.fields.getByName('short_code')) {
      champCol.fields.add(new TextField({ name: 'short_code' }))
      app.save(champCol)
    }

    // 4. Seed standard regulation infractions on existing championships if null/empty
    const sampleInfractions = [
      'Art. 12.1 / Toque evitável com ganho de posição (-5 pts)',
      'Art. 12.2 / Toque traseiro na tomada de curva (-3 pts)',
      'Art. 13.1 / Bloqueio irregular de trajetória em reta (-5 pts)',
      'Art. 14.2 / Reentrada perigosa na pista (Unsafe Rejoin) (-10 pts)',
      'Art. 15.3 / Excesso de velocidade na entrada do pit lane (+5s)',
      'Art. 16.1 / Ultrapassagem fora dos limites da pista (-2 posições)',
      'Art. 17.2 / Conduta antidesportiva grave (-15 pts)',
      'Art. 18.1 / Desrespeito à bandeira amarela (-5 pts)',
      'Art. 19.4 / Advertência desportiva formal (Sem perda de pontos)',
      'Art. 20.2 / Não cumprimento de pit stop obrigatório (-20 pts)',
    ]

    const defaultRegulationText = `REGULAMENTO DESPORTIVO OFICIAL - TEMPORADA

CAPÍTULO I - DO COMPORTAMENTO EM PISTA
1. Todos os pilotos devem manter conduta desportiva respeitosa e cautela nas disputas.
2. É proibido qualquer bloqueio reativo de linha ou mudança dupla de trajetória para defesa.

CAPÍTULO II - DAS INFRAÇÕES E PENALIDADES
Art. 12.1: Toque evitável que resulte em perda de posições ou rodada do adversário: Penalização automática de pontos (-5 pontos).
Art. 12.2: Toque na traseira em frenagem com desestabilização do concorrente: (-3 pontos).
Art. 13.1: Mais de uma mudança de linha defensiva (bloqueio irregular): (-5 pontos).
Art. 14.2: Retorno inseguro ao asfalto após saída de pista: (-10 pontos).
Art. 15.3: Infração de velocidade no pit lane apurada por vídeo: Acréscimo de tempo (+5s) no resultado da corrida.
Art. 16.1: Ganho duradouro de vantagem fora dos limites da pista: Perda de 2 posições no resultado.
Art. 17.2: Conduta deliberada ou antidesportiva: (-15 pontos) na classificação do piloto e da equipe.
Art. 18.1: Desaceleração insuficiente em bandeira amarela: (-5 pontos).
Art. 19.4: Advertência formal anotada em comissário: Sem punição direta em pontos.
Art. 20.2: Não cumprimento de parada obrigatória em janela: (-20 pontos).

CAPÍTULO III - DA COMISSÃO DE PROVAS
A comissão deliberará durante a janela da prova e até a data da próxima etapa. Pilotos envolvidos têm até 24h para manifestação.`

    try {
      const allChamps = app.findRecordsByFilter('championships', '', 'name', 50, 0)
      for (const ch of allChamps) {
        let changed = false
        const rules = ch.get('regulation_rules')
        if (!rules || (Array.isArray(rules) && rules.length === 0)) {
          ch.set('regulation_rules', sampleInfractions)
          changed = true
        }
        if (!ch.getString('regulation_text')) {
          ch.set('regulation_text', defaultRegulationText)
          changed = true
        }
        if (!ch.getString('short_code')) {
          // generate clean short code from name (e.g. "Copa de Inverno GT" -> "CIGT", "Masters of Track" -> "MOT")
          const cleanName = ch.getString('name') || 'CMP'
          const words = cleanName.split(/\s+/).filter(Boolean)
          const letters = words.map((w) => w[0].toUpperCase()).join('')
          ch.set('short_code', letters.slice(0, 4) || 'CHMP')
          changed = true
        }
        if (changed) {
          app.save(ch)
        }
      }
    } catch (e) {
      console.log('Error populating default regulation rules:', e)
    }
  },
  (app) => {
    try {
      const modCasesCol = app.findCollectionByNameOrId('moderation_cases')
      modCasesCol.fields.removeByName('code')
      modCasesCol.fields.removeByName('case_number')
      modCasesCol.fields.removeByName('penalty_points')
      modCasesCol.fields.removeByName('penalty_seconds')
      modCasesCol.fields.removeByName('penalty_positions')
      modCasesCol.fields.removeByName('penalty_type')
      modCasesCol.fields.removeByName('cancelled')
      app.save(modCasesCol)
    } catch (_) {}

    try {
      const stageRacesCol = app.findCollectionByNameOrId('stage_races')
      stageRacesCol.fields.removeByName('case_counter')
      app.save(stageRacesCol)
    } catch (_) {}

    try {
      const champCol = app.findCollectionByNameOrId('championships')
      champCol.fields.removeByName('short_code')
      app.save(champCol)
    } catch (_) {}
  },
)
