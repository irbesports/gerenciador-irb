import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Trophy,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Edit2,
  Trash2,
  Eye,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  championshipsService,
  championshipEditionService,
  seasonsService,
  yearsService,
  pilotsService,
} from '@/services/api'
import type { Championship, ChampionshipEdition, Season, Year, Pilot } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'

export default function ChampionshipsList() {
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [championships, setChampionships] = useState<Championship[]>([])
  const [editions, setEditions] = useState<ChampionshipEdition[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [years, setYears] = useState<Year[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedYearId, setSelectedYearId] = useState<string>('all')
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('all')

  const loadData = async () => {
    try {
      const [c, s, y, p, eds] = await Promise.all([
        championshipsService.list(),
        seasonsService.list(),
        yearsService.list(),
        pilotsService.list(),
        championshipEditionService.listAll().catch(() => []),
      ])
      setChampionships(c)
      setEditions(eds)
      setSeasons(s)
      setYears(y)
      setPilots(p)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os campeonatos.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime<Championship>('championships', () => {
    loadData()
  })

  // Filtered seasons based on selected year
  const availableSeasons = useMemo(() => {
    if (selectedYearId === 'all') return seasons
    return seasons.filter((s) => s.year_id === selectedYearId)
  }, [seasons, selectedYearId])

  // Filtered championships resolvendo Season preferencialmente via Championship Edition
  const filteredChampionships = useMemo(() => {
    return championships.filter((c) => {
      // Search text
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())

      // Obter Season autoritativa através da Championship Edition correspondente
      const edition = editions.find((ed) => ed.championship_id === c.id)
      const effectiveSeasonId = edition?.season_id || c.season_id

      // Season filter
      if (selectedSeasonId !== 'all' && effectiveSeasonId !== selectedSeasonId) {
        return false
      }

      // Year filter (if season not specifically chosen)
      if (selectedYearId !== 'all') {
        const season = seasons.find((s) => s.id === effectiveSeasonId)
        if (!season || season.year_id !== selectedYearId) return false
      }

      return matchesSearch
    })
  }, [championships, editions, search, selectedYearId, selectedSeasonId, seasons])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Tem certeza que deseja remover este campeonato?')) return

    try {
      await championshipsService.delete(id)
      toast({ title: 'Sucesso', description: 'Campeonato excluído.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o campeonato.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Campeonatos
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Gerenciamento oficial de torneios, grids e pontuações
          </p>
        </div>

        {isCollaborator && (
          <Button
            onClick={() => navigate('/dashboard/campeonatos/novo')}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Campeonato
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-[#F5F5F7] border-gray-300"
            />
          </div>

          <div>
            <Select
              value={selectedYearId}
              onValueChange={(val) => {
                setSelectedYearId(val)
                setSelectedSeasonId('all')
              }}
            >
              <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                <SelectValue placeholder="Filtrar por Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Anos</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.year} - {y.name || 'Temporada Esportiva'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
              <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                <SelectValue placeholder="Filtrar por Temporada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Temporadas</SelectItem>
                {availableSeasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Championships Table / Grid */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
            Carregando campeonatos...
          </div>
        ) : filteredChampionships.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Trophy className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-600 font-medium">Nenhum campeonato encontrado.</p>
            <p className="text-xs text-gray-400">
              Tente ajustar seus filtros ou cadastre um novo torneio.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Nome do Campeonato</th>
                  <th className="py-3 px-4">Ref. iRacing</th>
                  <th className="py-3 px-4">Temporada</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Nº Pilotos</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredChampionships.map((champ) => {
                  const edition = editions.find((ed) => ed.championship_id === champ.id)
                  const effectiveSeasonId = edition?.season_id || champ.season_id
                  const season = seasons.find((s) => s.id === effectiveSeasonId)
                  const seasonYear = season?.year_id
                    ? years.find((y) => y.id === season.year_id)?.year
                    : null

                  return (
                    <tr
                      key={champ.id}
                      onClick={() => navigate(`/dashboard/campeonatos/${champ.id}`)}
                      className="hover:bg-red-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-medium text-gray-900 group-hover:text-[#E10600]">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-[#E10600] shrink-0" />
                          <span className="font-racing text-sm">{champ.name}</span>
                        </div>
                        {champ.description && (
                          <p className="text-[11px] text-gray-500 truncate max-w-md mt-0.5">
                            {champ.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {champ.iracing_series_id ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            ID: {champ.iracing_series_id}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {season ? (
                          <Link
                            to={`/dashboard/temporadas`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-800 hover:text-[#E10600] font-medium flex items-center gap-1"
                          >
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{season.name}</span>
                            {seasonYear && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                ({seasonYear})
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize font-medium ${
                            champ.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : champ.status === 'concluido'
                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}
                        >
                          {champ.status || 'rascunho'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-medium text-gray-800">
                        {pilots.length}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/dashboard/campeonatos/${champ.id}`)
                            }}
                            className="h-7 w-7 text-gray-500 hover:text-gray-900"
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {isCollaborator && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/dashboard/campeonatos/${champ.id}/editar`)
                                }}
                                className="h-7 w-7 text-gray-500 hover:text-blue-600"
                                title="Editar campeonato"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDelete(champ.id, e)}
                                className="h-7 w-7 text-gray-500 hover:text-red-600"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
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
    </div>
  )
}
