import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Trophy,
  Calendar,
  Users,
  Award,
  Plus,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { championshipsService, seasonsService, yearsService, pilotsService } from '@/services/api'
import type { Championship, Season, Year, Pilot } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { ChampionshipTree } from '@/components/ChampionshipTree'
import useRealtime from '@/hooks/use-realtime'

export default function Index() {
  const navigate = useNavigate()
  const { user, isCollaborator } = useAuth()

  const [championships, setChampionships] = useState<Championship[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [years, setYears] = useState<Year[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      const [c, s, y, p] = await Promise.all([
        championshipsService.list(),
        seasonsService.list(),
        yearsService.list(),
        pilotsService.list(),
      ])
      setChampionships(c)
      setSeasons(s)
      setYears(y)
      setPilots(p)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime championship updates
  useRealtime<Championship>('championships', () => {
    loadData()
  })

  // Calculate stats
  const totalChampionships = championships.length
  const activeSeasons = seasons.filter((s) => s.status === 'ativa').length
  const totalPilots = pilots.length
  // Estimated distributed points: 25+18+15+12+10+8+6+4+2+1 = 101 points per round across championships
  const totalPointsDistributed = championships.filter((c) => c.status !== 'rascunho').length * 101

  // Build hierarchical tree data: Year -> Seasons -> Championships
  const treeData = useMemo(() => {
    return years.map((year) => {
      const yearSeasons = seasons.filter((s) => s.year_id === year.id)
      return {
        year,
        seasons: yearSeasons.map((season) => ({
          season,
          championships: championships.filter((c) => c.season_id === season.id),
        })),
      }
    })
  }, [years, seasons, championships])

  // Recent 5 championships
  const recentChampionships = useMemo(() => {
    return [...championships]
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, 5)
  }, [championships])

  const currentDateFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-red-50 to-transparent pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-bold text-[#E10600]">
              Painel de Controle
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 capitalize">{currentDateFormatted}</span>
          </div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Bem-vindo, <span className="text-[#E10600]">{user?.name || 'Comandante'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Acompanhe o status das competições, pilotos e fluxo esportivo em tempo real.
          </p>
        </div>

        {/* Quick Action Buttons */}
        {isCollaborator && (
          <div className="flex flex-wrap items-center gap-2.5 z-10">
            <Button
              onClick={() => navigate('/campeonatos/novo')}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Novo Campeonato
            </Button>
            <Button
              onClick={() => navigate('/temporadas/novo')}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold"
            >
              <Calendar className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
              Nova Temporada
            </Button>
            <Button
              onClick={() => navigate('/pilotos')}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold"
            >
              <Users className="w-3.5 h-3.5 mr-1 text-gray-600" />
              Novo Piloto
            </Button>
          </div>
        )}
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="racing-card p-5 border-l-4 border-l-[#E10600]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total de Campeonatos
              </p>
              <h3 className="font-racing text-3xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
                {isLoading ? '-' : totalChampionships}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> Ativos
                </span>{' '}
                na plataforma
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 text-[#E10600] flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="racing-card p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Temporadas Ativas
              </p>
              <h3 className="font-racing text-3xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
                {isLoading ? '-' : activeSeasons}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Em andamento neste ano</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="racing-card p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Pilotos Registrados
              </p>
              <h3 className="font-racing text-3xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
                {isLoading ? '-' : totalPilots}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Grid de competidores</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="racing-card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Pontos Distribuídos
              </p>
              <h3 className="font-racing text-3xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
                {isLoading ? '-' : totalPointsDistributed.toLocaleString('pt-BR')}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Acumulados no ranking</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Hierarchy Tree on Left, Recent Championships on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Championship Hierarchy Tree */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-5 bg-[#E10600] rounded-sm" />
              <h2 className="font-racing text-lg font-bold text-[#1E1E2F] uppercase tracking-wide">
                Estrutura de Campeonatos (Ano → Temporada → Campeonato)
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/campeonatos')}
              className="text-xs text-gray-500 hover:text-[#E10600]"
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <Card className="p-4 bg-white border border-[#E5E7EB] shadow-sm rounded-xl">
            <ChampionshipTree treeData={treeData} isLoading={isLoading} />
          </Card>
        </div>

        {/* Right Column (1 col): Recent 5 Championships */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-5 bg-[#14141F] rounded-sm" />
              <h2 className="font-racing text-lg font-bold text-[#1E1E2F] uppercase tracking-wide">
                Campeonatos Recentes
              </h2>
            </div>
          </div>

          <Card className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden divide-y divide-gray-100">
            {recentChampionships.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                Nenhum campeonato registrado.
              </div>
            ) : (
              recentChampionships.map((champ) => {
                const seasonName = champ.expand?.season_id?.name || 'Temporada Oficial'

                return (
                  <div
                    key={champ.id}
                    onClick={() => navigate(`/campeonatos/${champ.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors group flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-racing text-sm font-bold text-gray-900 group-hover:text-[#E10600] transition-colors truncate block">
                          {champ.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate">{seasonName}</span>
                        <span>•</span>
                        <span className="flex items-center text-gray-600 font-mono text-[11px]">
                          {pilots.length} pilotos
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize font-medium ${
                          champ.status === 'ativo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : champ.status === 'concluido'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-gray-50 text-gray-600 border-gray-300'
                        }`}
                      >
                        {champ.status || 'ativo'}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#E10600] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                )
              })
            )}

            <div className="p-3 bg-gray-50 text-center">
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate('/campeonatos')}
                className="text-xs text-[#E10600] font-semibold hover:underline"
              >
                Gerenciar Todos os Campeonatos
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
