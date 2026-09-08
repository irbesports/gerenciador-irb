import React, { useEffect, useState } from 'react'
import { MapPin, Plus, Edit2, Trash2, Gauge, Flag } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { tracksService } from '@/services/api'
import type { Track } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function TracksList() {
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Track | null>(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [length, setLength] = useState<number | ''>('')
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    try {
      const list = await tracksService.list()
      setTracks(list)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao carregar as pistas.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setEditing(null)
    setName('')
    setCountry('')
    setLength('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (t: Track) => {
    setEditing(t)
    setName(t.name)
    setCountry(t.country || '')
    setLength(t.length ?? '')
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta pista?')) return
    try {
      await tracksService.delete(id)
      toast({ title: 'Sucesso', description: 'Pista removida.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao remover pista.', variant: 'destructive' })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      setIsSaving(true)
      const payload: any = {
        name,
        country,
      }
      if (length !== '') payload.length = Number(length)

      if (editing) {
        await tracksService.update(editing.id, payload)
        toast({ title: 'Sucesso', description: 'Pista atualizada.' })
      } else {
        await tracksService.create(payload)
        toast({ title: 'Sucesso', description: 'Nova pista cadastrada!' })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao salvar pista.',
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
            Autódromos & Circuitos
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Pistas homologadas com traçados, extensões e especificações técnicas
          </p>
        </div>

        {isCollaborator && (
          <Button
            onClick={handleOpenCreate}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Pista
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
          Carregando circuitos...
        </div>
      ) : tracks.length === 0 ? (
        <Card className="p-12 text-center text-xs text-gray-500">Nenhum autódromo cadastrado.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tracks.map((t) => (
            <Card key={t.id} className="racing-card p-5 bg-white border border-gray-200 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-[#E10600] flex items-center justify-center font-racing font-bold text-lg">
                    <Flag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-racing text-base font-bold text-gray-900">{t.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-red-500" />
                      {t.country || 'Local Não Informado'}
                    </p>
                  </div>
                </div>

                {isCollaborator && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(t)}
                      className="h-7 w-7 text-gray-400 hover:text-gray-900"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(t.id)}
                      className="h-7 w-7 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" /> Extensão Total:
                </span>
                <span className="font-racing font-bold text-gray-900 text-sm">
                  {t.length ? `${t.length.toLocaleString('pt-BR')} metros` : 'Traçado Padrão'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
              {editing ? 'Editar Circuito' : 'Cadastrar Circuito'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-700">
                Nome do Circuito *
              </Label>
              <Input
                placeholder="Ex: Autódromo de Interlagos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-[#F5F5F7] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-700">
                  País / Cidade
                </Label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Ex: Brasil (SP)"
                  className="bg-[#F5F5F7] text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-700">
                  Comprimento (metros)
                </Label>
                <Input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 4309"
                  className="bg-[#F5F5F7] text-sm font-mono"
                />
              </div>
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
                className="bg-[#E10600] text-white"
              >
                {isSaving ? 'Salvando...' : 'Gravar Circuito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
