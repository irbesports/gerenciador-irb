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

  // Incident Modal State
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false)
  const [caseLap, setCaseLap] = useState<string>('1') // free text
  const [selectedPilots, setSelectedPilots] = useState<IncidentPilotOption[]>([])
  const [pilotSearchQuery, setPilotSearchQuery] = useState('')
  const [isPilotDropdownOpen, setIsPilotDropdownOpen] = useState(false)
  const [guiltyPilotId, setGuiltyPilotId] = useState<string>('SEM_CULPADO')
  const [infractionQuery, setInfractionQuery] = useState('')
  const [isInfractionDropdownOpen, setIsInfractionDropdownOpen] = useState(false)
  const [caseDescription, setCaseDescription] = useState('')
  const [isSavingCase, setIsSavingCase] = useState(false)

  // Confirm cancel dialog
  const [cancelTargetCaseId, setCancelTargetCaseId] = useState<string | null>(null)

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

  // Filter pilots by autocomplete, case-insensitive e IGNORANDO ACENTOS (ex.: "jos" acha "José")
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

  // 2. Regulamento: lista de infrações passíveis de punição (1 por linha)
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

    // Fallbacks from migration if championship has empty rules
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
   * Action c) CANCELAR: zera/descarta o registro por completo com confirmação
   */
  const handleSaveDecision = async (decisionType: 'APLICAR' | 'POS_CORRIDA') => {
    if (!raceId || !champ?.id) return

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

      // Sequencial anti-duplicidade por corrida
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

      const targetStatus: ModerationCaseStatus =
        decisionType === 'APLICAR' ? 'Aplicado em corrida' : 'Aplicado pós corrida'

      const isGuilty = guiltyPilotId !== 'SEM_CULPADO'
      const actualGuiltyPilot = isGuilty ? selectedPilots.find((p) => p.id === guiltyPilotId) : null

      // Resolve guilty pilot ID (must be a valid record in pilots collection if possible)
      let resolvedGuiltyPilotRecordId: string | undefined = undefined
      if (actualGuiltyPilot) {
        resolvedGuiltyPilotRecordId = actualGuiltyPilot.pilotRecordId || actualGuiltyPilot.id
      }

      // Involved pilot record IDs
      const involvedRecordIds = selectedPilots.map((p) => p.pilotRecordId || p.id).filter(Boolean)

      // Auto penalty from infraction item
      const penalty = parsePenaltyFromInfraction(infractionQuery)
      const penaltyText =
        decisionType === 'APLICAR'
          ? penalty.displayText
          : 'Em análise comissária para julgamento pós-corrida'

      // Deadline: 24h from now for defense/version
      const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      // 1. Create moderation case
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
        description: caseDescription.trim(),
        deadline: deadlineDate,
        cancelled: false,
      })

      // 2. Increment race case counter
      try {
        await stageRacesService.update(raceId, {
          case_counter: currentCounter,
        })
      } catch (err) {
        console.error('Error updating race case counter:', err)
      }

      // 3. Send notifications to ALL involved pilots (24h defense, direct case link)
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

  // Cancel action: zero/discard record completely
  const handleConfirmCancelCase = async () => {
    if (!cancelTargetCaseId) return
    try {
      await moderationCasesService.update(cancelTargetCaseId, {
        cancelled: true,
        status: 'Nenhuma ação necessária',
        penalty_applied: 'Incidente cancelado/zerado pelos comissários',
        penalty_points: 0,
        penalty_seconds: 0,
        penalty_positions: 0,
      })

      toast({
        title: 'Incidente cancelado',
        description: 'O registro foi descartado e seus efeitos anulados com sucesso.',
      })
      setCancelTargetCaseId(null)
      const updatedList = await moderationCasesService.listByRace(raceId!, false)
      setModerationCases(updatedList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao cancelar',
        description: 'Não foi possível cancelar o registro.',
        variant: 'destructive',
      })
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
          onClick={() => navigate('/moderacao/central-de-provas')}
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-16">
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

        <span className="text-[11px] font-mono text-gray-400">
          Código Etapa: E{String(stage?.order ?? 1).padStart(2, '0')}-R{race.order}
        </span>
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
            Incidentes: {race.name || `Corrida ${race.order}`}
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
          <Button
            type="button"
            onClick={handleOpenIncidentModal}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-5 py-2.5 shadow-lg shadow-red-950/40 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Incidente
          </Button>
        </div>
      </div>

      {/* TABELA DE INCIDENTES DA CORRIDA (Colunas exatas: Volta, Notificado por, Carros envolvidos, Culpado, Infração / Penalidade, Status, Ações) */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#E10600]" />
            <h2 className="font-racing text-lg font-bold text-white uppercase tracking-wider">
              Tabela de Incidentes ({moderationCases.length})
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">
            Julgamento de pista oficial com notificações automáticas e prazo de 24h
          </span>
        </div>

        {moderationCases.length === 0 ? (
          <div className="p-10 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-400 text-xs space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-medium text-white text-sm">
              Nenhum incidente registrado nesta corrida até agora.
            </p>
            <p className="text-gray-500 max-w-md mx-auto">
              Utilize o botão &quot;Novo Incidente&quot; acima para registrar infrações de pista com
              autocomplete de pilotos e artigos de regulamento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#1F1F30]/30">
            <table className="w-full text-left text-xs text-gray-300">
              <thead>
                <tr className="border-b border-white/10 bg-[#14141F] text-[10px] font-racing text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center">Volta</th>
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Notificado por</th>
                  <th className="py-3 px-3">Carros envolvidos</th>
                  <th className="py-3 px-3">Culpado</th>
                  <th className="py-3 px-3">Infração / Penalidade</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
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

                  const notifByText =
                    c.opened_by_type === 'comissarios'
                      ? 'Comissários de Prova'
                      : authorPilot
                        ? `#${authorPilot.number ?? ''} - ${authorPilot.name}`
                        : c.expand?.author_user_id?.name || 'Piloto'

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/moderacao/caso/${c.id}`)}
                    >
                      <td className="py-3.5 px-3 text-center font-racing font-bold text-white text-sm">
                        {c.lap}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px] text-[#90e0ef]">
                        {c.code || `CASO-#${c.id.slice(0, 6)}`}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-200">
                          {notifByText}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {involvedList.length === 0 ? (
                            <span className="text-gray-500 text-[11px]">-</span>
                          ) : (
                            involvedList.map((p) => (
                              <span
                                key={p.id}
                                className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0d2137] text-[#90e0ef] border border-[#0077b6]/30 truncate"
                              >
                                #{p.number ?? '•'} - {p.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {guiltyPilot ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e63946]/20 text-[#ff758f] border border-[#e63946]/50">
                            #{guiltyPilot.number ?? '•'} - {guiltyPilot.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Sem Culpado</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-gray-200 font-medium text-xs max-w-xs">
                        <div className="leading-snug">{c.infraction_cited || 'Em julgamento'}</div>
                        {c.penalty_applied && (
                          <div className="text-[10px] text-amber-300 font-mono mt-0.5 font-medium">
                            {c.penalty_applied}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border capitalize whitespace-nowrap ${
                            statusColors[c.status] || 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/moderacao/caso/${c.id}`)}
                            className="text-gray-300 hover:text-white h-7 px-2 text-xs"
                            title="Ver detalhes do caso"
                          >
                            Ver Caso <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Button>

                          {isCollaborator && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCancelTargetCaseId(c.id)}
                              className="text-gray-500 hover:text-red-400 h-7 w-7 p-0"
                              title="Cancelar incidente (Ação C)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
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

      {/* =========================================================================
          MODAL: NOVO INCIDENTE (CAMPOS EXATOS DO RELATO DO USUÁRIO)
          - VOLTA: caixa de texto livre
          - PILOTOS ENVOLVIDOS: autocomplete sobre lista de inscritos, sem acento / case-insensitive, multi-seleção
          - CULPADO: dropdown simples com APENAS os nomes inseridos em Pilotos envolvidos, + "Sem Culpado"
          - INFRAÇÃO: autocomplete que reflete EXATAMENTE cada item do regulamento (sem acentos)
          - DESCRIÇÃO: breve descrição
          - DECISÃO FINAL: 3 ações (a) APLICAR, (b) PÓS CORRIDA, (c) CANCELAR
         ========================================================================= */}
      <Dialog open={isCaseModalOpen} onOpenChange={setIsCaseModalOpen}>
        <DialogContent className="max-w-2xl bg-[#161622] border border-white/15 text-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <Gavel className="w-5 h-5 text-[#E10600]" />
              Abertura de Incidente da Corrida
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2 text-xs">
            {/* 1. CAMPO VOLTA: Caixa de texto livre */}
            <div className="space-y-1.5">
              <Label htmlFor="lap-field" className="text-xs font-semibold text-gray-200">
                Volta do Incidente (Texto Livre)
              </Label>
              <Input
                id="lap-field"
                type="text"
                value={caseLap}
                onChange={(e) => setCaseLap(e.target.value)}
                placeholder="Ex: Volta 14, Curva do Lago, Reta principal"
                className="bg-[#1F1F30] border-white/10 text-white text-xs h-10 font-medium focus-visible:ring-[#E10600]"
                required
              />
            </div>

            {/* 2. CAMPO PILOTOS ENVOLVIDOS: Autocomplete multi-seleção sobre inscritos */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200">
                  Pilotos Envolvidos ({selectedPilots.length} selecionado(s))
                </Label>
                <span className="text-[11px] text-gray-400">
                  Busca em tempo real ignorando acentos (ex: &quot;jos&quot; acha &quot;José&quot;)
                </span>
              </div>

              {/* Chips of selected pilots */}
              {selectedPilots.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-[#14141F] border border-white/10">
                  {selectedPilots.map((p) => (
                    <span
                      key={p.id}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-[#0d2137] text-[#90e0ef] border border-[#0077b6]/40 flex items-center gap-1.5"
                    >
                      <span>#{p.number ?? '•'}</span>
                      <span>{p.name}</span>
                      {p.team && (
                        <span className="text-[10px] text-gray-400 font-normal">({p.team})</span>
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
                  placeholder="Digite o nome, número ou equipe do piloto para buscar..."
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

            {/* 3. CAMPO CULPADO: Dropdown simples APENAS com nomes já inseridos em Envolvidos + Sem Culpado */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-200">
                Culpado / Responsável pelo Incidente
              </Label>
              <Select value={guiltyPilotId} onValueChange={setGuiltyPilotId}>
                <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-10">
                  <SelectValue placeholder="Selecione o culpado" />
                </SelectTrigger>
                <SelectContent className="bg-[#1B1B2A] border-white/15 text-white">
                  <SelectItem value="SEM_CULPADO">
                    <span className="font-semibold text-gray-300">
                      Sem Culpado (Lance de Corrida)
                    </span>
                  </SelectItem>
                  {selectedPilots.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.number ?? '•'} - {p.name} {p.team ? `(${p.team})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPilots.length === 0 && (
                <span className="text-[11px] text-gray-400 italic block">
                  Adicione pilotos no campo acima para habilitar atribuição de culpa.
                </span>
              )}
            </div>

            {/* 4. CAMPO INFRAÇÃO: Autocomplete que reflete EXATAMENTE o regulamento do campeonato */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200">
                  Infração / Item do Regulamento
                </Label>
                <span className="text-[11px] text-gray-400">
                  Filtro por texto e artigos oficiais cadastrados
                </span>
              </div>

              <div className="relative">
                <Input
                  ref={infractionInputRef}
                  type="text"
                  placeholder="Digite para autocompletar conforme o regulamento..."
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

              {/* Dropdown list for Infractions */}
              {isInfractionDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[#1B1B2A] border border-white/15 shadow-2xl divide-y divide-white/5">
                  {filteredInfractions.length === 0 ? (
                    <div className="p-3 text-center text-gray-400 text-xs">
                      Nenhum item do regulamento corresponde à busca.
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

              {/* Automatic penalty preview badge */}
              {infractionQuery && (
                <div className="p-2.5 rounded-lg bg-[#0d2137]/80 border border-[#0077b6]/30 flex items-center justify-between text-xs">
                  <span className="text-gray-300">Punição prevista no item:</span>
                  <span className="font-bold text-[#90e0ef] font-mono">
                    {parsedPenalty.displayText}
                  </span>
                </div>
              )}
            </div>

            {/* 5. CAMPO DESCRIÇÃO: Breve descrição da análise */}
            <div className="space-y-1.5">
              <Label htmlFor="desc-field" className="text-xs font-semibold text-gray-200">
                Descrição da Análise Comissária
              </Label>
              <Textarea
                id="desc-field"
                rows={3}
                placeholder="Breve descrição dos fatos apurados em pista ou vídeo..."
                value={caseDescription}
                onChange={(e) => setCaseDescription(e.target.value)}
                className="bg-[#1F1F30] border-white/10 text-white text-xs resize-y focus-visible:ring-[#E10600]"
              />
            </div>

            {/* Notification reminder */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <Clock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Cada piloto citado receberá notificação no sino do app com dados da etapa, pista e
                volta, tendo prazo de 24 horas para defesa.
              </span>
            </div>
          </div>

          {/* 6. DECISÃO FINAL: 3 Ações Exatas
              a) APLICAR: aplica punição automática
              b) PÓS CORRIDA: marca para análise pós-etapa
              c) CANCELAR: zera/descarta
          */}
          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCaseModalOpen(false)}
              className="text-xs bg-transparent border-white/20 text-gray-300 hover:bg-white/5 order-3 sm:order-1"
            >
              Fechar
            </Button>

            <div className="flex flex-wrap items-center gap-2 justify-end order-1 sm:order-2">
              {/* Action b) PÓS CORRIDA */}
              <Button
                type="button"
                variant="outline"
                disabled={isSavingCase}
                onClick={() => handleSaveDecision('POS_CORRIDA')}
                className="text-xs bg-[#1F1F30] border-amber-500/40 text-amber-300 hover:bg-amber-500/20 font-racing uppercase tracking-wider h-9"
              >
                Pós Corrida
              </Button>

              {/* Action a) APLICAR */}
              <Button
                type="button"
                disabled={isSavingCase}
                onClick={() => handleSaveDecision('APLICAR')}
                className="text-xs bg-[#E10600] hover:bg-[#C00500] text-white font-racing uppercase tracking-wider px-5 h-9 shadow-lg shadow-red-950/40"
              >
                {isSavingCase ? 'Gravando...' : 'Aplicar Punição'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE CANCELAMENTO / AÇÃO C: CANCELAR */}
      <Dialog open={Boolean(cancelTargetCaseId)} onOpenChange={() => setCancelTargetCaseId(null)}>
        <DialogContent className="max-w-md bg-[#161622] border border-white/15 text-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-base font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Confirmar Cancelamento do Incidente
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-300 leading-relaxed py-2">
            Tem certeza que deseja cancelar e descartar este incidente por completo? Essa ação zera
            o caso no sistema e remove quaisquer penalidades previamente vinculadas.
          </p>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelTargetCaseId(null)}
              className="text-xs bg-transparent border-white/15 text-gray-300"
            >
              Manter Incidente
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCancelCase}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-racing uppercase tracking-wider px-4"
            >
              Sim, Cancelar Incidente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
