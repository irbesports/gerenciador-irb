import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Plus, Trophy, Layers, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { yearsService, seasonsService, championshipsService } from '@/services/api'
import type { Year, Season, Championship } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function YearsList() {
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [years, setYears] = useState<Year[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal create/edit year
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingYear, setEditingYear] = useState<Year | null>(null)
  const [yearNumber, setYearNumber] = useState<number>(new Date().getFullYear())
  const [yearName, setYearName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    try {
      const [y, s, c] = await Promise.all([
        yearsService.list(),
        seasonsService.list(),
        championshipsService.list(),
      ])
      setYears(y)
      setSeasons(s)
      setChampionships(c)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os anos cadastrados.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setEditingYear(null)
    setYearNumber(new Date().getFullYear() + 1)
    setYearName(`Temporada Oficial ${new Date().getFullYear() + 1}`)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (y: Year) => {
    setEditingYear(y)
    setYearNumber(y.year)
    setYearName(y.name || '')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!yearNumber) return

    try {
      setIsSaving(true)
      if (editingYear) {
        await yearsService.update(editingYear.id, {
          year: Number(yearNumber),
          name: yearName,
        })
        toast({ title: 'Sucesso', description: 'Ano atualizado.' })
      } else {
        await yearsService.create({
          year: Number(yearNumber),
          name: yearName,
        })
        toast({ title: 'Sucesso', description: 'Novo ano registrado.' })
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao salvar ano esportivo.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Atenção: excluir este ano pode impactar as temporadas vinculadas. Prosseguir?',
      )
    )
      return
    try {
      await yearsService.delete(id)
      toast({ title: 'Sucesso', description: 'Ano removido.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao excluir o ano.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Anos Esportivos
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Estrutura base da hierarquia: Ano → Temporada → Campeonato
          </p>
        </div>

        {isCollaborator && (
          <Button
            onClick={handleOpenCreate}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Ano
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
          Carregando anos esportivos...
        </div>
      ) : years.length === 0 ? (
        <Card className="p-12 text-center space-y-2 bg-white border border-gray-200 rounded-xl">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-sm font-medium text-gray-700">Nenhum ano esportivo cadastrado.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {years.map((y) => {
            const seasonList = seasons.filter((s) => s.year_id === y.id)
            const seasonIds = seasonList.map((s) => s.id)
            const champCount = championships.filter((c) => seasonIds.includes(c.season_id)).length

            return (
              <Card
                key={y.id}
                className="racing-card overflow-hidden border border-gray-200 bg-white relative group"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-racing text-3xl font-bold text-[#1E1E2F]">{y.year}</span>
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E10600] flex items-center justify-center font-bold">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-gray-800">
                      {y.name || `Ano ${y.year}`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ciclo competitivo e administrativo
                    </p>
                  </div>

                  {/* Counters */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div className="bg-gray-50 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                        Temporadas
                      </span>
                      <span className="font-racing text-base font-bold text-gray-900">
                        {seasonList.length}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                        Campeonatos
                      </span>
                      <span className="font-racing text-base font-bold text-[#E10600]">
                        {champCount}
                      </span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-2 flex items-center justify-between">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate('/temporadas')}
                      className="text-xs text-[#E10600] p-0 h-auto font-semibold hover:underline"
                    >
                      Ver Temporadas →
                    </Button>

                    {isCollaborator && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(y)}
                          className="h-7 w-7 text-gray-400 hover:text-gray-900"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(y.id)}
                          className="h-7 w-7 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
              {editingYear ? 'Editar Ano Esportivo' : 'Cadastrar Novo Ano'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="year-num" className="text-xs font-semibold uppercase text-gray-700">
                Ano (Numérico) *
              </Label>
              <Input
                id="year-num"
                type="number"
                min={2020}
                max={2035}
                value={yearNumber}
                onChange={(e) => setYearNumber(Number(e.target.value))}
                required
                className="bg-[#F5F5F7] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="year-name" className="text-xs font-semibold uppercase text-gray-700">
                Denominação Oficial
              </Label>
              <Input
                id="year-name"
                placeholder="Ex: Temporada Esportiva 2026"
                value={yearName}
                onChange={(e) => setYearName(e.target.value)}
                className="bg-[#F5F5F7] text-sm"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-[#E10600] hover:bg-[#C00500] text-white"
              >
                {isSaving ? 'Salvando...' : 'Gravar Ano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
