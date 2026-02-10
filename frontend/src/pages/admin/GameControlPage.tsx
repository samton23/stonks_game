import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gamepad2, PlayCircle, Plus, Minus, DollarSign, Send,
  ChevronDown, Trash2, Building2
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getGameState, getEnterprises, advanceCycle,
  addEnterpriseToPlayer, removeEnterpriseFromPlayer,
  addFactory, removeFactory, adjustMoney, notifyPlayer
} from '../../api'
import type { GameState, Enterprise, Player } from '../../types'

export default function GameControlPage() {
  const [state, setState] = useState<GameState | null>(null)
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null)
  const [moneyInputs, setMoneyInputs] = useState<Record<number, string>>({})
  const [moneyReasons, setMoneyReasons] = useState<Record<number, string>>({})
  const [notifyInputs, setNotifyInputs] = useState<Record<number, string>>({})
  const [showAddEnterprise, setShowAddEnterprise] = useState<number | null>(null)
  const [advancing, setAdvancing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [gs, ents] = await Promise.all([getGameState(), getEnterprises()])
      setState(gs)
      setEnterprises(ents)
    } catch (e: any) {
      toast.error(e.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const i = setInterval(load, 5000)
    return () => clearInterval(i)
  }, [load])

  const handleAdvanceCycle = async () => {
    setAdvancing(true)
    try {
      await advanceCycle()
      toast.success('Цикл продвинут!')
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setAdvancing(false)
    }
  }

  const handleAddEnterprise = async (playerId: number, enterpriseId: number) => {
    try {
      await addEnterpriseToPlayer(playerId, enterpriseId)
      toast.success('Предприятие добавлено')
      setShowAddEnterprise(null)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleRemoveEnterprise = async (playerId: number, enterpriseId: number) => {
    if (!confirm('Убрать предприятие у игрока?')) return
    try {
      await removeEnterpriseFromPlayer(playerId, enterpriseId)
      toast.success('Предприятие убрано')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleAddFactory = async (playerId: number, enterpriseId: number) => {
    try {
      await addFactory(playerId, enterpriseId)
      toast.success('Завод добавлен')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleRemoveFactory = async (playerId: number, enterpriseId: number) => {
    try {
      await removeFactory(playerId, enterpriseId)
      toast.success('Завод убран')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleAdjustMoney = async (playerId: number) => {
    const amount = parseFloat(moneyInputs[playerId] || '0')
    if (amount === 0) { toast.error('Укажите сумму'); return }
    try {
      await adjustMoney(playerId, amount, moneyReasons[playerId] || '')
      toast.success('Баланс изменён')
      setMoneyInputs((p) => ({ ...p, [playerId]: '' }))
      setMoneyReasons((p) => ({ ...p, [playerId]: '' }))
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleNotify = async (playerId: number) => {
    const msg = notifyInputs[playerId]?.trim()
    if (!msg) { toast.error('Введите сообщение'); return }
    try {
      await notifyPlayer(playerId, msg)
      toast.success('Уведомление отправлено')
      setNotifyInputs((p) => ({ ...p, [playerId]: '' }))
    } catch (e: any) { toast.error(e.message) }
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const getAvailableEnterprises = (player: Player) => {
    const owned = new Set(player.enterprises.map((e) => e.enterprise_id))
    return enterprises.filter((e) => !owned.has(e.id))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-green/10 text-accent-green">
            <Gamepad2 size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Ход игры</h2>
            <p className="text-gray-500 text-sm">Управление текущей игрой</p>
          </div>
        </div>
      </div>

      {/* Cycle Control */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 mb-6 flex items-center justify-between"
      >
        <div>
          <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Текущий цикл</div>
          <div className="text-5xl font-bold font-mono text-gradient from-accent-green to-accent-blue">
            {state.current_cycle}
          </div>
        </div>
        <button
          onClick={handleAdvanceCycle}
          disabled={advancing}
          className={`px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 ${
            advancing
              ? 'bg-dark-600 text-gray-500 cursor-wait'
              : 'bg-gradient-to-r from-accent-green to-emerald-600 hover:from-emerald-600 hover:to-accent-green text-white shadow-lg shadow-accent-green/20'
          }`}
        >
          {advancing ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <PlayCircle size={24} />
          )}
          {advancing ? 'Обработка...' : 'Следующий цикл'}
        </button>
      </motion.div>

      {/* Players */}
      <div className="space-y-4">
        <AnimatePresence>
          {state.players.map((player, i) => {
            const isExpanded = expandedPlayer === player.id
            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl overflow-hidden"
              >
                {/* Player Header */}
                <button
                  onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white font-bold text-lg">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-lg">{player.name}</div>
                      <div className="text-sm text-gray-500">
                        {player.enterprises.length} предприятий
                        {' · '}
                        {player.enterprises.reduce((s, e) => s + e.factory_count, 0)} заводов
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Баланс</div>
                      <div className="font-mono font-bold text-lg text-accent-green">
                        ${player.money.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Доход/цикл</div>
                      <div className="font-mono font-semibold text-accent-gold">
                        +${player.revenue.toLocaleString()}
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={20} className="text-gray-500" />
                    </motion.div>
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                        {/* Enterprises */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                              Предприятия
                            </h4>
                            <div className="relative">
                              <button
                                onClick={() => setShowAddEnterprise(
                                  showAddEnterprise === player.id ? null : player.id
                                )}
                                className="px-3 py-1.5 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue rounded-lg text-sm flex items-center gap-1.5"
                              >
                                <Plus size={14} />
                                Добавить
                              </button>

                              {/* Add Enterprise Dropdown */}
                              <AnimatePresence>
                                {showAddEnterprise === player.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 z-50 bg-dark-700 border border-white/10 rounded-xl shadow-2xl min-w-[220px] overflow-hidden"
                                  >
                                    {getAvailableEnterprises(player).map((ent) => (
                                      <button
                                        key={ent.id}
                                        onClick={() => handleAddEnterprise(player.id, ent.id)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                                      >
                                        <span className="text-lg">{ent.emoji}</span>
                                        <span className="text-sm">{ent.name}</span>
                                      </button>
                                    ))}
                                    {getAvailableEnterprises(player).length === 0 && (
                                      <div className="px-4 py-3 text-sm text-gray-500">
                                        Все предприятия уже добавлены
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {player.enterprises.length > 0 ? (
                            <div className="space-y-2">
                              {player.enterprises.map((pe) => (
                                <div
                                  key={pe.id}
                                  className="bg-dark-700/50 rounded-xl p-4 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl">{pe.enterprise_emoji}</span>
                                    <div>
                                      <div className="font-medium">{pe.enterprise_name}</div>
                                      <div className="text-sm text-gray-500">
                                        Прибыль: <span className="text-accent-green">${pe.effective_profit.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">🏗 Заводы:</span>
                                      <button
                                        onClick={() => handleRemoveFactory(player.id, pe.enterprise_id)}
                                        className="w-7 h-7 rounded-lg bg-dark-600 hover:bg-accent-red/20 hover:text-accent-red flex items-center justify-center text-gray-400"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <span className="font-mono font-bold w-6 text-center">
                                        {pe.factory_count}
                                      </span>
                                      <button
                                        onClick={() => handleAddFactory(player.id, pe.enterprise_id)}
                                        className="w-7 h-7 rounded-lg bg-dark-600 hover:bg-accent-green/20 hover:text-accent-green flex items-center justify-center text-gray-400"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveEnterprise(player.id, pe.enterprise_id)}
                                      className="p-1.5 hover:bg-accent-red/10 hover:text-accent-red rounded-lg text-gray-500"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-gray-600 bg-dark-700/30 rounded-xl">
                              <Building2 size={24} className="mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Нет предприятий</p>
                            </div>
                          )}
                        </div>

                        {/* Money Adjustment */}
                        <div className="bg-dark-700/30 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                            <DollarSign size={14} />
                            Изменить баланс
                          </h4>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder="Сумма (+ или -)"
                              value={moneyInputs[player.id] || ''}
                              onChange={(e) => setMoneyInputs((p) => ({ ...p, [player.id]: e.target.value }))}
                              className="flex-1"
                            />
                            <input
                              type="text"
                              placeholder="Причина (необязательно)"
                              value={moneyReasons[player.id] || ''}
                              onChange={(e) => setMoneyReasons((p) => ({ ...p, [player.id]: e.target.value }))}
                              className="flex-1"
                            />
                            <button
                              onClick={() => handleAdjustMoney(player.id)}
                              className="px-4 py-2 bg-accent-green/10 hover:bg-accent-green/20 text-accent-green rounded-lg text-sm font-medium"
                            >
                              Применить
                            </button>
                          </div>
                        </div>

                        {/* Send Notification */}
                        <div className="bg-dark-700/30 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                            <Send size={14} />
                            Отправить уведомление
                          </h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Текст уведомления"
                              value={notifyInputs[player.id] || ''}
                              onChange={(e) => setNotifyInputs((p) => ({ ...p, [player.id]: e.target.value }))}
                              className="flex-1"
                            />
                            <button
                              onClick={() => handleNotify(player.id)}
                              className="px-4 py-2 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue rounded-lg text-sm font-medium flex items-center gap-1.5"
                            >
                              <Send size={14} />
                              Отправить
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {state.players.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-gray-600"
          >
            <Gamepad2 size={48} className="mx-auto mb-3 opacity-50" />
            <p>Нет игроков</p>
            <p className="text-sm mt-1">Добавьте игроков на вкладке "Игроки"</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
