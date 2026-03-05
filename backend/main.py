import os
import json
import random
import string
from sqlalchemy import inspect, text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from models import GameSetting, Enterprise, Notification, Player, PlayerStock, Event, GameLog
from routes import players, enterprises, settings, game, webapp, stocks, events, join
from routes.history import router as history_router


def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# Migrate tables if schema changed
_inspector = inspect(engine)
if _inspector.has_table("notifications"):
    existing_cols = {c["name"] for c in _inspector.get_columns("notifications")}
    if "player_id" not in existing_cols:
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE notifications"))

# Remove invitation_token column if exists
if _inspector.has_table("players"):
    existing_cols = {c["name"] for c in _inspector.get_columns("players")}
    if "invitation_token" in existing_cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE players DROP COLUMN IF EXISTS invitation_token"))
    # Add browser_token and make telegram_id nullable
    with engine.begin() as conn:
        if "browser_token" not in existing_cols:
            conn.execute(text("ALTER TABLE players ADD COLUMN browser_token VARCHAR(36) UNIQUE"))
        conn.execute(text("ALTER TABLE players ALTER COLUMN telegram_id DROP NOT NULL"))

# Create game_logs table if it doesn't exist yet
if not _inspector.has_table("game_logs"):
    Base.metadata.create_all(bind=engine, tables=[GameLog.__table__])

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Stonks Game API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router)
app.include_router(enterprises.router)
app.include_router(settings.router)
app.include_router(game.router)
app.include_router(webapp.router)
app.include_router(stocks.router)
app.include_router(events.router)
app.include_router(join.router)
app.include_router(history_router)


# --- Default events from the rules document ---
DEFAULT_EVENTS = [
    # === Farm events ===
    {"name": "Ливень с градом", "description": "Неожиданный ливень с градом размером с куриные яйца обрушился на поля ночью. Урожай превратился в кашу.", "affected_enterprises": "farm", "profit_modifier": 0.0, "duration_cycles": 2},
    {"name": "Лихорадка стада", "description": "Загадочная лихорадка поразила стадо за сутки, коровы кашляют и отказываются от еды. Ветеринары ввели карантин.", "affected_enterprises": "farm", "profit_modifier": 0.3, "duration_cycles": 3},
    {"name": "Наводнение пастбищ", "description": "Река вышла из берегов после ливней, затопив все пастбища на километры. Корм пропал.", "affected_enterprises": "farm", "profit_modifier": 0.0, "duration_cycles": 1},
    {"name": "Кража сена", "description": "Ночью тракторы соседей-призраков утащили половину сена через дыру в заборе.", "affected_enterprises": "farm", "profit_modifier": 0.5, "duration_cycles": 1},
    {"name": "Заморозки -25\u00b0C", "description": "Суровые -25\u00b0C заморозили траву на корню за ночь. Теплицы не выдержали.", "affected_enterprises": "farm", "profit_modifier": 0.0, "duration_cycles": 2},
    {"name": "\u2600\ufe0f \u0422\u0435\u043f\u043b\u043e\u0435 \u0441\u043e\u043b\u043d\u0446\u0435 \u0438 \u0434\u043e\u0436\u0434\u0438", "description": "Теплое солнце и timely дожди ускорили рост урожая вдвое. Рабочие собирают первые корзины раньше срока.", "affected_enterprises": "farm", "profit_modifier": 1.5, "duration_cycles": 2},
    {"name": "🌾 \u041f\u043b\u043e\u0434\u044b \u0440\u0430\u0437\u043c\u0435\u0440\u043e\u043c \u0441 \u0434\u044b\u043d\u0438", "description": "Семенной фонд дал плоды размером с дыни благодаря удачному климату. Покупатели выстроились в очередь.", "affected_enterprises": "farm", "profit_modifier": 2.0, "duration_cycles": 1},
    {"name": "💰 \u0413\u043e\u0441\u0441\u0443\u0431\u0441\u0438\u0434\u0438\u044f \u0436\u0438\u0432\u043e\u0442\u043d\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u0430", "description": "Правительство выделило 5 млн на развитие животноводства в регионе. Деньги пошли на корм и технику.", "affected_enterprises": "farm", "profit_modifier": 1.3, "duration_cycles": 3},
    {"name": "🐄 \u0418\u043c\u043f\u043e\u0440\u0442\u043d\u044b\u0435 \u043a\u043e\u0440\u043e\u0432\u044b", "description": "Импортные голштинские коровы дают на 40% больше молока ежедневно. Ферма превратилась в образцовую.", "affected_enterprises": "farm", "profit_modifier": 1.4, "duration_cycles": 2},
    {"name": "🛒 \u0422\u0440\u0435\u043d\u0434 \u0437\u0434\u043e\u0440\u043e\u0432\u043e\u0433\u043e \u043f\u0438\u0442\u0430\u043d\u0438\u044f", "description": "Модный тренд здорового питания поднял цены на натуральное мясо втрое. Супермаркеты раскупили всё за часы.", "affected_enterprises": "farm", "profit_modifier": 1.6, "duration_cycles": 1},
    # === Vegetable events ===
    {"name": "Жара +40\u00b0C", "description": "Жара +40\u00b0C без дождей высосала влагу из почвы за неделю. Ростки свернулись в трубочки.", "affected_enterprises": "vegetables", "profit_modifier": 0.0, "duration_cycles": 1},
    {"name": "Нашествие саранчи", "description": "Стаи саранчи и колорадского жука сожрали листья за ночь. Инсектициды прибыли слишком поздно.", "affected_enterprises": "vegetables", "profit_modifier": 0.4, "duration_cycles": 2},
    {"name": "Иней -8\u00b0C", "description": "Неожиданный иней -8\u00b0C ночью уничтожил нежные ростки помидоров и огурцов. Теплицы не спасли.", "affected_enterprises": "vegetables", "profit_modifier": 0.0, "duration_cycles": 1},
    {"name": "Токсины в воде", "description": "Соседний завод слил токсины в грунтовые воды, плоды деформированы. Экспертиза подтвердила яд.", "affected_enterprises": "vegetables", "profit_modifier": 0.2, "duration_cycles": 3},
    {"name": "Ураган 120 км/ч", "description": "Ураган 120 км/ч сорвал поликарбонатные крыши и стекла. Восстановление займёт недели.", "affected_enterprises": "vegetables", "profit_modifier": 0.0, "duration_cycles": 2},
    {"name": "🥕 \u041e\u043f\u0442\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u043b\u0438\u0432", "description": "Оптимальный полив каплями и солнце дали сочные морковки размером с руку. Урожай бьёт рекорды.", "affected_enterprises": "vegetables", "profit_modifier": 1.5, "duration_cycles": 2},
    {"name": "🥕 \u041e\u0431\u0438\u043b\u044c\u043d\u044b\u0435 \u043f\u043b\u043e\u0434\u044b", "description": "Грядки ломились от обильных плодов благодаря новой почве. Склады заполнены под завязку.", "affected_enterprises": "vegetables", "profit_modifier": 2.0, "duration_cycles": 1},
    {"name": "\u2708\ufe0f \u041a\u0438\u0442\u0430\u0439\u0441\u043a\u0438\u0439 \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442", "description": "Китайский ритейлер заказал 100 тонн свежих овощей по премиум-цене. Самолёты летают nonstop.", "affected_enterprises": "vegetables", "profit_modifier": 1.4, "duration_cycles": 3},
    {"name": "🏠 \u0413\u0438\u0434\u0440\u043e\u043f\u043e\u043d\u0438\u043a\u0430", "description": "Гидропонные конструкции с LED повысили урожайность на треть. Зимой тоже урожай.", "affected_enterprises": "vegetables", "profit_modifier": 1.3, "duration_cycles": 2},
    {"name": "📱 TikTok-\u0434\u0438\u0435\u0442\u0430", "description": "TikTok-диета с вашими овощами взорвала соцсети. Инфлюенсеры расхватали тонны.", "affected_enterprises": "vegetables", "profit_modifier": 1.7, "duration_cycles": 1},
    # === Auto events ===
    {"name": "Забастовка рабочих", "description": "Рабочие заблокировали конвейер пикетами из-за задержек зарплат. Производство встало полностью.", "affected_enterprises": "auto", "profit_modifier": 0.5, "duration_cycles": 2},
    {"name": "Поломка гидравлики", "description": "Гидравлика главного механизма лопнула посреди смены. Ремонтники работают круглосуточно.", "affected_enterprises": "auto", "profit_modifier": 0.0, "duration_cycles": 1},
    {"name": "Задержка поставок из Китая", "description": "Шторм в Китае задержал суда с чипами и сталью. Склад пустеет.", "affected_enterprises": "auto", "profit_modifier": 0.3, "duration_cycles": 3},
    {"name": "Пожар покрышек", "description": "Искра от сварки подожгла 10 000 покрышек, дым виден за 20 км. Пожарные тушили сутки.", "affected_enterprises": "auto", "profit_modifier": 0.3, "duration_cycles": 1},
    {"name": "Эконадзор остановил цех", "description": "Инспекторы Эконадзора остановили цех из-за превышения NOx. Штрафы и доработки впереди.", "affected_enterprises": "auto", "profit_modifier": 0.0, "duration_cycles": 2},
    {"name": "\u2b50 \u0421\u043f\u043e\u0440\u0442\u0438\u0432\u043d\u044b\u0439 \u0434\u0438\u0437\u0430\u0439\u043d", "description": "Спортивный дизайн покорил автосалоны, предзаказы на месяц вперёд. Рейтинг 5 звёзд.", "affected_enterprises": "auto", "profit_modifier": 2.0, "duration_cycles": 2},
    {"name": "📺 \u0412\u0438\u0440\u0443\u0441\u043d\u044b\u0439 \u0440\u043e\u043b\u0438\u043a", "description": "Вирусный ролик с дерзким дрифтом удвоил заказы дилеров. ТВ и YouTube в топе.", "affected_enterprises": "auto", "profit_modifier": 1.5, "duration_cycles": 1},
    {"name": "💸 \u041b\u044c\u0433\u043e\u0442\u044b \u043d\u0430 \u0430\u0432\u0442\u043e", "description": "Новые льготы на авто до 3 млн руб. оживили кредитные продажи. Дилеры в плюсе.", "affected_enterprises": "auto", "profit_modifier": 1.4, "duration_cycles": 3},
    {"name": "🤖 \u0420\u043e\u0431\u043e\u0442\u0438\u0437\u0430\u0446\u0438\u044f", "description": "Роботизированные руки ускорили сборку на треть без брака. Инвестиции окупились.", "affected_enterprises": "auto", "profit_modifier": 1.3, "duration_cycles": 2},
    {"name": "🏡 \u0413\u043e\u0441\u0437\u0430\u043a\u0443\u043f\u043a\u0430", "description": "Минобороны закупило 500 внедорожников для флота. Контракт на 2 млрд.", "affected_enterprises": "auto", "profit_modifier": 1.6, "duration_cycles": 1},
    # === All directions ===
    {"name": "Инфляция 25%", "description": "Цены на всё взлетели на 25%, съедая маржу. Покупатели жалуются на рост цен.", "affected_enterprises": "all", "profit_modifier": 0.7, "duration_cycles": 2},
    {"name": "Дефицит электроэнергии", "description": "Дефицит газа и света ввели график 12/12. Генераторы не справляются.", "affected_enterprises": "all", "profit_modifier": 0.5, "duration_cycles": 3},
    {"name": "Рецессия", "description": "Рецессия заставила потребителей отложить покупки. Склады забиты товаром.", "affected_enterprises": "all", "profit_modifier": 0.7, "duration_cycles": 1},
    {"name": "НДС 22%", "description": "Новый НДС 22% забрал львиную долю прибыли. Бухгалтерия в панике.", "affected_enterprises": "all", "profit_modifier": 0.6, "duration_cycles": 2},
    {"name": "Карантин в портах", "description": "Карантины в портах задержали грузы на недели. Контейнеры стоят на приколе.", "affected_enterprises": "all", "profit_modifier": 0.6, "duration_cycles": 1},
    {"name": "🚀 \u0420\u043e\u0441\u0442 \u0412\u0412\u041f 5%", "description": "ВВП вырос на 5%, рынок ожил спросом. Банки кредитуют все подряд.", "affected_enterprises": "all", "profit_modifier": 1.3, "duration_cycles": 2},
    {"name": "💰 \u0421\u0442\u0430\u0431\u0438\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u0440\u0443\u0431\u043b\u044f", "description": "ЦБ стабилизировал рубль, маржа восстановилась. Прогнозы радужные.", "affected_enterprises": "all", "profit_modifier": 1.2, "duration_cycles": 3},
    {"name": "🔥 Black Friday", "description": "Black Friday удвоил продажи всех товаров. Кассы дымятся.", "affected_enterprises": "all", "profit_modifier": 1.5, "duration_cycles": 1},
    {"name": "\u2705 \u0421\u0442\u0430\u0442\u0443\u0441 \u0421\u042d\u0417", "description": "СЭЗ статус дал вычеты на 15%. Бизнес вздохнул свободно.", "affected_enterprises": "all", "profit_modifier": 1.25, "duration_cycles": 2},
    {"name": "🚚 \u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442\u044b \u0441 \u0410\u0437\u0438\u0435\u0439", "description": "Новые контракты с Азией наладили логистику. Склады полны без задержек.", "affected_enterprises": "all", "profit_modifier": 1.4, "duration_cycles": 1},
    # === Farm + Vegetables ===
    {"name": "Засуха 100 км\u00b2", "description": "Солнце испепелило поля на 100 км\u00b2 без единой капли. Скважины пересохли.", "affected_enterprises": "farm_vegetables", "profit_modifier": 0.0, "duration_cycles": 2},
    {"name": "Лесной пожар", "description": "Искра от детского костра перекинулась на сухую траву. 200 га сгорело дотла.", "affected_enterprises": "farm_vegetables", "profit_modifier": 0.5, "duration_cycles": 2},
    {"name": "Потоп", "description": "Потоп смыл грядки и пастбища, вода стоит по колено. Техника утонула.", "affected_enterprises": "farm_vegetables", "profit_modifier": 0.3, "duration_cycles": 1},
    {"name": "Скандал с нитратами", "description": "СМИ раздули историю о нитратах в продукции. Бойкот ритейлеров ударил.", "affected_enterprises": "farm_vegetables", "profit_modifier": 0.3, "duration_cycles": 3},
    {"name": "Дефицит рабочих", "description": "Мигранты отказались от полей из-за жары. Собранный урожай гниёт.", "affected_enterprises": "farm_vegetables", "profit_modifier": 0.4, "duration_cycles": 2},
    {"name": "🛒 \u041f\u0440\u0430\u0437\u0434\u043d\u0438\u0447\u043d\u044b\u0435 \u043f\u0440\u043e\u0434\u0430\u0436\u0438", "description": "Праздники подстегнули продажи мяса и овощей. Супермаркеты удвоили заказы.", "affected_enterprises": "farm_vegetables", "profit_modifier": 1.5, "duration_cycles": 2},
    {"name": "🔬 \u041d\u043e\u0432\u044b\u0439 \u0443\u0434\u043e\u0431\u0440\u0438\u0442\u0435\u043b\u044c", "description": "Новый удобритель от НИИ удвоил урожай без химии. Патент в кармане.", "affected_enterprises": "farm_vegetables", "profit_modifier": 1.4, "duration_cycles": 3},
    {"name": "🎉 \u042f\u0440\u043c\u0430\u0440\u043a\u0430", "description": "Толпы на ярмарке купили весь запас за день. Фургоны уехали пустыми.", "affected_enterprises": "farm_vegetables", "profit_modifier": 1.5, "duration_cycles": 1},
    {"name": "\u2600\ufe0f \u0418\u0434\u0435\u0430\u043b\u044c\u043d\u044b\u0439 \u043a\u043b\u0438\u043c\u0430\u0442", "description": "Дожди по расписанию и солнце создали рай для растений. Рекордные тонны собраны.", "affected_enterprises": "farm_vegetables", "profit_modifier": 1.6, "duration_cycles": 2},
    {"name": "🤝 \u041e\u0431\u044a\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u0435 \u0444\u0435\u0440\u043c", "description": "Объединение 10 ферм подняло цены на опте. Сеть Metro в клиентах.", "affected_enterprises": "farm_vegetables", "profit_modifier": 1.3, "duration_cycles": 3},
    # === Farm + Auto ===
    {"name": "Санкции на цепочки", "description": "Глобальные цепочки рванули из-за санкций. Запасы на исходе.", "affected_enterprises": "farm_auto", "profit_modifier": 0.5, "duration_cycles": 2},
    {"name": "Авария на трассе М4", "description": "Авария на трассе М4 заблокировала 50 км. Грузы стоят.", "affected_enterprises": "farm_auto", "profit_modifier": 0.0, "duration_cycles": 1},
    {"name": "Забастовка водителей", "description": "Водители бастуют у терминалов массово. Холодильники пустеют.", "affected_enterprises": "farm_auto", "profit_modifier": 0.4, "duration_cycles": 3},
    {"name": "Проверка инспекторов", "description": "Инспекторы приостановили операции по жалобам. Протоколы на доработку.", "affected_enterprises": "farm_auto", "profit_modifier": 0.6, "duration_cycles": 2},
    {"name": "Очереди на АЗС", "description": "Очереди на АЗС парализовали перевозки. Тракторы встали.", "affected_enterprises": "farm_auto", "profit_modifier": 0.3, "duration_cycles": 1},
    {"name": "\u26fd \u0417\u0435\u043b\u0451\u043d\u043e\u0435 \u0442\u043e\u043f\u043b\u0438\u0432\u043e", "description": "Ферма снабжает авто зелёным топливом из отходов. Эко-грант 10 млн.", "affected_enterprises": "farm_auto", "profit_modifier": 1.4, "duration_cycles": 2},
    {"name": "🚛 \u041d\u043e\u0432\u044b\u0435 \u0442\u0440\u0430\u0441\u0441\u044b", "description": "Новые трассы и дроны ускорили доставку вдвое. Время в пути -50%.", "affected_enterprises": "farm_auto", "profit_modifier": 1.5, "duration_cycles": 1},
    {"name": "🌿 \u0413\u0440\u0430\u043d\u0442 \u0415\u0421", "description": "Грант ЕС на устойчивость окупился продажами. Сертификат в портфолио.", "affected_enterprises": "farm_auto", "profit_modifier": 1.3, "duration_cycles": 3},
    {"name": "🏢 \u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442 \u0413\u0430\u0437\u043f\u0440\u043e\u043c\u0430", "description": "Газпром купил ферму и 200 грузовиков. Контракт на 3 года.", "affected_enterprises": "farm_auto", "profit_modifier": 1.5, "duration_cycles": 2},
    {"name": "🔗 \u042d\u043a\u043e-\u0442\u0440\u0430\u043a\u0442\u043e\u0440\u044b", "description": "Корма стали запчастями для эко-тракторов. ERP интегрирована.", "affected_enterprises": "farm_auto", "profit_modifier": 1.35, "duration_cycles": 2},
    # === Vegetables + Auto ===
    {"name": "Подорожание сырья x2", "description": "Сырье подорожало вдвое из-за дефицита. Маржа съедена.", "affected_enterprises": "vegetables_auto", "profit_modifier": 0.4, "duration_cycles": 2},
    {"name": "Диверсия на топливо", "description": "Конкуренты подрезали топливо в цистернах. Полиция ищет.", "affected_enterprises": "vegetables_auto", "profit_modifier": 0.0, "duration_cycles": 1},
    {"name": "Эко-штрафы 5 млн", "description": "Эко-штрафы 5 млн за свалку ударили. Суд в процессе.", "affected_enterprises": "vegetables_auto", "profit_modifier": 0.5, "duration_cycles": 3},
    {"name": "Буря повредила оборудование", "description": "Буря повредила насосы и ленты синхронно. Запчасти в пути.", "affected_enterprises": "vegetables_auto", "profit_modifier": 0.3, "duration_cycles": 2},
    {"name": "Рост цен на компоненты 60%", "description": "Цены на компоненты взмыли на 60%. Контракты под вопросом.", "affected_enterprises": "vegetables_auto", "profit_modifier": 0.6, "duration_cycles": 1},
    {"name": "🥗 \u0414\u0438\u0435\u0442\u044b \u0438 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043a\u0430\u0440\u044b", "description": "Диеты и электрокары в тренде. WHO кампания помогла.", "affected_enterprises": "vegetables_auto", "profit_modifier": 1.45, "duration_cycles": 2},
    {"name": "\u267b\ufe0f \u0411\u0438\u043e-\u043f\u043b\u0430\u0441\u0442\u0438\u043a", "description": "Овощные отходы стали био-пластиком для авто. Патент продан BASF.", "affected_enterprises": "vegetables_auto", "profit_modifier": 1.4, "duration_cycles": 3},
    {"name": "📣 \u0417\u0435\u043b\u0451\u043d\u044b\u0439 \u0433\u043e\u0440\u043e\u0434", "description": "Кампания \"Зелёный город\" взорвала продажи. Billboard в топе.", "affected_enterprises": "vegetables_auto", "profit_modifier": 1.5, "duration_cycles": 1},
    {"name": "📦 \u0411\u0438\u043e-\u0443\u043f\u0430\u043a\u043e\u0432\u043a\u0430", "description": "Био-пластик из кожуры привлёк премиум-клиентов. Упаковка хитом.", "affected_enterprises": "vegetables_auto", "profit_modifier": 1.5, "duration_cycles": 2},
    {"name": "💡 \u0418\u043d\u0432\u0435\u0441\u0442\u0438\u0446\u0438\u0438 \u0432 R&D", "description": "Инвесторы профинансировали конвейер для био-деталей. R&D окупается.", "affected_enterprises": "vegetables_auto", "profit_modifier": 1.3, "duration_cycles": 3},
]


# --- Default host rules ---
DEFAULT_HOST_RULES = {
    "stocks": "Покупка акций банком: Если игрок продает акции банку в поле \u00abИгроки\u00bb ставим Банк, в поле операции соответствующий номер покупки акций. Далее если эти акции идут на торги и продаются: фильтруешь столбец \u00abИгроки\u00bb по игроку Банк и заменяешь его на купившего акции.\n\nНачальная цена за 10% \u2014 50 бублей\n\n!ВАЖНО! Акции ставим лотами по 10% и продаем также",
    "intro": "У вас есть ровно два часа, чтобы превратить 100 бублей во всё, что сможете.\n\nВы можете стать производственником: строить, расширяться, запускать конвейеры, которые будут клепать другие конвейеры. Ваша сила \u2014 в железе и темпе. Ваш риск \u2014 быть сметённым рыночным штормом.\n\nИли вы можете стать рантье: скупать доли, торговать бумагами и жить на дивиденды с чужих побед. Ваша сила \u2014 в холодном расчёте. Ваш риск \u2014 поставить не на того.\n\nОдни будут создавать реальность. Другие \u2014 владеть ею.\n\nВыберите свою сторону. И помните: время уже тикает.",
    "rules": "Короче, по сути это margin game, в которой побеждает команда или игрок, заработавший больше всех денег к концу игры. У каждого в начале есть 100 бублей наличными и 100% акций своей компании. С этими деньгами можно запустить производство овощей (самый простой старт), накопить капитал или продать часть акций через ведущего по фиксированной цене 50 бублей за 10% акций, чтобы вложиться в более прибыльные направления.",
    "enterprises": "Игроки выбирают три основных направления с разными вложениями, периодами производства и выручкой. Выплата выручки происходит каждые 5 минут.\n\nОвощи/консервы:\n\u2022 Вложения: 100 бублей\n\u2022 Выручка: 200 бублей\n\nФерма:\n\u2022 Вложения: 500 бублей\n\u2022 Выручка: 700 бублей\n\nАвтомобили:\n\u2022 Вложения: 200 бублей\n\u2022 Выручка: 450 бублей",
    "factories": "Заводы:\n\u2022 Вложения: 500 бублей\n\u2022 Выручка: +10% к выбранному направлению от базовой выручки (Простые проценты)",
    "events": "Каждые 10 минут происходят события.\n\nЧтобы выбрать событие генерируй на сайте рандомайзера, при этом выбирай генерацию \u00abиз списка\u00bb и в поле вставляй последовательность: 1,2,2,2,2,3,3,4,5,5,5,6,7,7.\n\nНиже события, среди которых можешь выбирать (со смайликами это позитивные). Как предложение: генерировать 2 случайных числа и брать одно позитивное, одно негативное.\n\nСобытия разделены по категориям: Ферма, Овощи, Авто, Все направления, Ферма+Овощи, Ферма+Авто, Овощи+Авто."
}


@app.on_event("startup")
def seed_defaults():
    db = SessionLocal()
    try:
        # Ensure default settings
        defaults = {
            "rules": "Правила игры будут добавлены организатором.",
            "budget": "10000",
            "current_cycle": "0",
            # Timer settings
            "timer_running": "false",
            "game_timer_end": "0",
            "cycle_timer_end": "0",
            "game_timer_remaining": "3600",
            "cycle_timer_remaining": "300",
            "game_timer_duration": "3600",
            "cycle_timer_duration": "300",
            # Game settings
            "total_cycles": "12",
            "game_finished": "false",
            # Stock settings
            "stock_price": "50",
            # Room code for browser join
            "room_code": generate_room_code(),
            # Host rules
            "host_rules": json.dumps(DEFAULT_HOST_RULES, ensure_ascii=False),
        }
        for key, value in defaults.items():
            existing = db.query(GameSetting).filter(GameSetting.key == key).first()
            if not existing:
                db.add(GameSetting(key=key, value=value))

        # Seed default enterprises if none exist
        if db.query(Enterprise).count() == 0:
            default_enterprises = [
                Enterprise(
                    name="Овощное",
                    emoji="🥬",
                    price=100,
                    profit=200,
                    profit_cycle_interval=1,
                    factory_price=500,
                    factory_profit_percent=10,
                ),
                Enterprise(
                    name="Автомобильное",
                    emoji="🚗",
                    price=200,
                    profit=450,
                    profit_cycle_interval=1,
                    factory_price=500,
                    factory_profit_percent=10,
                ),
                Enterprise(
                    name="Фермерское",
                    emoji="🌾",
                    price=500,
                    profit=700,
                    profit_cycle_interval=1,
                    factory_price=500,
                    factory_profit_percent=10,
                ),
            ]
            for ent in default_enterprises:
                db.add(ent)

        # Ensure all players have self-stock records
        players = db.query(Player).all()
        for player in players:
            self_stock = db.query(PlayerStock).filter(
                PlayerStock.owner_id == player.id,
                PlayerStock.target_player_id == player.id,
            ).first()
            if not self_stock:
                db.add(PlayerStock(
                    owner_id=player.id,
                    target_player_id=player.id,
                    percentage=100,
                ))

        # Seed default events if none exist
        if db.query(Event).count() == 0:
            # We need to resolve enterprise names to IDs after they are committed
            db.commit()
            # Get enterprise name->id mapping
            all_ents = db.query(Enterprise).all()
            ent_map = {}
            for e in all_ents:
                name_lower = e.name.lower()
                if "овощ" in name_lower:
                    ent_map["vegetables"] = e.id
                elif "ферм" in name_lower:
                    ent_map["farm"] = e.id
                elif "автомоб" in name_lower or "авто" in name_lower:
                    ent_map["auto"] = e.id

            for evt_data in DEFAULT_EVENTS:
                affected_key = evt_data["affected_enterprises"]
                if affected_key == "all":
                    affected_ids = "all"
                elif affected_key == "farm":
                    affected_ids = json.dumps([ent_map.get("farm", 0)])
                elif affected_key == "vegetables":
                    affected_ids = json.dumps([ent_map.get("vegetables", 0)])
                elif affected_key == "auto":
                    affected_ids = json.dumps([ent_map.get("auto", 0)])
                elif affected_key == "farm_vegetables":
                    affected_ids = json.dumps([ent_map.get("farm", 0), ent_map.get("vegetables", 0)])
                elif affected_key == "farm_auto":
                    affected_ids = json.dumps([ent_map.get("farm", 0), ent_map.get("auto", 0)])
                elif affected_key == "vegetables_auto":
                    affected_ids = json.dumps([ent_map.get("vegetables", 0), ent_map.get("auto", 0)])
                else:
                    affected_ids = "all"

                db.add(Event(
                    name=evt_data["name"],
                    description=evt_data["description"],
                    affected_enterprises=affected_ids if isinstance(affected_ids, str) else json.dumps(affected_ids),
                    profit_modifier=evt_data["profit_modifier"],
                    duration_cycles=evt_data["duration_cycles"],
                    remaining_cycles=0,
                    is_active=False,
                ))

        db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
