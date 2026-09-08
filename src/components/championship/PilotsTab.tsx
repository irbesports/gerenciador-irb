import React, { useState, useMemo } from 'react'
import {
  Download,
  Plus,
  Trash2,
  Edit2,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ChampionshipPilot, Pilot } from '@/types'

export interface LocalChampPilot {
  id?: string
  pilot_id?: string
  name: string
  iracing_id: string
  number: number | ''
  team: string
  number_options: string
  car_class?: string
}

interface PilotsTabProps {
  champPilots: LocalChampPilot[]
  setChampPilots: React.Dispatch<React.SetStateAction<LocalChampPilot[]>>
  deletedPilotIds: string[]
  setDeletedPilotIds: React.Dispatch<React.SetStateAction<string[]>>
  availablePilots: Pilot[]
}

export default function PilotsTab({
  champPilots,
  setChampPilots,
  deletedPilotIds,
  setDeletedPilotIds,
  availablePilots,
}: PilotsTabProps) {
  // Column search filters
  const [filterIracingId, setFilterIracingId] = useState('')
  const [filterNumber, setFilterNumber] = useState('')
  const [filterName, setFilterName] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterOptions, setFilterOptions] = useState('')

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPilotIdx, setEditingPilotIdx] = useState<number | null>(null)

  const [formPilotId, setFormPilotId] = useState<string>('')
  const [formName, setFormName] = useState('')
  const [formIracingId, setFormIracingId] = useState('')
  const [formNumber, setFormNumber] = useState<number | ''>('')
  const [formTeam, setFormTeam] = useState('')
  const [formNumberOptions, setFormNumberOptions] = useState('')

  // Filtered rows
  const filteredList = useMemo(() => {
    return champPilots.filter((p) => {
      const matchIracing =
        !filterIracingId || (p.iracing_id && p.iracing_id.includes(filterIracingId))
      const matchNumber =
        !filterNumber || (p.number !== '' && String(p.number).includes(filterNumber))
      const matchName = !filterName || p.name.toLowerCase().includes(filterName.toLowerCase())
      const matchTeam = !filterTeam || p.team.toLowerCase().includes(filterTeam.toLowerCase())
      const matchOptions =
        !filterOptions ||
        (p.number_options && p.number_options.toLowerCase().includes(filterOptions.toLowerCase()))

      return matchIracing && matchNumber && matchName && matchTeam && matchOptions
    })
  }, [champPilots, filterIracingId, filterNumber, filterName, filterTeam, filterOptions])

  // Pagination logic
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  const openAddModal = () => {
    setEditingPilotIdx(null)
    setFormPilotId('')
    setFormName('')
    setFormIracingId('')
    setFormNumber('')
    setFormTeam('')
    setFormNumberOptions('')
    setIsModalOpen(true)
  }

  const openEditModal = (idx: number) => {
    const realIdx = champPilots.findIndex((p) => p === paginatedList[idx])
    if (realIdx === -1) return
    const p = champPilots[realIdx]
    setEditingPilotIdx(realIdx)
    setFormPilotId(p.pilot_id || '')
    setFormName(p.name)
    setFormIracingId(p.iracing_id)
    setFormNumber(p.number)
    setFormTeam(p.team)
    setFormNumberOptions(p.number_options)
    setIsModalOpen(true)
  }

  const handleSelectExistingPilot = (selectedId: string) => {
    setFormPilotId(selectedId)
    const p = availablePilots.find((item) => item.id === selectedId)
    if (p) {
      setFormName(p.name)
      if (p.number) setFormNumber(p.number)
      if (p.team_name) setFormTeam(p.team_name)
    }
  }

  const handleSavePilot = () => {
    if (!formName.trim()) {
      alert('Informe o nome do piloto.')
      return
    }

    const payload: LocalChampPilot = {
      pilot_id: formPilotId || undefined,
      name: formName.trim(),
      iracing_id: formIracingId.trim(),
      number: formNumber !== '' ? Number(formNumber) : '',
      team: formTeam.trim(),
      number_options: formNumberOptions.trim(),
    }

    if (editingPilotIdx !== null) {
      const updated = [...champPilots]
      updated[editingPilotIdx] = {
        ...updated[editingPilotIdx],
        ...payload,
      }
      setChampPilots(updated)
    } else {
      setChampPilots([payload, ...champPilots])
    }

    setIsModalOpen(false)
  }

  const handleDeletePilot = (idx: number) => {
    const realIdx = champPilots.findIndex((p) => p === paginatedList[idx])
    if (realIdx === -1) return
    if (!window.confirm(`Remover piloto ${champPilots[realIdx].name} do campeonato?`)) return

    const item = champPilots[realIdx]
    if (item.id) {
      setDeletedPilotIds([...deletedPilotIds, item.id])
    }
    const remaining = champPilots.filter((_, i) => i !== realIdx)
    setChampPilots(remaining)
  }

  const exportCSV = () => {
    const headers = ['ID iRacing', 'Numero', 'Nome', 'Equipe', 'Opcoes de numeros']
    const rows = champPilots.map((p) => [
      p.iracing_id || '',
      p.number !== '' ? p.number : '',
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.team.replace(/"/g, '""')}"`,
      `"${p.number_options.replace(/"/g, '""')}"`,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'pilotos_campeonato.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        {/* Header with Export (tray) and Add (+) buttons like Print 2 */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="font-racing text-sm font-bold text-white uppercase tracking-wider block">
              Grade de Pilotos Inscritos ({champPilots.length})
            </span>
            <span className="text-[11px] text-gray-400">
              Gerencie números oficiais, ID iRacing e vinculações por equipe
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Export CSV button */}
            <button
              type="button"
              onClick={exportCSV}
              className="p-2 rounded-lg bg-[#1F1F30] hover:bg-[#2A2A3D] text-gray-300 hover:text-white border border-white/10 transition-colors"
              title="Exportar CSV de Pilotos"
            >
              <Download className="w-4 h-4 text-gray-300" />
            </button>

            {/* Add pilot (+) button */}
            <button
              type="button"
              onClick={openAddModal}
              className="p-2 rounded-lg bg-[#14141F] hover:bg-[#2A2A3D] text-white border border-white/10 shadow-sm transition-colors"
              title="Adicionar Piloto"
            >
              <Plus className="w-4 h-4 text-[#E10600]" />
            </button>
          </div>
        </div>

        {/* Table with Filter Row (Exact columns matching user print 2) */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1F1F30]/30">
          <table className="w-full text-left text-xs text-gray-300">
            <thead>
              <tr className="border-b border-white/10 bg-[#14141F] text-[11px] font-racing text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-24 text-center">Ações</th>
                <th className="py-3 px-4 w-36">ID iRacing</th>
                <th className="py-3 px-4 w-28">Número</th>
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">Equipe</th>
                <th className="py-3 px-4">Opções de números</th>
              </tr>

              {/* Filter inputs row directly below headers (Verbatim matching print 2) */}
              <tr className="border-b border-white/10 bg-[#14141F]/60">
                <th className="py-2 px-4 text-center"></th>
                {/* ID iRacing filter */}
                <th className="py-2 px-2">
                  <div className="relative">
                    <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2" />
                    <Input
                      placeholder=""
                      value={filterIracingId}
                      onChange={(e) => {
                        setFilterIracingId(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="text-xs bg-[#1F1F30] border-white/10 text-white h-7 pl-7 py-1"
                    />
                  </div>
                </th>

                {/* Número filter */}
                <th className="py-2 px-2">
                  <div className="relative">
                    <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2" />
                    <Input
                      placeholder=""
                      value={filterNumber}
                      onChange={(e) => {
                        setFilterNumber(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="text-xs bg-[#1F1F30] border-white/10 text-white h-7 pl-7 py-1"
                    />
                  </div>
                </th>

                {/* Nome filter */}
                <th className="py-2 px-2">
                  <div className="relative">
                    <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2" />
                    <Input
                      placeholder=""
                      value={filterName}
                      onChange={(e) => {
                        setFilterName(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="text-xs bg-[#1F1F30] border-white/10 text-white h-7 pl-7 py-1"
                    />
                  </div>
                </th>

                {/* Equipe filter */}
                <th className="py-2 px-2">
                  <div className="relative">
                    <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2" />
                    <Input
                      placeholder=""
                      value={filterTeam}
                      onChange={(e) => {
                        setFilterTeam(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="text-xs bg-[#1F1F30] border-white/10 text-white h-7 pl-7 py-1"
                    />
                  </div>
                </th>

                {/* Opções de números filter */}
                <th className="py-2 px-2">
                  <div className="relative">
                    <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2" />
                    <Input
                      placeholder=""
                      value={filterOptions}
                      onChange={(e) => {
                        setFilterOptions(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="text-xs bg-[#1F1F30] border-white/10 text-white h-7 pl-7 py-1"
                    />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Nenhum piloto encontrado com os filtros informados.
                  </td>
                </tr>
              ) : (
                paginatedList.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-white/5 transition-colors">
                    {/* Ações (Trash + Pencil) */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeletePilot(idx)}
                          className="p-1 rounded text-gray-400 hover:text-[#E10600] transition-colors"
                          title="Remover piloto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(idx)}
                          className="p-1 rounded text-gray-400 hover:text-white transition-colors"
                          title="Editar piloto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                    {/* ID iRacing */}
                    <td className="py-3 px-4 font-mono text-gray-300">{p.iracing_id || '-'}</td>

                    {/* Número */}
                    <td className="py-3 px-4 font-racing font-bold text-white text-sm">
                      {p.number !== '' ? p.number : '-'}
                    </td>

                    {/* Nome */}
                    <td className="py-3 px-4 font-medium text-gray-200">{p.name}</td>

                    {/* Equipe */}
                    <td className="py-3 px-4 text-gray-300">{p.team || '-'}</td>

                    {/* Opções de números */}
                    <td className="py-3 px-4 text-gray-400 font-mono">{p.number_options || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer matching print: "10 linhas v |< < 1-10 de 43 > >|" */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[11px]">Linhas por página:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-24 h-7 text-xs bg-[#1F1F30] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                <SelectItem value="5">5 linhas</SelectItem>
                <SelectItem value="10">10 linhas</SelectItem>
                <SelectItem value="25">25 linhas</SelectItem>
                <SelectItem value="50">50 linhas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono">
              {filteredList.length === 0
                ? '0 de 0'
                : `${(currentPage - 1) * pageSize + 1}-${Math.min(
                    currentPage * pageSize,
                    filteredList.length,
                  )} de ${filteredList.length}`}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300"
                title="Primeira página"
              >
                ⇤
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300"
                title="Próxima página"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-gray-300"
                title="Última página"
              >
                ⇥
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal: Adicionar / Editar Piloto */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-[#161622] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#E10600]" />
              {editingPilotIdx !== null ? 'Editar Piloto' : 'Adicionar Piloto ao Campeonato'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Quick selector of already registered pilots */}
            <div className="space-y-1">
              <Label className="text-gray-300">Vincular a Piloto Cadastrado (Opcional)</Label>
              <Select value={formPilotId} onValueChange={handleSelectExistingPilot}>
                <SelectTrigger className="text-xs bg-[#1F1F30] border-white/10 text-white h-9">
                  <SelectValue placeholder="Selecione um piloto existente..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1F1F30] border-white/10 text-white max-h-48">
                  {availablePilots.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.number ? `(#${p.number})` : ''}{' '}
                      {p.team_name ? `- ${p.team_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300">Nome do Piloto *</Label>
              <Input
                placeholder="Ex: André Nassutti"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs bg-[#1F1F30] border-white/10 text-white h-9"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-gray-300">ID iRacing</Label>
                <Input
                  placeholder="Ex: 1019454"
                  value={formIracingId}
                  onChange={(e) => setFormIracingId(e.target.value)}
                  className="text-xs bg-[#1F1F30] border-white/10 text-white h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-300">Número Oficial</Label>
                <Input
                  type="number"
                  placeholder="Ex: 46"
                  value={formNumber}
                  onChange={(e) =>
                    setFormNumber(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="text-xs font-mono bg-[#1F1F30] border-white/10 text-white h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300">Equipe</Label>
              <Input
                placeholder="Ex: Kings By TK"
                value={formTeam}
                onChange={(e) => setFormTeam(e.target.value)}
                className="text-xs bg-[#1F1F30] border-white/10 text-white h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300">Opções de números (Ex: (46, 460, 69))</Label>
              <Input
                placeholder="(46, 460, 69)"
                value={formNumberOptions}
                onChange={(e) => setFormNumberOptions(e.target.value)}
                className="text-xs bg-[#1F1F30] border-white/10 text-white h-9"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="text-xs bg-transparent border-white/15 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSavePilot}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-4"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
