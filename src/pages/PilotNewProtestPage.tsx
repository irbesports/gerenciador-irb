import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Gavel,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  AlertTriangle,
  Search,
  X,
  FileText,
  Check,
  Send,
  Info,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Scale,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  championshipsService,
  championshipStagesService,
  stageRacesService,
  championshipPilotsService,
  pilotsService,
  moderationCasesService,
  notificationsService,
} from '@/services/api'
import type { Championship, ChampionshipStage, StageRace, ChampionshipPilot, Pilot } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  generateModerationCode,
  parsePenaltyFromInfraction,
} from '@/lib/moderationUtils'

interface PilotOption {
  id: string
  name: string
  number?: number
  team?: string
  iracing_id?: string
  pilotRecordId?: string
}

export default function PilotNewProtestPage() {
  const { user, isCollaborator } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const preselectedChampId = searchParams.get('championship') || ''
  const preselectedRaceId = searchParams.get('race') || ''

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Current logged in user's pilot
  const [myPilot, setMyPilot] = useState<Pilot | null>(null)
  const [allPilots, setAllPilots] = useState<Pilot[]>([])

  // User's enrolled championships
  const [availableChampionships, setAvailableChampionships] = useState<Championship[]>([])
  const [selectedChampId, setSelectedChampId] = useState<string>(preselectedChampId)

  // Stages & races for selected championship
  const [stages, setStages] = useState<ChampionshipStage[]>([])
  const [selectedStageId, setSelectedStageId] = useState<string>('')
  const [races, setRaces] = useState<StageRace[]>([])
  const [selectedRaceId, setSelectedRaceId] = useState<string>(preselectedRaceId)

  // Championship participants
  const [champPilots, setChampPilots] = useState<ChampionshipPilot[]>([])

  // Form Fields
  const [caseLap, setCaseLap] = useState('')
  const [selectedPilots, setSelectedPilots] = useState<PilotOption[]>([])
  const [pilotSearchQuery, setPilotSearchQuery] = useState('')
  const [isPilotDropdownOpen, setIsPilotDropdownOpen] = useState(false)
  const [infractionQuery, setInfractionQuery] = useState('')
  const [isInfractionDropdownOpen, setIsInfractionDropdownOpen] = useState(false)
  const [description, setDescription] = useState('')

  const pilotInputRef = useRef<HTMLInputElement>(null)
  const infractionInputRef = useRef<HTMLInputElement>(null)

  // 1. Initial Load: user pilot and all championships
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true)
        const [pList, allChamps] = await Promise.all([
          pilotsService.list(),
          championshipsService.list(),
        ])
        setAllPilots(pList)

        let userPilotRecord: Pilot | null = null
        if (user?.id) {
          userPilotRecord = pList.find((p) => p.user_id === user.id) || null
          setMyPilot(userPilotRecord)
        }

        // If collaborator/admin, they can protest on any championship for testing;
        // If client pilot, check which championships they are enrolled in via championship_pilots
        let filteredChamps = allChamps
        if (!isCollaborator && userPilotRecord) {
          const userChamps: Championship[] = []
          for (const ch of allChamps) {
            try {
              const cpList = await championshipPilotsService.listByChampionship(ch.id)
              const isEnrolled = cpList.some(
                (cp) =>
                  cp.pilot === userPilotRecord?.id ||
                  (userPilotRecord?.iracing_id && cp.iracing_id === userPilotRecord.iracing_id),
              )
              if (isEnrolled) {
                userChamps.push(ch)
              }
            } catch {
              /* ignore */
            }
          }
          filteredChamps = userChamps.length > 0 ? userChamps : allChamps
        }

        setAvailableChampionships(filteredChamps)

        if (preselectedChampId && filteredChamps.some((c) => c.id === preselectedChampId)) {
          setSelectedChampId(preselectedChampId)
        } else if (filteredChamps.length > 0 && !selectedChampId) {
          setSelectedChampId(filteredChamps[0].id)
        }
      } catch (err) {
        console.error(err)
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar os campeonatos disponíveis.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [user, isCollaborator])

  // 2. When selectedChampId changes, load stages and champPilots
  useEffect(() => {
    if (!selectedChampId) return
    const loadChampStages = async () => {
      try {
        const [stList, cpList] = await Promise.all([
          championshipStagesService.listByChampionship(selectedChampId),
          championshipPilotsService.listByChampionship(selectedChampId),
        ])
        setStages(stList)
        setChampPilots(cpList)

        if (stList.length > 0) {
          // If preselected race was provided, find its stage
          let targetStage = stList[0]
          if (preselectedRaceId) {
            // Find which stage owns this race
            for (const st of stList) {
              const rList = await stageRacesService.listByStage(st.id)
              if (rList.some((r) => r.id === preselectedRaceId)) {
                targetStage = st
                setRaces(rList)
                setSelectedRaceId(preselectedRaceId)
                break
              }
            }
          }
          setSelectedStageId(targetStage.id)
        } else {
          setSelectedStageId('')
          setRaces([])
          setSelectedRaceId('')
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadChampStages()
  }, [selectedChampId])

  // 3. When selectedStageId changes, load races
  useEffect(() => {
    if (!selectedStageId) {
      setRaces([])
      setSelectedRaceId('')
      return
    }
    const loadRaces = async () => {
      try {
        const rList = await stageRacesService.listByStage(selectedStageId)
        setRaces(rList)
        if (rList.length > 0) {
          if (!selectedRaceId || !rList.some((r) => r.id === selectedRaceId)) {
            setSelectedRaceId(rList[0].id)
          }
        } else {
          setSelectedRaceId('')
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadRaces()
  }, [selectedStageId])

  const selectedChampionship = useMemo(
    () => availableChampionships.find((c) => c.id === selectedChampId),
    [availableChampionships, selectedChampId],
  )

  const selectedStage = useMemo(
    () => stages.find((s) => s.id === selectedStageId),
    [stages, selectedStageId],
  )

  const selectedRace = useMemo(
    () => races.find((r) => r.id === selectedRaceId),
    [races, selectedRaceId],
  )

  const isRaceClosed = Boolean(selectedRace?.is_closed)

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

  // Participants available to protest (excluding current user's pilot)
  const candidatePilots: PilotOption[] = useMemo(() => {
    const list: PilotOption[] = []
    const seen = new Set<string>()

    const myPilotId = myPilot?.id

    for (const cp of champPilots) {
      const pid = cp.pilot || cp.id
      // Cannot protest himself
      if (myPilotId && (cp.pilot === myPilotId || cp.id === myPilotId)) {
        continue
      }
      const name = cp.name || cp.expand?.pilot?.name || 'Piloto'
      const key = `${name.toLowerCase()}_${cp.number ?? ''}`
      if (!seen.has(key)) {
        seen.add(key)
        list.push({
          id: pid,
          name,
          number: cp.number ?? cp.expand?.pilot?.number,
          team: cp.team || cp.expand?.pilot?.team_name,
          iracing_id: cp.iracing_id,
          pilotRecordId: cp.pilot,
        })
      }
    }

    if (list.length === 0) {
      for (const p of allPilots) {
        if (myPilotId && p.id === myPilotId) continue
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
  }, [champPilots, allPilots, myPilot])

  // Filter candidates with autocomplete (case-insensitive & accent-insensitive)
  const filteredPilots = useMemo(() => {
    const q = normalizeSearch(pilotSearchQuery)
    const selectedIds = new Set(selectedPilots.map((p) => p.id))
    return candidatePilots
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
  }, [candidatePilots, selectedPilots, pilotSearchQuery])

  // Regulation infractions autocomplete
  const regulationInfractions: string[] = useMemo(() => {
    const list: string[] = []
    if (
      selectedChampionship?.regulation_rules &&
      Array.isArray(selectedChampionship.regulation_rules)
    ) {
      for (const item of selectedChampionship.regulation_rules) {
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
  }, [selectedChampionship])

  const filteredInfractions = useMemo(() => {
    const q = normalizeSearch(infractionQuery)
    if (!q) return regulationInfractions
    return regulationInfractions.filter((item) => normalizeSearch(item).includes(q))
  }, [regulationInfractions, infractionQuery])

  const parsedPenalty = useMemo(() => {
    return parsePenaltyFromInfraction(infractionQuery)
  }, [infractionQuery])

  const handleAddPilot = (pilot: PilotOption) => {
    if (!selectedPilots.some((p) => p.id === pilot.id)) {
      setSelectedPilots([...selectedPilots, pilot])
    }
    setPilotSearchQuery('')
    setIsPilotDropdownOpen(false)
  }

  const handleRemovePilot = (pilotId: string) => {
    setSelectedPilots(selectedPilots.filter((p) => p.id !== pilotId))
  }

  const handleSubmitProtest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedChampId || !selectedRaceId) {
      toast({
        title: 'Seleção incompleta',
        description: 'Selecione o campeonato, etapa e corrida do incidente.',
        variant: 'destructive',
      })
      return
    }

    if (isRaceClosed) {
      toast({
        title: 'Corrida Fechada',
        description: 'A janela de protestos para esta corrida já foi encerrada.',
        variant: 'destructive',
      })
      return
    }

    if (!caseLap.trim()) {
      toast({
        title: 'Volta obrigatória',
        description: 'Informe a volta aproximada ou trecho da ocorrência.',
        variant: 'destructive',
      })
      return
    }

    if (selectedPilots.length === 0) {
      toast({
        title: 'Piloto envolvido obrigatório',
        description: 'Selecione contra qual piloto você está abrindo o protesto.',
        variant: 'destructive',
      })
      return
    }

    if (!infractionQuery.trim()) {
      toast({
        title: 'Infração obrigatória',
        description: 'Selecione o artigo do regulamento aplicável ao incidente.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Anti-duplicate sequential code
      const currentCounter = (selectedRace?.case_counter || 0) + 1
      const generatedCode = generateModerationCode({
        year:
          selectedChampionship?.expand?.season_id?.expand?.year_id?.year ||
          new Date().getFullYear(),
        seasonName: selectedChampionship?.expand?.season_id?.name,
        championshipName: selectedChampionship?.name,
        championshipShortCode: selectedChampionship?.short_code,
        stageOrder: selectedStage?.order ?? 1,
        raceOrder: selectedRace?.order ?? 1,
        caseSequence: currentCounter,
      })

      // Include both the author pilot (if exists) and the accused pilots in involved_pilots list
      const involvedRecordIds = selectedPilots.map((p) => p.pilotRecordId || p.id).filter(Boolean)

      if (myPilot?.id && !involvedRecordIds.includes(myPilot.id)) {
        involvedRecordIds.unshift(myPilot.id)
      }

      const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const authorPilotName = myPilot ? getPilotDisplayLabel(myPilot) : user?.name || 'Piloto'

      // 1. Create moderation_cases with opened_by_type='protesto_piloto' and status='Em análise'
      const createdCase = await moderationCasesService.create({
        stage_race_id: selectedRaceId,
        championship_id: selectedChampId,
        code: generatedCode,
        case_number: currentCounter,
        lap: caseLap.trim(),
        involved_pilots: involvedRecordIds,
        guilty_pilot_id: undefined, // Up to stewards to judge
        opened_by_type: 'protesto_piloto',
        author_user_id: user?.id,
        author_pilot_id: myPilot?.id || undefined,
        status: 'Em análise',
        infraction_cited: infractionQuery.trim(),
        penalty_applied: 'Aguardando julgamento dos comissários',
        penalty_points: 0,
        penalty_seconds: 0,
        penalty_positions: 0,
        penalty_type: 'protesto',
        description: description.trim().slice(0, 120),
        deadline: deadlineDate,
        cancelled: false,
      })

      // 2. Increment race counter
      try {
        await stageRacesService.update(selectedRaceId, {
          case_counter: currentCounter,
        })
      } catch (err) {
        console.error('Error updating case counter:', err)
      }

      // 3. Notify accused pilots:
      // "informando que abriram um protesto contra ele na etapa X da pista Y, da corrida Z na volta XX,
      // envolvendo o(s) piloto(s) e o nome dos envolvidos. E que ele tem 24h para dar sua versão do incidente
      // no sistema, com um botão para ele clicar e ir direto para o protesto específico"
      await notificationsService.notifyInvolvedPilots({
        caseRecord: createdCase,
        involvedPilotRecords: selectedPilots,
        stageName: `Etapa ${selectedStage?.order ?? 1}`,
        trackName: selectedStage?.expand?.track?.name || 'Pista Oficial',
        raceName: selectedRace?.name || `Corrida ${selectedRace?.order ?? 1}`,
        lap: caseLap.trim(),
        openedByType: 'protesto_piloto',
        protestingPilotName: authorPilotName,
        status: 'Em análise',
      })

      toast({
        title: `Protesto Aberto — ${generatedCode}`,
        description:
          'Seu protesto foi encaminhado para a Central dos Comissários. O piloto citado foi notificado e tem 24h para manifestação.',
      })

      navigate('/meus-protestos')
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao abrir protesto',
        description: err?.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-16 text-center text-sm text-gray-400 animate-pulse">
        Carregando formulário de protesto desportivo...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-20">
      {/* Top back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate(-1)}
          className="text-xs text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
          Voltar
        </Button>

        <span className="text-[11px] font-racing text-gray-400 uppercase tracking-wider">
          Módulo Desportivo do Piloto
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-[#14141F] p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden space-y-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs bg-[#E10600]/15 text-[#E10600] border-[#E10600]/30 font-racing uppercase tracking-wider flex items-center gap-1.5"
          >
            <Gavel className="w-3.5 h-3.5" />
            Protesto Pós-Corrida
          </Badge>
          <span className="text-gray-500">•</span>
          <span className="text-xs text-gray-300 font-medium">
            {myPilot ? getPilotDisplayLabel(myPilot) : user?.name || 'Piloto Autenticado'}
          </span>
        </div>

        <h1 className="font-racing text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
          <span className="w-2.5 h-7 bg-[#E10600] rounded-sm inline-block shadow-[0_0_12px_rgba(225,6,0,0.5)]"></span>
          Abrir Protesto Contra Piloto
        </h1>

        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
          Utilize este formulário para solicitar análise da Comissão de Provas por infração do
          regulamento desportivo da competição. O piloto citado receberá notificação imediata e terá
          até 24h para apresentar sua manifestação.
        </p>
      </div>

      {/* Form Card */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg">
        <form onSubmit={handleSubmitProtest} className="space-y-6">
          {/* Sessão da Corrida */}
          <div className="space-y-4 border-b border-white/10 pb-5">
            <h2 className="font-racing text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#E10600]" />
              Identificação da Prova
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Campeonato */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-200">Campeonato</Label>
                <Select value={selectedChampId} onValueChange={setSelectedChampId}>
                  <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-10">
                    <SelectValue placeholder="Selecione o campeonato" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1B1B2A] border-white/15 text-white">
                    {availableChampionships.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Etapa */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-200">Etapa</Label>
                <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                  <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-10">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1B1B2A] border-white/15 text-white">
                    {stages.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        Etapa {st.order} {st.expand?.track?.name ? `(${st.expand.track.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bateria / Corrida */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-200">Bateria / Corrida</Label>
                <Select value={selectedRaceId} onValueChange={setSelectedRaceId}>
                  <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-10">
                    <SelectValue placeholder="Selecione a corrida" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1B1B2A] border-white/15 text-white">
                    {races.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name || `Corrida ${r.order}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Closed Race Warning */}
            {isRaceClosed && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  Esta bateria já foi encerrada pelos comissários. Não é mais possível abrir novos
                  protestos pós-corrida.
                </span>
              </div>
            )}
          </div>

          {/* Dados do Incidente */}
          <div className="space-y-4">
            <h2 className="font-racing text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#E10600]" />
              Dados do Incidente
            </h2>

            {/* 1. Volta */}
            <div className="space-y-1.5">
              <Label htmlFor="lap-input" className="text-xs font-semibold text-gray-200">
                Volta / Trecho do Incidente
              </Label>
              <Input
                id="lap-input"
                type="text"
                placeholder="Ex: Volta 12, Curva do Lago, Reta oposta"
                value={caseLap}
                onChange={(e) => setCaseLap(e.target.value)}
                className="bg-[#1F1F30] border-white/10 text-white text-xs h-10 font-medium focus-visible:ring-[#E10600]"
                required
              />
            </div>

            {/* 2. Piloto(s) Envolvido(s) com Autocomplete Inteligente */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200">
                  Piloto(s) Envolvido(s) / Protestado(s) ({selectedPilots.length} selecionado(s))
                </Label>
                <span className="text-[11px] text-gray-400">
                  Busca inteligente ignorando acentos
                </span>
              </div>

              {/* Chips removíveis com formato "#número - Nome" */}
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
                  placeholder="Digite nome, número ou equipe do piloto protestado..."
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

              {/* Dropdown list for pilots */}
              {isPilotDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[#1B1B2A] border border-white/15 shadow-2xl divide-y divide-white/5">
                  {filteredPilots.length === 0 ? (
                    <div className="p-3 text-center text-gray-400 text-xs">
                      Nenhum outro piloto encontrado com esse termo.
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
                          Selecionar
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 3. Infração / Artigo do Regulamento */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-200">
                  Infração / Artigo do Regulamento
                </Label>
                <span className="text-[11px] text-gray-400">
                  Selecione o artigo violado no incidente
                </span>
              </div>

              <div className="relative">
                <Input
                  ref={infractionInputRef}
                  type="text"
                  placeholder="Selecione ou busque o artigo violado..."
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
                  <span className="text-gray-300">Punição prevista no item:</span>
                  <span className="font-bold text-[#90e0ef] font-mono">
                    {parsedPenalty.displayText}
                  </span>
                </div>
              )}
            </div>

            {/* 4. Breve Descrição (limite 120 caracteres) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="desc-protest" className="text-xs font-semibold text-gray-200">
                  Breve Descrição do Ocorrido
                </Label>
                <span
                  className={`text-[11px] font-mono ${
                    description.length > 115 ? 'text-amber-400' : 'text-gray-400'
                  }`}
                >
                  Max.: {description.length} / 120
                </span>
              </div>
              <Textarea
                id="desc-protest"
                rows={3}
                maxLength={120}
                placeholder="Descreva sucintamente a manobra ou infração ocorrida na pista..."
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 120))}
                className="bg-[#1F1F30] border-white/10 text-white text-xs resize-y focus-visible:ring-[#E10600]"
                required
              />
            </div>

            {/* Info notice about notifications & defense */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold text-white">Notificação e Prazo de Defesa:</p>
                <p className="leading-relaxed text-amber-200/90">
                  Ao enviar, o protesto será registrado com status{' '}
                  <strong>&quot;Em análise&quot;</strong>. Os pilotos citados receberão uma
                  notificação com link direto para o caso e terão um prazo de{' '}
                  <strong>24 horas</strong> para apresentar sua versão antes da decisão final dos
                  comissários.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="text-xs bg-transparent border-white/15 text-gray-300 hover:bg-white/5 w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isRaceClosed}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-6 h-10 shadow-lg shadow-red-950/40 flex items-center gap-2 w-full sm:w-auto disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Enviando Protesto...' : 'Enviar Protesto Oficial'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
