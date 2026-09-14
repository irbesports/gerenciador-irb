import React from 'react'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, ChevronRight, Zap, Shield, ArrowRight } from 'lucide-react'
import type { HomeLatestResult } from '@/types/home'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface LatestResultSectionProps {
  result: HomeLatestResult
}

export const LatestResultSection: React.FC<LatestResultSectionProps> = ({ result }) => {
  return (
    <div className="h-full flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#161626] to-[#12121E] border border-[#24243A] p-5 sm:p-6 shadow-md text-white">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 rounded-sm bg-[#E10600]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E10600]">
              ÚLTIMO RESULTADO
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
            <CheckCircle2 className="w-3 h-3" />
            RESULTADO OFICIAL
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate">
          {result.championshipName} · {result.trackName}
        </p>
      </div>

      {/* Podium Results */}
      <div className="my-4 space-y-2 flex-1 flex flex-col justify-center">
        {result.podium.map((entry) => {
          const medalColors = {
            1: 'bg-amber-400 text-stone-950 border-amber-300',
            2: 'bg-slate-300 text-stone-950 border-slate-200',
            3: 'bg-amber-700 text-white border-amber-600',
          }[entry.position]

          return (
            <div
              key={entry.position}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-black/30 border border-white/5 hover:border-white/10 transition-colors gap-3"
            >
              {/* Position Badge & Driver */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-6 h-6 rounded-md font-racing font-bold text-xs flex items-center justify-center shrink-0 border ${medalColors}`}
                >
                  {entry.position}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-white truncate">
                      {entry.driverName}
                    </span>
                    <span className="font-mono text-xs text-[#E10600] font-bold">
                      {entry.carNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                    <Shield className="w-3 h-3 text-gray-500 shrink-0" />
                    <span className="truncate">{entry.teamName}</span>
                  </div>
                </div>
              </div>

              {/* Gap / Time */}
              <div className="text-right shrink-0">
                <span className="font-mono text-xs font-semibold text-gray-300">
                  {entry.timeOrGap}
                </span>
                {entry.carModel && (
                  <div className="text-[10px] text-gray-500 truncate max-w-[100px]">
                    {entry.carModel.replace(' GT3 R', '').replace(' GT3', '')}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Fastest Lap Badge */}
        {result.fastestLap && (
          <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300">
            <span className="flex items-center gap-1 font-semibold">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              Melhor Volta Oficial:
            </span>
            <span className="font-mono text-white">
              {result.fastestLap.driverName} ({result.fastestLap.lapTime})
            </span>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-mono">
          Finalizado em {result.completedDate}
        </span>
        <Link
          to="/resultados"
          className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>VER RESULTADO COMPLETO</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#E10600]" />
        </Link>
      </div>
    </div>
  )
}
