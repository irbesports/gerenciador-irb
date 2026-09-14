import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Flag,
  Globe,
  Shield,
  HelpCircle,
  FileText,
  Mail,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

export const HomeFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[#09090F] border-t border-[#1C1C2A] text-gray-400 text-xs mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E10600] flex items-center justify-center font-racing font-bold text-white text-base">
                IRB
              </div>
              <span className="font-racing text-lg font-bold uppercase tracking-wider text-white">
                IRB <span className="text-[#E10600]">E-SPORTS</span>
              </span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              A autoridade do automobilismo virtual brasileiro. Plataforma oficial de campeonatos,
              estatísticas, moderação e competições de alto nível.
            </p>
            <div className="text-[11px] font-mono text-gray-500 pt-1">
              Versão 1.0.0-V1 · Plataforma IRB
            </div>
          </div>

          {/* Links Column 1: Esportivo */}
          <div className="space-y-2">
            <h4 className="font-racing text-sm font-bold uppercase tracking-wider text-white">
              Esportivo & Corridas
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/campeonatos" className="hover:text-white transition-colors">
                  Campeonatos Ativos
                </Link>
              </li>
              <li>
                <Link to="/calendario" className="hover:text-white transition-colors">
                  Calendário de Etapas
                </Link>
              </li>
              <li>
                <Link to="/classificacoes" className="hover:text-white transition-colors">
                  Classificação Drivers & Teams
                </Link>
              </li>
              <li>
                <Link to="/resultados" className="hover:text-white transition-colors">
                  Resultados Oficiais Homologados
                </Link>
              </li>
              <li>
                <Link to="/race-center" className="hover:text-white transition-colors">
                  Race Center & Live Timing
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Comunidade & Drivers */}
          <div className="space-y-2">
            <h4 className="font-racing text-sm font-bold uppercase tracking-wider text-white">
              Drivers & Organização
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/explore/drivers" className="hover:text-white transition-colors">
                  Grid de Drivers IRB
                </Link>
              </li>
              <li>
                <Link to="/explore/teams" className="hover:text-white transition-colors">
                  Equipes & Organizações
                </Link>
              </li>
              <li>
                <Link to="/meus-protestos" className="hover:text-white transition-colors">
                  Protestos & Julgamentos
                </Link>
              </li>
              <li>
                <Link to="/pistas" className="hover:text-white transition-colors">
                  Bancos de Traçados e Circuitos
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-gray-300 hover:text-[#E10600] font-medium flex items-center gap-1"
                >
                  <span>Acesso Gestor / Colaborador</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Regulamentos & Suporte */}
          <div className="space-y-2">
            <h4 className="font-racing text-sm font-bold uppercase tracking-wider text-white">
              Regulamentos & Ajuda
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/suporte" className="hover:text-white transition-colors">
                  Central de Suporte IRB
                </Link>
              </li>
              <li>
                <span className="text-gray-500 cursor-not-allowed">
                  Código Desportivo IRB (CDI)
                </span>
              </li>
              <li>
                <span className="text-gray-500 cursor-not-allowed">
                  Termos de Inscrição e Premiação
                </span>
              </li>
              <li>
                <span className="text-gray-500 cursor-not-allowed">
                  Diretrizes de Fair Play e Transmissão
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#1C1C2A] flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} IRB E-Sports / iRacing Brasil. Todos os direitos
            reservados.
          </div>
          <div className="flex items-center gap-4">
            <span>Identidade Independente Multi-Simulador</span>
            <span>•</span>
            <span className="text-gray-400 font-mono">IRB Sports Engine v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
