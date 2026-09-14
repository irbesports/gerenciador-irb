// Regras server-side para notificações:
// Usuário comum:
// - PODE marcar apenas suas próprias notificações como lidas (campo read)
// - NÃO PODE criar notificações arbitrariamente
// - NÃO PODE editar título, mensagem, link ou dados de notificações
// - NÃO PODE excluir notificações de terceiros
// Somente colaboradores ou processos do sistema podem criar notificações.

onRecordCreateRequest((e) => {
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  if (!isCollab) {
    throw new BadRequestError('Criação de notificações é restrita ao sistema ou a colaboradores.')
  }

  e.next()
}, 'notifications')

onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  if (!isCollab) {
    // Um usuário comum só pode alterar o status de leitura ('read') da SUA notificação
    const originalRecipient = e.record.original().getString('recipient_user_id')
    if (authRecord && originalRecipient && authRecord.id !== originalRecipient) {
      throw new BadRequestError(
        'Você não tem permissão para alterar notificações de outro usuário.',
      )
    }

    // Preserva integridade de todos os demais campos da notificação
    e.record.set('recipient_user_id', originalRecipient)
    e.record.set('recipient_pilot_id', e.record.original().getString('recipient_pilot_id'))
    e.record.set('type', e.record.original().getString('type'))
    e.record.set('title', e.record.original().getString('title'))
    e.record.set('message', e.record.original().getString('message'))
    e.record.set('target_link', e.record.original().getString('target_link'))
    e.record.set('moderation_case_id', e.record.original().getString('moderation_case_id'))
  }

  e.next()
}, 'notifications')

onRecordDeleteRequest((e) => {
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  if (!isCollab) {
    const originalRecipient = e.record.original().getString('recipient_user_id')
    if (!authRecord || authRecord.id !== originalRecipient) {
      throw new BadRequestError(
        'Você não tem permissão para excluir notificações de outros usuários.',
      )
    }
  }

  e.next()
}, 'notifications')
