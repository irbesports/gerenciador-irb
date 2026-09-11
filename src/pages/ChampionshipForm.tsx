import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Award,
  Upload,
  Car as CarIcon,
  Check,
  Calendar,
  Users,
} from 'lucide-react'
import {
  championshipsService,
  seasonsService,
  scoringRulesService,
  carsService,
  manufacturersService,
  tracksService,
  pilotsService,
  championshipStagesService,
  stageRacesService,
  scoringPresetsService,
  championshipPilotsService,
  seriesService,
  getFileUrl,
} from '@/services/api'
import type {
  Season,
  Series,
  ChampionshipStatus,
  ChampionshipType,
  Car,
  Manufacturer,
  Track,
  Pilot,
  ScoringPreset,
  SingleScoringConfig,
  MultiClassScoringConfig,
  ChampionshipPilot,
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

// New Sub-tabs
import StagesTab, { LocalStage, LocalStageRace } from '@/components/championship/StagesTab'
import PilotsTab, { LocalChampPilot } from '@/components/championship/PilotsTab'
import ScoringTab from '@/components/championship/ScoringTab'
import RaceCommentsModal from '@/components/championship/RaceCommentsModal'

type TabKey = 'detalhes' | 'carros' | 'etapas' | 'pilotos' | 'pontuacao'

export default function ChampionshipForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Active tab state (baterias removed)
  const [activeTab, setActiveTab] = useState<TabKey>('detalhes')

  // Basic Details
  const [name, setName] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [seriesId, setSeriesId] = useState('')
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

  // Regulamento (Obrigatório)
  const [regulationText, setRegulationText] = useState<string>('')
  const [regulationFile, setRegulationFile] = useState<File | null>(null)
  const [existingRegulationFile, setExistingRegulationFile] = useState<string>('')
  const [regulationRulesInput, setRegulationRulesInput] = useState<string>('')
  const regulationFileInputRef = useRef<HTMLInputElement>(null)

  // Car Tab States
  const [multiClass, setMultiClass] = useState<boolean>(false)
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([])
  const [carsList, setCarsList] = useState<Car[]>([])
  const [manufacturersList, setManufacturersList] = useState<Manufacturer[]>([])
  const [isCarModalOpen, setIsCarModalOpen] = useState(false)
  const [modalSelectedCarIds, setModalSelectedCarIds] = useState<string[]>([])

  // ETAPAS Tab State
  const [stages, setStages] = useState<LocalStage[]>([])
  const [deletedStageIds, setDeletedStageIds] = useState<string[]>([])
  const [deletedRaceIds, setDeletedRaceIds] = useState<string[]>([])
  const [tracksList, setTracksList] = useState<Track[]>([])

  // Race comments modal
  const [selectedRaceForComments, setSelectedRaceForComments] = useState<any | null>(null)
  const [selectedStageForComments, setSelectedStageForComments] = useState<LocalStage | null>(null)
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false)

  // PILOTOS Tab State
  const [champPilots, setChampPilots] = useState<LocalChampPilot[]>([])
  const [deletedPilotIds, setDeletedPilotIds] = useState<string[]>([])
  const [availablePilots, setAvailablePilots] = useState<Pilot[]>([])

  // PONTUAÇÃO Tab State
  const [presets, setPresets] = useState<ScoringPreset[]>([])
  const [singleConfig, setSingleConfig] = useState<SingleScoringConfig>({
    preset_id: undefined,
    rules: [
      { position: 1, points: 80 },
      { position: 2, points: 74 },
      { position: 3, points: 69 },
      { position: 4, points: 64 },
      { position: 5, points: 59 },
      { position: 6, points: 55 },
      { position: 7, points: 51 },
      { position: 8, points: 47 },
      { position: 9, points: 43 },
      { position: 10, points: 40 },
      { position: 11, points: 37 },
      { position: 12, points: 36 },
      { position: 13, points: 31 },
      { position: 14, points: 28 },
      { position: 15, points: 25 },
      { position: 16, points: 22 },
      { position: 17, points: 19 },
      { position: 18, points: 17 },
      { position: 19, points: 15 },
      { position: 20, points: 13 },
      { position: 21, points: 12 },
      { position: 22, points: 11 },
      { position: 23, points: 10 },
      { position: 24, points: 9 },
      { position: 25, points: 8 },
      { position: 26, points: 7 },
      { position: 27, points: 6 },
      { position: 28, points: 5 },
      { position: 29, points: 4 },
      { position: 30, points: 3 },
      { position: 31, points: 2 },
      { position: 32, points: 1 },
      { position: 33, points: 0 },
      { position: 34, points: 0 },
      { position: 35, points: 0 },
      { position: 36, points: 0 },
      { position: 37, points: 0 },
      { position: 38, points: 0 },
      { position: 39, points: 0 },
      { position: 40, points: 0 },
    ],
  })

  const [multiConfigs, setMultiConfigs] = useState<MultiClassScoringConfig[]>([
    {
      class_name: 'Stock Car Pro',
      preset_id: undefined,
      rules: [
        { position: 1, points: 80 },
        { position: 2, points: 74 },
        { position: 3, points: 69 },
        { position: 4, points: 64 },
        { position: 5, points: 59 },
      ],
    },
    {
      class_name: 'Stock Series',
      preset_id: undefined,
      rules: [
        { position: 1, points: 80 },
        { position: 2, points: 74 },
        { position: 3, points: 69 },
        { position: 4, points: 64 },
        { position: 5, points: 59 },
      ],
    },
  ])

  // Lookups & loaders
  const [seasons, setSeasons] = useState<Season[]>([])
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true)
        const [sList, sSeriesList, allCars, allManus, allTracks, allPilots, allPresets] =
          await Promise.all([
            seasonsService.list(),
            seriesService.list('ativa'),
            carsService.list(),
            manufacturersService.list(),
            tracksService.list(),
            pilotsService.list(),
            scoringPresetsService.list(),
          ])
        setSeasons(sList)
        setSeriesList(sSeriesList)
        setCarsList(allCars)
        setManufacturersList(allManus)
        setTracksList(allTracks)
        setAvailablePilots(allPilots)
        setPresets(allPresets)

        if (sList.length > 0 && !seasonId) {
          setSeasonId(sList[0].id)
        }

        // Apply Stock Car preset if found
        const stockCarPreset = allPresets.find((p) => p.name.includes('Stock Car'))
        if (stockCarPreset) {
          setSingleConfig({
            preset_id: stockCarPreset.id,
            rules: stockCarPreset.rules.map((r) => ({ position: r.position, points: r.points })),
          })
        }

        if (id) {
          const champ = await championshipsService.getOne(id)
          setName(champ.name || '')
          setSeasonId(champ.season_id || '')
          setSeriesId(champ.series_id || '')
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

          if (champ.regulation_text) {
            setRegulationText(champ.regulation_text)
          }
          if (champ.regulation_file) {
            setExistingRegulationFile(champ.regulation_file)
          }
          if (champ.regulation_rules && Array.isArray(champ.regulation_rules)) {
            setRegulationRulesInput(
              champ.regulation_rules
                .map((r: any) => (typeof r === 'string' ? r : r.title || r.code))
                .join('\n'),
            )
          }

          if (champ.cars && Array.isArray(champ.cars)) {
            setSelectedCarIds(champ.cars)
          }

          // Load stages_scoring JSON if present
          if (champ.stages_scoring) {
            if (Array.isArray(champ.stages_scoring)) {
              setMultiConfigs(champ.stages_scoring as MultiClassScoringConfig[])
            } else if (
              (champ.stages_scoring as SingleScoringConfig).rules &&
              Array.isArray((champ.stages_scoring as SingleScoringConfig).rules)
            ) {
              setSingleConfig(champ.stages_scoring as SingleScoringConfig)
            }
          }

          // Load championship stages + their races
          const stList = await championshipStagesService.listByChampionship(id)
          const localStages: LocalStage[] = []

          for (const s of stList) {
            const races = await stageRacesService.listByStage(s.id)
            localStages.push({
              id: s.id,
              order: s.order,
              date: s.date || '',
              duration_type: s.duration_type || 'Minutos',
              duration: s.duration || 0,
              points_multiplier: s.points_multiplier ?? 1,
              track: s.track || '',
              track_layout: s.track_layout || '',
              status: s.status || 'Agendada',
              races: races.map((r) => ({
                id: r.id,
                stage_id: r.stage_id,
                order: r.order,
                duration_type: r.duration_type || 'Minutos',
                duration: r.duration,
                start_time: r.start_time || '',
                weather: r.weather || '',
                inverted_positions: r.inverted_positions ?? 0,
                name: r.name || `Corrida ${r.order}`,
              })),
            })
          }
          setStages(localStages)

          // Load championship pilots
          const pList = await championshipPilotsService.listByChampionship(id)
          setChampPilots(
            pList.map((p) => ({
              id: p.id,
              pilot_id: p.pilot || '',
              name: p.name || '',
              iracing_id: p.iracing_id || '',
              number: p.number ?? '',
              team: p.team || '',
              number_options: p.number_options || '',
              car_class: p.car_class || '',
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

  const selectedCarsArray = useMemo(() => {
    return carsList.filter((c) => selectedCarIds.includes(c.id))
  }, [carsList, selectedCarIds])

  // Car selection modal handlers
  const openCarSelector = () => {
    setModalSelectedCarIds([...selectedCarIds])
    setIsCarModalOpen(true)
  }

  const toggleModalCar = (carId: string) => {
    if (modalSelectedCarIds.includes(carId)) {
      setModalSelectedCarIds(modalSelectedCarIds.filter((cid) => cid !== carId))
    } else {
      setModalSelectedCarIds([...modalSelectedCarIds, carId])
    }
  }

  const saveCarSelection = () => {
    setSelectedCarIds(modalSelectedCarIds)
    setIsCarModalOpen(false)
  }

  const handleRemoveSelectedCar = (carId: string) => {
    setSelectedCarIds(selectedCarIds.filter((cid) => cid !== carId))
  }

  // Open comments for a race
  const handleOpenComments = (race: LocalStageRace, stage: LocalStage) => {
    setSelectedRaceForComments(race)
    setSelectedStageForComments(stage)
    setIsCommentsModalOpen(true)
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

    if (!seriesId) {
      toast({
        title: 'Atenção',
        description: 'Selecione uma "Série" (regra: 1 campeonato = 1 série).',
        variant: 'destructive',
      })
      setActiveTab('detalhes')
      return
    }

    // REGULAMENTO OBRIGATÓRIO (tradução literal do usuário: "É obrigatório adicionar o regulamento na página de criação do campeonato")
    const hasRegulation =
      regulationText.trim().length > 0 || !!regulationFile || !!existingRegulationFile
    if (!hasRegulation) {
      toast({
        title: 'Regulamento é Obrigatório',
        description:
          'É obrigatório adicionar o regulamento do campeonato (arquivo PDF/doc ou texto/ementa) na aba DETALHES.',
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
      formData.append('series_id', seriesId)
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

      // Stages scoring JSON
      const stagesScoringPayload = multiClass ? multiConfigs : singleConfig
      formData.append('stages_scoring', JSON.stringify(stagesScoringPayload))

      // Cars relation
      formData.delete('cars')
      selectedCarIds.forEach((cId) => {
        formData.append('cars', cId)
      })

      // Regulamento fields
      formData.append('regulation_text', regulationText)
      if (regulationFile) {
        formData.append('regulation_file', regulationFile)
      }
      const parsedRules = regulationRulesInput
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
      formData.append('regulation_rules', JSON.stringify(parsedRules))

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

      if (champId) {
        // Sync scoring_rules backwards compatibility
        const rulesForLegacy = multiClass ? multiConfigs[0]?.rules || [] : singleConfig.rules
        if (rulesForLegacy.length > 0) {
          await scoringRulesService.saveRules(
            champId,
            rulesForLegacy.map((r) => ({
              position: r.position,
              points: Number(r.points),
              bonus_fastest_lap: Number(bonusFastestLap),
            })),
          )
        }

        // 1. Delete removed stages
        for (const delStageId of deletedStageIds) {
          try {
            await championshipStagesService.delete(delStageId)
          } catch (err) {
            console.error('Error deleting stage:', err)
          }
        }

        // 2. Delete removed races
        for (const delRaceId of deletedRaceIds) {
          try {
            await stageRacesService.delete(delRaceId)
          } catch (err) {
            console.error('Error deleting race:', err)
          }
        }

        // 3. Save / Update stages and their races
        for (const st of stages) {
          const stageData: any = {
            championship_id: champId,
            order: st.order,
            date: st.date || undefined,
            duration_type: st.duration_type,
            duration: Number(st.duration) || 0,
            points_multiplier: Number(st.points_multiplier) || 1,
            track: st.track || undefined,
            track_layout: st.track_layout,
            status: st.status,
          }

          let savedStageId = st.id
          if (savedStageId) {
            await championshipStagesService.update(savedStageId, stageData)
          } else {
            const createdStage = await championshipStagesService.create(stageData)
            savedStageId = createdStage.id
          }

          // Races inside this stage
          if (savedStageId) {
            for (const rc of st.races) {
              const raceData = {
                stage_id: savedStageId,
                order: rc.order,
                duration_type: rc.duration_type,
                duration: Number(rc.duration) || 50,
                start_time: rc.start_time,
                weather: rc.weather,
                inverted_positions: Number(rc.inverted_positions) || 0,
                name: rc.name || `Corrida ${rc.order}`,
              }

              if (rc.id) {
                await stageRacesService.update(rc.id, raceData)
              } else {
                await stageRacesService.create(raceData)
              }
            }
          }
        }

        // 4. Delete removed pilots
        for (const delPilotId of deletedPilotIds) {
          try {
            await championshipPilotsService.delete(delPilotId)
          } catch (err) {
            console.error('Error deleting pilot:', err)
          }
        }

        // 5. Save / Update championship pilots (Inscrições)
        for (const p of champPilots) {
          const pilotData: any = {
            championship_id: champId,
            pilot: p.pilot_id || undefined,
            name: p.name,
            iracing_id: p.iracing_id,
            number: p.number !== '' ? Number(p.number) : undefined,
            team: p.team,
            number_options: p.number_options,
            car_class: p.car_class,
            registration_status: p.registration_status || 'aprovada',
            payment_status: p.payment_status || 'pago',
          }

          if (p.id) {
            await championshipPilotsService.update(p.id, pilotData)
          } else {
            await championshipPilotsService.create(pilotData)
          }
        }
      }

      toast({
        title: 'Sucesso',
        description: isEditing
          ? 'Campeonato e etapas atualizados com sucesso!'
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
            Configure parâmetros oficiais, carros homologados, etapas com múltiplas corridas,
            inscrições e biblioteca de pontuação
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Navigation Tabs Header: BATERIAS REMOVED; ETAPAS, PILOTOS & PONTUAÇÃO active */}
        <div className="border-b border-white/10 bg-[#161622] rounded-t-xl px-2 pt-2">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'detalhes', label: 'DETALHES' },
              { id: 'carros', label: 'CARROS' },
              { id: 'etapas', label: 'ETAPAS' },
              { id: 'pilotos', label: 'PILOTOS' },
              { id: 'pontuacao', label: 'PONTUAÇÃO' },
            ].map((tab) => {
              const isActive = activeTab === tab.id

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
              {/* Série, Temporada & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="series" className="text-xs font-semibold text-gray-300">
                      Série Vinculada *
                    </Label>
                    <button
                      type="button"
                      onClick={() => navigate('/series')}
                      className="text-[10px] text-[#E10600] hover:underline"
                    >
                      + Gerenciar Séries
                    </button>
                  </div>
                  <Select value={seriesId} onValueChange={setSeriesId}>
                    <SelectTrigger
                      id="series"
                      className="text-xs bg-[#1F1F30] border-white/10 text-white focus:ring-[#E10600] h-10"
                    >
                      <SelectValue placeholder="Selecione a Série (Obrigatório)" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                      {seriesList.length === 0 ? (
                        <SelectItem value="_empty" disabled>
                          Nenhuma série ativa cadastrada
                        </SelectItem>
                      ) : (
                        seriesList.map((ser) => (
                          <SelectItem key={ser.id} value={ser.id}>
                            {ser.name} {ser.short_name ? `(${ser.short_name})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-gray-400 block">
                    Regra Mestre: 1 campeonato = 1 série oficial.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="season" className="text-xs font-semibold text-gray-300">
                    Temporada *
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
                  <span className="text-[10px] text-gray-500 block leading-tight">
                    Piores resultados descartados por piloto
                  </span>
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

              {/* REGULAMENTO DO CAMPEONATO (OBRIGATÓRIO) */}
              <div className="p-5 rounded-xl border border-red-500/25 bg-[#14141F] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-4 bg-[#E10600] rounded-sm inline-block shadow-[0_0_8px_rgba(225,6,0,0.6)]"></span>
                    <Label className="text-sm font-bold text-white uppercase font-racing tracking-wide">
                      Regulamento Oficial do Campeonato{' '}
                      <span className="text-[#E10600]">* (Obrigatório)</span>
                    </Label>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Obrigatório para conhecimento dos pilotos e base do sistema de infrações
                  </span>
                </div>

                {/* Upload do Arquivo do Regulamento */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300 font-medium">
                    Documento do Regulamento (PDF, Word ou Imagem)
                  </Label>
                  <div className="p-3 bg-[#1F1F30]/40 rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs">
                      {regulationFile ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                          ✓ Arquivo selecionado: {regulationFile.name} (
                          {(regulationFile.size / 1024).toFixed(0)} KB)
                        </span>
                      ) : existingRegulationFile && id ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                          ✓ Documento cadastrado: {existingRegulationFile}
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          Nenhum documento anexado ainda. Faça o upload do regulamento oficial.
                        </span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={regulationFileInputRef}
                        accept=".pdf,.doc,.docx,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setRegulationFile(file)
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => regulationFileInputRef.current?.click()}
                        className="bg-[#1F1F30] hover:bg-[#2A2A3D] text-white border border-white/15 text-xs font-semibold"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-[#E10600]" />
                        {existingRegulationFile || regulationFile
                          ? 'Alterar Regulamento'
                          : 'Subir Arquivo'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Texto do Regulamento */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300 font-medium">
                    Texto / Ementa do Regulamento
                  </Label>
                  <Textarea
                    rows={4}
                    placeholder="Cole aqui o regulamento, artigos de conduta, procedimentos de largada, regras de pit stop ou link externo..."
                    value={regulationText}
                    onChange={(e) => setRegulationText(e.target.value)}
                    className="bg-[#1F1F30] border-white/10 text-white text-xs resize-y"
                  />
                </div>

                {/* Infrações Passíveis de Punição */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300 font-medium">
                      Itens Passíveis de Punição do Regulamento (1 por linha)
                    </Label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Usados na moderação e protestos
                    </span>
                  </div>
                  <Textarea
                    rows={3}
                    placeholder={`3.7.3 / Advertência\n5.3.3 / Acréscimo de tempo ao fim da prova\n5.4.1.1 / Acréscimo de tempo ao fim da prova\nToque evitável / Perda de posições`}
                    value={regulationRulesInput}
                    onChange={(e) => setRegulationRulesInput(e.target.value)}
                    className="bg-[#1F1F30] border-white/10 text-white text-xs font-mono resize-y"
                  />
                  <p className="text-[11px] text-gray-500">
                    Estes itens ficarão disponíveis no seletor da página de moderação para os
                    comissários aplicarem durante os julgamentos.
                  </p>
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
                      <div className="px-4 py-3 bg-[#14141F] border-b border-white/10 flex items-center justify-between">
                        <span className="font-racing text-xs font-bold text-white uppercase tracking-wider">
                          {group.manufacturerName}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {group.cars.length} carro(s)
                        </span>
                      </div>

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

        {/* Tab 3: ETAPAS (Integrated 1 to N races) */}
        {activeTab === 'etapas' && (
          <StagesTab
            stages={stages}
            setStages={setStages}
            deletedStageIds={deletedStageIds}
            setDeletedStageIds={setDeletedStageIds}
            deletedRaceIds={deletedRaceIds}
            setDeletedRaceIds={setDeletedRaceIds}
            tracks={tracksList}
            onOpenComments={handleOpenComments}
          />
        )}

        {/* Tab 4: PILOTOS (Full table with filters, export and add modal) */}
        {activeTab === 'pilotos' && (
          <PilotsTab
            champPilots={champPilots}
            setChampPilots={setChampPilots}
            deletedPilotIds={deletedPilotIds}
            setDeletedPilotIds={setDeletedPilotIds}
            availablePilots={availablePilots}
          />
        )}

        {/* Tab 5: PONTUAÇÃO (Preset library and Multi-Class support) */}
        {activeTab === 'pontuacao' && (
          <ScoringTab
            multiClass={multiClass}
            singleConfig={singleConfig}
            setSingleConfig={setSingleConfig}
            multiConfigs={multiConfigs}
            setMultiConfigs={setMultiConfigs}
            presets={presets}
            setPresets={setPresets}
            selectedCars={selectedCarsArray}
          />
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

      {/* Modal: Discussão da Prova / Comentários da Corrida */}
      <RaceCommentsModal
        race={selectedRaceForComments}
        stageOrder={selectedStageForComments?.order}
        isOpen={isCommentsModalOpen}
        onClose={() => {
          setIsCommentsModalOpen(false)
          setSelectedRaceForComments(null)
          setSelectedStageForComments(null)
        }}
      />
    </div>
  )
}
