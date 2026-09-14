// Proteção estrita de RAW DATA externo (race_imports) e Resultados Oficiais (race_results)
// - race_imports.raw_json representa o payload bruto de telemetria/iRacing; jamais pode ser alterado por clientes.
// - Usuários comuns não podem criar, editar nem excluir imports ou resultados de corrida.

onRecordCreateRequest(
  (e) => {
    const authRecord = e.auth
    const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

    if (!isCollab) {
      throw new BadRequestError(
        'Criação de dados brutos ou resultados de corrida é restrita a colaboradores.',
      )
    }

    e.next()
  },
  'race_imports',
  'race_results',
)

onRecordUpdateRequest(
  (e) => {
    const authRecord = e.auth
    const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

    if (!isCollab) {
      throw new BadRequestError('Alteração de dados brutos ou resultados de corrida é proibida.')
    }

    e.next()
  },
  'race_imports',
  'race_results',
)

onRecordDeleteRequest(
  (e) => {
    const authRecord = e.auth
    const isCollab = authRecord && authRecord.getString('role') === 'colaborador'

    if (!isCollab) {
      throw new BadRequestError('Exclusão de dados brutos ou resultados de corrida é proibida.')
    }

    e.next()
  },
  'race_imports',
  'race_results',
)
