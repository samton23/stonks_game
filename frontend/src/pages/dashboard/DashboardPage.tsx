import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Crown, Factory, Building2, Trophy, Zap, QrCode, X, Timer, RefreshCw } from 'lucide-react'
import { getDashboard, getRoomCode, getTimers } from '../../api'
import type { DashboardData, DashboardPlayer, ActiveEventInfo } from '../../types'

const medals = ['🥇', '🥈', '🥉']
const rankColors = [
  'from-yellow-500/20 to-amber-600/20 border-yellow-500/30',
  'from-gray-300/20 to-gray-400/20 border-gray-400/30',
  'from-orange-600/20 to-amber-700/20 border-orange-700/30',
]

function modifierLabel(mod: number) {
  if (mod === 1) return null
  const pct = Math.round((mod - 1) * 100)
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

function EventsPanel({ events }: { events: ActiveEventInfo[] }) {
  if (events.length === 0) return null
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 space-y-2">
      <div className="flex items-center gap-2 text-xs text-yellow-400 uppercase tracking-wider font-semibold mb-3">
        <Zap size={13} />
        Активные события
      </div>
      {events.map(ev => {
        const positive = ev.profit_modifier >= 1
        const modLabel = modifierLabel(ev.profit_modifier)
        const affectedText = ev.affected_all
          ? 'все предприятия'
          : ev.affected_enterprises.length > 0
            ? ev.affected_enterprises.map(e => `${e.emoji} ${e.name}`).join(', ')
            : null

        return (
          <div
            key={ev.id}
            className="rounded-xl px-4 py-3 border border-yellow-500/20 bg-yellow-500/5 backdrop-blur flex items-center gap-3 flex-wrap"
          >
            <Zap size={14} className="text-yellow-400 shrink-0" />
            <span className="font-semibold text-yellow-300 text-sm">{ev.name}</span>
            {modLabel && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${positive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {modLabel}
              </span>
            )}
            {affectedText && (
              <span className="text-xs text-gray-400">
                → <span className="text-yellow-200">{affectedText}</span>
              </span>
            )}
            <span className="text-xs text-yellow-700 ml-auto shrink-0">{ev.remaining_cycles} ц.</span>
          </div>
        )
      })}
    </motion.div>
  )
}

function PlayerCard({ player, index, gameFinished }: {
  player: DashboardPlayer
  index: number
  gameFinished: boolean
}) {
  return (
    <motion.div
      layout
      layoutId={`player-${player.id}`}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ layout: { type: 'spring', damping: 25, stiffness: 200 }, opacity: { duration: 0.3 } }}
      className={`relative rounded-2xl p-5 border backdrop-blur-xl ${index < 3 ? `bg-gradient-to-r ${rankColors[index]}` : 'bg-white/5 border-white/10'}`}
      style={{ boxShadow: index === 0 ? '0 0 40px rgba(245,158,11,0.1)' : undefined }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0">
            {index < 3 ? (
              <motion.span
                animate={index === 0 ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl"
              >
                {medals[index]}
              </motion.span>
            ) : (
              <span className="text-2xl font-bold text-gray-600 font-mono">#{index + 1}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-xl ${index === 0 ? 'text-yellow-300' : ''}`}>{player.name}</span>
              {index === 0 && (
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Crown size={20} className="text-yellow-400" />
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Building2 size={13} />{player.enterprises_count} предприятий</span>
              <span className="flex items-center gap-1"><Factory size={13} />{player.factories_count} заводов</span>
            </div>
          </div>
        </div>

        {/* After game finish — show final budget */}
        {gameFinished && (
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5">Итоговый бюджет</div>
            <div className={`font-mono font-bold text-xl ${index === 0 ? 'text-yellow-300' : 'text-accent-gold'}`}>
              ${Math.round(player.money).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {index === 0 && (
        <motion.div
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-transparent to-amber-500/10 pointer-events-none"
        />
      )}
    </motion.div>
  )
}

interface TimerState {
  timer_running: boolean
  game_timer_end: number
  cycle_timer_end: number
  game_timer_remaining: number
  cycle_timer_remaining: number
  game_timer_duration: number
  cycle_timer_duration: number
}

function formatTime(secs: number) {
  if (secs <= 0) return '00:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function useTimerCountdown(timers: TimerState | null) {
  const [gameLeft, setGameLeft] = useState(0)
  const [cycleLeft, setCycleLeft] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!timers) return
    const tick = () => {
      const now = Date.now()
      if (timers.timer_running) {
        setGameLeft(Math.max(0, (timers.game_timer_end - now) / 1000))
        setCycleLeft(Math.max(0, (timers.cycle_timer_end - now) / 1000))
      } else {
        setGameLeft(timers.game_timer_remaining)
        setCycleLeft(timers.cycle_timer_remaining)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [timers])

  return { gameLeft, cycleLeft }
}

function CompactTimer({ label, icon, value, duration, running, color }: {
  label: string
  icon: React.ReactNode
  value: number
  duration: number
  running: boolean
  color: string
}) {
  const ratio = duration > 0 ? Math.max(0, Math.min(1, value / duration)) : 0
  const barColor = color.includes('red') ? 'bg-red-500' : color.includes('green') ? 'bg-accent-green' : 'bg-accent-blue'
  return (
    <div className="flex flex-col items-center gap-2 w-[130px] px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <div className={`font-mono text-2xl font-bold tabular-nums leading-none ${color}`}>
        {formatTime(value)}
      </div>
      <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-none ${barColor}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {!running && (
        <div className="text-[10px] text-yellow-500/60 tracking-wide">⏸ пауза</div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [timers, setTimers] = useState<TimerState | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const { gameLeft, cycleLeft } = useTimerCountdown(timers)

  useEffect(() => {
    const load = async () => {
      try { setData(await getDashboard()) } catch {}
    }
    const loadTimers = async () => {
      try { setTimers(await getTimers()) } catch {}
    }
    load()
    loadTimers()
    const i = setInterval(load, 3000)
    const j = setInterval(loadTimers, 1000)
    return () => { clearInterval(i); clearInterval(j) }
  }, [])

  const openQR = async () => {
    try {
      const res = await getRoomCode()
      setRoomCode(res.room_code)
      setShowQR(true)
    } catch {}
  }

  const joinUrl = roomCode
    ? `${window.location.origin}/join?code=${roomCode}`
    : ''

  const players = data?.players ?? []
  const gameFinished = data?.game_finished ?? false
  const activeEvents = data?.active_events ?? []

  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 100, -50, 0], y: [0, -80, 60, 0], scale: [1, 1.2, 0.9, 1] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} className="absolute -top-32 -left-32 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, -80, 60, 0], y: [0, 100, -50, 0], scale: [1, 0.9, 1.2, 1] }} transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }} className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-10">

          {/* Title block — centered */}
          <div className="text-center mb-8">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-6xl mb-5">
              {gameFinished ? '🏆' : '📈'}
            </motion.div>
            <h1 className="text-5xl font-black mb-3">
              <span className="text-gradient from-accent-green via-emerald-400 to-accent-blue">STONKS GAME</span>
            </h1>
            <p className="text-gray-500 text-lg">
              {gameFinished ? 'Итоговый рейтинг' : 'Рейтинг игроков'}
            </p>
            {data && (
              <div className="text-sm text-gray-500 mt-1">
                Цикл {data.current_cycle} / {data.total_cycles}
              </div>
            )}
          </div>

          {/* Status row — full width, aligned with content below */}
          <div className="flex items-center justify-between gap-4">
            {/* Game timer — left */}
            {!gameFinished && timers ? (
              <CompactTimer
                label="Игра"
                icon={<Timer size={11} />}
                value={gameLeft}
                duration={timers.game_timer_duration}
                running={timers.timer_running}
                color={gameLeft < 60 && timers.timer_running ? 'text-red-400' : 'text-white'}
              />
            ) : <div className="w-[130px]" />}

            {/* Center: LIVE badge + QR button */}
            <div className="flex flex-col items-center gap-3 flex-1">
              {gameFinished ? (
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent-gold/10 border border-accent-gold/20">
                  <Trophy size={14} className="text-accent-gold" />
                  <span className="text-xs text-accent-gold font-medium">ИГРА ЗАВЕРШЕНА</span>
                </motion.div>
              ) : (
                <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent-green/10 border border-accent-green/20">
                  <div className="w-2 h-2 rounded-full bg-accent-green" />
                  <span className="text-xs text-accent-green font-medium">LIVE</span>
                </motion.div>
              )}
              <button
                onClick={openQR}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs text-gray-400 hover:text-white"
              >
                <QrCode size={13} />
                Код комнаты
              </button>
            </div>

            {/* Cycle timer — right */}
            {!gameFinished && timers ? (
              <CompactTimer
                label="Цикл"
                icon={<RefreshCw size={11} />}
                value={cycleLeft}
                duration={timers.cycle_timer_duration}
                running={timers.timer_running}
                color={cycleLeft < 30 && timers.timer_running ? 'text-red-400' : 'text-accent-green'}
              />
            ) : <div className="w-[130px]" />}
          </div>
        </motion.div>

        {/* QR overlay */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
              onClick={() => setShowQR(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-dark-800 rounded-3xl p-8 max-w-sm w-full text-center border border-white/10"
                onClick={e => e.stopPropagation()}
              >
                <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-xl font-bold mb-2">Присоединиться</h3>
                <p className="text-gray-500 text-sm mb-4">Отсканируйте QR или введите код</p>
                <div className="bg-white rounded-2xl p-4 inline-block mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`}
                    alt="QR"
                    width={200}
                    height={200}
                  />
                </div>
                <div className="font-mono text-3xl font-bold tracking-[0.3em] text-accent-blue mb-2">
                  {roomCode}
                </div>
                <p className="text-xs text-gray-600 break-all">{joinUrl}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Events — static, no interaction */}
        {!gameFinished && <EventsPanel events={activeEvents} />}

        {/* Rankings */}
        <LayoutGroup>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {players.map((player, index) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  index={index}
                  gameFinished={gameFinished}
                />
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>

        {players.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 text-gray-600">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl mb-4">🎮</motion.div>
            <p className="text-xl font-medium">Ожидание игроков...</p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center mt-12 text-gray-700 text-xs">
          STONKS GAME • Live Dashboard
        </motion.div>
      </div>
    </div>
  )
}
