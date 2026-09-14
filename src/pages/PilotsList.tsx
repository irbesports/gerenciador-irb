import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Search, Trophy, Award, Shield, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { pilotsService } from '@/services/api'
import type { Pilot } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function PilotsList() {
  const navigate = useNavigate()
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [pilots, setPilots] = useState<Pilot[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Modal create/edit pilot
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPilot, setEditingPilot] = useState<Pilot | null>(null)
  const [pilotName, setPilotName] = useState('')
  const [pilotNumber, setPilotNumber] = useState<number | ''>('')
  const [pilotIracingId, setPilotIracingId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [pilotStatus, setPilotStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [isSaving, setIsSaving] = useState(false)

  const loadPilots = async () => {
    try {
      const list = await pilotsService.list()
      setPilots(list)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pilotos.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPilots()
  }, [])

  const filteredPilots = useMemo(() => {
    return pilots.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.team_name && p.team_name.toLowerCase().includes(search.toLowerCase())),
    )
  }, [pilots, search])

  const handleOpenCreate = () => {
    setEditingPilot(null)
    setPilotName('')
    setPilotNumber('')
    setPilotIracingId('')
    setTeamName('')
    setPilotStatus('ativo')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p: Pilot, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPilot(p)
    setPilotName(p.name)
    setPilotNumber(p.number ?? '')
    setPilotIracingId(p.iracing_id || '')
    setTeamName(p.team_name || '')
    setPilotStatus(p.status || 'ativo')
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Deseja excluir este piloto?')) return
    try {
      await pilotsService.delete(id)
      toast({ title: 'Sucesso', description: 'Piloto removido.' })
      loadPilots()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao excluir o piloto.', variant: 'destructive' })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pilotName.trim()) return

    const irIdTrim = pilotIracingId.trim()
    if (irIdTrim) {
      // Check duplicate iRacing ID
      const existing = await pilotsService.getByIracingId(irIdTrim)
      if (existing && (!editingPilot || existing.id !== editingPilot.id)) {
        toast({
          title: 'ID iRacing já cadastrado',
          description: `O ID ${irIdTrim} já pertence ao piloto "${existing.name}". O ID iRacing deve ser único.`,
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setIsSaving(true)
      const payload: any = {
        name: pilotName,
        team_name: teamName,
        status: pilotStatus,
        iracing_id: irIdTrim || undefined,
      }
      if (pilotNumber !== '') payload.number = Number(pilotNumber)

      if (editingPilot) {
        await pilotsService.update(editingPilot.id, payload)
        toast({ title: 'Sucesso', description: 'Piloto atualizado.' })
      } else {
        await pilotsService.create(payload)
        toast({ title: 'Sucesso', description: 'Piloto cadastrado com sucesso!' })
      }

      setIsModalOpen(false)
      loadPilots()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Erro ao salvar piloto.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Pilotos Cadastrados
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Grid oficial de pilotos da federação com métricas individuais
          </p>
        </div>

        {isCollaborator && (
          <Button
            onClick={handleOpenCreate}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Piloto
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar piloto por nome ou equipe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs bg-[#F5F5F7] border-gray-300"
          />
        </div>
      </Card>

      {/* Pilot Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
          Carregando pilotos...
        </div>
      ) : filteredPilots.length === 0 ? (
        <Card className="p-12 text-center space-y-2 bg-white border border-gray-200 rounded-xl">
          <Users className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-sm font-medium text-gray-700">Nenhum piloto encontrado.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPilots.map((p, idx) => {
            // Simulated pilot career points
            const totalPoints = 65 + (idx % 3) * 20

            return (
              <Card
                key={p.id}
                onClick={() => navigate(`/dashboard/pilotos/${p.id}`)}
                className="racing-card overflow-hidden border border-gray-200 bg-white cursor-pointer relative group"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 rounded-xl border border-gray-200 shadow-sm">
                        <AvatarImage src={p.avatar} />
                        <AvatarFallback className="bg-[#14141F] text-white font-racing font-bold">
                          {p.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-racing text-base font-bold text-gray-900 group-hover:text-[#E10600] transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <span>{p.team_name || 'Piloto Independente'}</span>
                          {p.iracing_id && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              [ID:{p.iracing_id}]
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {p.number && (
                      <span className="font-racing text-2xl font-bold text-gray-300 group-hover:text-[#E10600] transition-colors">
                        #{p.number}
                      </span>
                    )}
                  </div>

                  {/* Stats snippet */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                      <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                        Pontos Totais
                      </span>
                      <span className="font-racing text-base font-bold text-[#E10600] tabular-nums">
                        {totalPoints} pts
                      </span>
                    </div>

                    <div className="bg-gray-50 p-2 rounded-lg text-center flex flex-col justify-center items-center">
                      <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                        Status
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-4 px-1.5 capitalize font-medium ${
                          p.status === 'ativo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-gray-100 text-gray-600 border-gray-300'
                        }`}
                      >
                        {p.status || 'ativo'}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between border-t border-gray-50">
                    <span className="text-xs text-[#E10600] font-semibold group-hover:underline">
                      Ver Perfil Completo →
                    </span>

                    {isCollaborator && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleOpenEdit(p, e)}
                          className="h-7 w-7 text-gray-400 hover:text-gray-900"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(p.id, e)}
                          className="h-7 w-7 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Dialog Pilot */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
              {editingPilot ? 'Editar Piloto' : 'Cadastrar Novo Piloto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pilot-name" className="text-xs font-semibold uppercase text-gray-700">
                Nome do Piloto *
              </Label>
              <Input
                id="pilot-name"
                placeholder="Ex: Carlos Silva"
                value={pilotName}
                onChange={(e) => setPilotName(e.target.value)}
                required
                className="bg-[#F5F5F7] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="pilot-num"
                  className="text-xs font-semibold uppercase text-gray-700"
                >
                  Número do Carro
                </Label>
                <Input
                  id="pilot-num"
                  type="number"
                  placeholder="Ex: 11"
                  value={pilotNumber}
                  onChange={(e) =>
                    setPilotNumber(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="bg-[#F5F5F7] text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-700">Status</Label>
                <Select value={pilotStatus} onValueChange={(val: any) => setPilotStatus(val)}>
                  <SelectTrigger className="text-xs bg-[#F5F5F7]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="p-iracing"
                  className="text-xs font-semibold uppercase text-gray-700"
                >
                  ID iRacing (Único)
                </Label>
                <Input
                  id="p-iracing"
                  placeholder="Ex: 569362"
                  value={pilotIracingId}
                  onChange={(e) => setPilotIracingId(e.target.value)}
                  className="bg-[#F5F5F7] text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="team-name"
                  className="text-xs font-semibold uppercase text-gray-700"
                >
                  Nome da Equipe
                </Label>
                <Input
                  id="team-name"
                  placeholder="Ex: Scuderia Apex"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="bg-[#F5F5F7] text-sm"
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
                className="bg-[#E10600] hover:bg-[#C00500] text-white"
              >
                {isSaving ? 'Salvando...' : 'Gravar Piloto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
