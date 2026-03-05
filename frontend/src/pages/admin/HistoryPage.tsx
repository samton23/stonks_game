import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getHistory, getGameState } from '../../api'
import type { GameLogEntry, Player } from '../../types'

// ─── Action type config ───────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  income:            { emoji: '💰', label: 'Доход',        color: 'text-accent-green' },
  money_adj:         { emoji: '💵', label: 'Корректировка', color: 'text-accent-blue' },
  enterprise_buy:    { emoji: '🏭', label: 'Предприятие',  color: 'text-accent-purple' },
  enterprise_remove: { emoji: '🗑️', label: 'Убрано',       color: 'text-gray-400' },
  factory_buy:       { emoji: '🏗️', label: 'Завод+',       color: 'text-orange-400' },
  factory_remove:    { emoji: '🔧', label: 'Завод−',       color: 'text-gray-400' },
  stock_transfer:    { emoji: '📈', label: 'Акции',        color: 'text-accent-gold' },
  stock_settle:      { emoji: '🏦', label: 'Расчёт',       color: 'text-accent-gold' },
  cycle:             { emoji: '🔄', label: 'Цикл',         color: 'text-accent-blue' },
  event_start:       { emoji: '⚡', label: 'Событие',      color: 'text-yellow-400' },
  event_end:         { emoji: '✅', label: 'Событие↓',     color: 'text-gray-400' },
  game_start:        { emoji: '🎮', label: 'Старт',        color: 'text-accent-green' },
  game_end:          { emoji: '🏁', label: 'Конец',        color: 'text-accent-gold' },
}

function formatTs(ts: string): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [logs, setLogs] = useState<GameLogEntry[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [activeTab, setActiveTab] = useState<number | null>(null) // null = all
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true)
      const includeSystem = activeTab !== null
      const [hist, gs] = await Promise.all([
        getHistory(activeTab ?? undefined, includeSystem),
        getGameState(),
      ])
      setLogs(hist)
      setPlayers(gs.players)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  // Initial load + tab switch
  useEffect(() => { load() }, [load])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const i = setInterval(() => load(true), 5000)
    return () => clearInterval(i)
  }, [load])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">История</h2>
            <p className="text-gray-500 text-sm">Все игровые действия в хронологическом порядке</p>
          </div>
        </div>
        <button
          onClick={() => load()}
          className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-gray-400 rounded-lg text-sm flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Обновить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === null
              ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
              : 'bg-dark-700 hover:bg-dark-600 text-gray-400'
          }`}
        >
          Все
        </button>
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === p.id
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                : 'bg-dark-700 hover:bg-dark-600 text-gray-400'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 text-gray-600"
        >
          <History size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">История пуста</p>
          <p className="text-sm mt-1">Действия появятся после начала игры</p>
        </motion.div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {logs.map((entry, i) => {
              const cfg = ACTION_CONFIG[entry.action_type] ?? {
                emoji: '❓', label: entry.action_type, color: 'text-gray-400',
              }
              const amountPositive = entry.amount !== null && entry.amount > 0
              const amountNegative = entry.amount !== null && entry.amount < 0

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="glass rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  {/* Emoji */}
                  <span className="text-lg shrink-0 w-7 text-center">{cfg.emoji}</span>

                  {/* Type badge */}
                  <span className={`text-xs font-semibold uppercase tracking-wider shrink-0 w-24 ${cfg.color}`}>
                    {cfg.label}
                  </span>

                  {/* Description */}
                  <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">
                    {entry.description}
                  </span>

                  {/* Amount */}
                  {entry.amount !== null && (
                    <span className={`text-sm font-mono font-bold shrink-0 ${
                      amountPositive ? 'text-accent-green' :
                      amountNegative ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {amountPositive ? '+' : ''}{entry.amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}$
                    </span>
                  )}

                  {/* Cycle */}
                  {entry.cycle !== null && (
                    <span className="text-xs text-gray-600 shrink-0 w-12 text-right">
                      ц.{entry.cycle}
                    </span>
                  )}

                  {/* Timestamp */}
                  <span className="text-xs text-gray-600 font-mono shrink-0 w-28 text-right">
                    {formatTs(entry.timestamp)}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
