import React from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Clock, Trophy, ArrowRight } from 'lucide-react'
import type { HomeHistoricalResultItem } from '@/types/home'

interface HistoricalResultsSectionProps {
  results: HomeHistoricalResultItem[]
}

export const HistoricalResultsSection: React.FC<HistoricalResultsSectionProps> = ({ results }) => {
  return (
    <div className="h-full flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#161626] to-[#12121E] border border-[#24243A] p-5 sm:p-6 shadow-md text-white">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 rounded-sm bg-[#E10600]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#E10600]">
              ÚLTIMOS RESULTADOS
            </h3>
          </div>
          <Link
            to="/resultados"
            className="text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>TODOS OS RESULTADOS</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#E10600]" />
          </Link>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Histórico recente de corridas com atas homologadas
        </p>
      </div>

      {/* List */}
      <div className="space-y-2.5 flex-1">
        {results.map((res) => (
          <Link
            key={res.id}
            to={`/resultados/${res.id}`}
            className="flex items-center justify-between p-3 rounded-xl bg-black/30 hover:bg-[#1E1E30] border border-white/5 hover:border-white/10 transition-colors group gap-3"
          >
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-white group-hover:text-red-400 transition-colors truncate">
                  {res.championshipName}
                </span>
                <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
                  {res.editionName}
                </span>
              </div>
              <div className="text-xs text-gray-400 truncate flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-gray-300 font-medium">{res.winnerName}</span>
                <span className="text-gray-500">· {res.trackName}</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-mono text-gray-300 block">{res.dateFormatted}</span>
              <span className="text-[10px] text-emerald-400 font-medium">Oficial</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-mono">
          Decisões dos comissários aplicadas
        </span>
        <Link
          to="/resultados"
          className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>ARQUIVO ESPORTIVO</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#E10600]" />
        </Link>
      </div>
    </div>
  )
}
