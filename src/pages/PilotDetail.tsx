import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users,
  Trophy,
  Award,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Shield,
  Edit2,
  CheckCircle,
  Flame,
  Layers,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  pilotsService,
  infractionsService,
  championshipsService,
  raceResultsService,
} from '@/services/api'
import type { Pilot, Infraction, Championship, RaceResultRecord } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function PilotDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [pilot, setPilot] = useState<Pilot | null>(null)
  const [infractions, setInfractions] = useState<Infraction[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])
  const [allRaceResults, setAllRaceResults] = useState<RaceResultRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters for stats: Year, Season, Championship
  const [selectedYear, setSelectedYear] = useState<string>('todos')
  const [selectedSeason, setSelectedSeason] = useState<string>('todas')
  const [selectedChamp, setSelectedChamp] = useState<string>('todos')

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [pilotName, setPilotName] = useState('')
  const [pilotNumber, setPilotNumber] = useState<number | ''>('')
  const [pilotIracingId, setPilotIracingId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [pilotStatus, setPilotStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const p = await pilotsService.getOne(id)
      setPilot(p)

      const [infs, champs, results] = await Promise.all([
        infractionsService.list(),
        championshipsService.list(),
        // Fetch active race results by pilot ID or cust_id
        p.iracing_id
          ? raceResultsService.listByCustId(Number(p.iracing_id), true)
          : raceResultsService.listByPilot(id, true),
      ])
      setInfractions(infs.filter((i) => i.pilot_id === id))
      setChampionships(champs)
      setAllRaceResults(results)

      setPilotName(p.name)
      setPilotNumber(p.number ?? '')
      setPilotIracingId(p.iracing_id || '')
      setTeamName(p.team_name || '')
      setPilotStatus(p.status || 'ativo')
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil do piloto.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleSavePilot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !pilotName.trim()) return

    // Validation: prevent duplicate iRacing ID
    const irIdTrim = pilotIracingId.trim()
    if (irIdTrim) {
      const existing = await pilotsService.getByIracingId(irIdTrim)
      if (existing && existing.id !== id) {
        toast({
          title: 'ID iRacing duplicado',
          description: `O ID ${irIdTrim} já pertence ao piloto "${existing.name}". Use um ID único.`,
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setIsSaving(true)
      await pilotsService.update(id, {
        name: pilotName,
        number: pilotNumber !== '' ? Number(pilotNumber) : undefined,
        iracing_id: irIdTrim || undefined,
        team_name: teamName,
        status: pilotStatus,
      })
      toast({ title: 'Sucesso', description: 'Dados do piloto atualizados!' })
      setIsEditOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao atualizar piloto.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  // Extract unique filters from results
  const filterOptions = React.useMemo(() => {
    const years = new Set<string>()
    const seasons = new Set<string>()
    const champs = new Set<{ id: string; name: string }>()

    allRaceResults.forEach((r) => {
      const c =
        r.expand?.championship_id ||
        (r.expand?.stage_race_id?.stage_id as any)?.expand?.championship_id
      if (c) {
        champs.add({ id: c.id, name: c.name })
        const s = c.expand?.season_id
        if (s) {
          seasons.add(s.name)
          const y = s.expand?.year_id?.year
          if (y) years.add(String(y))
        }
      }
    })

    return {
      years: Array.from(years),
      seasons: Array.from(seasons),
      championships: Array.from(champs),
    }
  }, [allRaceResults])

  // Filtered active results
  const filteredResults = React.useMemo(() => {
    return allRaceResults.filter((r) => {
      const c =
        r.expand?.championship_id ||
        (r.expand?.stage_race_id?.stage_id as any)?.expand?.championship_id
      if (selectedChamp !== 'todos' && c?.id !== selectedChamp) return false
      const s = c?.expand?.season_id
      if (selectedSeason !== 'todas' && s?.name !== selectedSeason) return false
      const y = s?.expand?.year_id?.year
      if (selectedYear !== 'todos' && String(y) !== selectedYear) return false
      return true
    })
  }, [allRaceResults, selectedChamp, selectedSeason, selectedYear])

  // Real aggregated stats from active iRacing results
  const hasRealStats = filteredResults.length > 0
  const stats = React.useMemo(() => {
    if (!hasRealStats) {
      // Fallback display if no imported races yet
      return {
        totalPoints: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        fastestLaps: 0,
        racesCompleted: 0,
        totalIncidents: 0,
        avgIncidents: 0,
      }
    }
    const totalPoints = filteredResults.reduce((s, r) => s + (r.total_points || 0), 0)
    const wins = filteredResults.filter(
      (r) => r.finish_position === 1 || r.finish_position_in_class === 1,
    ).length
    const podiums = filteredResults.filter(
      (r) => r.finish_position <= 3 || r.finish_position_in_class <= 3,
    ).length
    const poles = filteredResults.filter((r) => r.is_pole).length
    const fastestLaps = filteredResults.filter((r) => r.is_fastest_lap).length
    const racesCompleted = filteredResults.length
    const totalIncidents = filteredResults.reduce((s, r) => s + (r.incidents || 0), 0)
    const avgIncidents = racesCompleted > 0 ? (totalIncidents / racesCompleted).toFixed(1) : 0

    return {
      totalPoints,
      wins,
      podiums,
      poles,
      fastestLaps,
      racesCompleted,
      totalIncidents,
      avgIncidents,
    }
  }, [filteredResults, hasRealStats])

  if (isLoading || !pilot) {
    return (
      <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
        Carregando perfil do piloto...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/pilotos')}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Pilotos
        </Button>
      </div>

      {/* Header Profile */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 z-10">
          <Avatar className="w-20 h-20 rounded-2xl border-2 border-red-500 shadow-md">
            <AvatarImage src={pilot.avatar} />
            <AvatarFallback className="bg-[#14141F] text-white font-racing text-2xl font-bold">
              {pilot.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] capitalize font-medium ${
                  pilot.status === 'ativo'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}
              >
                {pilot.status || 'ativo'}
              </Badge>
              {pilot.number && (
                <span className="font-racing text-xs font-bold text-[#E10600]">
                  Carro #{pilot.number}
                </span>
              )}
              {pilot.iracing_id && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-red-50 text-[#E10600] border-red-200 font-mono"
                >
                  iRacing ID: {pilot.iracing_id}
                </Badge>
              )}
            </div>

            <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase">
              {pilot.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Equipe: <span className="text-gray-800">{pilot.team_name || 'Piloto Privado'}</span>
              {pilot.country_code && (
                <span className="ml-2 text-gray-400 font-mono">({pilot.country_code})</span>
              )}
            </p>
          </div>
        </div>

        {isCollaborator && (
          <div className="z-10">
            <Button
              onClick={() => setIsEditOpen(true)}
              variant="outline"
              size="sm"
              className="text-xs font-semibold text-gray-700 border-gray-300 hover:bg-gray-100"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5 text-[#E10600]" />
              Editar Piloto
            </Button>
          </div>
        )}
      </div>

      {/* Filters Bar: Ano, Temporada, Campeonato */}
      <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-racing uppercase tracking-wider text-gray-700">
          <Filter className="w-4 h-4 text-[#E10600]" />
          <span>Filtro de Estatísticas:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Ano */}
          {filterOptions.years.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500">Ano:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-gray-50 border border-gray-300 rounded-lg text-xs px-2.5 py-1 text-gray-800 focus:outline-none"
              >
                <option value="todos">Todos os Anos</option>
                {filterOptions.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Temporada */}
          {filterOptions.seasons.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500">Temporada:</span>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="bg-gray-50 border border-gray-300 rounded-lg text-xs px-2.5 py-1 text-gray-800 focus:outline-none"
              >
                <option value="todas">Todas as Temporadas</option>
                {filterOptions.seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Campeonato */}
          {filterOptions.championships.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500">Campeonato:</span>
              <select
                value={selectedChamp}
                onChange={(e) => setSelectedChamp(e.target.value)}
                className="bg-gray-50 border border-gray-300 rounded-lg text-xs px-2.5 py-1 text-gray-800 focus:outline-none"
              >
                <option value="todos">Todos os Campeonatos</option>
                {filterOptions.championships.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedYear !== 'todos' ||
            selectedSeason !== 'todas' ||
            selectedChamp !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedYear('todos')
                setSelectedSeason('todas')
                setSelectedChamp('todos')
              }}
              className="text-[11px] text-gray-500 hover:text-[#E10600] h-7"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </Card>

      {/* 6 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="racing-card p-3 text-center border-l-4 border-l-[#E10600]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Pontos Totais
          </span>
          <span className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 block tabular-nums">
            {stats.totalPoints}
          </span>
        </Card>

        <Card className="racing-card p-3 text-center border-l-4 border-l-amber-500">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Vitórias
          </span>
          <span className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 block tabular-nums">
            {stats.wins}
          </span>
        </Card>

        <Card className="racing-card p-3 text-center border-l-4 border-l-blue-600">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Pódios
          </span>
          <span className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 block tabular-nums">
            {stats.podiums}
          </span>
        </Card>

        <Card className="racing-card p-3 text-center border-l-4 border-l-emerald-600">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Corridas
          </span>
          <span className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 block tabular-nums">
            {stats.racesCompleted}
          </span>
        </Card>

        <Card className="racing-card p-3 text-center border-l-4 border-l-purple-600">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Poles / V. Rápida
          </span>
          <span className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 block tabular-nums">
            {stats.poles} / {stats.fastestLaps}
          </span>
        </Card>

        <Card className="racing-card p-3 text-center border-l-4 border-l-rose-500">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Incidentes / Média
          </span>
          <span className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 block tabular-nums">
            {stats.totalIncidents}x ({stats.avgIncidents}x)
          </span>
        </Card>
      </div>

      {/* Tabs: Resultados Oficiais iRacing, Carreira e Histórico Disciplinar */}
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="bg-gray-100 p-1 border border-gray-200 rounded-xl mb-4">
          <TabsTrigger
            value="results"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Resultados Oficiais de Provas ({filteredResults.length})
          </TabsTrigger>
          <TabsTrigger
            value="career"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Linha do Tempo de Campeonatos
          </TabsTrigger>
          <TabsTrigger
            value="infractions"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Histórico Disciplinar ({infractions.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resultados Oficiais iRacing */}
        <TabsContent value="results">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {filteredResults.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Trophy className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-medium text-gray-700">
                  Nenhum resultado de corrida importado encontrado com os filtros selecionados.
                </p>
                <p className="text-xs text-gray-400">
                  Os resultados exportados do iRacing aparecem aqui automaticamente após a
                  importação na etapa.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-14 text-center">Pos</th>
                      <th className="py-3 px-4">Prova / Campeonato</th>
                      <th className="py-3 px-4">Carro / Categoria</th>
                      <th className="py-3 px-4 text-center">Melhor Volta</th>
                      <th className="py-3 px-4 text-center">Pole</th>
                      <th className="py-3 px-4 text-center">Incidentes</th>
                      <th className="py-3 px-4 text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredResults.map((res) => {
                      const cName =
                        res.expand?.championship_id?.name ||
                        (res.expand?.stage_race_id?.stage_id as any)?.expand?.championship_id
                          ?.name ||
                        'Campeonato'
                      const raceName = res.expand?.stage_race_id?.name || 'Corrida'

                      return (
                        <tr key={res.id} className="hover:bg-red-50/30 transition-colors">
                          <td className="py-3 px-4 text-center font-racing font-bold">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs ${
                                res.finish_position === 1
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : res.finish_position === 2
                                    ? 'bg-slate-200 text-slate-800'
                                    : res.finish_position === 3
                                      ? 'bg-amber-800/20 text-amber-900'
                                      : 'text-gray-500'
                              }`}
                            >
                              {res.finish_position}º
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900">{raceName}</div>
                            <div className="text-[11px] text-gray-500">{cName}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-gray-800">{res.car_name || '-'}</div>
                            <div className="text-[11px] text-[#E10600]">{res.car_class_name}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span
                              className={
                                res.is_fastest_lap ? 'text-purple-600 font-bold' : 'text-gray-600'
                              }
                            >
                              {res.best_lap_time_str || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {res.is_pole ? (
                              <Badge className="bg-amber-100 text-amber-800 border-none text-[9px] uppercase font-bold">
                                Pole
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] ${
                                (res.incidents || 0) >= 10
                                  ? 'bg-red-100 text-red-700 font-bold'
                                  : (res.incidents || 0) > 0
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {res.incidents ?? 0}x
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-racing text-base font-bold text-[#E10600] tabular-nums">
                            {res.total_points ?? 0} pts
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Career Timeline */}
        <TabsContent value="career">
          <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
            <h3 className="font-racing text-base font-bold text-[#1E1E2F] uppercase border-b border-gray-100 pb-2">
              Histórico em Campeonatos
            </h3>

            <div className="relative border-l-2 border-red-500 ml-4 pl-6 space-y-6">
              {championships.map((champ, index) => {
                const finishPos =
                  index === 0 ? '1º Lugar (Campeão)' : index === 1 ? '3º Lugar' : '5º Lugar'

                return (
                  <div key={champ.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#E10600] group-hover:bg-[#E10600] transition-colors" />

                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white transition-all space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-racing text-sm font-bold text-gray-900">
                          {champ.name}
                        </span>
                        <Badge className="bg-red-50 text-[#E10600] border-none text-[10px] font-bold">
                          {finishPos}
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-500">
                        {champ.expand?.season_id?.name || 'Temporada Oficial'} • Status:{' '}
                        {champ.status}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        {/* Infractions */}
        <TabsContent value="infractions">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {infractions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium text-gray-800">Conduta Impecável</p>
                <p className="text-xs text-gray-500">
                  Nenhuma infração registrada para este piloto no tribunal de comissários.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase">
                      <th className="py-3 px-4">Tipo da Infração</th>
                      <th className="py-3 px-4">Severidade</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {infractions.map((inf) => (
                      <tr key={inf.id} className="hover:bg-red-50/30">
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {inf.type.replace(/_/g, ' ').toUpperCase()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[9px] uppercase font-bold ${
                              inf.severity === 'alta'
                                ? 'bg-red-100 text-red-700'
                                : inf.severity === 'media'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {inf.severity}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-sm">
                          {inf.description || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[9px] capitalize">
                            {inf.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-gray-500">
                          {new Date(inf.created).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Pilot Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
              Editar Dados do Piloto
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePilot} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name" className="text-xs font-semibold uppercase text-gray-700">
                Nome Completo *
              </Label>
              <Input
                id="p-name"
                value={pilotName}
                onChange={(e) => setPilotName(e.target.value)}
                required
                className="bg-[#F5F5F7] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-num" className="text-xs font-semibold uppercase text-gray-700">
                  Número
                </Label>
                <Input
                  id="p-num"
                  type="number"
                  value={pilotNumber}
                  onChange={(e) =>
                    setPilotNumber(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="bg-[#F5F5F7] text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-700">Status</Label>
                <Select value={pilotStatus} onValueChange={(val: any) => setPilotStatus(val)}>
                  <SelectTrigger className="text-xs bg-[#F5F5F7]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="p-iracing-id"
                  className="text-xs font-semibold uppercase text-gray-700"
                >
                  ID iRacing (Único)
                </Label>
                <Input
                  id="p-iracing-id"
                  placeholder="Ex: 569362"
                  value={pilotIracingId}
                  onChange={(e) => setPilotIracingId(e.target.value)}
                  className="bg-[#F5F5F7] text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-name" className="text-xs font-semibold uppercase text-gray-700">
                  Equipe
                </Label>
                <Input
                  id="t-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="bg-[#F5F5F7] text-sm"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-[#E10600] hover:bg-[#C00500] text-white"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
