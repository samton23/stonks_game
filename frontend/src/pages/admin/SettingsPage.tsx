import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, RotateCcw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSettings, updateSetting, resetGame, setTimerDuration } from '../../api'

export default function SettingsPage() {
  const [budget, setBudget] = useState('')
  const [totalCycles, setTotalCycles] = useState('')
  const [stockPriceSetting, setStockPriceSetting] = useState('')
  const [gameTimerMin, setGameTimerMin] = useState('')
  const [cycleTimerMin, setCycleTimerMin] = useState('')
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    getSettings().then((s) => {
      setBudget(s.budget || '10000')
      setTotalCycles(s.total_cycles || '12')
      setStockPriceSetting(s.stock_price || '50')
      setGameTimerMin(String(Math.round(parseInt(s.game_timer_duration || '3600') / 60)))
      setCycleTimerMin(String(Math.round(parseInt(s.cycle_timer_duration || '300') / 60)))
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSetting('budget', budget),
        updateSetting('total_cycles', totalCycles),
        updateSetting('stock_price', stockPriceSetting),
        setTimerDuration({
          game_timer_duration: Math.max(1, parseInt(gameTimerMin) || 60) * 60,
          cycle_timer_duration: Math.max(1, parseInt(cycleTimerMin) || 5) * 60,
        }),
      ])
      toast.success('Настройки сохранены')
      setSaved(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleReset = async () => {
    if (!confirm('Вы уверены? Это сбросит цикл, раздаст начальный бюджет и уберёт все предприятия у игроков!')) return
    try {
      await resetGame()
      toast.success('Игра сброшена!')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const markDirty = () => setSaved(false)

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-gray-500/10 text-gray-400">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Настройки</h2>
          <p className="text-gray-500 text-sm">Параметры игры</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Game Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Основные настройки
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Начальный бюджет ($)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => { setBudget(e.target.value); markDirty() }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Кол-во циклов</label>
              <input
                type="number"
                min="1"
                value={totalCycles}
                onChange={(e) => { setTotalCycles(e.target.value); markDirty() }}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Цена акции (за 10%)</label>
              <input
                type="number"
                min="1"
                value={stockPriceSetting}
                onChange={(e) => { setStockPriceSetting(e.target.value); markDirty() }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Длительность игры (мин)</label>
              <input
                type="number"
                min="1"
                value={gameTimerMin}
                onChange={(e) => { setGameTimerMin(e.target.value); markDirty() }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Длительность цикла (мин)</label>
              <input
                type="number"
                min="1"
                value={cycleTimerMin}
                onChange={(e) => { setCycleTimerMin(e.target.value); markDirty() }}
                className="w-full"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saved}
            className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 ${
              saved
                ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
                : 'bg-accent-green hover:bg-accent-green/80 text-white'
            }`}
          >
            <Save size={18} />
            Сохранить
          </button>
        </motion.div>

        {/* Reset Game */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 border-accent-red/20"
        >
          <h3 className="text-sm font-semibold text-accent-red uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle size={16} />
            Опасная зона
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Сброс игры: устанавливает цикл на 0, раздаёт всем начальный бюджет, убирает все предприятия, сбрасывает акции и деактивирует события
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-accent-red/10 hover:bg-accent-red/20 text-accent-red border border-accent-red/20 rounded-lg font-medium flex items-center gap-2"
          >
            <RotateCcw size={18} />
            Сбросить игру
          </button>
        </motion.div>
      </div>
    </div>
  )
}
