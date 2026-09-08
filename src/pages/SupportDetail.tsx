import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  Shield,
  User as UserIcon,
  Tag,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supportService } from '@/services/api'
import type { SupportTicket, SupportMessage, TicketStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

export default function SupportDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isCollaborator } = useAuth()
  const { toast } = useToast()

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadData = async () => {
    if (!id) return
    try {
      const [t, m] = await Promise.all([
        supportService.getTicket(id),
        supportService.listMessages(id),
      ])
      setTicket(t)
      setMessages(m)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o chamado.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Realtime messages
  useRealtime<SupportMessage>('support_messages', () => {
    if (id) {
      supportService.listMessages(id).then(setMessages)
    }
  })

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !user || !newMessage.trim()) return

    try {
      setIsSending(true)
      await supportService.sendMessage(id, newMessage.trim(), user.id)
      setNewMessage('')
      const updated = await supportService.listMessages(id)
      setMessages(updated)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!id) return
    try {
      await supportService.updateTicket(id, { status: newStatus })
      toast({ title: 'Status Atualizado', description: `Chamado marcado como ${newStatus}.` })
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao mudar status do chamado.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading || !ticket) {
    return (
      <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
        Carregando histórico do chamado...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/suporte')}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Central de Chamados
        </Button>
      </div>

      {/* Header Info */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={`text-[9px] uppercase font-bold ${
                ticket.priority === 'alta'
                  ? 'bg-red-100 text-red-700'
                  : ticket.priority === 'media'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
              }`}
            >
              Prioridade {ticket.priority}
            </Badge>

            <Badge
              variant="outline"
              className={`text-[10px] capitalize font-medium ${
                ticket.status === 'resolvido'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : ticket.status === 'em_andamento'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              {ticket.status.replace(/_/g, ' ')}
            </Badge>

            <span className="text-xs text-gray-400 font-mono">#{ticket.id.slice(0, 8)}</span>
          </div>

          <h1 className="font-racing text-xl sm:text-2xl font-bold text-[#1E1E2F]">
            {ticket.subject}
          </h1>

          <p className="text-xs text-gray-500">
            Aberto por{' '}
            <span className="font-semibold text-gray-800">
              {ticket.expand?.user_id?.name || 'Usuário'}
            </span>{' '}
            em {new Date(ticket.created).toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Status switch for collaborators */}
        {isCollaborator && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
              Alterar Status:
            </span>
            <Select
              value={ticket.status}
              onValueChange={(val) => handleStatusChange(val as TicketStatus)}
            >
              <SelectTrigger className="w-36 text-xs bg-[#F5F5F7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      {/* Messages Thread (Chat Bubbles) */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[520px]">
        {/* Messages viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
              Nenhuma mensagem registrada. Inicie a conversa abaixo.
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = user?.id === msg.user_id
              const authorName = msg.expand?.user_id?.name || (isMine ? 'Você' : 'Equipe Técnica')

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%]',
                    isMine ? 'ml-auto flex-row-reverse' : 'mr-auto',
                  )}
                >
                  <Avatar className="w-7 h-7 rounded-full shrink-0 border border-gray-200">
                    <AvatarFallback
                      className={cn(
                        'text-[10px] font-bold text-white',
                        isMine ? 'bg-[#E10600]' : 'bg-[#14141F]',
                      )}
                    >
                      {authorName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1 min-w-0">
                    <div
                      className={cn(
                        'flex items-center gap-2 text-[10px] text-gray-400',
                        isMine ? 'justify-end' : 'justify-start',
                      )}
                    >
                      <span className="font-semibold text-gray-700">{authorName}</span>
                      <span>•</span>
                      <span>
                        {new Date(msg.created).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={cn(
                        'p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm break-words',
                        isMine
                          ? 'bg-[#E10600] text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none',
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-white border-t border-gray-200 flex items-center gap-2"
        >
          <Textarea
            rows={1}
            placeholder="Digite sua resposta..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(e)
              }
            }}
            className="text-xs bg-[#F5F5F7] resize-none min-h-[40px] max-h-24"
          />

          <Button
            type="submit"
            disabled={isSending || !newMessage.trim()}
            className="bg-[#E10600] hover:bg-[#C00500] text-white shrink-0 h-10 w-10 p-0 rounded-xl"
            title="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  )
}
