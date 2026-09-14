/**
 * Utilitários para parsing e formatação de arquivos JSON exportados do iRacing.
 * Suporta etapas com 1 corrida ou múltiplas baterias/corridas oficiais (ex: Heat 1 + Feature),
 * conversão de unidades de tempo do iRacing (1/10.000 de segundo),
 * identificação de volta rápida, pole position, posições por classe e descarte de pontuação.
 */

export interface IracingSessionDriverResult {
  cust_id: number
  display_name: string
  finish_position: number // 0-based in raw json, normalizado para 1-based display
  finish_position_in_class: number // 0-based in raw json, normalizado para 1-based display
  starting_position: number
  starting_position_in_class: number
  car_id: number
  car_name: string
  car_class_id: number
  car_class_name: string
  car_class_short_name: string
  best_lap_num: number
  best_lap_time: number // Unidades de tempo iRacing (1/10.000 de segundo; 10.000 unidades = 1 segundo). -1 se não houver tempo válido
  best_lap_time_str: string // Formato m:ss.mmm
  best_qual_lap_num: number
  best_qual_lap_time: number // Unidades de tempo iRacing (1/10.000 de segundo)
  best_qual_lap_time_str: string
  average_lap: number // Unidades de tempo iRacing (1/10.000 de segundo)
  average_lap_str: string
  laps_complete: number
  laps_lead: number
  incidents: number
  weight_penalty_kg: number
  drop_race: boolean
  country_code: string
  car_number?: string
  reason_out?: string
  is_winner: boolean
  is_podium: boolean
  is_fastest_lap: boolean
  is_pole: boolean
}

export interface IracingParsedSession {
  simsession_number: number
  simsession_name: string
  simsession_type: number
  simsession_type_name: string
  is_race: boolean
  results: IracingSessionDriverResult[]
}

export interface IracingCarClassInfo {
  car_class_id: number
  name: string
  short_name: string
}

export interface IracingParsedFile {
  subsession_id: number
  track_id: number
  track_name: string
  track_config: string
  start_time: string
  car_classes: IracingCarClassInfo[]
  all_sessions: IracingParsedSession[]
  race_sessions: IracingParsedSession[]
}

/**
 * Converte tempo do iRacing (exportado em décimos de milissegundo / 1/10.000 de segundo,
 * onde 10.000 unidades equivalem exatamente a 1,0000 segundo.
 * Exemplo: 1105665 unidades = 110,5665 segundos = 1:50.567) para string legível m:ss.mmm.
 * Se <= 0 ou indefinido/inválido, retorna '-'
 */
export function formatIracingTime(iracingTimeUnits?: number | null): string {
  if (iracingTimeUnits === undefined || iracingTimeUnits === null || iracingTimeUnits <= 0) {
    return '-'
  }
  // No JSON de resultados do iRacing (event results), lap times são expressos em 1/10.000 de segundo (100 µs por unidade).
  // Ex: 1105665 / 10000 = 110.5665 segundos = 1m 50s 567ms.
  // Ex: 999540 / 10000 = 99.954 segundos = 1m 39s 954ms.
  const totalSeconds = iracingTimeUnits / 10000
  return formatSecondsToLap(totalSeconds)
}

export function formatSecondsToLap(totalSeconds: number): string {
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

/**
 * Analisa e extrai todas as informações de um JSON do iRacing (1 corrida ou múltiplas).
 */
export function parseIracingJson(fileContent: string | object): IracingParsedFile {
  const root = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent
  const data = root.data || root

  const subsession_id = Number(data.subsession_id || 0)
  const track = data.track || {}
  const track_id = Number(track.track_id || 0)
  const track_name = String(track.track_name || 'Pista')
  const track_config = String(track.config_name || '')
  const start_time = String(data.start_time || data.simulated_start_time || '')

  const car_classes: IracingCarClassInfo[] = (data.car_classes || []).map((c: any) => ({
    car_class_id: Number(c.car_class_id || 0),
    name: String(c.name || c.short_name || 'Geral'),
    short_name: String(c.short_name || c.name || 'Geral'),
  }))

  const rawSessions: any[] = Array.isArray(data.session_results) ? data.session_results : []

  // Check qualifying session to extract best qualifying times if race session doesn't include them
  const qualSession = rawSessions.find((s) => {
    const tName = String(s.simsession_name || s.simsession_type_name || '').toLowerCase()
    return tName.includes('qualify') || s.simsession_type === 5 || s.simsession_type === 4
  })

  const qualMapByCustId = new Map<number, { qualTime: number; qualNum: number }>()
  if (qualSession && Array.isArray(qualSession.results)) {
    for (const r of qualSession.results) {
      const cid = Number(r.cust_id)
      const bTime = Number(r.best_lap_time ?? -1)
      const bNum = Number(r.best_lap_num ?? -1)
      if (bTime > 0) {
        qualMapByCustId.set(cid, { qualTime: bTime, qualNum: bNum })
      }
    }
  }

  // Regras DEFINIDAS pela Especificação Mestre de Sessões de Corrida:
  // Practice, Qualify, Warmup, Test e Time Trial NÃO são corridas oficiais.
  // Regras de identificação de corridas oficiais:
  // 1 corrida: "RACE"
  // 2 corridas: "HEAT 1" + "FEATURE"
  // 3 corridas: "HEAT 1" + "FEATURE" + "CONSOLATION"
  // Se nenhuma sessão for reconhecida como corrida: race_sessions deve permanecer vazio.
  // NÃO usar fallback que transforme all_sessions em race_sessions.
  const NON_RACE_KEYWORDS = ['PRACTICE', 'QUALIFY', 'WARMUP', 'PRACTISE', 'TEST', 'TIME TRIAL']

  const all_sessions: IracingParsedSession[] = rawSessions.map((session, sIdx) => {
    const sName = String(session.simsession_name || `Sessão ${sIdx + 1}`).trim()
    const sType = Number(session.simsession_type ?? 0)
    const sTypeName = String(session.simsession_type_name || '').trim()
    const upperName = sName.toUpperCase()
    const upperTypeName = sTypeName.toUpperCase()

    // Verificar se é sessão de treino/warmup/qualy/test/time trial explicitamente
    const isNonRace = NON_RACE_KEYWORDS.some(
      (kw) => upperName.includes(kw) || upperTypeName.includes(kw),
    )

    // Regras de identificação de corrida oficial:
    // Deve NÃO ser sessão de treino/warmup/qualify/test/time trial E atender aos padrões oficiais de corrida:
    // - "RACE" (corrida única de 1 corrida ou simsession_name exatamente RACE)
    // - "HEAT 1" (bateria 1 em formato multicorridas)
    // - "FEATURE" (corrida principal / feature race em formato multicorridas)
    // - "CONSOLATION" (corrida de repescagem / consolo em formato 3 corridas)
    const isOfficialRaceName =
      upperName === 'RACE' ||
      upperName === 'HEAT 1' ||
      upperName.startsWith('HEAT 1 ') ||
      upperName === 'FEATURE' ||
      upperName.startsWith('FEATURE ') ||
      upperName === 'CONSOLATION' ||
      upperName.startsWith('CONSOLATION ')

    // Caso o nome genérico da simsession_type_name seja 'Race' e não haja nome conflitante
    const isMasterRaceSession = !isNonRace && isOfficialRaceName

    const isRace = isMasterRaceSession

    const rawResults: any[] = Array.isArray(session.results) ? session.results : []

    // Encontrar menor volta mais rápida válida (> 0) da sessão inteira e por classe
    let globalFastestTime = Infinity
    const fastestByClass = new Map<number, number>()
    const poleByClass = new Map<number, number>()
    let globalPoleTime = Infinity

    for (const r of rawResults) {
      const bTime = Number(r.best_lap_time ?? -1)
      const classId = Number(r.car_class_id ?? 0)
      if (bTime > 0) {
        if (bTime < globalFastestTime) globalFastestTime = bTime
        const curClassFastest = fastestByClass.get(classId) || Infinity
        if (bTime < curClassFastest) fastestByClass.set(classId, bTime)
      }

      // Check qual time
      let qTime = Number(r.best_qual_lap_time ?? -1)
      if (qTime <= 0 && qualMapByCustId.has(Number(r.cust_id))) {
        qTime = qualMapByCustId.get(Number(r.cust_id))!.qualTime
      }
      if (qTime > 0) {
        if (qTime < globalPoleTime) globalPoleTime = qTime
        const curClassPole = poleByClass.get(classId) || Infinity
        if (qTime < curClassPole) poleByClass.set(classId, qTime)
      }
    }

    const mappedResults: IracingSessionDriverResult[] = rawResults.map((r) => {
      const cust_id = Number(r.cust_id || 0)
      const display_name = String(r.display_name || 'Piloto')
      // Note: iRacing results finish_position is 0-indexed (0 = 1st place, 1 = 2nd place, etc.)
      const rawPos = Number(r.finish_position ?? 99)
      const rawPosInClass = Number(r.finish_position_in_class ?? rawPos)
      const rawStartPos = Number(r.starting_position ?? -1)
      const rawStartPosInClass = Number(r.starting_position_in_class ?? rawStartPos)

      const best_lap_time = Number(r.best_lap_time ?? -1)
      const best_lap_num = Number(r.best_lap_num ?? -1)

      let best_qual_lap_time = Number(r.best_qual_lap_time ?? -1)
      let best_qual_lap_num = Number(r.best_qual_lap_num ?? -1)
      if (best_qual_lap_time <= 0 && qualMapByCustId.has(cust_id)) {
        const qInfo = qualMapByCustId.get(cust_id)!
        best_qual_lap_time = qInfo.qualTime
        best_qual_lap_num = qInfo.qualNum
      }

      const average_lap = Number(r.average_lap ?? 0)
      const laps_complete = Number(r.laps_complete ?? 0)
      const laps_lead = Number(r.laps_lead ?? 0)
      const incidents = Number(r.incidents ?? 0)
      const weight_penalty_kg = Number(r.weight_penalty_kg ?? 0)
      const drop_race = Boolean(r.drop_race)
      const country_code = String(r.country_code || r.flair_shortname || 'BR')
      const car_number = r.livery?.car_number ? String(r.livery.car_number) : undefined
      const reason_out = String(r.reason_out || '')

      const car_class_id = Number(r.car_class_id ?? 0)
      const car_class_name = String(r.car_class_name || 'Geral')
      const car_class_short_name = String(r.car_class_short_name || car_class_name)

      // 1-based display
      const finishPos1Based = rawPos + 1
      const finishPosInClass1Based = rawPosInClass + 1
      const is_winner = finishPos1Based === 1 || finishPosInClass1Based === 1
      const is_podium = finishPos1Based <= 3 || finishPosInClass1Based <= 3
      const is_fastest_lap =
        best_lap_time > 0 &&
        (best_lap_time === globalFastestTime || best_lap_time === fastestByClass.get(car_class_id))
      const is_pole =
        rawStartPos === 0 ||
        rawStartPosInClass === 0 ||
        (best_qual_lap_time > 0 &&
          (best_qual_lap_time === globalPoleTime ||
            best_qual_lap_time === poleByClass.get(car_class_id)))

      return {
        cust_id,
        display_name,
        finish_position: finishPos1Based,
        finish_position_in_class: finishPosInClass1Based,
        starting_position: rawStartPos >= 0 ? rawStartPos + 1 : (undefined as any),
        starting_position_in_class:
          rawStartPosInClass >= 0 ? rawStartPosInClass + 1 : (undefined as any),
        car_id: Number(r.car_id || 0),
        car_name: String(r.car_name || ''),
        car_class_id,
        car_class_name,
        car_class_short_name,
        best_lap_num,
        best_lap_time,
        best_lap_time_str: formatIracingTime(best_lap_time),
        best_qual_lap_num,
        best_qual_lap_time,
        best_qual_lap_time_str: formatIracingTime(best_qual_lap_time),
        average_lap,
        average_lap_str: formatIracingTime(average_lap),
        laps_complete,
        laps_lead,
        incidents,
        weight_penalty_kg,
        drop_race,
        country_code,
        car_number,
        reason_out,
        is_winner,
        is_podium,
        is_fastest_lap,
        is_pole,
      }
    })

    // Ordenar: primeiro por posição final (1, 2, 3...)
    // Pilotos com best_lap_time = -1 e laps_complete = 0 ficam no final se não cruzaram linha
    mappedResults.sort((a, b) => a.finish_position - b.finish_position)

    return {
      simsession_number: Number(session.simsession_number ?? sIdx),
      simsession_name: sName,
      simsession_type: sType,
      simsession_type_name: sTypeName,
      is_race: isRace,
      results: mappedResults,
    }
  })

  // Apenas sessões que representam corridas oficiais (desconsiderando treinos/qualy/warmup/test/time trial).
  // Conforme especificação: Se nenhuma sessão for reconhecida como corrida, race_sessions deve
  // permanecer vazio. NÃO usar fallback que transforme all_sessions em race_sessions!
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

/**
 * Calcula os pontos de um piloto em uma corrida de acordo com:
 * - Sistema de pontuação do campeonato (preset ou regras)
 * - Posição (geral ou na classe se multi-classe)
 * - Multiplicador de etapa
 * - Bônus (volta rápida, pole position)
 */
export function calculateDriverRacePoints(params: {
  position: number // 1-based (geral ou in_class)
  isFastestLap?: boolean
  isPole?: boolean
  multiplier?: number
  scoringRules?: { position: number; points: number }[]
  bonusFastestLap?: number
  bonusPole?: number
}): { basePoints: number; bonusPoints: number; totalPoints: number } {
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
