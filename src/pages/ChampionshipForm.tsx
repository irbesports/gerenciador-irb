import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trophy, ArrowLeft, Plus, Trash2, Save, Award, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { championshipsService, seasonsService, scoringRulesService } from '@/services/api'
import type { Season, ChampionshipStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface ScoringRow {
  position: number
  points: number
}

export default function ChampionshipForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ChampionshipStatus>('ativo')

  // Scoring configuration
  const [scoringRows, setScoringRows] = useState<ScoringRow[]>([
    { position: 1, points: 25 },
    { position: 2, points: 18 },
    { position: 3, points: 15 },
    { position: 4, points: 12 },
    { position: 5, points: 10 },
    { position: 6, points: 8 },
    { position: 7, points: 6 },
    { position: 8, points: 4 },
    { position: 9, points: 2 },
    { position: 10, points: 1 },
  ])
  const [fastestLapBonus, setFastestLapBonus] = useState<number>(1)

  const [seasons, setSeasons] = useState<Season[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true)
        const sList = await seasonsService.list()
        setSeasons(sList)
        if (sList.length > 0 && !seasonId) {
          setSeasonId(sList[0].id)
        }

        if (id) {
          const champ = await championshipsService.getOne(id)
          setName(champ.name)
          setSeasonId(champ.season_id)
          setDescription(champ.description || '')
          setStatus(champ.status || 'ativo')

          // Load scoring rules
          const rules = await scoringRulesService.listByChampionship(id)
          if (rules.length > 0) {
            setScoringRows(rules.map((r) => ({ position: r.position, points: r.points })))
            setFastestLapBonus(rules[0].bonus_fastest_lap ?? 0)
          }
        }
      } catch (err) {
        console.error(err)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados do campeonato.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [id])

  const handleAddPosition = () => {
    const nextPos = scoringRows.length > 0 ? scoringRows[scoringRows.length - 1].position + 1 : 1
    setScoringRows([...scoringRows, { position: nextPos, points: 0 }])
  }

  const handleRemovePosition = (index: number) => {
    setScoringRows(scoringRows.filter((_, idx) => idx !== index))
  }

  const handleScoreChange = (index: number, points: number) => {
    const updated = [...scoringRows]
    updated[index].points = points
    setScoringRows(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: 'Atenção',
        description: 'O nome do campeonato é obrigatório.',
        variant: 'destructive',
      })
      return
    }
    if (!seasonId) {
      toast({ title: 'Atenção', description: 'Selecione uma temporada.', variant: 'destructive' })
      return
    }

    try {
      setIsSaving(true)
      let champId = id

      if (isEditing && id) {
        await championshipsService.update(id, {
          name,
          season_id: seasonId,
          description,
          status,
        })
      } else {
        const created = await championshipsService.create({
          name,
          season_id: seasonId,
          description,
          status,
        })
        champId = created.id
      }

      // Save scoring rules
      if (champId) {
        await scoringRulesService.saveRules(
          champId,
          scoringRows.map((r) => ({
            position: r.position,
            points: Number(r.points),
            bonus_fastest_lap: Number(fastestLapBonus),
          })),
        )
      }

      toast({
        title: 'Sucesso',
        description: isEditing
          ? 'Campeonato atualizado com sucesso!'
          : 'Campeonato criado com sucesso!',
      })

      navigate(champId ? `/campeonatos/${champId}` : '/campeonatos')
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Ocorreu um erro ao gravar o campeonato.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Back button */}
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            {isEditing ? 'Editar Campeonato' : 'Novo Campeonato'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Configure informações gerais, status e tabela dinâmica de pontuação
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Gerais */}
        <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Trophy className="w-4 h-4 text-[#E10600]" />
            <h2 className="font-racing text-base font-bold text-[#1E1E2F] uppercase">
              Dados Principais
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="champ-name" className="text-xs font-semibold text-gray-700 uppercase">
                Nome do Campeonato *
              </Label>
              <Input
                id="champ-name"
                placeholder="Ex: Copa de Inverno GT 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm bg-[#F5F5F7] border-gray-300 focus-visible:ring-[#E10600]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="champ-season"
                className="text-xs font-semibold text-gray-700 uppercase"
              >
                Temporada Vinculada *
              </Label>
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger id="champ-season" className="text-xs bg-[#F5F5F7] border-gray-300">
                  <SelectValue placeholder="Selecione a Temporada" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="champ-status"
                className="text-xs font-semibold text-gray-700 uppercase"
              >
                Status da Competição
              </Label>
              <Select value={status} onValueChange={(val) => setStatus(val as ChampionshipStatus)}>
                <SelectTrigger id="champ-status" className="text-xs bg-[#F5F5F7] border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativo">Ativo (Em andamento)</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="champ-desc" className="text-xs font-semibold text-gray-700 uppercase">
                Descrição do Regulamento / Categoria
              </Label>
              <Textarea
                id="champ-desc"
                rows={3}
                placeholder="Detalhes sobre carros elegíveis, lastro, formato das corridas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs bg-[#F5F5F7] border-gray-300 focus-visible:ring-[#E10600]"
              />
            </div>
          </div>
        </Card>

        {/* Configuração de Pontuação (Mandatory Decision #3) */}
        <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#E10600]" />
              <h2 className="font-racing text-base font-bold text-[#1E1E2F] uppercase">
                Sistema de Pontuação Configurável
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPosition}
              className="text-xs text-[#E10600] border-red-200 hover:bg-red-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar Posição
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Defina quantos pontos cada colocação no grid acumula ao término de cada etapa deste
            campeonato.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-red-50/50 rounded-lg border border-red-100 items-center">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E10600]" />
              <div>
                <span className="text-xs font-semibold text-gray-900 block">
                  Bônus por Volta Mais Rápida (Fastest Lap)
                </span>
                <span className="text-[11px] text-gray-500">
                  Pontos extras concedidos ao piloto com a melhor volta da corrida
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <Input
                type="number"
                min={0}
                value={fastestLapBonus}
                onChange={(e) => setFastestLapBonus(Number(e.target.value))}
                className="w-24 text-xs font-mono bg-white border-gray-300"
              />
              <span className="text-xs font-semibold text-gray-700">pts</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
            {scoringRows.map((row, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-racing text-xs font-bold text-gray-600">
                    {row.position}º
                  </span>
                  <span className="text-gray-300">→</span>
                  <Input
                    type="number"
                    min={0}
                    value={row.points}
                    onChange={(e) => handleScoreChange(idx, Number(e.target.value))}
                    className="w-14 h-7 text-xs font-mono bg-white p-1 text-center"
                  />
                  <span className="text-[10px] text-gray-500">pts</span>
                </div>

                {scoringRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePosition(idx)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/campeonatos')}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? 'Gravando...' : isEditing ? 'Salvar Alterações' : 'Criar Campeonato'}
          </Button>
        </div>
      </form>
    </div>
  )
}
