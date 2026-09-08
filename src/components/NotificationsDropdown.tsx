import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Scale,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationsService, pilotsService } from '@/services/api'
import type { AppNotification, Pilot } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import useRealtime from '@/hooks/use-realtime'

export default function NotificationsDropdown() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [pilot, setPilot] = useState<Pilot | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadNotifications = async () => {
    if (!user) return
    try {
      let pId = pilot?.id
      if (!pId) {
        const pList = await pilotsService.list()
        const userPilot = pList.find((p) => p.user_id === user.id)
        if (userPilot) {
          setPilot(userPilot)
          pId = userPilot.id
        }
      }
      const list = await notificationsService.listForCurrentUser(user.id, pId)
      setNotifications(list)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [user])

  useRealtime<AppNotification>('notifications', () => {
    loadNotifications()
  })

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleNotificationClick = async (notif: AppNotification) => {
    try {
      if (!notif.read) {
        await notificationsService.markAsRead(notif.id)
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)))
      }
    } catch (err) {
      console.error(err)
    }
    setIsOpen(false)
    if (notif.target_link) {
      navigate(notif.target_link)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead(user?.id, pilot?.id)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-300 hover:text-white hover:bg-white/10 h-8 w-8 rounded-lg"
        title="Notificações"
        aria-label="Abrir notificações"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#E10600] text-[9px] font-bold text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#161622] border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Header */}
          <div className="p-3.5 bg-[#14141F] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-racing text-xs font-bold text-white uppercase tracking-wider">
                Notificações
              </span>
              {unreadCount > 0 && (
                <Badge className="bg-[#E10600] text-white text-[10px] h-4 px-1.5 font-bold">
                  {unreadCount} nova(s)
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#E10600]" />
                Marcar lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-1">
                <Bell className="w-6 h-6 text-gray-600 mx-auto mb-2 opacity-50" />
                <p className="font-medium text-white">Nenhuma notificação</p>
                <p className="text-[11px] text-gray-500">
                  Você será alertado quando novos protestos ou decisões forem emitidos.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isProtest = notif.type === 'protesto'
                const isRuling = notif.type === 'decisao'

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 hover:bg-white/5 cursor-pointer transition-colors space-y-1.5 relative ${
                      !notif.read ? 'bg-white/[0.03]' : ''
                    }`}
                  >
                    {!notif.read && (
                      <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-[#E10600] shadow-[0_0_8px_rgba(225,6,0,0.8)]" />
                    )}

                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isProtest
                            ? 'bg-red-500/15 text-[#E10600]'
                            : isRuling
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-blue-500/15 text-blue-400'
                        }`}
                      >
                        {isProtest ? (
                          <Scale className="w-3.5 h-3.5" />
                        ) : isRuling ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pr-3">
                        <span
                          className={`text-xs font-semibold block leading-tight truncate ${
                            !notif.read ? 'text-white' : 'text-gray-300'
                          }`}
                        >
                          {notif.title}
                        </span>
                        <p className="text-[11px] text-gray-400 leading-snug line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-gray-500 font-mono mt-1 block">
                          {new Date(notif.created).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
