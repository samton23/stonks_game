import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, ChevronDown, ChevronRight, Lightbulb, Play, Users, Factory,
  ScrollText, Settings, Gamepad2, LayoutDashboard, Bell, RotateCcw, TrendingUp
} from 'lucide-react'

interface Section {
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

function CollapsibleSection({ section, index, isOpen, toggle }: {
  section: Section; index: number; isOpen: boolean; toggle: () => void
}) {
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: index * 0.04 }} className="glass rounded-xl overflow-hidden">
      <button onClick={toggle} className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue">{section.icon}</div>
          <span className="font-semibold text-lg">{section.title}</span>
        </div>
        {isOpen ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} className="overflow-hidden">
            <div className="px-5 pb-5 border-t border-white/5">
              <div className="pt-4 text-gray-300 leading-relaxed text-sm space-y-3">{section.content}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const platformSections: Section[] = [
  {
    title: '1. Введение',
    icon: <BookOpen size={18} />,
    content: (
      <>
        <p><strong>STONKS GAME</strong> — офлайн бизнес-симуляция для групповых игр, где участники управляют виртуальными предприятиями, зарабатывают прибыль и конкурируют за лидерство. Игра состоит из циклов.</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[
            { color:'accent-blue', title:'Telegram бот', sub:'Точка входа для игроков' },
            { color:'accent-green', title:'Мини-приложение', sub:'Игровой интерфейс участников' },
            { color:'accent-purple', title:'Админ-панель', sub:'Инструмент ведущего' },
            { color:'accent-gold', title:'Дашборд', sub:'Публичный экран с рейтингом' },
          ].map(c => (
            <div key={c.title} className="bg-dark-700/50 rounded-lg p-3">
              <div className={`font-semibold text-${c.color} text-xs uppercase tracking-wider mb-1`}>{c.title}</div>
              <p className="text-xs text-gray-400">{c.sub}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    title: '2. Подготовка к игре',
    icon: <Settings size={18} />,
    content: (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2"><Users size={14} /> Вкладка «Игроки»</h4>
          <p>Зарегистрируйте участников: укажите <strong>имя</strong> и <strong>Telegram ID</strong> для каждого.</p>
          <div className="bg-dark-700/50 rounded-lg p-3 mt-2">
            <p className="text-xs text-gray-400"><strong>Как узнать Telegram ID:</strong> игрок открывает бота, отправляет /start — бот покажет его ID. Введите этот ID в админ-панели и нажмите «Пригласить».</p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2"><Factory size={14} /> Вкладка «Предприятия»</h4>
          <p>По умолчанию три предприятия. Параметры: цена, прибыль за цикл, период начисления, цена завода, % от завода.</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2"><Settings size={14} /> Вкладка «Настройки»</h4>
          <p>Задайте начальный бюджет, <strong>кол-во циклов</strong>, цену акции и длительность таймеров.</p>
        </div>
      </div>
    ),
  },
  {
    title: '3. Ход игры — Таймеры и Циклы',
    icon: <Gamepad2 size={18} />,
    content: (
      <>
        <p>Страница <strong>«Ход игры»</strong> — основная. Таймеры: игровой и цикловой. Кнопка <strong>«Следующий цикл»</strong> начисляет доход. Когда достигнут лимит циклов — кнопка становится <strong>«Завершить игру»</strong>.</p>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
          <p className="text-xs text-yellow-300"><strong>Важно:</strong> При завершении игры происходит финальный расчёт акций и пропорциональный доход по незавершённым циклам предприятий.</p>
        </div>
      </>
    ),
  },
  {
    title: '4. Управление игроком',
    icon: <Users size={18} />,
    content: (
      <div className="space-y-3 mt-1">
        {[
          { title:'Добавление предприятия', text:'Кнопка «Добавить» → выберите тип → стоимость спишется автоматически.' },
          { title:'Управление заводами', text:'Кнопки «+» и «−» рядом с предприятием. «+» списывает стоимость, «−» убирает.' },
          { title:'Акции (вкладка «Акции»)', text:'Используйте отдельную вкладку «Акции» для передачи долей. Банк — посредник: игрок продаёт банку, затем банк продаёт покупателю.' },
          { title:'Изменение баланса', text:'Положительное — пополнение, отрицательное — списание. Игрок получит уведомление.' },
          { title:'Уведомления', text:'Отправьте произвольное сообщение — игрок увидит в Telegram и в приложении.' },
        ].map((item, i) => (
          <div key={i} className="bg-dark-700/50 rounded-lg p-3">
            <h5 className="text-white font-semibold text-xs mb-1">{item.title}</h5>
            <p className="text-xs text-gray-400">{item.text}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: '5. Публичный дашборд',
    icon: <LayoutDashboard size={18} />,
    content: (
      <>
        <p>Откройте <code className="text-accent-blue">/dashboard</code> и выведите на проектор. Обновляется каждые 3 секунды. Во время игры показывает <em>оценку</em> счёта, после завершения — реальные бюджеты.</p>
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
          <div className="bg-dark-700/50 rounded-lg p-3"><div className="text-xs text-accent-blue font-semibold mb-1">Telegram-сообщения</div><p className="text-xs text-gray-400">Отправляются ботом в личный чат</p></div>
          <div className="bg-dark-700/50 rounded-lg p-3"><div className="text-xs text-accent-green font-semibold mb-1">In-app уведомления</div><p className="text-xs text-gray-400">Всплывающие карточки в приложении</p></div>
        </div>
      </>
    ),
  },
  {
    title: '7. Сброс игры',
    icon: <RotateCcw size={18} />,
    content: (
      <>
        <p>На вкладке «Настройки» есть кнопка <strong className="text-accent-red">«Сбросить игру»</strong>: цикл → 0, начальные бюджеты, убрать предприятия, сбросить акции, деактивировать события.</p>
      </>
    ),
  },
  {
    title: '8. Советы по проведению',
    icon: <Lightbulb size={18} />,
    content: (
      <div className="space-y-3">
        {[
          { e:'📋', t:'Подготовьтесь заранее', d:'Зарегистрируйте всех игроков до начала мероприятия.' },
          { e:'📺', t:'Выведите дашборд на экран', d:'Публичный рейтинг добавляет азарта.' },
          { e:'⚡', t:'Используйте события', d:'Нажмите «Случайное» во вкладке «События».' },
          { e:'📈', t:'Акции — интрига', d:'Напомните игрокам, что акции считаются в конце по бюджету.' },
          { e:'🏆', t:'Завершите зрелищно', d:'Нажмите «Завершить игру» — дашборд откроет бюджеты.' },
        ].map((tip, i) => (
          <div key={i} className="flex gap-3 items-start bg-dark-700/30 rounded-lg p-3">
            <span className="text-lg shrink-0">{tip.e}</span>
            <div><div className="font-semibold text-white text-xs">{tip.t}</div><div className="text-xs text-gray-400 mt-0.5">{tip.d}</div></div>
          </div>
        ))}
      </div>
    ),
  },
]

const gameRulesSections: Section[] = [
  {
    title: '1. Вступление',
    icon: <Play size={18} />,
    content: (
      <div className="space-y-3">
        <p className="italic text-gray-300">
          "У вас есть ровно два часа, чтобы превратить 100 бублей во всё, что сможете."
        </p>
        <p>Вы можете стать <strong>производственником</strong> — строить, расширяться, запускать конвейеры. Или <strong>рантье</strong> — скупать доли, торговать бумагами и жить на дивиденды с чужих побед.</p>
        <div className="bg-dark-700/50 rounded-lg p-3 mt-2">
          <p className="text-xs text-gray-400">Одни будут создавать реальность. Другие — владеть ею. Выберите свою сторону.</p>
        </div>
      </div>
    ),
  },
  {
    title: '2. Основные правила',
    icon: <ScrollText size={18} />,
    content: (
      <>
        <p>Побеждает игрок или команда, заработавшие больше всех денег к концу игры. У каждого в начале есть <strong>100 бублей наличными</strong> и <strong>100% акций своей компании</strong>.</p>
        <p className="mt-2">С этими деньгами можно: запустить производство, накопить капитал или продать часть акций через ведущего по фиксированной цене <strong>50 бублей за 10% акций</strong>.</p>
      </>
    ),
  },
  {
    title: '3. Предприятия',
    icon: <Factory size={18} />,
    content: (
      <>
        <p>Три основных направления с разными вложениями, периодами и выручкой:</p>
        <div className="space-y-2 mt-3">
          {[
            { n:'🥬 Овощи/консервы', price:'100', profit:'200', cycle:'1' },
            { n:'🌾 Ферма', price:'500', profit:'700', cycle:'1' },
            { n:'🚗 Автомобили', price:'200', profit:'450', cycle:'1' },
          ].map(e => (
            <div key={e.n} className="bg-dark-700/50 rounded-lg p-3 flex items-center justify-between">
              <span className="font-medium">{e.n}</span>
              <div className="text-xs text-right">
                <div className="text-gray-400">Вложения: <span className="text-white">{e.price} бублей</span></div>
                <div className="text-accent-green">Выручка: {e.profit} бублей</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">Выплата выручки происходит каждые 5 минут (один цикл).</p>
      </>
    ),
  },
  {
    title: '4. Заводы',
    icon: <Factory size={18} />,
    content: (
      <>
        <p>Завод — апгрейд предприятия:</p>
        <div className="bg-dark-700/50 rounded-lg p-3 mt-2">
          <div className="text-sm"><span className="text-gray-400">Вложения:</span> <strong>500 бублей</strong></div>
          <div className="text-sm mt-1"><span className="text-gray-400">Эффект:</span> <strong>+10% к базовой выручке предприятия (простые проценты)</strong></div>
        </div>
      </>
    ),
  },
  {
    title: '5. Акции',
    icon: <TrendingUp size={18} />,
    content: (
      <>
        <p>У каждого игрока 100% акций своей компании. Акции <strong>не приносят дохода каждый цикл</strong> — они считаются в самом конце игры.</p>
        <div className="bg-dark-700/50 rounded-lg p-3 mt-3">
          <p className="text-xs font-semibold text-white mb-1">Как работает расчёт акций:</p>
          <p className="text-xs text-gray-400">Стоимость акции в конце = <strong>финальный баланс игрока × процент акции</strong> (без учёта предприятий).</p>
          <p className="text-xs text-gray-400 mt-1">Пример: у игрока А в конце 1 000 бублей, вы владеете 20% его акций → вы получаете 200 бублей.</p>
        </div>
        <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-lg p-3 mt-2">
          <p className="text-xs text-accent-blue"><strong>Продажа акций:</strong> игрок продаёт акции банку (начальная цена 50 бублей за 10%). Далее банк выставляет их на аукцион. Итоговую продажу оформляет ведущий.</p>
        </div>
      </>
    ),
  },
  {
    title: '6. События',
    icon: <Bell size={18} />,
    content: (
      <>
        <p>Каждые 10 минут происходят события, влияющие на прибыль предприятий.</p>
        <p className="mt-2">Ведущий нажимает кнопку <strong>«Случайное»</strong> во вкладке «События» — система автоматически выбирает и активирует случайное неактивное событие.</p>
        <p className="mt-2 text-xs text-gray-400">Как предложение: генерировать одно позитивное, одно негативное событие. События разделены по категориям: Ферма, Овощи, Авто, Все направления и комбинации.</p>
      </>
    ),
  },
]

export default function HostRulesPage() {
  const [activeTab, setActiveTab] = useState<'platform' | 'rules'>('platform')
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]))

  const toggle = (idx: number) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const sections = activeTab === 'platform' ? platformSections : gameRulesSections

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue"><BookOpen size={24} /></div>
        <div>
          <h2 className="text-2xl font-bold">Инструкция для ведущего</h2>
          <p className="text-gray-500 text-sm">Как подготовить и провести игру STONKS GAME</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-dark-700/50 rounded-xl mb-6 w-fit">
        {(['platform', 'rules'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); setOpenSections(new Set([0])) }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'platform' ? '🖥 Использование платформы' : '📋 Правила проведения игры'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sections.map((section, i) => (
          <CollapsibleSection key={`${activeTab}-${i}`} section={section} index={i} isOpen={openSections.has(i)} toggle={() => toggle(i)} />
        ))}
      </div>

      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }} className="mt-8 text-center text-gray-600 text-sm">
        Успешной игры! 🎮📈
      </motion.div>
    </div>
  )
}
