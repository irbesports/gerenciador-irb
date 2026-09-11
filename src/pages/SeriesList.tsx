import React, { useEffect, useState, useMemo } from 'react'
import {
  Flag,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Hash,
  ExternalLink,
  Upload,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { seriesService, getFileUrl, championshipsService } from '@/services/api'
import type { Series, SeriesStatus, Championship } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'

export default function SeriesList() {
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Series | null>(null)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [description, setDescription] = useState('')
  const [iracingSeriesId, setIracingSeriesId] = useState('')
  const [status, setStatus] = useState<SeriesStatus>('ativa')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [existingLogo, setExistingLogo] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    try {
      const [seriesData, champData] = await Promise.all([
        seriesService.list(),
        championshipsService.list(),
      ])
      setSeriesList(seriesData)
      setChampionships(champData)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar as séries cadastradas.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime<Series>('series', () => {
    loadData()
  })

  // Championships count per series
  const championshipCountBySeries = useMemo(() => {
    const map = new Map<string, number>()
    championships.forEach((c) => {
      if (c.series_id) {
        map.set(c.series_id, (map.get(c.series_id) || 0) + 1)
      }
    })
    return map
  }, [championships])

  // Filtered series
  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.short_name && s.short_name.toLowerCase().includes(q)) ||
        (s.iracing_series_id && s.iracing_series_id.includes(q))

      const matchesStatus = statusFilter === 'todos' || (s.status || 'ativa') === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [seriesList, search, statusFilter])

  const handleOpenCreate = () => {
    setEditing(null)
    setName('')
    setShortName('')
    setDescription('')
    setIracingSeriesId('')
    setStatus('ativa')
    setLogoFile(null)
    setExistingLogo(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: Series) => {
    setEditing(item)
    setName(item.name || '')
    setShortName(item.short_name || '')
    setDescription(item.description || '')
    setIracingSeriesId(item.iracing_series_id || '')
    setStatus(item.status || 'ativa')
    setLogoFile(null)
    setExistingLogo(item.logo ? getFileUrl('series', item.id, item.logo) : null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, seriesName: string) => {
    const champCount = championshipCountBySeries.get(id) || 0
    if (champCount > 0) {
      const confirmMsg = `Esta série possui ${champCount} campeonato(s) associado(s). Deseja realmente excluí-la?`
      if (!window.confirm(confirmMsg)) return
    } else {
      if (!window.confirm(`Deseja excluir a série "${seriesName}"?`)) return
    }

    try {
      await seriesService.delete(id)
      toast({ title: 'Sucesso', description: 'Série excluída com sucesso.' })
      loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao excluir a série.',
        variant: 'destructive',
      })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: 'Atenção',
        description: 'O nome da série é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)

      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('short_name', shortName.trim())
      formData.append('description', description.trim())
      formData.append('iracing_series_id', iracingSeriesId.trim())
      formData.append('status', status)

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      if (editing) {
        await seriesService.update(editing.id, formData as any)
        toast({ title: 'Sucesso', description: 'Série atualizada com sucesso.' })
      } else {
        await seriesService.create(formData as any)
        toast({ title: 'Sucesso', description: 'Nova série cadastrada com sucesso!' })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Ocorreu um erro ao salvar a série.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-6 bg-[#E10600] rounded-sm inline-block shadow-[0_0_8px_rgba(225,6,0,0.5)]"></span>
            <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
              Séries de Corrida
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 pl-4">
            Categorias oficiais de competição. Conforme a regra mestre: 1 campeonato = 1 série
            vinculada.
          </p>
        </div>

        {isCollaborator && (
          <Button
            onClick={handleOpenCreate}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Série
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, sigla ou ID do iRacing..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-[#F5F5F7] border-gray-300"
            />
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="inativa">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Series Grid / Table */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
            Carregando séries...
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Flag className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-600 font-medium">Nenhuma série encontrada.</p>
            <p className="text-xs text-gray-400">
              Cadastre novas séries de competição para vincular aos campeonatos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Série / Categoria</th>
                  <th className="py-3 px-4">Sigla / Nome Curto</th>
                  <th className="py-3 px-4">ID iRacing</th>
                  <th className="py-3 px-4 text-center">Campeonatos</th>
                  <th className="py-3 px-4">Status</th>
                  {isCollaborator && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredSeries.map((s) => {
                  const logoUrl = s.logo ? getFileUrl('series', s.id, s.logo) : null
                  const champCount = championshipCountBySeries.get(s.id) || 0
                  const isAtiva = (s.status || 'ativa') === 'ativa'

                  return (
                    <tr key={s.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={s.name}
                              className="w-9 h-9 rounded-lg object-contain bg-gray-100 p-1 border border-gray-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#14141F] text-[#E10600] flex items-center justify-center font-racing font-bold text-xs shrink-0 border border-gray-800">
                              <Flag className="w-4 h-4 text-[#E10600]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-racing text-sm font-bold text-gray-900 block leading-tight">
                              {s.name}
                            </span>
                            {s.description && (
                              <p className="text-[11px] text-gray-500 truncate max-w-md mt-0.5">
                                {s.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-gray-800">
                        {s.short_name ? (
                          <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-800">
                            {s.short_name}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {s.iracing_series_id ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            <Hash className="w-3 h-3 text-slate-400" />
                            {s.iracing_series_id}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Não vinculado</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-800">
                        <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-[#E10600] border border-red-100">
                          {champCount}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize font-medium ${
                            isAtiva
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}
                        >
                          {isAtiva ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ativa
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Inativa
                            </span>
                          )}
                        </Badge>
                      </td>

                      {isCollaborator && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(s)}
                              className="h-7 w-7 text-gray-500 hover:text-blue-600"
                              title="Editar série"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(s.id, s.name)}
                              className="h-7 w-7 text-gray-500 hover:text-red-600"
                              title="Excluir série"
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

      {/* Modal Dialog Criar / Editar Série */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#14141F] text-white border border-[#2A2A3D] shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-3">
            <DialogTitle className="font-racing text-lg font-bold text-white uppercase flex items-center gap-2">
              <Flag className="w-5 h-5 text-[#E10600]" />
              {editing ? 'Editar Série de Corrida' : 'Cadastrar Nova Série'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Nome da Série */}
            <div className="space-y-1.5">
              <Label
                htmlFor="series-name"
                className="text-xs font-semibold uppercase text-gray-300"
              >
                Nome da Série *
              </Label>
              <Input
                id="series-name"
                placeholder="Ex: Stock Car Pro Series Brasil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600] text-sm"
              />
            </div>

            {/* Nome Curto / Sigla + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="series-short"
                  className="text-xs font-semibold uppercase text-gray-300"
                >
                  Nome Curto / Sigla
                </Label>
                <Input
                  id="series-short"
                  placeholder="Ex: Stock Car"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600] text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-300">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as SeriesStatus)}>
                  <SelectTrigger className="text-xs bg-[#1F1F30] border-white/10 text-white focus:ring-[#E10600]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ID iRacing Series */}
            <div className="space-y-1.5">
              <Label
                htmlFor="series-iracing-id"
                className="text-xs font-semibold uppercase text-gray-300"
              >
                ID de Série no iRacing (opcional)
              </Label>
              <Input
                id="series-iracing-id"
                placeholder="Ex: 489 (series_id retornado em arquivos e JSON iRacing)"
                value={iracingSeriesId}
                onChange={(e) => setIracingSeriesId(e.target.value)}
                className="bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600] text-sm font-mono"
              />
              <span className="text-[10px] text-gray-400 block">
                Identificador oficial da série nos resultados de telemetria e campeonatos do
                iRacing.
              </span>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label
                htmlFor="series-desc"
                className="text-xs font-semibold uppercase text-gray-300"
              >
                Descrição
              </Label>
              <Textarea
                id="series-desc"
                rows={3}
                placeholder="Breve ementa ou histórico sobre a categoria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600] text-xs resize-none"
              />
            </div>

            {/* Logo da Série */}
            <div className="space-y-1.5 bg-[#1F1F30]/50 p-3 rounded-lg border border-white/5">
              <Label className="text-xs font-semibold uppercase text-gray-300 block">
                Logo Oficial da Série
              </Label>
              <div className="flex items-center gap-3">
                {existingLogo && !logoFile && (
                  <img
                    src={existingLogo}
                    alt="Logo atual"
                    className="w-12 h-12 object-contain rounded bg-white/5 p-1 border border-white/10"
                  />
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLogoFile(e.target.files[0])
                      }
                    }}
                    className="bg-[#161622] border-white/10 text-xs text-gray-300 file:bg-[#E10600] file:text-white file:border-none file:text-xs file:font-semibold file:px-2 file:py-1 file:rounded"
                  />
                </div>
              </div>
              <span className="text-[10px] text-gray-400 block mt-1">
                PNG, SVG ou JPG (formato quadrado ou widescreen recomendado).
              </span>
            </div>

            <DialogFooter className="pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-md"
              >
                {isSaving ? 'Salvando...' : editing ? 'Atualizar Série' : 'Gravar Série'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
