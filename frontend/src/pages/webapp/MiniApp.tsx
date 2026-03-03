import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Building2, Factory, ScrollText, DollarSign,
  Wallet, RefreshCw, Calculator, Delete, BarChart2
} from 'lucide-react'
import {
  webappAuth, webappAuthDev, getWebappRules, getWebappPrices,
  getWebappNotifications, getWebappNotificationsDev,
  markNotificationsRead, markNotificationsReadDev,
  getWebappStocks, getWebappStocksDev,
  webappAuthBrowser, getWebappNotificationsBrowser,
  markNotificationsReadBrowser, getWebappStocksBrowser,
} from '../../api'
import type { WebAppPlayer, PriceItem, InAppNotification, WebAppStockData } from '../../types'

type Tab = 'profile' | 'prices' | 'rules' | 'calc' | 'stocks'

/* ───────── Animated number ───────── */
function AnimatedMoney({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    const diff = value - from
    const steps = 40
    const step = diff / steps
    let i = 0
    const id = setInterval(() => {
      i++
      if (i >= steps) { setDisplay(value); clearInterval(id) }
      else setDisplay(Math.round(from + step * i))
    }, 12)
    return () => clearInterval(id)
  }, [value])

  return <>{display.toLocaleString()}</>
}

/* ───────── Notification type config ───────── */
const NOTIF_DURATION = 4500 // ms – single source of truth

const NOTIF_STYLES: Record<string, { gradient: string; border: string; glow: string; bar: string }> = {
  money_plus: {
    gradient: 'from-emerald-500/20 via-green-500/10 to-transparent',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    bar: 'bg-emerald-400/40',
  },
  money_minus: {
    gradient: 'from-red-500/20 via-rose-500/10 to-transparent',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
    bar: 'bg-red-400/40',
  },
  cycle: {
    gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    bar: 'bg-blue-400/40',
  },
  enterprise: {
    gradient: 'from-purple-500/20 via-violet-500/10 to-transparent',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    bar: 'bg-purple-400/40',
  },
  factory: {
    gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    bar: 'bg-amber-400/40',
  },
  reset: {
    gradient: 'from-red-500/20 via-orange-500/10 to-transparent',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
    bar: 'bg-red-400/40',
  },
  message: {
    gradient: 'from-gray-400/15 via-gray-500/8 to-transparent',
    border: 'border-gray-500/25',
    glow: 'shadow-gray-500/15',
    bar: 'bg-gray-400/30',
  },
}

const DEFAULT_STYLE = {
  gradient: 'from-gray-500/20 via-gray-400/10 to-transparent',
  border: 'border-gray-500/30',
  glow: 'shadow-gray-500/20',
  bar: 'bg-white/20',
}

/* ───────── Single Notification Toast ───────── */
function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: InAppNotification
  onDismiss: () => void
}) {
  const style = NOTIF_STYLES[notification.type] || DEFAULT_STYLE
  const duration = NOTIF_DURATION / 1000 // seconds for framer-motion

  // Auto-dismiss: use onAnimationComplete on the progress bar
  // so the timing is perfectly in sync
  const handleBarComplete = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -80, scale: 0.8, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 300, scale: 0.8, filter: 'blur(5px)' }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 350,
        mass: 0.8,
      }}
      onClick={onDismiss}
      className={`
        relative cursor-pointer overflow-hidden
        rounded-2xl border ${style.border}
        bg-dark-800/95 backdrop-blur-xl
        shadow-lg ${style.glow}
        p-4 w-full
      `}
    >
      {/* Animated gradient background */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r ${style.gradient} opacity-60`}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 1.5, delay: 0.3, ease: 'easeInOut' }}
      />

      {/* Progress bar — onAnimationComplete triggers auto-dismiss */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[2px] rounded-full ${style.bar}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration, ease: 'linear' }}
        onAnimationComplete={handleBarComplete}
      />

      <div className="relative z-10 flex items-start gap-3">
        {/* Emoji with pulse animation */}
        <motion.div
          className="text-2xl flex-shrink-0 mt-0.5"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
        >
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {notification.emoji}
          </motion.span>
        </motion.div>

        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="font-bold text-white text-sm leading-tight"
          >
            {notification.title}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-xs mt-1 leading-relaxed whitespace-pre-line"
          >
            {notification.message}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

/* ───────── Notification Overlay Container ───────── */
function NotificationOverlay({
  notifications,
  onDismiss,
}: {
  notifications: InAppNotification[]
  onDismiss: (id: number) => void
}) {
  return (
    <div className="fixed top-3 left-3 right-3 z-[100] pointer-events-none">
      <div className="max-w-md mx-auto space-y-2 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <NotificationToast
              key={n.id}
              notification={n}
              onDismiss={() => onDismiss(n.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ───────── Safe expression evaluator ───────── */
function safeEval(expr: string): string {
  try {
    // Only allow digits, operators, parentheses, dots, spaces, %
    const sanitized = expr.replace(/[^0-9+\-*/().% ]/g, '')
    if (!sanitized.trim()) return ''
    // Treat X% as (X/100) — e.g. 1000*15% → 1000*(15/100) = 150
    const withPercent = sanitized.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
    const result = new Function(`"use strict"; return (${withPercent})`)()
    if (typeof result !== 'number' || !isFinite(result)) return 'Ошибка'
    // Format nicely
    return Number.isInteger(result) ? result.toLocaleString() : result.toLocaleString(undefined, { maximumFractionDigits: 2 })
  } catch {
    return ''
  }
}

/* ───────── Calculator Tab Component ───────── */
function CalculatorTab({
  prices, tg, expr, setExpr, result, setResult, lastInserted, setLastInserted,
}: {
  prices: PriceItem[]; tg: any
  expr: string; setExpr: (v: string) => void
  result: string; setResult: (v: string) => void
  lastInserted: string | null; setLastInserted: (v: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Live evaluate
  useEffect(() => {
    setResult(safeEval(expr))
  }, [expr])

  // Insert text at current cursor position (or end)
  const insertAtCursor = (val: string) => {
    const input = inputRef.current
    const start = input?.selectionStart ?? expr.length
    const end = input?.selectionEnd ?? expr.length
    const newExpr = expr.slice(0, start) + val + expr.slice(end)
    setExpr(newExpr)
    setLastInserted(null)
    try { tg?.HapticFeedback.impactOccurred('light') } catch {}
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + val.length, start + val.length)
    })
  }

  const insertPrice = (label: string, value: number) => {
    const valStr = value.toString()
    const input = inputRef.current
    const start = input?.selectionStart ?? expr.length
    const end = input?.selectionEnd ?? expr.length
    const newExpr = expr.slice(0, start) + valStr + expr.slice(end)
    setExpr(newExpr)
    setLastInserted(label)
    setTimeout(() => setLastInserted(null), 800)
    try { tg?.HapticFeedback.impactOccurred('medium') } catch {}
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + valStr.length, start + valStr.length)
    })
  }

  const clear = () => {
    setExpr('')
    setResult('')
    setLastInserted(null)
    try { tg?.HapticFeedback.impactOccurred('medium') } catch {}
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const backspace = () => {
    const input = inputRef.current
    const start = input?.selectionStart ?? expr.length
    const end = input?.selectionEnd ?? expr.length
    let newExpr: string
    let newPos: number
    if (start !== end) {
      newExpr = expr.slice(0, start) + expr.slice(end)
      newPos = start
    } else if (start > 0) {
      newExpr = expr.slice(0, start - 1) + expr.slice(start)
      newPos = start - 1
    } else {
      return
    }
    setExpr(newExpr)
    setLastInserted(null)
    try { tg?.HapticFeedback.impactOccurred('light') } catch {}
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(newPos, newPos)
    })
  }

  const smartParen = () => {
    const input = inputRef.current
    const start = input?.selectionStart ?? expr.length
    const before = expr.slice(0, start)
    const open = (before.match(/\(/g) || []).length
    const close = (before.match(/\)/g) || []).length
    const last = before.trimEnd().slice(-1)
    const insertClose = open > close && /[\d.)%]/.test(last)
    insertAtCursor(insertClose ? ')' : '(')
  }

  const calculate = () => {
    const res = safeEval(expr)
    if (res && res !== 'Ошибка') {
      const cleaned = res.replace(/\s/g, '').replace(/,/g, '')
      setExpr(cleaned)
      setResult('')
      requestAnimationFrame(() => {
        const input = inputRef.current
        input?.focus()
        input?.setSelectionRange(cleaned.length, cleaned.length)
      })
    }
    try { tg?.HapticFeedback.notificationOccurred('success') } catch {}
  }

  const btnClass = 'flex items-center justify-center rounded-xl text-lg font-semibold transition-all active:scale-95'

  return (
    <motion.div
      key="calc"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      // fixed overlay — fills screen from top to just above the tab bar
      className="fixed inset-x-0 top-0 z-40 bg-dark-900 flex flex-col p-4 gap-2"
      style={{ bottom: '76px' }}
    >
      {/* Title */}
      <div className="shrink-0">
        <h1 className="text-xl font-extrabold">Калькулятор 🧮</h1>
        <p className="text-gray-500 text-xs">Подставляй цены предприятий и заводов</p>
      </div>

      {/* Quick-insert chips — single horizontal scroll row, no wrapping */}
      {prices.length > 0 && (
        <div className="shrink-0">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Быстрая подстановка</div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {prices.map((p) => (
              <div key={p.id} className="contents">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => insertPrice(`${p.emoji} ${p.name}`, p.price)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    lastInserted === `${p.emoji} ${p.name}`
                      ? 'bg-accent-blue/20 border-accent-blue/40 text-accent-blue border'
                      : 'glass border border-transparent hover:border-white/10 text-gray-300'
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span className="max-w-[60px] truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-500 font-mono">${p.price.toLocaleString()}</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => insertPrice(`🏭 ${p.name}`, p.factory_price)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    lastInserted === `🏭 ${p.name}`
                      ? 'bg-accent-gold/20 border-accent-gold/40 text-accent-gold border'
                      : 'glass border border-transparent hover:border-white/10 text-gray-400'
                  }`}
                >
                  <Factory size={11} />
                  <span className="max-w-[60px] truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-500 font-mono">${p.factory_price.toLocaleString()}</span>
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display — fixed total height, result uses opacity so layout never shifts */}
      <div
        className="glass rounded-2xl px-4 shrink-0 overflow-hidden cursor-text"
        style={{ height: '80px' }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Expression row */}
        <div className="h-9 flex items-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="none"
            value={expr}
            onChange={e => setExpr(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent border-0 text-right text-gray-400 text-sm font-mono outline-none ring-0 focus:ring-0 focus:border-0 focus:outline-none caret-accent-blue placeholder-gray-600 select-text"
          />
        </div>
        {/* Divider */}
        <div className="h-px bg-white/5" />
        {/* Result row — always same height, opacity-only transition */}
        <div className="h-10 flex items-center justify-end">
          <span
            className={`font-mono font-black text-xl leading-none transition-opacity duration-100 ${
              result ? 'opacity-100' : 'opacity-0'
            } ${result === 'Ошибка' ? 'text-red-400' : 'text-white'}`}
          >
            {result && result !== 'Ошибка' ? `= ${result}` : result || '='}
          </span>
        </div>
      </div>

      {/* Keypad — flex-1, 5 equal rows that fill remaining space */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <div className="flex-1 flex gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={clear}
            className={`${btnClass} flex-1 bg-red-500/15 text-red-400`}>C</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={smartParen}
            className={`${btnClass} flex-1 bg-dark-700 text-gray-300`}>( )</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('%')}
            className={`${btnClass} flex-1 bg-accent-gold/15 text-accent-gold`}>%</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('/')}
            className={`${btnClass} flex-1 bg-accent-blue/15 text-accent-blue`}>÷</motion.button>
        </div>
        <div className="flex-1 flex gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('7')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>7</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('8')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>8</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('9')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>9</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('*')}
            className={`${btnClass} flex-1 bg-accent-blue/15 text-accent-blue`}>×</motion.button>
        </div>
        <div className="flex-1 flex gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('4')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>4</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('5')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>5</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('6')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>6</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('-')}
            className={`${btnClass} flex-1 bg-accent-blue/15 text-accent-blue`}>−</motion.button>
        </div>
        <div className="flex-1 flex gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('1')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>1</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('2')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>2</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('3')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>3</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('+')}
            className={`${btnClass} flex-1 bg-accent-blue/15 text-accent-blue`}>+</motion.button>
        </div>
        <div className="flex-1 flex gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('0')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>0</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => insertAtCursor('.')}
            className={`${btnClass} flex-1 bg-dark-700/60 text-white`}>.</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={backspace}
            className={`${btnClass} flex-1 bg-dark-700/60 text-gray-400`}>
            <Delete size={18} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={calculate}
            className={`${btnClass} flex-1 bg-accent-green/20 text-accent-green font-bold`}>=</motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* ───────── Main Mini App ───────── */
export default function MiniApp() {
  const [player, setPlayer] = useState<WebAppPlayer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('profile')
  const [rules, setRules] = useState('')
  const [prices, setPrices] = useState<PriceItem[]>([])
  const [stockData, setStockData] = useState<WebAppStockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeNotifs, setActiveNotifs] = useState<InAppNotification[]>([])

  // Persistent calculator state (survives tab switches)
  const [calcExpr, setCalcExpr] = useState('')
  const [calcResult, setCalcResult] = useState('')
  const [calcLastInserted, setCalcLastInserted] = useState<string | null>(null)

  const tg = window.Telegram?.WebApp

  // Browser token from localStorage
  const getBrowserToken = useCallback((): string | null => {
    try {
      const raw = localStorage.getItem('stonks_session')
      if (!raw) return null
      const session = JSON.parse(raw)
      if (session.expires && Date.now() > session.expires) {
        localStorage.removeItem('stonks_session')
        return null
      }
      return session.token || null
    } catch { return null }
  }, [])

  // Helper: get auth params
  const getAuthBody = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    const initData = tg?.initData || ''
    if (initData) return { initData }

    const tgid = params.get('tgid')
    if (tgid) return { telegram_id: parseInt(tgid) }

    const bt = getBrowserToken()
    if (bt) return { browser_token: bt }

    return null
  }, [tg, getBrowserToken])

  // Auth & load profile
  const loadProfile = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      let data
      const params = new URLSearchParams(window.location.search)
      const initData = tg?.initData || ''
      
      if (initData) {
        data = await webappAuth(initData)
      } else {
        const tgid = params.get('tgid')
        if (tgid) {
          data = await webappAuthDev(parseInt(tgid))
        } else {
          const bt = getBrowserToken()
          if (bt) {
            data = await webappAuthBrowser(bt)
          } else {
            setError('dev_no_id')
            setLoading(false)
            setRefreshing(false)
            return
          }
        }
      }
      setPlayer(data)
      setError(null)
    } catch (e: any) {
      if (e.message === 'not_registered') {
        setError('not_registered')
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tg, getBrowserToken])

  // Poll notifications
  const pollNotifications = useCallback(async () => {
    try {
      const authBody = getAuthBody()
      if (!authBody) return

      let notifs: InAppNotification[]
      if ('initData' in authBody) {
        notifs = await getWebappNotifications(authBody.initData)
      } else if ('telegram_id' in authBody) {
        notifs = await getWebappNotificationsDev(authBody.telegram_id)
      } else if ('browser_token' in authBody) {
        notifs = await getWebappNotificationsBrowser(authBody.browser_token)
      } else {
        return
      }

      if (notifs.length > 0) {
        // Add to active display list (avoid duplicates)
        setActiveNotifs((prev) => {
          const existingIds = new Set(prev.map((n) => n.id))
          const newOnes = notifs.filter((n) => !existingIds.has(n.id))
          return [...prev, ...newOnes]
        })

        // Mark as read on server
        const ids = notifs.map((n) => n.id)
        if ('initData' in authBody) {
          markNotificationsRead(authBody.initData, ids).catch(() => {})
        } else if ('telegram_id' in authBody) {
          markNotificationsReadDev(authBody.telegram_id, ids).catch(() => {})
        } else if ('browser_token' in authBody) {
          markNotificationsReadBrowser(authBody.browser_token, ids).catch(() => {})
        }

        // Haptic feedback
        try { tg?.HapticFeedback.notificationOccurred('success') } catch {}
      }
    } catch {
      // Silently ignore
    }
  }, [getAuthBody, tg])

  // Dismiss a notification from the visible queue
  const dismissNotif = useCallback((id: number) => {
    setActiveNotifs((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // Initial setup
  useEffect(() => {
    if (tg) {
      tg.ready()
      tg.expand()
      tg.setHeaderColor('#0a0e1a')
      tg.setBackgroundColor('#0a0e1a')
    }
    loadProfile()
  }, [tg, loadProfile])

  // Auto-refresh profile + poll notifications
  useEffect(() => {
    const profileInterval = setInterval(() => loadProfile(), 3000)
    const notifInterval = setInterval(() => pollNotifications(), 2500)
    // First poll immediately
    pollNotifications()
    return () => {
      clearInterval(profileInterval)
      clearInterval(notifInterval)
    }
  }, [loadProfile, pollNotifications])

  // Load rules/prices on tab change
  useEffect(() => {
    if (tab === 'rules') {
      getWebappRules().then((d) => setRules(d.rules)).catch(() => {})
    }
    if (tab === 'prices' || tab === 'calc') {
      getWebappPrices().then((d) => setPrices(d)).catch(() => {})
    }
    if (tab === 'stocks') {
      const authBody = getAuthBody()
      if (authBody) {
        if ('initData' in authBody) {
          getWebappStocks(authBody.initData).then(setStockData).catch(() => {})
        } else if ('telegram_id' in authBody) {
          getWebappStocksDev(authBody.telegram_id).then(setStockData).catch(() => {})
        } else if ('browser_token' in authBody) {
          getWebappStocksBrowser(authBody.browser_token).then(setStockData).catch(() => {})
        }
      }
    }
    try { tg?.HapticFeedback.selectionChanged() } catch {}
  }, [tab, tg])

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-2 border-accent-blue border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500 text-sm">Загрузка...</p>
        </motion.div>
      </div>
    )
  }

  // ─── Error / Not registered ───
  if (error) {
    const tgId = tg?.initDataUnsafe?.user?.id
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-6"
          >
            {error === 'dev_no_id' ? '🛠' : error === 'not_registered' ? '🔒' : '⚠️'}
          </motion.div>
          <h2 className="text-xl font-bold mb-3">
            {error === 'dev_no_id'
              ? 'Dev Mode'
              : error === 'not_registered'
                ? 'Доступ ограничен'
                : 'Ошибка'}
          </h2>
          <p className="text-gray-500 mb-4 leading-relaxed">
            {error === 'dev_no_id'
              ? 'Telegram SDK не найден. Добавьте ?tgid=TELEGRAM_ID в URL для тестирования.'
              : error === 'not_registered'
                ? 'Ваш Telegram ID не зарегистрирован. Обратитесь к организатору игры.'
                : error}
          </p>
          {error === 'dev_no_id' && (
            <div className="glass rounded-xl px-4 py-3 text-left text-sm">
              <p className="text-gray-400 mb-2">Пример:</p>
              <code className="text-accent-blue text-xs break-all">
                {window.location.origin}/app?tgid=123456789
              </code>
            </div>
          )}
          {tgId && (
            <div className="glass rounded-xl px-4 py-3 inline-block">
              <span className="text-xs text-gray-500">Ваш ID: </span>
              <span className="font-mono text-accent-blue">{tgId}</span>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  if (!player) return null

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Профиль', icon: <Wallet size={18} /> },
    { id: 'stocks', label: 'Акции', icon: <BarChart2 size={18} /> },
    { id: 'prices', label: 'Цены', icon: <DollarSign size={18} /> },
    { id: 'calc', label: 'Расчёт', icon: <Calculator size={18} /> },
    { id: 'rules', label: 'Правила', icon: <ScrollText size={18} /> },
  ]

  return (
    <div className="min-h-screen bg-dark-900 pb-24 relative overflow-hidden">
      {/* ─── Notification Overlay ─── */}
      <NotificationOverlay notifications={activeNotifs} onDismiss={dismissNotif} />

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute -top-24 -right-24 w-64 h-64 bg-accent-blue/8 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -30, 40, 0], y: [0, 40, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent-green/8 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10">
        {/* ─── PROFILE TAB ─── */}
        <AnimatePresence mode="wait">
          {tab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-extrabold"
                  >
                    Привет, <span className="text-gradient from-accent-blue to-accent-purple">{player.name}</span>! 👋
                  </motion.h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                      Цикл <span className="font-mono font-bold text-white text-base">{player.current_cycle}</span>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => loadProfile(true)}
                  className="p-2.5 glass rounded-xl text-gray-400 hover:text-white"
                >
                  <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                </motion.button>
              </div>

              {/* Balance Card */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative rounded-2xl p-5 mb-4 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(16,185,129,0.15) 100%)',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              >
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                />

                <div className="relative z-10">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Баланс</div>
                  <div className="text-4xl font-black font-mono text-white mb-3">
                    $<AnimatedMoney value={Math.round(player.money)} />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/20">
                      <TrendingUp size={14} className="text-accent-green" />
                      <span className="text-sm font-semibold text-accent-green font-mono">
                        +${player.revenue.toLocaleString()}
                      </span>
                      <span className="text-xs text-accent-green/60">/цикл</span>
                    </div>
                    {player.prev_cycle_income !== undefined && player.prev_cycle_income > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-xs text-gray-400">Прошлый цикл:</span>
                        <span className="text-sm font-semibold text-white font-mono">
                          +${player.prev_cycle_income.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Enterprises Section */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={16} className="text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Предприятия
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 ml-auto">
                    {player.enterprises.length}
                  </span>
                </div>

                {player.enterprises.length > 0 ? (
                  <div className="space-y-3">
                    {player.enterprises.map((ent, i) => (
                      <motion.div
                        key={ent.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + i * 0.05 }}
                        className="glass rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-dark-700 flex items-center justify-center text-xl">
                              {ent.enterprise_emoji}
                            </div>
                            <div>
                              <div className="font-semibold">{ent.enterprise_name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {ent.profit_cycle_interval && ent.profit_cycle_interval > 1
                                  ? `Каждые ${ent.profit_cycle_interval} цикла`
                                  : 'Каждый цикл'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-accent-green text-sm">
                              +${ent.effective_profit.toLocaleString()}
                            </div>
                            {ent.factory_count > 0 && (
                              <div className="flex items-center gap-1 mt-0.5 justify-end">
                                <Factory size={11} className="text-accent-gold" />
                                <span className="text-xs font-medium text-accent-gold">
                                  ×{ent.factory_count}
                                </span>
                                <span className="text-xs text-gray-600">
                                  (+{ent.factory_count * ent.factory_profit_percent}%)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Profit bar */}
                        <div className="mt-3 h-1 rounded-full bg-dark-600 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (ent.effective_profit / (player.revenue || 1)) * 100)}%` }}
                            transition={{ delay: 0.4 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-green"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="glass rounded-xl p-8 text-center"
                  >
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="text-4xl mb-3"
                    >
                      📭
                    </motion.div>
                    <p className="text-gray-500 text-sm">У вас пока нет предприятий</p>
                    <p className="text-gray-600 text-xs mt-1">Организатор добавит их по ходу игры</p>
                  </motion.div>
                )}
              </motion.div>

              {/* Quick Stats */}
              {player.enterprises.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="grid grid-cols-3 gap-3 mt-4"
                >
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-lg font-bold font-mono text-white">
                      {player.enterprises.length}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Бизнесы</div>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-lg font-bold font-mono text-accent-gold">
                      {player.enterprises.reduce((s, e) => s + e.factory_count, 0)}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Заводы</div>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-lg font-bold font-mono text-accent-green">
                      +{player.revenue > 0 ? Math.round((player.revenue / Math.max(player.money, 1)) * 100) : 0}%
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">ROI</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── PRICES TAB ─── */}
          {tab === 'prices' && (
            <motion.div
              key="prices"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
              <h1 className="text-2xl font-extrabold mb-1">Каталог 💰</h1>
              <p className="text-gray-500 text-sm mb-6">Текущие цены на предприятия и заводы</p>

              <div className="space-y-3">
                {prices.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center text-2xl shrink-0">
                        {p.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-lg">{p.name}</div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between bg-dark-700/50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Building2 size={14} />
                              Предприятие
                            </div>
                            <div className="font-mono font-bold text-white">${p.price.toLocaleString()}</div>
                          </div>

                          <div className="flex items-center justify-between bg-dark-700/50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Factory size={14} />
                              Завод
                            </div>
                            <div className="font-mono font-bold text-white">${p.factory_price.toLocaleString()}</div>
                          </div>

                          <div className="flex gap-2 mt-1">
                            <div className="flex-1 text-center py-1.5 rounded-lg bg-accent-green/5 border border-accent-green/10">
                              <div className="text-xs text-accent-green font-mono font-bold">
                                +${p.profit.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-gray-600">прибыль</div>
                            </div>
                            <div className="flex-1 text-center py-1.5 rounded-lg bg-accent-gold/5 border border-accent-gold/10">
                              <div className="text-xs text-accent-gold font-mono font-bold">
                                +{p.factory_profit_percent}%
                              </div>
                              <div className="text-[10px] text-gray-600">от завода</div>
                            </div>
                            {p.profit_cycle_interval > 1 && (
                              <div className="flex-1 text-center py-1.5 rounded-lg bg-accent-blue/5 border border-accent-blue/10">
                                <div className="text-xs text-accent-blue font-mono font-bold">
                                  ×{p.profit_cycle_interval}
                                </div>
                                <div className="text-[10px] text-gray-600">циклов</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {prices.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 text-gray-600"
                  >
                    <div className="text-4xl mb-3">🏪</div>
                    <p className="text-sm">Каталог ещё не заполнен</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── STOCKS TAB ─── */}
          {tab === 'stocks' && (
            <motion.div
              key="stocks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
              <h1 className="text-2xl font-extrabold mb-1">Акции 📊</h1>
              <p className="text-gray-500 text-sm mb-5">Ваши доли в компаниях других игроков</p>

              {stockData ? (
                <>
                  {/* Own stock remaining */}
                  <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="glass rounded-xl p-4 mb-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Свои акции</div>
                    <div className="text-3xl font-black font-mono text-accent-blue">{stockData.own_percentage}%</div>
                    <div className="text-xs text-gray-500 mt-1">Оставшиеся циклов: {stockData.remaining_cycles}</div>
                  </motion.div>

                  {/* Owned in others */}
                  {stockData.owned_in_others.length > 0 ? (
                    <div className="space-y-3">
                      {stockData.owned_in_others.map((s, i) => (
                        <motion.div
                          key={s.target_player_id}
                          initial={{ opacity:0, y:10 }}
                          animate={{ opacity:1, y:0 }}
                          transition={{ delay: i * 0.05 }}
                          className="glass rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-bold">{s.target_player_name}</div>
                              <div className="text-xs text-gray-500">Доля: <span className="text-accent-purple font-bold">{s.percentage}%</span></div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Прогноз к ц.{(stockData.remaining_cycles + 0)}</div>
                              <div className="font-mono font-bold text-accent-gold">
                                ~${s.estimated_yield.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div className="bg-dark-700/50 rounded-lg p-2">
                              <div className="text-gray-500">Выручка/цикл</div>
                              <div className="font-mono text-accent-green">+${s.target_revenue_per_cycle.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] text-gray-600">
                            Прогноз: выручка × {stockData.remaining_cycles} ц. × {s.percentage}%
                          </div>
                        </motion.div>
                      ))}
                      <div className="glass rounded-xl p-4 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Итого прогноз</span>
                        <span className="font-mono font-bold text-xl text-accent-gold">
                          ~${stockData.total_estimated_yield.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="glass rounded-xl p-8 text-center">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="text-gray-500 text-sm">Вы не владеете акциями других игроков</p>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </motion.div>
          )}

          {/* ─── CALCULATOR TAB ─── */}
          {tab === 'calc' && (
            <CalculatorTab
              prices={prices} tg={tg}
              expr={calcExpr} setExpr={setCalcExpr}
              result={calcResult} setResult={setCalcResult}
              lastInserted={calcLastInserted} setLastInserted={setCalcLastInserted}
            />
          )}

          {/* ─── RULES TAB ─── */}
          {tab === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
              <h1 className="text-2xl font-extrabold mb-1">Правила 📋</h1>
              <p className="text-gray-500 text-sm mb-6">Как играть в Stonks Game</p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-xl p-5"
              >
                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {rules || 'Правила ещё не установлены.'}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Bottom Tab Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-dark-800/90 backdrop-blur-xl border-t border-white/5">
          <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
            {tabs.map((t) => {
              const active = tab === t.id
              return (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setTab(t.id)}
                  className={`relative flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
                    active ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="tab-bg"
                      className="absolute inset-0 bg-accent-blue/10 border border-accent-blue/20 rounded-xl"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                  <span className="relative z-10">{t.icon}</span>
                  <span className="relative z-10 text-[10px] font-semibold uppercase tracking-wider">
                    {t.label}
                  </span>
                </motion.button>
              )
            })}
          </div>
          {/* Safe area */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  )
}
