import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Save } from 'lucide-react'
import { infractionsService, pilotsService, championshipsService } from '@/services/api'
import type { Pilot, Championship, InfractionType, InfractionSeverity } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function InfractionForm() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [pilots, setPilots] = useState<Pilot[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])

  const [pilotId, setPilotId] = useState('')
  const [championshipId, setChampionshipId] = useState('')
  const [type, setType] = useState<InfractionType>('ultrapassagem_perigosa')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<InfractionSeverity>('media')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const [pList, cList] = await Promise.all([
          pilotsService.list(),
          championshipsService.list(),
        ])
        setPilots(pList)
        setChampionships(cList)
        if (pList.length > 0) setPilotId(pList[0].id)
        if (cList.length > 0) setChampionshipId(cList[0].id)
      } catch (err) {
        console.error(err)
      }
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pilotId || !championshipId) {
      toast({
        title: 'Atenção',
        description: 'Selecione o piloto e o campeonato envolvidos.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)
      await infractionsService.create({
        pilot_id: pilotId,
        championship_id: championshipId,
        type,
        description,
        severity,
        status: 'aberta',
      })

      toast({
        title: 'Sucesso',
        description: 'Infração registrada e enviada para o tribunal de comissários.',
      })
      navigate('/dashboard/infracoes')
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro',
        description: err?.message || 'Falha ao registrar infração.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in pb-12">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/infracoes')}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Infrações
        </Button>
      </div>

      <div>
        <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
          Registrar Infração Disciplinar
        </h1>
        <p className="text-xs sm:text-sm text-gray-500">
          Abra um relatório para apuração dos comissários técnicos e desportivos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 uppercase">
                Piloto Envolvido *
              </Label>
              <Select value={pilotId} onValueChange={setPilotId}>
                <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                  <SelectValue placeholder="Selecione o piloto" />
                </SelectTrigger>
                <SelectContent>
                  {pilots.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.team_name ? `(${p.team_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 uppercase">Campeonato *</Label>
              <Select value={championshipId} onValueChange={setChampionshipId}>
                <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                  <SelectValue placeholder="Selecione o campeonato" />
                </SelectTrigger>
                <SelectContent>
                  {championships.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 uppercase">
                Tipo de Incidente *
              </Label>
              <Select value={type} onValueChange={(val) => setType(val as InfractionType)}>
                <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ultrapassagem_perigosa">Ultrapassagem Perigosa</SelectItem>
                  <SelectItem value="toque_na_traseira">Toque na Traseira</SelectItem>
                  <SelectItem value="bloqueio_de_trajetoria">Bloqueio de Trajetória</SelectItem>
                  <SelectItem value="excesso_de_velocidade">
                    Excesso de Velocidade no Pit
                  </SelectItem>
                  <SelectItem value="conduta_antidesportiva">Conduta Antidesportiva</SelectItem>
                  <SelectItem value="outros">Outros Incidentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 uppercase">
                Severidade Regulamentar *
              </Label>
              <Select
                value={severity}
                onValueChange={(val) => setSeverity(val as InfractionSeverity)}
              >
                <SelectTrigger className="text-xs bg-[#F5F5F7] border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa (Advertência verbal/tempo)</SelectItem>
                  <SelectItem value="media">Média (Perda de posições no grid)</SelectItem>
                  <SelectItem value="alta">Alta (Desclassificação / Suspensão)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inf-desc" className="text-xs font-semibold text-gray-700 uppercase">
                Descrição dos Fatos e Evidências
              </Label>
              <Textarea
                id="inf-desc"
                rows={4}
                placeholder="Indique a volta, curva, número dos carros envolvidos e relato do incidente..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs bg-[#F5F5F7]"
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/infracoes')}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold btn-checkered-sweep"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? 'Gravando...' : 'Protocolar Infração'}
          </Button>
        </div>
      </form>
    </div>
  )
}
