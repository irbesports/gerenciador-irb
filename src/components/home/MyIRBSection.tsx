import React from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Shield,
  Trophy,
  Award,
  ArrowRight,
  TrendingUp,
  Clock,
  LogIn,
  Layers,
} from 'lucide-react'
import type { HomeDriverSummary } from '@/types/home'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface MyIRBSectionProps {
  isLoggedIn: boolean
  driver: HomeDriverSummary | null
}

export const MyIRBSection: React.FC<MyIRBSectionProps> = ({ isLoggedIn, driver }) => {
  return (
    <div className="h-full flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#161626] to-[#12121E] border border-[#24243A] p-5 sm:p-6 shadow-md text-white">
      {/* Top Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 rounded-sm bg-[#E10600]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E10600]">MY IRB</h3>
          </div>
          {isLoggedIn && driver && (
            <span className="text-[10px] font-mono font-bold text-gray-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
              {driver.irbId}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {isLoggedIn
            ? 'Seu status competitivo oficial na plataforma IRB'
            : 'Sua central personalizada de competições e atividade esportiva'}
        </p>
      </div>

      {/* Body: Logged in Driver vs Logged Out Visitor */}
      <div className="my-5 flex-1 flex flex-col justify-center">
        {isLoggedIn && driver ? (
          <div className="space-y-4">
            {/* Driver Profile Line */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
              <Avatar className="w-12 h-12 rounded-xl border-2 border-[#E10600]/40">
                <AvatarImage src={driver.avatarUrl} />
                <AvatarFallback className="bg-[#E10600] font-bold text-white text-base">
                  {driver.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-racing text-base font-bold text-white truncate">
                    {driver.name}
                  </h4>
                  <span className="font-mono font-bold text-[#E10600] text-sm">
                    {driver.carNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                  <Shield className="w-3.5 h-3.5 text-gray-500" />
                  <span className="truncate">{driver.teamName}</span>
                </div>
              </div>
            </div>

            {/* Quick Competitive Summary Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#1C1C2E] border border-white/5 space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-between">
                  <span>Campeonato Principal</span>
                  <Trophy className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-xs font-semibold text-gray-200 truncate">
                  {driver.primaryChampionship.name}
                </div>
                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="font-racing text-xl font-bold text-emerald-400">
                    P{driver.primaryChampionship.position}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    {driver.primaryChampionship.points} pts
                  </span>
                  <TrendingUp className="w-3 h-3 text-emerald-400 ml-auto" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1C1C2E] border border-white/5 space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-between">
                  <span>Próxima Corrida</span>
                  <Clock className="w-3 h-3 text-blue-400" />
                </div>
                <div className="text-xs font-semibold text-white">{driver.nextRaceTime}</div>
                <div className="text-[11px] text-gray-400 pt-1">Grid confirmado · Interlagos</div>
              </div>
            </div>
          </div>
        ) : (
          /* Visitor Discovery State */
          <div className="p-5 rounded-xl bg-black/30 border border-dashed border-gray-700/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600] flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-racing text-base font-bold text-white uppercase">
                Acompanhe Suas Corridas
              </h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                Entre na sua conta para acompanhar seus campeonatos, resultados, posição na tabela e
                próximas corridas.
              </p>
            </div>
            <Link to="/login" className="inline-block w-full pt-1">
              <Button className="w-full bg-[#E10600] hover:bg-[#C00500] text-white font-racing font-bold text-xs uppercase tracking-wider py-2.5 btn-checkered-sweep flex items-center justify-center gap-1.5">
                <LogIn className="w-4 h-4" />
                <span>ENTRAR NA PLATAFORMA</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {isLoggedIn && driver && (
        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <Link
            to="/pilotos"
            className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>VER MINHA ATIVIDADE</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#E10600]" />
          </Link>
          <span className="text-[10px] text-gray-500 font-mono">
            {driver.activeChampionshipsCount} campeonatos ativos
          </span>
        </div>
      )}
    </div>
  )
}
