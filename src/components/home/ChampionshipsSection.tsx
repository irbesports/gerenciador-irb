import React from 'react'
import { Link } from 'react-router-dom'
import { Trophy, ChevronRight, Users, Calendar, Flag, Sparkles } from 'lucide-react'
import type { HomeChampionshipCard } from '@/types/home'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ChampionshipsSectionProps {
  championships: HomeChampionshipCard[]
}

export const ChampionshipsSection: React.FC<ChampionshipsSectionProps> = ({ championships }) => {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-5 rounded-sm bg-[#E10600]" />
          <div>
            <h2 className="text-base sm:text-lg font-racing font-bold uppercase tracking-wider text-white">
              CAMPEONATOS EM DESTAQUE
            </h2>
            <p className="text-xs text-gray-400">
              Temporadas oficiais e copas abertas na Plataforma IRB
            </p>
          </div>
        </div>

        <Link to="/campeonatos">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 hover:text-white hover:bg-[#1A1A2A]"
          >
            <span>VER TODOS OS CAMPEONATOS</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#E10600]" />
          </Button>
        </Link>
      </div>

      {/* Grid of Championships */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {championships.map((champ) => {
          const statusColors: Record<string, string> = {
            'Inscrições Abertas': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            'Em Andamento': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
            'Fase Final': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
            Encerrado: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
          }

          return (
            <Link
              key={champ.id}
              to={`/campeonatos/${champ.id}`}
              className="group flex flex-col justify-between rounded-2xl bg-[#151525] hover:bg-[#1B1B30] border border-[#24243A] hover:border-[#383858] transition-all duration-200 overflow-hidden shadow-lg p-4 space-y-4"
            >
              <div className="space-y-3">
                {/* Banner & category */}
                <div className="relative h-28 w-full rounded-xl overflow-hidden bg-[#1D1D30] border border-white/5 flex items-center justify-center">
                  {champ.bannerUrl ? (
                    <img
                      src={champ.bannerUrl}
                      alt={champ.name}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1C30] to-[#121222] p-4 text-center">
                      <Trophy className="w-8 h-8 text-[#E10600]/40 group-hover:text-[#E10600] transition-colors" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151525] via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded border border-white/10">
                      {champ.category}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-semibold uppercase tracking-wider ${
                        statusColors[champ.status] || 'text-gray-300'
                      }`}
                    >
                      {champ.status}
                    </Badge>
                  </div>
                </div>

                {/* Name & Edition */}
                <div>
                  <h3 className="font-racing text-base font-bold text-white group-hover:text-red-400 transition-colors leading-tight truncate">
                    {champ.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{champ.editionName}</p>
                </div>
              </div>

              {/* Race & Grid Info */}
              <div className="pt-3 border-t border-[#232338] space-y-1.5 text-xs text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Flag className="w-3 h-3 text-[#E10600]" />
                    Próxima Etapa:
                  </span>
                  <span className="font-semibold text-white truncate max-w-[130px] text-right">
                    {champ.trackNextRace}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-gray-500" />
                    Grid:
                  </span>
                  <span className="font-mono text-gray-300">
                    {champ.gridSize}/{champ.maxGrid} Drivers
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
