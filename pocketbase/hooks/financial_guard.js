// Regras de integridade server-side para finanças (invoices e payments):
// - Nenhum usuário comum (cliente/driver/visitante) pode alterar:
//   amount, status, payment_date, invoice relation, pilot relation, championship relation.
// - Apenas colaboradores autenticados ou processos server-side podem criar/modificar.

onRecordCreateRequest(
  (e) => {
    const authRecord = e.auth
    const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

    if (!isCollab) {
      throw new BadRequestError('Operação financeira não autorizada para este perfil.')
    }

    e.next()
  },
  'invoices',
  'payments',
)

onRecordUpdateRequest(
  (e) => {
    const authRecord = e.auth
    const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

    if (!isCollab) {
      throw new BadRequestError('Modificação financeira não autorizada para este perfil.')
    }

    e.next()
  },
  'invoices',
  'payments',
)

onRecordDeleteRequest(
  (e) => {
    const authRecord = e.auth
    const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

    if (!isCollab) {
      throw new BadRequestError('Exclusão financeira não autorizada para este perfil.')
    }

    e.next()
  },
  'invoices',
  'payments',
)
