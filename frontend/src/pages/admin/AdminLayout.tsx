import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Factory, ScrollText, Settings, DollarSign, Gamepad2, LayoutDashboard, Zap, BookOpen, TrendingUp
} from 'lucide-react'

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
