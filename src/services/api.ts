import pb from '@/lib/pocketbase/client'
import type {
  Year,
  Season,
  Championship,
  ScoringRule,
  Pilot,
  Infraction,
  Invoice,
  Payment,
  Track,
  Manufacturer,
  Car,
  SupportTicket,
  SupportMessage,
  User,
  ChampionshipBattery,
  ChampionshipStage,
  StageRace,
  StageRaceComment,
  ScoringPreset,
  ChampionshipPilot,
  RaceImport,
  RaceResultRecord,
  ModerationCase,
  ModerationCaseMessage,
  AppNotification,
} from '@/types'

// Helper to get file URL
export const getFileUrl = (collectionName: string, recordId: string, filename?: string) => {
  if (!filename) return ''
  return pb.files.getURL({ id: recordId, collectionName }, filename)
}

// Years
export const yearsService = {
  list: async () => {
    return await pb.collection('years').getFullList<Year>({ sort: '-year' })
  },
  getOne: async (id: string) => {
    return await pb.collection('years').getOne<Year>(id)
  },
  create: async (data: Partial<Year>) => {
    return await pb.collection('years').create<Year>(data)
  },
  update: async (id: string, data: Partial<Year>) => {
    return await pb.collection('years').update<Year>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('years').delete(id)
  },
}

// Seasons
export const seasonsService = {
  list: async (yearId?: string) => {
    const filter = yearId ? `year_id = "${yearId}"` : ''
    return await pb.collection('seasons').getFullList<Season>({
      filter,
      sort: '-start_date',
      expand: 'year_id',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('seasons').getOne<Season>(id, {
      expand: 'year_id',
    })
  },
  create: async (data: Partial<Season>) => {
    return await pb.collection('seasons').create<Season>(data)
  },
  update: async (id: string, data: Partial<Season>) => {
    return await pb.collection('seasons').update<Season>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('seasons').delete(id)
  },
}

// Championship Stages
export const championshipStagesService = {
  listByChampionship: async (championshipId: string) => {
    return await pb.collection('championship_stages').getFullList<ChampionshipStage>({
      filter: `championship_id = "${championshipId}"`,
      sort: 'order',
      expand: 'track',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('championship_stages').getOne<ChampionshipStage>(id, {
      expand: 'track,championship_id',
    })
  },
  create: async (data: Partial<ChampionshipStage>) => {
    return await pb.collection('championship_stages').create<ChampionshipStage>(data)
  },
  update: async (id: string, data: Partial<ChampionshipStage>) => {
    return await pb.collection('championship_stages').update<ChampionshipStage>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('championship_stages').delete(id)
  },
}

// Stage Races (races inside a stage)
export const stageRacesService = {
  listByStage: async (stageId: string) => {
    return await pb.collection('stage_races').getFullList<StageRace>({
      filter: `stage_id = "${stageId}"`,
      sort: 'order',
      expand: 'stage_id,stage_id.track,stage_id.championship_id',
    })
  },
  listByChampionship: async (championshipId: string) => {
    return await pb.collection('stage_races').getFullList<StageRace>({
      filter: `stage_id.championship_id = "${championshipId}"`,
      sort: 'stage_id.order,order',
      expand: 'stage_id,stage_id.track',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('stage_races').getOne<StageRace>(id, {
      expand: 'stage_id,stage_id.track,stage_id.championship_id',
    })
  },
  create: async (data: Partial<StageRace>) => {
    return await pb.collection('stage_races').create<StageRace>(data)
  },
  update: async (id: string, data: Partial<StageRace>) => {
    return await pb.collection('stage_races').update<StageRace>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('stage_races').delete(id)
  },
}

// Stage Race Comments
export const stageRaceCommentsService = {
  listByRace: async (raceId: string) => {
    return await pb.collection('stage_race_comments').getFullList<StageRaceComment>({
      filter: `race_id = "${raceId}"`,
      sort: 'created',
      expand: 'user_id',
    })
  },
  create: async (raceId: string, message: string, userId: string) => {
    return await pb.collection('stage_race_comments').create<StageRaceComment>({
      race_id: raceId,
      user_id: userId,
      message,
    })
  },
  delete: async (id: string) => {
    return await pb.collection('stage_race_comments').delete(id)
  },
}

// Scoring Presets Library
export const scoringPresetsService = {
  list: async () => {
    return await pb.collection('scoring_presets').getFullList<ScoringPreset>({
      sort: 'name',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('scoring_presets').getOne<ScoringPreset>(id)
  },
  create: async (data: Partial<ScoringPreset>) => {
    return await pb.collection('scoring_presets').create<ScoringPreset>(data)
  },
  update: async (id: string, data: Partial<ScoringPreset>) => {
    return await pb.collection('scoring_presets').update<ScoringPreset>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('scoring_presets').delete(id)
  },
}

// Championship Pilots (registrations)
export const championshipPilotsService = {
  listByChampionship: async (championshipId: string) => {
    return await pb.collection('championship_pilots').getFullList<ChampionshipPilot>({
      filter: `championship_id = "${championshipId}"`,
      sort: 'number',
      expand: 'pilot',
    })
  },
  create: async (data: Partial<ChampionshipPilot>) => {
    return await pb.collection('championship_pilots').create<ChampionshipPilot>(data)
  },
  update: async (id: string, data: Partial<ChampionshipPilot>) => {
    return await pb.collection('championship_pilots').update<ChampionshipPilot>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('championship_pilots').delete(id)
  },
}

// Championships
export const championshipsService = {
  list: async (seasonId?: string) => {
    const filter = seasonId ? `season_id = "${seasonId}"` : ''
    return await pb.collection('championships').getFullList<Championship>({
      filter,
      sort: '-created',
      expand: 'season_id,season_id.year_id',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('championships').getOne<Championship>(id, {
      expand: 'season_id,season_id.year_id',
    })
  },
  create: async (data: Partial<Championship>) => {
    return await pb.collection('championships').create<Championship>(data)
  },
  update: async (id: string, data: Partial<Championship>) => {
    return await pb.collection('championships').update<Championship>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('championships').delete(id)
  },
}

// Championship Batteries
export const championshipBatteriesService = {
  listByChampionship: async (championshipId: string) => {
    return await pb.collection('championship_batteries').getFullList<ChampionshipBattery>({
      filter: `championship_id = "${championshipId}"`,
      sort: 'order',
    })
  },
  create: async (data: Partial<ChampionshipBattery>) => {
    return await pb.collection('championship_batteries').create<ChampionshipBattery>(data)
  },
  update: async (id: string, data: Partial<ChampionshipBattery>) => {
    return await pb.collection('championship_batteries').update<ChampionshipBattery>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('championship_batteries').delete(id)
  },
}

// Scoring Rules
export const scoringRulesService = {
  listByChampionship: async (championshipId: string) => {
    return await pb.collection('scoring_rules').getFullList<ScoringRule>({
      filter: `championship_id = "${championshipId}"`,
      sort: 'position',
    })
  },
  saveRules: async (
    championshipId: string,
    rules: { position: number; points: number; bonus_fastest_lap?: number }[],
  ) => {
    // Delete existing
    const existing = await pb.collection('scoring_rules').getFullList<ScoringRule>({
      filter: `championship_id = "${championshipId}"`,
    })
    for (const item of existing) {
      await pb.collection('scoring_rules').delete(item.id)
    }
    // Create new
    for (const rule of rules) {
      await pb.collection('scoring_rules').create({
        championship_id: championshipId,
        position: rule.position,
        points: rule.points,
        bonus_fastest_lap: rule.bonus_fastest_lap || 0,
      })
    }
  },
}

// Pilots
export const pilotsService = {
  list: async () => {
    return await pb.collection('pilots').getFullList<Pilot>({
      sort: 'name',
      expand: 'user_id',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('pilots').getOne<Pilot>(id, {
      expand: 'user_id',
    })
  },
  getByIracingId: async (iracingId: string | number) => {
    const idStr = String(iracingId).trim()
    if (!idStr) return null
    try {
      const records = await pb.collection('pilots').getFullList<Pilot>({
        filter: `iracing_id = "${idStr}"`,
        limit: 1,
      })
      return records[0] || null
    } catch {
      return null
    }
  },
  create: async (data: any) => {
    return await pb.collection('pilots').create<Pilot>(data)
  },
  update: async (id: string, data: any) => {
    return await pb.collection('pilots').update<Pilot>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('pilots').delete(id)
  },
}

// Race Imports & Results
export const raceImportsService = {
  listByStageRace: async (stageRaceId: string) => {
    return await pb.collection('race_imports').getFullList<RaceImport>({
      filter: `stage_race_id = "${stageRaceId}"`,
      sort: '-created',
      expand: 'imported_by,stage_race_id',
    })
  },
  listByChampionship: async (championshipId: string) => {
    return await pb.collection('race_imports').getFullList<RaceImport>({
      filter: `championship_id = "${championshipId}"`,
      sort: '-created',
      expand: 'imported_by,stage_race_id',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('race_imports').getOne<RaceImport>(id, {
      expand: 'imported_by,stage_race_id',
    })
  },
  create: async (data: Partial<RaceImport>) => {
    return await pb.collection('race_imports').create<RaceImport>(data)
  },
  update: async (id: string, data: Partial<RaceImport>) => {
    return await pb.collection('race_imports').update<RaceImport>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('race_imports').delete(id)
  },
}

export const raceResultsService = {
  listByRace: async (stageRaceId: string, onlyActive = true) => {
    const filter = onlyActive
      ? `stage_race_id = "${stageRaceId}" && status = "ativo"`
      : `stage_race_id = "${stageRaceId}"`
    return await pb.collection('race_results').getFullList<RaceResultRecord>({
      filter,
      sort: 'finish_position',
      expand: 'pilot_id,stage_race_id,race_import_id',
    })
  },
  listByChampionship: async (championshipId: string, onlyActive = true) => {
    const filter = onlyActive
      ? `championship_id = "${championshipId}" && status = "ativo"`
      : `championship_id = "${championshipId}"`
    return await pb.collection('race_results').getFullList<RaceResultRecord>({
      filter,
      sort: 'finish_position',
      expand: 'pilot_id,stage_race_id,race_import_id',
    })
  },
  listByPilot: async (pilotId: string, onlyActive = true) => {
    const filter = onlyActive
      ? `pilot_id = "${pilotId}" && status = "ativo"`
      : `pilot_id = "${pilotId}"`
    return await pb.collection('race_results').getFullList<RaceResultRecord>({
      filter,
      sort: '-created',
      expand:
        'stage_race_id.stage_id.championship_id.season_id.year_id,championship_id.season_id.year_id,pilot_id',
    })
  },
  listByCustId: async (custId: number, onlyActive = true) => {
    const filter = onlyActive ? `cust_id = ${custId} && status = "ativo"` : `cust_id = ${custId}`
    return await pb.collection('race_results').getFullList<RaceResultRecord>({
      filter,
      sort: '-created',
      expand:
        'stage_race_id.stage_id.championship_id.season_id.year_id,championship_id.season_id.year_id,pilot_id',
    })
  },
  create: async (data: Partial<RaceResultRecord>) => {
    return await pb.collection('race_results').create<RaceResultRecord>(data)
  },
  update: async (id: string, data: Partial<RaceResultRecord>) => {
    return await pb.collection('race_results').update<RaceResultRecord>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('race_results').delete(id)
  },
}

// Infractions
export const infractionsService = {
  list: async (statusFilter?: string) => {
    const filter = statusFilter && statusFilter !== 'todos' ? `status = "${statusFilter}"` : ''
    return await pb.collection('infractions').getFullList<Infraction>({
      filter,
      sort: '-created',
      expand: 'pilot_id,championship_id',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('infractions').getOne<Infraction>(id, {
      expand: 'pilot_id,championship_id',
    })
  },
  create: async (data: Partial<Infraction>) => {
    return await pb.collection('infractions').create<Infraction>(data)
  },
  update: async (id: string, data: Partial<Infraction>) => {
    return await pb.collection('infractions').update<Infraction>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('infractions').delete(id)
  },
}

// Invoices
export const invoicesService = {
  list: async () => {
    return await pb.collection('invoices').getFullList<Invoice>({
      sort: '-due_date',
      expand: 'pilot_id,championship_id',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('invoices').getOne<Invoice>(id, {
      expand: 'pilot_id,championship_id',
    })
  },
  create: async (data: Partial<Invoice>) => {
    return await pb.collection('invoices').create<Invoice>(data)
  },
  update: async (id: string, data: Partial<Invoice>) => {
    return await pb.collection('invoices').update<Invoice>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('invoices').delete(id)
  },
}

// Payments
export const paymentsService = {
  list: async () => {
    return await pb.collection('payments').getFullList<Payment>({
      sort: '-payment_date',
      expand: 'invoice_id,pilot_id',
    })
  },
  listByInvoice: async (invoiceId: string) => {
    return await pb.collection('payments').getFullList<Payment>({
      filter: `invoice_id = "${invoiceId}"`,
      sort: '-payment_date',
      expand: 'pilot_id',
    })
  },
  create: async (data: Partial<Payment>) => {
    const payment = await pb.collection('payments').create<Payment>(data)
    // Mark invoice as paid if amount matches or exceeds
    if (data.invoice_id) {
      await pb.collection('invoices').update(data.invoice_id, {
        status: 'pago',
      })
    }
    return payment
  },
  delete: async (id: string) => {
    return await pb.collection('payments').delete(id)
  },
}

// Moderation Cases (Race Incidents & Protests)
export const moderationCasesService = {
  listByRace: async (stageRaceId: string, includeCancelled = false) => {
    const filter = includeCancelled
      ? `stage_race_id = "${stageRaceId}"`
      : `stage_race_id = "${stageRaceId}" && (cancelled = false || cancelled = null)`
    return await pb.collection('moderation_cases').getFullList<ModerationCase>({
      filter,
      sort: 'case_number,lap',
      expand:
        'stage_race_id,stage_race_id.stage_id,stage_race_id.stage_id.track,stage_race_id.stage_id.championship_id,involved_pilots,guilty_pilot_id,author_pilot_id,author_user_id',
    })
  },
  listByChampionship: async (championshipId: string, includeCancelled = false) => {
    const filter = includeCancelled
      ? `championship_id = "${championshipId}"`
      : `championship_id = "${championshipId}" && (cancelled = false || cancelled = null)`
    return await pb.collection('moderation_cases').getFullList<ModerationCase>({
      filter,
      sort: '-created',
      expand:
        'stage_race_id,stage_race_id.stage_id,stage_race_id.stage_id.track,involved_pilots,guilty_pilot_id,author_pilot_id,author_user_id',
    })
  },
  listAll: async (includeCancelled = false) => {
    const filter = includeCancelled ? '' : 'cancelled = false || cancelled = null'
    return await pb.collection('moderation_cases').getFullList<ModerationCase>({
      filter: filter || undefined,
      sort: '-created',
      expand:
        'stage_race_id,stage_race_id.stage_id,stage_race_id.stage_id.track,stage_race_id.stage_id.championship_id,involved_pilots,guilty_pilot_id,author_pilot_id,author_user_id',
    })
  },
  getOne: async (id: string) => {
    return await pb.collection('moderation_cases').getOne<ModerationCase>(id, {
      expand:
        'stage_race_id,stage_race_id.stage_id,stage_race_id.stage_id.track,stage_race_id.stage_id.championship_id,involved_pilots,guilty_pilot_id,author_pilot_id,author_user_id',
    })
  },
  create: async (data: Partial<ModerationCase>) => {
    return await pb.collection('moderation_cases').create<ModerationCase>(data)
  },
  update: async (id: string, data: Partial<ModerationCase>) => {
    return await pb.collection('moderation_cases').update<ModerationCase>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('moderation_cases').delete(id)
  },
}

// Moderation Case Messages (Thread / Versions)
export const moderationCaseMessagesService = {
  listByCase: async (caseId: string) => {
    return await pb.collection('moderation_case_messages').getFullList<ModerationCaseMessage>({
      filter: `case_id = "${caseId}"`,
      sort: 'created',
      expand: 'user_id,pilot_id',
    })
  },
  create: async (data: Partial<ModerationCaseMessage>) => {
    return await pb.collection('moderation_case_messages').create<ModerationCaseMessage>(data)
  },
  delete: async (id: string) => {
    return await pb.collection('moderation_case_messages').delete(id)
  },
}

// Notifications Service
export const notificationsService = {
  listForCurrentUser: async (userId?: string, pilotId?: string) => {
    if (!userId && !pilotId) return []
    const parts: string[] = []
    if (userId) parts.push(`recipient_user_id = "${userId}"`)
    if (pilotId) parts.push(`recipient_pilot_id = "${pilotId}"`)
    const filter = parts.join(' || ')
    return await pb.collection('notifications').getFullList<AppNotification>({
      filter,
      sort: '-created',
      expand: 'recipient_pilot_id,moderation_case_id',
    })
  },
  markAsRead: async (id: string) => {
    return await pb.collection('notifications').update<AppNotification>(id, { read: true })
  },
  markAllAsRead: async (userId?: string, pilotId?: string) => {
    const list = await notificationsService.listForCurrentUser(userId, pilotId)
    const unread = list.filter((n) => !n.read)
    await Promise.all(
      unread.map((n) => pb.collection('notifications').update(n.id, { read: true })),
    )
  },
  create: async (data: Partial<AppNotification>) => {
    return await pb.collection('notifications').create<AppNotification>(data)
  },
  delete: async (id: string) => {
    return await pb.collection('notifications').delete(id)
  },
  // Helper to notify pilots involved in a moderation case
  notifyInvolvedPilots: async (params: {
    caseRecord: ModerationCase
    involvedPilotRecords:
      | Pilot[]
      | { id: string; name?: string; number?: number; user_id?: string }[]
    stageName: string
    trackName: string
    raceName: string
    lap: number | string
    openedByType: 'comissarios' | 'protesto_piloto'
    protestingPilotName?: string
    status?: string
    penaltyApplied?: string
  }) => {
    const {
      caseRecord,
      involvedPilotRecords,
      stageName,
      trackName,
      raceName,
      lap,
      openedByType,
      protestingPilotName,
      status,
      penaltyApplied,
    } = params

    const targetLink = `/moderacao/caso/${caseRecord.id}`
    const involvedNames = involvedPilotRecords
      .map((p) => `#${p.number ?? ''} ${p.name || ''}`.trim())
      .filter(Boolean)
      .join(', ')

    for (const pilot of involvedPilotRecords) {
      // Do not notify the author pilot about their own protest
      if (openedByType === 'protesto_piloto' && caseRecord.author_pilot_id === pilot.id) {
        continue
      }

      let title = ''
      let message = ''

      const codePrefix = caseRecord.code ? `[${caseRecord.code}] ` : ''

      if (openedByType === 'protesto_piloto') {
        title = `${codePrefix}Protesto aberto — ${raceName} (Volta ${lap})`
        message = `Abriram um protesto contra você na ${stageName} da pista ${trackName}, da ${raceName} na volta ${lap}, envolvendo: ${involvedNames}. Notificado por: ${protestingPilotName || 'Piloto'}. Você tem até 24h para dar sua versão do incidente no sistema.`
      } else if (status === 'Aplicado em corrida') {
        title = `${codePrefix}Punição aplicada em corrida — ${raceName} (Volta ${lap})`
        message = `A comissão aplicou penalidade em corrida na ${stageName}, pista ${trackName}, volta ${lap}. Infração: ${caseRecord.infraction_cited || 'Penalidade desportiva'}. ${penaltyApplied ? `Punição: ${penaltyApplied}.` : ''} Você tem 24h para registrar manifestação.`
      } else if (status === 'Aplicado pós corrida') {
        title = `${codePrefix}Incidente marcado para pós-corrida — ${raceName} (Volta ${lap})`
        message = `Seu nome foi citado em incidente na ${stageName}, pista ${trackName}, volta ${lap}, marcado para julgamento pós-corrida. Prazo de 24h para envio da sua versão.`
      } else if (status === 'Nenhuma ação necessária') {
        title = `${codePrefix}Incidente analisado (Nenhuma ação) — ${raceName} (Volta ${lap})`
        message = `O incidente registrado na ${stageName}, pista ${trackName}, volta ${lap} foi considerado lance de corrida. Nenhuma penalidade foi aplicada.`
      } else {
        title = `${codePrefix}Incidente em análise — ${raceName} (Volta ${lap})`
        message = `Seu nome está envolvido em um incidente na ${stageName}, pista ${trackName}, da ${raceName} na volta ${lap}, envolvendo: ${involvedNames}. Notificado por: Comissários de Prova. Acesse para apresentar sua versão (prazo de 24h).`
      }

      try {
        await pb.collection('notifications').create({
          recipient_user_id: pilot.user_id || undefined,
          recipient_pilot_id: pilot.id,
          type: openedByType === 'protesto_piloto' ? 'protesto' : 'comissarios',
          title,
          message,
          target_link: targetLink,
          read: false,
          moderation_case_id: caseRecord.id,
        })
      } catch (err) {
        console.error('Error creating notification for pilot:', pilot.id, err)
      }
    }
  },
  // Helper to notify when a decision/resolution is applied
  notifyCaseRuling: async (params: {
    caseRecord: ModerationCase
    involvedPilotRecords: Pilot[]
    status: string
    rulingText: string
  }) => {
    const { caseRecord, involvedPilotRecords, status, rulingText } = params
    const targetLink = `/moderacao/caso/${caseRecord.id}`

    for (const pilot of involvedPilotRecords) {
      try {
        await pb.collection('notifications').create({
          recipient_user_id: pilot.user_id || undefined,
          recipient_pilot_id: pilot.id,
          type: 'decisao',
          title: `Decisão de incidente: ${status}`,
          message: `A comissão de prova registrou uma decisão no caso da volta ${caseRecord.lap}: "${status}". ${rulingText ? `Resumo: ${rulingText}` : ''}`,
          target_link: targetLink,
          read: false,
          moderation_case_id: caseRecord.id,
        })
      } catch (err) {
        console.error('Error creating ruling notification for pilot:', pilot.id, err)
      }
    }
  },
}

// Reference Data: Tracks, Manufacturers, Cars
export const tracksService = {
  list: async () => {
    return await pb.collection('tracks').getFullList<Track>({ sort: 'name' })
  },
  create: async (data: any) => {
    return await pb.collection('tracks').create<Track>(data)
  },
  update: async (id: string, data: any) => {
    return await pb.collection('tracks').update<Track>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('tracks').delete(id)
  },
}

export const manufacturersService = {
  list: async () => {
    return await pb.collection('manufacturers').getFullList<Manufacturer>({ sort: 'name' })
  },
  create: async (data: any) => {
    return await pb.collection('manufacturers').create<Manufacturer>(data)
  },
  update: async (id: string, data: any) => {
    return await pb.collection('manufacturers').update<Manufacturer>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('manufacturers').delete(id)
  },
}

export const carsService = {
  list: async () => {
    return await pb.collection('cars').getFullList<Car>({
      sort: 'model',
      expand: 'manufacturer_id',
    })
  },
  create: async (data: any) => {
    return await pb.collection('cars').create<Car>(data)
  },
  update: async (id: string, data: any) => {
    return await pb.collection('cars').update<Car>(id, data)
  },
  delete: async (id: string) => {
    return await pb.collection('cars').delete(id)
  },
}

// Support
export const supportService = {
  listTickets: async () => {
    return await pb.collection('support_tickets').getFullList<SupportTicket>({
      sort: '-created',
      expand: 'user_id',
    })
  },
  getTicket: async (id: string) => {
    return await pb.collection('support_tickets').getOne<SupportTicket>(id, {
      expand: 'user_id',
    })
  },
  createTicket: async (data: Partial<SupportTicket>) => {
    return await pb.collection('support_tickets').create<SupportTicket>(data)
  },
  updateTicket: async (id: string, data: Partial<SupportTicket>) => {
    return await pb.collection('support_tickets').update<SupportTicket>(id, data)
  },
  listMessages: async (ticketId: string) => {
    return await pb.collection('support_messages').getFullList<SupportMessage>({
      filter: `ticket_id = "${ticketId}"`,
      sort: 'created',
      expand: 'user_id',
    })
  },
  sendMessage: async (ticketId: string, content: string, userId: string) => {
    return await pb.collection('support_messages').create<SupportMessage>({
      ticket_id: ticketId,
      user_id: userId,
      content,
    })
  },
}

// Users / Admin
export const usersService = {
  list: async () => {
    return await pb.collection('users').getFullList<User>({ sort: '-created' })
  },
  updateRole: async (id: string, role: string) => {
    return await pb.collection('users').update<User>(id, { role })
  },
}
