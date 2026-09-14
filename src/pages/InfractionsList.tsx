import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Plus, Search, Filter, ShieldAlert, CheckCircle, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { infractionsService, pilotsService, championshipsService } from '@/services/api'
import type { Infraction, InfractionStatus, Pilot, Championship } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'

export default function InfractionsList() {
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [infractions, setInfractions] = useState<Infraction[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      const [infList, pList, cList] = await Promise.all([
        infractionsService.list(statusFilter),
        pilotsService.list(),
        championshipsService.list(),
      ])
      setInfractions(infList)
      setPilots(pList)
      setChampionships(cList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as infrações.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  useRealtime<Infraction>('infractions', () => loadData())

  const filteredInfractions = useMemo(() => {
    return infractions.filter((inf) => {
      const pilot = pilots.find((p) => p.id === inf.pilot_id)
      const champ = championships.find((c) => c.id === inf.championship_id)

      const matchesSearch =
        (pilot && pilot.name.toLowerCase().includes(search.toLowerCase())) ||
        (champ && champ.name.toLowerCase().includes(search.toLowerCase())) ||
        inf.type.toLowerCase().includes(search.toLowerCase())

      return matchesSearch
    })
  }, [infractions, pilots, championships, search])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir este registro de infração?')) return
    try {
      await infractionsService.delete(id)
      toast({ title: 'Sucesso', description: 'Infração removida.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao remover.', variant: 'destructive' })
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: InfractionStatus) => {
    try {
      await infractionsService.update(id, { status: newStatus })
      toast({ title: 'Status Atualizado', description: `Infração marcada como ${newStatus}.` })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao atualizar status.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Tribunal Desportivo & Infrações
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Julgamento de incidentes de pista, condutas antidesportivas e penalidades
          </p>
        </div>

        <Button
          onClick={() => navigate('/dashboard/infracoes/novo')}
          className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Infração
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por piloto ou campeonato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-[#F5F5F7]"
            />
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs bg-[#F5F5F7]">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_revisao">Em Revisão</SelectItem>
                <SelectItem value="resolvida">Resolvida</SelectItem>
                <SelectItem value="descartada">Descartada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
            Carregando infrações...
          </div>
        ) : filteredInfractions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Nenhuma infração encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Piloto</th>
                  <th className="py-3 px-4">Campeonato</th>
                  <th className="py-3 px-4">Tipo da Infração</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Severidade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data</th>
                  {isCollaborator && <th className="py-3 px-4 text-right">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredInfractions.map((inf) => {
                  const pilot = pilots.find((p) => p.id === inf.pilot_id)
                  const champ = championships.find((c) => c.id === inf.championship_id)

                  return (
                    <tr key={inf.id} className="hover:bg-red-50/30">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {pilot?.name || 'Piloto'}
                      </td>

                      <td className="py-3.5 px-4 text-gray-600">{champ?.name || 'Campeonato'}</td>

                      <td className="py-3.5 px-4 font-medium text-gray-900">
                        {inf.type.replace(/_/g, ' ').toUpperCase()}
                      </td>

                      <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">
                        {inf.description || '-'}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          className={`text-[9px] uppercase font-bold ${
                            inf.severity === 'alta'
                              ? 'bg-red-100 text-red-700'
                              : inf.severity === 'media'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {inf.severity}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize font-medium ${
                            inf.status === 'resolvida'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : inf.status === 'em_revisao'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : inf.status === 'descartada'
                                  ? 'bg-gray-100 text-gray-500 border-gray-300'
                                  : 'bg-red-50 text-red-700 border-red-300'
                          }`}
                        >
                          {inf.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                        {new Date(inf.created).toLocaleDateString('pt-BR')}
                      </td>

                      {isCollaborator && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {inf.status !== 'resolvida' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateStatus(inf.id, 'resolvida')}
                                className="h-7 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                Resolver
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(inf.id)}
                              className="h-7 w-7 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
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
