import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronDown, ChevronRight, Lightbulb, Play, Users, Factory, ScrollText, Settings, Gamepad2, LayoutDashboard, Bell, RotateCcw } from 'lucide-react'

interface Section {
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

function CollapsibleSection({ section, index, isOpen, toggle }: {
  section: Section
  index: number
  isOpen: boolean
  toggle: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-xl overflow-hidden"
    >
      <button
        onClick={toggle}
        className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue">
            {section.icon}
          </div>
          <span className="font-semibold text-lg">{section.title}</span>
        </div>
        {isOpen ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-5 pb-5 border-t border-white/5"
        >
          <div className="pt-4 text-gray-300 leading-relaxed text-sm space-y-3">
            {section.content}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function HostRulesPage() {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]))

  const toggle = (idx: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const sections: Section[] = [
    {
      title: '1. Введение',
      icon: <BookOpen size={18} />,
      content: (
        <>
          <p>
            <strong>STONKS GAME</strong> — это офлайн бизнес-симуляция для групповых игр,
            где участники управляют виртуальными предприятиями, зарабатывают прибыль и конкурируют за лидерство.
            Игра состоит из циклов, в каждом из которых игроки получают доход от своих активов.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-dark-700/50 rounded-lg p-3">
              <div className="font-semibold text-accent-blue text-xs uppercase tracking-wider mb-1">Telegram бот</div>
              <p className="text-xs text-gray-400">Точка входа для игроков</p>
            </div>
            <div className="bg-dark-700/50 rounded-lg p-3">
              <div className="font-semibold text-accent-green text-xs uppercase tracking-wider mb-1">Мини-приложение</div>
              <p className="text-xs text-gray-400">Игровой интерфейс участников</p>
            </div>
            <div className="bg-dark-700/50 rounded-lg p-3">
              <div className="font-semibold text-accent-purple text-xs uppercase tracking-wider mb-1">Админ-панель</div>
              <p className="text-xs text-gray-400">Инструмент ведущего</p>
            </div>
            <div className="bg-dark-700/50 rounded-lg p-3">
              <div className="font-semibold text-accent-gold text-xs uppercase tracking-wider mb-1">Дашборд</div>
              <p className="text-xs text-gray-400">Публичный экран с рейтингом</p>
            </div>
          </div>
        </>
      ),
    },
    {
      title: '2. Подготовка к игре',
      icon: <Settings size={18} />,
      content: (
        <>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Users size={14} />
                Вкладка «Игроки»
              </h4>
              <p>Зарегистрируйте участников: укажите <strong>имя</strong> и <strong>Telegram ID</strong> для каждого.</p>
              <div className="bg-dark-700/50 rounded-lg p-3 mt-2">
                <p className="text-xs text-gray-400">
                  <strong>Как узнать Telegram ID:</strong> игрок открывает бота, отправляет /start — бот покажет его ID.
                  Введите этот ID в админ-панели и нажмите «Пригласить» — бот отправит персональную ссылку.
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Factory size={14} />
                Вкладка «Предприятия и Заводы»
              </h4>
              <p>Настройте типы бизнеса. По умолчанию создано три предприятия. Параметры каждого:</p>
              <ul className="list-disc list-inside text-gray-400 text-xs mt-2 space-y-1">
                <li><span className="text-white">Цена предприятия</span> — сколько стоит купить</li>
                <li><span className="text-white">Прибыль за цикл</span> — базовый доход</li>
                <li><span className="text-white">Раз в N циклов</span> — частота начисления прибыли</li>
                <li><span className="text-white">Цена завода</span> — стоимость апгрейда</li>
                <li><span className="text-white">% от завода</span> — бонус к прибыли за каждый завод</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <ScrollText size={14} />
                Вкладка «Правила» и «Настройки»
              </h4>
              <p>
                Напишите правила игры (видны участникам) и задайте <strong>начальный бюджет</strong> —
                сумму, которую получит каждый игрок на старте.
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      title: '3. Ход игры — Переключение циклов',
      icon: <Gamepad2 size={18} />,
      content: (
        <>
          <p>
            Главная страница управления — <strong>«Ход игры»</strong>.
            Нажмите <strong>«Следующий цикл»</strong>, чтобы:
          </p>
          <ul className="list-disc list-inside text-gray-400 text-xs space-y-1 mt-2">
            <li>Увеличить номер цикла на 1</li>
            <li>Начислить всем игрокам прибыль от их предприятий</li>
            <li>Отправить уведомления в Telegram с информацией о доходе</li>
          </ul>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
            <p className="text-xs text-yellow-300">
              <strong>Важно:</strong> Прибыль учитывает параметр «Раз в N циклов». Если предприятие
              приносит доход каждые 2 цикла — деньги придут только на 2-м, 4-м, 6-м и т.д.
            </p>
          </div>
        </>
      ),
    },
    {
      title: '4. Управление игроком',
      icon: <Users size={18} />,
      content: (
        <>
          <p>Нажмите на карточку игрока, чтобы развернуть панель управления:</p>

          <div className="space-y-3 mt-3">
            <div className="bg-dark-700/50 rounded-lg p-3">
              <h5 className="text-white font-semibold text-xs mb-1">Добавление предприятия</h5>
              <p className="text-xs text-gray-400">
                Кнопка «Добавить» → выберите тип → стоимость спишется автоматически, игрок получит уведомление.
              </p>
            </div>

            <div className="bg-dark-700/50 rounded-lg p-3">
              <h5 className="text-white font-semibold text-xs mb-1">Управление заводами</h5>
              <p className="text-xs text-gray-400">
                Кнопки «+» и «−» рядом с предприятием. «+» списывает стоимость, «−» убирает без возврата.
                Формула: Прибыль × (1 + Кол-во заводов × % от завода).
              </p>
            </div>

            <div className="bg-dark-700/50 rounded-lg p-3">
              <h5 className="text-white font-semibold text-xs mb-1">Акции</h5>
              <p className="text-xs text-gray-400">
                У каждого игрока 100% акций себя. Можно передать % другому игроку или банку.
                Покупатель платит за акции, а в конце каждого цикла получает % от дохода владельца.
              </p>
            </div>

            <div className="bg-dark-700/50 rounded-lg p-3">
              <h5 className="text-white font-semibold text-xs mb-1">Изменение баланса</h5>
              <p className="text-xs text-gray-400">
                Положительное число — пополнение, отрицательное — списание. Можно указать причину.
                Игрок получит уведомление.
              </p>
            </div>

            <div className="bg-dark-700/50 rounded-lg p-3">
              <h5 className="text-white font-semibold text-xs mb-1">Уведомления</h5>
              <p className="text-xs text-gray-400">
                Отправьте произвольное сообщение через поле «Отправить уведомление» — игрок увидит его
                в Telegram и в мини-приложении.
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      title: '5. Публичный дашборд',
      icon: <LayoutDashboard size={18} />,
      content: (
        <>
          <p>
            Дашборд — публичный экран с рейтингом. Откройте <code className="text-accent-blue">/dashboard</code> и
            выведите на проектор или большой монитор.
          </p>
          <ul className="list-disc list-inside text-gray-400 text-xs space-y-1 mt-2">
            <li>Игроки отсортированы по доходу (revenue)</li>
            <li>Обновляется каждые 3 секунды</li>
            <li>Показывает баланс, доход, предприятия и заводы</li>
            <li>Плавная анимация при изменении позиций</li>
            <li>Первые три места с медалями</li>
          </ul>
        </>
      ),
    },
    {
      title: '6. Система уведомлений',
      icon: <Bell size={18} />,
      content: (
        <>
          <p>Все события дублируются двумя способами:</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-dark-700/50 rounded-lg p-3">
              <div className="text-xs text-accent-blue font-semibold mb-1">Telegram-сообщения</div>
              <p className="text-xs text-gray-400">Отправляются ботом в личный чат</p>
            </div>
            <div className="bg-dark-700/50 rounded-lg p-3">
              <div className="text-xs text-accent-green font-semibold mb-1">In-app уведомления</div>
              <p className="text-xs text-gray-400">Всплывающие карточки в приложении</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Типы: переход цикла, начисление дохода, покупка предприятия, добавление/удаление завода,
            изменение баланса, сброс игры, произвольные сообщения от ведущего.
          </p>
        </>
      ),
    },
    {
      title: '7. Сброс игры',
      icon: <RotateCcw size={18} />,
      content: (
        <>
          <p>На вкладке «Настройки» есть кнопка <strong className="text-accent-red">«Сбросить игру»</strong>:</p>
          <ul className="list-disc list-inside text-gray-400 text-xs space-y-1 mt-2">
            <li>Цикл возвращается к 0</li>
            <li>Все игроки получают начальный бюджет</li>
            <li>Все предприятия и заводы удаляются</li>
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            Используйте для начала новой игры с теми же участниками.
          </p>
        </>
      ),
    },
    {
      title: '8. Советы по проведению',
      icon: <Lightbulb size={18} />,
      content: (
        <div className="space-y-3">
          {[
            { emoji: '📋', title: 'Подготовьтесь заранее', text: 'Зарегистрируйте всех игроков и отправьте приглашения до начала мероприятия.' },
            { emoji: '📣', title: 'Объясните правила', text: 'Перед стартом расскажите цель игры, как работают предприятия и заводы.' },
            { emoji: '📺', title: 'Выведите дашборд на экран', text: 'Публичный рейтинг добавляет азарта и соревновательности.' },
            { emoji: '⏱', title: 'Контролируйте темп', text: 'Объявляйте циклы с интервалом 3–5 минут — подберите под свою группу.' },
            { emoji: '⚡', title: 'Используйте события', text: 'Изменяйте балансы, штрафуйте или награждайте — добавляйте неожиданные повороты!' },
            { emoji: '💎', title: 'Создавайте дефицит', text: 'Разные интервалы и цены заставят игроков думать стратегически.' },
            { emoji: '🏆', title: 'Завершите зрелищно', text: 'Объявите победителя, покажите финальный рейтинг и поздравьте лучших!' },
          ].map((tip, i) => (
            <div key={i} className="flex gap-3 items-start bg-dark-700/30 rounded-lg p-3">
              <span className="text-lg shrink-0">{tip.emoji}</span>
              <div>
                <div className="font-semibold text-white text-xs">{tip.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{tip.text}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue">
          <BookOpen size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Инструкция для ведущего</h2>
          <p className="text-gray-500 text-sm">Как подготовить и провести игру STONKS GAME</p>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section, i) => (
          <CollapsibleSection
            key={i}
            section={section}
            index={i}
            isOpen={openSections.has(i)}
            toggle={() => toggle(i)}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center text-gray-600 text-sm"
      >
        Успешной игры! 🎮📈
      </motion.div>
    </div>
  )
}
