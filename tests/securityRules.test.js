import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('--- SUÍTE DE TESTES DE SEGURANÇA E REGRAS DE HARDENING (ETAPA 1.1) ---')

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

// 1. Verificação de credenciais em migrations
run('Nenhuma senha hardcoded permanece em arquivos de migração', () => {
  const migrationsDir = path.join(__dirname, '../pocketbase/migrations')
  const files = fs.readdirSync(migrationsDir)

  for (const file of files) {
    if (!file.endsWith('.js')) continue
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    assert.ok(
      !content.includes('Skip@Pass'),
      `Arquivo ${file} ainda contém credencial hardcoded 'Skip@Pass'`,
    )
    assert.ok(
      !content.includes('admin123') && !content.includes('password123'),
      `Arquivo ${file} contém padrão de senha fraca`,
    )
  }
})

// 2. Verificação de remoção de credenciais demo na tela de login
run('Tela de login não pré-preenche credenciais e não expõe senhas no DOM', () => {
  const loginPath = path.join(__dirname, '../src/pages/Login.tsx')
  const content = fs.readFileSync(loginPath, 'utf-8')

  assert.ok(!content.includes("useState('Skip@Pass')"), 'Login ainda contém senha pré-preenchida')
  assert.ok(
    !content.includes("useState('rsanque@gmail.com')"),
    'Login ainda contém email admin pré-preenchido',
  )
  assert.ok(!content.includes('Acesso Pré-configurado'), 'Card de credenciais demo visível no login')
})

// 3. Verificação da política de senhas no frontend
run('Formulário de registro exige senha de no mínimo 15 caracteres', () => {
  const regPath = path.join(__dirname, '../src/pages/Register.tsx')
  const content = fs.readFileSync(regPath, 'utf-8')

  assert.ok(
    content.includes('password.length < 15'),
    'Registro não valida comprimento mínimo de 15 caracteres',
  )
})

// 4. Verificação de hooks de segurança PocketBase
run('Hooks server-side implementam guardrails estritos para users, finanças, moderação e raw data', () => {
  const hooksDir = path.join(__dirname, '../pocketbase/hooks')
  const roleGuard = fs.readFileSync(path.join(hooksDir, 'user_role_guard.js'), 'utf-8')
  const finGuard = fs.readFileSync(path.join(hooksDir, 'financial_guard.js'), 'utf-8')
  const modGuard = fs.readFileSync(path.join(hooksDir, 'moderation_guard.js'), 'utf-8')
  const rawGuard = fs.readFileSync(path.join(hooksDir, 'raw_data_guard.js'), 'utf-8')
  const notifGuard = fs.readFileSync(path.join(hooksDir, 'notifications_guard.js'), 'utf-8')

  // role guard
  assert.ok(roleGuard.includes("e.record.set('role', 'cliente')"), 'Role guard não força cliente')
  assert.ok(roleGuard.includes('e.record.setVerified(false)'), 'Role guard não bloqueia verified')
  assert.ok(
    roleGuard.includes('originalRole') && roleGuard.includes('originalVerified'),
    'Role guard não preserva integridade em updates',
  )

  // fin guard
  assert.ok(
    finGuard.includes('Operação financeira não autorizada'),
    'Fin guard não bloqueia criação comum',
  )

  // mod guard
  assert.ok(
    modGuard.includes('protesto_piloto'),
    'Mod guard não restringe criação a protesto_piloto',
  )
  assert.ok(
    modGuard.includes('penalty_applied') && modGuard.includes('guilty_pilot_id'),
    'Mod guard não protege campos de julgamento',
  )

  // raw guard
  assert.ok(
    rawGuard.includes('race_imports') && rawGuard.includes('race_results'),
    'Raw guard não protege coleções de imports e resultados',
  )

  // notif guard
  assert.ok(
    notifGuard.includes('Criação de notificações é restrita'),
    'Notif guard não bloqueia criação arbitrária',
  )
})

// 5. Verificação da migração de hardening 0012
run('Migração 0012 aplica deny-by-default e rotação de credenciais comprometidas', () => {
  const migPath = path.join(__dirname, '../pocketbase/migrations/0012_security_hardening_audit.js')
  assert.ok(fs.existsSync(migPath), 'Migração 0012 não existe')
  const content = fs.readFileSync(migPath, 'utf-8')

  assert.ok(content.includes('randomString(32)'), 'Migração 0012 não rotaciona senhas com entropia')
  assert.ok(
    content.includes("passwordField.min = 15"),
    'Migração 0012 não ajusta min de senha no schema',
  )
  assert.ok(
    content.includes("invoicesCol.createRule = '@request.auth.role = \"colaborador\"'"),
    'Migração 0012 não restringe faturas',
  )
  assert.ok(
    content.includes("notifsCol.createRule = '@request.auth.role = \"colaborador\"'"),
    'Migração 0012 não restringe notificações',
  )
})

console.log(`\nRESUMO DOS TESTES DE SEGURANÇA: ${passed} passaram, ${failed} falharam.\n`)
if (failed > 0) process.exit(1)
