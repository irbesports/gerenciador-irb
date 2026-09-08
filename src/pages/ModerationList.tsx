import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Check,
  X,
  Eye,
  AlertTriangle,
  UserCheck,
  FileText,
  Clock,
  Scale,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  infractionsService,
  pilotsService,
  supportService,
  moderationCasesService,
} from '@/services/api'
import type { Infraction, Pilot, SupportTicket, ModerationCase } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'

export default function ModerationList() {
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const navigate = useNavigate()
  const [infractions, setInfractions] = useState<Infraction[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Details dialog
  const [detailItem, setDetailItem] = useState<any>(null)

  const loadData = async () => {
    try {
      const [infs, pList, tList, casesList] = await Promise.all([
        infractionsService.list(),
        pilotsService.list(),
        supportService.listTickets(),
        moderationCasesService.listAll().catch(() => []),
      ])
      setInfractions(infs)
      setPilots(pList)
      setTickets(tList)
      setModerationCases(casesList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a fila de moderação.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime<Infraction>('infractions', () => loadData())
  useRealtime<SupportTicket>('support_tickets', () => loadData())
  useRealtime<ModerationCase>('moderation_cases', () => loadData())

  // Pending moderation items
  const pendingInfractions = infractions.filter(
    (i) => i.status === 'aberta' || i.status === 'em_revisao',
  )
  const pendingTickets = tickets.filter((t) => t.status === 'aberto')
  const inactivePilots = pilots.filter((p) => p.status === 'inativo')
  const pendingCases = moderationCases.filter((c) => c.status === 'Em análise')

  const handleApproveInfraction = async (id: string) => {
    try {
      await infractionsService.update(id, { status: 'resolvida' })
      toast({ title: 'Aprovado', description: 'Infração julgada e aplicada com sucesso.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao moderar infração.', variant: 'destructive' })
    }
  }

  const handleRejectInfraction = async (id: string) => {
    try {
      await infractionsService.update(id, { status: 'descartada' })
      toast({ title: 'Rejeitado', description: 'Denúncia de infração descartada/arquivada.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao rejeitar infração.', variant: 'destructive' })
    }
  }

  const handleActivatePilot = async (id: string) => {
    try {
      await pilotsService.update(id, { status: 'ativo' })
      toast({ title: 'Piloto Aprovado', description: 'Licença desportiva ativada.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao aprovar piloto.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Fila de Moderação & Auditoria
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Revisão de novos pilotos, julgamento de denúncias de pista e validação de demandas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-red-50 text-[#E10600] border border-red-200 text-xs px-2.5 py-1 font-bold">
            {pendingCases.length +
              pendingInfractions.length +
              inactivePilots.length +
              pendingTickets.length}{' '}
            pendências
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="bg-gray-100 p-1 border border-gray-200 rounded-xl mb-4 flex-wrap">
          <TabsTrigger
            value="cases"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold flex items-center gap-1.5"
          >
            <Scale className="w-3.5 h-3.5" />
            Casos de Moderação ({moderationCases.length})
          </TabsTrigger>
          <TabsTrigger
            value="infractions"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Denúncias de Infração ({pendingInfractions.length})
          </TabsTrigger>
          <TabsTrigger
            value="pilots"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Licenças de Pilotos ({inactivePilots.length})
          </TabsTrigger>
          <TabsTrigger
            value="support"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#E10600] font-semibold"
          >
            Demandas Técnicas ({pendingTickets.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Denúncias de Infração */}
        <TabsContent value="infractions">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {pendingInfractions.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500">
                Nenhuma denúncia pendente de julgamento no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Piloto Denunciado</th>
                      <th className="py-3 px-4">Tipo da Ocorrência</th>
                      <th className="py-3 px-4">Severidade</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4 text-right">Ações de Moderação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {pendingInfractions.map((inf) => {
                      const pilot = pilots.find((p) => p.id === inf.pilot_id)

                      return (
                        <tr key={inf.id} className="hover:bg-red-50/20">
                          <td className="py-3.5 px-4 font-semibold text-gray-900">
                            {pilot?.name || 'Piloto'}
                          </td>

                          <td className="py-3.5 px-4 font-medium text-gray-800">
                            {inf.type.replace(/_/g, ' ').toUpperCase()}
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge
                              className={`text-[9px] uppercase font-bold ${
                                inf.severity === 'alta'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {inf.severity}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">
                            {inf.description || '-'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDetailItem(inf)}
                                className="h-7 text-xs text-gray-600 border-gray-300"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Detalhes
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleApproveInfraction(inf.id)}
                                className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Aprovar
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleRejectInfraction(inf.id)}
                                className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs px-2.5"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Rejeitar
                              </Button>
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

        {/* Tab 2: Licenças de Pilotos */}
        <TabsContent value="pilots">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {inactivePilots.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500">
                Todos os pilotos ativos e homologados.
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {inactivePilots.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50 gap-3"
                  >
                    <div>
                      <h4 className="font-racing font-bold text-sm text-gray-900">{p.name}</h4>
                      <p className="text-xs text-gray-500">
                        Equipe: {p.team_name || 'Independente'} • Status: Aguardando homologação
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleActivatePilot(p.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Homologar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 0: Casos e Protestos de Moderação */}
        <TabsContent value="cases">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {moderationCases.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500">
                Nenhum caso ou protesto anotado no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Volta</th>
                      <th className="py-3 px-4">Campeonato / Etapa</th>
                      <th className="py-3 px-4">Notificado Por</th>
                      <th className="py-3 px-4">Infração Citada</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {moderationCases.map((c) => {
                      const notifBy =
                        c.opened_by_type === 'comissarios'
                          ? 'Comissários de Prova'
                          : c.expand?.author_pilot_id?.name ||
                            c.expand?.author_user_id?.name ||
                            'Piloto'

                      const race = c.expand?.stage_race_id
                      const stage = race?.expand?.stage_id
                      const champ = c.expand?.championship_id || stage?.expand?.championship_id

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-red-50/20 cursor-pointer"
                          onClick={() => navigate(`/moderacao/caso/${c.id}`)}
                        >
                          <td className="py-3.5 px-4 font-racing font-bold text-gray-900">
                            Volta {c.lap}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-gray-800 block">
                              {champ?.name || 'Campeonato'}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              Etapa {stage?.order ?? 1} • {race?.name || 'Corrida'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                              {notifBy}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-800 font-medium">
                            {c.infraction_cited || 'A definir'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              className={`text-[10px] font-bold uppercase ${
                                c.status === 'Em análise'
                                  ? 'bg-amber-100 text-amber-800'
                                  : c.status === 'Nenhuma ação necessária'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {c.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/moderacao/caso/${c.id}`)
                              }}
                              className="text-xs text-[#E10600] font-semibold h-7"
                            >
                              Ver Detalhes
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
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

        {/* Tab 3: Demandas Técnicas */}
        <TabsContent value="support">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {pendingTickets.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500">
                Nenhum chamado de suporte aguardando atendimento.
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {pendingTickets.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50 gap-3"
                  >
                    <div>
                      <span className="font-semibold text-xs text-gray-900 block">{t.subject}</span>
                      <p className="text-[11px] text-gray-500 truncate max-w-lg mt-0.5">
                        {t.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailItem(t)}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={Boolean(detailItem)} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
              Detalhes da Ocorrência
            </DialogTitle>
          </DialogHeader>

          {detailItem && (
            <div className="space-y-3 py-2 text-xs">
              <div>
                <span className="font-semibold text-gray-500 uppercase block text-[10px]">
                  Identificador
                </span>
                <span className="font-mono text-gray-800">{detailItem.id}</span>
              </div>

              {detailItem.type && (
                <div>
                  <span className="font-semibold text-gray-500 uppercase block text-[10px]">
                    Tipo
                  </span>
                  <span className="font-medium text-gray-900">{detailItem.type}</span>
                </div>
              )}

              <div>
                <span className="font-semibold text-gray-500 uppercase block text-[10px]">
                  Descrição Completa
                </span>
                <p className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 leading-relaxed mt-1">
                  {detailItem.description || detailItem.content}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
