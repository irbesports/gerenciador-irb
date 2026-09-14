import { pb } from '@/lib/pocketbase/client'
import type { ChampionshipStage } from '@/types'
import { domainAuditService } from './domainAuditService'

export const stageService = {
  listByEdition: async (editionId: string) => {
    return await pb.collection('championship_stages').getFullList<ChampionshipStage>({
      filter: `championship_edition_id = "${editionId}"`,
      sort: 'order',
      expand: 'track,championship_edition_id,championship_id',
    })
  },

  listByChampionship: async (championshipId: string) => {
    return await pb.collection('championship_stages').getFullList<ChampionshipStage>({
      filter: `championship_id = "${championshipId}"`,
      sort: 'order',
      expand: 'track,championship_edition_id,championship_id',
    })
  },

  getOne: async (id: string) => {
    return await pb.collection('championship_stages').getOne<ChampionshipStage>(id, {
      expand: 'track,championship_edition_id,championship_id',
    })
  },

  create: async (data: Partial<ChampionshipStage>) => {
    const created = await pb.collection('championship_stages').create<ChampionshipStage>(data)
    await domainAuditService.log({
      event_type: 'CREATE_STAGE',
      entity_name: 'championship_stages',
      entity_id: created.id,
      new_state: {
        order: created.order,
        championship_edition_id: created.championship_edition_id,
        championship_id: created.championship_id,
        track: created.track,
      },
      reason: 'Criação de etapa associada à Championship Edition',
    })
    return created
  },

  update: async (id: string, data: Partial<ChampionshipStage>) => {
    const prev = await pb.collection('championship_stages').getOne<ChampionshipStage>(id)
    const updated = await pb.collection('championship_stages').update<ChampionshipStage>(id, data)
    await domainAuditService.log({
      event_type: 'UPDATE_STAGE',
      entity_name: 'championship_stages',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: 'Atualização de dados da etapa esportiva',
    })
    return updated
  },

  delete: async (id: string) => {
    const prev = await pb.collection('championship_stages').getOne<ChampionshipStage>(id)
    const res = await pb.collection('championship_stages').delete(id)
    await domainAuditService.log({
      event_type: 'DELETE_STAGE',
      entity_name: 'championship_stages',
      entity_id: id,
      previous_state: prev,
      reason: 'Remoção de etapa esportiva',
    })
    return res
  },
}
