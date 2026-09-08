import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  CloudSun,
  ShieldAlert,
  Send,
  MessageSquare,
  AlertTriangle,
  Plus,
  Scale,
  UserCheck,
  ChevronRight,
  Info,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import {
  stageRacesService,
  stageRaceCommentsService,
  raceResultsService,
  moderationCasesService,
  pilotsService,
  championshipPilotsService,
  championshipsService,
  notificationsService,
} from '@/services/api'
import type {
  StageRace,
  StageRaceComment,
  RaceResultRecord,
  ModerationCase,
  Pilot,
  Championship,
  ModerationCaseStatus,
  ModerationCaseOpenedByType,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useToast } from '@/hooks/use-toast'

export default function RaceModerationPage() {
  const { raceId } = useParams<{ raceId: string }>()
  const navigate = useNavigate()
  const { user, isCollaborator } = useAuth()
  const { toast } = useToast()

  const [race, setRace] = useState<StageRace | null>(null)
  const [championship, setChampionship] = useState<Championship | null>(null)
  const [comments, setComments] = useState<StageRaceComment[]>([])
  const [raceResults, setRaceResults] = useState<RaceResultRecord[]>([])
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([])
  const [availablePilots, setAvailablePilots] = useState<Pilot[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  // Modal: Novo Incidente / Caso de Moderação
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false)
  const [caseLap, setCaseLap] = useState<number | ''>(1)
  const [caseOpenedByType, setCaseOpenedByType] =
    useState<ModerationCaseOpenedByType>('comissarios')
  const [caseAuthorPilotId, setCaseAuthorPilotId] = useState<string>('')
  const [caseInvolvedPilotIds, setCaseInvolvedPilotIds] = useState<string[]>([])
  const [caseGuiltyPilotId, setCaseGuiltyPilotId] = useState<string>('')
  const [caseStatus, setCaseStatus] = useState<ModerationCaseStatus>('Em análise')
  const [caseInfractionCited, setCaseInfractionCited] = useState<string>('')
  const [caseDescription, setCaseDescription] = useState<string>('')
  const [isSavingCase, setIsSavingCase] = useState(false)

  const loadData = async () => {
    if (!raceId) return
    try {
      setIsLoading(true)
      const [r, cList, results, cases, allPilots] = await Promise.all([
        stageRacesService.getOne(raceId),
        stageRaceCommentsService.listByRace(raceId),
        raceResultsService.listByRace(raceId, true),
        moderationCasesService.listByRace(raceId),
        pilotsService.list(),
      ])
      setRace(r)
      setComments(cList)
      setRaceResults(results)
      setModerationCases(cases)
      setAvailablePilots(allPilots)

      const champId = r.expand?.stage_id?.championship_id
      if (champId) {
        try {
          const c = await championshipsService.getOne(champId)
          setChampionship(c)
        } catch {
          /* intentionally ignored */
        }
      }
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

  const stage = race?.expand?.stage_id
  const champ = championship || stage?.expand?.championship_id
  const track = stage?.expand?.track

  // Registered regulation rules options
  const regulationOptions = useMemo(() => {
    const list: string[] = [
      '3.7.3 / Advertência',
      '5.3.3 / Acréscimo de tempo ao fim da prova',
      '5.3.3.1 / Acréscimo de tempo ao fim da prova',
      '5.4.1 / Acréscimo de tempo ao fim da prova',
      '5.4.1.1 / Acréscimo de tempo ao fim da prova',
      '5.4.1.2 / Acréscimo de tempo ao fim da prova',
      '5.4.1.3 / Acréscimo de tempo ao fim da prova',
      'Toque evitável / Perda de posições',
      'Bloqueio irregular de trajetória',
      'Reentrada perigosa na pista (Unsafe Rejoin)',
      'Excesso de velocidade no pit lane',
    ]

    if (champ?.regulation_rules && Array.isArray(champ.regulation_rules)) {
      champ.regulation_rules.forEach((item) => {
        const str = typeof item === 'string' ? item : item.title || item.code
        if (str && !list.includes(str)) {
          list.unshift(str)
        }
      })
    }
    return list
  }, [champ])

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

  const handleOpenNewCaseModal = () => {
    setCaseLap(1)
    setCaseOpenedByType(isCollaborator ? 'comissarios' : 'protesto_piloto')
    setCaseAuthorPilotId('')
    setCaseInvolvedPilotIds([])
    setCaseGuiltyPilotId('')
    setCaseStatus('Em análise')
    setCaseInfractionCited(regulationOptions[0] || '')
    setCaseDescription('')
    setIsCaseModalOpen(true)
  }

  const toggleInvolvedPilot = (pilotId: string) => {
    if (caseInvolvedPilotIds.includes(pilotId)) {
      setCaseInvolvedPilotIds(caseInvolvedPilotIds.filter((id) => id !== pilotId))
      if (caseGuiltyPilotId === pilotId) {
        setCaseGuiltyPilotId('')
      }
    } else {
      setCaseInvolvedPilotIds([...caseInvolvedPilotIds, pilotId])
    }
  }

  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!raceId || !champ?.id) return

    if (caseInvolvedPilotIds.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Selecione pelo menos um piloto envolvido no incidente.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSavingCase(true)

      // Deadline 24h from now
      const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const createdCase = await moderationCasesService.create({
        stage_race_id: raceId,
        championship_id: champ.id,
        lap: Number(caseLap) || 1,
        involved_pilots: caseInvolvedPilotIds,
        guilty_pilot_id: caseGuiltyPilotId || undefined,
        opened_by_type: caseOpenedByType,
        author_user_id: user?.id,
        author_pilot_id: caseAuthorPilotId || undefined,
        status: caseStatus,
        infraction_cited: caseInfractionCited,
        description: caseDescription,
        deadline: deadlineDate,
      })

      // Send notifications to each involved pilot
      const involvedRecords = availablePilots.filter((p) => caseInvolvedPilotIds.includes(p.id))
      const protestingPilot = availablePilots.find((p) => p.id === caseAuthorPilotId)

      await notificationsService.notifyInvolvedPilots({
        caseRecord: createdCase,
        involvedPilotRecords: involvedRecords,
        stageName: `Etapa ${stage?.order ?? 1}`,
        trackName: track?.name || 'Pista Oficial',
        raceName: race?.name || `Corrida ${race?.order ?? 1}`,
        lap: Number(caseLap) || 1,
        openedByType: caseOpenedByType,
        protestingPilotName: protestingPilot
          ? `#${protestingPilot.number ?? ''} ${protestingPilot.name}`
          : user?.name,
      })

      toast({
        title: 'Incidente Registrado',
        description:
          'O caso foi aberto com sucesso e os pilotos envolvidos foram notificados (prazo de 24h).',
      })

      setIsCaseModalOpen(false)
      const updatedList = await moderationCasesService.listByRace(raceId)
      setModerationCases(updatedList)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao criar caso',
        description: err?.message || 'Falha ao registrar o incidente.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCase(false)
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    if (!window.confirm('Deseja excluir este caso de moderação?')) return
    try {
      await moderationCasesService.delete(caseId)
      toast({ title: 'Excluído', description: 'Caso removido com sucesso.' })
      const updatedList = await moderationCasesService.listByRace(raceId!)
      setModerationCases(updatedList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o caso.',
        variant: 'destructive',
      })
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

  const formattedDate = stage?.date
    ? new Date(stage.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-'

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-16">
      {/* Top back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => (champ?.id ? navigate(`/campeonatos/${champ.id}`) : navigate(-1))}
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

        <div className="z-10 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleOpenNewCaseModal}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-4 py-2 shadow-lg shadow-red-950/40"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Abrir Caso / Protesto
          </Button>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL DE MODERAÇÃO — Casos de Moderação (Visual idêntico ao anexo do usuário) */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#E10600]" />
            <h2 className="font-racing text-lg font-bold text-white uppercase tracking-wider">
              Incidentes da Corrida ({moderationCases.length})
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">
            Painel oficial de comissários e protestos de pilotos com prazo de defesa de 24h
          </span>
        </div>

        {moderationCases.length === 0 ? (
          <div className="p-10 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-400 text-xs space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-medium text-white text-sm">
              Nenhum caso ou protesto anotado para esta corrida até o momento.
            </p>
            <p className="text-gray-500 max-w-md mx-auto">
              Comissários podem registrar anotações em tempo real e pilotos podem submeter protestos
              oficiais. Clique no botão acima para registrar o primeiro incidente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#1F1F30]/30">
            <table className="w-full text-left text-xs text-gray-300">
              <thead>
                <tr className="border-b border-white/10 bg-[#14141F] text-[10px] font-racing text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center">Volta</th>
                  <th className="py-3 px-3">Notificado por</th>
                  <th className="py-3 px-3">Carros envolvidos</th>
                  <th className="py-3 px-3">Culpado</th>
                  <th className="py-3 px-3">Infração / Penalidade</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {moderationCases.map((c) => {
                  const involvedList =
                    c.expand?.involved_pilots ||
                    availablePilots.filter((p) => c.involved_pilots?.includes(p.id))

                  const guiltyPilot =
                    c.expand?.guilty_pilot_id ||
                    availablePilots.find((p) => p.id === c.guilty_pilot_id)

                  const authorPilot =
                    c.expand?.author_pilot_id ||
                    availablePilots.find((p) => p.id === c.author_pilot_id)

                  const notifByText =
                    c.opened_by_type === 'comissarios'
                      ? 'Comissários de Prova'
                      : authorPilot
                        ? `#${authorPilot.number ?? ''} - ${authorPilot.name}`
                        : c.expand?.author_user_id?.name || 'Piloto'

                  // Status badge style matching screenshot
                  const statusColors = {
                    'Aplicado pós corrida': 'bg-[#1b4332] text-[#74c69d] border-[#2d6a4f]',
                    'Aplicado em corrida': 'bg-[#2d6a4f] text-[#95d5b2] border-[#40916c]',
                    'Nenhuma ação necessária': 'bg-[#2b2d42] text-gray-300 border-white/10',
                    'Em análise': 'bg-amber-950/60 text-amber-300 border-amber-600/40',
                  }

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/moderacao/caso/${c.id}`)}
                    >
                      <td className="py-3.5 px-3 text-center font-racing font-bold text-white text-sm">
                        {c.lap}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-200">
                          {notifByText}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1 max-w-[220px]">
                          {involvedList.length === 0 ? (
                            <span className="text-gray-500 text-[11px]">-</span>
                          ) : (
                            involvedList.map((p) => (
                              <span
                                key={p.id}
                                className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0d2137] text-[#90e0ef] border border-[#0077b6]/30 truncate"
                              >
                                #{p.number ?? '•'} - {p.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {guiltyPilot ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e63946]/20 text-[#ff758f] border border-[#e63946]/50">
                            #{guiltyPilot.number ?? '•'} - {guiltyPilot.name}
                          </span>
                        ) : (
                          <span className="text-gray-500 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-gray-200 font-medium text-xs max-w-xs">
                        <div className="leading-snug">{c.infraction_cited || 'Em julgamento'}</div>
                        {c.penalty_applied && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {c.penalty_applied}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border capitalize whitespace-nowrap ${
                            statusColors[c.status] || 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/moderacao/caso/${c.id}`)}
                            className="text-gray-300 hover:text-white h-7 px-2 text-xs"
                            title="Ver detalhes e versões"
                          >
                            Ver Caso <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Button>
                          {isCollaborator && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCase(c.id)}
                              className="text-gray-500 hover:text-red-400 h-7 w-7 p-0"
                              title="Excluir caso"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Estatísticas de Incidentes do Simulador (iRacing) — Trata-se EXCLUSIVAMENTE como ESTATÍSTICA */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-gray-400" />
            <h2 className="font-racing text-base font-bold text-white uppercase tracking-wider">
              Estatísticas de Incidentes do Simulador (iRacing Log)
            </h2>
          </div>
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            Métricas de segurança do piloto (sair da pista, perda de controle). Não geram punições
            automáticas.
          </span>
        </div>

        {raceResults.length === 0 ? (
          <div className="p-8 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-400 text-xs space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="font-medium text-white">
              Nenhum resultado importado para esta corrida ainda.
            </p>
            <p className="text-gray-500">
              Faça o upload do JSON do iRacing no detalhe da etapa para carregar as estatísticas e
              voltas de cada piloto.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#1F1F30]/30">
            <table className="w-full text-left text-xs text-gray-300">
              <thead>
                <tr className="border-b border-white/10 bg-[#14141F] text-[10px] font-racing text-gray-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center">Pos</th>
                  <th className="py-2.5 px-3">Piloto</th>
                  <th className="py-2.5 px-3">ID iRacing</th>
                  <th className="py-2.5 px-3">Carro</th>
                  <th className="py-2.5 px-3 text-center">Voltas Concluídas</th>
                  <th className="py-2.5 px-3 text-center">Incidentes (x)</th>
                  <th className="py-2.5 px-3 text-center">Status no Simulador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {raceResults.map((driver) => {
                  const inc = driver.incidents ?? 0
                  return (
                    <tr key={driver.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 text-center font-racing font-bold text-white">
                        {driver.finish_position}º
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {driver.display_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400 text-[11px]">
                        {driver.cust_id}
                      </td>
                      <td className="py-2.5 px-3 text-gray-300">{driver.car_name || '-'}</td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {driver.laps_complete ?? 0}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-white/5 text-gray-300 border border-white/10">
                          {inc}x
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-white/10 text-gray-300 capitalize"
                        >
                          {driver.reason_out || 'Completou'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Discussion Thread */}
      <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#E10600]" />
            <h2 className="font-racing text-sm font-bold text-white uppercase tracking-wider">
              Anotações e Discussão Interna da Comissão ({comments.length})
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">
            Visível para Administradores e Comissários de Prova
          </span>
        </div>

        {/* List of comments */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
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
            placeholder="Escreva uma anotação interna dos comissários sobre esta prova..."
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

      {/* Modal: ABRIR CASO / PROTESTO */}
      <Dialog open={isCaseModalOpen} onOpenChange={setIsCaseModalOpen}>
        <DialogContent className="max-w-2xl bg-[#161622] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-racing text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#E10600]" />
              Abrir Novo Incidente / Protesto de Prova
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSaveCase}
            className="space-y-4 py-2 max-h-[75vh] overflow-y-auto pr-1"
          >
            {/* Tipo de abertura */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Aberto por</Label>
                <Select
                  value={caseOpenedByType}
                  onValueChange={(val) => setCaseOpenedByType(val as ModerationCaseOpenedByType)}
                >
                  <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                    <SelectItem value="comissarios">Comissários de Prova</SelectItem>
                    <SelectItem value="protesto_piloto">Protesto de Piloto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {caseOpenedByType === 'protesto_piloto' ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Piloto Autor do Protesto</Label>
                  <Select value={caseAuthorPilotId} onValueChange={setCaseAuthorPilotId}>
                    <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-9">
                      <SelectValue placeholder="Selecione o piloto autor" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F1F30] border-white/10 text-white max-h-60">
                      {availablePilots.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          #{p.number ?? '•'} - {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Status Inicial do Caso</Label>
                  <Select
                    value={caseStatus}
                    onValueChange={(val) => setCaseStatus(val as ModerationCaseStatus)}
                  >
                    <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                      <SelectItem value="Em análise">Em análise</SelectItem>
                      <SelectItem value="Aplicado em corrida">Aplicado em corrida</SelectItem>
                      <SelectItem value="Aplicado pós corrida">Aplicado pós corrida</SelectItem>
                      <SelectItem value="Nenhuma ação necessária">
                        Nenhuma ação necessária
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Volta do incidente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Volta do Incidente</Label>
                <Input
                  type="number"
                  min={1}
                  value={caseLap}
                  onChange={(e) => setCaseLap(Number(e.target.value))}
                  required
                  className="bg-[#1F1F30] border-white/10 text-white text-xs h-9 font-mono"
                  placeholder="Ex: 14"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Infração / Artigo do Regulamento</Label>
                <Select value={caseInfractionCited} onValueChange={setCaseInfractionCited}>
                  <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-9">
                    <SelectValue placeholder="Selecione a infração" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F1F30] border-white/10 text-white max-h-60">
                    {regulationOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pilotos envolvidos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-300">
                  Pilotos Envolvidos ({caseInvolvedPilotIds.length} selecionados)
                </Label>
                <span className="text-[11px] text-gray-400">
                  Cada piloto citado receberá uma notificação direta
                </span>
              </div>

              <div className="p-3 bg-[#1F1F30]/60 rounded-xl border border-white/10 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availablePilots.map((p) => {
                  const isChecked = caseInvolvedPilotIds.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleInvolvedPilot(p.id)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-[#0d2137] border-[#0077b6] text-white font-semibold'
                          : 'bg-[#161622] border-white/5 text-gray-300 hover:border-white/20'
                      }`}
                    >
                      <span className="truncate">
                        #{p.number ?? '•'} {p.name}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        {isChecked ? 'Citado' : '+'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Piloto Culpado (Opcional) */}
            {caseInvolvedPilotIds.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Culpado / Responsável (Opcional)</Label>
                <Select value={caseGuiltyPilotId} onValueChange={setCaseGuiltyPilotId}>
                  <SelectTrigger className="bg-[#1F1F30] border-white/10 text-white text-xs h-9">
                    <SelectValue placeholder="Nenhum piloto definido como culpado ainda" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F1F30] border-white/10 text-white">
                    <SelectItem value="">Nenhum / Em análise</SelectItem>
                    {availablePilots
                      .filter((p) => caseInvolvedPilotIds.includes(p.id))
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          #{p.number ?? '•'} - {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Descrição do Incidente */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Descrição dos Fatos</Label>
              <Textarea
                rows={3}
                placeholder="Detalhe o momento do incidente, curva, manobra ou contato observado..."
                value={caseDescription}
                onChange={(e) => setCaseDescription(e.target.value)}
                className="bg-[#1F1F30] border-white/10 text-white text-xs resize-y"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Ao registrar, cada piloto citado receberá notificação no sino do app com link direto
                e prazo de 24 horas para submeter sua defesa/versão.
              </span>
            </div>

            <DialogFooter className="flex items-center justify-between border-t border-white/10 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCaseModalOpen(false)}
                className="text-xs bg-transparent border-white/15 text-gray-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingCase}
                className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-5"
              >
                {isSavingCase ? 'Salvando...' : 'Registrar Incidente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
