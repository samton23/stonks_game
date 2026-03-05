import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Factory, ScrollText, Settings, DollarSign, Gamepad2, LayoutDashboard, Zap, BookOpen, TrendingUp, Clock
} from 'lucide-react'
import { getTimers } from '../../api'
import type { TimerState } from '../../types'

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function TimerBar() {
  const [timerData, setTimerData] = useState<TimerState | null>(null)
  const [gameR, setGameR] = useState(0)
  const [cycleR, setCycleR] = useState(0)

  const loadTimers = useCallback(async () => {
    try {
      const t = await getTimers()
      setTimerData(t)
    } catch {}
  }, [])

  useEffect(() => { loadTimers() }, [loadTimers])
  useEffect(() => {
    const i = setInterval(loadTimers, 5000)
    return () => clearInterval(i)
  }, [loadTimers])

  useEffect(() => {
    const tick = () => {
      if (!timerData) return
      if (timerData.timer_running) {
        const now = Date.now()
        setGameR(timerData.game_timer_end > 0 ? Math.max(0, (timerData.game_timer_end - now) / 1000) : 0)
        setCycleR(timerData.cycle_timer_end > 0 ? Math.max(0, (timerData.cycle_timer_end - now) / 1000) : 0)
      } else {
        setGameR(timerData.game_timer_remaining)
        setCycleR(timerData.cycle_timer_remaining)
      }
    }
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [timerData])

  if (!timerData) return null

  const running = timerData.timer_running
  const cycleExpired = cycleR <= 0 && running

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-lg">
        <Clock size={13} className="text-gray-500 shrink-0" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Игра</span>
          <span className={`font-mono font-bold text-sm ${gameR <= 0 && running ? 'text-red-400' : 'text-accent-blue'}`}>
            {formatTime(gameR)}
          </span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Цикл</span>
          <span className={`font-mono font-bold text-sm ${cycleExpired ? 'text-red-400' : 'text-accent-gold'}`}>
            {formatTime(cycleR)}
          </span>
        </div>
        <div className={`w-2 h-2 rounded-full shrink-0 ${running ? 'bg-accent-green animate-pulse' : 'bg-gray-600'}`} />
      </div>
    </div>
  )
}

const navItems = [
  { to: '/admin/game', icon: Gamepad2, label: 'Ход игры' },
  { to: '/admin/players', icon: Users, label: 'Игроки' },
  { to: '/admin/enterprises', icon: Factory, label: 'Предприятия' },
  { to: '/admin/prices', icon: DollarSign, label: 'Цены' },
  { to: '/admin/stocks', icon: TrendingUp, label: 'Акции' },
  { to: '/admin/events', icon: Zap, label: 'События' },
  { to: '/admin/rules', icon: ScrollText, label: 'Правила' },
  { to: '/admin/host-rules', icon: BookOpen, label: 'Для ведущего' },
  { to: '/admin/settings', icon: Settings, label: 'Настройки' },
]

export default function AdminLayout() {
  const location = useLocation()
  const showTimerBar = location.pathname !== '/admin/game'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-64 bg-dark-800 border-r border-white/5 flex flex-col shrink-0"
      >
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <span className="text-gradient from-accent-green to-accent-blue font-extrabold">
              STONKS
            </span>
            <span className="text-gray-400 font-light">Admin</span>
          </h1>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <a
            href="/dashboard"
            target="_blank"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-accent-gold hover:bg-accent-gold/5 transition-all duration-200"
          >
            <LayoutDashboard size={18} />
            Дашборд
            <span className="text-xs ml-auto opacity-50">↗</span>
          </a>
        </div>
      </motion.aside>

      {/* Timer bar — shown on all pages except Ход игры */}
      {showTimerBar && <TimerBar />}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-dark-900">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8 max-w-6xl mx-auto"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
