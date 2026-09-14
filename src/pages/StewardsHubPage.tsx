import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Lock,
  Unlock,
  AlertTriangle,
  ChevronRight,
  Trophy,
  Layers,
  Flag,
  Scale,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  Info,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  championshipsService,
  championshipStagesService,
  stageRacesService,
  seasonsService,
  moderationCasesService,
} from '@/services/api'
import type { Championship, ChampionshipStage, StageRace, Season, ModerationCase } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'
import { checkStewardAccess } from '@/lib/moderationUtils'

interface StageCardItem {
  stage: ChampionshipStage
  championship: Championship
  races: StageRace[]
  nextStageDate?: string
  accessInfo: ReturnType<typeof checkStewardAccess>
  selectedRaceId?: string
}

export default function StewardsHubPage() {
  const { user, isCollaborator } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [stages, setStages] = useState<ChampionshipStage[]>([])
  const [stageRaces, setStageRaces] = useState<StageRace[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([])

  // Session selection per stage (StageId -> RaceId)
  const [selectedSessions, setSelectedSessions] = useState<Record<string, string>>({})

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [allChamps, allStages, allSeasons, allCases] = await Promise.all([
        championshipsService.list(),
        championshipStagesService.listByChampionship(''), // or fetch via stages
        seasonsService.list(),
        moderationCasesService.listAll(false).catch(() => []),
      ])

      // Fallback: PocketBase filter listByChampionship requires id, let's load stages for each championship
      const loadedStages: ChampionshipStage[] = []
      const loadedRaces: StageRace[] = []

      for (const ch of allChamps) {
        try {
          const stList = await championshipStagesService.listByChampionship(ch.id)
          loadedStages.push(...stList)
          for (const st of stList) {
            const rList = await stageRacesService.listByStage(st.id)
            loadedRaces.push(...rList)
          }
        } catch (e) {
          console.error('Error fetching stage for champ:', ch.id, e)
        }
      }

      setChampionships(allChamps)
      setStages(loadedStages)
      setStageRaces(loadedRaces)
      setSeasons(allSeasons)
      setModerationCases(allCases)

      // Initialize selected races: default to race 1 of each stage
      const sessionMap: Record<string, string> = {}
      for (const st of loadedStages) {
        const racesOfStage = loadedRaces.filter((r) => r.stage_id === st.id)
        if (racesOfStage.length > 0) {
          sessionMap[st.id] = racesOfStage[0].id
        }
      }
      setSelectedSessions((prev) => ({ ...sessionMap, ...prev }))
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar a Central de Provas.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime<ModerationCase>('moderation_cases', () => {
    moderationCasesService
      .listAll(false)
      .then(setModerationCases)
      .catch(() => {})
  })

  // Separate stages into "Today's Races" and "Upcoming Races"
  const { todayStages, upcomingStages, pastStages } = useMemo(() => {
    const now = new Date()
    const todayY = now.getFullYear()
    const todayM = now.getMonth()
    const todayD = now.getDate()

    // Map stages by championship to find next stage date
    const stagesByChamp: Record<string, ChampionshipStage[]> = {}
    for (const st of stages) {
      if (!stagesByChamp[st.championship_id]) {
        stagesByChamp[st.championship_id] = []
      }
      stagesByChamp[st.championship_id].push(st)
    }
    Object.values(stagesByChamp).forEach((list) => {
      list.sort((a, b) => (a.order || 0) - (b.order || 0))
    })

    const cardItems: StageCardItem[] = stages.map((st) => {
      const champ =
        championships.find((c) => c.id === st.championship_id) ||
        ({
          id: st.championship_id,
          name: 'Campeonato Oficial',
          short_code: 'IRB',
        } as Championship)

      const races = stageRaces.filter((r) => r.stage_id === st.id)
      races.sort((a, b) => a.order - b.order)

      // Find next stage date
      const champStageList = stagesByChamp[st.championship_id] || []
      const currIdx = champStageList.findIndex((s) => s.id === st.id)
      const nextStage =
        currIdx >= 0 && currIdx < champStageList.length - 1 ? champStageList[currIdx + 1] : null

      const firstRace = races[0]
      const startTime = firstRace?.start_time || '14:00'

      const accessInfo = checkStewardAccess({
        stageDate: st.date,
        stageStartTime: startTime,
        nextStageDate: nextStage?.date,
        isCollaboratorOrAdmin: Boolean(isCollaborator),
        now,
      })

      return {
        stage: st,
        championship: champ,
        races,
        nextStageDate: nextStage?.date,
        accessInfo,
      }
    })

    const today: StageCardItem[] = []
    const upcoming: StageCardItem[] = []
    const past: StageCardItem[] = []

    for (const item of cardItems) {
      if (!item.stage.date) {
        upcoming.push(item)
        continue
      }
      const stDate = new Date(item.stage.date)
      const isDateToday =
        stDate.getFullYear() === todayY &&
        stDate.getMonth() === todayM &&
        stDate.getDate() === todayD

      if (isDateToday) {
        today.push(item)
      } else if (stDate.getTime() > now.getTime()) {
        upcoming.push(item)
      } else {
        past.push(item)
      }
    }

    // Sort upcoming by date
    upcoming.sort((a, b) => {
      const da = a.stage.date ? new Date(a.stage.date).getTime() : 0
      const db = b.stage.date ? new Date(b.stage.date).getTime() : 0
      return da - db
    })

    // If no stage is exactly today, make sure comissários still see ready-to-test stages (e.g. status "Em andamento" or next upcoming with banner)
    return { todayStages: today, upcomingStages: upcoming, pastStages: past }
  }, [stages, stageRaces, championships, isCollaborator])

  const handleSelectSession = (stageId: string, raceId: string) => {
    setSelectedSessions((prev) => ({ ...prev, [stageId]: raceId }))
  }

  const handleNavigateToRace = (stageItem: StageCardItem) => {
    const selectedRaceId = selectedSessions[stageItem.stage.id] || stageItem.races[0]?.id
    if (!selectedRaceId) {
      toast({
        title: 'Nenhuma corrida cadastrada',
        description: 'Esta etapa ainda não possui corridas configuradas.',
        variant: 'destructive',
      })
      return
    }

    if (!stageItem.accessInfo.canAccess) {
      toast({
        title: 'Acesso bloqueado aos comissários',
        description:
          stageItem.accessInfo.reason ||
          'O acesso é liberado automaticamente 120 minutos antes do início da prova.',
        variant: 'destructive',
      })
      return
    }

    navigate(`/dashboard/moderacao/corrida/${selectedRaceId}`)
  }

  const renderStageCard = (item: StageCardItem, isTodaySection = false) => {
    const { stage, championship: champ, races, accessInfo } = item
    const hasMultipleRaces = races.length > 1
    const selectedRaceId = selectedSessions[stage.id] || races[0]?.id
    const currentRace = races.find((r) => r.id === selectedRaceId) || races[0]

    // Cases for this race
    const raceCases = moderationCases.filter((c) => c.stage_race_id === currentRace?.id)

    const formattedDate = stage.date
      ? new Date(stage.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'Data a definir'

    return (
      <div
        key={stage.id}
        className={`rounded-2xl border p-5 transition-all shadow-md ${
          isTodaySection
            ? 'bg-gradient-to-br from-[#1A1A2B] to-[#12121E] border-red-500/30 shadow-red-950/20'
            : 'bg-[#161622] border-white/10 hover:border-white/20'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[11px] font-racing uppercase tracking-wider ${
                  isTodaySection
                    ? 'bg-[#E10600]/20 text-[#ff4d4d] border-[#E10600]/40'
                    : 'bg-white/5 text-gray-300 border-white/10'
                }`}
              >
                {champ.name}
              </Badge>

              <span className="text-gray-500">•</span>

              <span className="text-xs font-semibold text-gray-200">
                Etapa {stage.order}{' '}
                {stage.expand?.track?.name ? `— ${stage.expand.track.name}` : ''}
              </span>

              {stage.track_layout && (
                <span className="text-[11px] text-gray-400 font-mono">({stage.track_layout})</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5 text-gray-300">
                <Calendar className="w-3.5 h-3.5 text-[#E10600]" />
                {formattedDate}
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5 font-mono text-gray-300">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Início: {currentRace?.start_time || '14:00'} ({stage.duration} {stage.duration_type}
                )
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-[11px] text-gray-300">
                {raceCases.length} caso(s) registrado(s)
              </span>
            </div>
          </div>

          {/* Right Actions & Session Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* DROPDOWN DE SESSÃO: Corrida 1, Corrida 2... Exibido SOMENTE quando a etapa tem mais de uma corrida */}
            {hasMultipleRaces && (
              <div className="flex items-center gap-2 bg-[#1F1F30] p-1 rounded-xl border border-white/10">
                <span className="text-[11px] font-racing text-gray-400 uppercase tracking-wider pl-2 hidden sm:inline">
                  Sessão:
                </span>
                <Select
                  value={selectedRaceId}
                  onValueChange={(val) => handleSelectSession(stage.id, val)}
                >
                  <SelectTrigger className="bg-transparent border-0 text-white text-xs h-8 focus:ring-0 w-36 font-semibold">
                    <SelectValue placeholder="Selecione a corrida" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                    {races.map((rc) => (
                      <SelectItem key={rc.id} value={rc.id}>
                        {rc.name || `Corrida ${rc.order}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Access status button / badge */}
            {accessInfo.canAccess ? (
              <Button
                onClick={() => handleNavigateToRace(item)}
                className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-5 h-9 shadow-lg shadow-red-950/40 flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                Acessar Moderação
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 bg-[#1F1F30]/80 px-3.5 py-2 rounded-xl border border-amber-500/30 text-amber-300 text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Liberado às {accessInfo.releaseTimeStr}{' '}
                  {accessInfo.minutesUntilRelease
                    ? `(em ${accessInfo.minutesUntilRelease} min)`
                    : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lock note / admin privilege info */}
        {!accessInfo.canAccess && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              O acesso aos comissários é liberado automaticamente 120 minutos antes da etapa.
            </span>
            {isCollaborator && (
              <Badge className="bg-red-500/20 text-red-300 border-none text-[10px]">
                Administrador: Acesso Total
              </Badge>
            )}
          </div>
        )}

        {/* Edição restrita após data da próxima etapa */}
        {!accessInfo.canEdit && accessInfo.canAccess && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[11px] text-gray-400">
            <Hourglass className="w-3.5 h-3.5 text-gray-400" />
            <span>
              Janela de edição de comissários encerrada com o início da próxima etapa. Modo apenas
              leitura (administradores mantêm permissão irrestrita).
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-6xl mx-auto">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#14141F] p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs bg-[#E10600]/15 text-[#E10600] border-[#E10600]/30 font-racing uppercase tracking-wider"
            >
              Comissários de Prova
            </Badge>
            <span className="text-gray-500">•</span>
            <span className="text-xs text-gray-400 font-medium">
              Controle de Incidentes e Julgamentos
            </span>
          </div>

          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-7 bg-[#E10600] rounded-sm inline-block shadow-[0_0_12px_rgba(225,6,0,0.5)]"></span>
            Central de Provas
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 max-w-3xl leading-relaxed">
            Painel operacional para comissários durante e após as corridas. Acesso liberado 120
            minutos antes da largada, com sessões separadas por corrida e códigos curtos
            anti-duplicidade.
          </p>
        </div>

        <div className="z-10 flex flex-col items-end gap-2 text-right">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#E10600]" />
            <span className="font-racing text-lg font-bold text-white uppercase">
              {moderationCases.length} Casos
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            {isCollaborator ? 'Modo Administrador / Colaborador' : 'Comissário Ativo'}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-sm text-gray-400 animate-pulse">
          Carregando calendário da Central de Provas...
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. SEÇÃO: CORRIDAS DE HOJE */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-[#E10600]" />
                <h2 className="font-racing text-lg font-bold text-white uppercase tracking-wider">
                  Corridas de Hoje
                </h2>
                {todayStages.length > 0 && (
                  <Badge className="bg-[#E10600] text-white text-xs font-racing uppercase">
                    {todayStages.length} Prova(s)
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-gray-400">
                Acesso automático 120 min antes do início programado
              </span>
            </div>

            {todayStages.length === 0 ? (
              <div className="p-8 text-center bg-[#161622] rounded-2xl border border-white/10 text-xs text-gray-400 space-y-2">
                <Calendar className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="font-medium text-gray-300">
                  Nenhuma etapa agendada especificamente para a data de hoje.
                </p>
                <p className="text-gray-500 max-w-md mx-auto">
                  Consulte a seção de próximas corridas abaixo para navegar nas etapas das
                  temporadas em andamento ou simular como administrador.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {todayStages.map((item) => renderStageCard(item, true))}
              </div>
            )}
          </section>

          {/* 2. SEÇÃO: PRÓXIMAS CORRIDAS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-300" />
                <h2 className="font-racing text-lg font-bold text-white uppercase tracking-wider">
                  Próximas Corridas da Temporada
                </h2>
                <Badge variant="outline" className="text-gray-400 border-white/15 text-xs">
                  {upcomingStages.length} Etapa(s)
                </Badge>
              </div>
              <span className="text-[11px] text-gray-400">
                Configuradas no calendário dos campeonatos ativos
              </span>
            </div>

            {upcomingStages.length === 0 ? (
              <div className="p-8 text-center bg-[#161622] rounded-2xl border border-white/10 text-xs text-gray-400">
                Nenhuma corrida futura agendada no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {upcomingStages.map((item) => renderStageCard(item, false))}
              </div>
            )}
          </section>

          {/* 3. SEÇÃO: CORRIDAS REALIZADAS / ANTERIORES */}
          {pastStages.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-racing text-lg font-bold text-white uppercase tracking-wider">
                    Etapas Concluídas / Anteriores
                  </h2>
                  <Badge variant="outline" className="text-gray-400 border-white/15 text-xs">
                    {pastStages.length}
                  </Badge>
                </div>
                <span className="text-[11px] text-gray-400">
                  Histórico de incidentes e julgamentos
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {pastStages.map((item) => renderStageCard(item, false))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
