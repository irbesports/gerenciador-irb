import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Calendar, ArrowLeft, Save } from 'lucide-react'
import { seasonsService, yearsService } from '@/services/api'
import type { Year, SeasonStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function SeasonForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { toast } = useToast()

  const [years, setYears] = useState<Year[]>([])
  const [yearId, setYearId] = useState('')
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<SeasonStatus>('ativa')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const yList = await yearsService.list()
        setYears(yList)
        if (yList.length > 0 && !yearId) {
          setYearId(yList[0].id)
        }

        if (id) {
          const s = await seasonsService.getOne(id)
          setYearId(s.year_id)
          setName(s.name)
          setStatus(s.status || 'ativa')
          if (s.start_date) setStartDate(s.start_date.split(' ')[0].split('T')[0])
          if (s.end_date) setEndDate(s.end_date.split(' ')[0].split('T')[0])
        }
      } catch (err) {
        console.error(err)
      }
    }
    init()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !yearId) {
      toast({
        title: 'Atenção',
        description: 'Preencha o ano e o nome da temporada.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)
      const payload: any = {
        year_id: yearId,
        name,
        status,
      }
      if (startDate) payload.start_date = `${startDate} 00:00:00.000Z`
      if (endDate) payload.end_date = `${endDate} 23:59:59.000Z`

      if (isEditing && id) {
        await seasonsService.update(id, payload)
        toast({ title: 'Sucesso', description: 'Temporada atualizada com sucesso!' })
      } else {
        await seasonsService.create(payload)
        toast({ title: 'Sucesso', description: 'Nova temporada cadastrada!' })
      }

      navigate('/dashboard/temporadas')
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao salvar a temporada.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in pb-12">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/temporadas')}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Temporadas
        </Button>
      </div>

      <div>
        <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
          {isEditing ? 'Editar Temporada' : 'Nova Temporada'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500">
          Vincule a temporada a um ano desportivo e defina as datas limites
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 uppercase">Ano Vinculado *</Label>
            <Select value={yearId} onValueChange={setYearId}>
              <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.year} - {y.name || 'Temporada Oficial'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="season-name" className="text-xs font-semibold text-gray-700 uppercase">
              Nome da Temporada *
            </Label>
            <Input
              id="season-name"
              placeholder="Ex: Temporada de Inverno 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm bg-[#F5F5F7] border-gray-300"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-date" className="text-xs font-semibold text-gray-700 uppercase">
                Data de Início
              </Label>
              <Input
                id="s-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-[#F5F5F7] border-gray-300"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-date" className="text-xs font-semibold text-gray-700 uppercase">
                Data de Encerramento
              </Label>
              <Input
                id="e-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-[#F5F5F7] border-gray-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 uppercase">
              Status da Temporada
            </Label>
            <Select value={status} onValueChange={(val) => setStatus(val as SeasonStatus)}>
              <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejada">Planejada</SelectItem>
                <SelectItem value="ativa">Ativa (Correndo)</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/temporadas')}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold btn-checkered-sweep"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? 'Gravando...' : isEditing ? 'Salvar Alterações' : 'Criar Temporada'}
          </Button>
        </div>
      </form>
    </div>
  )
}
