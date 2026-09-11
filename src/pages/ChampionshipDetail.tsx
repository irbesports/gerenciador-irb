import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Trophy,
  Calendar,
  Users,
  Edit2,
  CheckCircle,
  Flag,
  ArrowLeft,
  Award,
  Clock,
  MapPin,
  ShieldAlert,
  UploadCloud,
  Layers,
  BookOpen,
  FileDown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  championshipsService,
  pilotsService,
  scoringRulesService,
  scoringPresetsService,
  infractionsService,
  championshipStagesService,
  stageRacesService,
  championshipPilotsService,
  raceResultsService,
  moderationCasesService,
} from '@/services/api'
import type {
  Championship,
  Pilot,
  ScoringRule,
  ScoringPreset,
  Infraction,
  ChampionshipStage,
  StageRace,
  ChampionshipPilot,
  SingleScoringConfig,
  MultiClassScoringConfig,
  RaceResultRecord,
  ModerationCase,
} from '@/types'
import { IracingImportModal } from '@/components/championship/IracingImportModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'
import { getFileUrl } from '@/services/api'

export default function ChampionshipDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [championship, setChampionship] = useState<Championship | null>(null)
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([])
  const [stages, setStages] = useState<ChampionshipStage[]>([])
  const [stageRaces, setStageRaces] = useState<StageRace[]>([])
  const [champPilots, setChampPilots] = useState<ChampionshipPilot[]>([])
  const [infractions, setInfractions] = useState<Infraction[]>([])
  const [raceResults, setRaceResults] = useState<RaceResultRecord[]>([])
  const [scoringPresets, setScoringPresets] = useState<ScoringPreset[]>([])
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // iRacing Import Modal
  const [isIracingModalOpen, setIsIracingModalOpen] = useState(false)
  const [stageForImport, setStageForImport] = useState<ChampionshipStage | null>(null)
  const [selectedClassTab, setSelectedClassTab] = useState<string>('geral')

  const loadData = async () => {
    if (!id) return
    try {
      const [champ, pList, rules, infs, stList, cpList, rResults, presets, modCases] =
        await Promise.all([
          championshipsService.getOne(id),
          pilotsService.list(),
          scoringRulesService.listByChampionship(id),
          infractionsService.list(),
          championshipStagesService.listByChampionship(id),
          championshipPilotsService.listByChampionship(id, false),
          raceResultsService.listByChampionship(id, true),
          scoringPresetsService.list(),
          moderationCasesService.listByChampionship(id, false).catch(() => []),
        ])
      setChampionship(champ)
      setPilots(pList)
      setScoringRules(rules)
      setInfractions(infs.filter((inf) => inf.championship_id === id))
      setStages(stList)
      setChampPilots(cpList)
      setRaceResults(rResults)
      setScoringPresets(presets)
      setModerationCases(modCases)

      // Load all races for all stages
      const allRaces: StageRace[] = []
      for (const st of stList) {
        const races = await stageRacesService.listByStage(st.id)
        allRaces.push(...races)
      }
      setStageRaces(allRaces)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do campeonato.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime<Championship>('championships', () => {
    loadData()
  })

  const handleEndChampionship = async () => {
    if (!championship || !id) return
    if (
      !window.confirm('Deseja realmente encerrar este campeonato e oficializar as classificações?')
    )
      return

    try {
      await championshipsService.update(id, { status: 'concluido' })
      toast({ title: 'Sucesso', description: 'Campeonato finalizado com sucesso!' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível encerrar o campeonato.',
        variant: 'destructive',
      })
    }
  }

  // Map penalty points from moderation cases to pilots
  const pilotPenaltiesMap = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const c of moderationCases) {
      if (c.cancelled) continue
      // Active applied penalties with points
      if (
        (c.status === 'Aplicado em corrida' || c.status === 'Aplicado pós corrida') &&
        c.guilty_pilot_id &&
        c.penalty_points &&
        c.penalty_points > 0
      ) {
        const current = map.get(c.guilty_pilot_id) || 0
        map.set(c.guilty_pilot_id, current + c.penalty_points)
      }
    }
    return map
  }, [moderationCases])

  // Calculation of standings with real imported race_results + drop scores (descartes) + moderation penalties
  const { standings, teamStandings, availableClasses } = React.useMemo(() => {
    // Collect all available classes from raceResults or champPilots
    const classesSet = new Set<string>()
    raceResults.forEach((rr) => {
      if (rr.car_class_name) classesSet.add(rr.car_class_name)
    })
    champPilots.forEach((cp) => {
      if (cp.car_class) classesSet.add(cp.car_class)
    })
    const availableClasses = Array.from(classesSet)

    // Regra da Especificação Mestre: LISTA DE INSCRITOS = apenas inscrições APROVADAS
    // Classificação é calculada de resultados + pontuação + penalidades. Inscrições canceladas/recusadas saem da lista.
    const approvedInscriptions = champPilots.filter(
      (cp) => (cp.registration_status || 'aprovada') === 'aprovada',
    )

    // Determine participant list: apenas inscrições aprovadas (ou pilotos com resultados oficiais importados)
    const participantMap = new Map<
      string,
      {
        id: string
        name: string
        team_name?: string
        number?: number
        avatar?: string
        pilotRecordId?: string
        iracing_id?: string
        car_class?: string
        registration_status?: string
      }
    >()

    approvedInscriptions.forEach((cp) => {
      const key = cp.iracing_id ? `ir_${cp.iracing_id}` : cp.pilot || cp.id
      participantMap.set(key, {
        id: cp.id,
        name: cp.name || cp.expand?.pilot?.name || 'Piloto',
        team_name: cp.team || cp.expand?.pilot?.team_name || 'Equipe',
        number: cp.number ?? cp.expand?.pilot?.number,
        avatar: cp.expand?.pilot?.avatar,
        pilotRecordId: cp.pilot,
        iracing_id: cp.iracing_id,
        car_class: cp.car_class,
        registration_status: cp.registration_status,
      })
    })

    // Add any driver with imported race results who might not be in champPilots
    raceResults.forEach((rr) => {
      const key = rr.cust_id ? `ir_${rr.cust_id}` : rr.pilot_id || rr.id
      if (!participantMap.has(key)) {
        participantMap.set(key, {
          id: rr.id,
          name: rr.display_name,
          team_name: rr.expand?.pilot_id?.team_name || 'iRacing Driver',
          number: rr.car_number ? Number(rr.car_number) : undefined,
          avatar: rr.expand?.pilot_id?.avatar,
          pilotRecordId: rr.pilot_id,
          iracing_id: String(rr.cust_id),
          car_class: rr.car_class_name,
        })
      }
    })

    const effectiveParticipants = Array.from(participantMap.values())
    const dropScoresCount = championship?.drop_scores || 0
    const hasImportedResults = raceResults.length > 0

    // Filter by class if selected and not 'geral'
    const filteredParticipants =
      selectedClassTab !== 'geral'
        ? effectiveParticipants.filter((p) => {
            const hasResultInClass = raceResults.some(
              (rr) =>
                (String(rr.cust_id) === p.iracing_id || rr.pilot_id === p.pilotRecordId) &&
                rr.car_class_name === selectedClassTab,
            )
            return p.car_class === selectedClassTab || hasResultInClass
          })
        : effectiveParticipants

    const list = filteredParticipants.map((p) => {
      let driverResults: RaceResultRecord[] = []
      if (hasImportedResults) {
        driverResults = raceResults.filter((rr) => {
          const matchPilot =
            (p.iracing_id && String(rr.cust_id) === p.iracing_id) ||
            (p.pilotRecordId && rr.pilot_id === p.pilotRecordId)
          if (!matchPilot) return false
          if (selectedClassTab !== 'geral' && rr.car_class_name !== selectedClassTab) {
            return false
          }
          return true
        })
      }

      let raceScores: number[] = []
      let wins = 0
      let podiums = 0
      let poles = 0
      let fastestLaps = 0

      if (hasImportedResults) {
        raceScores = driverResults.map((r) => r.total_points ?? 0)
        wins = driverResults.filter((r) =>
          selectedClassTab !== 'geral' ? r.finish_position_in_class === 1 : r.finish_position === 1,
        ).length
        podiums = driverResults.filter((r) =>
          selectedClassTab !== 'geral' ? r.finish_position_in_class <= 3 : r.finish_position <= 3,
        ).length
        poles = driverResults.filter((r) => r.is_pole).length
        fastestLaps = driverResults.filter((r) => r.is_fastest_lap).length
      }

      // Apply drop scores (descartes: discard lowest N results)
      const sortedScores = [...raceScores].sort((a, b) => a - b)
      const discardedScores = sortedScores.slice(0, dropScoresCount)
      const retainedScores = sortedScores.slice(dropScoresCount)
      const retainedSum = retainedScores.reduce((sum, val) => sum + val, 0)
      const grossPoints = raceScores.reduce((sum, val) => sum + val, 0)

      // Deduct penalties applied by Stewards
      const pilotPenalty =
        (p.pilotRecordId ? pilotPenaltiesMap.get(p.pilotRecordId) : 0) ||
        pilotPenaltiesMap.get(p.id) ||
        0

      const totalPoints = Math.max(0, retainedSum - pilotPenalty)

      return {
        pilot: p,
        totalPoints,
        grossPoints,
        discardedPoints: discardedScores.reduce((s, v) => s + v, 0),
        penaltyPoints: pilotPenalty,
        raceScores,
        wins,
        podiums,
        poles,
        fastestLaps,
        racesCount: raceScores.length,
      }
    })

    list.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.podiums - a.podiums
    })

    // Team Standings calculation (aggregating drivers points and steward penalties per team)
    const teamsMap = new Map<
      string,
      {
        name: string
        totalPoints: number
        grossPoints: number
        penaltyPoints: number
        wins: number
        podiums: number
        pilotsCount: number
      }
    >()

    list.forEach((entry) => {
      const teamName = entry.pilot.team_name?.trim() || 'Independente'
      const existing = teamsMap.get(teamName) || {
        name: teamName,
        totalPoints: 0,
        grossPoints: 0,
        penaltyPoints: 0,
        wins: 0,
        podiums: 0,
        pilotsCount: 0,
      }
      existing.totalPoints += entry.totalPoints
      existing.grossPoints += entry.grossPoints
      existing.penaltyPoints += entry.penaltyPoints
      existing.wins += entry.wins
      existing.podiums += entry.podiums
      existing.pilotsCount += 1
      teamsMap.set(teamName, existing)
    })

    const teamStandings = Array.from(teamsMap.values()).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.podiums - a.podiums
    })

    return { standings: list, teamStandings, availableClasses }
  }, [champPilots, pilots, championship, raceResults, selectedClassTab, pilotPenaltiesMap])

  if (isLoading || !championship) {
    return (
      <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
        Carregando detalhes do campeonato...
      </div>
    )
  }

  const seasonName = championship.expand?.season_id?.name || 'Temporada Oficial'
  const yearNumber = championship.expand?.season_id?.expand?.year_id?.year

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/campeonatos')}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Campeonatos
        </Button>
      </div>
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs capitalize font-medium ${
                championship.status === 'ativo'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : championship.status === 'concluido'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
              }`}
            >
              {championship.status || 'rascunho'}
            </Badge>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 font-medium">
              {seasonName} {yearNumber ? `(${yearNumber})` : ''}
            </span>
          </div>

          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            {championship.name}
          </h1>

          {championship.description && (
            <p className="text-xs sm:text-sm text-gray-500 max-w-2xl">{championship.description}</p>
          )}
        </div>

        {/* Header Actions */}
        {isCollaborator && (
          <div className="flex items-center gap-2.5 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/campeonatos/${id}/editar`)}
              className="text-xs font-semibold text-gray-700 border-gray-300 hover:bg-gray-100"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
              Editar
            </Button>

            {championship.status !== 'concluido' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndChampionship}
                className="bg-[#14141F] hover:bg-[#2A2A3D] text-white text-xs font-semibold shadow-sm"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Encerrar Campeonato
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Tabs: Classificação, Etapas & Corridas, Pilotos Inscritos, Tabela de Pontuação */}
      <Tabs defaultValue="standings" className="w-full">
        <TabsList className="bg-gray-100 p-1 border border-gray-200 rounded-xl mb-4">
          <TabsTrigger
            value="standings"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Classificação Pilotos
          </TabsTrigger>
          <TabsTrigger
            value="teams"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Classificação Equipes
          </TabsTrigger>
          <TabsTrigger
            value="races"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Etapas e Corridas ({stages.length})
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Lista de Inscritos (
            {
              champPilots.filter((cp) => (cp.registration_status || 'aprovada') === 'aprovada')
                .length
            }
            )
          </TabsTrigger>
          <TabsTrigger
            value="regulation"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Regulamento Oficial
          </TabsTrigger>
          <TabsTrigger
            value="scoring"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Tabela de Pontuação
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Classificação com descartes e suporte multi-classe */}
        <TabsContent value="standings" className="space-y-4">
          {/* Class Filter Tabs if multi-class */}
          {availableClasses.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-gray-500 font-racing uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Layers className="w-3.5 h-3.5 text-[#E10600]" />
                Filtrar Categoria:
              </span>
              <button
                type="button"
                onClick={() => setSelectedClassTab('geral')}
                className={`px-3 py-1 rounded-lg text-xs font-racing uppercase tracking-wider transition-all ${
                  selectedClassTab === 'geral'
                    ? 'bg-[#E10600] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Geral (Todas)
              </button>
              {availableClasses.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClassTab(cls)}
                  className={`px-3 py-1 rounded-lg text-xs font-racing uppercase tracking-wider transition-all ${
                    selectedClassTab === cls
                      ? 'bg-[#E10600] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}

          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#E10600]" />
                <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
                  Classificação {selectedClassTab === 'geral' ? 'Geral' : selectedClassTab} de
                  Pilotos
                </h3>
                {raceResults.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300"
                  >
                    {raceResults.length} Resultados iRacing Integrados
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-gray-500 flex items-center gap-3">
                {championship.drop_scores ? (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    Descartes aplicados: {championship.drop_scores} pior(es) resultado(s)
                  </span>
                ) : (
                  <span>Sem descartes aplicados</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">Pos</th>
                    <th className="py-3 px-4">Piloto</th>
                    <th className="py-3 px-4">Equipe / Classe</th>
                    <th className="py-3 px-4 text-center">Corridas</th>
                    <th className="py-3 px-4 text-center">Vitórias</th>
                    <th className="py-3 px-4 text-center">Pódios</th>
                    <th className="py-3 px-4 text-right text-gray-400">Pontos Brutos</th>
                    {championship.drop_scores ? (
                      <th className="py-3 px-4 text-right text-amber-700">Descartados</th>
                    ) : null}
                    <th className="py-3 px-4 text-right text-red-600">Punições</th>
                    <th className="py-3 px-4 text-right font-bold text-gray-900">Total Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {standings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Nenhum piloto registrado para esta categoria.
                      </td>
                    </tr>
                  ) : (
                    standings.map((row, i) => (
                      <tr
                        key={row.pilot.id || i}
                        onClick={() =>
                          row.pilot.pilotRecordId && navigate(`/pilotos/${row.pilot.pilotRecordId}`)
                        }
                        className="hover:bg-red-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-racing font-bold text-xs ${
                              i === 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : i === 1
                                  ? 'bg-slate-200 text-slate-800'
                                  : i === 2
                                    ? 'bg-amber-800/20 text-amber-900'
                                    : 'text-gray-500'
                            }`}
                          >
                            {i + 1}º
                          </span>
                        </td>

                        <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2.5">
                          <Avatar className="w-7 h-7 rounded border border-gray-200">
                            <AvatarImage src={row.pilot.avatar} />
                            <AvatarFallback className="bg-[#14141F] text-white text-[10px]">
                              {row.pilot.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{row.pilot.name}</span>
                              {row.pilot.iracing_id && (
                                <span className="text-[9px] text-gray-400 font-mono">
                                  [ID:{row.pilot.iracing_id}]
                                </span>
                              )}
                            </div>
                            {row.pilot.number && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                #{row.pilot.number}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-600">
                          <div>{row.pilot.team_name || 'Independente'}</div>
                          {row.pilot.car_class && (
                            <span className="text-[10px] text-[#E10600] font-medium">
                              {row.pilot.car_class}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {row.racesCount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">{row.wins}</td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {row.podiums}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-gray-400">
                          {row.grossPoints} pts
                        </td>
                        {championship.drop_scores ? (
                          <td className="py-3 px-4 text-right font-mono text-amber-700">
                            -{row.discardedPoints} pts
                          </td>
                        ) : null}
                        <td className="py-3 px-4 text-right font-mono text-red-600 font-bold">
                          {row.penaltyPoints > 0 ? `-${row.penaltyPoints} pts` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-racing text-base font-bold text-[#E10600] tabular-nums">
                          {row.totalPoints} pts
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Classificação por Equipes */}
        <TabsContent value="teams" className="space-y-4">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#E10600]" />
                <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
                  Classificação Oficial por Equipes
                </h3>
              </div>
              <span className="text-[11px] text-gray-500">
                Soma da pontuação líquida e punições atribuídas aos pilotos de cada equipe
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">Pos</th>
                    <th className="py-3 px-4">Equipe</th>
                    <th className="py-3 px-4 text-center">Pilotos</th>
                    <th className="py-3 px-4 text-center">Vitórias</th>
                    <th className="py-3 px-4 text-center">Pódios</th>
                    <th className="py-3 px-4 text-right text-gray-400">Pontos Brutos</th>
                    <th className="py-3 px-4 text-right text-red-600">Punições</th>
                    <th className="py-3 px-4 text-right font-bold text-gray-900">Total Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {teamStandings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Nenhuma equipe registrada no campeonato.
                      </td>
                    </tr>
                  ) : (
                    teamStandings.map((team, idx) => (
                      <tr key={team.name} className="hover:bg-red-50/30 transition-colors">
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-racing font-bold text-xs ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : idx === 1
                                  ? 'bg-slate-200 text-slate-800'
                                  : idx === 2
                                    ? 'bg-amber-800/20 text-amber-900'
                                    : 'text-gray-500'
                            }`}
                          >
                            {idx + 1}º
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">{team.name}</td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {team.pilotsCount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">{team.wins}</td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {team.podiums}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-400">
                          {team.grossPoints} pts
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-red-600 font-bold">
                          {team.penaltyPoints > 0 ? `-${team.penaltyPoints} pts` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-racing text-base font-bold text-[#E10600] tabular-nums">
                          {team.totalPoints} pts
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Etapas e Corridas Reais */}
        <TabsContent value="races">
          <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#E10600]" />
                <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
                  Etapas Oficiais e Corridas do Campeonato
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {stages.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  Nenhuma etapa cadastrada ainda neste campeonato.
                </div>
              ) : (
                stages.map((st) => {
                  const racesOfStage = stageRaces.filter((r) => r.stage_id === st.id)
                  const formattedDate = st.date
                    ? new Date(st.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '-'

                  return (
                    <div
                      key={st.id}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 hover:border-red-200 space-y-3 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#14141F] text-white flex items-center justify-center font-racing text-sm font-bold shadow-sm">
                            E{st.order}
                          </div>
                          <div>
                            <h4 className="font-racing font-bold text-sm text-gray-900 uppercase">
                              Etapa {st.order}{' '}
                              {st.expand?.track?.name ? `— ${st.expand.track.name}` : ''}
                            </h4>
                            <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-red-500" />
                                {st.track_layout || 'Traçado padrão'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {formattedDate}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-gray-500">
                                {st.duration} {st.duration_type}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isCollaborator && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setStageForImport(st)
                                setIsIracingModalOpen(true)
                              }}
                              className="bg-[#14141F] hover:bg-[#2A2A3D] text-white text-xs font-racing uppercase tracking-wider px-3 h-8 shadow-sm flex items-center gap-1.5"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-[#E10600]" />
                              Importar iRacing
                            </Button>
                          )}

                          <Badge
                            variant="outline"
                            className={`text-[11px] uppercase font-medium ${
                              st.status === 'Finalizada'
                                ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                : st.status === 'Em andamento'
                                  ? 'border-amber-300 text-amber-700 bg-amber-50'
                                  : 'border-blue-300 text-blue-700 bg-blue-50'
                            }`}
                          >
                            {st.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Races list of this stage */}
                      {racesOfStage.length > 0 && (
                        <div className="pt-2 border-t border-gray-200/70 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {racesOfStage.map((rc) => (
                            <div
                              key={rc.id}
                              className="p-2.5 rounded-lg bg-white border border-gray-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-racing font-bold text-gray-900 block uppercase">
                                  {rc.name || `Corrida ${rc.order}`}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {rc.duration} {rc.duration_type}{' '}
                                  {rc.start_time ? `• ${rc.start_time}` : ''}
                                </span>
                              </div>

                              {isCollaborator && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/moderacao/corrida/${rc.id}`)}
                                  className="text-[11px] text-[#E10600] hover:text-[#C00500] hover:bg-red-50 p-1.5 h-7 font-racing uppercase"
                                  title="Moderar Prova"
                                >
                                  Moderar
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Participantes — Visão Derivada de Inscrições Aprovadas (Especificação Mestre) */}
        <TabsContent value="participants" className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-racing uppercase font-bold text-[#1E1E2F]">
                Lista Oficial de Inscritos (Visão Derivada)
              </span>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]"
              >
                Apenas Inscrições Aprovadas
              </Badge>
            </div>
            <span className="text-[11px] text-gray-500">
              Pilotos confirmados pela administração após validação / pagamento.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {champPilots
              .filter((cp) => (cp.registration_status || 'aprovada') === 'aprovada')
              .map((p) => (
                <Card
                  key={p.id}
                  onClick={() => p.pilot && navigate(`/pilotos/${p.pilot}`)}
                  className="racing-card p-4 cursor-pointer flex items-center justify-between hover:border-red-300 transition-all bg-white"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 rounded-lg border border-gray-200">
                      <AvatarImage src={p.expand?.pilot?.avatar} />
                      <AvatarFallback className="bg-[#14141F] text-white text-xs font-bold">
                        {(p.name || 'PI').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-racing font-bold text-sm text-gray-900">{p.name}</h4>
                      <p className="text-xs text-gray-500">
                        {p.team || p.expand?.pilot?.team_name || 'Piloto Oficial'}
                      </p>
                      {p.iracing_id && (
                        <p className="text-[10px] text-gray-400 font-mono">
                          iRacing: {p.iracing_id}
                        </p>
                      )}
                    </div>
                  </div>
                  {p.number !== undefined && p.number !== null && (
                    <span className="font-racing text-lg font-bold text-gray-400">#{p.number}</span>
                  )}
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Tab: Regulamento Oficial */}
        <TabsContent value="regulation" className="space-y-4">
          <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#E10600]" />
                  <h3 className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
                    Regulamento Oficial da Competição
                  </h3>
                </div>
                <p className="text-xs text-gray-500">
                  Diretrizes da temporada, conduta desportiva em pista e infrações passíveis de
                  punição.
                </p>
              </div>

              {championship.regulation_file && (
                <Button
                  type="button"
                  onClick={() =>
                    window.open(
                      getFileUrl('championships', championship.id, championship.regulation_file!),
                      '_blank',
                    )
                  }
                  className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider shadow-sm shrink-0"
                >
                  <FileDown className="w-4 h-4 mr-1.5" />
                  Baixar Documento (PDF/Doc)
                </Button>
              )}
            </div>

            {/* Texto do regulamento */}
            {championship.regulation_text ? (
              <div className="space-y-2">
                <h4 className="font-racing text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ementa e Artigos
                </h4>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {championship.regulation_text}
                </div>
              </div>
            ) : !championship.regulation_file ? (
              <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                Nenhum regulamento cadastrado neste campeonato.
              </div>
            ) : null}

            {/* Itens passíveis de punição */}
            {championship.regulation_rules &&
              Array.isArray(championship.regulation_rules) &&
              championship.regulation_rules.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h4 className="font-racing text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Infrações e Itens Passíveis de Punição
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {championship.regulation_rules.map((rule: any, idx: number) => {
                      const ruleText = typeof rule === 'string' ? rule : rule.title || rule.code
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-800 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] shrink-0" />
                          <span className="font-mono">{ruleText}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
          </Card>
        </TabsContent>

        {/* Tab 4: Tabela de Pontuação */}
        <TabsContent value="scoring">
          <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Award className="w-4 h-4 text-[#E10600]" />
              <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
                Critérios Oficiais de Pontuação Deste Torneio
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {scoringRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center space-y-1"
                >
                  <span className="font-racing text-xs text-gray-500 block uppercase">
                    {rule.position}ª Posição
                  </span>
                  <span className="font-racing text-xl font-bold text-[#E10600] block">
                    {rule.points} pts
                  </span>
                </div>
              ))}
            </div>

            {scoringRules[0]?.bonus_fastest_lap !== undefined && (
              <div className="p-3 bg-red-50 rounded-lg text-xs text-red-900 border border-red-200 flex items-center justify-between">
                <span>Bônus por Volta Mais Rápida em cada prova:</span>
                <span className="font-racing font-bold text-sm">
                  +{scoringRules[0].bonus_fastest_lap} ponto adicional
                </span>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>{' '}
      {/* iRacing Import Modal */}
      {stageForImport && championship && (
        <IracingImportModal
          open={isIracingModalOpen}
          onOpenChange={setIsIracingModalOpen}
          championship={championship}
          stage={stageForImport}
          races={stageRaces.filter((r) => r.stage_id === stageForImport.id)}
          currentUserId={championship.user_id}
          scoringPresets={scoringPresets}
          onImportSuccess={() => {
            loadData()
            toast({
              title: 'Classificação atualizada',
              description: 'Os pontos oficiais foram calculados e integrados à tabela.',
            })
          }}
        />
      )}
    </div>
  )
}
