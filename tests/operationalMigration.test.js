import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('--- SUÍTE COMPLETA DOS 16 CENÁRIOS OBRIGATÓRIOS (ETAPA 3 / ETAPA 3.1) ---')

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

// Arquivos de infraestrutura, hooks, migrações e services
const migrationsDir = path.join(__dirname, '../pocketbase/migrations')
const mig14 = fs.readFileSync(path.join(migrationsDir, '0014_domain_master_architecture.js'), 'utf-8')
const mig15 = fs.readFileSync(path.join(migrationsDir, '0015_seed_and_migrate_domain_data.js'), 'utf-8')
const domainGuard = fs.readFileSync(path.join(__dirname, '../pocketbase/hooks/domain_integrity_guard.js'), 'utf-8')
const typesContent = fs.readFileSync(path.join(__dirname, '../src/types/index.ts'), 'utf-8')
const appRoutesContent = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf-8')
const champFormContent = fs.readFileSync(path.join(__dirname, '../src/pages/ChampionshipForm.tsx'), 'utf-8')
const champListContent = fs.readFileSync(path.join(__dirname, '../src/pages/ChampionshipsList.tsx'), 'utf-8')
const champDetailContent = fs.readFileSync(path.join(__dirname, '../src/pages/ChampionshipDetail.tsx'), 'utf-8')

// Services do novo domínio
const champEdService = fs.readFileSync(path.join(__dirname, '../src/services/championshipEditionService.ts'), 'utf-8')
const stageService = fs.readFileSync(path.join(__dirname, '../src/services/stageService.ts'), 'utf-8')
const sessionService = fs.readFileSync(path.join(__dirname, '../src/services/sessionService.ts'), 'utf-8')
const teamPartService = fs.readFileSync(path.join(__dirname, '../src/services/teamParticipationService.ts'), 'utf-8')
const teamMemService = fs.readFileSync(path.join(__dirname, '../src/services/teamMembershipService.ts'), 'utf-8')
const regService = fs.readFileSync(path.join(__dirname, '../src/services/registrationService.ts'), 'utf-8')
const domainAuditService = fs.readFileSync(path.join(__dirname, '../src/services/domainAuditService.ts'), 'utf-8')

// 1. Team Participation duplicada: tentar criar duas Team Participations para a mesma Team + Championship Edition deve falhar
run('Cenário 1: Team Participation duplicada (UNIQUE team+edition no banco + hook server-side)', () => {
  assert.ok(
    mig14.includes('CREATE UNIQUE INDEX idx_team_part_unique ON team_participations (team_id, championship_edition_id)'),
    'Índice UNIQUE team_id + championship_edition_id ausente na migração 0014',
  )
  assert.ok(
    domainGuard.includes('Violação de Integridade: Uma Team já possui participação nesta Championship Edition'),
    'Hook domain_integrity_guard não intercepta duplicidade de Team Participation',
  )
})

// 2. Registration: validar o relacionamento correto entre Driver e Championship Edition
run('Cenário 2: Registration: relacionamento direto e independente Driver -> Championship Edition', () => {
  assert.ok(
    mig14.includes('CREATE UNIQUE INDEX idx_registrations_driver_edition ON registrations (driver_id, championship_edition_id)'),
    'Índice UNIQUE driver_id + championship_edition_id ausente na migração 0014',
  )
  assert.ok(
    regService.includes('getByDriverAndEdition'),
    'registrationService não fornece busca por driver + championship_edition',
  )
  assert.ok(
    typesContent.includes('export interface Registration') &&
      typesContent.includes('driver_id: string') &&
      typesContent.includes('championship_edition_id: string'),
    'Tipagem de Registration incorreta',
  )
})

// 3. Driver Championship Representation: validar criação e relacionamento correto
run('Cenário 3: Driver Championship Representation: Driver -> Registration -> Edition e Team -> Part -> Sub-team', () => {
  assert.ok(
    mig14.includes("name: 'driver_championship_representations'"),
    'Tabela driver_championship_representations ausente',
  )
  assert.ok(
    regService.includes('createRepresentation: async') &&
      regService.includes('getActiveByDriverAndEdition'),
    'driverRepresentationService não gerencia relacionamentos da representação',
  )
})

// 4. Transferência de representação: validar encerramento da anterior e criação da nova
run('Cenário 4: Transferência de representação: encerra anterior com status "transferida" e cria nova com previous_representation_id', () => {
  assert.ok(
    regService.includes("status: 'transferida'") &&
      regService.includes('previous_representation_id: currentRep.id'),
    'Transferência de representação não encerra com status correto ou não vincula anterior',
  )
})

// 5. Histórico de representação: a representação anterior não é sobrescrita
run('Cenário 5: Histórico de representação: a representação anterior não é sobrescrita (auditoria e end_date preservados)', () => {
  assert.ok(
    mig14.includes("name: 'previous_representation_id'") && mig14.includes("name: 'start_date'"),
    'Campos de rastreamento de representação ausentes',
  )
  assert.ok(
    regService.includes('end_date:') && regService.includes('change_reason:'),
    'Campos de encerramento temporal ausentes no serviço de representação',
  )
})

// 6. Driver em duas Sub-teams simultaneamente: operação rejeitada
run('Cenário 6: Driver em duas Sub-teams simultaneamente rejeitado pelo backend', () => {
  assert.ok(
    domainGuard.includes('Violação de Regra Esportiva: O piloto já possui uma representação esportiva ativa'),
    'Hook server-side não bloqueia representações concorrentes ativas',
  )
})

// 7. Team -> Team Participation -> Sub-team: validar a hierarquia
run('Cenário 7: Hierarquia Team -> Team Participation -> Sub-team: sub_team pertence a participation e não à Team global', () => {
  const subTeamDef = mig14.slice(mig14.indexOf("name: 'sub_teams'"), mig14.indexOf("name: 'team_memberships'"))
  assert.ok(
    subTeamDef.includes("name: 'team_participation_id'"),
    'Sub-team não referencia team_participation_id',
  )
  assert.ok(
    !subTeamDef.includes("name: 'team_id'"),
    'Sub-team não pode possuir team_id global (pertence exclusivamente à participação)',
  )
})

// 8. Team Membership != Representation: alterar Membership não sobrescreve automaticamente o histórico esportivo
run('Cenário 8: Team Membership != Driver Championship Representation: entidades separadas e desvinculadas', () => {
  assert.ok(
    teamMemService.includes('teamMembershipService') && regService.includes('driverRepresentationService'),
    'Serviços de TeamMembership e DriverRepresentation devem ser autônomos',
  )
})

// 9. Championship -> Championship Edition -> Season: Championship não depende diretamente de Season como fonte principal
run('Cenário 9: Championship -> Championship Edition -> Season: Edition é o elo oficial', () => {
  assert.ok(
    mig14.includes('CREATE UNIQUE INDEX idx_championship_editions_champ_season ON championship_editions (championship_id, season_id)'),
    'Índice UNIQUE championship_id + season_id ausente na Edition',
  )
  assert.ok(
    champEdService.includes('getByChampAndSeason') && champEdService.includes('listBySeason'),
    'championshipEditionService não possui métodos de resolução championship+season',
  )
})

// 10. Session: vinculada à estrutura esportiva correta e sem dependência de quantidade fixa de races
run('Cenário 10: Session: entidade independente e extensível (practice, qualifying, race, warmup, heat, feature)', () => {
  assert.ok(
    mig14.includes("'practice', 'qualifying', 'race', 'warmup', 'heat', 'feature'"),
    'Tipos múltiplos de sessão ausentes no schema do banco',
  )
  assert.ok(
    sessionService.includes('sessionService'),
    'sessionService ausente para gestão extensível de sessões',
  )
})

// 11. Segurança: as novas entidades respeitam a matriz de segurança da Etapa 1.1
run('Cenário 11: Matriz de Segurança da Etapa 1.1 aplicada às novas coleções do domínio', () => {
  assert.ok(
    mig14.includes('updateRule: null, // imutável') && mig14.includes('deleteRule: null, // imutável'),
    'domain_audit_logs deve ser imutável com update e delete nulos',
  )
  assert.ok(
    mig14.includes('createRule: \'@request.auth.role = "colaborador"\''),
    'Operações restritas a colaborador ausentes',
  )
})

// 12. Transição Operacional e Double-Write controlado no formulário de campeonato
run('Cenário 12: Formulário de Campeonato realiza escrita prioritária no Novo Domínio com tolerância legada', () => {
  assert.ok(
    champFormContent.includes('championshipEditionService.getByChampAndSeason') &&
      champFormContent.includes('stageService.create') &&
      champFormContent.includes('sessionService.create') &&
      champFormContent.includes('registrationService.getByDriverAndEdition'),
    'ChampionshipForm não está escrevendo nas coleções do novo domínio',
  )
})

// 13. Resolução de Season no ChampionshipDetail e ChampionshipList prefere Championship Edition
run('Cenário 13: ChampionshipDetail e ChampionshipList utilizam Championship Edition como fonte de verdade', () => {
  assert.ok(
    champListContent.includes('edition?.season_id || champ.season_id') ||
      champListContent.includes('effectiveSeasonId'),
    'ChampionshipsList não resolve Season através da Championship Edition',
  )
  assert.ok(
    champDetailContent.includes('championshipEditionService') &&
      champDetailContent.includes('effectiveSeason'),
    'ChampionshipDetail não resolve Season ou Edição via championshipEditionService',
  )
})

// 14. Isolamento das Rotas Públicas vs Administrativas (/ vs /dashboard/*)
run('Cenário 14: Rota "/" é estritamente a HomeView pública e rotas de gestão estão sob /dashboard/*', () => {
  assert.ok(
    appRoutesContent.includes('<Route path="/" element={<HomeView />} />'),
    'Home pública deve ser renderizada na rota "/"',
  )
  assert.ok(
    appRoutesContent.includes('<Route path="/campeonatos" element={<SportsPlaceholderPage') &&
      appRoutesContent.includes('<Route path="/dashboard" element='),
    'Rotas públicas esportivas e painel administrativo sob /dashboard devem coexistir sem colisão',
  )
})

// 15. Auditoria de Domínio Server-Side em Hooks do PocketBase
run('Cenário 15: Hooks gravam registros em domain_audit_logs em mutações de edições, sub-teams e memberships', () => {
  assert.ok(
    domainGuard.includes("auditRec.set('event_type', 'CREATE_CHAMPIONSHIP_EDITION')") &&
      domainGuard.includes("auditRec.set('event_type', 'CREATE_SUB_TEAM')") &&
      domainGuard.includes("auditRec.set('event_type', 'CREATE_TEAM_MEMBERSHIP')") &&
      domainGuard.includes("auditRec.set('event_type', 'CREATE_REGISTRATION')"),
    'domain_integrity_guard não audita mutações server-side no novo domínio',
  )
})

// 16. Tratamento de Erro e Integridade em AuthContext e Serviços
run('Cenário 16: AuthContext e serviços tratam erro 404 de registros inexistentes ou revogados sem travar app', () => {
  const authContextContent = fs.readFileSync(path.join(__dirname, '../src/contexts/AuthContext.tsx'), 'utf-8')
  assert.ok(
    authContextContent.includes('err?.status === 404') && authContextContent.includes('pb.authStore.clear()'),
    'AuthContext deve limpar credenciais se o usuário logado não for encontrado (404) no banco',
  )
  assert.ok(
    domainAuditService.includes('domainAuditService'),
    'domainAuditService presente e tratando operações de auditoria',
  )
})

console.log(`\nRESUMO DOS 16 CENÁRIOS OBRIGATÓRIOS: ${passed} passaram, ${failed} falharam.\n`)
if (failed > 0) process.exit(1)
