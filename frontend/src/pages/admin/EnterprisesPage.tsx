import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Factory, Plus, Trash2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getEnterprises, createEnterprise, updateEnterprise, deleteEnterprise } from '../../api'
import type { Enterprise } from '../../types'

const emojis = ['🏭', '🥬', '🚗', '🌾', '⛏️', '💎', '🛢️', '🏗️', '🔧', '⚡', '🧪', '🎮']

export default function EnterprisesPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '', emoji: '🏭', price: 0, profit: 0,
    profit_cycle_interval: 1, factory_price: 0, factory_profit_percent: 10,
  })

  const load = async () => {
    try {
      setEnterprises(await getEnterprises())
    } catch (e: any) { toast.error(e.message) }
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({ name: '', emoji: '🏭', price: 0, profit: 0, profit_cycle_interval: 1, factory_price: 0, factory_profit_percent: 10 })
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Укажите название'); return }
    try {
      if (editId) {
        await updateEnterprise(editId, form)
        toast.success('Обновлено')
      } else {
        await createEnterprise(form)
        toast.success('Предприятие создано')
      }
      resetForm()
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleEdit = (e: Enterprise) => {
    setForm({
      name: e.name, emoji: e.emoji, price: e.price, profit: e.profit,
      profit_cycle_interval: e.profit_cycle_interval,
      factory_price: e.factory_price, factory_profit_percent: e.factory_profit_percent,
    })
    setEditId(e.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить предприятие "${name}"?`)) return
    try {
      await deleteEnterprise(id)
      toast.success('Удалено')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-purple/10 text-accent-purple">
            <Factory size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Предприятия и заводы</h2>
            <p className="text-gray-500 text-sm">Настройка видов бизнеса</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="px-5 py-2.5 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Plus size={18} />
          Добавить
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="glass rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  {editId ? 'Редактирование' : 'Новое предприятие'}
                </h3>
                <button onClick={resetForm} className="text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Название</label>
                  <input
                    type="text" value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    placeholder="Название предприятия" className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Иконка</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {emojis.map((e) => (
                      <button
                        key={e}
                        onClick={() => setForm({...form, emoji: e})}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                          form.emoji === e ? 'bg-accent-blue/20 ring-2 ring-accent-blue scale-110' : 'bg-dark-700 hover:bg-dark-600'
                        }`}
                      >{e}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Цена предприятия</label>
                  <input
                    type="number" value={form.price}
                    onChange={(e) => setForm({...form, price: +e.target.value})}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Прибыль за цикл</label>
                  <input
                    type="number" value={form.profit}
                    onChange={(e) => setForm({...form, profit: +e.target.value})}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Раз в N циклов</label>
                  <input
                    type="number" value={form.profit_cycle_interval} min={1}
                    onChange={(e) => setForm({...form, profit_cycle_interval: Math.max(1, +e.target.value)})}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Цена завода</label>
                  <input
                    type="number" value={form.factory_price}
                    onChange={(e) => setForm({...form, factory_price: +e.target.value})}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">% прибыли от завода</label>
                  <input
                    type="number" value={form.factory_profit_percent}
                    onChange={(e) => setForm({...form, factory_profit_percent: +e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-accent-green hover:bg-accent-green/80 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <Save size={18} />
                {editId ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence>
          {enterprises.map((ent, i) => (
            <motion.div
              key={ent.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-5 glass-hover cursor-pointer"
              onClick={() => handleEdit(ent)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center text-2xl">
                    {ent.emoji}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{ent.name}</div>
                    <div className="text-sm text-gray-500">
                      Прибыль: <span className="text-accent-green">${ent.profit.toLocaleString()}</span>
                      {ent.profit_cycle_interval > 1 && (
                        <span className="ml-2 text-gray-600">/ каждые {ent.profit_cycle_interval} цикла</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Цена</div>
                    <div className="font-mono text-sm">${ent.price.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Завод</div>
                    <div className="font-mono text-sm">${ent.factory_price.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">% завода</div>
                    <div className="font-mono text-sm text-accent-gold">{ent.factory_profit_percent}%</div>
                  </div>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); handleDelete(ent.id, ent.name) }}
                    className="p-2 hover:bg-accent-red/10 hover:text-accent-red rounded-lg text-gray-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
