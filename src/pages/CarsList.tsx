import React, { useEffect, useState } from 'react'
import { Car as CarIcon, Plus, Edit2, Trash2, Calendar, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { carsService, manufacturersService } from '@/services/api'
import type { Car, Manufacturer } from '@/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function CarsList() {
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [cars, setCars] = useState<Car[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Car | null>(null)
  const [model, setModel] = useState('')
  const [manufacturerId, setManufacturerId] = useState('')
  const [category, setCategory] = useState('GT3')
  const [year, setYear] = useState<number | ''>('')
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    try {
      const [cList, mList] = await Promise.all([carsService.list(), manufacturersService.list()])
      setCars(cList)
      setManufacturers(mList)
      if (mList.length > 0 && !manufacturerId) setManufacturerId(mList[0].id)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao carregar os carros.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setEditing(null)
    setModel('')
    setCategory('GT3')
    setYear(2024)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (c: Car) => {
    setEditing(c)
    setModel(c.model)
    setManufacturerId(c.manufacturer_id)
    setCategory(c.category || 'GT3')
    setYear(c.year ?? '')
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este carro?')) return
    try {
      await carsService.delete(id)
      toast({ title: 'Sucesso', description: 'Carro removido.' })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Falha ao remover carro.', variant: 'destructive' })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!model.trim() || !manufacturerId) return

    try {
      setIsSaving(true)
      const payload: any = {
        model,
        manufacturer_id: manufacturerId,
        category,
      }
      if (year !== '') payload.year = Number(year)

      if (editing) {
        await carsService.update(editing.id, payload)
        toast({ title: 'Sucesso', description: 'Carro atualizado.' })
      } else {
        await carsService.create(payload)
        toast({ title: 'Sucesso', description: 'Novo carro cadastrado!' })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao salvar carro.',
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
            Carros & Homologações
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Ficha técnica dos veículos autorizados para competir nas etapas
          </p>
        </div>

        {isCollaborator && (
          <Button
            onClick={handleOpenCreate}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold shadow-sm btn-checkered-sweep"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Carro
          </Button>
        )}
      </div>

      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500 animate-pulse">
            Carregando carros...
          </div>
        ) : cars.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">Nenhum carro cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Modelo do Carro</th>
                  <th className="py-3 px-4">Montadora</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Ano</th>
                  <th className="py-3 px-4">Status de Homologação</th>
                  {isCollaborator && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {cars.map((c) => {
                  const manu = manufacturers.find((m) => m.id === c.manufacturer_id)

                  return (
                    <tr key={c.id} className="hover:bg-red-50/30">
                      <td className="py-3.5 px-4 font-racing font-bold text-gray-900 flex items-center gap-2">
                        <CarIcon className="w-4 h-4 text-[#E10600]" />
                        <span>{c.model}</span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        {manu?.name || 'Montadora'}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge className="bg-gray-100 text-gray-800 border-none font-mono text-[10px]">
                          {c.category || 'GT'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-600">{c.year || '-'}</td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                          <Shield className="w-3.5 h-3.5" /> Aprovado FIA
                        </span>
                      </td>

                      {isCollaborator && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(c)}
                              className="h-7 w-7 text-gray-400 hover:text-gray-900"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(c.id)}
                              className="h-7 w-7 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
              {editing ? 'Editar Carro' : 'Cadastrar Carro'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-700">Modelo *</Label>
              <Input
                placeholder="Ex: Ferrari 296 GT3"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                className="bg-[#F5F5F7] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-700">Montadora *</Label>
              <Select value={manufacturerId} onValueChange={setManufacturerId}>
                <SelectTrigger className="text-xs bg-[#F5F5F7]">
                  <SelectValue placeholder="Selecione a montadora" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-700">Categoria</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: GT3, GT4, F4"
                  className="bg-[#F5F5F7] text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-700">Ano</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 2024"
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
                {isSaving ? 'Salvando...' : 'Gravar Carro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
