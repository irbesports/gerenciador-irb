import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  CloudSun,
  ShieldAlert,
  Send,
  MessageSquare,
  AlertTriangle,
  Plus,
  Scale,
  ChevronRight,
  Info,
  CheckCircle2,
  Trash2,
  X,
  Check,
  Search,
  Hash,
  Gavel,
  AlertCircle,
  FileText,
  UserX,
  MinusCircle,
  Edit,
  Lock,
  Unlock,
  RotateCcw,
} from 'lucide-react'
import {
  stageRacesService,
  stageRaceCommentsService,
  raceResultsService,
  moderationCasesService,
  pilotsService,
  championshipPilotsService,
  championshipsService,
  notificationsService,
} from '@/services/api'
import type {
  StageRace,
  StageRaceComment,
  RaceResultRecord,
  ModerationCase,
  Pilot,
  Championship,
  ChampionshipPilot,
  ModerationCaseStatus,
  ModerationCaseOpenedByType,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  normalizeSearch,
  parsePenaltyFromInfraction,
  generateModerationCode,
} from '@/lib/moderationUtils'

// Participant interface merging ChampionshipPilot and registered Pilot
interface IncidentPilotOption {
  id: string // pilot id or champ_pilot id
  name: string
  number?: number
  team?: string
  iracing_id?: string
  pilotRecordId?: string
}

export default function RaceModerationPage() {
  const { raceId } = useParams<{ raceId: string }>()
  const navigate = useNavigate()
  const { user, isCollaborator } = useAuth()
  const { toast } = useToast()

  const [race, setRace] = useState<StageRace | null>(null)
  const [championship, setChampionship] = useState<Championship | null>(null)
  const [comments, setComments] = useState<StageRaceComment[]>([])
  const [raceResults, setRaceResults] = useState<RaceResultRecord[]>([])
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([])
  const [champPilots, setChampPilots] = useState<ChampionshipPilot[]>([])
  const [allPilots, setAllPilots] = useState<Pilot[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isTogglingRaceLock, setIsTogglingRaceLock] = useState(false)

  // Incident Modal State (Add / Edit)
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false)
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null)
  const [caseLap, setCaseLap] = useState<string>('1') // free text
  const [selectedPilots, setSelectedPilots] = useState<IncidentPilotOption[]>([])
  const [pilotSearchQuery, setPilotSearchQuery] = useState('')
  const [isPilotDropdownOpen, setIsPilotDropdownOpen] = useState(false)
  const [guiltyPilotId, setGuiltyPilotId] = useState<string>('SEM_CULPADO')
  const [infractionQuery, setInfractionQuery] = useState('')
  const [isInfractionDropdownOpen, setIsInfractionDropdownOpen] = useState(false)
  const [caseDescription, setCaseDescription] = useState('') // max 120
  const [isSavingCase, setIsSavingCase] = useState(false)

  // Confirm delete / cancel dialog
  const [cancelTargetCaseId, setCancelTargetCaseId] = useState<string | null>(null)
  const [isDeletingCase, setIsDeletingCase] = useState(false)

  // Confirm race close / reopen dialog
  const [isRaceLockConfirmOpen, setIsRaceLockConfirmOpen] = useState(false)
  const [raceLockAction, setRaceLockAction] = useState<'close' | 'reopen'>('close')

  const pilotInputRef = useRef<HTMLInputElement>(null)
  const infractionInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    if (!raceId) return
    try {
      setIsLoading(true)
      const [r, cList, results, cases, pList] = await Promise.all([
        stageRacesService.getOne(raceId),
        stageRaceCommentsService.listByRace(raceId),
        raceResultsService.listByRace(raceId, true),
        moderationCasesService.listByRace(raceId, false),
        pilotsService.list(),
      ])
      setRace(r)
      setComments(cList)
      setRaceResults(results)
      setModerationCases(cases)
      setAllPilots(pList)

      const champId = r.expand?.stage_id?.championship_id
      if (champId) {
        try {
          const [c, cpList] = await Promise.all([
            championshipsService.getOne(champId),
            championshipPilotsService.listByChampionship(champId),
          ])
          setChampionship(c)
          setChampPilots(cpList)
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações desta corrida.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [raceId])

  const stage = race?.expand?.stage_id
  const champ = championship || stage?.expand?.championship_id
  const track = stage?.expand?.track

  const isRaceClosed = Boolean(race?.is_closed)
  // Non-collaborators cannot edit when closed
  const canEditRace = isCollaborator || !isRaceClosed

  // Map of pilot number per championship pilot
  const pilotNumberMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const cp of champPilots) {
      if (cp.pilot && cp.number !== undefined && cp.number !== null) {
        map.set(cp.pilot, cp.number)
      }
      if (cp.id && cp.number !== undefined && cp.number !== null) {
        map.set(cp.id, cp.number)
      }
    }
    return map
  }, [champPilots])

  // Helper to format pilot badge label as "#número - Nome"
  const getPilotDisplayLabel = (p: {
    id: string
    name?: string
    number?: number
    pilotRecordId?: string
  }) => {
    const num =
      p.number !== undefined && p.number !== null
        ? p.number
        : ((p.pilotRecordId ? pilotNumberMap.get(p.pilotRecordId) : undefined) ??
          pilotNumberMap.get(p.id))
    const numStr = num !== undefined && num !== null && String(num) !== '' ? `#${num}` : '#'
    return `${numStr} - ${p.name || 'Piloto'}`
  }

  // 1. Pilotos inscritos no campeonato (normalizados com iracing_id, nome, número)
  const championshipPilotOptions: IncidentPilotOption[] = useMemo(() => {
    const list: IncidentPilotOption[] = []
    const seen = new Set<string>()

    // Priority to championship_pilots
    for (const cp of champPilots) {
      const name = cp.name || cp.expand?.pilot?.name || 'Piloto'
      const key = `${name.toLowerCase()}_${cp.number ?? ''}`
      if (!seen.has(key)) {
        seen.add(key)
        list.push({
          id: cp.pilot || cp.id,
          name,
          number: cp.number ?? cp.expand?.pilot?.number,
          team: cp.team || cp.expand?.pilot?.team_name,
          iracing_id: cp.iracing_id,
          pilotRecordId: cp.pilot,
        })
      }
    }

    // Add raceResults drivers if not present
    for (const rr of raceResults) {
      const name = rr.display_name
      const key = `${name.toLowerCase()}_${rr.car_number ?? ''}`
      if (!seen.has(key)) {
        seen.add(key)
        list.push({
          id: rr.pilot_id || rr.id,
          name,
          number: rr.car_number ? Number(rr.car_number) : undefined,
          team: rr.expand?.pilot_id?.team_name || 'iRacing Driver',
          iracing_id: String(rr.cust_id),
          pilotRecordId: rr.pilot_id,
        })
      }
    }

    // If still empty, fall back to global pilots
    if (list.length === 0) {
      for (const p of allPilots) {
        list.push({
          id: p.id,
          name: p.name,
          number: p.number,
          team: p.team_name,
          iracing_id: p.iracing_id,
          pilotRecordId: p.id,
        })
      }
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [champPilots, raceResults, allPilots])

  // Filter pilots by autocomplete, case-insensitive e IGNORANDO ACENTOS
  const filteredPilots = useMemo(() => {
    const q = normalizeSearch(pilotSearchQuery)
    const selectedIds = new Set(selectedPilots.map((p) => p.id))
    return championshipPilotOptions
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => {
        if (!q) return true
        const normName = normalizeSearch(p.name)
        const normTeam = normalizeSearch(p.team || '')
        const numStr = String(p.number ?? '')
        const irStr = String(p.iracing_id ?? '')
        return (
          normName.includes(q) || normTeam.includes(q) || numStr.includes(q) || irStr.includes(q)
        )
      })
  }, [championshipPilotOptions, selectedPilots, pilotSearchQuery])

  // 2. Regulamento: lista de infrações passíveis de punição
  const regulationInfractions: string[] = useMemo(() => {
    const list: string[] = []
    if (champ?.regulation_rules && Array.isArray(champ.regulation_rules)) {
      for (const item of champ.regulation_rules) {
        const text = typeof item === 'string' ? item : item.title || item.code
        if (text && !list.includes(text)) {
          list.push(text)
        }
      }
    }

    if (list.length === 0) {
      list.push(
        'Art. 12.1 / Toque evitável com ganho de posição (-5 pts)',
        'Art. 12.2 / Toque traseiro na tomada de curva (-3 pts)',
        'Art. 13.1 / Bloqueio irregular de trajetória em reta (-5 pts)',
        'Art. 14.2 / Reentrada perigosa na pista (Unsafe Rejoin) (-10 pts)',
        'Art. 15.3 / Excesso de velocidade na entrada do pit lane (+5s)',
        'Art. 16.1 / Ultrapassagem fora dos limites da pista (-2 posições)',
        'Art. 17.2 / Conduta antidesportiva grave (-15 pts)',
        'Art. 18.1 / Desrespeito à bandeira amarela (-5 pts)',
        'Art. 19.4 / Advertência desportiva formal (Sem perda de pontos)',
        'Art. 20.2 / Não cumprimento de pit stop obrigatório (-20 pts)',
      )
    }

    return list
  }, [champ])

  // Filter infractions autocomplete, case-insensitive e IGNORANDO ACENTOS
  const filteredInfractions = useMemo(() => {
    const q = normalizeSearch(infractionQuery)
    if (!q) return regulationInfractions
    return regulationInfractions.filter((item) => normalizeSearch(item).includes(q))
  }, [regulationInfractions, infractionQuery])

  // Dynamic preview of the automatic penalty from the selected infraction
  const parsedPenalty = useMemo(() => {
    return parsePenaltyFromInfraction(infractionQuery)
  }, [infractionQuery])

  // Open New Incident Modal
  const handleOpenIncidentModal = () => {
    if (isRaceClosed && !isCollaborator) {
      toast({
        title: 'Corrida Fechada',
        description: 'Esta corrida está fechada para novos registros de comissários.',
        variant: 'destructive',
      })
      return
    }
    setEditingCaseId(null)
    setCaseLap('1')
    setSelectedPilots([])
    setPilotSearchQuery('')
    setIsPilotDropdownOpen(false)
    setGuiltyPilotId('SEM_CULPADO')
    setInfractionQuery(regulationInfractions[0] || '')
    setIsInfractionDropdownOpen(false)
    setCaseDescription('')
    setIsCaseModalOpen(true)
  }

  // Open Edit Incident Modal
  const handleEditCase = (c: ModerationCase) => {
    if (isRaceClosed && !isCollaborator) {
      toast({
        title: 'Corrida Fechada',
        description: 'Apenas administradores podem editar incidentes em corridas fechadas.',
        variant: 'destructive',
      })
      return
    }

    setEditingCaseId(c.id)
    setCaseLap(String(c.lap || '1'))
    setCaseDescription((c.description || '').slice(0, 120))
    setInfractionQuery(c.infraction_cited || '')

    // Resolve involved pilots to IncidentPilotOption
    const involvedIds = c.involved_pilots || []
    const matchingPilots: IncidentPilotOption[] = []
    for (const pid of involvedIds) {
      const found = championshipPilotOptions.find(
        (opt) => opt.id === pid || opt.pilotRecordId === pid,
      )
      if (found) {
        matchingPilots.push(found)
      } else {
        const rawPilot = allPilots.find((p) => p.id === pid)
        if (rawPilot) {
          matchingPilots.push({
            id: rawPilot.id,
            name: rawPilot.name,
            number: rawPilot.number,
            team: rawPilot.team_name,
            pilotRecordId: rawPilot.id,
          })
        }
      }
    }
    setSelectedPilots(matchingPilots)

    if (c.guilty_pilot_id) {
      const match = matchingPilots.find(
        (p) => p.id === c.guilty_pilot_id || p.pilotRecordId === c.guilty_pilot_id,
      )
      setGuiltyPilotId(match ? match.id : c.guilty_pilot_id)
    } else {
      setGuiltyPilotId('SEM_CULPADO')
    }

    setIsPilotDropdownOpen(false)
    setIsInfractionDropdownOpen(false)
    setIsCaseModalOpen(true)
  }

  // Pilot multi-selection
  const handleAddPilot = (pilot: IncidentPilotOption) => {
    if (!selectedPilots.some((p) => p.id === pilot.id)) {
      setSelectedPilots([...selectedPilots, pilot])
    }
    setPilotSearchQuery('')
    setIsPilotDropdownOpen(false)
  }

  const handleRemovePilot = (pilotId: string) => {
    setSelectedPilots(selectedPilots.filter((p) => p.id !== pilotId))
    if (guiltyPilotId === pilotId) {
      setGuiltyPilotId('SEM_CULPADO')
    }
  }

  /**
   * Final Decision Handlers:
   * Action a) APLICAR: aplica a PUNIÇÃO AUTOMÁTICA prevista no regulamento (status: "Aplicado em corrida")
   * Action b) PÓS CORRIDA: marca para análise depois do término da etapa (status: "Aplicado pós corrida")
   */
  const handleSaveDecision = async (decisionType: 'APLICAR' | 'POS_CORRIDA') => {
    if (!raceId || !champ?.id) return

    if (isRaceClosed && !isCollaborator) {
      toast({
        title: 'Corrida Fechada',
        description: 'A corrida está fechada para alterações.',
        variant: 'destructive',
      })
      return
    }

    if (selectedPilots.length === 0) {
      toast({
        title: 'Selecione os pilotos envolvidos',
        description: 'É obrigatório incluir ao menos um piloto no incidente.',
        variant: 'destructive',
      })
      return
    }

    if (!infractionQuery.trim()) {
      toast({
        title: 'Infração obrigatória',
        description: 'Selecione a infração respectiva conforme o regulamento da competição.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSavingCase(true)

      const targetStatus: ModerationCaseStatus =
        decisionType === 'APLICAR' ? 'Aplicado em corrida' : 'Aplicado pós corrida'

      const isGuilty = guiltyPilotId !== 'SEM_CULPADO'
      const actualGuiltyPilot = isGuilty ? selectedPilots.find((p) => p.id === guiltyPilotId) : null

      let resolvedGuiltyPilotRecordId: string | undefined = undefined
      if (actualGuiltyPilot) {
        resolvedGuiltyPilotRecordId = actualGuiltyPilot.pilotRecordId || actualGuiltyPilot.id
      }

      const involvedRecordIds = selectedPilots.map((p) => p.pilotRecordId || p.id).filter(Boolean)

      const penalty = parsePenaltyFromInfraction(infractionQuery)
      const penaltyText =
        decisionType === 'APLICAR'
          ? penalty.displayText
          : 'Em análise comissária para julgamento pós-corrida'

      const trimmedDesc = caseDescription.trim().slice(0, 120)

      if (editingCaseId) {
        // UPDATE existing case
        await moderationCasesService.update(editingCaseId, {
          lap: caseLap.trim() || '1',
          involved_pilots: involvedRecordIds,
          guilty_pilot_id: resolvedGuiltyPilotRecordId || undefined,
          status: targetStatus,
          infraction_cited: infractionQuery.trim(),
          penalty_applied: penaltyText,
          penalty_points: decisionType === 'APLICAR' ? penalty.points : 0,
          penalty_seconds: decisionType === 'APLICAR' ? penalty.seconds : 0,
          penalty_positions: decisionType === 'APLICAR' ? penalty.positions : 0,
          penalty_type: penalty.penaltyType,
          description: trimmedDesc,
          cancelled: false,
        })

        toast({
          title: 'Incidente Atualizado',
          description: 'As alterações do incidente foram gravadas com sucesso.',
        })
      } else {
        // CREATE new case
        const currentCounter = (race?.case_counter || 0) + 1
        const generatedCode = generateModerationCode({
          year: champ.expand?.season_id?.expand?.year_id?.year || new Date().getFullYear(),
          seasonName: champ.expand?.season_id?.name,
          championshipName: champ.name,
          championshipShortCode: champ.short_code,
          stageOrder: stage?.order ?? 1,
          raceOrder: race?.order ?? 1,
          caseSequence: currentCounter,
        })

        const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

        const createdCase = await moderationCasesService.create({
          stage_race_id: raceId,
          championship_id: champ.id,
          code: generatedCode,
          case_number: currentCounter,
          lap: caseLap.trim() || '1',
          involved_pilots: involvedRecordIds,
          guilty_pilot_id: resolvedGuiltyPilotRecordId,
          opened_by_type: 'comissarios',
          author_user_id: user?.id,
          status: targetStatus,
          infraction_cited: infractionQuery.trim(),
          penalty_applied: penaltyText,
          penalty_points: decisionType === 'APLICAR' ? penalty.points : 0,
          penalty_seconds: decisionType === 'APLICAR' ? penalty.seconds : 0,
          penalty_positions: decisionType === 'APLICAR' ? penalty.positions : 0,
          penalty_type: penalty.penaltyType,
          description: trimmedDesc,
          deadline: deadlineDate,
          cancelled: false,
        })

        try {
          await stageRacesService.update(raceId, {
            case_counter: currentCounter,
          })
        } catch (err) {
          console.error('Error updating race case counter:', err)
        }

        await notificationsService.notifyInvolvedPilots({
          caseRecord: createdCase,
          involvedPilotRecords: selectedPilots,
          stageName: `Etapa ${stage?.order ?? 1}`,
          trackName: track?.name || 'Pista Oficial',
          raceName: race?.name || `Corrida ${race?.order ?? 1}`,
          lap: caseLap.trim() || '1',
          openedByType: 'comissarios',
          status: targetStatus,
          penaltyApplied: penaltyText,
        })

        toast({
          title:
            decisionType === 'APLICAR'
              ? `Punição Aplicada — ${generatedCode}`
              : `Marcado para Pós-Corrida — ${generatedCode}`,
          description:
            decisionType === 'APLICAR'
              ? `Infração gravada e punição aplicada. Pilotos citados foram notificados com prazo de 24h.`
              : `Incidente registrado para julgamento após a etapa. Pilotos envolvidos foram notificados.`,
        })
      }

      setIsCaseModalOpen(false)
      const updatedList = await moderationCasesService.listByRace(raceId, false)
      setModerationCases(updatedList)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao registrar incidente',
        description: err?.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCase(false)
    }
  }

  // Quick Action: Resolver / Fechar caso diretamente da linha (marca como Aplicado pós corrida / decidido)
  const handleQuickResolveCase = async (c: ModerationCase) => {
    if (isRaceClosed && !isCollaborator) {
      toast({
        title: 'Corrida Fechada',
        description: 'A corrida está fechada para edições.',
        variant: 'destructive',
      })
      return
    }

    try {
      await moderationCasesService.update(c.id, {
        status: 'Aplicado pós corrida',
        cancelled: false,
      })
      toast({
        title: 'Caso Finalizado',
        description: `O caso ${c.code || c.id} foi marcado como decidido / aplicado pós-corrida.`,
      })
      const updatedList = await moderationCasesService.listByRace(raceId!, false)
      setModerationCases(updatedList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível resolver o caso.',
        variant: 'destructive',
      })
    }
  }

  // Quick Action: Negar / Sem ação (lance de corrida — zera punições)
  const handleQuickDismissCase = async (c: ModerationCase) => {
    if (isRaceClosed && !isCollaborator) {
      toast({
        title: 'Corrida Fechada',
        description: 'A corrida está fechada para edições.',
        variant: 'destructive',
      })
      return
    }

    try {
      await moderationCasesService.update(c.id, {
        status: 'Nenhuma ação necessária',
        penalty_applied: 'Lance de corrida analisado — Nenhuma ação necessária',
        penalty_points: 0,
        penalty_seconds: 0,
        penalty_positions: 0,
        cancelled: false,
      })
      toast({
        title: 'Nenhuma Ação Necessária',
        description: `O caso ${c.code || c.id} foi classificado como lance de corrida. Punições zeradas.`,
      })
      const updatedList = await moderationCasesService.listByRace(raceId!, false)
      setModerationCases(updatedList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o caso.',
        variant: 'destructive',
      })
    }
  }

  // Delete action: zero/cancel record completely (reverts championship penalties)
  const handleConfirmCancelCase = async () => {
    if (!cancelTargetCaseId) return
    try {
      setIsDeletingCase(true)
      await moderationCasesService.update(cancelTargetCaseId, {
        cancelled: true,
        status: 'Nenhuma ação necessária',
        penalty_applied: 'Incidente cancelado/excluído pelos comissários',
        penalty_points: 0,
        penalty_seconds: 0,
        penalty_positions: 0,
      })

      toast({
        title: 'Incidente Excluído',
        description:
          'O incidente foi excluído/cancelado com sucesso. Estatísticas e punições foram revertidas.',
      })
      setCancelTargetCaseId(null)
      const updatedList = await moderationCasesService.listByRace(raceId!, false)
      setModerationCases(updatedList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir incidente',
        description: 'Não foi possível cancelar o registro.',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingCase(false)
    }
  }

  // Toggle Race Lock: Fechar / Reabrir corrida
  const handleToggleRaceLock = async () => {
    if (!raceId || !race) return

    // Reopen can only be performed by admin (colaborador)
    if (race.is_closed && !isCollaborator) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas administradores podem reabrir uma corrida que foi fechada.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsTogglingRaceLock(true)
      const newClosedState = !race.is_closed

      const updated = await stageRacesService.update(raceId, {
        is_closed: newClosedState,
        closed_at: newClosedState ? new Date().toISOString() : null,
        closed_by: newClosedState ? user?.id : null,
      })

      setRace(updated)
      setIsRaceLockConfirmOpen(false)

      toast({
        title: newClosedState ? 'Corrida Fechada' : 'Corrida Reaberta',
        description: newClosedState
          ? 'A janela de edição de comissários para esta bateria foi encerrada.'
          : 'A bateria foi reaberta com sucesso pelo administrador.',
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao alterar status de fechamento da corrida.',
        variant: 'destructive',
      })
    } finally {
      setIsTogglingRaceLock(false)
    }
  }

  // Send internal steward discussion note
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user || !raceId) return

    try {
      setIsSending(true)
      await stageRaceCommentsService.create(raceId, newComment.trim(), user.id)
      setNewComment('')
      const updated = await stageRaceCommentsService.listByRace(raceId)
      setComments(updated)
      toast({
        title: 'Anotação registrada',
        description: 'A nota interna dos comissários foi salva.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível gravar o comentário.',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-16 text-center text-sm text-gray-400 animate-pulse">
        Carregando painel de incidentes da corrida...
      </div>
    )
  }

  if (!race) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-gray-400">Corrida não encontrada ou sem permissão de acesso.</p>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard/moderacao/central-de-provas')}
          className="text-xs border-white/10"
        >
          Voltar para Central de Provas
        </Button>
      </div>
    )
  }

  const formattedDate = stage?.date
    ? new Date(stage.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-'

  const statusColors = {
    'Aplicado pós corrida': 'bg-[#1b4332] text-[#74c69d] border-[#2d6a4f]',
    'Aplicado em corrida': 'bg-[#2d6a4f] text-[#95d5b2] border-[#40916c]',
    'Nenhuma ação necessária': 'bg-[#2b2d42] text-gray-300 border-white/10',
    'Em análise': 'bg-amber-950/60 text-amber-300 border-amber-600/40',
  }

  const raceDisplayName = race.name || `Bateria ${race.order}`

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-20">
      {/* Top back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate('/moderacao/central-de-provas')}
          className="text-xs text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
          Voltar para Central de Provas
        </Button>

        <div className="flex items-center gap-2">
          {isRaceClosed && (
            <Badge className="bg-red-950/80 text-red-300 border border-red-500/40 text-[11px] font-racing uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" /> Corrida Fechada
            </Badge>
          )}
          <span className="text-[11px] font-mono text-gray-400">
            Código Etapa: E{String(stage?.order ?? 1).padStart(2, '0')}-R{race.order}
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#14141F] p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs bg-[#E10600]/15 text-[#E10600] border-[#E10600]/30 font-racing uppercase tracking-wider"
            >
              Comissários de Prova
            </Badge>
            <span className="text-gray-500">•</span>
            <span className="text-xs text-gray-300 font-medium">
              {champ?.name || 'Campeonato'} • Etapa {stage?.order ?? 1}
            </span>
          </div>

          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-7 bg-[#E10600] rounded-sm inline-block shadow-[0_0_12px_rgba(225,6,0,0.5)]"></span>
            Incidentes: {raceDisplayName}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1.5 text-gray-200">
              <MapPin className="w-3.5 h-3.5 text-[#E10600]" />
              {track?.name || 'Pista Oficial'}{' '}
              {stage?.track_layout ? `(${stage.track_layout})` : ''}
            </span>
            <span className="text-gray-600">•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {formattedDate}
            </span>
            <span className="text-gray-600">•</span>
            <span className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {race.duration} {race.duration_type} {race.start_time ? `às ${race.start_time}` : ''}
            </span>
            {race.weather && (
              <>
                <span className="text-gray-600">•</span>
                <span className="flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                  {race.weather}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="z-10 flex flex-wrap items-center gap-2">
          {/* Action button: Novo Incidente */}
          <Button
            type="button"
            disabled={!canEditRace}
            onClick={handleOpenIncidentModal}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-5 py-2.5 shadow-lg shadow-red-950/40 flex items-center gap-2 disabled:opacity-50"
            title={
              !canEditRace
                ? 'Corrida fechada. Apenas administradores podem adicionar incidentes.'
                : 'Adicionar novo incidente'
            }
          >
            <Plus className="w-4 h-4" />
            Adicionar Incidente
          </Button>
        </div>
      </div>

      {/* Closed Warning Callout */}
      {isRaceClosed && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <strong>Corrida fechada.</strong> A janela de edição dos comissários para esta bateria
              está encerrada. Somente o administrador pode reabri-la ou realizar alterações.
            </span>
          </div>
          {isCollaborator && (
            <Badge className="bg-red-500/20 text-red-300 border-none text-[10px] uppercase font-racing">
              Admin Ativo
            </Badge>
          )}
        </div>
      )}

      {/* TABELA DE INCIDENTES DA CORRIDA (Colunas exatas: Ações, Origem, Volta, Notificado por, Carros envolvidos, Culpado, Infração / Penalidade, Status) */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#E10600]" />
            <h2 className="font-racing text-lg font-bold text-white uppercase tracking-wider">
              Incidentes ({moderationCases.length})
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">
            Ações por linha: ✓ Resolver • ⊖ Sem ação • ✏️ Editar • 💬 Mensagens • 🗑 Excluir
          </span>
        </div>

        {moderationCases.length === 0 ? (
          <div className="p-10 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-400 text-xs space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-medium text-white text-sm">
              Nenhum incidente registrado nesta corrida até agora.
            </p>
            <p className="text-gray-500 max-w-md mx-auto">
              Utilize o botão &quot;Adicionar Incidente&quot; acima para registrar infrações de
              pista com autocomplete de pilotos inscritos e artigos do regulamento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#1F1F30]/30">
            <table className="w-full text-left text-xs text-gray-300">
              <thead>
                <tr className="border-b border-white/10 bg-[#14141F] text-[10px] font-racing text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center">Ações</th>
                  <th className="py-3 px-3 text-center">Origem</th>
                  <th className="py-3 px-3 text-center">Volta</th>
                  <th className="py-3 px-3">Notificado por</th>
                  <th className="py-3 px-3">Carros envolvidos</th>
                  <th className="py-3 px-3">Culpado</th>
                  <th className="py-3 px-3">Infração / Penalidade</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {moderationCases.map((c) => {
                  const involvedList =
                    c.expand?.involved_pilots ||
                    allPilots.filter((p) => c.involved_pilots?.includes(p.id))

                  const guiltyPilot =
                    c.expand?.guilty_pilot_id || allPilots.find((p) => p.id === c.guilty_pilot_id)

                  const authorPilot =
                    c.expand?.author_pilot_id || allPilots.find((p) => p.id === c.author_pilot_id)

                  const isProtest = c.opened_by_type === 'protesto_piloto'

                  const notifByText = !isProtest
                    ? 'Comissários'
                    : authorPilot
                      ? getPilotDisplayLabel(authorPilot)
                      : c.expand?.author_user_id?.name || 'Piloto'

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/moderacao/caso/${c.id}`)}
                    >
                      {/* Ações por linha: ✓ (resolver), ⊖ (sem ação), ✏️ (editar), 💬 (thread), 🗑 (excluir) */}
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* ✓ Resolver / Fechar */}
                          <button
                            type="button"
                            disabled={!canEditRace}
                            onClick={() => handleQuickResolveCase(c)}
                            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title="Resolver / Fechar caso (marcar como decidido)"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          {/* ⊖ Negar / Sem ação */}
                          <button
                            type="button"
                            disabled={!canEditRace}
                            onClick={() => handleQuickDismissCase(c)}
                            className="p-1 rounded hover:bg-gray-500/20 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title="Negar / Sem ação necessária (lance de corrida, zera punição)"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* ✏️ Editar */}
                          <button
                            type="button"
                            disabled={!canEditRace}
                            onClick={() => handleEditCase(c)}
                            className="p-1 rounded hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title="Editar dados do incidente"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* 💬 Comentários / Thread */}
                          <button
                            type="button"
                            onClick={() => navigate(`/dashboard/moderacao/caso/${c.id}`)}
                            className="p-1 rounded hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors"
                            title="Abrir thread / comentários do caso"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* 🗑 Excluir / Cancelar */}
                          <button
                            type="button"
                            disabled={!canEditRace}
                            onClick={() => setCancelTargetCaseId(c.id)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            title="Excluir incidente (reverte punição e desconsidera estatísticas)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Coluna Origem: Protesto 🔨 ou Notificação */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isProtest ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#E10600]/15 text-[#ff6b6b] border border-[#E10600]/30 font-racing uppercase tracking-wider">
                            <span>Protesto</span>
                            <span title="Protesto de Piloto">🔨</span>
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-300 font-racing uppercase tracking-wider">
                            Notificação
                          </span>
                        )}
                      </td>

                      {/* Volta */}
                      <td className="py-3.5 px-3 text-center font-racing font-bold text-white text-sm">
                        {c.lap}
                      </td>

                      {/* Notificado por */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1F1F30] border border-white/10 text-gray-200">
                          {notifByText}
                        </span>
                      </td>

                      {/* Carros envolvidos: Badges azuis com formato "#número - Nome" */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1 max-w-[220px]">
                          {involvedList.length === 0 ? (
                            <span className="text-gray-500 text-[11px]">-</span>
                          ) : (
                            involvedList.map((p) => (
                              <span
                                key={p.id}
                                className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0d2137] text-[#90e0ef] border border-[#0077b6]/40 truncate"
                              >
                                {getPilotDisplayLabel(p)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Culpado: Badge vermelha */}
                      <td className="py-3.5 px-3">
                        {guiltyPilot ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e63946]/20 text-[#ff758f] border border-[#e63946]/50">
                            {getPilotDisplayLabel(guiltyPilot)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Sem culpado</span>
                        )}
                      </td>

                      {/* Infração / Penalidade */}
                      <td className="py-3.5 px-3 text-gray-200 font-medium text-xs max-w-xs">
                        <div className="leading-snug">{c.infraction_cited || 'Em julgamento'}</div>
                        {c.penalty_applied && (
                          <div className="text-[10px] text-amber-300 font-mono mt-0.5 font-medium">
                            {c.penalty_applied}
                          </div>
                        )}
                        {c.description && (
                          <div className="text-[10px] text-gray-400 italic mt-0.5 truncate">
                            Obs: {c.description}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border capitalize whitespace-nowrap ${
                            statusColors[c.status] || 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Estatísticas de Incidentes do Simulador (iRacing Log) */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-gray-400" />
            <h2 className="font-racing text-base font-bold text-white uppercase tracking-wider">
              Estatísticas de Incidentes do Simulador (iRacing Log)
            </h2>
          </div>
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            Métricas de telemetria da sessão. Não aplicam punições desportivas automáticas.
          </span>
        </div>

        {raceResults.length === 0 ? (
          <div className="p-6 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-400 text-xs">
            Nenhum resultado importado para esta corrida ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#1F1F30]/30">
            <table className="w-full text-left text-xs text-gray-300">
              <thead>
                <tr className="border-b border-white/10 bg-[#14141F] text-[10px] font-racing text-gray-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center">Pos</th>
                  <th className="py-2.5 px-3">Piloto</th>
                  <th className="py-2.5 px-3">ID iRacing</th>
                  <th className="py-2.5 px-3 text-center">Voltas</th>
                  <th className="py-2.5 px-3 text-center">Incidentes (x)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {raceResults.map((driver) => (
                  <tr key={driver.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 text-center font-racing font-bold text-white">
                      {driver.finish_position}º
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{driver.display_name}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-400 text-[11px]">
                      {driver.cust_id}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {driver.laps_complete ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-200">
                      {driver.incidents ?? 0}x
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-400">
                      {driver.reason_out || 'Completou'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Anotações e Discussão Interna da Comissão */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#E10600]" />
            <h2 className="font-racing text-sm font-bold text-white uppercase tracking-wider">
              Anotações e Discussão Interna da Comissão ({comments.length})
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">Canal exclusivo dos comissários</span>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <div className="p-6 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-500 text-xs">
              Nenhuma anotação registrada ainda.
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-[#1F1F30]/60 border border-white/5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-racing font-bold text-gray-200 uppercase tracking-wide">
                    {c.expand?.user_id?.name || 'Comissário'}
                  </span>
                  <span className="text-gray-500 font-mono">
                    {new Date(c.created).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {c.message}
                </p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendComment} className="space-y-3 pt-3 border-t border-white/10">
          <Textarea
            rows={2}
            placeholder="Escreva uma anotação interna dos comissários..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="text-xs bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600] resize-y"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSending || !newComment.trim()}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-4 py-2"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {isSending ? 'Gravando...' : 'Publicar Nota'}
            </Button>
          </div>
        </form>
      </Card>

      {/* RODAPÉ DA PÁGINA: FECHAR / REABRIR BATERIA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-[#14141F] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-racing text-lg font-bold ${
              isRaceClosed
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}
          >
            {isRaceClosed ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-racing text-sm font-bold text-white uppercase tracking-wider">
              Status da Bateria: {isRaceClosed ? 'Fechada' : 'Aberta para Julgamento'}
            </h3>
            <p className="text-[11px] text-gray-400">
              {isRaceClosed
                ? 'A janela de edição dos comissários foi encerrada. Apenas administrador pode reabrir.'
                : 'Comissários podem registrar e editar incidentes até o fechamento ou início da próxima etapa.'}
            </p>
          </div>
        </div>

        <div>
          {isRaceClosed ? (
            <Button
              type="button"
              disabled={!isCollaborator}
              onClick={() => {
                setRaceLockAction('reopen')
                setIsRaceLockConfirmOpen(true)
              }}
              className="bg-[#0f4c81] hover:bg-[#1a5f9e] text-white text-xs font-racing uppercase tracking-wider px-5 py-2.5 flex items-center gap-2 disabled:opacity-40 shadow-lg"
              title={
                !isCollaborator
                  ? 'Apenas administradores podem reabrir uma bateria'
                  : 'Reabrir bateria para edição'
              }
            >
              <RotateCcw className="w-4 h-4" />
              Reabrir {raceDisplayName.toUpperCase()}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                setRaceLockAction('close')
                setIsRaceLockConfirmOpen(true)
              }}
              className="bg-[#2B2D42] hover:bg-[#3D405B] text-white text-xs font-racing uppercase tracking-wider px-5 py-2.5 flex items-center gap-2 border border-white/10 shadow-lg"
            >
              <Lock className="w-4 h-4 text-red-400" />
              Fechar {raceDisplayName.toUpperCase()}
            </Button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: ADICIONAR / EDITAR INCIDENTE
          - VOLTA: texto livre
          - NOTIFICADO POR: comissários (ou piloto original ao editar)
          - PILOTOS ENVOLVIDOS: autocomplete inteligente + chips "#num - Nome (id)"
          - CULPADO: dropdown simples ("Sem culpado" + nomes selecionados)
          - INFRAÇÃO: autocomplete conforme regulamento
          - OBSERVAÇÕES: campo com contador "Max.: 0 / 120"
          - BOTÕES: CANCELAR e ADICIONAR (ou SALVAR ALTERAÇÕES)
         ========================================================================= */}
      <Dialog open={isCaseModalOpen} onOpenChange={setIsCaseModalOpen}>
        <DialogContent className="max-w-2xl bg-[#161622] border border-white/15 text-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Gavel className="w-5 h-5 text-[#E10600]" />
              {editingCaseId ? 'Editar Incidente' : 'Adicionar Incidente'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 1. Volta (texto livre) */}
            <div className="space-y-1.5">
              <Label htmlFor="lap-field" className="text-xs font-semibold text-gray-200">
                Volta
              </Label>
              <Input
                id="lap-field"
                type="text"
                value={caseLap}
                onChange={(e) => setCaseLap(e.target.value)}
                placeholder="Ex: 1, 14, Curva 1"
                className="bg-[#1F1F30] border-white/10 text-white text-xs h-10 font-medium focus-visible:ring-[#E10600]"
                required
              />
            </div>

            {/* 2. Pilotos Envolvidos: chips com formato "#número - Nome" + Autocomplete */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200">
                  Piloto(s) envolvido(s) ({selectedPilots.length} selecionado(s))
                </Label>
                <span className="text-[11px] text-gray-400">Filtra inscritos no campeonato</span>
              </div>

              {/* Chips removíveis com formato exato: "#número - Nome" */}
              {selectedPilots.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-[#14141F] border border-white/10">
                  {selectedPilots.map((p) => (
                    <span
                      key={p.id}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-[#0d2137] text-[#90e0ef] border border-[#0077b6]/40 flex items-center gap-1.5"
                    >
                      <span>{getPilotDisplayLabel(p)}</span>
                      {p.iracing_id && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          ({p.iracing_id})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePilot(p.id)}
                        className="ml-1 hover:text-red-400 p-0.5 rounded-full"
                        title="Remover piloto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input for Autocomplete */}
              <div className="relative">
                <Input
                  ref={pilotInputRef}
                  type="text"
                  placeholder="Digite nome, número ou equipe do piloto..."
                  value={pilotSearchQuery}
                  onChange={(e) => {
                    setPilotSearchQuery(e.target.value)
                    setIsPilotDropdownOpen(true)
                  }}
                  onFocus={() => setIsPilotDropdownOpen(true)}
                  className="bg-[#1F1F30] border-white/10 text-white text-xs h-10 pl-9 focus-visible:ring-[#E10600]"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                {pilotSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setPilotSearchQuery('')
                      setIsPilotDropdownOpen(false)
                    }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown list */}
              {isPilotDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[#1B1B2A] border border-white/15 shadow-2xl divide-y divide-white/5">
                  {filteredPilots.length === 0 ? (
                    <div className="p-3 text-center text-gray-400 text-xs">
                      Nenhum piloto inscrito encontrado com esse termo.
                    </div>
                  ) : (
                    filteredPilots.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleAddPilot(p)}
                        className="p-2.5 px-3 hover:bg-white/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-racing font-bold text-white text-sm">
                            #{p.number ?? '•'}
                          </span>
                          <span className="font-semibold text-gray-200">{p.name}</span>
                          {p.team && <span className="text-[11px] text-gray-400">({p.team})</span>}
                          {p.iracing_id && (
                            <span className="text-[10px] text-gray-500 font-mono">
                              ID: {p.iracing_id}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-[#90e0ef] bg-[#0d2137] px-2 py-0.5 rounded">
                          Adicionar
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 3. Culpado: dropdown "Sem culpado" + apenas pilotos selecionados */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-200">Culpado</Label>
              <Select value={guiltyPilotId} onValueChange={setGuiltyPilotId}>
                <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-10">
                  <SelectValue placeholder="Selecione o culpado" />
                </SelectTrigger>
                <SelectContent className="bg-[#1B1B2A] border-white/15 text-white">
                  <SelectItem value="SEM_CULPADO">
                    <span className="font-semibold text-gray-300">Sem culpado</span>
                  </SelectItem>
                  {selectedPilots.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {getPilotDisplayLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Infração: autocomplete do regulamento */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200">Infração</Label>
                <span className="text-[11px] text-gray-400">Itens oficiais do regulamento</span>
              </div>

              <div className="relative">
                <Input
                  ref={infractionInputRef}
                  type="text"
                  placeholder="Selecione ou digite o artigo da infração..."
                  value={infractionQuery}
                  onChange={(e) => {
                    setInfractionQuery(e.target.value)
                    setIsInfractionDropdownOpen(true)
                  }}
                  onFocus={() => setIsInfractionDropdownOpen(true)}
                  className="bg-[#1F1F30] border-white/10 text-white text-xs h-10 pl-9 focus-visible:ring-[#E10600]"
                />
                <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                {infractionQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setInfractionQuery('')
                      setIsInfractionDropdownOpen(false)
                    }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isInfractionDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[#1B1B2A] border border-white/15 shadow-2xl divide-y divide-white/5">
                  {filteredInfractions.length === 0 ? (
                    <div className="p-3 text-center text-gray-400 text-xs">
                      Nenhum item do regulamento encontrado.
                    </div>
                  ) : (
                    filteredInfractions.map((rule, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setInfractionQuery(rule)
                          setIsInfractionDropdownOpen(false)
                        }}
                        className="p-2.5 px-3 hover:bg-white/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="text-gray-200 font-medium">{rule}</span>
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                      </div>
                    ))
                  )}
                </div>
              )}

              {infractionQuery && (
                <div className="p-2.5 rounded-lg bg-[#0d2137]/80 border border-[#0077b6]/30 flex items-center justify-between text-xs">
                  <span className="text-gray-300">Punição prevista:</span>
                  <span className="font-bold text-[#90e0ef] font-mono">
                    {parsedPenalty.displayText}
                  </span>
                </div>
              )}
            </div>

            {/* 5. Observações com contador: "Max.: 0 / 120" */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="obs-field" className="text-xs font-semibold text-gray-200">
                  Observações
                </Label>
                <span
                  className={`text-[11px] font-mono ${
                    caseDescription.length > 115 ? 'text-amber-400' : 'text-gray-400'
                  }`}
                >
                  Max.: {caseDescription.length} / 120
                </span>
              </div>
              <Textarea
                id="obs-field"
                rows={2}
                maxLength={120}
                placeholder="Observações adicionais dos comissários..."
                value={caseDescription}
                onChange={(e) => setCaseDescription(e.target.value.slice(0, 120))}
                className="bg-[#1F1F30] border-white/10 text-white text-xs resize-y focus-visible:ring-[#E10600]"
              />
            </div>
          </div>

          {/* Botões do rodapé: CANCELAR e ADICIONAR (ou Pós Corrida / Aplicar) */}
          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCaseModalOpen(false)}
              className="text-xs bg-transparent border-white/20 text-gray-300 hover:bg-white/5 order-3 sm:order-1"
            >
              CANCELAR
            </Button>

            <div className="flex flex-wrap items-center gap-2 justify-end order-1 sm:order-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingCase}
                onClick={() => handleSaveDecision('POS_CORRIDA')}
                className="text-xs bg-[#1F1F30] border-amber-500/40 text-amber-300 hover:bg-amber-500/20 font-racing uppercase tracking-wider h-9"
              >
                Pós Corrida
              </Button>

              <Button
                type="button"
                disabled={isSavingCase}
                onClick={() => handleSaveDecision('APLICAR')}
                className="text-xs bg-[#E10600] hover:bg-[#C00500] text-white font-racing uppercase tracking-wider px-5 h-9 shadow-lg shadow-red-950/40"
              >
                {isSavingCase ? 'Salvando...' : editingCaseId ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR *'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO / CANCELAMENTO DE INCIDENTE */}
      <Dialog open={Boolean(cancelTargetCaseId)} onOpenChange={() => setCancelTargetCaseId(null)}>
        <DialogContent className="max-w-md bg-[#161622] border border-white/15 text-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-base font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Confirmar Exclusão do Incidente
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-300 leading-relaxed py-2">
            Tem certeza que deseja excluir/cancelar este incidente? Caso excluído, ele não contará
            para estatísticas e reverterá qualquer punição aplicada na classificação de pilotos e
            equipes.
          </p>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingCase}
              onClick={() => setCancelTargetCaseId(null)}
              className="text-xs bg-transparent border-white/15 text-gray-300"
            >
              Voltar
            </Button>
            <Button
              type="button"
              disabled={isDeletingCase}
              onClick={handleConfirmCancelCase}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-racing uppercase tracking-wider px-4"
            >
              {isDeletingCase ? 'Excluindo...' : 'Sim, Excluir Incidente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE FECHAMENTO / REABERTURA DA BATERIA */}
      <Dialog open={isRaceLockConfirmOpen} onOpenChange={setIsRaceLockConfirmOpen}>
        <DialogContent className="max-w-md bg-[#161622] border border-white/15 text-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-base font-bold uppercase tracking-wider flex items-center gap-2 text-white">
              {raceLockAction === 'close' ? (
                <>
                  <Lock className="w-5 h-5 text-amber-400" /> Fechar Bateria
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5 text-emerald-400" /> Reabrir Bateria
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-300 leading-relaxed py-2">
            {raceLockAction === 'close'
              ? `Deseja realmente fechar a ${raceDisplayName}? Isso encerra a janela de edição dos comissários. Apenas administradores poderão reabrir ou alterar registros posteriormente.`
              : `Deseja reabrir a ${raceDisplayName}? A janela de edição será novamente liberada para a equipe de moderação.`}
          </p>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRaceLockConfirmOpen(false)}
              className="text-xs bg-transparent border-white/15 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isTogglingRaceLock}
              onClick={handleToggleRaceLock}
              className={`text-xs font-racing uppercase tracking-wider px-4 ${
                raceLockAction === 'close'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isTogglingRaceLock
                ? 'Processando...'
                : raceLockAction === 'close'
                  ? `Sim, Fechar ${raceDisplayName.toUpperCase()}`
                  : `Sim, Reabrir ${raceDisplayName.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
