// Guard rails server-side para segurança estrita da coleção users:
// 1. Novos registros públicos são FORÇADOS para role = 'cliente'
// 2. Novos registros nunca podem ser criados como verified = true por usuários comuns
// 3. Usuários comuns não podem alterar seu próprio 'role' (auto-promoção)
// 4. Usuários comuns não podem alterar 'verified'
// 5. NUNCA aceitar roles elevados ou não permitidos

onRecordCreateRequest((e) => {
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  if (!isCollab) {
    // Força role 'cliente'
    e.record.set('role', 'cliente')
    // Impede auto-verificação arbitrária
    e.record.setVerified(false)
  }
  e.next()
}, 'users')

onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  if (!isCollab) {
    // Preserva role original
    const originalRole = e.record.original().getString('role') || 'cliente'
    e.record.set('role', originalRole)

    // Preserva verified original
    const originalVerified = e.record.original().getBool('verified') || false
    e.record.setVerified(originalVerified)
  }
  e.next()
}, 'users')
