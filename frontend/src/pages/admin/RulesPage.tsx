import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Save, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSettings, updateSetting } from '../../api'

export default function RulesPage() {
  const [rules, setRules] = useState('')
  const [saved, setSaved] = useState(true)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    getSettings().then((s) => setRules(s.rules || '')).catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      await updateSetting('rules', rules)
      toast.success('Правила сохранены')
      setSaved(true)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-gold/10 text-accent-gold">
            <ScrollText size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Правила</h2>
            <p className="text-gray-500 text-sm">Текст правил, видимый игрокам в боте</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPreview(!preview)}
            className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 ${
              preview ? 'bg-accent-blue/10 text-accent-blue' : 'bg-dark-700 text-gray-400 hover:text-white'
            }`}
          >
            <Eye size={18} />
            {preview ? 'Редактор' : 'Просмотр'}
          </button>
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        {preview ? (
          <div className="prose prose-invert max-w-none whitespace-pre-wrap font-sans text-gray-300 leading-relaxed min-h-[400px]">
            {rules || 'Правила пока не заданы...'}
          </div>
        ) : (
          <textarea
            value={rules}
            onChange={(e) => { setRules(e.target.value); setSaved(false) }}
            placeholder="Введите правила игры..."
            className="w-full min-h-[400px] resize-y bg-transparent border-none focus:ring-0 focus:outline-none text-gray-300 leading-relaxed"
          />
        )}
      </motion.div>
    </div>
  )
}
