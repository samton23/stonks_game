import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, RotateCcw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSettings, updateSetting, resetGame } from '../../api'

export default function SettingsPage() {
  const [budget, setBudget] = useState('')
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    getSettings().then((s) => setBudget(s.budget || '10000')).catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      await updateSetting('budget', budget)
      toast.success('Настройки сохранены')
      setSaved(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleReset = async () => {
    if (!confirm('⚠️ Вы уверены? Это сбросит цикл, раздаст начальный бюджет и уберёт все предприятия у игроков!')) return
    try {
      await resetGame()
      toast.success('Игра сброшена!')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-gray-500/10 text-gray-400">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Настройки</h2>
          <p className="text-gray-500 text-sm">Начальные параметры игры</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Budget */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Начальный бюджет
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Количество денег, которое получает каждый игрок в начале игры
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => { setBudget(e.target.value); setSaved(false) }}
                className="w-full pl-8"
              />
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
          </div>
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
            Сброс игры: устанавливает цикл на 0, раздаёт всем начальный бюджет и убирает все предприятия
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
