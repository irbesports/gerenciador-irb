import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  ChevronRight,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from 'lucide-react'
import type { DriverStandingEntry, TeamStandingEntry } from '@/types/home'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface StandingsSectionProps {
  drivers: DriverStandingEntry[]
  teams: TeamStandingEntry[]
}

export const StandingsSection: React.FC<StandingsSectionProps> = ({ drivers, teams }) => {
  const [tab, setTab] = useState<'drivers' | 'teams'>('drivers')

  return (
    <div className="h-full flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#161626] to-[#12121E] border border-[#24243A] p-5 sm:p-6 shadow-md text-white">
      {/* Header & Toggle */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 rounded-sm bg-[#E10600]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E10600]">
              CLASSIFICAÇÃO OFICIAL
            </h3>
          </div>

          {/* Drivers | Teams Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-black/40 border border-white/5 text-xs font-semibold">
            <button
              onClick={() => setTab('drivers')}
              className={`px-3 py-1 rounded-md transition-all ${
                tab === 'drivers'
                  ? 'bg-[#E10600] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Drivers
            </button>
            <button
              onClick={() => setTab('teams')}
              className={`px-3 py-1 rounded-md transition-all ${
                tab === 'teams'
                  ? 'bg-[#E10600] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Teams
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Tabela homologada IRB GT Pro Championship · 2025 S1
        </p>
      </div>

      {/* Standings List */}
      <div className="space-y-2 flex-1">
        {tab === 'drivers'
          ? drivers.slice(0, 5).map((driver) => {
              const isLeader = driver.position === 1

              return (
                <div
                  key={driver.driverId}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    isLeader
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-black/30 border-white/5 hover:bg-[#1A1A2C]'
                  }`}
                >
                  {/* Pos & Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-racing font-bold text-sm w-5 text-center ${
                        isLeader ? 'text-amber-400' : 'text-gray-400'
                      }`}
                    >
                      {driver.position}
                    </span>

                    <Avatar className="w-7 h-7 rounded-lg border border-white/10 shrink-0">
                      <AvatarImage src={driver.avatarUrl} />
                      <AvatarFallback className="text-[10px] bg-[#1E1E2E] text-white">
                        {driver.driverName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs sm:text-sm text-white truncate">
                          {driver.driverName}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#E10600]">
                          {driver.carNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 truncate block">
                        {driver.teamName}
                      </span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-racing text-base font-bold text-white tabular-nums">
                        {driver.points}
                      </span>
                      <span className="text-[10px] text-gray-400 block font-mono">pts</span>
                    </div>
                  </div>
                </div>
              )
            })
          : /* Teams standings tab */
            teams.slice(0, 4).map((team) => {
              const isLeader = team.position === 1

              return (
                <div
                  key={team.teamId}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    isLeader
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-black/30 border-white/5 hover:bg-[#1A1A2C]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-racing font-bold text-sm w-5 text-center ${
                        isLeader ? 'text-amber-400' : 'text-gray-400'
                      }`}
                    >
                      {team.position}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[#202034] flex items-center justify-center text-xs font-bold text-white shrink-0">
                      <Shield className="w-4 h-4 text-[#E10600]" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs sm:text-sm text-white truncate block">
                        {team.teamName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono truncate block">
                        {team.drivers.join(' · ')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-racing text-base font-bold text-white tabular-nums">
                      {team.points}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-mono">pts</span>
                  </div>
                </div>
              )
            })}
      </div>

      {/* Footer CTA */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-mono">Sistema de desempate homologado</span>
        <Link
          to="/classificacoes"
          className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>VER CLASSIFICAÇÃO COMPLETA</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#E10600]" />
        </Link>
      </div>
    </div>
  )
}
