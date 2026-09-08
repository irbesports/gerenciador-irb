import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Users,
  Building2,
  Car,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Award,
  DollarSign,
  Scale,
  HelpCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Flag,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import NotificationsDropdown from '@/components/NotificationsDropdown'

export default function Layout() {
  const { user, isCollaborator, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navSections = [
    {
      title: 'Geral',
      items: [
        { label: 'Início', path: '/', icon: LayoutDashboard },
        { label: 'Campeonatos', path: '/campeonatos', icon: Trophy },
        { label: 'Temporadas', path: '/temporadas', icon: Calendar },
        { label: 'Anos', path: '/anos', icon: Calendar },
        { label: 'Pilotos', path: '/pilotos', icon: Users },
        { label: 'Montadoras', path: '/montadoras', icon: Building2 },
        { label: 'Carros', path: '/carros', icon: Car },
        { label: 'Pistas', path: '/pistas', icon: MapPin },
      ],
    },
    {
      title: 'Gestão',
      items: [
        { label: 'Central de Provas', path: '/moderacao/central-de-provas', icon: ShieldCheck },
        { label: 'Casos & Protestos', path: '/moderacao', icon: AlertTriangle },
        { label: 'Infrações', path: '/infracoes', icon: Scale },
        { label: 'Pontuação', path: '/pontuacao', icon: Award },
      ],
    },
    {
      title: 'Financeiro',
      items: [{ label: 'Financeiro', path: '/financeiro', icon: DollarSign }],
    },
    {
      title: 'Suporte',
      items: [{ label: 'Suporte', path: '/suporte', icon: HelpCircle }],
    },
    ...(isCollaborator
      ? [
          {
            title: 'Administração',
            items: [{ label: 'Painel Admin', path: '/admin', icon: Settings }],
          },
        ]
      : []),
  ]

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full justify-between">
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1 mb-6 border-b border-[#2A2A3D] pb-4">
          <div className="w-10 h-10 rounded-lg bg-[#E10600] flex items-center justify-center text-white shadow-lg shadow-red-900/30 font-racing text-xl font-bold tracking-tighter">
            <Flag className="w-5 h-5 fill-white" />
          </div>
          <div className={cn('flex flex-col', !isMobile && 'hidden lg:flex')}>
            <span className="font-racing text-lg font-bold tracking-wider text-white uppercase leading-none">
              Racing
            </span>
            <span className="text-xs font-semibold text-[#E10600] tracking-widest uppercase">
              Manager
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-1.5',
                !isMobile && 'hidden lg:block',
              )}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setMobileDrawerOpen(false)}
                  title={item.label}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group relative',
                    isActive
                      ? 'bg-[#E10600] text-white shadow-md shadow-red-900/20'
                      : 'text-gray-300 hover:text-white hover:bg-[#1E1E2F]',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                    )}
                  />
                  <span className={cn('truncate', !isMobile && 'hidden lg:inline')}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div
                      className={cn(
                        'ml-auto w-1.5 h-1.5 rounded-full bg-white',
                        !isMobile && 'hidden lg:block',
                      )}
                    />
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </div>

      {/* User Area Footer */}
      <div className="p-3 border-t border-[#2A2A3D] bg-[#0E0E17]">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="w-8 h-8 rounded-md border border-[#2A2A3D]">
                  <AvatarImage src={user.avatar ? user.avatar : undefined} />
                  <AvatarFallback className="bg-[#1E1E2F] text-white text-xs font-bold">
                    {user.name?.slice(0, 2).toUpperCase() || 'RM'}
                  </AvatarFallback>
                </Avatar>
                <div className={cn('flex flex-col min-w-0', !isMobile && 'hidden lg:flex')}>
                  <span className="text-xs font-semibold text-white truncate">{user.name}</span>
                  <span className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1.5 py-0 h-4 border-none capitalize font-medium',
                        user.role === 'colaborador'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-emerald-500/20 text-emerald-400',
                      )}
                    >
                      {user.role === 'colaborador' ? 'Colaborador' : 'Cliente'}
                    </Badge>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <NotificationsDropdown />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white hover:bg-[#1E1E2F] h-8 w-8"
                  title="Sair do sistema"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate('/login')}
              size="sm"
              className="w-full bg-[#E10600] hover:bg-[#C00500] text-white text-xs"
            >
              Entrar
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F5F5F7]">
      {/* Desktop & Tablet Sidebar (220px desktop, icons-only on tablet 640-1024px, hidden <640px) */}
      <aside className="hidden sm:flex flex-col fixed inset-y-0 left-0 z-30 bg-[#14141F] text-white transition-all duration-200 w-16 lg:w-[220px] border-r border-[#1E1E2F] shadow-xl">
        <NavContent />
      </aside>

      {/* Mobile Top Bar (<640px) */}
      <header className="sm:hidden fixed top-0 inset-x-0 z-30 h-14 bg-[#14141F] border-b border-[#2A2A3D] flex items-center justify-between px-4 text-white shadow-md">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1E1E2F] rounded-lg transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#E10600] flex items-center justify-center font-racing text-white font-bold text-sm">
            RM
          </div>
          <span className="font-racing text-base font-bold tracking-wider uppercase text-white">
            Racing <span className="text-[#E10600]">Manager</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {user && <NotificationsDropdown />}
          {user ? (
            <Avatar className="w-7 h-7 rounded ml-1">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-[#1E1E2F] text-xs font-bold text-white">
                {user.name?.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-xs text-gray-300 hover:text-white p-1"
            >
              <UserIcon className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Drawer Backdrop & Drawer (<640px) */}
      {mobileDrawerOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-64 max-w-[80%] bg-[#14141F] text-white flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-250 ease-out z-50">
            <div className="absolute top-4 right-3">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavContent isMobile />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen sm:ml-16 lg:ml-[220px] transition-all duration-200">
        <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 pt-18 sm:pt-6">
          <Outlet />
        </main>

        {/* Global Footer */}
        <footer className="w-full border-t border-gray-200 bg-white/80 backdrop-blur px-6 py-4 mt-auto">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="font-racing font-bold text-gray-800 tracking-wider">
                RACING MANAGER
              </span>
              <span>© {new Date().getFullYear()} Todos os direitos reservados.</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] font-mono">
                v1.2.0-prod
              </span>
              <NavLink
                to="/suporte"
                className="hover:text-[#E10600] transition-colors flex items-center gap-1 font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Central de Suporte
              </NavLink>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
