import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HelpCircle,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supportService } from '@/services/api'
import type { SupportTicket, TicketPriority, TicketStatus } from '@/types'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'

export default function SupportList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal new ticket
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('media')
  const [isSaving, setIsSaving] = useState(false)

  const loadTickets = async () => {
    try {
      const list = await supportService.listTickets()
      setTickets(list)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os chamados.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  useRealtime<SupportTicket>('support_tickets', () => loadTickets())

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !content.trim()) return

    try {
      setIsSaving(true)
      const created = await supportService.createTicket({
        user_id: user?.id,
        subject,
        content,
        priority,
        status: 'aberto',
      })

      // Also create first message
      if (created.id && user) {
        await supportService.sendMessage(created.id, content, user.id)
      }

      toast({ title: 'Sucesso', description: 'Chamado aberto com sucesso!' })
      setIsModalOpen(false)
      setSubject('')
      setContent('')
      navigate(`/suporte/${created.id}`)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao abrir chamado.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Central de Suporte & Demandas
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Acompanhamento de solicitações técnicas, homologações e regulamento
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Chamado
        </Button>
      </div>

      {/* Ticket List */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
            Carregando chamados...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Nenhum chamado aberto.</p>
            <p className="text-xs text-gray-400">
              Clique em "Novo Chamado" para enviar uma dúvida ou demanda à equipe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Assunto</th>
                  <th className="py-3 px-4">Autor</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Abertura</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {tickets.map((t) => {
                  const authorName = t.expand?.user_id?.name || 'Usuário'

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/suporte/${t.id}`)}
                      className="hover:bg-red-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-gray-900 group-hover:text-[#E10600]">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-[#E10600]" />
                          <span>{t.subject}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate max-w-md mt-0.5 font-normal">
                          {t.content}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-gray-800 font-medium">{authorName}</td>

                      <td className="py-3.5 px-4">
                        <Badge
                          className={`text-[9px] uppercase font-bold ${
                            t.priority === 'alta'
                              ? 'bg-red-100 text-red-700'
                              : t.priority === 'media'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {t.priority}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize font-medium ${
                            t.status === 'resolvido'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : t.status === 'em_andamento'
                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                : t.status === 'fechado'
                                  ? 'bg-gray-100 text-gray-600 border-gray-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {t.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                        {new Date(t.created).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#E10600] group-hover:translate-x-0.5 inline transition-transform" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Ticket Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
              Abrir Novo Chamado de Suporte
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-subj" className="text-xs font-semibold uppercase text-gray-700">
                Assunto do Chamado *
              </Label>
              <Input
                id="t-subj"
                placeholder="Ex: Homologação de pneu para Etapa 3"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="bg-[#F5F5F7] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-700">
                Grau de Prioridade *
              </Label>
              <Select value={priority} onValueChange={(val) => setPriority(val as TicketPriority)}>
                <SelectTrigger className="text-xs bg-[#F5F5F7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa (Dúvidas gerais)</SelectItem>
                  <SelectItem value="media">Média (Ajustes de grid)</SelectItem>
                  <SelectItem value="alta">Alta (Urgência antes da corrida)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-content" className="text-xs font-semibold uppercase text-gray-700">
                Mensagem Inicial / Detalhes *
              </Label>
              <Textarea
                id="t-content"
                rows={4}
                placeholder="Descreva claramente a dúvida ou solicitação..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="text-xs bg-[#F5F5F7]"
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
                {isSaving ? 'Enviando...' : 'Abrir Chamado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
