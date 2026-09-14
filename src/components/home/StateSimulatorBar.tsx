import React from 'react'
import { SlidersHorizontal, Radio, UserCheck, UserX, Bell, RefreshCw, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StateSimulatorBarProps {
  hasLive: boolean
  setHasLive: (val: boolean) => void
  hasAlert: boolean
  setHasAlert: (val: boolean) => void
  isDriverState: boolean
  setIsDriverState: (val: boolean) => void
  onReset: () => void
}

export const StateSimulatorBar: React.FC<StateSimulatorBarProps> = ({
  hasLive,
  setHasLive,
  hasAlert,
  setHasAlert,
  isDriverState,
  setIsDriverState,
  onReset,
}) => {
  return (
    <aside
      aria-label="Simulador de Estados da Home V1"
      className="bg-[#12121E] border-b border-[#222238] py-2 px-4 text-xs text-gray-300"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left note */}
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-[#E10600]/20 text-[#E10600] font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold text-white uppercase text-[10px] tracking-wider">
            Simulador de Estados V1:
          </span>
          <span className="text-gray-400 text-[11px] hidden md:inline">
            Alterne entre estados para testar a hierarquia esportiva da Home
          </span>
        </div>

        {/* State Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live / No Live Toggle */}
          <button
            onClick={() => setHasLive(!hasLive)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${
              hasLive
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-black/30 text-gray-400 border-gray-700/60'
            }`}
            title="Alterna exibição do módulo 🔴 LIVE quando há sessão em andamento"
          >
            <Radio
              className={`w-3 h-3 ${hasLive ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}
            />
            <span>{hasLive ? 'LIVE Ativo' : 'Sem LIVE'}</span>
          </button>

          {/* Priority Alert Toggle */}
          <button
            onClick={() => setHasAlert(!hasAlert)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${
              hasAlert
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-black/30 text-gray-400 border-gray-700/60'
            }`}
            title="Alterna exibição do Priority Alert contextual"
          >
            <Bell className="w-3 h-3" />
            <span>{hasAlert ? 'Alerta Ativo' : 'Sem Alerta'}</span>
          </button>

          {/* Driver profile mode */}
          <button
            onClick={() => setIsDriverState(!isDriverState)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${
              isDriverState
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-black/30 text-gray-400 border-gray-700/60'
            }`}
            title="Alterna dados de Driver ativo vs visitante comum"
          >
            {isDriverState ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
            <span>{isDriverState ? 'Modo Driver Inscrito' : 'Visitante Neutro'}</span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Redefinir simulador"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
