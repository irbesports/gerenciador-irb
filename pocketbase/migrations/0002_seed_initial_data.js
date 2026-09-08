migrate(
  (app) => {
    // 1. Initial admin user
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'rsanque@gmail.com')
      // Ensure role is colaborador
      adminUser.set('role', 'colaborador')
      adminUser.set('name', 'Renato Sanque')
      app.save(adminUser)
    } catch (_) {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      adminUser = new Record(users)
      adminUser.setEmail('rsanque@gmail.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Renato Sanque')
      adminUser.set('role', 'colaborador')
      app.save(adminUser)
    }

    // Also create a sample client user if not exists
    let clientUser
    try {
      clientUser = app.findAuthRecordByEmail('_pb_users_auth_', 'piloto@racingmanager.com')
    } catch (_) {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      clientUser = new Record(users)
      clientUser.setEmail('piloto@racingmanager.com')
      clientUser.setPassword('Skip@Pass')
      clientUser.setVerified(true)
      clientUser.set('name', 'Carlos Silva')
      clientUser.set('role', 'cliente')
      app.save(clientUser)
    }

    // 2. Years (2024, 2025)
    const yearsCol = app.findCollectionByNameOrId('years')
    let y2024, y2025
    try {
      y2024 = app.findFirstRecordByData('years', 'year', 2024)
    } catch (_) {
      y2024 = new Record(yearsCol)
      y2024.set('year', 2024)
      y2024.set('name', 'Temporada Esportiva 2024')
      app.save(y2024)
    }

    try {
      y2025 = app.findFirstRecordByData('years', 'year', 2025)
    } catch (_) {
      y2025 = new Record(yearsCol)
      y2025.set('year', 2025)
      y2025.set('name', 'Temporada Oficial 2025')
      app.save(y2025)
    }

    // 3. Seasons (2 per year)
    const seasonsCol = app.findCollectionByNameOrId('seasons')
    let sWinter24, sSummer24, sWinter25, sSummer25

    try {
      sWinter24 = app.findFirstRecordByData('seasons', 'name', 'Temporada de Inverno 2024')
    } catch (_) {
      sWinter24 = new Record(seasonsCol)
      sWinter24.set('year_id', y2024.id)
      sWinter24.set('name', 'Temporada de Inverno 2024')
      sWinter24.set('start_date', '2024-06-01 00:00:00.000Z')
      sWinter24.set('end_date', '2024-08-31 23:59:59.000Z')
      sWinter24.set('status', 'concluida')
      app.save(sWinter24)
    }

    try {
      sSummer24 = app.findFirstRecordByData('seasons', 'name', 'Temporada de Verão 2024')
    } catch (_) {
      sSummer24 = new Record(seasonsCol)
      sSummer24.set('year_id', y2024.id)
      sSummer24.set('name', 'Temporada de Verão 2024')
      sSummer24.set('start_date', '2024-11-01 00:00:00.000Z')
      sSummer24.set('end_date', '2025-02-28 23:59:59.000Z')
      sSummer24.set('status', 'concluida')
      app.save(sSummer24)
    }

    try {
      sWinter25 = app.findFirstRecordByData('seasons', 'name', 'Temporada de Inverno 2025')
    } catch (_) {
      sWinter25 = new Record(seasonsCol)
      sWinter25.set('year_id', y2025.id)
      sWinter25.set('name', 'Temporada de Inverno 2025')
      sWinter25.set('start_date', '2025-06-01 00:00:00.000Z')
      sWinter25.set('end_date', '2025-08-31 23:59:59.000Z')
      sWinter25.set('status', 'ativa')
      app.save(sWinter25)
    }

    try {
      sSummer25 = app.findFirstRecordByData('seasons', 'name', 'Temporada de Verão 2025')
    } catch (_) {
      sSummer25 = new Record(seasonsCol)
      sSummer25.set('year_id', y2025.id)
      sSummer25.set('name', 'Temporada de Verão 2025')
      sSummer25.set('start_date', '2025-11-01 00:00:00.000Z')
      sSummer25.set('end_date', '2026-02-28 23:59:59.000Z')
      sSummer25.set('status', 'planejada')
      app.save(sSummer25)
    }

    // 4. Championships
    const champCol = app.findCollectionByNameOrId('championships')
    let cGT, cF4, cEndurance

    try {
      cGT = app.findFirstRecordByData('championships', 'name', 'Copa de Inverno GT')
    } catch (_) {
      cGT = new Record(champCol)
      cGT.set('season_id', sWinter25.id)
      cGT.set('name', 'Copa de Inverno GT')
      cGT.set(
        'description',
        'Disputa de alta performance na categoria Gran Turismo multimarca em circuitos nacionais.',
      )
      cGT.set('status', 'ativo')
      app.save(cGT)
    }

    try {
      cF4 = app.findFirstRecordByData('championships', 'name', 'Campeonato de Fórmula 4')
    } catch (_) {
      cF4 = new Record(champCol)
      cF4.set('season_id', sWinter25.id)
      cF4.set('name', 'Campeonato de Fórmula 4')
      cF4.set(
        'description',
        'Categoria de monopostos velozes para desenvolvimento de jovens talentos.',
      )
      cF4.set('status', 'ativo')
      app.save(cF4)
    }

    try {
      cEndurance = app.findFirstRecordByData('championships', 'name', 'Endurance Series')
    } catch (_) {
      cEndurance = new Record(champCol)
      cEndurance.set('season_id', sSummer25.id)
      cEndurance.set('name', 'Endurance Series')
      cEndurance.set(
        'description',
        'Provas de longa duração (4 a 6 horas) com revezamento e estratégia de pit stop.',
      )
      cEndurance.set('status', 'rascunho')
      app.save(cEndurance)
    }

    // 5. Scoring rules for cGT and cF4
    const scoringCol = app.findCollectionByNameOrId('scoring_rules')
    const standardPoints = [
      { pos: 1, pts: 25 },
      { pos: 2, pts: 18 },
      { pos: 3, pts: 15 },
      { pos: 4, pts: 12 },
      { pos: 5, pts: 10 },
      { pos: 6, pts: 8 },
      { pos: 7, pts: 6 },
      { pos: 8, pts: 4 },
      { pos: 9, pts: 2 },
      { pos: 10, pts: 1 },
    ]

    for (const c of [cGT, cF4]) {
      const existing = app.findRecordsByFilter(
        'scoring_rules',
        `championship_id = "${c.id}"`,
        'position',
        1,
        0,
      )
      if (existing.length === 0) {
        for (const item of standardPoints) {
          const sr = new Record(scoringCol)
          sr.set('championship_id', c.id)
          sr.set('position', item.pos)
          sr.set('points', item.pts)
          sr.set('bonus_fastest_lap', 1)
          app.save(sr)
        }
      }
    }

    // 6. Pilots (4-5 pilots)
    const pilotsCol = app.findCollectionByNameOrId('pilots')
    const pilotData = [
      {
        name: 'Carlos Silva',
        number: 11,
        team_name: 'Scuderia Apex',
        status: 'ativo',
        userId: clientUser.id,
      },
      {
        name: 'Ana Souza',
        number: 27,
        team_name: 'Vortex Motorsport',
        status: 'ativo',
        userId: null,
      },
      {
        name: 'João Pereira',
        number: 44,
        team_name: 'Redline Racing',
        status: 'ativo',
        userId: null,
      },
      {
        name: 'Marcos Lima',
        number: 7,
        team_name: 'Velocity Corse',
        status: 'ativo',
        userId: null,
      },
      {
        name: 'Beatriz Costa',
        number: 88,
        team_name: 'Apex Speed Team',
        status: 'ativo',
        userId: null,
      },
    ]

    const createdPilots = []
    for (const p of pilotData) {
      let pRecord
      try {
        pRecord = app.findFirstRecordByData('pilots', 'name', p.name)
      } catch (_) {
        pRecord = new Record(pilotsCol)
        pRecord.set('name', p.name)
        pRecord.set('number', p.number)
        pRecord.set('team_name', p.team_name)
        pRecord.set('status', p.status)
        if (p.userId) {
          pRecord.set('user_id', p.userId)
        }
        app.save(pRecord)
      }
      createdPilots.push(pRecord)
    }

    const p1 = createdPilots[0]
    const p2 = createdPilots[1]
    const p3 = createdPilots[2]

    // 7. Infractions (1-2)
    const infCol = app.findCollectionByNameOrId('infractions')
    const existingInfs = app.findRecordsByFilter('infractions', 'id != ""', '-created', 1, 0)
    if (existingInfs.length === 0 && createdPilots.length > 0) {
      const inf1 = new Record(infCol)
      inf1.set('pilot_id', p1.id)
      inf1.set('championship_id', cGT.id)
      inf1.set('type', 'ultrapassagem_perigosa')
      inf1.set(
        'description',
        'Manobra agressiva na curva 3 sem dar espaço mínimo regulamentar ao adversário.',
      )
      inf1.set('severity', 'media')
      inf1.set('status', 'em_revisao')
      app.save(inf1)

      const inf2 = new Record(infCol)
      inf2.set('pilot_id', p2.id)
      inf2.set('championship_id', cF4.id)
      inf2.set('type', 'excesso_de_velocidade')
      inf2.set(
        'description',
        'Excedeu em 12 km/h o limite de velocidade no pit lane durante o treino classificatório.',
      )
      inf2.set('severity', 'baixa')
      inf2.set('status', 'resolvida')
      app.save(inf2)
    }

    // 8. Invoices (1 pending, 1 paid)
    const invCol = app.findCollectionByNameOrId('invoices')
    const payCol = app.findCollectionByNameOrId('payments')
    const existingInvs = app.findRecordsByFilter('invoices', 'id != ""', '-created', 1, 0)

    let invPending, invPaid
    if (existingInvs.length === 0 && createdPilots.length >= 2) {
      invPending = new Record(invCol)
      invPending.set('pilot_id', p1.id)
      invPending.set('championship_id', cGT.id)
      invPending.set('amount', 1850.0)
      invPending.set('description', 'Taxa de Inscrição + Kit Paddock Copa GT')
      invPending.set('due_date', '2025-07-15 23:59:59.000Z')
      invPending.set('status', 'pendente')
      app.save(invPending)

      invPaid = new Record(invCol)
      invPaid.set('pilot_id', p2.id)
      invPaid.set('championship_id', cF4.id)
      invPaid.set('amount', 2400.0)
      invPaid.set('description', 'Inscrição Campeonato F4 2025 - Etapa Completa')
      invPaid.set('due_date', '2025-05-30 23:59:59.000Z')
      invPaid.set('status', 'pago')
      app.save(invPaid)

      // 9. Payment for invPaid
      const pay = new Record(payCol)
      pay.set('invoice_id', invPaid.id)
      pay.set('pilot_id', p2.id)
      pay.set('amount', 2400.0)
      pay.set('payment_date', '2025-05-28 14:32:00.000Z')
      pay.set('method', 'pix')
      app.save(pay)
    }

    // 10. Manufacturers (3)
    const manuCol = app.findCollectionByNameOrId('manufacturers')
    const manuData = [
      { name: 'Ferrari Competizione', country: 'Itália', founded_year: 1947 },
      { name: 'Porsche Motorsport', country: 'Alemanha', founded_year: 1931 },
      { name: 'Dallara Automobili', country: 'Itália', founded_year: 1972 },
    ]
    const createdManus = []
    for (const m of manuData) {
      let mRec
      try {
        mRec = app.findFirstRecordByData('manufacturers', 'name', m.name)
      } catch (_) {
        mRec = new Record(manuCol)
        mRec.set('name', m.name)
        mRec.set('country', m.country)
        mRec.set('founded_year', m.founded_year)
        app.save(mRec)
      }
      createdManus.push(mRec)
    }

    // 11. Cars (4)
    const carsCol = app.findCollectionByNameOrId('cars')
    const carsData = [
      {
        manufacturer_id: createdManus[0].id,
        model: 'Ferrari 296 GT3',
        year: 2024,
        category: 'GT3',
      },
      {
        manufacturer_id: createdManus[1].id,
        model: 'Porsche 911 GT3 R',
        year: 2024,
        category: 'GT3',
      },
      {
        manufacturer_id: createdManus[2].id,
        model: 'Dallara F4 T-421',
        year: 2023,
        category: 'Fórmula 4',
      },
      {
        manufacturer_id: createdManus[1].id,
        model: 'Porsche 718 Cayman GT4 RS',
        year: 2023,
        category: 'GT4',
      },
    ]
    for (const c of carsData) {
      try {
        app.findFirstRecordByData('cars', 'model', c.model)
      } catch (_) {
        const carRec = new Record(carsCol)
        carRec.set('manufacturer_id', c.manufacturer_id)
        carRec.set('model', c.model)
        carRec.set('year', c.year)
        carRec.set('category', c.category)
        app.save(carRec)
      }
    }

    // 12. Tracks (3)
    const tracksCol = app.findCollectionByNameOrId('tracks')
    const trackData = [
      { name: 'Autódromo José Carlos Pace (Interlagos)', country: 'Brasil', length: 4309 },
      { name: 'Autódromo Internacional de Curitiba', country: 'Brasil', length: 3695 },
      { name: 'Circuito de Silverstone', country: 'Reino Unido', length: 5891 },
    ]
    for (const t of trackData) {
      try {
        app.findFirstRecordByData('tracks', 'name', t.name)
      } catch (_) {
        const tr = new Record(tracksCol)
        tr.set('name', t.name)
        tr.set('country', t.country)
        tr.set('length', t.length)
        app.save(tr)
      }
    }

    // 13. Support tickets (2 with messages)
    const ticketCol = app.findCollectionByNameOrId('support_tickets')
    const msgCol = app.findCollectionByNameOrId('support_messages')
    const existingTickets = app.findRecordsByFilter('support_tickets', 'id != ""', '-created', 1, 0)

    if (existingTickets.length === 0) {
      const t1 = new Record(ticketCol)
      t1.set('user_id', clientUser.id)
      t1.set('subject', 'Dúvida sobre homologação de lastro para Etapa 2')
      t1.set(
        'content',
        'Gostaria de confirmar qual é o lastro de equilíbrio obrigatório para a próxima corrida da Copa GT.',
      )
      t1.set('status', 'em_andamento')
      t1.set('priority', 'media')
      app.save(t1)

      const m1_1 = new Record(msgCol)
      m1_1.set('ticket_id', t1.id)
      m1_1.set('user_id', clientUser.id)
      m1_1.set(
        'content',
        'Olá equipe, vi o regulamento preliminar mas tenho dúvidas sobre o peso mínimo com tanque cheio.',
      )
      app.save(m1_1)

      const m1_2 = new Record(msgCol)
      m1_2.set('ticket_id', t1.id)
      m1_2.set('user_id', adminUser.id)
      m1_2.set(
        'content',
        'Boa tarde Carlos! O lastro adicional de 15kg aplica-se apenas aos pilotos que subiram ao pódio na etapa anterior. Seu carro permanece com o peso base de homologação.',
      )
      app.save(m1_2)

      const t2 = new Record(ticketCol)
      t2.set('user_id', adminUser.id)
      t2.set('subject', 'Comprovante de pagamento via PIX')
      t2.set(
        'content',
        'A confirmação do PIX da inscrição de Ana Souza foi processada e conciliada com sucesso.',
      )
      t2.set('status', 'resolvido')
      t2.set('priority', 'baixa')
      app.save(t2)

      const m2_1 = new Record(msgCol)
      m2_1.set('ticket_id', t2.id)
      m2_1.set('user_id', adminUser.id)
      m2_1.set('content', 'Cobrança quitada e status do piloto atualizado para ativo.')
      app.save(m2_1)
    }
  },
  (app) => {
    // down: rollback seed if needed
  },
)
