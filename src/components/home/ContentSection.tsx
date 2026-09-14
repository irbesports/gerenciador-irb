import React from 'react'
import { Link } from 'react-router-dom'
import { Newspaper, PlayCircle, Mic, ArrowRight, Clock, ChevronRight } from 'lucide-react'
import type { HomeContentItem } from '@/types/home'
import { Badge } from '@/components/ui/badge'

interface ContentSectionProps {
  articles: HomeContentItem[]
}

export const ContentSection: React.FC<ContentSectionProps> = ({ articles }) => {
  const featured = articles.find((a) => a.featured) || articles[0]
  const secondary = articles.filter((a) => a.id !== featured?.id)

  const typeIcons = {
    news: Newspaper,
    video: PlayCircle,
    interview: Mic,
    driver_spotlight: Newspaper,
    team_spotlight: Newspaper,
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-5 rounded-sm bg-[#E10600]" />
          <div>
            <h2 className="text-base sm:text-lg font-racing font-bold uppercase tracking-wider text-white">
              CONTEÚDO & BASTIDORES
            </h2>
            <p className="text-xs text-gray-400">
              Notícias oficiais, entrevistas com Drivers e destaques das transmissões
            </p>
          </div>
        </div>

        <Link
          to="/conteudo"
          className="text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>VER MAIS CONTEÚDO</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#E10600]" />
        </Link>
      </div>

      {/* Grid: 1 Big Featured + 2 Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Featured Left (2 cols) */}
        {featured && (
          <Link
            to={featured.url}
            className="lg:col-span-2 group rounded-2xl bg-[#151525] hover:bg-[#1B1B30] border border-[#24243A] hover:border-[#383858] transition-all duration-200 overflow-hidden shadow-lg flex flex-col justify-between"
          >
            <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-[#1A1A2E]">
              <img
                src={featured.imageUrl}
                alt={featured.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151525] via-[#151525]/40 to-transparent" />
              <div className="absolute top-3 left-3">
                <Badge className="bg-[#E10600] text-white font-bold text-[10px] uppercase tracking-wider">
                  {featured.category}
                </Badge>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-2">
              <h3 className="font-racing text-lg sm:text-2xl font-bold text-white group-hover:text-red-400 transition-colors leading-tight">
                {featured.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 line-clamp-2">{featured.subtitle}</p>
              <div className="pt-2 flex items-center gap-3 text-xs text-gray-500 font-mono">
                <span>{featured.publishedAt}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {featured.readingTimeOrDuration}
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Secondary Right Column */}
        <div className="space-y-4 flex flex-col justify-between">
          {secondary.map((item) => {
            const Icon = typeIcons[item.type] || Newspaper

            return (
              <Link
                key={item.id}
                to={item.url}
                className="group flex-1 flex flex-col justify-between rounded-2xl bg-[#151525] hover:bg-[#1B1B30] border border-[#24243A] hover:border-[#383858] transition-all duration-200 overflow-hidden shadow-lg p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="font-bold uppercase tracking-wider text-[#E10600] flex items-center gap-1">
                      <Icon className="w-3.5 h-3.5" />
                      {item.category}
                    </span>
                    <span className="font-mono">{item.readingTimeOrDuration}</span>
                  </div>
                  <h4 className="font-racing text-sm sm:text-base font-bold text-white group-hover:text-red-400 transition-colors leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-400 line-clamp-2">{item.subtitle}</p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                  <span>{item.publishedAt}</span>
                  <span className="text-gray-400 group-hover:text-[#E10600] flex items-center gap-1 font-semibold text-[11px]">
                    Ler mais <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
