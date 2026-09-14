import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio, Clock, Flag, ChevronRight, Gauge, Trophy, ExternalLink, Layers } from 'lucide-react'
import type { HomeLiveSession } from '@/types/home'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface LiveSessionSectionProps {
  sessions: HomeLiveSession[]
}

export const LiveSessionSection: React.FC<LiveSessionSectionProps> = ({ sessions }) => {
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions?.[0]?.id || '')

  // If no sessions, render nothing (NEXT race assumes priority)
  if (!sessions || sessions.length === 0) {
    return null
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0]

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#12070A] via-[#141424] to-[#0A0A12] border-b border-red-950/60 py-6 sm:py-8">
      {/* Decorative motorsport glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
        {/* Header bar: Live Indicator + Multiple Sessions Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E10600]" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#E10600] flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                AO VIVO AGORA
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-xs text-gray-400 font-mono">
                {sessions.length} {sessions.length === 1 ? 'Sessão ativa' : 'Sessões simultâneas'}
              </span>
            </div>
          </div>

          {/* Switcher tabs if multiple sessions */}
          {sessions.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/40 border border-white/5">
              {sessions.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    s.id === activeSession.id
                      ? 'bg-[#E10600] text-white shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s.championshipName.replace('IRB ', '')} ({s.sessionType})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Primary Live Card */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1A1A2E]/90 to-[#161622]/90 border border-red-500/20 p-4 sm:p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Sports details */}
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                  🔴 LIVE
                </Badge>
                <Badge
                  variant="outline"
                  className="border-gray-700 text-gray-300 font-medium text-[11px] px-2 py-0.5"
                >
                  {activeSession.championshipName}
                </Badge>
                <span className="text-gray-500 text-xs">•</span>
                <span className="text-xs text-gray-400 font-medium">
                  {activeSession.editionName}
                </span>
              </div>

              {/* Title & Stage */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-racing font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <span>Stage {activeSession.stageNumber}</span>
                  <span className="text-[#E10600]">·</span>
                  <span className="text-gray-200">{activeSession.sessionName}</span>
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-300 mt-1 font-medium">
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <Flag className="w-4 h-4 text-[#E10600]" />
                    {activeSession.trackName}
                  </span>
                  <span className="text-gray-500">({activeSession.trackCountryCode})</span>
                </div>
              </div>

              {/* Race state telemetric indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {activeSession.lapsTotal && activeSession.currentLap && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-blue-400" />
                      Volta Atual
                    </div>
                    <div className="font-mono text-sm sm:text-base font-bold text-white">
                      {activeSession.currentLap}{' '}
                      <span className="text-xs text-gray-500">/ {activeSession.lapsTotal}</span>
                    </div>
                  </div>
                )}

                {activeSession.timeRemaining && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Tempo Restante
                    </div>
                    <div className="font-mono text-sm sm:text-base font-bold text-white">
                      {activeSession.timeRemaining}
                    </div>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5 col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    Líder (P1)
                  </div>
                  <div className="font-medium text-xs sm:text-sm text-white truncate flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#E10600]">
                      {activeSession.leaderCarNumber}
                    </span>
                    <span className="truncate">{activeSession.leaderDriverName}</span>
                    {activeSession.gapToSecond && (
                      <span className="text-[10px] text-gray-400 font-mono ml-auto">
                        ({activeSession.gapToSecond})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Big CTA Button */}
            <div className="lg:pl-6 lg:border-l lg:border-[#27273F] flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Link to="/race-center" className="w-full">
                <Button className="w-full bg-[#E10600] hover:bg-[#C00500] text-white font-racing font-bold tracking-wider text-sm sm:text-base py-5 px-6 shadow-xl shadow-red-950/50 btn-checkered-sweep flex items-center justify-center gap-2">
                  <span>ACOMPANHAR SESSION</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>

              <div className="text-center">
                <span className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Timing & Transmissão Homologada
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
