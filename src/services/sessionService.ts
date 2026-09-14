import { pb } from '@/lib/pocketbase/client'
import type { SessionRecord } from '@/types'
import { domainAuditService } from './domainAuditService'

export const sessionService = {
  listByStage: async (stageId: string) => {
    return await pb.collection('sessions').getFullList<SessionRecord>({
      filter: `stage_id = "${stageId}"`,
      sort: 'order',
      expand: 'stage_id,stage_id.track,stage_id.championship_edition_id',
    })
  },

  getOne: async (id: string) => {
    return await pb.collection('sessions').getOne<SessionRecord>(id, {
      expand: 'stage_id,stage_id.track,stage_id.championship_edition_id',
    })
  },

  create: async (data: Partial<SessionRecord>) => {
    const created = await pb.collection('sessions').create<SessionRecord>(data)
    await domainAuditService.log({
      event_type: 'CREATE_SESSION',
      entity_name: 'sessions',
      entity_id: created.id,
      new_state: {
        stage_id: created.stage_id,
        name: created.name,
        session_type: created.session_type,
        order: created.order,
      },
      reason: 'Criação de sessão operacional desportiva',
    })
    return created
  },

  update: async (id: string, data: Partial<SessionRecord>) => {
    const prev = await pb.collection('sessions').getOne<SessionRecord>(id)
    const updated = await pb.collection('sessions').update<SessionRecord>(id, data)
    await domainAuditService.log({
      event_type: 'UPDATE_SESSION',
      entity_name: 'sessions',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: 'Atualização de sessão desportiva',
    })
    return updated
  },

  delete: async (id: string) => {
    const prev = await pb.collection('sessions').getOne<SessionRecord>(id)
    const res = await pb.collection('sessions').delete(id)
    await domainAuditService.log({
      event_type: 'DELETE_SESSION',
      entity_name: 'sessions',
      entity_id: id,
      previous_state: prev,
      reason: 'Exclusão de sessão desportiva',
    })
    return res
  },
}
