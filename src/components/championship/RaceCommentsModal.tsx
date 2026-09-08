import React, { useState, useEffect } from 'react'
import { MessageSquare, Send, Trash2, Clock, User as UserIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { StageRaceComment, StageRace } from '@/types'
import { stageRaceCommentsService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface RaceCommentsModalProps {
  race: StageRace | null
  stageOrder?: number
  isOpen: boolean
  onClose: () => void
}

export default function RaceCommentsModal({
  race,
  stageOrder,
  isOpen,
  onClose,
}: RaceCommentsModalProps) {
  const { user, isCollaborator } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<StageRaceComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const loadComments = async () => {
    if (!race?.id) {
      setComments([])
      return
    }
    try {
      setIsLoading(true)
      const list = await stageRaceCommentsService.listByRace(race.id)
      setComments(list)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && race?.id) {
      loadComments()
    }
  }, [isOpen, race?.id])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user || !race?.id) return

    try {
      setIsSending(true)
      await stageRaceCommentsService.create(race.id, newComment.trim(), user.id)
      setNewComment('')
      loadComments()
      toast({
        title: 'Nota salva',
        description: 'Anotação registrada com sucesso.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar o comentário.',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      await stageRaceCommentsService.delete(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#161622] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-racing text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#E10600]" />
            Discussão da Prova — {race?.name || `Corrida ${race?.order ?? 1}`}{' '}
            {stageOrder ? `(Etapa ${stageOrder})` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!race?.id ? (
            <div className="p-4 bg-[#1F1F30]/60 rounded-xl text-center text-xs text-gray-400">
              Esta corrida ainda não foi persistida. Salve as alterações do campeonato primeiro para
              vincular anotações à corrida.
            </div>
          ) : (
            <>
              {/* Comments list */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="p-6 text-center text-xs text-gray-500 animate-pulse">
                    Carregando anotações...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="p-6 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-500 text-xs">
                    Nenhuma anotação registrada ainda. Deixe um apontamento para a comissão abaixo.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg bg-[#1F1F30] border border-white/5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-200">
                          {c.expand?.user_id?.name || 'Comissário'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {new Date(c.created).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {(isCollaborator || c.user_id === user?.id) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id)}
                              className="text-gray-500 hover:text-[#E10600]"
                              title="Excluir nota"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {c.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Form to add note */}
              <form onSubmit={handleSend} className="space-y-2 pt-2 border-t border-white/10">
                <Textarea
                  rows={3}
                  placeholder="Escreva uma anotação sobre esta corrida (ex: 'Volta 12 incidente sob análise')..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="text-xs bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600]"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSending || !newComment.trim()}
                    className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-4 h-8"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    {isSending ? 'Gravando...' : 'Salvar Nota'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-white/10 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs bg-transparent border-white/15 text-gray-300"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
