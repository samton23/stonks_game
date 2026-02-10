import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { getEnterprises, updateEnterprise } from '../../api'
import type { Enterprise } from '../../types'

export default function PricesPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [changes, setChanges] = useState<Record<number, Partial<Enterprise>>>({})

  const load = async () => {
    try {
      setEnterprises(await getEnterprises())
      setChanges({})
    } catch (e: any) { toast.error(e.message) }
  }

  useEffect(() => { load() }, [])

  const updateLocal = (id: number, field: keyof Enterprise, value: number) => {
    setChanges((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const handleSave = async () => {
    try {
      for (const [id, data] of Object.entries(changes)) {
        await updateEnterprise(parseInt(id), data)
      }
      toast.success('Цены сохранены')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const hasChanges = Object.keys(changes).length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-green/10 text-accent-green">
            <DollarSign size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Цены</h2>
            <p className="text-gray-500 text-sm">Быстрое редактирование цен предприятий и заводов</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 ${
            hasChanges
              ? 'bg-accent-green hover:bg-accent-green/80 text-white'
              : 'bg-dark-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Save size={18} />
          Сохранить
        </button>
      </div>

      <div className="space-y-4">
        {enterprises.map((ent, i) => {
          const changed = changes[ent.id] || {}
          const price = changed.price ?? ent.price
          const factoryPrice = changed.factory_price ?? ent.factory_price

          return (
            <motion.div
              key={ent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center text-2xl shrink-0">
                  {ent.emoji}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg mb-3">{ent.name}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Цена предприятия ($)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => updateLocal(ent.id, 'price', +e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Цена завода ($)</label>
                      <input
                        type="number"
                        value={factoryPrice}
                        onChange={(e) => updateLocal(ent.id, 'factory_price', +e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
