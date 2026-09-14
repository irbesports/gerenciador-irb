import { pb } from '@/lib/pocketbase/client'
import type { ChampionshipEdition } from '@/types'
import { domainAuditService } from './domainAuditService'

export const championshipEditionService = {
  listAll: async () => {
    return await pb.collection('championship_editions').getFullList<ChampionshipEdition>({
      sort: '-created',
      expand: 'championship_id,season_id,season_id.year_id',
    })
  },

  listBySeason: async (seasonId: string) => {
    return await pb.collection('championship_editions').getFullList<ChampionshipEdition>({
      filter: `season_id = "${seasonId}"`,
      sort: '-created',
      expand: 'championship_id,season_id,season_id.year_id',
    })
  },

  listByChampionship: async (championshipId: string) => {
    return await pb.collection('championship_editions').getFullList<ChampionshipEdition>({
      filter: `championship_id = "${championshipId}"`,
      sort: '-created',
      expand: 'championship_id,season_id,season_id.year_id',
    })
  },

  getOne: async (id: string) => {
    return await pb.collection('championship_editions').getOne<ChampionshipEdition>(id, {
      expand: 'championship_id,season_id,season_id.year_id',
    })
  },

  getByChampAndSeason: async (championshipId: string, seasonId: string) => {
    const list = await pb.collection('championship_editions').getList<ChampionshipEdition>(1, 1, {
      filter: `championship_id = "${championshipId}" && season_id = "${seasonId}"`,
      expand: 'championship_id,season_id,season_id.year_id',
    })
    return list.items[0] || null
  },

  create: async (data: Partial<ChampionshipEdition>) => {
    const created = await pb.collection('championship_editions').create<ChampionshipEdition>(data)
    await domainAuditService.log({
      event_type: 'CREATE_CHAMPIONSHIP_EDITION',
      entity_name: 'championship_editions',
      entity_id: created.id,
      new_state: {
        championship_id: created.championship_id,
        season_id: created.season_id,
        edition_code: created.edition_code,
        status: created.status,
      },
      reason: 'Criação de edição de campeonato vinculada à temporada',
    })
    return created
  },

  update: async (id: string, data: Partial<ChampionshipEdition>) => {
    const prev = await pb.collection('championship_editions').getOne<ChampionshipEdition>(id)
    const updated = await pb
      .collection('championship_editions')
      .update<ChampionshipEdition>(id, data)
    await domainAuditService.log({
      event_type: 'UPDATE_CHAMPIONSHIP_EDITION',
      entity_name: 'championship_editions',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: 'Atualização de parâmetros da Championship Edition',
    })
    return updated
  },

  delete: async (id: string) => {
    const prev = await pb.collection('championship_editions').getOne<ChampionshipEdition>(id)
    const res = await pb.collection('championship_editions').delete(id)
    await domainAuditService.log({
      event_type: 'DELETE_CHAMPIONSHIP_EDITION',
      entity_name: 'championship_editions',
      entity_id: id,
      previous_state: prev,
      reason: 'Exclusão de Championship Edition',
    })
    return res
  },
}
