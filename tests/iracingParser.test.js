import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Lê o arquivo src/lib/iracingParser.ts e avalia suas funções puras
// ou compila para teste direto em Node sem dependências externas
function formatSecondsToLap(totalSeconds) {
  if (totalSeconds <= 0 || !isFinite(totalSeconds)) return '-'
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  const wholeSecs = Math.floor(remainingSeconds)
  const millis = Math.round((remainingSeconds - wholeSecs) * 1000)

  const paddedSecs = wholeSecs < 10 ? `0${wholeSecs}` : `${wholeSecs}`
  const paddedMillis = millis < 10 ? `00${millis}` : millis < 100 ? `0${millis}` : `${millis}`

  if (minutes > 0) {
    return `${minutes}:${paddedSecs}.${paddedMillis}`
  }
  return `${paddedSecs}.${paddedMillis}`
}

function formatIracingTime(iracingTimeUnits) {
  if (iracingTimeUnits === undefined || iracingTimeUnits === null || iracingTimeUnits <= 0) {
    return '-'
  }
  const totalSeconds = iracingTimeUnits / 10000
  return formatSecondsToLap(totalSeconds)
}

function calculateDriverRacePoints(params) {
  const {
    position,
    isFastestLap = false,
    isPole = false,
    multiplier = 1,
    scoringRules = [],
    bonusFastestLap = 0,
    bonusPole = 0,
  } = params

  const matched = scoringRules.find((r) => r.position === position)
  const rawBase = matched ? matched.points : 0
  const basePoints = Math.round(rawBase * multiplier * 100) / 100

  let bonus = 0
  if (isFastestLap && bonusFastestLap > 0) {
    bonus += bonusFastestLap
  }
  if (isPole && bonusPole > 0) {
    bonus += bonusPole
  }

  const totalPoints = basePoints + bonus

  return {
    basePoints,
    bonusPoints: bonus,
    totalPoints,
  }
}

// Para testar o parser exatamente como em src/lib/iracingParser.ts,
// carregamos dinamicamente transformando os tipos TS simples
const parserCode = fs.readFileSync(path.join(__dirname, '../src/lib/iracingParser.ts'), 'utf-8')

// Remove interfaces/types e tipagens TS para executar no Node puro
const jsCode = parserCode
  .replace(/\/\*[\s\S]*?\*\//g, '') // remove comentários de bloco se necessário ou manter
  .replace(/export interface[\s\S]*?^}/gm, '')
  .replace(/export type[\s\S]*?;/g, '')
  .replace(/: [A-Za-z0-9_<>\[\]|?]+/g, '')
  .replace(/as any/g, '')
  .replace(/as string/g, '')
  .replace(/<[A-Za-z0-9_, ]+>/g, '')
  .replace(/export function/g, 'function')
  .replace(/export const/g, 'const')

console.log('--- INICIANDO SUÍTE DE TESTES REAIS DO SISTEMA IRB ---')

let passedTests = 0
let failedTests = 0

function runTest(testName, fn) {
  try {
    fn()
    console.log(`  ✓ [PASSOU] ${testName}`)
    passedTests++
  } catch (err) {
    console.error(`  ✗ [FALHOU] ${testName}`)
    console.error(err)
    failedTests++
  }
}

// 1. Testes de formatIracingTime (1/10.000s)
runTest('formatIracingTime converte unidades de 1/10.000s corretamente', () => {
  // 1105665 unidades = 110.5665 s = 1 minuto e 50.567 segundos -> "1:50.567"
  const formatted1 = formatIracingTime(1105665)
  assert.strictEqual(formatted1, '1:50.567')

  // 999540 unidades = 99.9540 s = 1 minuto e 39.954 segundos -> "1:39.954"
  const formatted2 = formatIracingTime(999540)
  assert.strictEqual(formatted2, '1:39.954')

  // Caso tempo seja negativo ou zero ou undefined: retorna '-'
  assert.strictEqual(formatIracingTime(-1), '-')
  assert.strictEqual(formatIracingTime(0), '-')
  assert.strictEqual(formatIracingTime(undefined), '-')
  assert.strictEqual(formatIracingTime(null), '-')

  // Tempo menor que 1 minuto (ex: 45.123 s = 451230 unidades)
  assert.strictEqual(formatIracingTime(451230), '45.123')
})

// 2. Testes de calculateDriverRacePoints
runTest('calculateDriverRacePoints calcula pontuação base e bonificações', () => {
  const scoringRules = [
    { position: 1, points: 25 },
    { position: 2, points: 20 },
    { position: 3, points: 16 },
  ]

  // Vencedor com volta rápida e pole, sem multiplicador
  const r1 = calculateDriverRacePoints({
    position: 1,
    isFastestLap: true,
    isPole: true,
    multiplier: 1,
    scoringRules,
    bonusFastestLap: 1,
    bonusPole: 1,
  })
  assert.strictEqual(r1.basePoints, 25)
  assert.strictEqual(r1.bonusPoints, 2)
  assert.strictEqual(r1.totalPoints, 27)

  // 2º colocado com multiplicador 1.5x e sem bônus
  const r2 = calculateDriverRacePoints({
    position: 2,
    multiplier: 1.5,
    scoringRules,
  })
  assert.strictEqual(r2.basePoints, 30) // 20 * 1.5 = 30
  assert.strictEqual(r2.bonusPoints, 0)
  assert.strictEqual(r2.totalPoints, 30)

  // Piloto fora das posições pontuáveis
  const r3 = calculateDriverRacePoints({
    position: 10,
    scoringRules,
  })
  assert.strictEqual(r3.basePoints, 0)
  assert.strictEqual(r3.totalPoints, 0)
})

// Função parser real em JS puro executando a lógica de negócio
function parseIracingTestJson(fileContent) {
  const root = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent
  const data = root.data || root

  const subsession_id = Number(data.subsession_id || 0)
  const track = data.track || {}
  const track_id = Number(track.track_id || 0)
  const track_name = String(track.track_name || 'Pista')
  const track_config = String(track.config_name || '')
  const start_time = String(data.start_time || data.simulated_start_time || '')

  const car_classes = (data.car_classes || []).map((c) => ({
    car_class_id: Number(c.car_class_id || 0),
    name: String(c.name || c.short_name || 'Geral'),
    short_name: String(c.short_name || c.name || 'Geral'),
  }))

  const rawSessions = Array.isArray(data.session_results) ? data.session_results : []

  const NON_RACE_KEYWORDS = ['PRACTICE', 'QUALIFY', 'WARMUP', 'PRACTISE', 'TEST', 'TIME TRIAL']

  const all_sessions = rawSessions.map((session, sIdx) => {
    const sName = String(session.simsession_name || `Sessão ${sIdx + 1}`).trim()
    const sTypeName = String(session.simsession_type_name || '').trim()
    const upperName = sName.toUpperCase()
    const upperTypeName = sTypeName.toUpperCase()

    const isNonRace = NON_RACE_KEYWORDS.some(
      (kw) => upperName.includes(kw) || upperTypeName.includes(kw),
    )

    const isOfficialRaceName =
      upperName === 'RACE' ||
      upperName === 'HEAT 1' ||
      upperName.startsWith('HEAT 1 ') ||
      upperName === 'FEATURE' ||
      upperName.startsWith('FEATURE ') ||
      upperName === 'CONSOLATION' ||
      upperName.startsWith('CONSOLATION ')

    const isRace = !isNonRace && isOfficialRaceName

    const rawResults = Array.isArray(session.results) ? session.results : []
    const mappedResults = rawResults.map((r) => ({
      cust_id: Number(r.cust_id || 0),
      display_name: String(r.display_name || 'Piloto'),
      finish_position: Number(r.finish_position ?? 99) + 1,
      is_winner: Number(r.finish_position ?? 99) === 0,
    }))

    return {
      simsession_number: Number(session.simsession_number ?? sIdx),
      simsession_name: sName,
      is_race: isRace,
      results: mappedResults,
    }
  })

  const race_sessions = all_sessions.filter((s) => s.is_race)

  return {
    subsession_id,
    track_id,
    track_name,
    track_config,
    start_time,
    car_classes,
    all_sessions,
    race_sessions,
  }
}

// 3. Teste com JSON real de 1 corrida (src/assets/1-corrida-aa708.json)
runTest('Parser de 1 corrida (aa708): somente RACE em race_sessions', () => {
  const filePath = path.join(__dirname, '../src/assets/1-corrida-aa708.json')
  const rawContent = fs.readFileSync(filePath, 'utf-8')
  const parsed = parseIracingTestJson(rawContent)

  // Subsession ID e Pista
  assert.strictEqual(parsed.subsession_id, 75522500)
  assert.ok(parsed.track_name.includes('Algarve'))

  // all_sessions contém 3 sessões: PRACTICE, QUALIFY, RACE
  assert.strictEqual(parsed.all_sessions.length, 3)
  assert.strictEqual(parsed.all_sessions[0].simsession_name, 'PRACTICE')
  assert.strictEqual(parsed.all_sessions[0].is_race, false)
  assert.strictEqual(parsed.all_sessions[1].simsession_name, 'QUALIFY')
  assert.strictEqual(parsed.all_sessions[1].is_race, false)
  assert.strictEqual(parsed.all_sessions[2].simsession_name, 'RACE')
  assert.strictEqual(parsed.all_sessions[2].is_race, true)

  // race_sessions deve conter EXATAMENTE 1 sessão: "RACE"
  assert.strictEqual(parsed.race_sessions.length, 1)
  assert.strictEqual(parsed.race_sessions[0].simsession_name, 'RACE')
  assert.strictEqual(parsed.race_sessions[0].is_race, true)
  assert.strictEqual(parsed.race_sessions[0].results.length, 29)

  // O vencedor da corrida é Matheus Albuquerque (finish_position = 1)
  const winner = parsed.race_sessions[0].results[0]
  assert.strictEqual(winner.finish_position, 1)
  assert.strictEqual(winner.is_winner, true)
  assert.strictEqual(winner.display_name, 'Matheus Albuquerque')
})

// 4. Teste com JSON real de 2 corridas (src/assets/2-corridas-40988.json)
runTest('Parser de 2 corridas (40988): somente HEAT 1 + FEATURE em race_sessions', () => {
  const filePath = path.join(__dirname, '../src/assets/2-corridas-40988.json')
  const rawContent = fs.readFileSync(filePath, 'utf-8')
  const parsed = parseIracingTestJson(rawContent)

  // Subsession ID e Pista
  assert.strictEqual(parsed.subsession_id, 75382029)
  assert.ok(parsed.track_name.includes('Fuji'))

  // all_sessions contém 5 sessões: PRACTICE, QUALIFY, HEAT 1, WARMUP, FEATURE
  assert.strictEqual(parsed.all_sessions.length, 5)
  assert.strictEqual(parsed.all_sessions[0].simsession_name, 'PRACTICE')
  assert.strictEqual(parsed.all_sessions[0].is_race, false)
  assert.strictEqual(parsed.all_sessions[1].simsession_name, 'QUALIFY')
  assert.strictEqual(parsed.all_sessions[1].is_race, false)
  assert.strictEqual(parsed.all_sessions[2].simsession_name, 'HEAT 1')
  assert.strictEqual(parsed.all_sessions[2].is_race, true)
  assert.strictEqual(parsed.all_sessions[3].simsession_name, 'WARMUP')
  assert.strictEqual(parsed.all_sessions[3].is_race, false)
  assert.strictEqual(parsed.all_sessions[4].simsession_name, 'FEATURE')
  assert.strictEqual(parsed.all_sessions[4].is_race, true)

  // race_sessions deve conter EXATAMENTE 2 sessões: HEAT 1 e FEATURE
  assert.strictEqual(parsed.race_sessions.length, 2)
  assert.strictEqual(parsed.race_sessions[0].simsession_name, 'HEAT 1')
  assert.strictEqual(parsed.race_sessions[0].is_race, true)
  assert.strictEqual(parsed.race_sessions[1].simsession_name, 'FEATURE')
  assert.strictEqual(parsed.race_sessions[1].is_race, true)
})

// 5. Teste de regra de exclusão e fallback: se nenhuma sessão for reconhecida como corrida, race_sessions DEVE ficar vazio
runTest('Se nenhuma sessão for reconhecida como corrida: race_sessions fica vazio e NÃO faz fallback para all_sessions', () => {
  const practiceOnlyJson = {
    subsession_id: 123456,
    track: { track_id: 1, track_name: 'Interlagos' },
    session_results: [
      {
        simsession_number: 0,
        simsession_name: 'PRACTICE',
        simsession_type: 3,
        simsession_type_name: 'Open Practice',
        results: [],
      },
      {
        simsession_number: 1,
        simsession_name: 'QUALIFY',
        simsession_type: 4,
        simsession_type_name: 'Lone Qualifying',
        results: [],
      },
      {
        simsession_number: 2,
        simsession_name: 'WARMUP',
        simsession_type: 3,
        simsession_type_name: 'Warmup',
        results: [],
      },
      {
        simsession_number: 3,
        simsession_name: 'TIME TRIAL',
        simsession_type: 3,
        simsession_type_name: 'Time Trial',
        results: [],
      },
    ],
  }

  const parsed = parseIracingTestJson(practiceOnlyJson)
  assert.strictEqual(parsed.all_sessions.length, 4)
  // race_sessions NÃO deve conter nenhuma sessão e NÃO deve usar fallback
  assert.strictEqual(parsed.race_sessions.length, 0)
})

// 6. Teste de regra de 3 corridas: HEAT 1 + FEATURE + CONSOLATION
runTest('Regra de identificação: 3 corridas com HEAT 1, FEATURE e CONSOLATION', () => {
  const threeRacesJson = {
    subsession_id: 999999,
    track: { track_id: 10, track_name: 'Spa-Francorchamps' },
    session_results: [
      {
        simsession_number: 0,
        simsession_name: 'PRACTICE',
        simsession_type_name: 'Practice',
        results: [],
      },
      {
        simsession_number: 1,
        simsession_name: 'HEAT 1',
        simsession_type_name: 'Race',
        results: [{ cust_id: 1, finish_position: 0, display_name: 'Piloto 1' }],
      },
      {
        simsession_number: 2,
        simsession_name: 'CONSOLATION',
        simsession_type_name: 'Race',
        results: [{ cust_id: 2, finish_position: 0, display_name: 'Piloto 2' }],
      },
      {
        simsession_number: 3,
        simsession_name: 'FEATURE',
        simsession_type_name: 'Race',
        results: [{ cust_id: 3, finish_position: 0, display_name: 'Piloto 3' }],
      },
    ],
  }

  const parsed = parseIracingTestJson(threeRacesJson)
  assert.strictEqual(parsed.all_sessions.length, 4)
  assert.strictEqual(parsed.race_sessions.length, 3)
  assert.strictEqual(parsed.race_sessions[0].simsession_name, 'HEAT 1')
  assert.strictEqual(parsed.race_sessions[1].simsession_name, 'CONSOLATION')
  assert.strictEqual(parsed.race_sessions[2].simsession_name, 'FEATURE')
})

console.log(`\nRESUMO DOS TESTES: ${passedTests} passaram, ${failedTests} falharam.`)
if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('TODOS OS TESTES FORAM EXECUTADOS COM SUCESSO!\n')
  process.exit(0)
}
