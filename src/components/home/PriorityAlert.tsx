import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, X } from 'lucide-react'
import type { HomePriorityAlert } from '@/types/home'
import { Button } from '@/components/ui/button'

interface PriorityAlertProps {
  alert: HomePriorityAlert | null
  onDismiss?: (id: string) => void
}

export const PriorityAlert: React.FC<PriorityAlertProps> = ({ alert, onDismiss }) => {
  if (!alert) return null

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/80 via-[#2A1705] to-amber-950/80 border-y border-amber-600/40 text-amber-100 py-3 px-4 sm:px-6 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        {/* Left info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-400/40">
                {alert.title}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-100/90 font-medium truncate">
              {alert.description}
            </p>
          </div>
        </div>

        {/* Action CTA & dismiss */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
          <Link to={alert.actionUrl} className="w-full sm:w-auto">
            <Button
              size="sm"
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider px-4 h-8 shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>{alert.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          {alert.isDismissible && onDismiss && (
            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1 text-amber-400/70 hover:text-amber-200 hover:bg-amber-500/10 rounded-md transition-colors"
              title="Dispensar aviso"
              aria-label="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
