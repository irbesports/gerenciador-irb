import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Calendar, Plus, Trophy, Edit2, Trash2, Eye } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { seasonsService, yearsService, championshipsService } from '@/services/api'
import type { Season, Year, Championship } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function SeasonsList() {
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [seasons, setSeasons] = useState<Season[]>([])
  const [years, setYears] = useState<Year[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      const [s, y, c] = await Promise.all([
        seasonsService.list(),
        yearsService.list(),
        championshipsService.list(),
      ])
      setSeasons(s)
      setYears(y)
      setChampionships(c)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as temporadas.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta temporada?')) return
    try {
      await seasonsService.delete(id)
      toast({ title: 'Sucesso', description: 'Temporada removida.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao excluir a temporada.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Temporadas
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Períodos de competição oficiais por ano esportivo
          </p>
        </div>

        {isCollaborator && (
          <Button
            onClick={() => navigate('/dashboard/temporadas/novo')}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Temporada
          </Button>
        )}
      </div>

      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
            Carregando temporadas...
          </div>
        ) : seasons.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Nenhuma temporada cadastrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ano Vinculado</th>
                  <th className="py-3 px-4">Nome da Temporada</th>
                  <th className="py-3 px-4">Período (Início / Fim)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Nº Campeonatos</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {seasons.map((season) => {
                  const year = years.find((y) => y.id === season.year_id)
                  const countChamps = championships.filter((c) => c.season_id === season.id).length

                  return (
                    <tr key={season.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-racing text-sm font-bold text-gray-900">
                        {year ? (
                          <Link
                            to="/dashboard/anos"
                            className="text-gray-800 hover:text-[#E10600] underline decoration-gray-300"
                          >
                            {year.year}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#E10600]" />
                          <span>{season.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                        {season.start_date
                          ? new Date(season.start_date).toLocaleDateString('pt-BR')
                          : 'A definir'}{' '}
                        às{' '}
                        {season.end_date
                          ? new Date(season.end_date).toLocaleDateString('pt-BR')
                          : 'A definir'}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize font-medium ${
                            season.status === 'ativa'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : season.status === 'concluida'
                                ? 'bg-gray-100 text-gray-600 border-gray-300'
                                : 'bg-blue-50 text-blue-700 border-blue-300'
                          }`}
                        >
                          {season.status || 'planejada'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#E10600]">
                        {countChamps}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isCollaborator && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  navigate(`/dashboard/temporadas/${season.id}/editar`)
                                }
                                className="h-7 w-7 text-gray-500 hover:text-blue-600"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(season.id)}
                                className="h-7 w-7 text-gray-500 hover:text-red-600"
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
