import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  Scale,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  User,
  Timer,
  FileText,
  BadgeAlert,
  HelpCircle,
} from 'lucide-react'
import {
  moderationCasesService,
  moderationCaseMessagesService,
  pilotsService,
  notificationsService,
} from '@/services/api'
import type { ModerationCase, ModerationCaseMessage, Pilot, ModerationCaseStatus } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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

export default function ModerationCaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isCollaborator } = useAuth()
  const { toast } = useToast()

  const [caseRecord, setCaseRecord] = useState<ModerationCase | null>(null)
  const [messages, setMessages] = useState<ModerationCaseMessage[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [currentUserPilot, setCurrentUserPilot] = useState<Pilot | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ModerationCaseStatus>('Em análise')
  const [rulingNote, setRulingNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const [c, msgList, pList] = await Promise.all([
        moderationCasesService.getOne(id),
        moderationCaseMessagesService.listByCase(id),
        pilotsService.list(),
      ])
      setCaseRecord(c)
      setMessages(msgList)
      setPilots(pList)
      setSelectedStatus(c.status)

      if (user?.id) {
        const myPilot = pList.find((p) => p.user_id === user.id)
        if (myPilot) setCurrentUserPilot(myPilot)
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o caso de moderação.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime<ModerationCaseMessage>('moderation_case_messages', () => {
    if (id) {
      moderationCaseMessagesService.listByCase(id).then(setMessages)
    }
  })

  // Calculate 24h deadline countdown
  const deadlineInfo = useMemo(() => {
    if (!caseRecord?.deadline) return { expired: false, label: 'Sem prazo estipulado' }
    const deadlineTime = new Date(caseRecord.deadline).getTime()
    const now = Date.now()
    const diff = deadlineTime - now

    if (diff <= 0) {
      return { expired: true, label: 'Prazo de 24h expirado' }
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return {
      expired: false,
      label: `${hours}h ${minutes}min restantes para manifestação`,
      hours,
    }
  }, [caseRecord?.deadline])

  // Post response/version
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !id) return

    try {
      setIsSending(true)
      await moderationCaseMessagesService.create({
        case_id: id,
        user_id: user.id,
        pilot_id: currentUserPilot?.id || undefined,
        message: newMessage.trim(),
        is_steward_ruling: isCollaborator,
      })

      setNewMessage('')
      const updated = await moderationCaseMessagesService.listByCase(id)
      setMessages(updated)
      toast({
        title: 'Manifestação Enviada',
        description: 'Sua versão/resposta foi anexada ao processo.',
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao enviar manifestação.',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  // Update Status / Ruling (Steward/Collaborator only)
  const handleUpdateStatus = async () => {
    if (!id || !caseRecord) return

    try {
      setIsUpdatingStatus(true)
      const updated = await moderationCasesService.update(id, {
        status: selectedStatus,
        penalty_applied: rulingNote || caseRecord.penalty_applied,
      })

      // Add ruling message to thread
      await moderationCaseMessagesService.create({
        case_id: id,
        user_id: user!.id,
        message: `DECISÃO OFICIAL DOS COMISSÁRIOS: Status alterado para "${selectedStatus}". ${rulingNote ? `Observações da decisão: ${rulingNote}` : ''}`,
        is_steward_ruling: true,
      })

      // Notify involved pilots of decision
      const involvedPilotRecords = pilots.filter((p) => caseRecord.involved_pilots?.includes(p.id))
      await notificationsService.notifyCaseRuling({
        caseRecord: updated,
        involvedPilotRecords,
        status: selectedStatus,
        rulingText: rulingNote,
      })

      setCaseRecord(updated)
      const updatedMsgs = await moderationCaseMessagesService.listByCase(id)
      setMessages(updatedMsgs)

      toast({
        title: 'Decisão Aplicada',
        description: `O status do caso foi alterado para "${selectedStatus}" e os pilotos foram notificados.`,
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao atualizar o status.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm text-gray-400 animate-pulse">
        Carregando processo de moderação...
      </div>
    )
  }

  if (!caseRecord) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-gray-400">Caso não encontrado ou sem permissão de acesso.</p>
        <Button
          variant="outline"
          onClick={() => navigate('/moderacao')}
          className="text-xs border-white/10"
        >
          Voltar para Moderação
        </Button>
      </div>
    )
  }

  const race = caseRecord.expand?.stage_race_id
  const stage = race?.expand?.stage_id
  const champ = caseRecord.expand?.championship_id || stage?.expand?.championship_id
  const track = stage?.expand?.track

  const involvedList =
    caseRecord.expand?.involved_pilots ||
    pilots.filter((p) => caseRecord.involved_pilots?.includes(p.id))

  const guiltyPilot =
    caseRecord.expand?.guilty_pilot_id || pilots.find((p) => p.id === caseRecord.guilty_pilot_id)

  const authorPilot =
    caseRecord.expand?.author_pilot_id || pilots.find((p) => p.id === caseRecord.author_pilot_id)

  const notifByText =
    caseRecord.opened_by_type === 'comissarios'
      ? 'Comissários de Prova'
      : authorPilot
        ? `#${authorPilot.number ?? ''} - ${authorPilot.name}`
        : caseRecord.expand?.author_user_id?.name || 'Piloto'

  const statusColors = {
    'Aplicado pós corrida': 'bg-[#1b4332] text-[#74c69d] border-[#2d6a4f]',
    'Aplicado em corrida': 'bg-[#2d6a4f] text-[#95d5b2] border-[#40916c]',
    'Nenhuma ação necessária': 'bg-[#2b2d42] text-gray-300 border-white/10',
    'Em análise': 'bg-amber-950/60 text-amber-300 border-amber-600/40',
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* Top back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => (race?.id ? navigate(`/moderacao/corrida/${race.id}`) : navigate(-1))}
          className="text-xs text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
          Voltar para Incidentes da Prova
        </Button>
      </div>

      {/* Case Header Banner */}
      <div className="bg-[#161622] p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs bg-[#E10600]/15 text-[#E10600] border-[#E10600]/30 font-racing uppercase tracking-wider"
              >
                {caseRecord.opened_by_type === 'comissarios'
                  ? 'Anotação dos Comissários'
                  : 'Protesto Oficial de Piloto'}
              </Badge>
              <span className="text-gray-500">•</span>
              <span className="text-xs text-gray-400">
                {champ?.name || 'Campeonato'} • Etapa {stage?.order ?? 1}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[#90e0ef] font-bold bg-[#0d2137] px-2.5 py-0.5 rounded border border-[#0077b6]/40">
                {caseRecord.code || `CASO-#${caseRecord.id.slice(0, 8)}`}
              </span>
              {caseRecord.case_number && (
                <span className="text-[11px] text-gray-400 font-mono">
                  (Incidente #{caseRecord.case_number})
                </span>
              )}
            </div>

            <h1 className="font-racing text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
              <span className="w-2.5 h-7 bg-[#E10600] rounded-sm inline-block shadow-[0_0_12px_rgba(225,6,0,0.5)]"></span>
              Incidente na Volta {caseRecord.lap}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold border uppercase tracking-wide ${
                statusColors[caseRecord.status] || 'bg-gray-800 text-gray-300'
              }`}
            >
              Status: {caseRecord.status}
            </span>
          </div>
        </div>

        {/* 24h Deadline Banner */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
            deadlineInfo.expired
              ? 'bg-red-950/30 border-red-500/30 text-red-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Timer className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-bold">Prazo para Defesa / Versão:</span>{' '}
              <span>{deadlineInfo.label}</span>
            </div>
          </div>
          <span className="text-[11px] opacity-80 font-mono">
            Limite: {new Date(caseRecord.deadline || Date.now()).toLocaleString('pt-BR')}
          </span>
        </div>

        {/* Details Grid (Matching Print specifications) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-[#1F1F30]/70 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-racing text-gray-400 block tracking-wider">
              Localização
            </span>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E10600]" />
              {track?.name || 'Pista a definir'}
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              {race?.name || `Corrida ${race?.order ?? 1}`} • Volta {caseRecord.lap}
            </div>
          </div>

          <div className="p-3 bg-[#1F1F30]/70 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-racing text-gray-400 block tracking-wider">
              Notificado por
            </span>
            <div className="text-xs font-semibold text-white truncate">{notifByText}</div>
            <div className="text-[11px] text-gray-400">
              {caseRecord.opened_by_type === 'comissarios'
                ? 'Comissão Ativa IRB'
                : 'Protesto de Piloto'}
            </div>
          </div>

          <div className="p-3 bg-[#1F1F30]/70 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-racing text-gray-400 block tracking-wider">
              Infração Citada
            </span>
            <div className="text-xs font-semibold text-white leading-snug">
              {caseRecord.infraction_cited || 'A definir'}
            </div>
            {caseRecord.penalty_applied && (
              <div className="text-[11px] text-red-400 font-mono">
                Penalidade: {caseRecord.penalty_applied}
              </div>
            )}
          </div>

          <div className="p-3 bg-[#1F1F30]/70 rounded-xl border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-racing text-gray-400 block tracking-wider">
              Culpado Declarado
            </span>
            <div>
              {guiltyPilot ? (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e63946]/20 text-[#ff758f] border border-[#e63946]/50">
                  #{guiltyPilot.number ?? '•'} {guiltyPilot.name}
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">Em julgamento / Não atribuído</span>
              )}
            </div>
          </div>
        </div>

        {/* Pilotos Citados */}
        <div className="p-3 bg-[#1F1F30]/50 rounded-xl border border-white/5 space-y-2">
          <span className="text-[10px] uppercase font-racing text-gray-400 block tracking-wider">
            Carros & Pilotos Envolvidos
          </span>
          <div className="flex flex-wrap gap-2">
            {involvedList.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#0d2137] text-[#90e0ef] border border-[#0077b6]/30 flex items-center gap-1.5"
              >
                <span>#{p.number ?? '•'}</span>
                <span>{p.name}</span>
                {p.team_name && (
                  <span className="text-[10px] text-gray-400 font-normal">({p.team_name})</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Descrição inicial */}
        {caseRecord.description && (
          <div className="p-3.5 bg-[#1F1F30]/40 rounded-xl border border-white/5 text-xs text-gray-300 space-y-1">
            <span className="text-[10px] uppercase font-racing text-gray-400 block tracking-wider">
              Relato do Incidente
            </span>
            <p className="whitespace-pre-wrap leading-relaxed">{caseRecord.description}</p>
          </div>
        )}
      </div>

      {/* Steward Control Box (Collaborator only) */}
      {isCollaborator && (
        <Card className="p-6 bg-[#161622] border border-[#E10600]/30 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <ShieldCheck className="w-5 h-5 text-[#E10600]" />
            <h2 className="font-racing text-sm font-bold text-white uppercase tracking-wider">
              Painel de Decisão dos Comissários
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Alterar Status do Julgamento</Label>
              <Select
                value={selectedStatus}
                onValueChange={(val) => setSelectedStatus(val as ModerationCaseStatus)}
              >
                <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                  <SelectItem value="Em análise">Em análise</SelectItem>
                  <SelectItem value="Aplicado em corrida">Aplicado em corrida</SelectItem>
                  <SelectItem value="Aplicado pós corrida">Aplicado pós corrida</SelectItem>
                  <SelectItem value="Nenhuma ação necessária">Nenhuma ação necessária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Penalidade / Resumo da Decisão</Label>
              <Input
                placeholder="Ex: 5.4.1.1 / Acréscimo de 5s no tempo final"
                value={rulingNote}
                onChange={(e) => setRulingNote(e.target.value)}
                className="bg-[#1F1F30] border-white/10 text-white text-xs h-10"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={isUpdatingStatus}
              onClick={handleUpdateStatus}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-5"
            >
              {isUpdatingStatus ? 'Aplicando...' : 'Aplicar Decisão & Notificar Pilotos'}
            </Button>
          </div>
        </Card>
      )}

      {/* Thread: Versões dos Pilotos e Análises dos Comissários */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#E10600]" />
            <h2 className="font-racing text-sm font-bold text-white uppercase tracking-wider">
              Defesa dos Pilotos & Manifestações ({messages.length})
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">
            Cada piloto citado pode submeter sua versão do incidente
          </span>
        </div>

        {/* Messages List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="p-8 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-500 text-xs">
              Nenhuma manifestação registrada até agora. Os pilotos citados podem responder
              utilizando o campo abaixo.
            </div>
          ) : (
            messages.map((m) => {
              const isRuling = m.is_steward_ruling
              const pilotName = m.expand?.pilot_id?.name
              const authorName = pilotName
                ? `#${m.expand?.pilot_id?.number ?? '•'} ${pilotName}`
                : m.expand?.user_id?.name || 'Participante'

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border space-y-2 ${
                    isRuling
                      ? 'bg-[#1b2838]/70 border-[#0077b6]/40 shadow-sm'
                      : 'bg-[#1F1F30]/60 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-racing font-bold uppercase tracking-wider ${
                          isRuling ? 'text-[#90e0ef]' : 'text-white'
                        }`}
                      >
                        {authorName}
                      </span>
                      {isRuling && (
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-blue-500/20 text-blue-300 border-blue-500/40 font-mono uppercase"
                        >
                          Decisão Oficial
                        </Badge>
                      )}
                    </div>
                    <span className="text-gray-500 font-mono text-[11px]">
                      {new Date(m.created).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {m.message}
                  </p>
                </div>
              )
            })
          )}
        </div>

        {/* Input Form for pilot version or comment */}
        <form onSubmit={handleSendMessage} className="space-y-3 pt-3 border-t border-white/10">
          <Label className="text-xs text-gray-300 font-semibold block">
            Adicionar sua Versão / Resposta
          </Label>
          <Textarea
            rows={3}
            placeholder="Apresente sua versão detalhada do incidente (ex: 'Estava mantendo a linha interna quando houve o toque...')"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="text-xs bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600] resize-y"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              Sua resposta será visível para os comissários e pilotos envolvidos no caso.
            </span>
            <Button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-5"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {isSending ? 'Enviando...' : 'Enviar Manifestação'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
