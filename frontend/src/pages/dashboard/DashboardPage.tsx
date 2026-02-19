import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { TrendingUp, Crown, Factory, Building2 } from 'lucide-react'
import { getDashboard } from '../../api'
import type { DashboardPlayer } from '../../types'

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = value
    if (prev === value) return

    const diff = value - prev
    const steps = 30
    const stepValue = diff / steps
    let step = 0

    const interval = setInterval(() => {
      step++
      if (step >= steps) {
        setDisplay(value)
        clearInterval(interval)
      } else {
        setDisplay(Math.round(prev + stepValue * step))
      }
    }, 16)

    return () => clearInterval(interval)
  }, [value])

  return <>{prefix}{display.toLocaleString()}</>
}

const medals = ['🥇', '🥈', '🥉']
const rankColors = [
  'from-yellow-500/20 to-amber-600/20 border-yellow-500/30',
  'from-gray-300/20 to-gray-400/20 border-gray-400/30',
  'from-orange-600/20 to-amber-700/20 border-orange-700/30',
]

export default function DashboardPage() {
  const [players, setPlayers] = useState<DashboardPlayer[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDashboard()
        setPlayers(data)
      } catch (e) {
        console.error(e)
      }
    }
    load()
    const i = setInterval(() => {
      load()
      setTick((t) => t + 1)
    }, 3000)
    return () => clearInterval(i)
  }, [])

  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <motion.div
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -80, 60, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 60, 0],
            y: [0, 100, -50, 0],
            scale: [1, 0.9, 1.2, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 80, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 left-1/2 w-64 h-64 bg-accent-purple/5 rounded-full blur-3xl"
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl mb-4"
          >
            📈
          </motion.div>
          <h1 className="text-5xl font-black mb-3">
            <span className="text-gradient from-accent-green via-emerald-400 to-accent-blue">
              STONKS GAME
            </span>
          </h1>
          <p className="text-gray-500 text-lg">Рейтинг игроков</p>

          {/* Live indicator */}
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-accent-green/10 border border-accent-green/20"
          >
            <div className="w-2 h-2 rounded-full bg-accent-green" />
            <span className="text-xs text-accent-green font-medium">LIVE</span>
          </motion.div>
        </motion.div>

        {/* Player Rankings */}
        <LayoutGroup>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {players.map((player, index) => (
                <motion.div
                  key={player.id}
                  layout
                  layoutId={`player-${player.id}`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    layout: { type: 'spring', damping: 25, stiffness: 200 },
                    opacity: { duration: 0.3 },
                    scale: { duration: 0.3 },
                  }}
                  className={`relative rounded-2xl p-5 border backdrop-blur-xl ${
                    index < 3
                      ? `bg-gradient-to-r ${rankColors[index]}`
                      : 'bg-white/5 border-white/10'
                  }`}
                  style={{
                    boxShadow: index === 0
                      ? '0 0 40px rgba(245, 158, 11, 0.1)'
                      : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0">
                        {index < 3 ? (
                          <motion.span
                            animate={index === 0 ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            className="text-3xl"
                          >
                            {medals[index]}
                          </motion.span>
                        ) : (
                          <span className="text-2xl font-bold text-gray-600 font-mono">
                            #{index + 1}
                          </span>
                        )}
                      </div>

                      {/* Player Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xl ${
                            index === 0 ? 'text-yellow-300' : ''
                          }`}>
                            {player.name}
                          </span>
                          {index === 0 && players.length > 1 && (
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 3, repeat: Infinity }}
                            >
                              <Crown size={20} className="text-yellow-400" />
                            </motion.div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building2 size={13} />
                            {player.enterprises_count} предприятий
                          </span>
                          <span className="flex items-center gap-1">
                            <Factory size={13} />
                            {player.factories_count} заводов
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      {/* Score */}
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-0.5">Счёт</div>
                        <div className={`font-mono font-bold text-lg flex items-center gap-1.5 ${
                          index === 0 ? 'text-yellow-300' : 'text-accent-green'
                        }`}>
                          <TrendingUp size={16} />
                          $<AnimatedNumber value={Math.round(player.score)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top player glow effect */}
                  {index === 0 && (
                    <motion.div
                      animate={{ opacity: [0.1, 0.25, 0.1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-transparent to-amber-500/10 pointer-events-none"
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>

        {players.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 text-gray-600"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              🎮
            </motion.div>
            <p className="text-xl font-medium">Ожидание игроков...</p>
            <p className="text-sm mt-2 text-gray-700">Игра ещё не началась</p>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-12 text-gray-700 text-xs"
        >
          STONKS GAME • Live Dashboard
        </motion.div>
      </div>
    </div>
  )
}
