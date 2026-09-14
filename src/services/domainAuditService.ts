import { pb } from '@/lib/pocketbase/client'
import type { DomainAuditLog } from '@/types'

export const domainAuditService = {
  log: async (params: {
    event_type: string
    entity_name: string
    entity_id: string
    previous_state?: any
    new_state?: any
    reason?: string
    context?: any
  }) => {
    try {
      const currentAuthUser = pb.authStore.model
      return await pb.collection('domain_audit_logs').create<DomainAuditLog>({
        actor_user_id: currentAuthUser?.id || undefined,
        event_type: params.event_type,
        entity_name: params.entity_name,
        entity_id: params.entity_id,
        previous_state: params.previous_state || null,
        new_state: params.new_state || null,
        reason: params.reason || '',
        context: params.context || null,
      })
    } catch (err) {
      // Auditoria não bloqueia o fluxo operacional caso falhe por permissão ou conexão,
      // mas registra log detalhado no console do cliente
      console.warn('Falha silenciosa ao registrar auditoria de domínio:', err)
      return null
    }
  },

  listByEntity: async (entityName: string, entityId: string) => {
    return await pb.collection('domain_audit_logs').getFullList<DomainAuditLog>({
      filter: `entity_name = "${entityName}" && entity_id = "${entityId}"`,
      sort: '-created',
      expand: 'actor_user_id',
    })
  },

  listRecent: async (limit = 50) => {
    return await pb.collection('domain_audit_logs').getList<DomainAuditLog>(1, limit, {
      sort: '-created',
      expand: 'actor_user_id',
    })
  },
}
