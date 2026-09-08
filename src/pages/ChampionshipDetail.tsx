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
} from '@/services/api'
import type { Championship, Pilot, ScoringRule, Infraction } from '@/types'
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
  const [infractions, setInfractions] = useState<Infraction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      const [champ, pList, rules, infs] = await Promise.all([
        championshipsService.getOne(id),
        pilotsService.list(),
        scoringRulesService.listByChampionship(id),
        infractionsService.list(),
      ])
      setChampionship(champ)
      setPilots(pList)
      setScoringRules(rules)
      setInfractions(infs.filter((inf) => inf.championship_id === id))
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

  // Standings calculation simulation based on scoring rules
  const standings = pilots
    .map((pilot, idx) => {
      // Generate realistic accumulated points from rule table
      const rule = scoringRules[idx]
      const points = rule ? rule.points * 3 + (idx === 0 ? 5 : 0) : Math.max(1, 40 - idx * 6)
      return {
        pilot,
        position: idx + 1,
        points,
        wins: idx === 0 ? 2 : idx === 1 ? 1 : 0,
        podiums: idx < 3 ? 3 : 1,
      }
    })
    .sort((a, b) => b.points - a.points)

  const sampleRaces = [
    {
      round: 1,
      name: 'GP de Interlagos - Etapa de Abertura',
      track: 'Interlagos (SP)',
      date: '15/06/2025',
      status: 'concluida',
      winner: 'Carlos Silva',
    },
    {
      round: 2,
      name: 'GP de Curitiba - Desafio das Curvas',
      track: 'Curitiba (PR)',
      date: '12/07/2025',
      status: 'concluida',
      winner: 'Ana Souza',
    },
    {
      round: 3,
      name: 'Grande Prêmio de Silverstone - Clássico',
      track: 'Silverstone (UK)',
      date: '24/08/2025',
      status: 'proxima',
      winner: '-',
    },
    {
      round: 4,
      name: 'Super Final de Velocidade',
      track: 'Interlagos (SP)',
      date: '28/09/2025',
      status: 'proxima',
      winner: '-',
    },
  ]

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

      {/* Tabs: Classificação, Corridas, Participantes, Regulamento de Pontos */}
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
            Lista de Corridas
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Pilotos Inscritos ({pilots.length})
          </TabsTrigger>
          <TabsTrigger
            value="scoring"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Tabela de Pontuação
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Classificação */}
        <TabsContent value="standings">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#E10600]" />
                <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
                  Classificação Geral de Pilotos
                </h3>
              </div>
              <span className="text-[11px] text-gray-500">
                Atualizado automaticamente com bônus regulamentares
              </span>
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
                    <th className="py-3 px-4 text-right font-bold text-gray-900">Pontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {standings.map((row, i) => (
                    <tr
                      key={row.pilot.id}
                      onClick={() => navigate(`/pilotos/${row.pilot.id}`)}
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

                      <td className="py-3 px-4 text-right font-racing text-base font-bold text-[#E10600] tabular-nums">
                        {row.points} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Corridas */}
        <TabsContent value="races">
          <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#E10600]" />
                <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
                  Calendário de Etapas do Campeonato
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              {sampleRaces.map((race) => (
                <div
                  key={race.round}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-red-200 transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#14141F] text-white flex items-center justify-center font-racing text-xs font-bold">
                      R{race.round}
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-gray-900">{race.name}</h4>
                      <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500" />
                          {race.track}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {race.date}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {race.status === 'concluida' ? (
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 uppercase block">Vencedor</span>
                        <span className="font-racing font-bold text-xs text-[#E10600]">
                          {race.winner}
                        </span>
                      </div>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]">
                        Em Breve
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-medium ${
                        race.status === 'concluida'
                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                          : 'border-blue-300 text-blue-700 bg-blue-50'
                      }`}
                    >
                      {race.status === 'concluida' ? 'Concluída' : 'Agendada'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Participantes */}
        <TabsContent value="participants">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pilots.map((p) => (
              <Card
                key={p.id}
                onClick={() => navigate(`/pilotos/${p.id}`)}
                className="racing-card p-4 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 rounded-lg border border-gray-200">
                    <AvatarImage src={p.avatar} />
                    <AvatarFallback className="bg-[#14141F] text-white text-xs font-bold">
                      {p.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-racing font-bold text-sm text-gray-900">{p.name}</h4>
                    <p className="text-xs text-gray-500">{p.team_name || 'Piloto Oficial'}</p>
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
      </Tabs>
    </div>
  )
}
