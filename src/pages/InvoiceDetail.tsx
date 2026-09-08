import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DollarSign,
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Clock,
  Calendar,
  User as UserIcon,
  Trophy,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  invoicesService,
  paymentsService,
  pilotsService,
  championshipsService,
} from '@/services/api'
import type { Invoice, Payment, Pilot, Championship, PaymentMethod } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [pilot, setPilot] = useState<Pilot | null>(null)
  const [championship, setChampionship] = useState<Championship | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Payment register dialog
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [payAmount, setPayAmount] = useState<number | ''>('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('pix')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const inv = await invoicesService.getOne(id)
      setInvoice(inv)
      setPayAmount(inv.amount)

      const [pList, payList] = await Promise.all([
        pilotsService.getOne(inv.pilot_id).catch(() => null),
        paymentsService.listByInvoice(id),
      ])
      setPilot(pList)
      setPayments(payList)

      if (inv.championship_id) {
        const c = await championshipsService.getOne(inv.championship_id).catch(() => null)
        setChampionship(c)
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a cobrança.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime<Payment>('payments', () => loadData())
  useRealtime<Invoice>('invoices', () => loadData())

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !invoice || payAmount === '' || Number(payAmount) <= 0) return

    try {
      setIsSaving(true)
      await paymentsService.create({
        invoice_id: id,
        pilot_id: invoice.pilot_id,
        amount: Number(payAmount),
        method: payMethod,
        payment_date: `${payDate} 12:00:00.000Z`,
      })

      toast({ title: 'Sucesso', description: 'Pagamento registrado com sucesso!' })
      setIsPaymentOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao registrar pagamento.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !invoice) {
    return (
      <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
        Carregando dados da cobrança...
      </div>
    )
  }

  const isPaid = invoice.status === 'pago'

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/financeiro')}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Financeiro
        </Button>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={`text-xs capitalize font-medium ${
                invoice.status === 'pago'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : invoice.status === 'pendente'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-red-50 text-red-700 border-red-300'
              }`}
            >
              {invoice.status}
            </Badge>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 font-mono">
              Fatura #{invoice.id.slice(0, 8)}
            </span>
          </div>

          <h1 className="font-racing text-2xl font-bold text-[#1E1E2F] uppercase">
            Fatura de Inscrição / Despesas
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Emitida em {new Date(invoice.created).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {!isPaid && (
          <Button
            onClick={() => setIsPaymentOpen(true)}
            className="bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm"
          >
            <CreditCard className="w-4 h-4 mr-1.5" />
            Registrar Pagamento
          </Button>
        )}
      </div>

      {/* Grid Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 bg-white border border-gray-200 rounded-xl space-y-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Valor da Cobrança
          </span>
          <span className="font-racing text-3xl font-bold text-[#E10600] block tabular-nums">
            R$ {invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            Vencimento:{' '}
            <span className="font-semibold text-gray-800">
              {invoice.due_date
                ? new Date(invoice.due_date).toLocaleDateString('pt-BR')
                : 'Imediato'}
            </span>
          </div>
        </Card>

        <Card className="p-5 bg-white border border-gray-200 rounded-xl space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Piloto Titular
          </span>
          <h4 className="font-racing text-base font-bold text-gray-900">
            {pilot?.name || 'Piloto'}
          </h4>
          <p className="text-xs text-gray-500">
            Equipe: {pilot?.team_name || 'Particular'} • Carro #{pilot?.number || '-'}
          </p>
        </Card>

        <Card className="p-5 bg-white border border-gray-200 rounded-xl space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Competição
          </span>
          <h4 className="font-racing text-base font-bold text-gray-900">
            {championship?.name || 'Campeonato'}
          </h4>
          <p className="text-xs text-gray-500">Categoria oficial de automobilismo</p>
        </Card>
      </div>

      {/* Description */}
      {invoice.description && (
        <Card className="p-5 bg-white border border-gray-200 rounded-xl space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Detalhamento da Fatura
          </span>
          <p className="text-xs text-gray-700 leading-relaxed">{invoice.description}</p>
        </Card>
      )}

      {/* Linked Payments Table */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden space-y-2">
        <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#E10600]" />
            <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
              Pagamentos Vinculados
            </h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">{payments.length} transação(ões)</span>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 italic">
            Nenhum pagamento liquidado até o momento para esta cobrança.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase">
                  <th className="py-2.5 px-4">Método</th>
                  <th className="py-2.5 px-4">Valor Pago</th>
                  <th className="py-2.5 px-4">Data de Liquidação</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono uppercase font-bold text-gray-800">
                      {p.method}
                    </td>
                    <td className="py-3 px-4 font-racing font-bold text-emerald-600">
                      R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                      {p.payment_date
                        ? new Date(p.payment_date).toLocaleString('pt-BR')
                        : new Date(p.created).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" /> Pago
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payment Registration Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
              Registrar Recebimento
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterPayment} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-val" className="text-xs font-semibold uppercase text-gray-700">
                Valor Recebido (R$) *
              </Label>
              <Input
                id="pay-val"
                type="number"
                step="0.01"
                min="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
                className="bg-[#F5F5F7] text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-700">
                Método de Pagamento *
              </Label>
              <Select value={payMethod} onValueChange={(val) => setPayMethod(val as PaymentMethod)}>
                <SelectTrigger className="text-xs bg-[#F5F5F7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX (Instantâneo)</SelectItem>
                  <SelectItem value="cartao">Cartão de Crédito/Débito</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária (TED/DOC)</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-date" className="text-xs font-semibold uppercase text-gray-700">
                Data do Pagamento
              </Label>
              <Input
                id="pay-date"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="text-xs bg-[#F5F5F7]"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-[#10B981] hover:bg-emerald-600 text-white"
              >
                {isSaving ? 'Registrando...' : 'Confirmar Pagamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
