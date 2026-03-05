import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Plus, Trash2, Save, X, Play, Pause, AlertCircle, Shuffle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getEvents, getEnterprises, createEvent, updateEvent, deleteEvent,
  activateEvent, deactivateEvent, randomEvent, getGameState,
} from '../../api'
import type { GameEvent, Enterprise } from '../../types'

export default function EventsPage() {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    affected_enterprises: '[]',
    profit_modifier: 1.0,
    duration_cycles: 1,
  })
  const [selectedEnterprises, setSelectedEnterprises] = useState<number[]>([])
  const [currentCycle, setCurrentCycle] = useState<number | null>(null)

  const load = async () => {
    try {
      const [ev, ents, gs] = await Promise.all([getEvents(), getEnterprises(), getGameState()])
      setEvents(ev)
      setEnterprises(ents)
      setCurrentCycle(gs.current_cycle)
    } catch (e: any) { toast.error(e.message) }
  }

  const isBlocked = currentCycle === 0

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({ name: '', description: '', affected_enterprises: '[]', profit_modifier: 1.0, duration_cycles: 1 })
    setSelectedEnterprises([])
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Укажите название события'); return }
    const payload = {
      ...form,
      affected_enterprises: JSON.stringify(selectedEnterprises),
    }
    try {
      if (editId) {
        await updateEvent(editId, payload)
        toast.success('Событие обновлено')
      } else {
        await createEvent(payload)
        toast.success('Событие создано')
      }
      resetForm()
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleEdit = (ev: GameEvent) => {
    setForm({
      name: ev.name,
      description: ev.description,
      affected_enterprises: ev.affected_enterprises,
      profit_modifier: ev.profit_modifier,
      duration_cycles: ev.duration_cycles,
    })
    try {
      setSelectedEnterprises(JSON.parse(ev.affected_enterprises || '[]'))
    } catch {
      setSelectedEnterprises([])
    }
    setEditId(ev.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить событие "${name}"?`)) return
    try {
      await deleteEvent(id)
      toast.success('Событие удалено')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleRandomEvent = async () => {
    try {
      const ev = await randomEvent()
      toast.success(`Активировано случайное событие: ${ev.name}`)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleToggleActive = async (ev: GameEvent) => {
    try {
      if (ev.is_active) {
        await deactivateEvent(ev.id)
        toast.success('Событие деактивировано')
      } else {
        await activateEvent(ev.id)
        toast.success('Событие активировано!')
      }
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const toggleEnterprise = (id: number) => {
    setSelectedEnterprises((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const getAffectedNames = (jsonStr: string) => {
    try {
      const ids: number[] = JSON.parse(jsonStr || '[]')
      if (ids.length === 0) return 'Все предприятия'
      return ids
        .map((id) => {
          const ent = enterprises.find((e) => e.id === id)
          return ent ? `${ent.emoji} ${ent.name}` : `#${id}`
        })
        .join(', ')
    } catch {
      return 'Все предприятия'
    }
  }

  const modifierLabel = (mod: number) => {
    if (mod === 1) return { text: 'Без эффекта', color: 'text-gray-400' }
    if (mod > 1) return { text: `+${Math.round((mod - 1) * 100)}% прибыли`, color: 'text-accent-green' }
    if (mod === 0) return { text: 'Прибыль отключена', color: 'text-accent-red' }
    return { text: `${Math.round((mod - 1) * 100)}% прибыли`, color: 'text-accent-red' }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">События</h2>
            <p className="text-gray-500 text-sm">Игровые события, влияющие на прибыль</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRandomEvent}
            disabled={isBlocked}
            className="px-5 py-2.5 bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple border border-accent-purple/20 rounded-lg font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Shuffle size={18} />
            Случайное
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            disabled={isBlocked}
            className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-dark-900 rounded-lg font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            Создать событие
          </button>
        </div>
      </div>

      {/* Cycle-0 block banner */}
      {isBlocked && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-400"
        >
          <Lock size={18} className="shrink-0" />
          <span className="text-sm">
            На <strong>нулевом цикле</strong> управление событиями заблокировано.
            Нажмите «Следующий цикл» на странице Ход игры, чтобы начать игру.
          </span>
        </motion.div>
      )}

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
                  {editId ? 'Редактирование события' : 'Новое событие'}
                </h3>
                <button onClick={resetForm} className="text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Название</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Например: Засуха"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Описание</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Краткое описание эффекта"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Множитель прибыли
                    <span className="ml-2 text-gray-600">
                      (1.0 = норма, 0.5 = −50%, 1.5 = +50%, 0 = нет прибыли)
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.profit_modifier}
                    onChange={(e) => setForm({ ...form, profit_modifier: parseFloat(e.target.value) || 0 })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Длительность (циклов)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.duration_cycles}
                    onChange={(e) => setForm({ ...form, duration_cycles: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Affected enterprises multi-select */}
              <div className="mb-6">
                <label className="block text-xs text-gray-500 mb-2">
                  Затронутые предприятия
                  <span className="ml-2 text-gray-600">(если не выбрано — действует на все)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {enterprises.map((ent) => {
                    const active = selectedEnterprises.includes(ent.id)
                    return (
                      <button
                        key={ent.id}
                        onClick={() => toggleEnterprise(ent.id)}
                        className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                          active
                            ? 'bg-accent-blue/20 ring-2 ring-accent-blue text-white'
                            : 'bg-dark-700 hover:bg-dark-600 text-gray-400'
                        }`}
                      >
                        <span>{ent.emoji}</span>
                        <span>{ent.name}</span>
                      </button>
                    )
                  })}
                  {enterprises.length === 0 && (
                    <span className="text-sm text-gray-600">Сначала создайте предприятия</span>
                  )}
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

      {/* Events List */}
      <div className="space-y-3">
        <AnimatePresence>
          {events.map((ev, i) => {
            const mod = modifierLabel(ev.profit_modifier)
            return (
              <motion.div
                key={ev.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.05 }}
                className={`glass rounded-xl p-5 transition-all ${
                  ev.is_active
                    ? 'ring-2 ring-yellow-500/40 bg-yellow-500/5'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {ev.is_active && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 text-xs font-bold uppercase"
                        >
                          Активно
                        </motion.div>
                      )}
                      <span className="font-semibold text-lg">{ev.name}</span>
                    </div>

                    {ev.description && (
                      <p className="text-sm text-gray-500 mb-3">{ev.description}</p>
                    )}

                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={13} className="text-gray-500" />
                        <span className={`font-semibold ${mod.color}`}>{mod.text}</span>
                      </div>
                      <div className="text-gray-500">
                        Длительность: <span className="text-white font-medium">{ev.duration_cycles} ц.</span>
                        {ev.is_active && (
                          <span className="ml-2 text-yellow-400">
                            (осталось: {ev.remaining_cycles})
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {getAffectedNames(ev.affected_enterprises)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => handleToggleActive(ev)}
                      disabled={isBlocked}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        ev.is_active
                          ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400'
                          : 'bg-accent-green/10 hover:bg-accent-green/20 text-accent-green'
                      }`}
                    >
                      {ev.is_active ? <Pause size={14} /> : <Play size={14} />}
                      {ev.is_active ? 'Стоп' : 'Запуск'}
                    </button>
                    <button
                      onClick={() => handleEdit(ev)}
                      disabled={isBlocked}
                      className="px-3 py-2 bg-dark-600 hover:bg-dark-500 text-gray-400 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Ред.
                    </button>
                    <button
                      onClick={() => handleDelete(ev.id, ev.name)}
                      disabled={isBlocked}
                      className="p-2 hover:bg-accent-red/10 hover:text-accent-red rounded-lg text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {events.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-gray-600"
          >
            <Zap size={48} className="mx-auto mb-3 opacity-50" />
            <p>Событий пока нет</p>
            <p className="text-sm mt-1">Создайте первое игровое событие</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
