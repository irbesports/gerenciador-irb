import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Award,
  Zap,
  Upload,
  Car as CarIcon,
  Check,
  X,
  Clock,
  Layers,
  Sparkles,
  Info,
  Calendar,
  CloudSun,
} from 'lucide-react'
import {
  championshipsService,
  seasonsService,
  scoringRulesService,
  carsService,
  manufacturersService,
  championshipBatteriesService,
  getFileUrl,
} from '@/services/api'
import type {
  Season,
  ChampionshipStatus,
  ChampionshipType,
  Car,
  Manufacturer,
  BatteryDurationType,
  ChampionshipBattery,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface ScoringRow {
  position: number
  points: number
}

interface LocalBattery {
  id?: string
  order: number
  duration_type: BatteryDurationType
  duration: number
  start_time: string
  weather: string
  inverted_positions: number
}

type TabKey = 'detalhes' | 'carros' | 'baterias' | 'etapas' | 'pilotos' | 'pontuacao'

export default function ChampionshipForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabKey>('detalhes')

  // Basic Details
  const [name, setName] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ChampionshipStatus>('ativo')
  const [championshipType, setChampionshipType] = useState<ChampionshipType>('Road')

  // Numeric fields
  const [dropScores, setDropScores] = useState<number>(0)
  const [pilotsPerTeam, setPilotsPerTeam] = useState<number>(0)
  const [scoringPilotsPerTeam, setScoringPilotsPerTeam] = useState<number>(0)
  const [minLapPercentage, setMinLapPercentage] = useState<number>(70)
  const [bonusFastestLap, setBonusFastestLap] = useState<number>(0)
  const [bonusPolePosition, setBonusPolePosition] = useState<number>(0)
  const [bonusNoIncidents, setBonusNoIncidents] = useState<number>(0)
  const [bonusMostPositionsGained, setBonusMostPositionsGained] = useState<number>(0)
  const [bonusMostLapsLed, setBonusMostLapsLed] = useState<number>(0)
  const [bonusLeadLap, setBonusLeadLap] = useState<number>(0)
  const [penaltySuspension, setPenaltySuspension] = useState<number>(0)
  const [penaltyPitStart, setPenaltyPitStart] = useState<number>(0)

  // Switches
  const [lossPointsChangeCar, setLossPointsChangeCar] = useState<boolean>(false)
  const [teamChampionship, setTeamChampionship] = useState<boolean>(false)
  const [fixedSetup, setFixedSetup] = useState<boolean>(true)
  const [visibleToPilots, setVisibleToPilots] = useState<boolean>(true)

  // Image Upload
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [existingImage, setExistingImage] = useState<string>('')

  // Car Tab States
  const [multiClass, setMultiClass] = useState<boolean>(false)
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([])
  const [carsList, setCarsList] = useState<Car[]>([])
  const [manufacturersList, setManufacturersList] = useState<Manufacturer[]>([])
  const [isCarModalOpen, setIsCarModalOpen] = useState(false)
  const [modalSelectedCarIds, setModalSelectedCarIds] = useState<string[]>([])

  // Batteries Tab States
  const [batteries, setBatteries] = useState<LocalBattery[]>([])
  const [deletedBatteryIds, setDeletedBatteryIds] = useState<string[]>([])
  const [newBatDurationType, setNewBatDurationType] = useState<BatteryDurationType>('Minutos')
  const [newBatDuration, setNewBatDuration] = useState<number>(50)
  const [newBatStartTime, setNewBatStartTime] = useState<string>('')
  const [newBatWeather, setNewBatWeather] = useState<string>('')
  const [newBatInvertedPositions, setNewBatInvertedPositions] = useState<number>(0)

  // Scoring configuration
  const [scoringRows, setScoringRows] = useState<ScoringRow[]>([
    { position: 1, points: 25 },
    { position: 2, points: 18 },
    { position: 3, points: 15 },
    { position: 4, points: 12 },
    { position: 5, points: 10 },
    { position: 6, points: 8 },
    { position: 7, points: 6 },
    { position: 8, points: 4 },
    { position: 9, points: 2 },
    { position: 10, points: 1 },
  ])

  // Lookups & loaders
  const [seasons, setSeasons] = useState<Season[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true)
        const [sList, allCars, allManus] = await Promise.all([
          seasonsService.list(),
          carsService.list(),
          manufacturersService.list(),
        ])
        setSeasons(sList)
        setCarsList(allCars)
        setManufacturersList(allManus)

        if (sList.length > 0 && !seasonId) {
          setSeasonId(sList[0].id)
        }

        if (id) {
          const champ = await championshipsService.getOne(id)
          setName(champ.name || '')
          setSeasonId(champ.season_id || '')
          setDescription(champ.description || '')
          setStatus(champ.status || 'ativo')
          setChampionshipType((champ.championship_type as ChampionshipType) || 'Road')

          setDropScores(champ.drop_scores ?? 0)
          setPilotsPerTeam(champ.pilots_per_team ?? 0)
          setScoringPilotsPerTeam(champ.scoring_pilots_per_team ?? 0)
          setMinLapPercentage(champ.min_lap_percentage_points ?? 70)
          setBonusFastestLap(champ.bonus_fastest_lap ?? 0)
          setBonusPolePosition(champ.bonus_pole_position ?? 0)
          setBonusNoIncidents(champ.bonus_no_incidents ?? 0)
          setBonusMostPositionsGained(champ.bonus_most_positions_gained ?? 0)
          setBonusMostLapsLed(champ.bonus_most_laps_led ?? 0)
          setBonusLeadLap(champ.bonus_lead_lap ?? 0)
          setPenaltySuspension(champ.penalty_points_suspension ?? 0)
          setPenaltyPitStart(champ.penalty_points_pit_start ?? 0)

          setLossPointsChangeCar(Boolean(champ.loss_points_change_car))
          setTeamChampionship(Boolean(champ.team_championship))
          setFixedSetup(champ.fixed_setup !== undefined ? Boolean(champ.fixed_setup) : true)
          setVisibleToPilots(
            champ.visible_to_pilots !== undefined ? Boolean(champ.visible_to_pilots) : true,
          )
          setMultiClass(Boolean(champ.multi_class))

          if (champ.image) {
            setExistingImage(champ.image)
          }

          if (champ.cars && Array.isArray(champ.cars)) {
            setSelectedCarIds(champ.cars)
          }

          // Load scoring rules
          const rules = await scoringRulesService.listByChampionship(id)
          if (rules.length > 0) {
            setScoringRows(rules.map((r) => ({ position: r.position, points: r.points })))
            if (rules[0].bonus_fastest_lap !== undefined && rules[0].bonus_fastest_lap !== null) {
              setBonusFastestLap(rules[0].bonus_fastest_lap)
            }
          }

          // Load batteries
          const batts = await championshipBatteriesService.listByChampionship(id)
          setBatteries(
            batts.map((b) => ({
              id: b.id,
              order: b.order,
              duration_type: b.duration_type,
              duration: b.duration,
              start_time: b.start_time || '',
              weather: b.weather || '',
              inverted_positions: b.inverted_positions ?? 0,
            })),
          )
        }
      } catch (err) {
        console.error(err)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados do campeonato.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [id])

  // Map cars by manufacturer
  const carsByManufacturer = useMemo(() => {
    const map = new Map<string, { manufacturer: Manufacturer | null; cars: Car[] }>()

    carsList.forEach((car) => {
      const manuId = car.manufacturer_id || 'outros'
      if (!map.has(manuId)) {
        const manu = manufacturersList.find((m) => m.id === manuId) || null
        map.set(manuId, { manufacturer: manu, cars: [] })
      }
      map.get(manuId)!.cars.push(car)
    })

    return Array.from(map.values())
  }, [carsList, manufacturersList])

  // Selected cars grouped by manufacturer
  const selectedCarsGrouped = useMemo(() => {
    const map = new Map<string, { manufacturerName: string; cars: Car[] }>()

    selectedCarIds.forEach((carId) => {
      const car = carsList.find((c) => c.id === carId)
      if (!car) return
      const manu = manufacturersList.find((m) => m.id === car.manufacturer_id)
      const manuName = manu?.name || 'Montadora'

      if (!map.has(manuName)) {
        map.set(manuName, { manufacturerName: manuName, cars: [] })
      }
      map.get(manuName)!.cars.push(car)
    })

    return Array.from(map.values())
  }, [selectedCarIds, carsList, manufacturersList])

  // Scoring methods
  const handleAddPosition = () => {
    const nextPos = scoringRows.length > 0 ? scoringRows[scoringRows.length - 1].position + 1 : 1
    setScoringRows([...scoringRows, { position: nextPos, points: 0 }])
  }

  const handleRemovePosition = (index: number) => {
    setScoringRows(scoringRows.filter((_, idx) => idx !== index))
  }

  const handleScoreChange = (index: number, points: number) => {
    const updated = [...scoringRows]
    updated[index].points = points
    setScoringRows(updated)
  }

  // Battery handlers
  const handleAddBattery = () => {
    if (!newBatDuration || newBatDuration <= 0) {
      toast({
        title: 'Atenção',
        description: 'Informe uma duração válida para a bateria.',
        variant: 'destructive',
      })
      return
    }

    const nextOrder = batteries.length > 0 ? Math.max(...batteries.map((b) => b.order)) + 1 : 1

    const newBat: LocalBattery = {
      order: nextOrder,
      duration_type: newBatDurationType,
      duration: Number(newBatDuration),
      start_time: newBatStartTime,
      weather: newBatWeather,
      inverted_positions: Number(newBatInvertedPositions) || 0,
    }

    setBatteries([...batteries, newBat])
    // Reset inline inputs
    setNewBatDuration(50)
    setNewBatStartTime('')
    setNewBatWeather('')
    setNewBatInvertedPositions(0)

    toast({
      title: 'Bateria adicionada',
      description: `Bateria ${nextOrder} adicionada à lista. Lembre-se de salvar o campeonato.`,
    })
  }

  const handleCancelNewBattery = () => {
    setNewBatDuration(50)
    setNewBatStartTime('')
    setNewBatWeather('')
    setNewBatInvertedPositions(0)
  }

  const handleRemoveBattery = (index: number) => {
    const item = batteries[index]
    if (item.id) {
      setDeletedBatteryIds([...deletedBatteryIds, item.id])
    }
    const remaining = batteries.filter((_, idx) => idx !== index)
    // renumber orders sequentially
    const reordered = remaining.map((b, idx) => ({ ...b, order: idx + 1 }))
    setBatteries(reordered)
  }

  // Car selection modal handlers
  const openCarSelector = () => {
    setModalSelectedCarIds([...selectedCarIds])
    setIsCarModalOpen(true)
  }

  const toggleModalCar = (carId: string) => {
    if (modalSelectedCarIds.includes(carId)) {
      setModalSelectedCarIds(modalSelectedCarIds.filter((id) => id !== carId))
    } else {
      setModalSelectedCarIds([...modalSelectedCarIds, carId])
    }
  }

  const saveCarSelection = () => {
    setSelectedCarIds(modalSelectedCarIds)
    setIsCarModalOpen(false)
  }

  const handleRemoveSelectedCar = (carId: string) => {
    setSelectedCarIds(selectedCarIds.filter((id) => id !== carId))
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: 'Atenção',
        description: 'O campo "Nome" é obrigatório.',
        variant: 'destructive',
      })
      setActiveTab('detalhes')
      return
    }

    if (!seasonId) {
      toast({
        title: 'Atenção',
        description: 'Selecione uma "Temporada".',
        variant: 'destructive',
      })
      setActiveTab('detalhes')
      return
    }

    try {
      setIsSaving(true)

      // Prepare payload (using FormData if image is present)
      const formData = new FormData()
      formData.append('name', name)
      formData.append('season_id', seasonId)
      formData.append('description', description)
      formData.append('status', status)
      formData.append('championship_type', championshipType)
      formData.append('drop_scores', String(Number(dropScores) || 0))
      formData.append('pilots_per_team', String(Number(pilotsPerTeam) || 0))
      formData.append('scoring_pilots_per_team', String(Number(scoringPilotsPerTeam) || 0))
      formData.append('min_lap_percentage_points', String(Number(minLapPercentage) || 0))
      formData.append('bonus_fastest_lap', String(Number(bonusFastestLap) || 0))
      formData.append('bonus_pole_position', String(Number(bonusPolePosition) || 0))
      formData.append('bonus_no_incidents', String(Number(bonusNoIncidents) || 0))
      formData.append('bonus_most_positions_gained', String(Number(bonusMostPositionsGained) || 0))
      formData.append('bonus_most_laps_led', String(Number(bonusMostLapsLed) || 0))
      formData.append('bonus_lead_lap', String(Number(bonusLeadLap) || 0))
      formData.append('penalty_points_suspension', String(Number(penaltySuspension) || 0))
      formData.append('penalty_points_pit_start', String(Number(penaltyPitStart) || 0))

      formData.append('loss_points_change_car', String(lossPointsChangeCar))
      formData.append('team_championship', String(teamChampionship))
      formData.append('fixed_setup', String(fixedSetup))
      formData.append('visible_to_pilots', String(visibleToPilots))
      formData.append('multi_class', String(multiClass))

      // Cars relation
      // In PocketBase, relation fields in FormData can be set as multiple append or serialized array
      formData.delete('cars')
      selectedCarIds.forEach((cId) => {
        formData.append('cars', cId)
      })

      if (imageFile) {
        formData.append('image', imageFile)
      }

      let champId = id

      if (isEditing && id) {
        await championshipsService.update(id, formData as any)
      } else {
        const created = await championshipsService.create(formData as any)
        champId = created.id
      }

      // Save scoring rules
      if (champId) {
        await scoringRulesService.saveRules(
          champId,
          scoringRows.map((r) => ({
            position: r.position,
            points: Number(r.points),
            bonus_fastest_lap: Number(bonusFastestLap),
          })),
        )

        // Delete removed batteries
        for (const delId of deletedBatteryIds) {
          try {
            await championshipBatteriesService.delete(delId)
          } catch (err) {
            console.error('Error deleting battery:', err)
          }
        }

        // Save or update batteries
        for (const bat of batteries) {
          const batData = {
            championship_id: champId,
            order: bat.order,
            duration_type: bat.duration_type,
            duration: Number(bat.duration),
            start_time: bat.start_time,
            weather: bat.weather,
            inverted_positions: Number(bat.inverted_positions) || 0,
          }
          if (bat.id) {
            await championshipBatteriesService.update(bat.id, batData)
          } else {
            await championshipBatteriesService.create(batData)
          }
        }
      }

      toast({
        title: 'Sucesso',
        description: isEditing
          ? 'Campeonato atualizado com sucesso!'
          : 'Campeonato criado com sucesso!',
      })

      navigate(champId ? `/campeonatos/${champId}` : '/campeonatos')
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Ocorreu um erro ao gravar o campeonato.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const pageTitle = isEditing
    ? `Campeonato - (${name.trim() ? name : 'Sem nome'})`
    : 'Campeonato - Novo'

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* Top back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate('/campeonatos')}
          className="text-xs text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
          Voltar para Campeonatos
        </Button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-6 bg-[#E10600] rounded-sm inline-block shadow-[0_0_12px_rgba(225,6,0,0.5)]"></span>
            {pageTitle}
          </h1>
          <p className="text-xs text-gray-400 mt-1 pl-5">
            Configure parâmetros oficiais, carros homologados, baterias e pontuação
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Navigation Tabs Header */}
        <div className="border-b border-white/10 bg-[#161622] rounded-t-xl px-2 pt-2">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'detalhes', label: 'DETALHES' },
              { id: 'carros', label: 'CARROS' },
              { id: 'baterias', label: 'BATERIAS' },
              { id: 'etapas', label: 'ETAPAS' },
              { id: 'pilotos', label: 'PILOTOS' },
              { id: 'pontuacao', label: 'PONTUAÇÃO' },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              const isLocked = tab.id === 'etapas' || tab.id === 'pilotos'

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  className={`px-4 sm:px-6 py-3.5 font-racing text-xs sm:text-sm uppercase tracking-wider transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
                    isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isLocked && (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-sans tracking-normal ml-1">
                      Em breve
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#E10600] shadow-[0_0_8px_rgba(225,6,0,0.6)]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab 1: DETALHES */}
        {activeTab === 'detalhes' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-6">
              {/* Temporada & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="season" className="text-xs font-semibold text-gray-300">
                    Temporada
                  </Label>
                  <Select value={seasonId} onValueChange={setSeasonId}>
                    <SelectTrigger
                      id="season"
                      className="text-xs bg-[#1F1F30] border-white/10 text-white focus:ring-[#E10600] h-10"
                    >
                      <SelectValue placeholder="Selecione a Temporada" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                      {seasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-semibold text-gray-300">
                    Status
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(val) => setStatus(val as ChampionshipStatus)}
                  >
                    <SelectTrigger
                      id="status"
                      className="text-xs bg-[#1F1F30] border-white/10 text-white focus:ring-[#E10600] h-10"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-1.5">
                <Label htmlFor="champ-name" className="text-xs font-semibold text-gray-300">
                  Nome
                </Label>
                <Input
                  id="champ-name"
                  placeholder="Ex: E-Stock 2025"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600] h-10"
                  required
                />
              </div>

              {/* Descrição with Character Counter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="champ-desc" className="text-xs font-semibold text-gray-300">
                    Descrição
                  </Label>
                  <span className="text-[11px] font-mono text-gray-400">
                    Max.: {description.length} / 600
                  </span>
                </div>
                <Textarea
                  id="champ-desc"
                  rows={4}
                  maxLength={600}
                  placeholder="Informações regulamentares, calendário e regras gerais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs bg-[#1F1F30] border-white/10 text-white focus-visible:ring-[#E10600] resize-y"
                />
              </div>

              {/* Tipo de campeonato */}
              <div className="space-y-1.5">
                <Label htmlFor="champ-type" className="text-xs font-semibold text-gray-300">
                  Tipo de campeonato
                </Label>
                <Select
                  value={championshipType}
                  onValueChange={(val) => setChampionshipType(val as ChampionshipType)}
                >
                  <SelectTrigger
                    id="champ-type"
                    className="text-xs bg-[#1F1F30] border-white/10 text-white focus:ring-[#E10600] h-10"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                    <SelectItem value="Road">Road</SelectItem>
                    <SelectItem value="Oval">Oval</SelectItem>
                    <SelectItem value="Dirt Road">Dirt Road</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grid of Numeric Inputs (Verbatim Labels from Screenshots) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {/* Row 1 */}
                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">Descartes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={dropScores}
                    onChange={(e) => setDropScores(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Quantos pilotos por equipe?
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={pilotsPerTeam}
                    onChange={(e) => setPilotsPerTeam(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Quantos pilotos pontuarão para equipe por corrida?
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={scoringPilotsPerTeam}
                    onChange={(e) => setScoringPilotsPerTeam(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Percentual de voltas para marcar pontos
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={minLapPercentage}
                      onChange={(e) => setMinLapPercentage(Number(e.target.value))}
                      className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9 pr-7"
                    />
                    <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400">
                      %
                    </span>
                  </div>
                </div>

                {/* Row 2: Bonuses */}
                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Ponto(s) bonus por volta rápida
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={bonusFastestLap}
                    onChange={(e) => setBonusFastestLap(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Ponto(s) bonus por pole position
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={bonusPolePosition}
                    onChange={(e) => setBonusPolePosition(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Ponto(s) bonus por não cometer incidentes
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={bonusNoIncidents}
                    onChange={(e) => setBonusNoIncidents(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Ponto(s) bonus por ganhar mais posições
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={bonusMostPositionsGained}
                    onChange={(e) => setBonusMostPositionsGained(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                {/* Row 3: Bonuses & Penalties */}
                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Ponto(s) bonus por liderar mais voltas
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={bonusMostLapsLed}
                    onChange={(e) => setBonusMostLapsLed(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Ponto(s) bonus por liderar uma volta
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={bonusLeadLap}
                    onChange={(e) => setBonusLeadLap(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Ponto(s) por punição para ficar suspenso da próxima etapa
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={penaltySuspension}
                    onChange={(e) => setPenaltySuspension(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>

                <div className="space-y-1.5 bg-[#1F1F30]/60 p-3 rounded-lg border border-white/5">
                  <Label className="text-xs text-gray-300 block leading-tight">
                    Ponto(s) por punição para largar dos boxes na próxima etapa
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={penaltyPitStart}
                    onChange={(e) => setPenaltyPitStart(Number(e.target.value))}
                    className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                  />
                </div>
              </div>

              {/* Toggles (Switches) with verbatim labels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between p-3.5 bg-[#1F1F30]/50 rounded-lg border border-white/5">
                  <span className="text-xs text-gray-200 font-medium">
                    Perde pontos ao trocar de carro?
                  </span>
                  <Switch
                    checked={lossPointsChangeCar}
                    onCheckedChange={setLossPointsChangeCar}
                    className="data-[state=checked]:bg-[#E10600]"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#1F1F30]/50 rounded-lg border border-white/5">
                  <span className="text-xs text-gray-200 font-medium">Campeonato por equipes?</span>
                  <Switch
                    checked={teamChampionship}
                    onCheckedChange={setTeamChampionship}
                    className="data-[state=checked]:bg-[#E10600]"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#1F1F30]/50 rounded-lg border border-white/5">
                  <span className="text-xs text-gray-200 font-medium">Setup fixo?</span>
                  <Switch
                    checked={fixedSetup}
                    onCheckedChange={setFixedSetup}
                    className="data-[state=checked]:bg-[#E10600]"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#1F1F30]/50 rounded-lg border border-white/5">
                  <span className="text-xs text-gray-200 font-medium">Visível para pilotos?</span>
                  <Switch
                    checked={visibleToPilots}
                    onCheckedChange={setVisibleToPilots}
                    className="data-[state=checked]:bg-[#E10600]"
                  />
                </div>
              </div>

              {/* Imagem Upload */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <Label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                  Imagem
                </Label>

                <div className="p-4 bg-[#1F1F30]/40 rounded-xl border border-dashed border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {imageFile ? (
                      <div className="w-16 h-16 rounded-lg bg-black/40 border border-[#E10600] flex items-center justify-center overflow-hidden">
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : existingImage && id ? (
                      <div className="w-16 h-16 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                        <img
                          src={getFileUrl('championships', id, existingImage)}
                          alt="Banner atual"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#14141F] border border-white/10 flex items-center justify-center text-gray-500">
                        <Upload className="w-6 h-6" />
                      </div>
                    )}

                    <div>
                      <span className="text-xs text-white font-medium block">
                        {imageFile
                          ? imageFile.name
                          : existingImage
                            ? 'Banner atual cadastrado'
                            : 'Nenhum arquivo selecionado'}
                      </span>
                      <span className="text-[11px] text-gray-400">PNG, JPG ou WEBP até 5MB</span>
                    </div>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setImageFile(file)
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#1F1F30] hover:bg-[#2A2A3D] text-white border border-white/15 text-xs font-semibold"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5 text-[#E10600]" />
                      FILE
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: CARROS */}
        {activeTab === 'carros' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-6">
              {/* Multi classe switch */}
              <div className="flex items-center gap-4">
                <Switch
                  checked={multiClass}
                  onCheckedChange={setMultiClass}
                  id="multi-class"
                  className="data-[state=checked]:bg-[#E10600]"
                />
                <Label
                  htmlFor="multi-class"
                  className="text-xs text-gray-200 font-medium cursor-pointer"
                >
                  Multi classe?
                </Label>
              </div>

              {/* Selecionar carros button */}
              <div>
                <Button
                  type="button"
                  onClick={openCarSelector}
                  className="bg-[#14141F] hover:bg-[#2A2A3D] text-white text-xs font-racing uppercase tracking-wider px-5 py-2.5 rounded-lg border border-white/10 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4 mr-1.5 text-[#E10600]" />
                  SELECIONAR CARROS
                </Button>
              </div>

              {/* Grouped Car Cards */}
              {selectedCarsGrouped.length === 0 ? (
                <div className="p-10 border border-white/10 rounded-xl bg-[#1F1F30]/30 text-center space-y-2">
                  <CarIcon className="w-10 h-10 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400">
                    Nenhum carro adicionado a este campeonato ainda.
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Clique em &quot;SELECIONAR CARROS&quot; para escolher os veículos autorizados.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCarsGrouped.map((group) => (
                    <Card
                      key={group.manufacturerName}
                      className="bg-[#1F1F30]/70 border border-white/10 rounded-xl overflow-hidden shadow-sm"
                    >
                      {/* Manufacturer header */}
                      <div className="px-4 py-3 bg-[#14141F] border-b border-white/10 flex items-center justify-between">
                        <span className="font-racing text-xs font-bold text-white uppercase tracking-wider">
                          {group.manufacturerName}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {group.cars.length} carro(s)
                        </span>
                      </div>

                      {/* Cars list */}
                      <div className="divide-y divide-white/5">
                        {group.cars.map((car) => (
                          <div
                            key={car.id}
                            className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                          >
                            <div>
                              <span className="text-xs text-gray-200 font-medium block">
                                {car.model}
                              </span>
                              {car.category && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {car.category}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedCar(car.id)}
                              className="text-gray-400 hover:text-[#E10600] p-1.5 rounded transition-colors"
                              title="Remover carro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab 3: BATERIAS */}
        {activeTab === 'baterias' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-6">
              {/* Inline Addition Row (Verbatim matching print 3) */}
              <div className="p-4 bg-[#1F1F30]/60 rounded-xl border border-white/10 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                  {/* Duração em */}
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">Duração em</Label>
                    <Select
                      value={newBatDurationType}
                      onValueChange={(val) => setNewBatDurationType(val as BatteryDurationType)}
                    >
                      <SelectTrigger className="text-xs bg-[#161622] border-white/10 text-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                        <SelectItem value="Minutos">Minutos</SelectItem>
                        <SelectItem value="Voltas">Voltas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Minutos or Voltas (Label dynamically adjusts) */}
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">{newBatDurationType}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newBatDuration}
                      onChange={(e) => setNewBatDuration(Number(e.target.value))}
                      className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                    />
                  </div>

                  {/* Hora do dia */}
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">Hora do dia</Label>
                    <Input
                      type="time"
                      value={newBatStartTime}
                      onChange={(e) => setNewBatStartTime(e.target.value)}
                      placeholder="14:00"
                      className="text-xs bg-[#161622] border-white/10 text-white h-9"
                    />
                  </div>

                  {/* Clima */}
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">Clima</Label>
                    <Input
                      type="text"
                      placeholder="Limpo / Nublado"
                      value={newBatWeather}
                      onChange={(e) => setNewBatWeather(e.target.value)}
                      className="text-xs bg-[#161622] border-white/10 text-white h-9"
                    />
                  </div>

                  {/* Posições invertidas */}
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">Posições invertidas</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newBatInvertedPositions}
                      onChange={(e) => setNewBatInvertedPositions(Number(e.target.value))}
                      className="text-xs font-mono bg-[#161622] border-white/10 text-white h-9"
                    />
                  </div>
                </div>

                {/* Inline Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelNewBattery}
                    className="text-xs bg-transparent border-white/15 text-gray-300 hover:bg-white/5 uppercase"
                  >
                    CANCELAR
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddBattery}
                    className="bg-[#14141F] hover:bg-[#2A2A3D] text-white text-xs font-racing uppercase tracking-wider px-4 border border-white/10 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
                    ADICIONAR BATERIA
                  </Button>
                </div>
              </div>

              {/* Batteries Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1F1F30]/30">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#14141F] text-[11px] font-racing text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4 w-16 text-center">Actions</th>
                      <th className="py-3 px-4 w-24">Bateria</th>
                      <th className="py-3 px-4">Duração</th>
                      <th className="py-3 px-4">Hora do dia</th>
                      <th className="py-3 px-4">Clima</th>
                      <th className="py-3 px-4 text-center">Pos. Invertidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {batteries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          Nenhuma bateria cadastrada. Utilize o formulário acima para adicionar.
                        </td>
                      </tr>
                    ) : (
                      batteries.map((bat, idx) => (
                        <tr key={bat.id || idx} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBattery(idx)}
                              className="text-gray-400 hover:text-[#E10600] transition-colors p-1"
                              title="Excluir bateria"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-3 px-4 font-racing font-bold text-white text-sm">
                            {bat.order}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-gray-200">
                            {bat.duration} {bat.duration_type}
                          </td>
                          <td className="py-3 px-4 text-gray-400">{bat.start_time || '-'}</td>
                          <td className="py-3 px-4 text-gray-300">{bat.weather || '-'}</td>
                          <td className="py-3 px-4 text-center font-mono">
                            {bat.inverted_positions ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[11px] border border-amber-500/20">
                                {bat.inverted_positions} primeiras
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 4: ETAPAS (Placeholder as requested) */}
        {activeTab === 'etapas' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-12 bg-[#161622] border border-white/10 rounded-xl shadow-lg text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Calendar className="w-7 h-7 text-[#E10600]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-racing text-lg font-bold text-white uppercase tracking-wider">
                  Etapas — Em breve
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  A configuração detalhada das etapas será disponibilizada assim que os novos
                  modelos forem aprovados.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 5: PILOTOS (Placeholder as requested) */}
        {activeTab === 'pilotos' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-12 bg-[#161622] border border-white/10 rounded-xl shadow-lg text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Award className="w-7 h-7 text-[#E10600]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-racing text-lg font-bold text-white uppercase tracking-wider">
                  Pilotos — Em breve
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  A gestão e homologação de pilotos inscritos nesta categoria será integrada em
                  breve.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 6: PONTUAÇÃO (Existing dynamic scoring moved here) */}
        {activeTab === 'pontuacao' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#E10600]" />
                  <div>
                    <h2 className="font-racing text-base font-bold text-white uppercase tracking-wide">
                      Sistema de Pontuação Configurável
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      Defina quantos pontos cada colocação no grid acumula ao término de cada
                      corrida.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPosition}
                  className="text-xs text-white border-white/15 bg-[#1F1F30] hover:bg-[#2A2A3D]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-[#E10600]" />
                  Adicionar Posição
                </Button>
              </div>

              {/* Fastest lap bonus highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#1F1F30]/60 rounded-xl border border-white/5 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E10600]/10 border border-[#E10600]/30 flex items-center justify-center text-[#E10600]">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Bônus por Volta Mais Rápida (Fastest Lap)
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Pontos extras concedidos ao piloto com a melhor volta da corrida
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <Input
                    type="number"
                    min={0}
                    value={bonusFastestLap}
                    onChange={(e) => setBonusFastestLap(Number(e.target.value))}
                    className="w-24 text-xs font-mono bg-[#161622] border-white/10 text-white text-center"
                  />
                  <span className="text-xs font-semibold text-gray-400">pts</span>
                </div>
              </div>

              {/* Positions list */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                {scoringRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-white/10 bg-[#1F1F30]/70 flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-racing text-xs font-bold text-gray-300 w-6">
                        {row.position}º
                      </span>
                      <span className="text-gray-500">→</span>
                      <Input
                        type="number"
                        min={0}
                        value={row.points}
                        onChange={(e) => handleScoreChange(idx, Number(e.target.value))}
                        className="w-14 h-8 text-xs font-mono bg-[#161622] border-white/10 text-white p-1 text-center"
                      />
                      <span className="text-[10px] text-gray-400">pts</span>
                    </div>

                    {scoringRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePosition(idx)}
                        className="text-gray-500 hover:text-[#E10600] transition-colors p-1"
                        title="Remover posição"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Global Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/campeonatos')}
            className="text-xs bg-transparent border-white/15 text-gray-300 hover:bg-white/5"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-6 py-2.5 shadow-lg shadow-red-950/40 btn-checkered-sweep"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Gravando...' : isEditing ? 'Salvar Alterações' : 'Criar Campeonato'}
          </Button>
        </div>
      </form>

      {/* Modal / Dialog: SELECIONAR CARROS */}
      <Dialog open={isCarModalOpen} onOpenChange={setIsCarModalOpen}>
        <DialogContent className="max-w-2xl bg-[#161622] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CarIcon className="w-5 h-5 text-[#E10600]" />
              Selecionar Carros Homologados
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1 scrollbar-none py-2">
            {carsByManufacturer.map((group) => {
              const manuName = group.manufacturer?.name || 'Geral / Outros'
              return (
                <div
                  key={group.manufacturer?.id || 'outros'}
                  className="rounded-xl border border-white/10 bg-[#1F1F30]/50 overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-[#14141F] border-b border-white/10 flex items-center justify-between">
                    <span className="font-racing text-xs font-bold text-gray-200 uppercase tracking-wider">
                      {manuName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {group.cars.length} modelos
                    </span>
                  </div>

                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.cars.map((car) => {
                      const isSelected = modalSelectedCarIds.includes(car.id)
                      return (
                        <div
                          key={car.id}
                          onClick={() => toggleModalCar(car.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#E10600]/15 border-[#E10600] text-white'
                              : 'bg-[#161622] border-white/5 text-gray-300 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <span className="font-medium block">{car.model}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {car.category || 'Categoria padrão'} {car.year ? `• ${car.year}` : ''}
                            </span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-[#E10600] border-[#E10600] text-white'
                                : 'border-white/20 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-xs text-gray-400">
              {modalSelectedCarIds.length} carro(s) selecionado(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCarModalOpen(false)}
                className="text-xs bg-transparent border-white/15 text-gray-300"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveCarSelection}
                className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-4"
              >
                Confirmar Seleção
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
