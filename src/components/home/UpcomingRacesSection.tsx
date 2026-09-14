import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ChevronRight, Clock, MapPin, Flag } from 'lucide-react'
import type { HomeUpcomingRaceItem } from '@/types/home'
import { Badge } from '@/components/ui/badge'

interface UpcomingRacesSectionProps {
  races: HomeUpcomingRaceItem[]
}

export const UpcomingRacesSection: React.FC<UpcomingRacesSectionProps> = ({ races }) => {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#161626] to-[#12121E] border border-[#24243A] p-5 sm:p-6 shadow-md text-white">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-4 rounded-sm bg-[#E10600]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#E10600]">
            PRÓXIMAS CORRIDAS
          </h3>
        </div>
        <Link
          to="/calendario"
          className="text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>VER CALENDÁRIO</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#E10600]" />
        </Link>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {races.map((race) => (
          <Link
            key={race.id}
            to={`/corrida/${race.id}`}
            className="flex items-center justify-between p-3 rounded-xl bg-black/30 hover:bg-[#1E1E30] border border-white/5 hover:border-white/10 transition-all duration-150 group gap-3"
          >
            {/* Left: Date pill & race details */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex flex-col items-center justify-center w-12 h-11 rounded-lg bg-[#202034] group-hover:bg-[#E10600] text-gray-200 group-hover:text-white transition-colors shrink-0 font-mono">
                <span className="text-[10px] font-bold uppercase leading-none">
                  {race.dateFormatted.split(' ')[1] || 'SET'}
                </span>
                <span className="text-sm font-black leading-tight">
                  {race.dateFormatted.split(' ')[0] || '18'}
                </span>
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs sm:text-sm text-white group-hover:text-red-400 transition-colors truncate">
                    {race.championshipName}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 h-4 border-gray-700 text-gray-300 font-mono hidden sm:inline-flex"
                  >
                    {race.sessionType}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 truncate">
                  <span className="truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                    {race.trackName}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Time & Touch Action */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs font-mono font-semibold text-gray-200">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{race.timeFormatted}</span>
                </div>
                {race.spotsRemaining && (
                  <span className="text-[10px] text-emerald-400 font-mono block">
                    {race.spotsRemaining} vagas
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
