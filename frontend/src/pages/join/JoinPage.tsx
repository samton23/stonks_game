import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, User, Hash } from 'lucide-react'
import { joinGame, validateBrowserToken } from '../../api'

const SESSION_KEY = 'stonks_session'
const TTL = 4 * 60 * 60 * 1000 // 4 hours

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.expires && Date.now() > data.expires) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return data as { token: string; player_id: number; name: string; expires: number }
  } catch { return null }
}

export default function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check existing session
  useEffect(() => {
    const session = getSession()
    if (session) {
      validateBrowserToken(session.token)
        .then(() => navigate('/app', { replace: true }))
        .catch(() => {
          localStorage.removeItem(SESSION_KEY)
          setChecking(false)
        })
    } else {
      setChecking(false)
    }
  }, [navigate])

  const handleJoin = async () => {
    setError('')
    if (!name.trim()) { setError('Введите имя'); return }
    if (!code.trim()) { setError('Введите код комнаты'); return }
    setLoading(true)
    try {
      const res = await joinGame({ name: name.trim(), room_code: code.trim() })
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        token: res.token,
        player_id: res.player_id,
        name: res.name,
        expires: Date.now() + TTL,
      }))
      navigate('/app', { replace: true })
    } catch (e: any) {
      setError(e.message || 'Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-5xl mb-3">📈</motion.div>
          <h1 className="text-3xl font-black">
            <span className="text-gradient from-accent-green to-accent-blue">STONKS</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Присоединиться к игре</p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Ваше имя</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Как вас зовут?"
                maxLength={50}
                className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-sm focus:border-accent-blue/50 focus:outline-none transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Код комнаты</label>
            <div className="relative">
              <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-sm font-mono tracking-widest uppercase focus:border-accent-blue/50 focus:outline-none transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </motion.div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              loading
                ? 'bg-dark-600 text-gray-500 cursor-wait'
                : 'bg-gradient-to-r from-accent-green to-emerald-600 hover:from-emerald-600 hover:to-accent-green text-white shadow-lg shadow-accent-green/20'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {loading ? 'Подключение...' : 'Войти в игру'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
