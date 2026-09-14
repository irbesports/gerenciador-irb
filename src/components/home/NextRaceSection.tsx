import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, Flag, UserCheck, ArrowRight, Shield } from 'lucide-react'
import type { HomeNextRace } from '@/types/home'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NextRaceSectionProps {
  race: HomeNextRace
  isUserDriver?: boolean
}

export const NextRaceSection: React.FC<NextRaceSectionProps> = ({ race, isUserDriver = false }) => {
  const isDriverEnrolled = race.driverRegistered

  return (
    <section className="relative w-full py-6 sm:py-8 bg-[#10101C] border-b border-[#202030] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Label */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#E10600]" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#E10600]">
              {isUserDriver && isDriverEnrolled
                ? 'NEXT — SUA PRÓXIMA CORRIDA'
                : 'NEXT — PRÓXIMA CORRIDA IRB'}
            </h2>
          </div>
          <span className="text-xs text-gray-400 font-mono">{race.relativeTime}</span>
        </div>

        {/* Hero Next Card */}
        <div className="relative rounded-2xl bg-gradient-to-r from-[#171728] via-[#1B1B30] to-[#141424] border border-[#2B2B45] overflow-hidden shadow-xl p-5 sm:p-7 group">
          {/* Subtle motorsport watermark texture */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-gradient-to-l from-[#E10600] to-transparent pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            {/* Left Content */}
            <div className="space-y-3.5 flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#E10600] text-white font-bold text-[10px] uppercase tracking-wider">
                  PRÓXIMA ETAPA
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-black/30 border-gray-700 text-gray-300 font-medium text-xs"
                >
                  {race.championshipName}
                </Badge>
                <span className="text-xs text-gray-500 font-mono">{race.editionName}</span>

                {isDriverEnrolled && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <UserCheck className="w-3.5 h-3.5" />
                    Você está inscrito
                  </span>
                )}
              </div>

              {/* Main Headline */}
              <div>
                <h3 className="font-racing text-2xl sm:text-3xl font-bold text-white uppercase tracking-wide group-hover:text-red-400 transition-colors">
                  Stage {race.stageNumber} · {race.sessionType}
                </h3>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-300 mt-1.5 font-medium">
                  <div className="flex items-center gap-1.5 text-white">
                    <MapPin className="w-4 h-4 text-[#E10600]" />
                    <span>{race.trackName}</span>
                  </div>
                  <span className="text-gray-600 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5 text-gray-300 font-mono">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>{race.dateFormatted}</span>
                  </div>
                  <span className="text-gray-600 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5 text-gray-300 font-mono">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{race.timeFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Driver Enrolled info if applicable */}
              {isDriverEnrolled && race.driverCarNumber && (
                <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-gray-200">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-400">Equipe:</span>
                    <span className="font-bold text-white">{race.driverTeamName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">Carro:</span>
                    <span className="font-mono font-bold text-[#E10600]">
                      {race.driverCarNumber}
                    </span>
                    <span className="text-gray-300 font-medium">({race.driverCarModel})</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Action */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
              <Link to="/corrida/gt-stage4" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#E10600] hover:bg-[#C00500] text-white font-racing font-bold tracking-wider text-sm sm:text-base py-5 px-6 shadow-lg shadow-red-950/40 btn-checkered-sweep flex items-center justify-center gap-2">
                  <span>VER CORRIDA</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <span className="text-[11px] text-gray-400 text-center sm:text-right font-mono">
                {race.totalRegistered} Drivers confirmados no grid
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
