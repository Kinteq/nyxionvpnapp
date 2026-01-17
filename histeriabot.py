import os
import json
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict
import math
import aiohttp
from aiohttp import web
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, BufferedInputFile
import qrcode
from api_endpoints import setup_api_routes
from io import BytesIO

# ===== КОНФИГУРАЦИЯ =====

# Telegram

TELEGRAM_BOT_TOKEN = "8011671501:AAH9nxyd-pXbPHDqc2lyl5LUiYEz-mg875I"
ADMIN_ID = 1474669885

# Crypto Pay

CRYPTO_PAY_API_TOKEN = "513647:AAv2qN58YYe5pKqg2LFYFCE2sS6JKp6DcQT"

# Blitz Panel

BLITZ_API_URL = "http://127.0.0.1:28260/d2ce3fdd4039c6d7cb2b14caa3631edd"
BLITZ_API_TOKEN = "b443514c2528155c37d8fa3e7f6f8c81fca8dbbff956ead0e483e2769ddeb5ff"

# Ngrok

NGROK_AUTHTOKEN = "384IPiiT7SXZ7jDmNocTkSLbsTH_2ymBTPZA1EhLVy1rg1iyd"
NGROK_DOMAIN = "undiscouragingly-validatory-myrtie.ngrok-free.dev"  # Ваш зарезервированный домен
MANUAL_WEBHOOK_URL = "http://62.60.217.189:3333/webhook"  # Прямой IP VPS на порту 3333

# Настройки VPN

VPN_PRICES = {
    "TON": "1",
    "USDT": "1.5",
    "BTC": "0.000015",
    "ETH": "0.0004",
    "USDC": "1.5"
}
VPN_TRAFFIC_GB = 0  # 0 = безлимит
VPN_DAYS = 30

# ===== ЛОГИРОВАНИЕ =====

logging.basicConfig(
level=logging.INFO,
format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
handlers=[
logging.FileHandler('bot.log', encoding='utf-8'),
logging.StreamHandler()
]
)
logger = logging.getLogger(__name__)

# ===== FSM STATES =====

class PaymentStates(StatesGroup):
  waiting_payment = State()
  choosing_currency = State()

class BroadcastStates(StatesGroup):
  waiting_message = State()

# ===== ХРАНИЛИЩЕ ДАННЫХ =====

pending_payments: Dict[int, dict] = {}  # invoice_id -> user_data
active_subscriptions: Dict[int, dict] = {}  # user_id -> subscription_info
retry_payments: Dict[int, dict] = {}  # user_id -> payment_data for retry
payment_timers: Dict[int, dict] = {}  # user_id -> {invoice_id, task, expires_at}
WEBHOOK_PUBLIC_URL = None

SUBSCRIPTIONS_FILE = 'subscriptions.json'

def load_subscriptions():
    global active_subscriptions
    if os.path.exists(SUBSCRIPTIONS_FILE):
        try:
            with open(SUBSCRIPTIONS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Преобразуем строки дат обратно в datetime
                for uid, sub in data.items():
                    if 'expiry_date' in sub:
                        sub['expiry_date'] = datetime.fromisoformat(sub['expiry_date'])
                    if 'created_at' in sub:
                        sub['created_at'] = datetime.fromisoformat(sub['created_at'])
                active_subscriptions = {int(uid): sub for uid, sub in data.items()}
                logger.info(f"Loaded {len(active_subscriptions)} subscriptions")
        except Exception as e:
            logger.error(f"Error loading subscriptions: {e}")

def save_subscriptions():
    try:
        data = {}
        for uid, sub in active_subscriptions.items():
            sub_copy = sub.copy()
            # Преобразуем datetime в строки
            if 'expiry_date' in sub_copy and isinstance(sub_copy['expiry_date'], datetime):
                sub_copy['expiry_date'] = sub_copy['expiry_date'].isoformat()
            if 'created_at' in sub_copy and isinstance(sub_copy['created_at'], datetime):
                sub_copy['created_at'] = sub_copy['created_at'].isoformat()
            data[str(uid)] = sub_copy
        with open(SUBSCRIPTIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved {len(active_subscriptions)} subscriptions")
    except Exception as e:
        logger.error(f"Error saving subscriptions: {e}")

# ===== CRYPTO PAY API =====

class CryptoPayAPI:
  def __init__(self, token: str):
    self.token = token
    self.base_url = "https://pay.crypt.bot/api"
    self.headers = {"Crypto-Pay-API-Token": token}

  async def create_invoice(self, amount: str, user_id: int, description: str, asset: str = "NOT") -> dict:
    """Создать инвойс"""
    async with aiohttp.ClientSession() as session:
        payload = {
            "asset": asset,
            "amount": amount,
            "description": description,
            "payload": str(user_id),
            "allow_comments": False,
            "allow_anonymous": False,
            "expires_in": 3600
        }
        async with session.post(
            f"{self.base_url}/createInvoice",
            headers=self.headers,
            json=payload
        ) as resp:
            data = await resp.json()
            if data.get("ok"):
                logger.info(f"✅ Invoice created: {data['result']['invoice_id']}")
                return data["result"]
            else:
                logger.error(f"❌ Crypto Pay error: {data}")
                raise Exception(f"Failed to create invoice")

  async def get_invoices(self, invoice_ids: str = None) -> list:
    """Получить инвойсы"""
    async with aiohttp.ClientSession() as session:
        params = {"invoice_ids": invoice_ids} if invoice_ids else {}
        async with session.get(
            f"{self.base_url}/getInvoices",
            headers=self.headers,
            params=params
        ) as resp:
            data = await resp.json()
            if data.get("ok"):
                return data["result"].get("items", [])
            else:
                logger.error(f"❌ Crypto Pay error: {data}")
                return []


# ===== BLITZ API =====

class BlitzAPI:
  def __init__(self, base_url: str, api_token: str):
    self.base_url = base_url.rstrip('/')
    self.headers = {
      "Authorization": api_token,
      "Content-Type": "application/json"
    }

  async def test_connection(self) -> bool:
    """Проверка подключения"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/api/v1/server/status",
                headers=self.headers,
                ssl=False  # Для самоподписанных сертификатов
            ) as resp:
                if resp.status == 200:
                    logger.info("✅ Blitz API connected")
                    return True
                logger.error(f"❌ Blitz API error: {resp.status}")
                return False
    except Exception as e:
        logger.error(f"❌ Blitz connection error: {e}")
        return False

  async def create_user(self, username: str, traffic_gb: int, expiry_days: int) -> dict:
    """Создать пользователя"""
    async with aiohttp.ClientSession() as session:
        # Если traffic_gb = 0, используем максимальное значение int32 для безлимита
        traffic_bytes = 2147483647 if traffic_gb == 0 else traffic_gb * 1024 * 1024 * 1024  # 2GB - 1 для unlimited
        
        payload = {
            "username": username,
            "traffic_limit": traffic_bytes,
            "expiration_days": expiry_days,
            "unlimited": False
        }
        
        logger.info(f"Creating user: {username}, traffic: {'unlimited' if traffic_gb == 0 else f'{traffic_gb}GB'}")
        
        async with session.post(
            f"{self.base_url}/api/v1/users/",
            headers=self.headers,
            json=payload,
            ssl=False
        ) as resp:
            if resp.status in [200, 201]:
                logger.info(f"✅ User created: {username}")
                created = await resp.json()
                # Попытка применить лимит IP (если поддерживается)
                try:
                    await self.set_inactive_ip_limit(username, limit=3, enabled=True)
                except Exception as e:
                    logger.warning(f"IP limit not applied for {username}: {e}")
                return created
            elif resp.status == 409:
                # Пользователь уже существует
                logger.info(f"User {username} already exists")
                return {"exists": True}
            else:
                error = await resp.text()
                logger.error(f"❌ Create user failed: {error}")
                raise Exception(f"Failed to create user: {error}")

  async def get_user_uri(self, username: str) -> str:
    """Получить URI ключ"""
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{self.base_url}/api/v1/users/{username}/uri",
            headers=self.headers,
            ssl=False
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                uri = data.get("ipv4") or data.get("ipv6") or data.get("uri", "")
                if not uri:
                    logger.warning(f"URI not generated for user {username}, data: {data}")
                    return "URI not available, please check Hysteria2 configuration"
                return uri
            raise Exception(f"Failed to get URI, status: {resp.status}")

  async def get_user(self, username: str) -> dict:
    """Получить информацию о пользователе"""
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{self.base_url}/api/v1/users/{username}",
            headers=self.headers,
            ssl=False
        ) as resp:
            if resp.status == 200:
                return await resp.json()
            elif resp.status == 404:
                return None
            else:
                logger.error(f"Failed to get user {username}: HTTP {resp.status}")
                return None

  async def delete_user(self, username: str) -> bool:
    """Удалить пользователя"""
    async with aiohttp.ClientSession() as session:
        async with session.delete(
            f"{self.base_url}/api/v1/users/{username}",
            headers=self.headers,
            ssl=False
        ) as resp:
            return resp.status in [200, 204]

  async def edit_user(self, username: str, new_expiration_days: int) -> bool:
    """Редактировать пользователя (продлить подписку)"""
    async with aiohttp.ClientSession() as session:
        # Сначала попробуем PUT
        payload = {
            "expiration_days": new_expiration_days
        }
        
        logger.info(f"Attempting PUT to edit user {username} with payload: {payload}")
        
        async with session.put(
            f"{self.base_url}/api/v1/users/{username}",
            headers=self.headers,
            json=payload,
            ssl=False
        ) as resp:
            response_text = await resp.text()
            logger.info(f"PUT response status: {resp.status}, body: {response_text}")
            
            if resp.status == 200:
                logger.info(f"✅ User {username} extended to {new_expiration_days} days via PUT")
                return True
        
        # Если PUT не сработал, попробуем PATCH
        logger.warning(f"PUT failed, trying PATCH for user {username}")
        
        async with session.patch(
            f"{self.base_url}/api/v1/users/{username}",
            headers=self.headers,
            json=payload,
            ssl=False
        ) as patch_resp:
            patch_response_text = await patch_resp.text()
            logger.info(f"PATCH response status: {patch_resp.status}, body: {patch_response_text}")
            
            if patch_resp.status == 200:
                logger.info(f"✅ User {username} extended to {new_expiration_days} days via PATCH")
                return True
        
        # Если ничего не сработало, попробуем пересоздать пользователя
        logger.warning(f"All edit methods failed, attempting to recreate user {username}")
        
        # Удаляем старого пользователя
        await session.delete(
            f"{self.base_url}/api/v1/users/{username}",
            headers=self.headers,
            ssl=False
        )
        
        # Создаем нового с новыми expiration_days
        traffic_bytes = 2147483647 if VPN_TRAFFIC_GB == 0 else VPN_TRAFFIC_GB * 1024 * 1024 * 1024
        
        create_payload = {
            "username": username,
            "traffic_limit": traffic_bytes,
            "expiration_days": new_expiration_days,
            "unlimited": False
        }
        
        logger.info(f"Recreating user {username} with payload: {create_payload}")
        
        async with session.post(
            f"{self.base_url}/api/v1/users/",
            headers=self.headers,
            json=create_payload,
            ssl=False
        ) as create_resp:
            create_response_text = await create_resp.text()
            logger.info(f"Recreate response status: {create_resp.status}, body: {create_response_text}")
            
            if create_resp.status in [200, 201]:
                logger.info(f"✅ User {username} recreated with {new_expiration_days} days")
                return True
            else:
                logger.error(f"❌ Failed to recreate user {username}: HTTP {create_resp.status} - {create_response_text}")
                return False


  async def extend_user(self, username: str, days_to_add: int) -> bool:
    """Продлить подписку пользователя на указанное количество дней БЕЗ пересоздания (сохраняет URI)"""
    async with aiohttp.ClientSession() as session:
        try:
            # Получаем текущие данные пользователя
            async with session.get(
                f"{self.base_url}/api/v1/users/{username}",
                headers=self.headers,
                ssl=False
            ) as get_resp:
                if get_resp.status != 200:
                    logger.error(f"Failed to get user {username}: HTTP {get_resp.status}")
                    return False
                
                user_data = await get_resp.json()
                current_expiration = user_data.get('expiration_days', 0)
                logger.info(f"Current user {username} has {current_expiration} days")
            
            # Вычисляем новые expiration_days
            new_expiration_days = current_expiration + days_to_add
            
            # Используем edit_user вместо delete+recreate (сохраняет URI и ключ!)
            logger.info(f"Extending user {username} from {current_expiration} to {new_expiration_days} days via edit")
            success = await self.edit_user(username, new_expiration_days)
            
            if success:
                logger.info(f"✅ User {username} extended by {days_to_add} days (total: {new_expiration_days})")
                return True
            else:
                logger.error(f"❌ Failed to extend user {username}")
                return False
                    
        except Exception as e:
            logger.error(f"Exception in extend_user for {username}: {e}")
            return False

  async def set_inactive_ip_limit(self, username: str, limit: int = 3, enabled: bool = True) -> bool:
    """Включить/настроить лимит IP для пользователя (бэкенд-ограничение на одновременные IP)."""
    async with aiohttp.ClientSession() as session:
        payload = {"limit": int(limit), "enabled": bool(enabled)}
        async with session.patch(
            f"{self.base_url}/api/v1/users/{username}/inactivelimit",
            headers=self.headers,
            json=payload,
            ssl=False
        ) as resp:
            if resp.status in [200, 204]:
                logger.info(f"✅ Set inactive IP limit for {username}: {payload}")
                return True
            txt = await resp.text()
            logger.warning(f"⚠️ Failed to set IP limit for {username}: {resp.status} {txt}")
            return False


# ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

async def generate_qr_code(data: str) -> BytesIO:
    """Генерирует QR-код для платежа"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    bio = BytesIO()
    bio.name = 'qr.png'
    img.save(bio, 'PNG')
    bio.seek(0)
    return bio

async def check_payment_status(invoice_id: int, user_id: int) -> bool:
    """Проверяет статус платежа через API"""
    try:
        invoices = await crypto_pay.get_invoices(invoice_ids=str(invoice_id))
        if invoices:
            invoice = invoices[0]
            status = invoice.get("status")
            logger.info(f"Payment status for invoice {invoice_id}: {status}")
            return status == "paid"
        return False
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        return False

async def payment_waiting_task(user_id: int, invoice_id: int, pay_url: str, expires_in: int):
    """Фоновая задача для отслеживания оплаты и уведомлений"""
    try:
        # Ждем 30 секунд перед первой проверкой
        await asyncio.sleep(30)
        
        # Проверяем каждые 15 секунд в течение времени действия инвойса
        checks = 0
        max_checks = expires_in // 15
        
        while checks < max_checks:
            # Проверяем статус
            is_paid = await check_payment_status(invoice_id, user_id)
            
            if is_paid:
                logger.info(f"Payment detected via polling for user {user_id}")
                # Платеж обнаружен, очищаем таймер
                if user_id in payment_timers:
                    del payment_timers[user_id]
                return
            
            # Отправляем напоминание каждые 5 минут
            if checks > 0 and checks % 20 == 0:  # 20 * 15 сек = 5 минут
                try:
                    keyboard = InlineKeyboardMarkup(inline_keyboard=[
                        [InlineKeyboardButton(text="💳 Оплатить", url=pay_url)],
                        [InlineKeyboardButton(text="🔄 Проверить оплату", callback_data=f"check_payment_{invoice_id}")],
                        [InlineKeyboardButton(text="❌ Отменить", callback_data="buy_vpn")]
                    ])
                    
                    await bot.send_message(
                        user_id,
                        f"⏰ <b>Напоминание об оплате</b>\n\n"
                        f"Ваш платеж еще не обнаружен.\n"
                        f"Пожалуйста, завершите оплату.",
                        parse_mode="HTML",
                        reply_markup=keyboard
                    )
                except Exception as e:
                    logger.error(f"Failed to send reminder to user {user_id}: {e}")
            
            checks += 1
            await asyncio.sleep(15)
        
        # Время истекло
        logger.info(f"Payment timeout for user {user_id}, invoice {invoice_id}")
        
        try:
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="💳 Создать новый платеж", callback_data="buy_vpn")]
            ])
            
            await bot.send_message(
                user_id,
                f"⏱ <b>Время оплаты истекло</b>\n\n"
                f"Платежная ссылка больше не действительна.\n"
                f"Создайте новый платеж, если хотите приобрести VPN.",
                parse_mode="HTML",
                reply_markup=keyboard
            )
        except Exception as e:
            logger.error(f"Failed to send timeout message to user {user_id}: {e}")
        
        # Очищаем данные
        if user_id in payment_timers:
            del payment_timers[user_id]
        if invoice_id in pending_payments:
            del pending_payments[invoice_id]
            
    except Exception as e:
        logger.error(f"Error in payment_waiting_task for user {user_id}: {e}")

async def update_user_key_from_api(user_id: int) -> bool:
    """Обновляет ключ пользователя из Blitz API"""
    if user_id not in active_subscriptions:
        return False
    
    username = f"vpn_{user_id}"
    
    try:
        # Получаем свежий ключ из Blitz API
        fresh_uri = await blitz.get_user_uri(username)
        
        if fresh_uri and fresh_uri != "URI not available, please check Hysteria2 configuration":
            # Обновляем ключ в памяти
            active_subscriptions[user_id]['vpn_uri'] = fresh_uri
            save_subscriptions()
            logger.info(f"Updated VPN key for user {user_id} from Blitz API")
            return True
        else:
            logger.warning(f"Failed to get fresh URI for user {username}")
            return False
    except Exception as e:
        logger.error(f"Error updating key for user {user_id}: {e}")
        return False

async def verify_user_in_panel(user_id: int) -> bool:
    """Проверяет существование пользователя в Blitz панели"""
    if user_id not in active_subscriptions:
        return False
    
    username = f"vpn_{user_id}"
    try:
        user_data = await blitz.get_user(username)
        if user_data is None:
            logger.warning(f"User {username} not found in Blitz panel; removing from local DB")
            active_subscriptions.pop(user_id, None)
            save_subscriptions()
            return False
        return True
    except Exception as e:
        logger.error(f"Error verifying user {user_id} in panel: {e}")
        return False

async def update_subscription_from_api(user_id: int) -> bool:
    """Обновляет подписку пользователя из Blitz API (expiry_date и ключ)"""
    if user_id not in active_subscriptions:
        return False
    username = f"vpn_{user_id}"
    try:
        user_data = await blitz.get_user(username)
        
        if user_data is None:
            logger.warning(f"User {username} not found in Blitz; removing local subscription")
            active_subscriptions.pop(user_id, None)
            save_subscriptions()
            return False
        
        logger.info(f"User {username} API data: {user_data}")
        if 'expires_at' in user_data:
            expires_at_str = user_data.get('expires_at')
            if expires_at_str:
                new_expiry = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                if new_expiry.tzinfo is None:
                    new_expiry = new_expiry.replace(tzinfo=timezone.utc)
                active_subscriptions[user_id]['expiry_date'] = new_expiry
                logger.info(f"Updated subscription for user {user_id}: expiry_date from expires_at {new_expiry}")
            else:
                logger.warning(f"expires_at is empty for user {username}")
        else:
            expiration_days = user_data.get('expiration_days', 0)
            new_expiry = datetime.now(timezone.utc) + timedelta(days=expiration_days)
            active_subscriptions[user_id]['expiry_date'] = new_expiry
            logger.info(f"Updated subscription for user {user_id}: expiry_date {new_expiry}, expiration_days: {expiration_days}")
        if 'traffic_limit' in user_data:
            active_subscriptions[user_id]['traffic_gb'] = user_data.get('traffic_limit', 0)
        save_subscriptions()
        return await update_user_key_from_api(user_id)
    except Exception as e:
        logger.error(f"Error updating subscription for user {user_id}: {e}")
        return False


# ===== ДАТА/ВСПОМОГАТЕЛЬНЫЕ =====

def _ensure_dt_utc(value: datetime) -> datetime:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except Exception:
            value = datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def calculate_days_left(expiry: datetime) -> int:
    expiry_dt = _ensure_dt_utc(expiry)
    delta_seconds = (expiry_dt - datetime.now(timezone.utc)).total_seconds()
    if delta_seconds <= 0:
        return 0
    return math.ceil(delta_seconds / 86400)


def format_expiry_date(expiry: datetime) -> str:
    expiry_dt = _ensure_dt_utc(expiry)
    return expiry_dt.astimezone(timezone.utc).strftime('%d.%m.%Y')


# ===== ФОНОВЫЕ ЗАДАЧИ =====

async def sync_users_with_panel():
  """Периодическая синхронизация пользователей с Blitz панелью"""
  while True:
    try:
      await asyncio.sleep(30)  # Проверка каждые 5 минут
      
      logger.info("Starting periodic sync with Blitz panel...")
      
      # Проверяем каждого активного пользователя
      updated_count = 0
      for user_id in list(active_subscriptions.keys()):
        username = f"vpn_{user_id}"
        user_data = await blitz.get_user(username)
        
        if user_data is None:
          # API панели не вернуло пользователя - НЕ УДАЛЯЕМ, просто логируем
          logger.warning(f"User {username} (ID: {user_id}) not found in panel API (may be API issue)")
          # Не удаляем пользователя, т.к. это может быть проблема с API панели
          continue
        else:
          # Обновляем данные пользователя из панели
          await update_subscription_from_api(user_id)
          updated_count += 1
      
      if updated_count > 0:
        save_subscriptions()
        logger.info(f"Updated {updated_count} subscriptions from panel")
      
      logger.info(f"Sync completed. Active subscriptions: {len(active_subscriptions)}")
      
    except Exception as e:
      logger.error(f"Error in sync_users_with_panel: {e}")

# ===== ИНИЦИАЛИЗАЦИЯ =====

bot = Bot(token=TELEGRAM_BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())
crypto_pay = CryptoPayAPI(CRYPTO_PAY_API_TOKEN)
blitz = BlitzAPI(BLITZ_API_URL, BLITZ_API_TOKEN)

# ===== КЛАВИАТУРЫ =====

def get_main_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(inline_keyboard=[
      [InlineKeyboardButton(text="� Открыть приложение", web_app=types.WebAppInfo(url="https://nyxionvpnapp.vercel.app"))]
      ])

def get_admin_keyboard() -> InlineKeyboardMarkup:
  return InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="📊 Статистика", callback_data="admin_stats")],
    [InlineKeyboardButton(text="👥 Пользователи", callback_data="admin_users")],
    [InlineKeyboardButton(text="� Ключи пользователей", callback_data="admin_keys")],
    [InlineKeyboardButton(text="�📢 Рассылка", callback_data="admin_broadcast")],
    [InlineKeyboardButton(text="« Назад", callback_data="back_main")]
  ])

# ===== HANDLERS =====

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
  """Команда /start"""
  traffic_text = "Безлимит" if VPN_TRAFFIC_GB == 0 else f"{VPN_TRAFFIC_GB} GB"
  await message.answer(
    f"👋 Привет, {message.from_user.first_name}!\n\n"
    f"🚀 Я бот для покупки VPN доступа Hysteria2\n\n"
    f"💰 Цены: ~150 RUB\n"
    f"📶 Трафик: {traffic_text}\n"
    f"⏰ Период: {VPN_DAYS} дней\n"
    f"⚡️ Высокая скорость\n\n"
    f"Выберите действие:",
    reply_markup=get_main_keyboard()
    )

@dp.message(Command("admin"))
async def cmd_admin(message: types.Message):
  """Админ-панель"""
  if message.from_user.id != ADMIN_ID:
    await message.answer("❌ У вас нет доступа")
    return
  else:
    await message.answer(
    "🔐 <b>Админ-панель</b>\n\n"
    "👑 <b>Добро пожаловать, администратор!</b>\n\n"
    "Выберите действие из меню ниже:\n\n"
    "📊 <b>Статистика</b> - Просмотр общей статистики бота\n"
    "👥 <b>Пользователи</b> - Управление пользователями\n"
    "🔑 <b>Ключи пользователей</b> - Просмотр VPN ключей\n"
    "📢 <b>Рассылка</b> - Отправка сообщений пользователям\n\n"
    "⚠️ Используйте функции осторожно!",
    parse_mode="HTML",
    reply_markup=get_admin_keyboard()
    )


@dp.callback_query(F.data == "buy_vpn")
async def buy_vpn(callback: types.CallbackQuery):
  """Покупка VPN (в Mini App)"""
  await callback.answer("Откройте приложение для покупки VPN", show_alert=False)
  await callback.message.delete()


@dp.callback_query(F.data == "pay_crypto")
async def pay_crypto(callback: types.CallbackQuery, state: FSMContext):
  """Выбор валюты для оплаты"""
  logger.info("Pay crypto called")
  keyboard = InlineKeyboardMarkup(inline_keyboard=[
      [InlineKeyboardButton(text="� TON - 1 TON", callback_data="currency_TON")],
      [InlineKeyboardButton(text="💵 USDT - 1.5 USDT", callback_data="currency_USDT")],
      [InlineKeyboardButton(text="💵 USDC - 1.5 USDC", callback_data="currency_USDC")],
      [InlineKeyboardButton(text="₿ BTC - 0.000015 BTC", callback_data="currency_BTC")],
      [InlineKeyboardButton(text="💎 ETH - 0.0004 ETH", callback_data="currency_ETH")],
      [InlineKeyboardButton(text="« Назад", callback_data="buy_vpn")]
  ])

  await callback.message.edit_text(
      "💳 <b>Выберите валюту для оплаты</b>\n\n"
      "Все цены эквивалентны ~150 RUB\n\n"
      "Выберите удобную валюту:",
      parse_mode="HTML",
      reply_markup=keyboard
  )
  await state.set_state(PaymentStates.choosing_currency)
  logger.info("State set to choosing_currency")
  await callback.answer()


@dp.callback_query(F.data.startswith("currency_"), PaymentStates.choosing_currency)
async def choose_currency(callback: types.CallbackQuery, state: FSMContext):
  """Создание инвойса для выбранной валюты"""
  logger.info(f"Choose currency called with data: {callback.data}")
  try:
    currency = callback.data.split("_")[1]  # NOT, TON, USDT, BTC
    amount = VPN_PRICES[currency]
    logger.info(f"Selected currency: {currency}, amount: {amount}")
    
    user_id = callback.from_user.id
    traffic_text = "безлимит" if VPN_TRAFFIC_GB == 0 else f"{VPN_TRAFFIC_GB}GB"

    invoice = await crypto_pay.create_invoice(
        amount=amount,
        user_id=user_id,
        description=f"VPN {VPN_DAYS} дней ({traffic_text})",
        asset=currency
    )
    logger.info(f"Invoice created for {currency}: {invoice}")
    
    invoice_id = invoice["invoice_id"]
    pay_url = invoice["bot_invoice_url"]
    
    pending_payments[invoice_id] = {
        "user_id": user_id,
        "username": callback.from_user.username or f"user_{user_id}",
        "created_at": datetime.now()
    }
    
    await state.update_data(invoice_id=invoice_id, currency=currency, amount=amount)
    await state.set_state(PaymentStates.waiting_payment)
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💎 Оплатить", url=pay_url)],
        [InlineKeyboardButton(text="✅ Проверить оплату", callback_data="check_payment")],
        [InlineKeyboardButton(text="❌ Отменить", callback_data="cancel_payment")]
    ])
    
    await callback.message.edit_text(
        f"💳 <b>Инвойс создан!</b>\n\n"
        f"💰 Сумма: {amount} {currency}\n"
        f"⏱ Действителен: 1 час\n\n"
        f"Нажмите кнопку ниже для оплаты:",
        parse_mode="HTML",
        reply_markup=keyboard
    )
    
  except Exception as e:
    logger.error(f"Error creating invoice: {e}")
    await callback.message.edit_text(
        "❌ Ошибка создания инвойса. Попробуйте позже.",
        reply_markup=get_main_keyboard()
    )
  await callback.answer()


@dp.callback_query(F.data == "check_payment")
async def check_payment(callback: types.CallbackQuery, state: FSMContext):
  """Проверка оплаты"""
  try:
    data = await state.get_data()
    invoice_id = data.get("invoice_id")
    logger.info(f"Checking payment for invoice_id: {invoice_id}, data: {data}")

    if not invoice_id:
        await callback.answer("❌ Инвойс не найден", show_alert=True)
        return
    
    invoices = await crypto_pay.get_invoices(invoice_ids=str(invoice_id))
    logger.info(f"Got invoices: {invoices}")
    
    if not invoices:
        await callback.answer("❌ Инвойс не найден", show_alert=True)
        return
    
    invoice = invoices[0]
    logger.info(f"Invoice status: {invoice.get('status')}")
    
    if invoice["status"] == "paid":
        await process_payment(callback, invoice, state)
    elif invoice["status"] == "expired":
        await callback.message.edit_text(
            "⏱ Время оплаты истекло. Создайте новый инвойс.",
            reply_markup=get_main_keyboard()
        )
        await state.clear()
    elif invoice["status"] == "active":
        await callback.answer(
            "⏳ Инвойс активен, но оплата не получена. Попробуйте позже.",
            show_alert=True
        )
    else:
        await callback.answer(
            f"⏳ Статус: {invoice['status']}. Подождите после оплаты.",
            show_alert=True
        )
  except Exception as e:
    logger.error(f"Check payment error: {e}")
    await callback.answer("❌ Ошибка проверки", show_alert=True)


async def process_payment(callback: types.CallbackQuery, invoice: dict, state: FSMContext):
  """Обработка успешной оплаты"""
  try:
    user_id = callback.from_user.id
    username = f"vpn_{user_id}"
    logger.info(f"Processing payment for user {user_id}, invoice: {invoice}")

    await callback.message.edit_text(
        "⏳ Создаю ваш VPN аккаунт...\n\nПодождите несколько секунд.",
        reply_markup=None
    )
    
    # Проверяем, есть ли уже подписка
    if user_id in active_subscriptions:
        # Синхронизируем подписку с API перед продлением
        await update_subscription_from_api(user_id)
        # Если подписка была удалена в панели, создаем заново
        if user_id not in active_subscriptions:
            logger.info(f"Subscription for user {user_id} removed in Blitz; creating new")
        else:
            current_sub = active_subscriptions[user_id]
            current_expiry = current_sub['expiry_date']
            current_expiry = _ensure_dt_utc(current_expiry)
            # Вычисляем сколько дней осталось + добавляем 30 дней
            days_remaining = calculate_days_left(current_expiry)
            new_total_days = days_remaining + VPN_DAYS
            # Обновляем пользователя в Blitz API (добавляем ровно 30 дней)
            success = await blitz.extend_user(username, VPN_DAYS)
            if not success:
                raise Exception("Failed to extend user in Blitz API")
            # Синхронизируем подписку и ключ из Blitz API
            await update_subscription_from_api(user_id)
            save_subscriptions()
            logger.info(f"Extended subscription for user {user_id}")
            # Получаем актуальную дату окончания после синка
            updated_sub = active_subscriptions.get(user_id)
            new_expiry = updated_sub['expiry_date'] if updated_sub else current_expiry + timedelta(days=VPN_DAYS)
            new_expiry_str = format_expiry_date(new_expiry)
            await callback.message.edit_text(
                f"✅ <b>Подписка продлена!</b>\n\n"
                f"🎉 Ваш VPN продлен на {VPN_DAYS} дней!\n\n"
                f"⏰ Новый срок: {new_expiry_str}\n"
                f"📶 Трафик: Безлимит\n\n"
                f"Ваш ключ остался прежним.",
                parse_mode="HTML",
                reply_markup=get_main_keyboard()
            )
            data = await state.get_data()
            currency = data.get("currency", "NOT")
            amount = data.get("amount", VPN_PRICES["NOT"])
            await bot.send_message(
                ADMIN_ID,
                f"💰 Продление подписки!\n\n"
                f"User: {callback.from_user.full_name}\n"
                f"ID: {user_id}\n"
                f"Сумма: {amount} {currency}\n"
                f"Дней добавлено: {VPN_DAYS}"
            )
            await state.clear()
            if invoice["invoice_id"] in pending_payments:
                del pending_payments[invoice["invoice_id"]]
            logger.info(f"✅ Subscription extended for user {user_id}")
            return
    else:
        # Создаем новую подписку
        username = f"vpn_{user_id}"
        create_result = await blitz.create_user(username, VPN_TRAFFIC_GB, VPN_DAYS)
        
        if create_result.get("exists"):
            # Пользователь уже существует, получаем URI
            vpn_uri = await blitz.get_user_uri(username)
            logger.info(f"User {username} already exists, got URI: {vpn_uri}")
        else:
            # Пользователь создан, получаем URI
            vpn_uri = await blitz.get_user_uri(username)
            logger.info(f"Created VPN user {username}, URI: {vpn_uri}")
    
    if not vpn_uri:
        raise Exception("Failed to generate VPN URI - URI is empty")
    
    # Сохраняем подписку
    expiry_date = datetime.now() + timedelta(days=VPN_DAYS)
    active_subscriptions[user_id] = {
        "username": username,
        "vpn_uri": vpn_uri,
        "expiry_date": expiry_date,
        "traffic_gb": VPN_TRAFFIC_GB,
        "paid_amount": invoice.get("amount"),
        "created_at": datetime.now()
    }
    
    save_subscriptions()
    
    traffic_text = "Безлимит" if VPN_TRAFFIC_GB == 0 else f"{VPN_TRAFFIC_GB} GB"
    
    # Отправляем ключ
    await callback.message.edit_text(
        f"✅ <b>Оплата получена!</b>\n\n"
        f"🎉 Ваш VPN создан!\n\n"
        f"⏰ До: {expiry_date.strftime('%d.%m.%Y')}\n"
        f"📶 Трафик: Безлимит\n\n"
        f"🔑 <b>Ваш ключ:</b>\n"
        f"<code>{vpn_uri}</code>\n\n"
        f"💡 Нажмите на ключ чтобы скопировать",
        parse_mode="HTML",
        reply_markup=get_main_keyboard()
    )
    
    # Инструкция
    await callback.message.answer(
        "📖 <b>Как подключиться:</b>\n\n"
        "<b>iOS:</b> Shadowrocket, Stash\n"
        "<b>Android:</b> v2rayNG, Matsuri\n"
        "<b>Windows/Mac:</b> Clash, v2rayN\n\n"
        "Скопируйте ключ выше и вставьте в приложение",
        parse_mode="HTML"
    )
    
    # Уведомление админу
    data = await state.get_data()
    currency = data.get("currency", "NOT")
    amount = data.get("amount", VPN_PRICES["NOT"])
    await bot.send_message(
        ADMIN_ID,
        f"💰 Новая продажа!\n\n"
        f"User: {callback.from_user.full_name}\n"
        f"ID: {user_id}\n"
        f"Сумма: {amount} {currency}"
    )
    
    await state.clear()
    if invoice["invoice_id"] in pending_payments:
        del pending_payments[invoice["invoice_id"]]
    
    logger.info(f"✅ VPN created for user {user_id}")
    
  except Exception as e:
    logger.error(f"❌ Payment processing error: {e}")
    
    # Сохраняем данные для повторной попытки
    user_id = callback.from_user.id
    retry_payments[user_id] = {
        "invoice": invoice,
        "error": str(e),
        "attempts": retry_payments.get(user_id, {}).get("attempts", 0) + 1
    }
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔄 Попробовать еще раз", callback_data="retry_payment")],
        [InlineKeyboardButton(text="« Назад", callback_data="back_main")]
    ])
    
    await callback.message.edit_text(
        f"❌ Оплата получена, но ошибка создания аккаунта.\n"
        f"Попробуйте еще раз или обратитесь в поддержку.\n\n"
        f"ID: <code>{callback.from_user.id}</code>",
        parse_mode="HTML",
        reply_markup=keyboard
    )


@dp.callback_query(F.data == "retry_payment")
async def retry_payment(callback: types.CallbackQuery):
  """Повторная попытка создания VPN аккаунта"""
  user_id = callback.from_user.id
  username = f"vpn_{user_id}"
  
  if user_id not in retry_payments:
    await callback.answer("Нет данных для повторной попытки", show_alert=True)
    return
  
  payment_data = retry_payments[user_id]
  invoice = payment_data["invoice"]
  
  # Повторяем процесс создания
  try:
    await callback.message.edit_text(
        "⏳ Создаю ваш VPN аккаунт...\n\nПодождите несколько секунд.",
        reply_markup=None
    )
    
    # Проверяем, есть ли уже подписка
    if user_id in active_subscriptions:
        # Синхронизируем подписку с API перед продлением
        await update_subscription_from_api(user_id)
        
        # Продлеваем существующую подписку
        current_sub = active_subscriptions[user_id]
        current_expiry = current_sub['expiry_date']
        
        if isinstance(current_expiry, str):
            current_expiry = datetime.fromisoformat(current_expiry)
        
        # Вычисляем сколько дней осталось + добавляем 30 дней
        days_remaining = max(0, (current_expiry - datetime.now()).days)
        new_total_days = days_remaining + VPN_DAYS
        
        # Обновляем пользователя в Blitz API (добавляем ровно 30 дней)
        success = await blitz.extend_user(username, VPN_DAYS)
        if not success:
            raise Exception("Failed to extend user in Blitz API")
        
        # Синхронизируем подписку и ключ из Blitz API
        await update_subscription_from_api(user_id)
        
        save_subscriptions()
        logger.info(f"Extended subscription on retry for user {user_id}")
        
        # Получаем обновленную expiry_date
        updated_sub = active_subscriptions[user_id]
        new_expiry = updated_sub['expiry_date']
        if isinstance(new_expiry, str):
            new_expiry = datetime.fromisoformat(new_expiry)
        
        # Отправляем сообщение о продлении
        await callback.message.edit_text(
            f"✅ <b>Подписка продлена!</b>\n\n"
            f"🎉 Ваш VPN продлен на {VPN_DAYS} дней!\n\n"
            f"⏰ Новый срок: {new_expiry.strftime('%d.%m.%Y')}\n"
            f"📶 Трафик: Безлимит\n\n"
            f"Ваш ключ остался прежним.",
            parse_mode="HTML",
            reply_markup=get_main_keyboard()
        )
        
        # Очищаем данные retry
        if user_id in retry_payments:
            del retry_payments[user_id]
        
        logger.info(f"✅ Subscription extended on retry for user {user_id}")
        return
    else:
        # Создаем новую подписку
        username = f"vpn_{user_id}"
        create_result = await blitz.create_user(username, VPN_TRAFFIC_GB, VPN_DAYS)
        
        if create_result.get("exists"):
            # Пользователь уже существует, получаем URI
            vpn_uri = await blitz.get_user_uri(username)
            logger.info(f"User {username} already exists, got URI: {vpn_uri}")
        else:
            # Пользователь создан, получаем URI
            vpn_uri = await blitz.get_user_uri(username)
            logger.info(f"Created VPN user {username}, URI: {vpn_uri}")
        
        if not vpn_uri:
            raise Exception("Failed to generate VPN URI - URI is empty")
        
        # Сохраняем подписку
        expiry_date = datetime.now() + timedelta(days=VPN_DAYS)
        active_subscriptions[user_id] = {
            "username": username,
            "vpn_uri": vpn_uri,
            "expiry_date": expiry_date,
            "traffic_gb": VPN_TRAFFIC_GB,
            "paid_amount": invoice.get("amount"),
            "created_at": datetime.now()
        }
        
        save_subscriptions()
        
        # Отправляем ключ
        await callback.message.edit_text(
            f"✅ <b>Оплата получена!</b>\n\n"
            f"🎉 Ваш VPN создан!\n\n"
            f"⏰ До: {expiry_date.strftime('%d.%m.%Y')}\n"
            f"📶 Трафик: Безлимит\n\n"
            f"🔑 <b>Ваш ключ:</b>\n"
            f"<code>{vpn_uri}</code>\n\n"
            f"💡 Нажмите на ключ чтобы скопировать",
            parse_mode="HTML",
            reply_markup=get_main_keyboard()
        )
        
        # Инструкция
        await callback.message.answer(
            "📖 <b>Как подключиться:</b>\n\n"
            "<b>iOS:</b> Shadowrocket, Stash\n"
            "<b>Android:</b> v2rayNG, Matsuri\n"
            "<b>Windows/Mac:</b> Clash, v2rayN\n\n"
            "Скопируйте ключ выше и вставьте в приложение",
            parse_mode="HTML"
        )
    
    # Уведомление админу
    currency = invoice.get("asset", "NOT")
    amount = invoice.get("amount", VPN_PRICES["NOT"])
    await bot.send_message(
        ADMIN_ID,
        f"💰 Новая продажа!\n\n"
        f"User: {callback.from_user.full_name}\n"
        f"ID: {user_id}\n"
        f"Сумма: {amount} {currency}"
    )
    
    # Удаляем из retry
    del retry_payments[user_id]
    
    logger.info(f"✅ VPN created for user {user_id} on retry")
    
  except Exception as e:
    logger.error(f"❌ Retry payment processing error: {e}")
    
    # Увеличиваем счетчик попыток
    retry_payments[user_id]["attempts"] += 1
    attempts = retry_payments[user_id]["attempts"]
    
    if attempts >= 3:
      # После 3 попыток показываем сообщение об ошибке
      await callback.message.edit_text(
          f"❌ Не удалось создать аккаунт после {attempts} попыток.\n"
          f"Обратитесь в поддержку.\n\n"
          f"ID: <code>{callback.from_user.id}</code>",
          parse_mode="HTML",
          reply_markup=get_main_keyboard()
      )
      del retry_payments[user_id]
    else:
      keyboard = InlineKeyboardMarkup(inline_keyboard=[
          [InlineKeyboardButton(text="🔄 Попробовать еще раз", callback_data="retry_payment")],
          [InlineKeyboardButton(text="« Назад", callback_data="back_main")]
      ])
      
      await callback.message.edit_text(
          f"❌ Ошибка создания аккаунта (попытка {attempts}/3).\n"
          f"Попробуйте еще раз.\n\n"
          f"ID: <code>{callback.from_user.id}</code>",
          parse_mode="HTML",
          reply_markup=keyboard
      )
  
  await callback.answer()
  user_id = callback.from_user.id
  sub = active_subscriptions.get(user_id)

  if not sub:
    await callback.message.edit_text(
        "📭 У вас нет активной подписки.\n\nКупите VPN!",
        reply_markup=get_main_keyboard()
    )
  else:
    days_left = (sub["expiry_date"] - datetime.now()).days
    status = "✅ Активна" if days_left > 0 else "❌ Истекла"
    traffic_text = "Безлимит" if sub["traffic_gb"] == 0 else f"{sub['traffic_gb']} GB"
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔑 Показать ключ", callback_data="show_key")],
        [InlineKeyboardButton(text="♻️ Продлить", callback_data="buy_vpn")],
        [InlineKeyboardButton(text="« Назад", callback_data="back_main")]
    ])
    
    await callback.message.edit_text(
        f"👤 <b>Ваш профиль</b>\n\n"
        f"{status}\n"
        f"📊 Трафик: {traffic_text}\n"
        f"⏰ Осталось: {max(0, days_left)} дней\n"
        f"📅 До: {sub['expiry_date'].strftime('%d.%m.%Y')}",
        parse_mode="HTML",
        reply_markup=keyboard
    )
  await callback.answer() 


@dp.callback_query(F.data == "show_key")
async def show_key(callback: types.CallbackQuery):
  """Показать ключ"""
  sub = active_subscriptions.get(callback.from_user.id)
  if sub:
    await callback.message.answer(
      f"🔑 <b>Ваш ключ:</b>\n\n<code>{sub['vpn_uri']}</code>",
      parse_mode="HTML"
    )
    await callback.answer()
  else:
    await callback.answer("❌ Подписка не найдена", show_alert=True)

@dp.callback_query(F.data == "help")
async def help_handler(callback: types.CallbackQuery):
  """Помощь (в Mini App)"""
  await callback.answer("Откройте приложение для справки", show_alert=False)
  await callback.message.delete()

@dp.callback_query(F.data == "admin_stats")
async def admin_stats(callback: types.CallbackQuery):
  """Статистика"""
  if callback.from_user.id != ADMIN_ID:
    await callback.answer("❌ Нет доступа", show_alert=True)
    return

  total = len(active_subscriptions)
  active = sum(1 for s in active_subscriptions.values() if s['expiry_date'] > datetime.now())

  await callback.message.edit_text(
    f"📊 <b>Статистика</b>\n\n"
    f"👥 Всего продаж: {total}\n"
    f"✅ Активных подписок: {active}\n"
    f"💰 Цена: ~150 RUB за подписку",
    parse_mode="HTML",
    reply_markup=get_admin_keyboard()
  )
  await callback.answer()

@dp.callback_query(F.data == "admin_users")
async def admin_users(callback: types.CallbackQuery):
  """Список пользователей"""
  if callback.from_user.id != ADMIN_ID:
    await callback.answer("❌ Нет доступа", show_alert=True)
    return

  if not active_subscriptions:
    await callback.message.edit_text(
        "👥 <b>Пользователи</b>\n\nПока нет пользователей",
        parse_mode="HTML",
        reply_markup=get_admin_keyboard()
    )
    return

  text = "👥 <b>Пользователи:</b>\n\n"
  for uid, sub in list(active_subscriptions.items())[:10]:
    days = (sub['expiry_date'] - datetime.now()).days
    status = "✅" if days > 0 else "❌"
    text += f"{status} ID: <code>{uid}</code> - {max(0, days)} дней\n"

  await callback.message.edit_text(
    text,
    parse_mode="HTML",
    reply_markup=get_admin_keyboard()
  )
  await callback.answer()

@dp.callback_query(F.data == "admin_keys")
async def admin_keys(callback: types.CallbackQuery):
  """Просмотр ключей пользователей"""
  if callback.from_user.id != ADMIN_ID:
    await callback.answer("❌ Нет доступа", show_alert=True)
    return

  if not active_subscriptions:
    await callback.message.edit_text(
        "🔑 <b>Ключи пользователей</b>\n\nПока нет пользователей с ключами",
        parse_mode="HTML",
        reply_markup=get_admin_keyboard()
    )
    return

  text = "🔑 <b>Ключи пользователей:</b>\n\n"
  for uid, sub in list(active_subscriptions.items())[:5]:  # Ограничим до 5 для избежания длинного сообщения
    days = (sub['expiry_date'] - datetime.now()).days
    status = "✅ Активен" if days > 0 else "❌ Истек"
    uri = sub.get('vpn_uri', 'Нет ключа')
    text += f"👤 ID: <code>{uid}</code>\n{status} ({max(0, days)} дней)\n🔗 <code>{uri[:50]}...</code>\n\n"

  await callback.message.edit_text(
    text,
    parse_mode="HTML",
    reply_markup=get_admin_keyboard()
  )
  await callback.answer()

@dp.callback_query(F.data == "admin_broadcast")
async def admin_broadcast(callback: types.CallbackQuery, state: FSMContext):
  """Рассылка"""
  if callback.from_user.id != ADMIN_ID:
    await callback.answer("❌ Нет доступа", show_alert=True)
    return

  await callback.message.edit_text(
    "📢 <b>Рассылка</b>\n\nОтправьте текст сообщения:",
    parse_mode="HTML"
  )
  await state.set_state(BroadcastStates.waiting_message)

@dp.message(BroadcastStates.waiting_message)
async def broadcast_send(message: types.Message, state: FSMContext):
  """Отправка рассылки"""
  if message.from_user.id != ADMIN_ID:
    return

  sent = 0
  for uid in active_subscriptions.keys():
    try:
      await bot.send_message(uid, message.text, parse_mode="HTML")
      sent += 1
      await asyncio.sleep(0.05)
    except:
      pass

  await message.answer(
    f"✅ Отправлено: {sent} пользователям",
    reply_markup=get_admin_keyboard()
  )
  await state.clear()

@dp.callback_query(F.data == "back_main")
async def back_main(callback: types.CallbackQuery, state: FSMContext):
  """Главное меню"""
  await state.clear()
  await callback.message.edit_text(
    "🏠 Главное меню",
    reply_markup=get_main_keyboard()
  )
  await callback.answer()

@dp.callback_query(F.data == "cancel_payment")
async def cancel_payment(callback: types.CallbackQuery, state: FSMContext):
  """Отмена"""
  await state.clear()
  await callback.message.edit_text(
    "❌ Отменено",
    reply_markup=get_main_keyboard()
  )
  await callback.answer()

@dp.callback_query(F.data == "my_profile")
async def my_profile(callback: types.CallbackQuery):
  """Профиль пользователя (в Mini App)"""
  await callback.answer("Откройте приложение для просмотра профиля", show_alert=False)
  await callback.message.delete()

@dp.callback_query(F.data == "my_keys")
async def my_keys(callback: types.CallbackQuery):
  """Показать ключи пользователя"""
  user_id = callback.from_user.id
  
  if user_id in active_subscriptions:
    # Проверяем существование ключа в панели перед показом
    user_exists = await verify_user_in_panel(user_id)
    
    if not user_exists:
      keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💳 Купить VPN", callback_data="buy_vpn")],
        [InlineKeyboardButton(text="« Назад", callback_data="my_profile")]
      ])
      
      await callback.message.edit_text(
        f"⚠️ <b>Ключ удален</b>\n\n"
        f"Ваш ключ был удален из панели администратором.\n"
        f"Подписка больше не активна.\n\n"
        f"Приобретите новую подписку:",
        parse_mode="HTML",
        reply_markup=keyboard
      )
      await callback.answer()
      return
    
    # Обновляем ключ из Blitz API перед показом
    await update_user_key_from_api(user_id)
    
    sub = active_subscriptions[user_id]
    vpn_uri = sub.get('vpn_uri', 'Ключ не найден')
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
      [InlineKeyboardButton(text="🔄 Обновить ключ", callback_data="refresh_key")],
      [InlineKeyboardButton(text="📋 Скопировать ключ", callback_data="copy_key")],
      [InlineKeyboardButton(text="« Назад", callback_data="my_profile")]
    ])
    
    await callback.message.edit_text(
      f"🔑 <b>Ваш VPN ключ</b>\n\n"
      f"<code>{vpn_uri}</code>\n\n"
      f"💡 Нажмите на ключ чтобы скопировать\n\n"
      f"📖 <b>Как подключиться:</b>\n"
      f"• iOS: Shadowrocket, Stash\n"
      f"• Android: v2rayNG, Matsuri\n"
      f"• Windows/Mac: Clash, v2rayN",
      parse_mode="HTML",
      reply_markup=keyboard
    )
  else:
    await callback.answer("У вас нет активной подписки", show_alert=True)
  
  await callback.answer()

@dp.callback_query(F.data.startswith("check_payment_"))
async def check_payment_manually(callback: types.CallbackQuery):
  """Ручная проверка статуса оплаты"""
  invoice_id = int(callback.data.replace("check_payment_", ""))
  user_id = callback.from_user.id
  
  await callback.answer("🔄 Проверяем оплату...", show_alert=False)
  
  try:
    is_paid = await check_payment_status(invoice_id, user_id)
    
    if is_paid:
      await callback.answer("✅ Оплата получена! Создаем VPN...", show_alert=True)
      # Платеж будет обработан через webhook или polling task
    else:
      payment_data = pending_payments.get(invoice_id)
      if payment_data:
        pay_url = f"https://t.me/CryptoBot?start=pay_{invoice_id}"
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
          [InlineKeyboardButton(text="💳 Оплатить", url=pay_url)],
          [InlineKeyboardButton(text="🔄 Проверить снова", callback_data=f"check_payment_{invoice_id}")]
        ])
        
        await callback.message.edit_reply_markup(reply_markup=keyboard)
        await callback.answer("⏳ Оплата еще не получена. Пожалуйста, завершите платеж.", show_alert=True)
      else:
        await callback.answer("❌ Платеж не найден или истек", show_alert=True)
  except Exception as e:
    logger.error(f"Error checking payment manually: {e}")
    await callback.answer("❌ Ошибка проверки оплаты", show_alert=True)

@dp.callback_query(F.data == "refresh_key")
async def refresh_key(callback: types.CallbackQuery):
  """Обновить ключ из панели"""
  user_id = callback.from_user.id
  
  if user_id in active_subscriptions:
    # Проверяем существование в панели
    user_exists = await verify_user_in_panel(user_id)
    
    if not user_exists:
      await callback.answer("❌ Ключ удален из панели", show_alert=True)
      # Переходим к экрану с предложением купить подписку
      await my_keys(callback)
      return
    
    # Обновляем данные из API
    success = await update_subscription_from_api(user_id)
    
    if success:
      await callback.answer("✅ Ключ обновлен", show_alert=False)
      # Обновляем экран с новыми данными
      await my_keys(callback)
    else:
      await callback.answer("❌ Ошибка обновления", show_alert=True)
  else:
    await callback.answer("Подписка не найдена", show_alert=True)

@dp.callback_query(F.data == "copy_key")
async def copy_key(callback: types.CallbackQuery):
  """Копирование ключа"""
  user_id = callback.from_user.id
  
  if user_id in active_subscriptions:
    # Обновляем ключ из Blitz API перед копированием
    await update_user_key_from_api(user_id)
    
    sub = active_subscriptions[user_id]
    vpn_uri = sub.get('vpn_uri', '')
    
    # Показываем ключ в alert
    await callback.answer(
      f"Ключ скопирован:\n{vpn_uri}",
      show_alert=True
    )
  else:
    await callback.answer("Ключ не найден", show_alert=True)

@dp.message(Command("give"))
async def give_vpn(message: types.Message):
  """Выдать VPN (только для админа)"""
  if message.from_user.id != ADMIN_ID:
    return

  try:
    args = message.text.split()
    if len(args) < 2:
      await message.answer("Использование: /give USER_ID")
      return
    
    target_id = int(args[1])
    username = f"vpn_{target_id}"
    
    await blitz.create_user(username, VPN_TRAFFIC_GB, VPN_DAYS)
    uri = await blitz.get_user_uri(username)
    
    active_subscriptions[target_id] = {
      "username": username,
      "vpn_uri": uri,
      "expiry_date": datetime.now() + timedelta(days=VPN_DAYS),
      "traffic_gb": VPN_TRAFFIC_GB,
      "created_at": datetime.now()
    }
    
    save_subscriptions()
    
    await bot.send_message(
      target_id,
      f"🎁 Вам выдан VPN!\n\n🔑 Ключ:\n<code>{uri}</code>",
      parse_mode="HTML"
    )
    await message.answer(f"✅ VPN выдан {target_id}")
    
  except Exception as e:
    await message.answer(f"❌ Ошибка: {e}")

# ===== ЗАПУСК =====

async def main():
  logger.info("🚀 Starting bot...")

  load_subscriptions()

  # Проверка Blitz
  if not await blitz.test_connection():
    logger.error("❌ Blitz not connected!")
    return

  logger.info("✅ All systems ready!")
  logger.info("💰 Prices: ~150 RUB (NOT/TON/USDT/BTC)")
  logger.info(f"📊 Traffic: {'Unlimited' if VPN_TRAFFIC_GB == 0 else f'{VPN_TRAFFIC_GB} GB'}")

  await bot.delete_webhook(drop_pending_updates=True)
  await dp.start_polling(bot)


async def handle_webhook(request):
  """Обработка webhook от CryptoPay"""
  try:
    data = await request.json()
    logger.info(f"Webhook received: {data}")
    
    invoice_id = data.get("invoice_id")
    status = data.get("status")
    
    if not invoice_id or status != "paid":
      return web.Response(text="OK")
    
    # Находим платеж в pending_payments
    payment_data = None
    for pid, pdata in pending_payments.items():
      if str(pid) == str(invoice_id):
        payment_data = pdata
        break
    
    if not payment_data:
      logger.warning(f"Payment data not found for invoice {invoice_id}")
      return web.Response(text="OK")
    
    user_id = payment_data["user_id"]
    
    # Проверяем, есть ли уже подписка
    if user_id in active_subscriptions:
        # Синхронизируем подписку с API перед продлением
        await update_subscription_from_api(user_id)
        
        # Продлеваем существующую подписку
        current_sub = active_subscriptions[user_id]
        current_expiry = current_sub['expiry_date']
        
        if isinstance(current_expiry, str):
            current_expiry = datetime.fromisoformat(current_expiry)
        
        # Вычисляем сколько дней осталось + добавляем 30 дней
        days_remaining = max(0, (current_expiry - datetime.now()).days)
        new_total_days = days_remaining + VPN_DAYS
        
        # Обновляем пользователя в Blitz API (добавляем ровно 30 дней)
        username = f"vpn_{user_id}"
        success = await blitz.extend_user(username, VPN_DAYS)
        if success:
            # Синхронизируем подписку и ключ из Blitz API
            await update_subscription_from_api(user_id)
            save_subscriptions()
            logger.info(f"Extended subscription via webhook for user {user_id}")
        else:
            logger.error(f"Failed to extend user {username} in Blitz API via webhook")
            # Продолжаем локально, но логируем ошибку
        
        # Получаем обновленную expiry_date (если синхронизировано, иначе старый расчет)
        if success:
            new_expiry = active_subscriptions[user_id]['expiry_date']
        else:
            new_expiry = datetime.now() + timedelta(days=new_total_days)
            active_subscriptions[user_id]['expiry_date'] = new_expiry
            save_subscriptions()
        
        # Отправляем сообщение о продлении
        try:
            await bot.send_message(
                user_id,
                f"✅ <b>Подписка продлена!</b>\n\n"
                f"🎉 Ваш VPN продлен на {VPN_DAYS} дней!\n\n"
                f"⏰ Новый срок: {new_expiry.strftime('%d.%m.%Y')}\n"
                f"📶 Трафик: Безлимит\n\n"
                f"Ваш ключ остался прежним.",
                parse_mode="HTML",
                reply_markup=get_main_keyboard()
            )
        except Exception as e:
            logger.error(f"Failed to send extension message to user {user_id}: {e}")
    else:
        # Создаем новую подписку
        username = f"vpn_{user_id}"
        create_result = await blitz.create_user(username, VPN_TRAFFIC_GB, VPN_DAYS)
        
        if create_result.get("exists"):
            # Пользователь уже существует, получаем URI
            vpn_uri = await blitz.get_user_uri(username)
            logger.info(f"User {username} already exists, got URI: {vpn_uri}")
        else:
            # Пользователь создан, получаем URI
            vpn_uri = await blitz.get_user_uri(username)
            logger.info(f"Created VPN user {username}, URI: {vpn_uri}")
        
        if not vpn_uri:
            logger.error(f"Failed to create VPN for user {user_id}")
            
            # Сохраняем для retry
            retry_payments[user_id] = {
                "invoice": data,
                "error": "Failed to generate VPN URI - URI is empty",
                "attempts": 1
            }
            
            # Отправляем сообщение с кнопкой retry
            try:
                keyboard = InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="🔄 Попробовать еще раз", callback_data="retry_payment")],
                    [InlineKeyboardButton(text="« Назад", callback_data="back_main")]
                ])
                
                await bot.send_message(
                    user_id,
                    f"✅ <b>Оплата получена!</b>\n\n"
                    f"❌ Но возникла ошибка при создании аккаунта.\n"
                    f"Попробуйте еще раз:",
                    parse_mode="HTML",
                    reply_markup=keyboard
                )
            except Exception as e:
                logger.error(f"Failed to send retry message to user {user_id}: {e}")
            
            return web.Response(text="ERROR")
        
        # Сохраняем подписку
        expiry_date = datetime.now() + timedelta(days=VPN_DAYS)
        active_subscriptions[user_id] = {
            "username": username,
            "vpn_uri": vpn_uri,
            "expiry_date": expiry_date,
            "traffic_gb": VPN_TRAFFIC_GB,
            "paid_amount": data.get("amount"),
            "created_at": datetime.now()
        }
        save_subscriptions()
        
        # Отправляем ключ пользователю
        try:
            await bot.send_message(
                user_id,
                f"✅ <b>Оплата получена!</b>\n\n"
                f"🎉 Ваш VPN создан!\n\n"
                f"⏰ До: {expiry_date.strftime('%d.%m.%Y')}\n"
                f"📶 Трафик: Безлимит\n\n"
                f"🔑 <b>Ваш ключ:</b>\n"
                f"<code>{vpn_uri}</code>\n\n"
                f"💡 Нажмите на ключ чтобы скопировать",
                parse_mode="HTML",
                reply_markup=get_main_keyboard()
            )
            
            # Инструкция
            await bot.send_message(
                user_id,
                "📖 <b>Как подключиться:</b>\n\n"
                "<b>iOS:</b> Shadowrocket, Stash\n"
                "<b>Android:</b> v2rayNG, Matsuri\n"
                "<b>Windows/Mac:</b> Clash, v2rayN\n\n"
                "Скопируйте ключ выше и вставьте в приложение",
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error(f"Failed to send message to user {user_id}: {e}")
    
    # Уведомление админу
    try:
        currency = data.get("asset", "TON")
        amount = data.get("amount", VPN_PRICES.get(currency, "1"))
        await bot.send_message(
            ADMIN_ID,
            f"💰 Новая продажа (webhook)!\n\n"
            f"User: {payment_data['username']}\n"
            f"ID: {user_id}\n"
            f"Сумма: {amount} {currency}"
        )
    except Exception as e:
        logger.error(f"Failed to send admin notification: {e}")
    
    # Очищаем pending и таймеры
    if invoice_id in pending_payments:
        del pending_payments[invoice_id]
    
    if user_id in payment_timers:
        # Отменяем фоновую задачу
        timer_data = payment_timers[user_id]
        if "task" in timer_data and not timer_data["task"].done():
            timer_data["task"].cancel()
        del payment_timers[user_id]
        logger.info(f"Cancelled payment timer for user {user_id}")
    
    logger.info(f"✅ Payment processed via webhook for user {user_id}")
    
  except Exception as e:
    logger.error(f"Webhook error: {e}")
    return web.Response(text="ERROR")
  
  return web.Response(text="OK")


async def setup_webhook():
  """Настройка webhook с ngrok или альтернативой"""
  global WEBHOOK_PUBLIC_URL
  
  # Проверяем ручную настройку
  if MANUAL_WEBHOOK_URL:
    WEBHOOK_PUBLIC_URL = MANUAL_WEBHOOK_URL
    logger.info(f"Using manual webhook URL: {MANUAL_WEBHOOK_URL}")
    print(f"\n🔗 Webhook URL: {MANUAL_WEBHOOK_URL}\n")
    print("Настройте этот URL в CryptoPay Bot → Настройки → Webhooks\n")
    return True
  
  try:
    # Аутентификация ngrok
    ngrok.set_auth_token(NGROK_AUTHTOKEN)
    
    # Создание HTTP tunnel с зарезервированным доменом
    tunnel = await ngrok.connect(8080, "http", domain=NGROK_DOMAIN)
    public_url = f"https://{NGROK_DOMAIN}"
    
    logger.info(f"Ngrok tunnel established: {public_url}")
    logger.info(f"Webhook URL: {public_url}/webhook")
    print(f"\n🔗 Webhook URL: {public_url}/webhook\n")
    print("Настройте этот URL в CryptoPay Bot → Настройки → Webhooks\n")
    
    # Сохраняем URL для использования
    WEBHOOK_PUBLIC_URL = public_url
    
    return True
    
  except Exception as e:
    logger.error(f"Failed to start ngrok: {e}")
    
    # Fallback: инструкция по ручной настройке
    print("\n❌ Ngrok заблокирован для вашего IP")
    print("Варианты решения:")
    print("1. Используйте VPN для изменения IP")
    print("2. Зарезервируйте домен в ngrok dashboard (dashboard.ngrok.com)")
    print("3. Используйте альтернативный туннель:")
    print("   - localtunnel: npm install -g localtunnel && lt --port 8080")
    print("   - cloudflared: brew install cloudflare/cloudflare/cloudflared && cloudflared tunnel --url http://localhost:8080")
    print("4. Ручная настройка: установите MANUAL_WEBHOOK_URL в коде")
    print("\nWebhook сервер запущен локально на http://localhost:8080/webhook")
    print("Для тестирования используйте этот URL с VPN или другим IP\n")
    
    return False


async def run_servers():
  """Запуск всех серверов"""
  # Настраиваем ngrok
  ngrok_success = await setup_webhook()
  
  # Запускаем webhook server
  app = web.Application()
  app.router.add_post('/webhook', handle_webhook)
  
  # Инициализируем API endpoints для Mini App
  import api_endpoints
  api_endpoints.active_subscriptions = active_subscriptions
  api_endpoints.blitz_api = blitz  # Передаем BlitzAPI instance
  api_endpoints.VPN_TRAFFIC_GB = VPN_TRAFFIC_GB
  api_endpoints.VPN_DAYS = VPN_DAYS
  setup_api_routes(app)
  
  runner = web.AppRunner(app)
  await runner.setup()
  site = web.TCPSite(runner, '0.0.0.0', 3333)
  await site.start()
  logger.info("Webhook server started on port 3333")
  
  # Запускаем фоновую задачу синхронизации (исправлена - больше не удаляет пользователей)
  asyncio.create_task(sync_users_with_panel())
  logger.info("Started background sync task")
  
  # Запускаем бота
  await main()


if __name__ == "__main__":
  try:
    asyncio.run(run_servers())
  except KeyboardInterrupt:
    logger.info("👋 Stopped")