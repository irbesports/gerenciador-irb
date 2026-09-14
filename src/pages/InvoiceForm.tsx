import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DollarSign, ArrowLeft, Save } from 'lucide-react'
import { invoicesService, pilotsService, championshipsService } from '@/services/api'
import type { Pilot, Championship, InvoiceStatus } from '@/types'
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
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function InvoiceForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { toast } = useToast()

  const [pilots, setPilots] = useState<Pilot[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])

  const [pilotId, setPilotId] = useState('')
  const [championshipId, setChampionshipId] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<InvoiceStatus>('pendente')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const [pList, cList] = await Promise.all([
          pilotsService.list(),
          championshipsService.list(),
        ])
        setPilots(pList)
        setChampionships(cList)

        if (pList.length > 0 && !pilotId) setPilotId(pList[0].id)
        if (cList.length > 0 && !championshipId) setChampionshipId(cList[0].id)

        if (id) {
          const inv = await invoicesService.getOne(id)
          setPilotId(inv.pilot_id)
          setChampionshipId(inv.championship_id)
          setAmount(inv.amount)
          setDescription(inv.description || '')
          setStatus(inv.status)
          if (inv.due_date) setDueDate(inv.due_date.split(' ')[0].split('T')[0])
        }
      } catch (err) {
        console.error(err)
      }
    }
    init()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pilotId || !championshipId || amount === '' || Number(amount) <= 0) {
      toast({
        title: 'Atenção',
        description: 'Preencha o piloto, campeonato e valor válido.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)
      const payload: any = {
        pilot_id: pilotId,
        championship_id: championshipId,
        amount: Number(amount),
        description,
        status,
      }
      if (dueDate) payload.due_date = `${dueDate} 23:59:59.000Z`

      if (isEditing && id) {
        await invoicesService.update(id, payload)
        toast({ title: 'Sucesso', description: 'Cobrança atualizada.' })
      } else {
        await invoicesService.create(payload)
        toast({ title: 'Sucesso', description: 'Nova cobrança gerada com sucesso!' })
      }

      navigate('/dashboard/financeiro')
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao salvar cobrança.',
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
          onClick={() => navigate('/dashboard/financeiro')}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Financeiro
        </Button>
      </div>

      <div>
        <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
          {isEditing ? 'Editar Cobrança' : 'Nova Cobrança'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500">
          Gere faturas de taxas de inscrição, paddocks ou penalidades
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 uppercase">
                Piloto Devedor *
              </Label>
              <Select value={pilotId} onValueChange={setPilotId}>
                <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                  <SelectValue placeholder="Selecione o piloto" />
                </SelectTrigger>
                <SelectContent>
                  {pilots.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.team_name ? `(${p.team_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 uppercase">Campeonato *</Label>
              <Select value={championshipId} onValueChange={setChampionshipId}>
                <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                  <SelectValue placeholder="Selecione o campeonato" />
                </SelectTrigger>
                <SelectContent>
                  {championships.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-amount" className="text-xs font-semibold text-gray-700 uppercase">
                Valor Total (R$) *
              </Label>
              <Input
                id="inv-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 1500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="text-sm font-mono bg-[#F5F5F7] border-gray-300"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-due" className="text-xs font-semibold text-gray-700 uppercase">
                Data de Vencimento
              </Label>
              <Input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs bg-[#F5F5F7] border-gray-300"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-gray-700 uppercase">
                Status da Cobrança
              </Label>
              <Select value={status} onValueChange={(val) => setStatus(val as InvoiceStatus)}>
                <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrazado">Atrasado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inv-desc" className="text-xs font-semibold text-gray-700 uppercase">
                Descrição dos Itens / Observações
              </Label>
              <Textarea
                id="inv-desc"
                rows={3}
                placeholder="Ex: Inscrição 1ª Etapa, Credencial de Box e Paddock Pass"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs bg-[#F5F5F7] border-gray-300"
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/financeiro')}
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
            {isSaving ? 'Gravando...' : isEditing ? 'Salvar Alterações' : 'Emitir Cobrança'}
          </Button>
        </div>
      </form>
    </div>
  )
}
