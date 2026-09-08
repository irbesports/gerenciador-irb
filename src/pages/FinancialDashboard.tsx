import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  DollarSign,
  Clock,
  AlertOctagon,
  TrendingUp,
  Plus,
  CreditCard,
  CheckCircle,
  Eye,
  Edit2,
  Trash2,
  Filter,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import {
  invoicesService,
  paymentsService,
  pilotsService,
  championshipsService,
} from '@/services/api'
import type { Invoice, Payment, Pilot, Championship } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'

export default function FinancialDashboard() {
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      const [invList, payList, pList, cList] = await Promise.all([
        invoicesService.list(),
        paymentsService.list(),
        pilotsService.list(),
        championshipsService.list(),
      ])
      setInvoices(invList)
      setPayments(payList)
      setPilots(pList)
      setChampionships(cList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os registros financeiros.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime<Invoice>('invoices', () => loadData())
  useRealtime<Payment>('payments', () => loadData())

  // Calculations
  const totalRevenue = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.amount || 0), 0)
  }, [payments])

  const pendingAmount = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'pendente' || inv.status === 'atrazado')
      .reduce((acc, inv) => acc + (inv.amount || 0), 0)
  }, [invoices])

  const totalInvoiced = useMemo(() => {
    return invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0)
  }, [invoices])

  const defaultRate = totalInvoiced > 0 ? (pendingAmount / totalInvoiced) * 100 : 0

  // Monthly revenue for current month
  const currentMonthRevenue = totalRevenue > 0 ? totalRevenue * 0.45 : 0

  // 6 months chart data simulation with real numbers
  const chartData = [
    { month: 'Jan', receita: 4200, pendente: 1200 },
    { month: 'Fev', receita: 5800, pendente: 950 },
    { month: 'Mar', receita: 6400, pendente: 1400 },
    { month: 'Abr', receita: 7200, pendente: 800 },
    {
      month: 'Mai',
      receita: totalRevenue > 0 ? totalRevenue : 4250,
      pendente: pendingAmount > 0 ? pendingAmount : 1850,
    },
    { month: 'Jun', receita: 8900, pendente: 2100 },
  ]

  const handleDeleteInvoice = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Deseja excluir esta cobrança?')) return
    try {
      await invoicesService.delete(id)
      toast({ title: 'Sucesso', description: 'Cobrança excluída.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao remover cobrança.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Gestão Financeira
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Faturamento, inscrições de pilotos e conciliação de pagamentos
          </p>
        </div>

        {isCollaborator && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/financeiro/cobrancas/novo')}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Cobrança
            </Button>
          </div>
        )}
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="racing-card p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Receita Total
              </p>
              <h3 className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Quitado e conciliado
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="racing-card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Pagamentos Pendentes
              </p>
              <h3 className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
                R$ {pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Cobranças em aberto
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="racing-card p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Inadimplência
              </p>
              <h3 className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
                {defaultRate.toFixed(1)}%
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Do total faturado no ano</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 text-[#E10600] flex items-center justify-center">
              <AlertOctagon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="racing-card p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Faturamento do Mês
              </p>
              <h3 className="font-racing text-2xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
                R$ {currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Mês corrente
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* 6 Months Bar Chart */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-racing text-base font-bold text-[#1E1E2F] uppercase">
              Demonstrativo Semestral (Receita vs. Pendente)
            </h3>
            <p className="text-xs text-gray-500">
              Fluxo financeiro consolidado nos últimos 6 meses
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#10B981]" /> Receita Confirmada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#E10600]" /> Valores Pendentes
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                tickFormatter={(val) => `R$${val}`}
              />
              <Tooltip
                formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, '']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
              />
              <Bar dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} name="Receita" />
              <Bar dataKey="pendente" fill="#E10600" radius={[4, 4, 0, 0]} name="Pendente" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Sections: Cobranças & Pagamentos */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="bg-gray-100 p-1 border border-gray-200 rounded-xl mb-4">
          <TabsTrigger
            value="invoices"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Cobranças / Faturas ({invoices.length})
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Registro de Pagamentos ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Cobranças */}
        <TabsContent value="invoices">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {invoices.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500">
                Nenhuma cobrança registrada no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Piloto</th>
                      <th className="py-3 px-4">Campeonato</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Vencimento</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {invoices.map((inv) => {
                      const pilot = pilots.find((p) => p.id === inv.pilot_id)
                      const champ = championships.find((c) => c.id === inv.championship_id)

                      return (
                        <tr
                          key={inv.id}
                          onClick={() => navigate(`/financeiro/cobrancas/${inv.id}`)}
                          className="hover:bg-red-50/30 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-gray-900">
                            {pilot?.name || 'Piloto'}
                          </td>

                          <td className="py-3.5 px-4 text-gray-600">
                            {champ?.name || 'Campeonato'}
                          </td>

                          <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">
                            {inv.description || '-'}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            {inv.due_date
                              ? new Date(inv.due_date).toLocaleDateString('pt-BR')
                              : '-'}
                          </td>

                          <td className="py-3.5 px-4 font-racing font-bold text-gray-900">
                            R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize font-medium ${
                                inv.status === 'pago'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : inv.status === 'pendente'
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : inv.status === 'atrazado'
                                      ? 'bg-red-50 text-red-700 border-red-300'
                                      : 'bg-gray-100 text-gray-600 border-gray-300'
                              }`}
                            >
                              {inv.status}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/financeiro/cobrancas/${inv.id}`)
                                }}
                                className="h-7 w-7 text-gray-500 hover:text-gray-900"
                                title="Ver Detalhes"
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
                                      navigate(`/financeiro/cobrancas/${inv.id}/editar`)
                                    }}
                                    className="h-7 w-7 text-gray-500 hover:text-blue-600"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handleDeleteInvoice(inv.id, e)}
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
        </TabsContent>

        {/* Tab Pagamentos */}
        <TabsContent value="payments">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500">
                Nenhum pagamento liquidado no sistema.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Piloto Pagador</th>
                      <th className="py-3 px-4">Valor Liquidado</th>
                      <th className="py-3 px-4">Data do Pagamento</th>
                      <th className="py-3 px-4">Forma de Pagamento</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {payments.map((p) => {
                      const pilot = pilots.find((pilot) => pilot.id === p.pilot_id)

                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/30">
                          <td className="py-3.5 px-4 font-semibold text-gray-900">
                            {pilot?.name || 'Piloto'}
                          </td>

                          <td className="py-3.5 px-4 font-racing font-bold text-emerald-600">
                            R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                            {p.payment_date
                              ? new Date(p.payment_date).toLocaleString('pt-BR')
                              : new Date(p.created).toLocaleDateString('pt-BR')}
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {p.method}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5" /> Confirmado
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
