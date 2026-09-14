import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HomeHeader } from '@/components/home/HomeHeader'
import { HomeFooter } from '@/components/home/HomeFooter'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Clock,
  Radio,
  Trophy,
  Award,
  Shield,
  Calendar,
  CheckCircle2,
} from 'lucide-react'

interface SportsPlaceholderPageProps {
  title: string
  subtitle: string
  badgeText?: string
  icon?: 'trophy' | 'award' | 'radio' | 'calendar' | 'shield' | 'check'
}

export const SportsPlaceholderPage: React.FC<SportsPlaceholderPageProps> = ({
  title,
  subtitle,
  badgeText = 'Plataforma Esportiva IRB',
  icon = 'trophy',
}) => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0B0B14] text-white flex flex-col font-sans">
      <HomeHeader liveCount={1} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#1C1C2E] border border-white/10 text-[#E10600] flex items-center justify-center shadow-xl">
          {icon === 'radio' && <Radio className="w-8 h-8 animate-pulse" />}
          {icon === 'award' && <Award className="w-8 h-8" />}
          {icon === 'calendar' && <Calendar className="w-8 h-8" />}
          {icon === 'shield' && <Shield className="w-8 h-8" />}
          {icon === 'check' && <CheckCircle2 className="w-8 h-8" />}
          {icon === 'trophy' && <Trophy className="w-8 h-8" />}
        </div>

        <div className="space-y-2 max-w-xl">
          <span className="text-xs uppercase tracking-widest font-bold text-[#E10600] bg-red-950/40 border border-red-800/40 px-3 py-1 rounded-full">
            {badgeText}
          </span>
          <h1 className="font-racing text-3xl sm:text-4xl font-bold uppercase tracking-wide text-white mt-3">
            {title}
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">{subtitle}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#141423] border border-[#232338] text-xs text-gray-400 max-w-md font-mono">
          <span className="text-gray-300 font-bold block mb-1">Status do Módulo:</span>
          Conectado à arquitetura esportiva V1 (Year → Season → Championship → Edition → Stage →
          Session). Dados preparados para receber telemetria e súmula oficial.
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => navigate('/')}
            className="bg-[#E10600] hover:bg-[#C00500] text-white font-racing font-bold uppercase text-xs px-5 py-2.5 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Home IRB</span>
          </Button>

          <Link to="/campeonatos">
            <Button
              variant="outline"
              className="border-[#2B2B42] text-gray-300 hover:bg-[#1B1B2C] text-xs"
            >
              Ver Campeonatos Ativos
            </Button>
          </Link>
        </div>
      </main>

      <HomeFooter />
    </div>
  )
}
