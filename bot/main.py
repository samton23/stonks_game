import os
import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.client.default import DefaultBotProperties
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo,
    MenuButtonWebApp
)
from aiogram.enums import ParseMode

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://example.com/app")

bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()


def webapp_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="🎮 Открыть игру",
                web_app=WebAppInfo(url=WEBAPP_URL),
            ),
        ],
    ])


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    await message.answer(
        "📈  <b>STONKS GAME</b>\n"
        "━━━━━━━━━━━━━━━━━━━\n\n"
        "Добро пожаловать в игру!\n"
        "Нажмите кнопку ниже, чтобы открыть игровую панель.",
        reply_markup=webapp_keyboard(),
    )


async def on_startup():
    # Set menu button to open the web app
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🎮 Игра",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )
        )
        logger.info("Menu button set successfully")
    except Exception as e:
        logger.warning(f"Could not set menu button: {e}")


async def main():
    logger.info("Starting Stonks Game Bot...")
    logger.info(f"WebApp URL: {WEBAPP_URL}")
    await on_startup()
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
