// Hook para garantir que novos registros criados publicamente sejam estritamente role = 'cliente'
// e impedir que usuários comuns realizem auto-promoção ou alteração indevida de role.

onRecordCreate((e) => {
  // Se não houver auth ou o usuário logado não for colaborador, forçar role = 'cliente'
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  if (!isCollab) {
    e.record.set('role', 'cliente')
  }
  e.next()
}, 'users')

onRecordUpdate((e) => {
  const authRecord = e.auth
  const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

  // Se não for colaborador tentando alterar o role, preservar o role original
  if (!isCollab) {
    const originalRole = e.record.original().getString('role') || 'cliente'
    e.record.set('role', originalRole)
  }
  e.next()
}, 'users')
