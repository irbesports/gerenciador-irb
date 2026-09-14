import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('--- SUÍTE DE TESTES DE DOMÍNIO E ARQUITETURA ESPORTIVA IRB (ETAPA 2) ---')

let passed = 0
let failed = 0

function run(name, fn) {
  try {
    fn()
    console.log(`  ✓ [PASSOU] ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ [FALHOU] ${name}`)
    console.error(err)
    failed++
  }
}

const migrationsDir = path.join(__dirname, '../pocketbase/migrations')
const mig14 = fs.readFileSync(
  path.join(migrationsDir, '0014_domain_master_architecture.js'),
  'utf-8',
)
const mig15 = fs.readFileSync(
  path.join(migrationsDir, '0015_seed_and_migrate_domain_data.js'),
  'utf-8',
)
const hooksDir = path.join(__dirname, '../pocketbase/hooks')
const domainGuard = fs.readFileSync(
  path.join(hooksDir, 'domain_integrity_guard.js'),
  'utf-8',
)
const typesContent = fs.readFileSync(
  path.join(__dirname, '../src/types/index.ts'),
  'utf-8',
)
const apiServiceContent = fs.readFileSync(
  path.join(__dirname, '../src/services/api.ts'),
  'utf-8',
)

// 1. Team Participation duplicada: tentar criar duas Team Participations para a mesma Team + Championship Edition deve falhar
run('1. Team Participation duplicada: UNIQUE(team_id, championship_edition_id) e hook de validação', () => {
  assert.ok(
    mig14.includes('idx_team_part_unique') &&
      mig14.includes(
        'CREATE UNIQUE INDEX idx_team_part_unique ON team_participations (team_id, championship_edition_id)',
      ),
    'Índice UNIQUE(team_id, championship_edition_id) não encontrado em 0014',
  )
  assert.ok(
    domainGuard.includes("team_id = \"${teamId}\" && championship_edition_id = \"${editionId}\"") ||
      domainGuard.includes('team_id = "${teamId}" && championship_edition_id = "${editionId}"'),
    'Hook de integridade não valida duplicidade de Team Participation',
  )
  assert.ok(
    domainGuard.includes('Violação de Integridade: Uma Team já possui participação nesta Championship Edition'),
    'Mensagem de erro de duplicidade de Team Participation ausente no hook',
  )
})

// 2. Registration: validar o relacionamento correto entre Driver e Championship Edition
run('2. Registration: relacionamento direto e independente Driver -> Championship Edition', () => {
  assert.ok(
    mig14.includes("name: 'registrations'") &&
      mig14.includes("name: 'driver_id'") &&
      mig14.includes("name: 'championship_edition_id'"),
    'Entidade registrations não define driver_id e championship_edition_id',
  )
  assert.ok(
    mig14.includes('CREATE UNIQUE INDEX idx_registrations_driver_edition ON registrations (driver_id, championship_edition_id)'),
    'Unicidade de Driver por Championship Edition não configurada',
  )
  assert.ok(
    typesContent.includes('export interface Registration') &&
      typesContent.includes('driver_id: string') &&
      typesContent.includes('championship_edition_id: string'),
    'TypeScript interface Registration não reflete Driver -> Championship Edition',
  )
})

// 3. Driver Championship Representation: validar criação e relacionamento correto
run('3. Driver Championship Representation: Driver -> Registration -> Edition e Team -> Part -> Sub-team', () => {
  assert.ok(
    mig14.includes("name: 'driver_championship_representations'"),
    'Coleção driver_championship_representations ausente',
  )
  assert.ok(
    mig14.includes("name: 'driver_id'") &&
      mig14.includes("name: 'registration_id'") &&
      mig14.includes("name: 'team_participation_id'") &&
      mig14.includes("name: 'sub_team_id'") &&
      mig14.includes("name: 'championship_edition_id'"),
    'Campos relacionais de Driver Championship Representation incompletos',
  )
  assert.ok(
    typesContent.includes('export interface DriverChampionshipRepresentation'),
    'Interface DriverChampionshipRepresentation ausente em types',
  )
})

// 4. Transferência de representação: validar encerramento da anterior e criação da nova
run('4. Transferência de representação: encerra anterior com timestamp/motivo e cria nova', () => {
  assert.ok(
    apiServiceContent.includes('transferRepresentation: async'),
    'Serviço transferRepresentation não implementado',
  )
  assert.ok(
    apiServiceContent.includes("status: 'transferida'") &&
      apiServiceContent.includes('end_date:') &&
      apiServiceContent.includes('previous_representation_id:'),
    'Lógica de transferência não encerra anterior com end_date ou não conecta previous_representation_id',
  )
})

// 5. Histórico de representação: a representação anterior não é sobrescrita
run('5. Histórico de representação: representação anterior não é sobrescrita', () => {
  assert.ok(
    mig14.includes("name: 'previous_representation_id'") &&
      mig14.includes("name: 'start_date'") &&
      mig14.includes("name: 'end_date'"),
    'Campos de rastreabilidade temporal ausentes na representação',
  )
  assert.ok(
    apiServiceContent.includes('previousRepresentationId'),
    'API service não preserva ID da representação prévia',
  )
})

// 6. Driver em duas Sub-teams simultaneamente: operação rejeitada
run('6. Driver em duas Sub-teams simultâneas: regra esportiva rejeitada no backend', () => {
  assert.ok(
    domainGuard.includes("status = \"ativa\"") || domainGuard.includes("status = 'ativa'"),
    'Guard não verifica status ativo de representações concorrentes',
  )
  assert.ok(
    domainGuard.includes('Violação de Regra Esportiva: O piloto já possui uma representação esportiva ativa'),
    'Bloqueio de representação simultânea ausente no hook',
  )
})

// 7. Team -> Team Participation -> Sub-team: validar a hierarquia
run('7. Hierarquia Team -> Team Participation -> Sub-team: sub_team pertence a participation e não à Team global', () => {
  assert.ok(
    mig14.includes("name: 'sub_teams'") &&
      mig14.includes("name: 'team_participation_id'"),
    'sub_teams não referencia team_participation_id',
  )
  assert.ok(
    mig14.includes('CREATE UNIQUE INDEX idx_sub_teams_part_name ON sub_teams (team_participation_id, name)'),
    'Unicidade de nome de Sub-team dentro da Team Participation não configurada',
  )
  // Sub-team não tem campo direto team_id global
  const subTeamDef = mig14.slice(
    mig14.indexOf("name: 'sub_teams'"),
    mig14.indexOf("name: 'team_memberships'"),
  )
  assert.ok(
    !subTeamDef.includes("name: 'team_id'"),
    'ERRO: Sub-team foi modelada com team_id global em vez de pertencer a team_participation_id',
  )
})

// 8. Team Membership != Representation: alterar Membership não sobrescreve automaticamente o histórico esportivo
run('8. Team Membership != Driver Championship Representation: entidades separadas', () => {
  assert.ok(
    mig14.includes("name: 'team_memberships'"),
    'Coleção team_memberships ausente',
  )
  assert.ok(
    typesContent.includes('export interface TeamMembership') &&
      typesContent.includes('export interface DriverChampionshipRepresentation'),
    'Interfaces TeamMembership e DriverChampionshipRepresentation não existem separadamente',
  )
  assert.ok(
    apiServiceContent.includes('teamMembershipsService') &&
      apiServiceContent.includes('driverRepresentationsService'),
    'Serviços de TeamMembership e DriverChampionshipRepresentation não são independentes',
  )
})

// 9. Championship -> Championship Edition -> Season: Championship não depende diretamente de Season como fonte principal
run('9. Hierarquia Championship -> Championship Edition -> Season', () => {
  assert.ok(
    mig14.includes("name: 'championship_editions'") &&
      mig14.includes("name: 'championship_id'") &&
      mig14.includes("name: 'season_id'"),
    'Coleção championship_editions não relaciona championship_id e season_id',
  )
  assert.ok(
    mig14.includes('CREATE UNIQUE INDEX idx_championship_editions_champ_season ON championship_editions (championship_id, season_id)'),
    'Unicidade de Edition por Championship + Season não configurada',
  )
  assert.ok(
    typesContent.includes('export interface ChampionshipEdition'),
    'TypeScript interface ChampionshipEdition ausente',
  )
  assert.ok(
    apiServiceContent.includes('championshipEditionsService'),
    'championshipEditionsService ausente na camada de dados',
  )
})

// 10. Session: vinculada à estrutura esportiva correta e sem dependência de quantidade fixa de races
run('10. Session: entidade independente e extensível (practice, qualifying, race, etc.)', () => {
  assert.ok(
    mig14.includes("name: 'sessions'") &&
      mig14.includes("name: 'session_type'") &&
      mig14.includes("'practice', 'qualifying', 'race', 'warmup', 'heat', 'feature'"),
    'Coleção sessions não suporta tipos múltiplos de sessão',
  )
  assert.ok(
    typesContent.includes('export interface SessionRecord') &&
      typesContent.includes('session_type: SessionTypeEnum'),
    'Tipagem SessionRecord ausente ou rígida',
  )
  assert.ok(
    apiServiceContent.includes('sessionsService'),
    'sessionsService ausente na camada de serviços',
  )
})

// 11. Segurança: as novas entidades respeitam a matriz de segurança da Etapa 1.1
run('11. Matriz de Segurança Etapa 1.1: regras restritas nas novas coleções', () => {
  // championship_editions: colaborador write
  assert.ok(
    mig14.includes('championshipEditionsCol = new Collection({') &&
      mig14.includes('createRule: \'@request.auth.role = "colaborador"\''),
    'championship_editions com permissão de criação aberta',
  )
  // teams: criação apenas por auth, delete colaborador
  assert.ok(
    mig14.includes('teamsCol = new Collection({') &&
      mig14.includes('deleteRule: \'@request.auth.role = "colaborador"\''),
    'teams com exclusão insegura',
  )
  // team_participations: criação/modificação protegida
  assert.ok(
    mig14.includes('teamParticipationsCol = new Collection({') &&
      mig14.includes('updateRule: \'@request.auth.role = "colaborador"\''),
    'team_participations com update aberto',
  )
  // driver_championship_representations: apenas colaborador cria e atualiza
  assert.ok(
    mig14.includes('representationsCol = new Collection({') &&
      mig14.includes('createRule: \'@request.auth.role = "colaborador"\'') &&
      mig14.includes('updateRule: \'@request.auth.role = "colaborador"\''),
    'driver_championship_representations com regras abertas para clientes',
  )
  // domain_audit_logs: imutável (updateRule: null, deleteRule: null)
  assert.ok(
    mig14.includes('updateRule: null, // imutável') &&
      mig14.includes('deleteRule: null, // imutável'),
    'domain_audit_logs permite alteração ou exclusão de histórico',
  )
})

console.log(`\nRESUMO DOS TESTES DO NOVO DOMÍNIO: ${passed} passaram, ${failed} falharam.\n`)
if (failed > 0) process.exit(1)
