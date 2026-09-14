import React from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Shield,
  MapPin,
  Trophy,
  Award,
  CheckCircle2,
  Calendar,
  Activity,
  ArrowUpRight,
} from 'lucide-react'
import type { HomeExploreItem } from '@/types/home'

interface ExploreSectionProps {
  items: HomeExploreItem[]
}

export const ExploreSection: React.FC<ExploreSectionProps> = ({ items }) => {
  const iconMap: Record<string, React.ElementType> = {
    Users,
    Shield,
    MapPin,
    Trophy,
    Award,
    CheckCircle2,
    Calendar,
    Activity,
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-5 rounded-sm bg-[#E10600]" />
        <div>
          <h2 className="text-base sm:text-lg font-racing font-bold uppercase tracking-wider text-white">
            EXPLORE A PLATAFORMA IRB
          </h2>
          <p className="text-xs text-gray-400">
            Acesse o ecossistema completo de pilotos, equipes, pistas e estatísticas
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {items.map((item) => {
          const Icon = iconMap[item.iconName] || Trophy

          return (
            <Link
              key={item.id}
              to={item.path}
              className="group p-4 rounded-2xl bg-[#141423] hover:bg-[#1A1A2E] border border-[#222238] hover:border-[#38385A] transition-all duration-200 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#1E1E30] text-[#E10600] group-hover:bg-[#E10600] group-hover:text-white transition-colors flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-[#E10600] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>

              <div>
                <h3 className="font-racing text-sm sm:text-base font-bold text-white group-hover:text-red-400 transition-colors">
                  {item.label}
                </h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
              </div>

              {item.count && (
                <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-gray-500">
                  {item.count}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
