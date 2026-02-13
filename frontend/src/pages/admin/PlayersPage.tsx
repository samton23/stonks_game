import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Trash2, Copy, Users, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPlayers, createPlayer, deletePlayer, getPlayerInvitation } from '../../api'
import type { Player } from '../../types'

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [telegramId, setTelegramId] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await getPlayers()
      setPlayers(data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!name.trim() || !telegramId.trim()) {
      toast.error('Заполните все поля')
      return
    }
    try {
      await createPlayer({ name: name.trim(), telegram_id: parseInt(telegramId) })
      setName('')
      setTelegramId('')
      toast.success('Игрок добавлен')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDelete = async (id: number, playerName: string) => {
    if (!confirm(`Удалить игрока ${playerName}?`)) return
    try {
      await deletePlayer(id)
      toast.success('Игрок удалён')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleInvite = async (id: number, playerName: string) => {
    try {
      const data = await getPlayerInvitation(id)
      await navigator.clipboard.writeText(data.url)
      if (data.sent) {
        toast.success(`Приглашение отправлено ${playerName} в Telegram!`, {
          duration: 4000,
        })
      } else {
        toast.success(`Ссылка для ${playerName} скопирована!`, {
          duration: 3000,
        })
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка отправки приглашения')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue">
          <Users size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Игроки</h2>
          <p className="text-gray-500 text-sm">Управление участниками игры</p>
        </div>
      </div>

      {/* Add Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 mb-6"
      >
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Добавить игрока
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Имя игрока"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <input
            type="number"
            placeholder="Telegram ID"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            className="flex-1"
          />
          <button
            onClick={handleAdd}
            className="px-6 py-2.5 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <UserPlus size={18} />
            Добавить
          </button>
        </div>
      </motion.div>

      {/* Players List */}
      <div className="space-y-3">
        <AnimatePresence>
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className="glass rounded-xl p-5 flex items-center justify-between glass-hover"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white font-bold text-sm">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    ID: {player.telegram_id}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(String(player.telegram_id))
                        toast.success('Скопировано')
                      }}
                      className="hover:text-white"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Баланс</div>
                  <div className="font-mono font-semibold text-accent-green">
                    ${player.money.toLocaleString()}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleInvite(player.id, player.name)}
                  className="px-4 py-2 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Share2 size={16} />
                  Пригласить
                </motion.button>
                <button
                  onClick={() => handleDelete(player.id, player.name)}
                  className="p-2 hover:bg-accent-red/10 hover:text-accent-red rounded-lg text-gray-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && players.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-gray-600"
          >
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p>Игроков пока нет</p>
            <p className="text-sm mt-1">Добавьте первого игрока выше</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
