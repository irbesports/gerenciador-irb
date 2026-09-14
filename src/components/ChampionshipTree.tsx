import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Trophy, Calendar, FolderTree } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import type { Year, Season, Championship } from '@/types'
import { cn } from '@/lib/utils'

interface TreeData {
  year: Year
  seasons: {
    season: Season
    championships: Championship[]
  }[]
}

interface ChampionshipTreeProps {
  treeData: TreeData[]
  isLoading?: boolean
}

export const ChampionshipTree: React.FC<ChampionshipTreeProps> = ({ treeData, isLoading }) => {
  const navigate = useNavigate()
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({
    // Expand first year by default
    ...(treeData[0] ? { [treeData[0].year.id]: true } : {}),
  })

  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({
    // Expand first season of first year
    ...(treeData[0]?.seasons[0] ? { [treeData[0].seasons[0].season.id]: true } : {}),
  })

  const toggleYear = (id: string) => {
    setExpandedYears((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleSeason = (id: string) => {
    setExpandedSeasons((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 animate-pulse">
        Carregando estrutura hierárquica...
      </div>
    )
  }

  if (treeData.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 border border-dashed rounded-xl">
        Nenhum campeonato estruturado no momento.
      </div>
    )
  }

  return (
    <div className="space-y-3 font-sans">
      {treeData.map(({ year, seasons }) => {
        const isYearOpen = expandedYears[year.id] ?? true

        return (
          <div
            key={year.id}
            className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white shadow-sm transition-all"
          >
            {/* Year Node Header */}
            <button
              onClick={() => toggleYear(year.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 transition-colors text-left font-medium"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#14141F] text-white flex items-center justify-center font-racing text-sm font-bold shadow-sm">
                  {year.year}
                </div>
                <div>
                  <span className="font-racing text-base text-[#1E1E2F] tracking-wide block">
                    {year.name || `Temporada ${year.year}`}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {seasons.length} {seasons.length === 1 ? 'temporada' : 'temporadas'} cadastradas
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono border-gray-300">
                  Ano Fiscal/Esportivo
                </Badge>
                {isYearOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>

            {/* Seasons Under Year */}
            {isYearOpen && (
              <div className="p-3 pl-6 sm:pl-8 space-y-2 border-t border-gray-100 bg-white">
                {seasons.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">
                    Nenhuma temporada vinculada a este ano.
                  </p>
                ) : (
                  seasons.map(({ season, championships }) => {
                    const isSeasonOpen = expandedSeasons[season.id] ?? true

                    return (
                      <div
                        key={season.id}
                        className="border border-gray-150 rounded-lg overflow-hidden bg-[#FAFAFC]"
                      >
                        {/* Season Node */}
                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-100/50 hover:bg-gray-150/70 transition-colors">
                          <button
                            onClick={() => toggleSeason(season.id)}
                            className="flex items-center gap-2.5 text-left flex-1"
                          >
                            <Calendar className="w-4 h-4 text-[#E10600]" />
                            <div>
                              <span className="text-xs font-semibold text-gray-800 tracking-wide block">
                                {season.name}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {championships.length}{' '}
                                {championships.length === 1 ? 'campeonato' : 'campeonatos'}
                              </span>
                            </div>
                          </button>

                          <div className="flex items-center gap-2">
                            <Badge
                              className={cn(
                                'text-[10px] h-4 px-1.5 capitalize border-none font-medium',
                                season.status === 'ativa'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : season.status === 'planejada'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-200 text-gray-700',
                              )}
                            >
                              {season.status || 'ativa'}
                            </Badge>
                            <button
                              onClick={() => toggleSeason(season.id)}
                              className="p-1 text-gray-500 hover:text-gray-800"
                            >
                              {isSeasonOpen ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Championships Under Season */}
                        {isSeasonOpen && (
                          <div className="p-2 pl-6 sm:pl-8 space-y-1.5 bg-white border-t border-gray-100">
                            {championships.length === 0 ? (
                              <p className="text-xs text-gray-400 italic py-1">
                                Nenhum campeonato registrado nesta temporada.
                              </p>
                            ) : (
                              championships.map((champ) => (
                                <div
                                  key={champ.id}
                                  onClick={() => navigate(`/dashboard/campeonatos/${champ.id}`)}
                                  className="group flex items-center justify-between p-2 rounded-lg hover:bg-red-50/50 transition-all cursor-pointer border border-transparent hover:border-red-100"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded bg-gray-100 group-hover:bg-[#E10600] group-hover:text-white flex items-center justify-center transition-colors">
                                      <Trophy className="w-3.5 h-3.5 text-gray-600 group-hover:text-white" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-medium text-gray-900 group-hover:text-[#E10600] transition-colors truncate block">
                                        {champ.name}
                                      </span>
                                      {champ.description && (
                                        <span className="text-[10px] text-gray-500 truncate block">
                                          {champ.description}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[9px] h-4 px-1 capitalize font-medium',
                                        champ.status === 'ativo'
                                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                          : 'border-gray-200 text-gray-600',
                                      )}
                                    >
                                      {champ.status || 'ativo'}
                                    </Badge>
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#E10600] group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
