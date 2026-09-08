import React, { useEffect, useState } from 'react'
import { Building2, Plus, Edit2, Trash2, Globe, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { manufacturersService } from '@/services/api'
import type { Manufacturer } from '@/types'
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

export default function ManufacturersList() {
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Manufacturer | null>(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [foundedYear, setFoundedYear] = useState<number | ''>('')
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    try {
      const list = await manufacturersService.list()
      setManufacturers(list)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao carregar montadoras.', variant: 'destructive' })
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
    setFoundedYear('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (m: Manufacturer) => {
    setEditing(m)
    setName(m.name)
    setCountry(m.country || '')
    setFoundedYear(m.founded_year ?? '')
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta montadora?')) return
    try {
      await manufacturersService.delete(id)
      toast({ title: 'Sucesso', description: 'Montadora excluída.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao excluir montadora.', variant: 'destructive' })
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
      if (foundedYear !== '') payload.founded_year = Number(foundedYear)

      if (editing) {
        await manufacturersService.update(editing.id, payload)
        toast({ title: 'Sucesso', description: 'Montadora atualizada.' })
      } else {
        await manufacturersService.create(payload)
        toast({ title: 'Sucesso', description: 'Montadora cadastrada!' })
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao salvar.',
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
            Montadoras & Construtores
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Fabricantes homologados para fornecer chassis e motores
          </p>
        </div>

        {isCollaborator && (
          <Button
            onClick={handleOpenCreate}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Montadora
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
          Carregando montadoras...
        </div>
      ) : manufacturers.length === 0 ? (
        <Card className="p-12 text-center text-xs text-gray-500">
          Nenhuma montadora cadastrada.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {manufacturers.map((m) => (
            <Card key={m.id} className="racing-card p-5 bg-white border border-gray-200 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-[#E10600] flex items-center justify-center font-racing font-bold text-lg">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-racing text-base font-bold text-gray-900">{m.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Globe className="w-3 h-3 text-gray-400" />
                      {m.country || 'Origem Global'}
                    </p>
                  </div>
                </div>

                {isCollaborator && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(m)}
                      className="h-7 w-7 text-gray-400 hover:text-gray-900"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(m.id)}
                      className="h-7 w-7 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Fundação:
                </span>
                <span className="font-mono font-semibold text-gray-800">
                  {m.founded_year || 'Tradição Histórica'}
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
              {editing ? 'Editar Montadora' : 'Cadastrar Montadora'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-700">
                Nome da Montadora *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-[#F5F5F7] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-700">
                  País de Origem
                </Label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Ex: Itália"
                  className="bg-[#F5F5F7] text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-700">
                  Ano de Fundação
                </Label>
                <Input
                  type="number"
                  value={foundedYear}
                  onChange={(e) =>
                    setFoundedYear(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="Ex: 1947"
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
                {isSaving ? 'Salvando...' : 'Salvar Montadora'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
