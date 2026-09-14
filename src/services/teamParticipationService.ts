import { pb } from '@/lib/pocketbase/client'
import type { TeamParticipation, SubTeam } from '@/types'
import { domainAuditService } from './domainAuditService'

export const teamParticipationService = {
  listByEdition: async (editionId: string) => {
    return await pb.collection('team_participations').getFullList<TeamParticipation>({
      filter: `championship_edition_id = "${editionId}"`,
      sort: 'team_id.name',
      expand: 'team_id,championship_edition_id',
    })
  },

  listByTeam: async (teamId: string) => {
    return await pb.collection('team_participations').getFullList<TeamParticipation>({
      filter: `team_id = "${teamId}"`,
      sort: '-created',
      expand: 'team_id,championship_edition_id',
    })
  },

  getOne: async (id: string) => {
    return await pb.collection('team_participations').getOne<TeamParticipation>(id, {
      expand: 'team_id,championship_edition_id',
    })
  },

  /**
   * Registra a participação do Team na Edition com garantia de Sub-team padrão
   */
  create: async (data: Partial<TeamParticipation>, autoCreateSubTeam = true) => {
    // 1. Antecipar duplicidade no frontend conforme Regra Fundamental 2
    if (data.team_id && data.championship_edition_id) {
      const existing = await pb.collection('team_participations').getList<TeamParticipation>(1, 1, {
        filter: `team_id = "${data.team_id}" && championship_edition_id = "${data.championship_edition_id}"`,
      })
      if (existing.items.length > 0) {
        throw new Error('Esta equipe já possui participação cadastrada nesta edição do campeonato.')
      }
    }

    const created = await pb.collection('team_participations').create<TeamParticipation>(data)

    await domainAuditService.log({
      event_type: 'CREATE_TEAM_PARTICIPATION',
      entity_name: 'team_participations',
      entity_id: created.id,
      new_state: {
        team_id: created.team_id,
        championship_edition_id: created.championship_edition_id,
        status: created.status,
      },
      reason: 'Inscrição oficial de equipe na Championship Edition',
    })

    // Regra: toda Team Participation deve ter ao menos uma Sub-team
    if (autoCreateSubTeam && created.id) {
      try {
        const teamObj = await pb.collection('teams').getOne(created.team_id)
        const subName = teamObj.name || 'Equipe Principal'
        await subTeamService.create({
          team_participation_id: created.id,
          name: subName,
          status: 'ativa',
        })
      } catch (err) {
        console.warn('Sub-team padrão não pôde ser criada automaticamente:', err)
      }
    }

    return created
  },

  update: async (id: string, data: Partial<TeamParticipation>) => {
    const prev = await pb.collection('team_participations').getOne<TeamParticipation>(id)
    const updated = await pb.collection('team_participations').update<TeamParticipation>(id, data)
    await domainAuditService.log({
      event_type: 'UPDATE_TEAM_PARTICIPATION',
      entity_name: 'team_participations',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: 'Atualização de status/dados de participação de equipe',
    })
    return updated
  },

  delete: async (id: string) => {
    const prev = await pb.collection('team_participations').getOne<TeamParticipation>(id)
    const res = await pb.collection('team_participations').delete(id)
    await domainAuditService.log({
      event_type: 'DELETE_TEAM_PARTICIPATION',
      entity_name: 'team_participations',
      entity_id: id,
      previous_state: prev,
      reason: 'Exclusão de participação da equipe na edição',
    })
    return res
  },
}

export const subTeamService = {
  listByParticipation: async (participationId: string) => {
    return await pb.collection('sub_teams').getFullList<SubTeam>({
      filter: `team_participation_id = "${participationId}"`,
      sort: 'name',
      expand: 'team_participation_id,team_participation_id.team_id',
    })
  },

  getOne: async (id: string) => {
    return await pb.collection('sub_teams').getOne<SubTeam>(id, {
      expand: 'team_participation_id,team_participation_id.team_id',
    })
  },

  create: async (data: Partial<SubTeam>) => {
    const created = await pb.collection('sub_teams').create<SubTeam>(data)
    await domainAuditService.log({
      event_type: 'CREATE_SUB_TEAM',
      entity_name: 'sub_teams',
      entity_id: created.id,
      new_state: {
        team_participation_id: created.team_participation_id,
        name: created.name,
        car_class: created.car_class,
      },
      reason: 'Criação de Sub-team operacional vinculada a Team Participation',
    })
    return created
  },

  update: async (id: string, data: Partial<SubTeam>) => {
    const prev = await pb.collection('sub_teams').getOne<SubTeam>(id)
    const updated = await pb.collection('sub_teams').update<SubTeam>(id, data)
    await domainAuditService.log({
      event_type: 'UPDATE_SUB_TEAM',
      entity_name: 'sub_teams',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: 'Atualização de Sub-team',
    })
    return updated
  },

  delete: async (id: string) => {
    const prev = await pb.collection('sub_teams').getOne<SubTeam>(id)
    const res = await pb.collection('sub_teams').delete(id)
    await domainAuditService.log({
      event_type: 'DELETE_SUB_TEAM',
      entity_name: 'sub_teams',
      entity_id: id,
      previous_state: prev,
      reason: 'Remoção de Sub-team',
    })
    return res
  },
}
