import React, { useState } from 'react'
import { Award, Plus, Trash2, Save, BookmarkCheck, Sparkles, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { ScoringPreset, SingleScoringConfig, MultiClassScoringConfig, Car } from '@/types'
import { scoringPresetsService } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

interface ScoringTabProps {
  multiClass: boolean
  singleConfig: SingleScoringConfig
  setSingleConfig: React.Dispatch<React.SetStateAction<SingleScoringConfig>>
  multiConfigs: MultiClassScoringConfig[]
  setMultiConfigs: React.Dispatch<React.SetStateAction<MultiClassScoringConfig[]>>
  presets: ScoringPreset[]
  setPresets: React.Dispatch<React.SetStateAction<ScoringPreset[]>>
  selectedCars: Car[]
}

export default function ScoringTab({
  multiClass,
  singleConfig,
  setSingleConfig,
  multiConfigs,
  setMultiConfigs,
  presets,
  setPresets,
  selectedCars,
}: ScoringTabProps) {
  const { toast } = useToast()

  // Save as new preset modal
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDesc, setNewPresetDesc] = useState('')
  const [presetRulesToSave, setPresetRulesToSave] = useState<
    { position: number; points: number }[]
  >([])

  // Helper for applying preset to single class
  const handleSelectSinglePreset = (val: string) => {
    if (val === 'custom') {
      setSingleConfig({
        ...singleConfig,
        preset_id: undefined,
      })
      return
    }
    const found = presets.find((p) => p.id === val)
    if (found) {
      setSingleConfig({
        preset_id: found.id,
        rules: found.rules.map((r) => ({ position: r.position, points: r.points })),
      })
    }
  }

  // Helper for applying preset to multi class item
  const handleSelectMultiPreset = (classIndex: number, val: string) => {
    const updated = [...multiConfigs]
    if (val === 'custom') {
      updated[classIndex].preset_id = undefined
      setMultiConfigs(updated)
      return
    }
    const found = presets.find((p) => p.id === val)
    if (found) {
      updated[classIndex].preset_id = found.id
      updated[classIndex].rules = found.rules.map((r) => ({
        position: r.position,
        points: r.points,
      }))
      setMultiConfigs(updated)
    }
  }

  const handleUpdateSinglePoints = (posIdx: number, points: number) => {
    const newRules = [...singleConfig.rules]
    newRules[posIdx] = { ...newRules[posIdx], points }
    setSingleConfig({
      preset_id: undefined, // switched to custom
      rules: newRules,
    })
  }

  const handleUpdateMultiPoints = (classIdx: number, posIdx: number, points: number) => {
    const updated = [...multiConfigs]
    const rules = [...updated[classIdx].rules]
    rules[posIdx] = { ...rules[posIdx], points }
    updated[classIdx].rules = rules
    updated[classIdx].preset_id = undefined // switched to custom
    setMultiConfigs(updated)
  }

  const openSavePresetModal = (rules: { position: number; points: number }[]) => {
    setPresetRulesToSave(rules)
    setNewPresetName('')
    setNewPresetDesc('')
    setIsPresetModalOpen(true)
  }

  const handleSaveNewPreset = async () => {
    if (!newPresetName.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do novo preset de pontuação.',
        variant: 'destructive',
      })
      return
    }

    try {
      const created = await scoringPresetsService.create({
        name: newPresetName.trim(),
        description: newPresetDesc.trim(),
        rules: presetRulesToSave,
      })
      setPresets([...presets, created])
      toast({
        title: 'Preset gravado',
        description: `O preset "${created.name}" agora está disponível na biblioteca.`,
      })
      setIsPresetModalOpen(false)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar preset',
        description: err?.message || 'Verifique se já não existe um preset com este nome.',
        variant: 'destructive',
      })
    }
  }

  const handleAddClass = () => {
    const defaultRules = presets[0]?.rules || [
      { position: 1, points: 25 },
      { position: 2, points: 18 },
      { position: 3, points: 15 },
    ]
    setMultiConfigs([
      ...multiConfigs,
      {
        class_name: `Classe ${multiConfigs.length + 1}`,
        preset_id: presets[0]?.id,
        rules: defaultRules.map((r) => ({ position: r.position, points: r.points })),
      },
    ])
  }

  const handleRemoveClass = (index: number) => {
    if (multiConfigs.length <= 1) {
      toast({
        title: 'Atenção',
        description: 'Mantenha ao menos uma classe configurada.',
        variant: 'destructive',
      })
      return
    }
    setMultiConfigs(multiConfigs.filter((_, idx) => idx !== index))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Non Multi-Class Mode: Exactly matching user print 3 */}
      {!multiClass ? (
        <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <span className="font-racing text-xs font-bold text-white uppercase tracking-wider">
              BATERIA 1 / CORRIDA (PONTUAÇÃO PADRÃO)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openSavePresetModal(singleConfig.rules)}
              className="text-xs bg-[#1F1F30] border-white/10 text-gray-200 hover:text-white"
            >
              <BookmarkCheck className="w-3.5 h-3.5 mr-1.5 text-[#E10600]" />
              Salvar como novo Preset
            </Button>
          </div>

          {/* Subcard Box matching print 3 */}
          <div className="max-w-md p-4 bg-[#1F1F30]/60 rounded-xl border border-white/10 space-y-3">
            {/* Header label */}
            <div className="text-center pb-2 border-b border-white/5">
              <span className="text-xs font-semibold text-gray-300">
                {singleConfig.preset_id
                  ? presets.find((p) => p.id === singleConfig.preset_id)?.name ||
                    'Sistema de pontuação'
                  : 'Sistema Personalizado'}
              </span>
            </div>

            {/* Dropdown "Sistema de pontuação" */}
            <div className="space-y-1">
              <Select
                value={singleConfig.preset_id || 'custom'}
                onValueChange={handleSelectSinglePreset}
              >
                <SelectTrigger className="text-xs bg-[#161622] border-white/10 text-white h-9">
                  <SelectValue placeholder="Sistema de pontuação" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                  {presets.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Personalizado (Manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3 columns grid of position -> points: "1º - 80", "2º - 74", "3º - 69"... exactly like Print 3 */}
            <div className="grid grid-cols-3 gap-x-3 gap-y-2 pt-2 text-xs font-mono">
              {singleConfig.rules.map((rule, posIdx) => (
                <div key={rule.position} className="flex items-center gap-1.5 text-gray-200">
                  <span className="text-gray-400 w-7">{rule.position}º -</span>
                  {singleConfig.preset_id ? (
                    <span className="font-semibold text-white">{rule.points}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      value={rule.points}
                      onChange={(e) => handleUpdateSinglePoints(posIdx, Number(e.target.value))}
                      className="w-14 h-7 text-xs font-mono bg-[#161622] border-white/10 text-white p-1 text-center"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        /* Multi-Class Mode: One card per car class */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-racing text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-5 bg-[#E10600] rounded-sm inline-block" />
                Pontuação Multi-Classe
              </h2>
              <p className="text-xs text-gray-400">
                Cada categoria homologada possui sua própria grade de posições e pontuação.
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleAddClass}
              className="bg-[#1F1F30] hover:bg-[#2A2A3D] text-white text-xs font-racing uppercase tracking-wider px-3 border border-white/10"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
              Adicionar Classe
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {multiConfigs.map((cfg, classIdx) => (
              <Card
                key={classIdx}
                className="p-5 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <Input
                    value={cfg.class_name}
                    onChange={(e) => {
                      const updated = [...multiConfigs]
                      updated[classIdx].class_name = e.target.value
                      setMultiConfigs(updated)
                    }}
                    placeholder="Nome da Classe (Ex: Pro / Cup)"
                    className="h-8 text-xs font-racing font-bold uppercase tracking-wider bg-[#1F1F30] border-white/10 text-white w-44"
                  />

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openSavePresetModal(cfg.rules)}
                      className="text-gray-400 hover:text-white p-1 h-7"
                      title="Salvar como preset"
                    >
                      <BookmarkCheck className="w-4 h-4 text-[#E10600]" />
                    </Button>
                    {multiConfigs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveClass(classIdx)}
                        className="text-gray-400 hover:text-[#E10600] p-1 h-7"
                        title="Remover classe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Preset Dropdown */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-400">Sistema de pontuação</Label>
                  <Select
                    value={cfg.preset_id || 'custom'}
                    onValueChange={(val) => handleSelectMultiPreset(classIdx, val)}
                  >
                    <SelectTrigger className="text-xs bg-[#1F1F30] border-white/10 text-white h-9">
                      <SelectValue placeholder="Selecione um preset" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                      {presets.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id}>
                          {pr.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Personalizado (Manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 3 columns grid of position -> points */}
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 pt-2 text-xs font-mono max-h-72 overflow-y-auto pr-1">
                  {cfg.rules.map((rule, posIdx) => (
                    <div key={rule.position} className="flex items-center gap-1 text-gray-200">
                      <span className="text-gray-400 w-6">{rule.position}º-</span>
                      {cfg.preset_id ? (
                        <span className="font-semibold text-white">{rule.points}</span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          value={rule.points}
                          onChange={(e) =>
                            handleUpdateMultiPoints(classIdx, posIdx, Number(e.target.value))
                          }
                          className="w-12 h-6 text-xs font-mono bg-[#161622] border-white/10 text-white p-0.5 text-center"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Salvar como novo preset */}
      <Dialog open={isPresetModalOpen} onOpenChange={setIsPresetModalOpen}>
        <DialogContent className="max-w-md bg-[#161622] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-[#E10600]" />
              Salvar como Novo Preset de Pontuação
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-gray-300">Nome do Preset *</Label>
              <Input
                placeholder="Ex: IMSA WeatherTech / IndyCar Padrão"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="text-xs bg-[#1F1F30] border-white/10 text-white h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-gray-300">Descrição (Opcional)</Label>
              <Input
                placeholder="Ex: Tabela de pontos oficiais com bonificação para top 20..."
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
                className="text-xs bg-[#1F1F30] border-white/10 text-white h-9"
              />
            </div>

            <div className="p-3 bg-[#1F1F30] rounded-lg border border-white/5 space-y-1">
              <span className="text-[11px] text-gray-400 block">Resumo das regras:</span>
              <span className="text-xs text-gray-200 font-mono">
                {presetRulesToSave.length} posições cadastradas (1º:{' '}
                {presetRulesToSave[0]?.points ?? 0} pts, 2º: {presetRulesToSave[1]?.points ?? 0}{' '}
                pts...)
              </span>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPresetModalOpen(false)}
              className="text-xs bg-transparent border-white/15 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveNewPreset}
              className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-4"
            >
              Gravar Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
