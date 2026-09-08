import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Gavel,
  Plus,
  Scale,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  User,
  MapPin,
  Timer,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { moderationCasesService, pilotsService, championshipsService } from '@/services/api'
import type { ModerationCase, Pilot, Championship } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import useRealtime from '@/hooks/use-realtime'

export default function MyProtestsPage() {
  const { user, isCollaborator } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [allCases, setAllCases] = useState<ModerationCase[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [myPilot, setMyPilot] = useState<Pilot | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [casesList, pList] = await Promise.all([
        moderationCasesService.listAll(true),
        pilotsService.list(),
      ])

      setAllCases(casesList)
      setPilots(pList)

      if (user?.id) {
        const found = pList.find((p) => p.user_id === user.id)
        setMyPilot(found || null)
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os protestos.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime<ModerationCase>('moderation_cases', () => {
    moderationCasesService
      .listAll(true)
      .then(setAllCases)
      .catch(() => {})
  })

  // Separate protests opened by the pilot vs. protests citing the pilot
  const { openedByMe, citingMe, allProtests } = useMemo(() => {
    const myUserId = user?.id
    const myPilotId = myPilot?.id

    const opened: ModerationCase[] = []
    const citing: ModerationCase[] = []
    const general: ModerationCase[] = []

    for (const c of allCases) {
      if (c.cancelled) continue

      const isAuthor =
        (myUserId && c.author_user_id === myUserId) ||
        (myPilotId && c.author_pilot_id === myPilotId)

      const isCiting =
        myPilotId && c.involved_pilots && c.involved_pilots.includes(myPilotId) && !isAuthor

      if (isAuthor) {
        opened.push(c)
      }
      if (isCiting) {
        citing.push(c)
      }
      if (c.opened_by_type === 'protesto_piloto') {
        general.push(c)
      }
    }

    return { openedByMe: opened, citingMe: citing, allProtests: general }
  }, [allCases, user, myPilot])

  const statusColors = {
    'Aplicado pós corrida': 'bg-[#1b4332] text-[#74c69d] border-[#2d6a4f]',
    'Aplicado em corrida': 'bg-[#2d6a4f] text-[#95d5b2] border-[#40916c]',
    'Nenhuma ação necessária': 'bg-[#2b2d42] text-gray-300 border-white/10',
    'Em análise': 'bg-amber-950/60 text-amber-300 border-amber-600/40',
  }

  const renderProtestTable = (cases: ModerationCase[], emptyMessage: string) => {
    if (cases.length === 0) {
      return (
        <div className="p-10 text-center bg-[#1F1F30]/40 rounded-xl border border-white/5 text-gray-400 text-xs space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="font-medium text-white text-sm">{emptyMessage}</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#1F1F30]/30">
        <table className="w-full text-left text-xs text-gray-300">
          <thead>
            <tr className="border-b border-white/10 bg-[#14141F] text-[10px] font-racing text-gray-400 uppercase tracking-wider">
              <th className="py-3 px-3">Código</th>
              <th className="py-3 px-3">Prova / Etapa</th>
              <th className="py-3 px-3 text-center">Volta</th>
              <th className="py-3 px-3">Envolvidos</th>
              <th className="py-3 px-3">Infração Citada</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {cases.map((c) => {
              const race = c.expand?.stage_race_id
              const stage = race?.expand?.stage_id
              const champ = c.expand?.championship_id || stage?.expand?.championship_id
              const track = stage?.expand?.track

              const involvedList =
                c.expand?.involved_pilots || pilots.filter((p) => c.involved_pilots?.includes(p.id))

              const isProtest = c.opened_by_type === 'protesto_piloto'

              return (
                <tr
                  key={c.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/moderacao/caso/${c.id}`)}
                >
                  <td className="py-3.5 px-3">
                    <div className="font-mono text-xs font-bold text-[#90e0ef]">
                      {c.code || `CASO-#${c.id.slice(0, 6)}`}
                    </div>
                    {isProtest && (
                      <span className="text-[10px] text-red-400 font-racing uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <span>Protesto</span> 🔨
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-white">{champ?.name || 'Campeonato'}</div>
                    <div className="text-[11px] text-gray-400">
                      Etapa {stage?.order ?? 1} • {race?.name || 'Corrida'}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-center font-racing font-bold text-white text-sm">
                    {c.lap}
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="flex flex-col gap-1 max-w-[200px]">
                      {involvedList.length === 0 ? (
                        <span className="text-gray-500 text-[11px]">-</span>
                      ) : (
                        involvedList.map((p) => (
                          <span
                            key={p.id}
                            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0d2137] text-[#90e0ef] border border-[#0077b6]/30 truncate"
                          >
                            #{p.number ?? '•'} - {p.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-gray-200 font-medium text-xs max-w-xs">
                    <div className="leading-snug">{c.infraction_cited || 'Em análise'}</div>
                    {c.penalty_applied && (
                      <div className="text-[10px] text-amber-300 font-mono mt-0.5">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/moderacao/caso/${c.id}`)}
                      className="text-gray-300 hover:text-white h-7 px-2.5 text-xs font-semibold"
                    >
                      Acessar Caso <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-16 text-center text-sm text-gray-400 animate-pulse">
        Carregando painel de protestos do piloto...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-20">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#14141F] p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs bg-[#E10600]/15 text-[#E10600] border-[#E10600]/30 font-racing uppercase tracking-wider"
            >
              Área do Piloto
            </Badge>
            <span className="text-gray-500">•</span>
            <span className="text-xs text-gray-300 font-medium">
              {myPilot ? `#${myPilot.number ?? '•'} ${myPilot.name}` : user?.name}
            </span>
          </div>

          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-7 bg-[#E10600] rounded-sm inline-block shadow-[0_0_12px_rgba(225,6,0,0.5)]"></span>
            Meus Protestos Desportivos
          </h1>

          <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
            Acompanhe o status dos protestos que você abriu contra outros pilotos e as notificações
            em que seu nome foi citado para apresentação de defesa (prazo de 24h).
          </p>
        </div>

        <div className="z-10 flex items-center gap-3">
          <Button
            type="button"
            onClick={() => navigate('/protestar')}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-racing uppercase tracking-wider px-5 py-2.5 shadow-lg shadow-red-950/40 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Abrir Novo Protesto
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="citing" className="w-full space-y-4">
        <TabsList className="bg-[#14141F] p-1 border border-white/10 rounded-xl flex-wrap">
          <TabsTrigger
            value="citing"
            className="text-xs data-[state=active]:bg-[#E10600] data-[state=active]:text-white font-racing uppercase tracking-wider flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Contra Mim ({citingMe.length})
          </TabsTrigger>

          <TabsTrigger
            value="opened"
            className="text-xs data-[state=active]:bg-[#E10600] data-[state=active]:text-white font-racing uppercase tracking-wider flex items-center gap-1.5"
          >
            <Gavel className="w-3.5 h-3.5" />
            Abertos por Mim ({openedByMe.length})
          </TabsTrigger>

          {isCollaborator && (
            <TabsTrigger
              value="all"
              className="text-xs data-[state=active]:bg-[#E10600] data-[state=active]:text-white font-racing uppercase tracking-wider flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              Todos os Protestos ({allProtests.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Contra Mim */}
        <TabsContent value="citing">
          <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-racing text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Protestos e Incidentes Citando Meu Carro ({citingMe.length})
              </h2>
              <span className="text-[11px] text-gray-400">
                Acesse o caso para anexar sua versão antes do encerramento do prazo de 24h
              </span>
            </div>

            {renderProtestTable(
              citingMe,
              'Nenhum protesto ou incidente aberto contra você no momento.',
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: Abertos por Mim */}
        <TabsContent value="opened">
          <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-racing text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Gavel className="w-4 h-4 text-[#E10600]" />
                Protestos Oficiais que Abri ({openedByMe.length})
              </h2>
              <span className="text-[11px] text-gray-400">
                Acompanhe o parecer e as decisões da comissão de comissários
              </span>
            </div>

            {renderProtestTable(openedByMe, 'Você ainda não abriu nenhum protesto pós-corrida.')}
          </Card>
        </TabsContent>

        {/* Tab 3: Todos os protestos (Colaborador) */}
        {isCollaborator && (
          <TabsContent value="all">
            <Card className="p-6 bg-[#161622] border border-white/10 rounded-xl shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-racing text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#E10600]" />
                  Todos os Protestos de Pilotos ({allProtests.length})
                </h2>
                <span className="text-[11px] text-gray-400">
                  Visão administrativa completa de protestos abertos por pilotos
                </span>
              </div>

              {renderProtestTable(allProtests, 'Nenhum protesto registrado na plataforma.')}
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
