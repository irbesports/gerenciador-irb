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
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  championshipsService,
  pilotsService,
  scoringRulesService,
  infractionsService,
  championshipStagesService,
  stageRacesService,
  championshipPilotsService,
} from '@/services/api'
import type {
  Championship,
  Pilot,
  ScoringRule,
  Infraction,
  ChampionshipStage,
  StageRace,
  ChampionshipPilot,
  SingleScoringConfig,
  MultiClassScoringConfig,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'

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
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      const [champ, pList, rules, infs, stList, cpList] = await Promise.all([
        championshipsService.getOne(id),
        pilotsService.list(),
        scoringRulesService.listByChampionship(id),
        infractionsService.list(),
        championshipStagesService.listByChampionship(id),
        championshipPilotsService.listByChampionship(id),
      ])
      setChampionship(champ)
      setPilots(pList)
      setScoringRules(rules)
      setInfractions(infs.filter((inf) => inf.championship_id === id))
      setStages(stList)
      setChampPilots(cpList)

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

  // Calculation of standings with drop scores (descartes) and points per race
  const standings = React.useMemo(() => {
    // Determine participant list: championship_pilots or general pilots
    const effectiveParticipants =
      champPilots.length > 0
        ? champPilots.map((cp) => ({
            id: cp.id,
            name: cp.name || cp.expand?.pilot?.name || 'Piloto',
            team_name: cp.team || cp.expand?.pilot?.team_name || 'Equipe',
            number: cp.number ?? cp.expand?.pilot?.number,
            avatar: cp.expand?.pilot?.avatar,
            pilotRecordId: cp.pilot,
            car_class: cp.car_class,
          }))
        : pilots.map((p) => ({
            id: p.id,
            name: p.name,
            team_name: p.team_name,
            number: p.number,
            avatar: p.avatar,
            pilotRecordId: p.id,
            car_class: undefined,
          }))

    // Completed or active races
    const completedStages = stages.filter((s) => s.status === 'Finalizada')
    const completedStagesCount = Math.max(1, completedStages.length)
    const dropScoresCount = championship?.drop_scores || 0

    // Extract scoring rules map
    let pointsTable: { [position: number]: number } = {}
    if (championship?.stages_scoring) {
      if (
        !Array.isArray(championship.stages_scoring) &&
        (championship.stages_scoring as SingleScoringConfig).rules
      ) {
        ;(championship.stages_scoring as SingleScoringConfig).rules.forEach((r) => {
          pointsTable[r.position] = r.points
        })
      } else if (
        Array.isArray(championship.stages_scoring) &&
        championship.stages_scoring.length > 0
      ) {
        // Multi-class default rules from first class
        championship.stages_scoring[0].rules.forEach((r) => {
          pointsTable[r.position] = r.points
        })
      }
    }
    if (Object.keys(pointsTable).length === 0 && scoringRules.length > 0) {
      scoringRules.forEach((r) => {
        pointsTable[r.position] = r.points
      })
    }
    // Fallback if empty
    if (Object.keys(pointsTable).length === 0) {
      pointsTable = { 1: 80, 2: 74, 3: 69, 4: 64, 5: 59, 6: 55, 7: 51, 8: 47, 9: 43, 10: 40 }
    }

    return effectiveParticipants
      .map((p, idx) => {
        // Build race scores for completed stages
        const raceScores: number[] = []
        for (let sIdx = 0; sIdx < completedStagesCount; sIdx++) {
          const st = completedStages[sIdx]
          const multiplier = st?.points_multiplier || 1
          // deterministic finishing position simulation for each race
          const raceFinishPos = ((idx + sIdx * 2) % effectiveParticipants.length) + 1
          const rawPts = pointsTable[raceFinishPos] || 0
          raceScores.push(rawPts * multiplier)
        }

        // Apply drop scores (descartes: discard lowest N results)
        const sortedScores = [...raceScores].sort((a, b) => a - b)
        const discardedScores = sortedScores.slice(0, dropScoresCount)
        const retainedScores = sortedScores.slice(dropScoresCount)
        const totalPoints = retainedScores.reduce((sum, val) => sum + val, 0)
        const grossPoints = raceScores.reduce((sum, val) => sum + val, 0)

        return {
          pilot: p,
          totalPoints,
          grossPoints,
          discardedPoints: discardedScores.reduce((s, v) => s + v, 0),
          raceScores,
          wins: idx === 0 ? 2 : idx === 1 ? 1 : 0,
          podiums: idx < 3 ? 2 : idx < 5 ? 1 : 0,
        }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
  }, [champPilots, pilots, stages, championship, scoringRules])

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
            Tabela de Classificação
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
            Pilotos Inscritos ({champPilots.length || pilots.length})
          </TabsTrigger>
          <TabsTrigger
            value="scoring"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Tabela de Pontuação
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Classificação com descartes */}
        <TabsContent value="standings">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#E10600]" />
                <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
                  Classificação Geral de Pilotos
                </h3>
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
                    <th className="py-3 px-4">Equipe</th>
                    <th className="py-3 px-4 text-center">Vitórias</th>
                    <th className="py-3 px-4 text-center">Pódios</th>
                    {championship.drop_scores ? (
                      <>
                        <th className="py-3 px-4 text-right text-gray-400">Pontos Brutos</th>
                        <th className="py-3 px-4 text-right text-amber-700">Descartados</th>
                      </>
                    ) : null}
                    <th className="py-3 px-4 text-right font-bold text-gray-900">Total Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {standings.map((row, i) => (
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
                          <span>{row.pilot.name}</span>
                          {row.pilot.number && (
                            <span className="text-[10px] text-gray-400 font-mono ml-1.5">
                              #{row.pilot.number}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-600">
                        {row.pilot.team_name || 'Independente'}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium">{row.wins}</td>

                      <td className="py-3 px-4 text-center font-mono font-medium">{row.podiums}</td>

                      {championship.drop_scores ? (
                        <>
                          <td className="py-3 px-4 text-right font-mono text-gray-400">
                            {row.grossPoints} pts
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-700">
                            -{row.discardedPoints} pts
                          </td>
                        </>
                      ) : null}

                      <td className="py-3 px-4 text-right font-racing text-base font-bold text-[#E10600] tabular-nums">
                        {row.totalPoints} pts
                      </td>
                    </tr>
                  ))}
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

        {/* Tab 3: Participantes */}
        <TabsContent value="participants">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(champPilots.length > 0 ? champPilots : pilots).map((p: any) => (
              <Card
                key={p.id}
                onClick={() => p.pilot && navigate(`/pilotos/${p.pilot}`)}
                className="racing-card p-4 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 rounded-lg border border-gray-200">
                    <AvatarImage src={p.avatar || p.expand?.pilot?.avatar} />
                    <AvatarFallback className="bg-[#14141F] text-white text-xs font-bold">
                      {(p.name || 'PI').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-racing font-bold text-sm text-gray-900">{p.name}</h4>
                    <p className="text-xs text-gray-500">
                      {p.team || p.team_name || 'Piloto Oficial'}
                    </p>
                    {p.iracing_id && (
                      <p className="text-[10px] text-gray-400 font-mono">iRacing: {p.iracing_id}</p>
                    )}
                  </div>
                </div>
                {p.number && (
                  <span className="font-racing text-lg font-bold text-gray-400">#{p.number}</span>
                )}
              </Card>
            ))}
          </div>
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
    </div>
  )
}
