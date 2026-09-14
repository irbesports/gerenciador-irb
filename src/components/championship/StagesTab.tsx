import React, { useState } from 'react'
import {
  FileText,
  MessageSquare,
  Edit2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  CloudSun,
  ShieldAlert,
  Info,
  Calendar as CalendarIcon,
  Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ChampionshipStage, StageRace, Track, StageDurationType, StageStatus } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

export interface LocalStageRace {
  id?: string
  stage_id?: string
  order: number
  duration_type: StageDurationType
  duration: number
  start_time: string
  weather: string
  inverted_positions: number
  name?: string
}

export interface LocalStage {
  id?: string
  order: number
  date: string
  duration_type: StageDurationType
  duration: number
  points_multiplier: number
  track: string
  track_layout: string
  status: StageStatus
  races: LocalStageRace[]
}

interface StagesTabProps {
  stages: LocalStage[]
  setStages: React.Dispatch<React.SetStateAction<LocalStage[]>>
  deletedStageIds: string[]
  setDeletedStageIds: React.Dispatch<React.SetStateAction<string[]>>
  deletedRaceIds: string[]
  setDeletedRaceIds: React.Dispatch<React.SetStateAction<string[]>>
  tracks: Track[]
  onOpenComments: (race: LocalStageRace, stage: LocalStage) => void
}

export default function StagesTab({
  stages,
  setStages,
  deletedStageIds,
  setDeletedStageIds,
  deletedRaceIds,
  setDeletedRaceIds,
  tracks,
  onOpenComments,
}: StagesTabProps) {
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()

  // Inline form state
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [date, setDate] = useState('2026-09-08')
  const [durationType, setDurationType] = useState<StageDurationType>('Minutos')
  const [duration, setDuration] = useState<number>(0)
  const [pointsMultiplier, setPointsMultiplier] = useState<number>(1)
  const [trackId, setTrackId] = useState<string>('')
  const [trackSearch, setTrackSearch] = useState('')
  const [trackLayout, setTrackLayout] = useState('Grand Prix')
  const [status, setStatus] = useState<StageStatus>('Agendada')

  // Expanded stage for races
  const [expandedStageIndex, setExpandedStageIndex] = useState<number | null>(null)

  // Race addition modal or inline
  const [isRaceModalOpen, setIsRaceModalOpen] = useState(false)
  const [targetStageIndexForRace, setTargetStageIndexForRace] = useState<number | null>(null)
  const [raceDurationType, setRaceDurationType] = useState<StageDurationType>('Minutos')
  const [raceDuration, setRaceDuration] = useState<number>(50)
  const [raceStartTime, setRaceStartTime] = useState<string>('14:00')
  const [raceWeather, setRaceWeather] = useState<string>('Céu Limpo')
  const [raceInvertedPositions, setRaceInvertedPositions] = useState<number>(0)

  // Track search filter
  const filteredTracks = tracks.filter((t) =>
    t.name.toLowerCase().includes(trackSearch.toLowerCase()),
  )

  const handleStartEditStage = (index: number) => {
    const st = stages[index]
    setEditingIndex(index)
    setDate(st.date ? st.date.split('T')[0] : '')
    setDurationType(st.duration_type || 'Minutos')
    setDuration(st.duration ?? 0)
    setPointsMultiplier(st.points_multiplier ?? 1)
    setTrackId(st.track || '')
    setTrackLayout(st.track_layout || 'Grand Prix')
    setStatus(st.status || 'Agendada')
  }

  const handleCancelStageForm = () => {
    setEditingIndex(null)
    setDate('2026-09-08')
    setDurationType('Minutos')
    setDuration(0)
    setPointsMultiplier(1)
    setTrackId('')
    setTrackSearch('')
    setTrackLayout('Grand Prix')
    setStatus('Agendada')
  }

  const handleSaveStageForm = () => {
    if (editingIndex !== null) {
      // Update existing
      const updated = [...stages]
      updated[editingIndex] = {
        ...updated[editingIndex],
        date: date ? `${date}T12:00:00.000Z` : '',
        duration_type: durationType,
        duration: Number(duration) || 0,
        points_multiplier: Number(pointsMultiplier) || 1,
        track: trackId,
        track_layout: trackLayout,
        status,
      }
      setStages(updated)
    } else {
      // Add new
      const nextOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) + 1 : 1
      const newStage: LocalStage = {
        order: nextOrder,
        date: date ? `${date}T12:00:00.000Z` : '',
        duration_type: durationType,
        duration: Number(duration) || 0,
        points_multiplier: Number(pointsMultiplier) || 1,
        track: trackId,
        track_layout: trackLayout,
        status,
        races: [
          {
            order: 1,
            duration_type: durationType,
            duration: Number(duration) || 50,
            start_time: '14:00',
            weather: 'Limpo',
            inverted_positions: 0,
            name: 'Corrida 1',
          },
        ],
      }
      setStages([...stages, newStage])
    }
    handleCancelStageForm()
  }

  const handleDeleteStage = (index: number) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta etapa e todas as suas corridas?'))
      return
    const st = stages[index]
    if (st.id) {
      setDeletedStageIds([...deletedStageIds, st.id])
    }
    st.races.forEach((r) => {
      if (r.id) setDeletedRaceIds((prev) => [...prev, r.id!])
    })
    const remaining = stages.filter((_, idx) => idx !== index)
    // Renumber sequentially
    const reordered = remaining.map((s, idx) => ({ ...s, order: idx + 1 }))
    setStages(reordered)
    if (expandedStageIndex === index) setExpandedStageIndex(null)
  }

  // Race operations within a stage
  const openAddRaceModal = (stageIdx: number) => {
    setTargetStageIndexForRace(stageIdx)
    const st = stages[stageIdx]
    setRaceDurationType(st.duration_type || 'Minutos')
    setRaceDuration(st.duration || 50)
    setRaceStartTime('14:00')
    setRaceWeather('Limpo')
    setRaceInvertedPositions(0)
    setIsRaceModalOpen(true)
  }

  const handleSaveNewRace = () => {
    if (targetStageIndexForRace === null) return
    const updatedStages = [...stages]
    const targetStage = updatedStages[targetStageIndexForRace]
    const nextRaceOrder =
      targetStage.races.length > 0 ? Math.max(...targetStage.races.map((r) => r.order)) + 1 : 1

    targetStage.races.push({
      order: nextRaceOrder,
      duration_type: raceDurationType,
      duration: Number(raceDuration) || 50,
      start_time: raceStartTime,
      weather: raceWeather,
      inverted_positions: Number(raceInvertedPositions) || 0,
      name: `Corrida ${nextRaceOrder}`,
    })

    setStages(updatedStages)
    setIsRaceModalOpen(false)
  }

  const handleDeleteRace = (stageIdx: number, raceIdx: number) => {
    if (!window.confirm('Excluir esta corrida da etapa?')) return
    const updatedStages = [...stages]
    const targetStage = updatedStages[stageIdx]
    const race = targetStage.races[raceIdx]
    if (race.id) {
      setDeletedRaceIds([...deletedRaceIds, race.id])
    }
    targetStage.races = targetStage.races.filter((_, idx) => idx !== raceIdx)
    targetStage.races = targetStage.races.map((r, idx) => ({ ...r, order: idx + 1 }))
    setStages(updatedStages)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-6">
        {/* Inline Creation / Edit Form (Exact match to user print 1) */}
        <div className="p-4 bg-[#1F1F30]/70 rounded-xl border border-white/10 space-y-3">
          <div className="text-[11px] font-racing uppercase tracking-wider text-gray-400 flex items-center justify-between">
            <span>
              {editingIndex !== null
                ? `Editando Etapa ${stages[editingIndex].order}`
                : 'Nova Etapa'}
            </span>
            {editingIndex !== null && (
              <span className="text-[#E10600] font-sans lowercase">modo edição</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            {/* Data da etapa * */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Data da etapa *</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs bg-[#161622] border-white/10 text-white h-9"
                  required
                />
              </div>
            </div>

            {/* Duração em */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-gray-300">Duração em</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-black text-white text-[11px] max-w-xs">
                      Escolha se a duração padrão das corridas desta etapa é contada em Minutos ou
                      Voltas.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={durationType}
                onValueChange={(val) => setDurationType(val as StageDurationType)}
              >
                <SelectTrigger className="text-xs bg-[#161622] border-white/10 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                  <SelectItem value="Minutos">Minutos</SelectItem>
                  <SelectItem value="Voltas">Voltas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minutos / Voltas (Dynamic label) */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">{durationType}</Label>
              <Input
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
              />
            </div>

            {/* Multiplicar pontos por */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Multiplicar pontos por</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={pointsMultiplier}
                onChange={(e) => setPointsMultiplier(Number(e.target.value))}
                className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end pt-1">
            {/* Pista with search/select */}
            <div className="space-y-1 lg:col-span-5">
              <Label className="text-xs text-gray-300">Pista</Label>
              <Select value={trackId} onValueChange={setTrackId}>
                <SelectTrigger className="text-xs bg-[#161622] border-white/10 text-white h-9">
                  <SelectValue placeholder="Selecione a Pista..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1F1F30] border-white/10 text-white max-h-60">
                  <div className="p-2 border-b border-white/10 sticky top-0 bg-[#1F1F30]">
                    <Input
                      placeholder="Buscar pista..."
                      value={trackSearch}
                      onChange={(e) => setTrackSearch(e.target.value)}
                      className="text-xs bg-[#161622] border-white/10 text-white h-7"
                    />
                  </div>
                  {filteredTracks.map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {tr.name} {tr.country ? `(${tr.country})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Traçado */}
            <div className="space-y-1 lg:col-span-3">
              <Label className="text-xs text-gray-300">Traçado</Label>
              <Input
                type="text"
                placeholder="Ex: Grand Prix / Classic Boot"
                value={trackLayout}
                onChange={(e) => setTrackLayout(e.target.value)}
                className="text-xs bg-[#161622] border-white/10 text-white h-9"
              />
            </div>

            {/* Status da etapa */}
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs text-gray-300">Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as StageStatus)}>
                <SelectTrigger className="text-xs bg-[#161622] border-white/10 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                  <SelectItem value="Agendada">Agendada</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inline Buttons SALVAR / CANCELAR (Right aligned like print) */}
            <div className="flex items-center justify-end gap-2 lg:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelStageForm}
                className="text-xs bg-transparent border-white/15 text-gray-300 hover:bg-white/5 uppercase h-9"
              >
                CANCELAR
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveStageForm}
                className="bg-[#14141F] hover:bg-[#2A2A3D] text-white text-xs font-racing uppercase tracking-wider px-4 border border-white/10 shadow-sm h-9"
              >
                SALVAR
              </Button>
            </div>
          </div>
        </div>

        {/* Stages Table (Exact columns matching user print 1: Actions, Etapa, Pista, Data, Duração, Status) */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1F1F30]/30">
          <table className="w-full text-left text-xs text-gray-300">
            <thead>
              <tr className="border-b border-white/10 bg-[#14141F] text-[11px] font-racing text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-32 text-center">Actions</th>
                <th className="py-3 px-4 w-20 text-center">Etapa</th>
                <th className="py-3 px-4">Pista</th>
                <th className="py-3 px-4 w-32">Data</th>
                <th className="py-3 px-4 w-32">Duração</th>
                <th className="py-3 px-4 w-36 text-center">Status</th>
                <th className="py-3 px-4 w-16 text-center">Corridas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Nenhuma etapa cadastrada. Preencha o formulário acima e clique em SALVAR.
                  </td>
                </tr>
              ) : (
                stages.map((st, idx) => {
                  const trackObj = tracks.find((t) => t.id === st.track)
                  const trackDisplayName = trackObj
                    ? `${trackObj.name}${st.track_layout ? ` - ${st.track_layout}` : ''}`
                    : st.track_layout || 'Pista a definir'

                  const formattedDate = st.date
                    ? new Date(st.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '-'

                  const isExpanded = expandedStageIndex === idx

                  return (
                    <React.Fragment key={st.id || idx}>
                      <tr className="hover:bg-white/5 transition-colors group">
                        {/* Actions (Pencil, Document, Comment, Trash) */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Pencil: edit stage inline */}
                            <button
                              type="button"
                              onClick={() => handleStartEditStage(idx)}
                              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                              title="Editar Etapa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Document: race moderation page (First race or prompt) */}
                            {isCollaborator && (
                              <button
                                type="button"
                                onClick={() => {
                                  const firstRace = st.races[0]
                                  if (firstRace?.id) {
                                    navigate(`/dashboard/moderacao/corrida/${firstRace.id}`)
                                  } else {
                                    alert(
                                      'Esta etapa ainda possui corridas não salvas no banco. Salve as alterações do campeonato primeiro para abrir o painel de moderação da prova.',
                                    )
                                  }
                                }}
                                className="p-1 rounded text-gray-400 hover:text-amber-400 hover:bg-white/10 transition-colors"
                                title="Abrir Moderação da Corrida (Comissários)"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}

                            {/* Balloon: comments modal */}
                            {isCollaborator && (
                              <button
                                type="button"
                                onClick={() => {
                                  const firstRace = st.races[0]
                                  if (firstRace) {
                                    onOpenComments(firstRace, st)
                                  }
                                }}
                                className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-white/10 transition-colors"
                                title="Anotações / Discussão da Prova"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}

                            {/* Trash */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStage(idx)}
                              className="p-1 rounded text-gray-400 hover:text-[#E10600] hover:bg-white/10 transition-colors"
                              title="Excluir Etapa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                        {/* Etapa number */}
                        <td className="py-3 px-4 text-center font-racing font-bold text-white text-sm">
                          {st.order}
                        </td>

                        {/* Pista */}
                        <td className="py-3 px-4 font-medium text-gray-200">{trackDisplayName}</td>

                        {/* Data */}
                        <td className="py-3 px-4 font-mono text-gray-300">{formattedDate}</td>

                        {/* Duração */}
                        <td className="py-3 px-4 font-mono text-gray-300">
                          {st.duration > 0 ? `${st.duration} ` : ''}
                          {st.duration_type}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium border ${
                              st.status === 'Finalizada'
                                ? 'bg-slate-500/10 text-slate-300 border-slate-500/30'
                                : st.status === 'Em andamento'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {st.status}
                          </Badge>
                        </td>

                        {/* Expand races */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedStageIndex(isExpanded ? null : idx)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 flex items-center justify-center mx-auto"
                            title="Ver/Adicionar Corridas desta Etapa"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#E10600]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Panel: 1 to N Corridas per Stage */}
                      {isExpanded && (
                        <tr className="bg-[#14141F]/80">
                          <td colSpan={7} className="p-4 pl-12 border-b border-white/10 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="font-racing text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-3 bg-[#E10600] rounded-sm inline-block" />
                                Corridas da Etapa {st.order} ({st.races.length})
                              </span>

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => openAddRaceModal(idx)}
                                className="bg-[#1F1F30] hover:bg-[#2A2A3D] text-white text-[11px] font-racing uppercase tracking-wider px-3 h-7 border border-white/10"
                              >
                                <Plus className="w-3 h-3 mr-1 text-[#E10600]" />
                                Adicionar Corrida
                              </Button>
                            </div>

                            {st.races.length === 0 ? (
                              <p className="text-[11px] text-gray-500 py-2">
                                Nenhuma corrida configurada para este fim de semana.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {st.races.map((rc, rIdx) => (
                                  <div
                                    key={rc.id || rIdx}
                                    className="p-3 rounded-lg bg-[#1F1F30] border border-white/5 flex items-center justify-between text-xs"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-racing font-bold text-white uppercase">
                                          {rc.name || `Corrida ${rc.order}`}
                                        </span>
                                        <span className="text-[11px] text-gray-400 font-mono">
                                          ({rc.duration} {rc.duration_type})
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-gray-400 flex items-center gap-3">
                                        <span>Hora: {rc.start_time || '14:00'}</span>
                                        <span>•</span>
                                        <span>Clima: {rc.weather || 'Limpo'}</span>
                                        {rc.inverted_positions ? (
                                          <>
                                            <span>•</span>
                                            <span className="text-amber-400">
                                              Inv.: {rc.inverted_positions}
                                            </span>
                                          </>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {rc.id && isCollaborator && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            navigate(`/dashboard/moderacao/corrida/${rc.id}`)
                                          }
                                          className="text-[11px] text-amber-400 hover:text-amber-300 p-1.5 h-7"
                                          title="Moderar Corrida"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRace(idx, rIdx)}
                                        className="text-gray-400 hover:text-[#E10600] p-1.5"
                                        title="Remover Corrida"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Adicionar Corrida na Etapa */}
      <Dialog open={isRaceModalOpen} onOpenChange={setIsRaceModalOpen}>
        <DialogContent className="max-w-md bg-[#161622] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#E10600]" />
              Adicionar Corrida na Etapa{' '}
              {targetStageIndexForRace !== null ? stages[targetStageIndexForRace]?.order : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Duração em</Label>
                <Select
                  value={raceDurationType}
                  onValueChange={(val) => setRaceDurationType(val as StageDurationType)}
                >
                  <SelectTrigger className="text-xs bg-[#1F1F30] border-white/10 text-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                    <SelectItem value="Minutos">Minutos</SelectItem>
                    <SelectItem value="Voltas">Voltas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-300">{raceDurationType}</Label>
                <Input
                  type="number"
                  min={1}
                  value={raceDuration}
                  onChange={(e) => setRaceDuration(Number(e.target.value))}
                  className="text-xs font-mono bg-[#1F1F30] border-white/10 text-white h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Hora do dia</Label>
                <Input
                  type="text"
                  placeholder="14:00"
                  value={raceStartTime}
                  onChange={(e) => setRaceStartTime(e.target.value)}
                  className="text-xs bg-[#1F1F30] border-white/10 text-white h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Clima</Label>
                <Input
                  type="text"
                  placeholder="Céu Limpo"
                  value={raceWeather}
                  onChange={(e) => setRaceWeather(e.target.value)}
                  className="text-xs bg-[#1F1F30] border-white/10 text-white h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Posições invertidas</Label>
              <Input
                type="number"
                min={0}
                value={raceInvertedPositions}
                onChange={(e) => setRaceInvertedPositions(Number(e.target.value))}
                className="text-xs font-mono bg-[#1F1F30] border-white/10 text-white h-9"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRaceModalOpen(false)}
              className="text-xs bg-transparent border-white/15 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveNewRace}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-4"
            >
              Salvar Corrida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
