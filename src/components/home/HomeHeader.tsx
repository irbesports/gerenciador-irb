import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Flame,
  LayoutDashboard,
  Calendar,
  Trophy,
  Award,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface HomeHeaderProps {
  onOpenSearch?: () => void
  onOpenNotifications?: () => void
  liveCount?: number
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ liveCount = 1 }) => {
  const { user, isCollaborator, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const navLinks = [
    { label: 'Campeonatos', path: '/campeonatos' },
    { label: 'Calendário', path: '/calendario' },
    { label: 'Resultados', path: '/resultados' },
    { label: 'Classificações', path: '/classificacoes' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#0D0D14]/95 backdrop-blur-md border-b border-[#1E1E2E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2.5 group focus:outline-none">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#E10600] to-[#990000] text-white font-racing font-bold text-xl tracking-tighter shadow-lg shadow-red-900/40 group-hover:scale-105 transition-transform duration-200">
                  IRB
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full opacity-80" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-racing text-xl font-bold tracking-wider text-white uppercase leading-none">
                      IRB
                    </span>
                    <span className="text-[11px] font-bold text-[#E10600] tracking-widest uppercase bg-red-950/70 border border-red-800/60 px-1.5 py-0.5 rounded">
                      E-SPORTS
                    </span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold font-mono mt-0.5">
                    Plataforma Oficial
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-[#222234]">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.path}
                    className="px-3.5 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}

                {liveCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/30 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#E10600]" />
                    {liveCount} Ao Vivo
                  </span>
                )}
              </nav>
            </div>

            {/* Right: Search, Notifications & Auth CTA */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="text-gray-400 hover:text-white hover:bg-[#1E1E2E] rounded-lg h-9 w-9"
                title="Buscar na plataforma (Ctrl + K)"
              >
                <Search className="w-4 h-4" />
              </Button>

              {/* Internal Manager Direct Access (for quick navigation when logged) */}
              {user && (
                <Link
                  to="/dashboard"
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1C2B] text-gray-300 hover:text-white hover:bg-[#252538] border border-[#2B2B3F] transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#E10600]" />
                  <span>Painel de Gestão</span>
                </Link>
              )}

              {/* User Avatar / Login */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl bg-[#171725] hover:bg-[#1F1F33] border border-[#26263B] transition-colors focus:outline-none">
                      <Avatar className="w-7 h-7 rounded-lg border border-[#34344D]">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-[#E10600] text-white font-bold text-xs">
                          {user.name?.slice(0, 2).toUpperCase() || 'DR'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:flex flex-col text-left">
                        <span className="text-xs font-semibold text-white leading-tight truncate max-w-[110px]">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {isCollaborator ? 'Colaborador' : 'Driver IRB'}
                        </span>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-[#141421] border-[#26263D] text-white shadow-xl"
                  >
                    <DropdownMenuLabel className="font-normal text-xs text-gray-400">
                      Conectado como <strong className="text-white">{user.email}</strong>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#242438]" />

                    <DropdownMenuItem
                      onClick={() => navigate('/dashboard')}
                      className="cursor-pointer hover:bg-white/5 focus:bg-white/5 text-xs text-gray-200"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2 text-[#E10600]" />
                      Painel do Gerenciador
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate('/meus-protestos')}
                      className="cursor-pointer hover:bg-white/5 focus:bg-white/5 text-xs text-gray-200"
                    >
                      <ShieldAlert className="w-4 h-4 mr-2 text-amber-500" />
                      Meus Protestos Desportivos
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate('/pilotos')}
                      className="cursor-pointer hover:bg-white/5 focus:bg-white/5 text-xs text-gray-200"
                    >
                      <UserIcon className="w-4 h-4 mr-2 text-blue-400" />
                      Grid de Pilotos Oficial
                    </DropdownMenuItem>

                    {isCollaborator && (
                      <DropdownMenuItem
                        onClick={() => navigate('/dashboard/admin')}
                        className="cursor-pointer hover:bg-white/5 focus:bg-white/5 text-xs text-gray-200"
                      >
                        <Award className="w-4 h-4 mr-2 text-purple-400" />
                        Admin Console
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-[#242438]" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-xs text-red-400"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair da Conta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => navigate('/login')}
                    className="bg-[#E10600] hover:bg-[#C00500] text-white font-bold text-xs uppercase tracking-wider px-4 py-2 h-9 shadow-md shadow-red-950/40 btn-checkered-sweep"
                  >
                    ENTRAR
                  </Button>
                </div>
              )}

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#1E1E2E] focus:outline-none"
                aria-label="Abrir menu principal"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#10101B] border-b border-[#222234] px-4 pt-3 pb-6 space-y-3 animate-fade-in">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-200 hover:bg-[#1C1C2C]"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </Link>
              ))}

              <Link
                to="/explore/drivers"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-200 hover:bg-[#1C1C2C]"
              >
                <span>Drivers & Grid</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </Link>

              <Link
                to="/explore/teams"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-200 hover:bg-[#1C1C2C]"
              >
                <span>Equipes (Teams)</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </Link>
            </nav>

            <div className="pt-3 border-t border-[#222234] space-y-2">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold bg-[#1C1C2C] text-gray-200 hover:bg-[#25253A]"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#E10600]" />
                    <span>Acessar Painel do Gerenciador</span>
                  </Link>
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleLogout()
                    }}
                    variant="ghost"
                    className="w-full text-xs text-red-400 hover:bg-red-500/10 justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair da Conta
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/login')
                  }}
                  className="w-full bg-[#E10600] hover:bg-[#C00500] text-white font-bold text-xs uppercase py-2.5"
                >
                  ENTRAR NA PLATAFORMA
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Global Quick Search Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-xl bg-[#12121E] text-white border-[#27273F]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-[#E10600]" />
              Buscar na Plataforma IRB
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Busque por Driver, Team, Campeonato ou Pista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#1A1A2A] border-[#2F2F4A] text-white placeholder:text-gray-500 focus-visible:ring-[#E10600]"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                Sugestões Rápidas
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    setSearchOpen(false)
                    navigate('/campeonatos')
                  }}
                  className="p-2.5 rounded-lg bg-[#181827] hover:bg-[#222238] border border-[#26263B] text-left transition-colors flex items-center gap-2"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#E10600]" />
                  <span>IRB GT Pro Championship</span>
                </button>
                <button
                  onClick={() => {
                    setSearchOpen(false)
                    navigate('/calendario')
                  }}
                  className="p-2.5 rounded-lg bg-[#181827] hover:bg-[#222238] border border-[#26263B] text-left transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Próximas Corridas</span>
                </button>
                <button
                  onClick={() => {
                    setSearchOpen(false)
                    navigate('/classificacoes')
                  }}
                  className="p-2.5 rounded-lg bg-[#181827] hover:bg-[#222238] border border-[#26263B] text-left transition-colors flex items-center gap-2"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Classificação de Drivers</span>
                </button>
                <button
                  onClick={() => {
                    setSearchOpen(false)
                    navigate('/pistas')
                  }}
                  className="p-2.5 rounded-lg bg-[#181827] hover:bg-[#222238] border border-[#26263B] text-left transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Autódromo de Interlagos</span>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
