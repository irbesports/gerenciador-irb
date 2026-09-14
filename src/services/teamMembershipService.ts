import { pb } from '@/lib/pocketbase/client'
import type { TeamMembership, Team } from '@/types'
import { domainAuditService } from './domainAuditService'

export const teamMembershipService = {
  listByDriver: async (driverId: string) => {
    return await pb.collection('team_memberships').getFullList<TeamMembership>({
      filter: `driver_id = "${driverId}"`,
      sort: '-start_date',
      expand: 'team_id,driver_id',
    })
  },

  listByTeam: async (teamId: string, onlyActive = false) => {
    const filter = onlyActive
      ? `team_id = "${teamId}" && status = "ativo"`
      : `team_id = "${teamId}"`
    return await pb.collection('team_memberships').getFullList<TeamMembership>({
      filter,
      sort: 'status,-start_date',
      expand: 'driver_id,team_id',
    })
  },

  getOne: async (id: string) => {
    return await pb.collection('team_memberships').getOne<TeamMembership>(id, {
      expand: 'driver_id,team_id',
    })
  },

  create: async (data: Partial<TeamMembership>) => {
    const created = await pb.collection('team_memberships').create<TeamMembership>(data)
    await domainAuditService.log({
      event_type: 'CREATE_TEAM_MEMBERSHIP',
      entity_name: 'team_memberships',
      entity_id: created.id,
      new_state: {
        driver_id: created.driver_id,
        team_id: created.team_id,
        role: created.role,
        status: created.status,
        start_date: created.start_date,
      },
      reason: 'Início de vínculo contratual/organizacional de membro com a equipe',
    })
    return created
  },

  update: async (id: string, data: Partial<TeamMembership>) => {
    const prev = await pb.collection('team_memberships').getOne<TeamMembership>(id)
    const updated = await pb.collection('team_memberships').update<TeamMembership>(id, data)
    await domainAuditService.log({
      event_type: 'UPDATE_TEAM_MEMBERSHIP',
      entity_name: 'team_memberships',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: 'Atualização de vínculo organizacional de equipe',
    })
    return updated
  },

  endMembership: async (id: string, endDate?: string, reason?: string) => {
    const prev = await pb.collection('team_memberships').getOne<TeamMembership>(id)
    const finalEnd = endDate || new Date().toISOString()
    const updated = await pb.collection('team_memberships').update<TeamMembership>(id, {
      status: 'encerrado',
      end_date: finalEnd,
      notes: reason ? `${prev.notes || ''} [Encerrado: ${reason}]`.trim() : prev.notes,
    })
    await domainAuditService.log({
      event_type: 'END_TEAM_MEMBERSHIP',
      entity_name: 'team_memberships',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: reason || 'Encerramento de vínculo organizacional com a equipe',
    })
    return updated
  },

  delete: async (id: string) => {
    const prev = await pb.collection('team_memberships').getOne<TeamMembership>(id)
    const res = await pb.collection('team_memberships').delete(id)
    await domainAuditService.log({
      event_type: 'DELETE_TEAM_MEMBERSHIP',
      entity_name: 'team_memberships',
      entity_id: id,
      previous_state: prev,
      reason: 'Exclusão de vínculo organizacional',
    })
    return res
  },
}

export const teamService = {
  list: async () => {
    return await pb.collection('teams').getFullList<Team>({
      sort: 'name',
      expand: 'owner_id',
    })
  },

  getOne: async (id: string) => {
    return await pb.collection('teams').getOne<Team>(id, {
      expand: 'owner_id',
    })
  },

  create: async (data: Partial<Team>) => {
    const created = await pb.collection('teams').create<Team>(data)
    await domainAuditService.log({
      event_type: 'CREATE_TEAM',
      entity_name: 'teams',
      entity_id: created.id,
      new_state: { name: created.name, status: created.status },
      reason: 'Cadastro de nova organização esportiva (Team)',
    })
    return created
  },

  update: async (id: string, data: Partial<Team>) => {
    const prev = await pb.collection('teams').getOne<Team>(id)
    const updated = await pb.collection('teams').update<Team>(id, data)
    await domainAuditService.log({
      event_type: 'UPDATE_TEAM',
      entity_name: 'teams',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: 'Atualização de dados cadastrais da equipe',
    })
    return updated
  },

  delete: async (id: string) => {
    const prev = await pb.collection('teams').getOne<Team>(id)
    const res = await pb.collection('teams').delete(id)
    await domainAuditService.log({
      event_type: 'DELETE_TEAM',
      entity_name: 'teams',
      entity_id: id,
      previous_state: prev,
      reason: 'Exclusão de equipe',
    })
    return res
  },
}
