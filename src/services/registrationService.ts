import { pb } from '@/lib/pocketbase/client'
import type { Registration, DriverChampionshipRepresentation } from '@/types'
import { domainAuditService } from './domainAuditService'

export const registrationService = {
  listByEdition: async (editionId: string, onlyApproved = false) => {
    const filter = onlyApproved
      ? `championship_edition_id = "${editionId}" && status = "aprovada"`
      : `championship_edition_id = "${editionId}"`
    return await pb.collection('registrations').getFullList<Registration>({
      filter,
      sort: 'car_number',
      expand: 'driver_id,championship_edition_id',
    })
  },

  listByDriver: async (driverId: string) => {
    return await pb.collection('registrations').getFullList<Registration>({
      filter: `driver_id = "${driverId}"`,
      sort: '-created',
      expand: 'championship_edition_id,championship_edition_id.championship_id',
    })
  },

  getOne: async (id: string) => {
    return await pb.collection('registrations').getOne<Registration>(id, {
      expand: 'driver_id,championship_edition_id',
    })
  },

  getByDriverAndEdition: async (driverId: string, editionId: string) => {
    const list = await pb.collection('registrations').getList<Registration>(1, 1, {
      filter: `driver_id = "${driverId}" && championship_edition_id = "${editionId}"`,
      expand: 'driver_id,championship_edition_id',
    })
    return list.items[0] || null
  },

  create: async (data: Partial<Registration>) => {
    // Antecipação de duplicidade no frontend conforme Regra Fundamental 2
    if (data.driver_id && data.championship_edition_id) {
      const existing = await pb.collection('registrations').getList<Registration>(1, 1, {
        filter: `driver_id = "${data.driver_id}" && championship_edition_id = "${data.championship_edition_id}"`,
      })
      if (existing.items.length > 0) {
        throw new Error('Piloto já possui inscrição cadastrada nesta edição de campeonato.')
      }
    }

    const created = await pb.collection('registrations').create<Registration>(data)
    await domainAuditService.log({
      event_type: 'CREATE_REGISTRATION',
      entity_name: 'registrations',
      entity_id: created.id,
      new_state: {
        driver_id: created.driver_id,
        championship_edition_id: created.championship_edition_id,
        car_number: created.car_number,
        car_class: created.car_class,
        status: created.status,
      },
      reason: 'Nova inscrição de piloto na Championship Edition (independente de equipe)',
    })
    return created
  },

  update: async (id: string, data: Partial<Registration>) => {
    const prev = await pb.collection('registrations').getOne<Registration>(id)
    const updated = await pb.collection('registrations').update<Registration>(id, data)
    await domainAuditService.log({
      event_type: 'UPDATE_REGISTRATION',
      entity_name: 'registrations',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: 'Atualização de status ou dados de inscrição',
    })
    return updated
  },

  delete: async (id: string) => {
    const prev = await pb.collection('registrations').getOne<Registration>(id)
    const res = await pb.collection('registrations').delete(id)
    await domainAuditService.log({
      event_type: 'DELETE_REGISTRATION',
      entity_name: 'registrations',
      entity_id: id,
      previous_state: prev,
      reason: 'Exclusão de inscrição de piloto',
    })
    return res
  },
}

export const driverRepresentationService = {
  listByEdition: async (editionId: string, onlyActive = true) => {
    const filter = onlyActive
      ? `championship_edition_id = "${editionId}" && status = "ativa"`
      : `championship_edition_id = "${editionId}"`
    return await pb
      .collection('driver_championship_representations')
      .getFullList<DriverChampionshipRepresentation>({
        filter,
        sort: 'driver_id.name',
        expand:
          'driver_id,registration_id,team_participation_id,team_participation_id.team_id,sub_team_id',
      })
  },

  listByDriver: async (driverId: string, editionId?: string) => {
    const filter = editionId
      ? `driver_id = "${driverId}" && championship_edition_id = "${editionId}"`
      : `driver_id = "${driverId}"`
    return await pb
      .collection('driver_championship_representations')
      .getFullList<DriverChampionshipRepresentation>({
        filter,
        sort: '-start_date',
        expand: 'team_participation_id.team_id,sub_team_id,championship_edition_id',
      })
  },

  getOne: async (id: string) => {
    return await pb
      .collection('driver_championship_representations')
      .getOne<DriverChampionshipRepresentation>(id, {
        expand:
          'driver_id,registration_id,team_participation_id,team_participation_id.team_id,sub_team_id',
      })
  },

  create: async (data: Partial<DriverChampionshipRepresentation>) => {
    // Antecipação frontend da regra de unicidade ativa
    if (
      data.driver_id &&
      data.championship_edition_id &&
      (data.status === 'ativa' || !data.status)
    ) {
      const activeExisting = await pb
        .collection('driver_championship_representations')
        .getList(1, 1, {
          filter: `driver_id = "${data.driver_id}" && championship_edition_id = "${data.championship_edition_id}" && status = "ativa"`,
        })
      if (activeExisting.items.length > 0) {
        throw new Error(
          'Piloto já possui representação esportiva ativa nesta edição. Encerre ou realize a transferência antes de criar uma nova.',
        )
      }
    }

    const created = await pb
      .collection('driver_championship_representations')
      .create<DriverChampionshipRepresentation>(data)

    await domainAuditService.log({
      event_type: 'CREATE_DRIVER_REPRESENTATION',
      entity_name: 'driver_championship_representations',
      entity_id: created.id,
      new_state: {
        driver_id: created.driver_id,
        championship_edition_id: created.championship_edition_id,
        sub_team_id: created.sub_team_id,
        status: created.status,
      },
      reason: created.change_reason || 'Atribuição de representação desportiva de equipe',
    })
    return created
  },

  /**
   * FLUXO DE TRANSFERÊNCIA DE DRIVER:
   * 1. Encerra a representação anterior com status 'transferida' e end_date preenchido.
   * 2. Registra log de auditoria.
   * 3. Cria a nova representação apontando para previous_representation_id.
   * 4. Preserva integralmente o histórico sem sobrescrever registros antigos.
   */
  transfer: async (params: {
    previousRepresentationId: string
    driverId: string
    registrationId: string
    editionId: string
    newTeamParticipationId: string
    newSubTeamId: string
    transferDate?: string
    reason?: string
  }) => {
    const now = params.transferDate || new Date().toISOString()
    const transferReason = params.reason || 'Transferência esportiva de equipe homologada'

    // 1. Obter registro anterior
    const prevRep = await pb
      .collection('driver_championship_representations')
      .getOne<DriverChampionshipRepresentation>(params.previousRepresentationId)

    // 2. Encerrar a anterior
    const updatedPrev = await pb
      .collection('driver_championship_representations')
      .update<DriverChampionshipRepresentation>(params.previousRepresentationId, {
        status: 'transferida',
        end_date: now,
        change_reason: transferReason,
      })

    await domainAuditService.log({
      event_type: 'CLOSE_DRIVER_REPRESENTATION',
      entity_name: 'driver_championship_representations',
      entity_id: params.previousRepresentationId,
      previous_state: prevRep,
      new_state: updatedPrev,
      reason: `Encerramento por transferência: ${transferReason}`,
    })

    // 3. Criar a nova representação apontando para a anterior
    const newRep = await pb
      .collection('driver_championship_representations')
      .create<DriverChampionshipRepresentation>({
        driver_id: params.driverId,
        registration_id: params.registrationId,
        championship_edition_id: params.editionId,
        team_participation_id: params.newTeamParticipationId,
        sub_team_id: params.newSubTeamId,
        start_date: now,
        status: 'ativa',
        change_reason: transferReason,
        previous_representation_id: params.previousRepresentationId,
      })

    await domainAuditService.log({
      event_type: 'TRANSFER_DRIVER_REPRESENTATION',
      entity_name: 'driver_championship_representations',
      entity_id: newRep.id,
      previous_state: { previous_representation_id: params.previousRepresentationId },
      new_state: {
        driver_id: newRep.driver_id,
        team_participation_id: newRep.team_participation_id,
        sub_team_id: newRep.sub_team_id,
      },
      reason: transferReason,
    })

    return newRep
  },

  endRepresentation: async (id: string, reason?: string, endDate?: string) => {
    const prev = await pb
      .collection('driver_championship_representations')
      .getOne<DriverChampionshipRepresentation>(id)

    const updated = await pb
      .collection('driver_championship_representations')
      .update<DriverChampionshipRepresentation>(id, {
        status: 'encerrada',
        end_date: endDate || new Date().toISOString(),
        change_reason: reason || 'Representação esportiva encerrada',
      })

    await domainAuditService.log({
      event_type: 'END_DRIVER_REPRESENTATION',
      entity_name: 'driver_championship_representations',
      entity_id: id,
      previous_state: prev,
      new_state: updated,
      reason: reason || 'Encerramento de representação esportiva',
    })

    return updated
  },
}
