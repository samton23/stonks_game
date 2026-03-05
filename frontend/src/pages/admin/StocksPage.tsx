import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, ArrowRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStocks, getGameState, transferStock, getSettings } from '../../api'
import type { StocksOverview, GameState } from '../../types'

export default function StocksPage() {
  const [stocks, setStocks] = useState<StocksOverview | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [defaultStockPrice, setDefaultStockPrice] = useState('50')

  // Transfer form
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [pct, setPct] = useState('')
  const [price, setPrice] = useState('')

  // Bank stock selection for "to" = bank
  const [selectedBankStock, setSelectedBankStock] = useState('')

  const load = useCallback(async () => {
    try {
      const [s, gs, settings] = await Promise.all([getStocks(), getGameState(), getSettings()])
      setStocks(s)
      setGameState(gs)
      if (settings.stock_price) {
        setDefaultStockPrice(settings.stock_price)
        if (!price) setPrice(settings.stock_price)
      }
    } catch (e: any) { toast.error(e.message) }
  }, [])

  useEffect(() => { load() }, [load])

  // When fromId changes to bank (0), show bank stock selector
  useEffect(() => {
    if (fromId === '0' && stocks?.bank && stocks.bank.length > 0) {
      const first = stocks.bank[0]
      setTargetId(String(first.target_player_id))
      setSelectedBankStock(String(first.target_player_id))
    }
  }, [fromId, stocks])

  useEffect(() => {
    if (selectedBankStock && fromId === '0') {
      setTargetId(selectedBankStock)
    }
  }, [selectedBankStock, fromId])

  const handleTransfer = async () => {
    const fid = parseInt(fromId)
    const tid = parseInt(toId)
    const tpid = parseInt(targetId)
    const percentage = parseFloat(pct)
    const priceVal = parseFloat(price || defaultStockPrice)

    if (isNaN(fid) || isNaN(tid) || isNaN(tpid) || isNaN(percentage) || percentage <= 0) {
      toast.error('Заполните все поля корректно')
      return
    }

    try {
      await transferStock({
        from_id: fid,
        to_id: tid,
        target_player_id: tpid,
        percentage,
        price_per_share: priceVal,
      })
      toast.success('Акции переданы')
      setPct('')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  if (!stocks || !gameState) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const players = gameState.players

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-purple/10 text-accent-purple">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Акции</h2>
            <p className="text-gray-500 text-sm">Управление акциями игроков</p>
          </div>
        </div>
        <button onClick={load} className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-gray-400 rounded-lg text-sm flex items-center gap-2">
          <RefreshCw size={14} />
          Обновить
        </button>
      </div>

      {/* Transfer Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 mb-6"
      >
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Передача акций
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">От кого</label>
            <select
              value={fromId}
              onChange={e => setFromId(e.target.value)}
              className="w-full bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Выберите...</option>
              <option value="0">🏦 Банк</option>
              {players.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Кому</label>
            <select
              value={toId}
              onChange={e => setToId(e.target.value)}
              className="w-full bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Выберите...</option>
              <option value="0">🏦 Банк</option>
              {players.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              {fromId === '0' ? 'Акции игрока (из банка)' : 'Чьи акции'}
            </label>
            {fromId === '0' && stocks.bank.length > 0 ? (
              <select
                value={selectedBankStock}
                onChange={e => setSelectedBankStock(e.target.value)}
                className="w-full bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                {stocks.bank.map(bs => (
                  <option key={bs.target_player_id} value={String(bs.target_player_id)}>
                    {bs.target_player_name} ({bs.percentage}%)
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="w-full bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Выберите...</option>
                {players.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">% (шаг 10)</label>
            <input
              type="number"
              min="10"
              step="10"
              value={pct}
              onChange={e => setPct(e.target.value)}
              placeholder="10"
              className="w-full bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1.5">Цена за 10%</label>
            <input
              type="number"
              value={price}
              placeholder={defaultStockPrice}
              onChange={e => setPrice(e.target.value)}
              className="w-full bg-dark-600 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleTransfer}
            className="flex items-center gap-2 px-5 py-2 bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple rounded-lg text-sm font-medium whitespace-nowrap"
          >
            <ArrowRight size={16} />
            Передать
          </button>
        </div>
      </motion.div>

      {/* Players Stock Overview */}
      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Акции игроков</h3>
        {stocks.players.map((p, i) => (
          <motion.div
            key={p.player_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white font-bold">
                  {p.player_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{p.player_name}</div>
                  <div className="text-xs text-gray-500">
                    Свои акции: <span className="text-accent-blue font-bold">{p.own_percentage}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {(() => {
                  const gp = players.find(gpl => gpl.id === p.player_id)
                  return gp ? (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Баланс</div>
                      <div className="font-mono font-bold text-accent-green text-sm">${gp.money.toLocaleString()}</div>
                    </div>
                  ) : null
                })()}
                {p.holders.length > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Владельцы</div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {p.holders.map((h, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-dark-600 text-xs">
                          {h.owner_name}: <span className="text-accent-gold font-semibold">{h.percentage}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bank Holdings */}
      {stocks.bank.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Акции в банке</h3>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex flex-wrap gap-3">
              {stocks.bank.map((bs, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-dark-700/50 rounded-lg">
                  <span className="text-sm">🏦</span>
                  <span className="text-sm font-medium">{bs.target_player_name}</span>
                  <span className="text-sm font-bold text-accent-gold">{bs.percentage}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
