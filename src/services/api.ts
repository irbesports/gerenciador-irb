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
