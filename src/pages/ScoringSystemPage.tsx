import React, { useEffect, useState } from 'react'
import { Award, Trophy, ArrowRight, Zap, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { championshipsService, scoringRulesService } from '@/services/api'
import type { Championship, ScoringRule } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ScoringSystemPage() {
  const navigate = useNavigate()
  const [championships, setChampionships] = useState<Championship[]>([])
  const [selectedChamp, setSelectedChamp] = useState<Championship | null>(null)
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const list = await championshipsService.list()
        setChampionships(list)
        if (list.length > 0) {
          setSelectedChamp(list[0])
          const r = await scoringRulesService.listByChampionship(list[0].id)
          setRules(r)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleSelectChampionship = async (c: Championship) => {
    setSelectedChamp(c)
    try {
      const r = await scoringRulesService.listByChampionship(c.id)
      setRules(r)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Sistema de Pontuação dos Campeonatos
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Consulte e audite as tabelas de pontuação posição → pontos e bônus de volta mais rápida
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Championship Selector */}
        <Card className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
            Selecione o Campeonato
          </span>
          <div className="space-y-1">
            {championships.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectChampionship(c)}
                className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs ${
                  selectedChamp?.id === c.id
                    ? 'bg-red-50 text-[#E10600] font-bold border border-red-200'
                    : 'hover:bg-gray-50 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.name}</span>
                </div>
                <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                  {c.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Scoring Table Display */}
        <div className="md:col-span-2 space-y-4">
          <Card className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-racing text-lg font-bold text-[#1E1E2F] uppercase">
                  {selectedChamp?.name || 'Tabela de Pontuação'}
                </h3>
                <p className="text-xs text-gray-500">
                  Estrutura pontual homologada para esta competição
                </p>
              </div>

              {selectedChamp && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/campeonatos/${selectedChamp.id}/editar`)}
                  className="text-xs"
                >
                  Editar Regras
                </Button>
              )}
            </div>

            {/* Fastest lap bonus info */}
            <div className="p-3.5 bg-red-50/60 rounded-xl border border-red-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-gray-800">
                <Zap className="w-4 h-4 text-[#E10600]" />
                Bônus de Volta Mais Rápida (Fastest Lap):
              </span>
              <span className="font-racing font-bold text-sm text-[#E10600]">
                +{rules[0]?.bonus_fastest_lap ?? 1} ponto adicional
              </span>
            </div>

            {/* Position list */}
            {rules.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                Nenhuma regra personalizada configurada para este campeonato ainda.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center space-y-1 hover:border-red-200 transition-colors"
                  >
                    <span className="font-racing text-xs text-gray-500 block uppercase">
                      {rule.position}º Lugar
                    </span>
                    <span className="font-racing text-2xl font-bold text-[#E10600] block tabular-nums">
                      {rule.points}
                    </span>
                    <span className="text-[10px] text-gray-400 block">pontos</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
