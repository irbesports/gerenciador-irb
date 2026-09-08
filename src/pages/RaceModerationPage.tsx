import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Clock,
  MapPin,
  Calendar,
  CloudSun,
  ShieldAlert,
  Send,
  MessageSquare,
  AlertTriangle,
  Award,
} from 'lucide-react'
import { stageRacesService, stageRaceCommentsService } from '@/services/api'
import type { StageRace, StageRaceComment } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export default function RaceModerationPage() {
  const { raceId } = useParams<{ raceId: string }>()
  const navigate = useNavigate()
  const { user, isCollaborator } = useAuth()
  const { toast } = useToast()

  const [race, setRace] = useState<StageRace | null>(null)
  const [comments, setComments] = useState<StageRaceComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  const loadData = async () => {
    if (!raceId) return
    try {
      setIsLoading(true)
      const r = await stageRacesService.getOne(raceId)
      setRace(r)
      const cList = await stageRaceCommentsService.listByRace(raceId)
      setComments(cList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados desta corrida.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [raceId])

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user || !raceId) return

    try {
      setIsSending(true)
      await stageRaceCommentsService.create(raceId, newComment.trim(), user.id)
      setNewComment('')
      const updated = await stageRaceCommentsService.listByRace(raceId)
      setComments(updated)
      toast({
        title: 'Comentário enviado',
        description: 'A anotação foi registrada com sucesso nesta corrida.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o comentário.',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm text-gray-400 animate-pulse">
        Carregando moderação da prova...
      </div>
    )
  }

  if (!race) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-gray-400">Corrida não encontrada ou sem permissão de acesso.</p>
        <Button
          variant="outline"
          onClick={() => navigate('/campeonatos')}
          className="text-xs border-white/10"
        >
          Voltar para Campeonatos
        </Button>
      </div>
    )
  }

  const stage = race.expand?.stage_id
  const champ = stage?.expand?.championship_id
  const track = stage?.expand?.track

  const formattedDate = stage?.date
    ? new Date(stage.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-'

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* Top back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => (champ?.id ? navigate(`/campeonatos/${champ.id}/editar`) : navigate(-1))}
          className="text-xs text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
          Voltar para Etapa / Campeonato
        </Button>
      </div>

      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#161622] p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs bg-[#E10600]/15 text-[#E10600] border-[#E10600]/30 font-racing uppercase tracking-wider"
            >
              Comissários & Moderação
            </Badge>
            <span className="text-gray-500">•</span>
            <span className="text-xs text-gray-400 font-medium">
              {champ?.name || 'Campeonato'} • Etapa {stage?.order ?? 1}
            </span>
          </div>

          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-7 bg-[#E10600] rounded-sm inline-block shadow-[0_0_12px_rgba(225,6,0,0.5)]"></span>
            Moderação: {race.name || `Corrida ${race.order}`}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1.5 text-gray-200">
              <MapPin className="w-3.5 h-3.5 text-[#E10600]" />
              {track?.name || 'Pista a definir'}{' '}
              {stage?.track_layout ? `(${stage.track_layout})` : ''}
            </span>
            <span className="text-gray-600">•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {formattedDate}
            </span>
            <span className="text-gray-600">•</span>
            <span className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {race.duration} {race.duration_type} {race.start_time ? `às ${race.start_time}` : ''}
            </span>
            {race.weather && (
              <>
                <span className="text-gray-600">•</span>
                <span className="flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                  {race.weather}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="z-10 flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs border-white/20 text-gray-300 bg-white/5 py-1 px-3"
          >
            Status: {stage?.status || 'Agendada'}
          </Badge>
        </div>
      </div>

      {/* Placeholder functional note */}
      <Card className="p-5 bg-gradient-to-r from-amber-950/30 to-[#161622] border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-racing text-sm font-bold uppercase tracking-wider text-amber-300">
            Painel da Prova — Moderação de Incidentes
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            Esta é a página individual de moderação da{' '}
            <strong>{race.name || `Corrida ${race.order}`}</strong> (Etapa {stage?.order ?? 1}). O
            formulário de incidentes, telemetria de protestos e penalizações de tempo detalhadas
            virão no próximo módulo do regulamento desportivo. Use o canal de discussão abaixo para
            notas entre os comissários.
          </p>
        </div>
      </Card>

      {/* Discussion Thread */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#E10600]" />
            <h2 className="font-racing text-sm font-bold text-white uppercase tracking-wider">
              Anotações e Discussão da Comissão ({comments.length})
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">
            Visível para Administradores e Comissários
          </span>
        </div>

        {/* List of comments */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <div className="p-8 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-500 text-xs">
              Nenhuma anotação registrada ainda para esta corrida. Envie o primeiro apontamento
              abaixo.
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-[#1F1F30]/60 border border-white/5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-racing font-bold text-gray-200 uppercase tracking-wide">
                    {c.expand?.user_id?.name || 'Comissário'}
                  </span>
                  <span className="text-gray-500 font-mono">
                    {new Date(c.created).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {c.message}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleSendComment} className="space-y-3 pt-3 border-t border-white/10">
          <Textarea
            rows={3}
            placeholder="Escreva uma anotação sobre esta corrida (ex: 'Volta 4 toque investigado entre #46 e #115')..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="text-xs bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600] resize-y"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSending || !newComment.trim()}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-4 py-2"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {isSending ? 'Gravando...' : 'Publicar Nota'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
