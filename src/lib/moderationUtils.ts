import type { StageRace, Championship } from '@/types'

/**
 * Remove acentos e converte para minúsculas para busca case-insensitive e insensível a acentuação.
 * Ex.: "José" -> "jose", "Acréscimo" -> "acrescimo"
 */
export function normalizeSearch(str: string): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Extrai penalidade automática (pontos, segundos, posições) a partir do texto de infração do regulamento.
 * Exemplos:
 * - "Art. 12.1 / Toque evitável com ganho de posição (-5 pts)" -> points: 5, type: 'pts'
 * - "Art. 15.3 / Excesso de velocidade no pit lane (+5s)" -> seconds: 5, type: 'seconds'
 * - "Art. 16.1 / Ultrapassagem fora dos limites (-2 posições)" -> positions: 2, type: 'positions'
 * - "Advertência desportiva formal" -> points: 0, type: 'warning'
 */
export function parsePenaltyFromInfraction(infractionText: string): {
  points: number
  seconds: number
  positions: number
  penaltyType: string
  displayText: string
} {
  if (!infractionText) {
    return {
      points: 0,
      seconds: 0,
      positions: 0,
      penaltyType: 'nenhuma',
      displayText: 'Nenhuma ação',
    }
  }

  const text = infractionText.trim()

  // Match negative points: (-5 pts) or (-5 pontos) or -5 pts or 5 pontos
  const ptsMatch = text.match(/-?(\d+)\s*(?:pts?|pontos?)/i)
  if (ptsMatch) {
    const pts = parseInt(ptsMatch[1], 10)
    return {
      points: pts,
      seconds: 0,
      positions: 0,
      penaltyType: 'pontos',
      displayText: `Perda de ${pts} ponto(s) no campeonato`,
    }
  }

  // Match seconds: (+5s) or (+10 seg) or 5s
  const secMatch = text.match(/\+?(\d+)\s*(?:s|seg|segundos?)/i)
  if (secMatch) {
    const sec = parseInt(secMatch[1], 10)
    return {
      points: 0,
      seconds: sec,
      positions: 0,
      penaltyType: 'segundos',
      displayText: `Acréscimo de ${sec}s no tempo de prova`,
    }
  }

  // Match positions: (-2 posições) or 2 posicoes
  const posMatch = text.match(/-?(\d+)\s*(?:posições?|posicoes?|pos)/i)
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10)
    return {
      points: 0,
      seconds: 0,
      positions: pos,
      penaltyType: 'posicoes',
      displayText: `Perda de ${pos} posição(ões) no resultado`,
    }
  }

  if (/advert[eê]ncia/i.test(text)) {
    return {
      points: 0,
      seconds: 0,
      positions: 0,
      penaltyType: 'advertencia',
      displayText: 'Advertência formal desportiva (sem perda de pontos)',
    }
  }

  return {
    points: 0,
    seconds: 0,
    positions: 0,
    penaltyType: 'geral',
    displayText: 'Penalidade prevista no regulamento',
  }
}

/**
 * Gera código curto oficial anti-duplicidade:
 * Exemplo do usuário: "IRB-2025-S1-SCB-E04-R2-C007"
 * Padrão: IRB-[ANO]-[TEMPORADA]-[CAMPEONATO]-[ETAPA]-[CORRIDA]-C[CASO_SEQUENCIAL]
 */
export function generateModerationCode(params: {
  year?: number | string
  seasonName?: string
  championshipName?: string
  championshipShortCode?: string
  stageOrder?: number
  raceOrder?: number
  caseSequence: number
}): string {
  const {
    year = new Date().getFullYear(),
    seasonName,
    championshipName,
    championshipShortCode,
    stageOrder = 1,
    raceOrder = 1,
    caseSequence = 1,
  } = params

  // Season clean code: "Temporada de Inverno 2025" -> "S1", "Temporada 2" -> "S2"
  let sCode = 'S1'
  if (seasonName) {
    const match = seasonName.match(/\d+/)
    if (match) {
      sCode = `S${match[0]}`
    } else if (/inverno/i.test(seasonName)) {
      sCode = 'S1'
    } else if (/ver[aã]o/i.test(seasonName)) {
      sCode = 'S2'
    }
  }

  // Champ short code:
  let cCode = championshipShortCode?.trim()?.toUpperCase()
  if (!cCode && championshipName) {
    const words = championshipName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
    cCode = words
      .map((w) => w[0].toUpperCase())
      .join('')
      .slice(0, 4)
  }
  if (!cCode) cCode = 'CHMP'

  const ePart = `E${String(stageOrder).padStart(2, '0')}`
  const rPart = `R${raceOrder}`
  const cPart = `C${String(caseSequence).padStart(3, '0')}`

  return `IRB-${year}-${sCode}-${cCode}-${ePart}-${rPart}-${cPart}`
}

/**
 * Validação de janela de acesso dos comissários:
 * - Seção "Corridas de hoje": ACESSO LIBERADO automaticamente 120 minutos antes do horário programado da etapa.
 * - Janela permanece aberta para EDIÇÃO até a data da PRÓXIMA etapa.
 * - Somente o administrador/colaborador do sistema pode alterar qualquer coisa a qualquer momento.
 */
export interface AccessWindowResult {
  canAccess: boolean
  canEdit: boolean
  isToday: boolean
  releaseTimeStr?: string
  minutesUntilRelease?: number
  reason?: string
}

export function checkStewardAccess(params: {
  stageDate?: string
  stageStartTime?: string
  nextStageDate?: string
  isCollaboratorOrAdmin: boolean
  now?: Date
}): AccessWindowResult {
  const {
    stageDate,
    stageStartTime = '14:00',
    nextStageDate,
    isCollaboratorOrAdmin,
    now = new Date(),
  } = params

  // Admin/colaborador always has full access and edit rights anytime
  if (isCollaboratorOrAdmin) {
    return {
      canAccess: true,
      canEdit: true,
      isToday: false,
    }
  }

  if (!stageDate) {
    return {
      canAccess: true,
      canEdit: true,
      isToday: false,
    }
  }

  // Construct start DateTime of this stage
  const [hours, minutes] = stageStartTime.split(':').map((v) => parseInt(v, 10) || 0)
  const raceStart = new Date(stageDate)
  raceStart.setHours(hours, minutes, 0, 0)

  // 120 minutes before race start
  const releaseTime = new Date(raceStart.getTime() - 120 * 60 * 1000)

  const nowMs = now.getTime()
  const releaseMs = releaseTime.getTime()

  // Check if stage is scheduled for today
  const isToday =
    now.getFullYear() === raceStart.getFullYear() &&
    now.getMonth() === raceStart.getMonth() &&
    now.getDate() === raceStart.getDate()

  // Next stage date deadline
  let nextStageDeadlineMs: number | null = null
  if (nextStageDate) {
    const nextDate = new Date(nextStageDate)
    nextDate.setHours(23, 59, 59, 999)
    nextStageDeadlineMs = nextDate.getTime()
  }

  // Blocked before 120 min
  if (nowMs < releaseMs) {
    const minutesLeft = Math.ceil((releaseMs - nowMs) / (60 * 1000))
    return {
      canAccess: false,
      canEdit: false,
      isToday,
      releaseTimeStr: releaseTime.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      minutesUntilRelease: minutesLeft,
      reason: `Acesso liberado 120 minutos antes da prova (às ${releaseTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}).`,
    }
  }

  // After next stage date: read-only for normal stewards
  if (nextStageDeadlineMs && nowMs > nextStageDeadlineMs) {
    return {
      canAccess: true,
      canEdit: false,
      isToday,
      reason: 'Janela de edição encerrada na data da próxima etapa. Apenas leitura.',
    }
  }

  return {
    canAccess: true,
    canEdit: true,
    isToday,
  }
}
