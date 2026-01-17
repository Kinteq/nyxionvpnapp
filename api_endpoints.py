import logging
import os
import json
import asyncio
from datetime import datetime, timezone, timedelta
from aiohttp import web, ClientSession
from typing import Dict
import asyncpg

logger = logging.getLogger(__name__)
active_subscriptions = {}
crypto_pay_api_token = os.getenv("CRYPTO_PAY_TOKEN", "513647:AAv2qN58YYe5pKqg2LFYFCE2sS6JKp6DcQT")

# Normalize DATABASE_URL for asyncpg (accepts postgresql://, not postgresql+asyncpg://)
_raw_dsn = os.getenv("DATABASE_URL", "postgresql://nyxion_vpn:nyxion_vpn_pass@localhost/nyxion_vpn")
DB_DSN = _raw_dsn.replace("postgresql+asyncpg://", "postgresql://")

# Загружаем pending_invoices из файла при старте
pending_invoices = {}
try:
    with open('pending_invoices.json', 'r') as f:
        pending_invoices = json.load(f)
        logger.info(f"📂 Loaded {len(pending_invoices)} pending invoices from file")
except FileNotFoundError:
    logger.info("No pending_invoices.json file found, starting fresh")
except Exception as e:
    logger.error(f"Error loading pending_invoices: {e}")

# Функция для сохранения pending_invoices в файл
def save_pending_invoices():
    try:
        with open('pending_invoices.json', 'w') as f:
            json.dump(pending_invoices, f, indent=2)
        logger.info(f"💾 Saved {len(pending_invoices)} pending invoices")
    except Exception as e:
        logger.error(f"Error saving pending_invoices: {e}")

# Blitz API configuration
blitz_api = None  # Will be set from histeriabot.py
VPN_TRAFFIC_GB = 0  # 0 = безлимит трафика
VPN_DAYS = 30  # Default subscription days
BLITZ_PANEL_URL = "http://127.0.0.1:28260/d2ce3fdd4039c6d7cb2b14caa3631edd"
BLITZ_API_TOKEN = "b443514c2528155c37d8fa3e7f6f8c81fca8dbbff956ead0e483e2769ddeb5ff"
HYSTERIA_SERVER = "62.60.217.189"  # Прямой адрес, чтобы не упираться в Cloudflare
HYSTERIA_PORT = 8443
HYSTERIA_SNI = "cdn.cloudflare.com"

# Отслеживание устройств пользователей (user_id -> {device_info, last_seen, ip})
user_devices = {}  # {user_id: [{device_id, ip, first_seen, last_seen}]}
MAX_DEVICES_PER_USER = 3  # Максимум устройств на одного пользователя

# Промокоды из БД
promo_codes = {}
_promo_redeem_table_ready = False

async def _ensure_promo_redeem_table():
    global _promo_redeem_table_ready
    if _promo_redeem_table_ready:
        return
    conn = await asyncpg.connect(DB_DSN)
    try:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS promo_redemptions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                code VARCHAR(50) NOT NULL,
                redeemed_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (code, user_id)
            )
            """
        )
        _promo_redeem_table_ready = True
    finally:
        await conn.close()

async def has_user_redeemed_promo(user_id: int, code: str) -> bool:
    await _ensure_promo_redeem_table()
    conn = await asyncpg.connect(DB_DSN)
    try:
        row = await conn.fetchrow(
            "SELECT 1 FROM promo_redemptions WHERE user_id=$1 AND code=$2",
            user_id, code
        )
        return row is not None
    finally:
        await conn.close()

async def mark_user_redeemed_promo(user_id: int, code: str):
    await _ensure_promo_redeem_table()
    conn = await asyncpg.connect(DB_DSN)
    try:
        await conn.execute(
            """
            INSERT INTO promo_redemptions(user_id, code)
            VALUES($1, $2)
            ON CONFLICT (code, user_id) DO NOTHING
            """,
            user_id, code
        )
    finally:
        await conn.close()

async def fetch_promo_from_db(code: str):
    conn = await asyncpg.connect(DB_DSN)
    try:
        row = await conn.fetchrow(
            """
            SELECT code, description, days, traffic_gb, max_activations, used, is_active
            FROM promo_codes
            WHERE code = $1
            """,
            code,
        )
        return dict(row) if row else None
    finally:
        await conn.close()

async def reserve_promo_in_db(code: str):
    conn = await asyncpg.connect(DB_DSN)
    try:
        row = await conn.fetchrow(
            """
            UPDATE promo_codes
            SET used = used + 1, updated_at = now()
            WHERE code = $1 AND is_active = TRUE AND used < max_activations
            RETURNING code, description, days, traffic_gb, max_activations, used
            """,
            code,
        )
        return dict(row) if row else None
    finally:
        await conn.close()

def calculate_days_left(exp):
    if isinstance(exp, str):
        try: exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        except: return 0
    if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
    delta = (exp - datetime.now(timezone.utc)).total_seconds()
    return max(0, int(delta / 86400))

def register_device(user_id, device_id, ip_address):
    """Регистрация устройства пользователя с проверкой лимита"""
    if user_id not in user_devices:
        user_devices[user_id] = []
    
    # Проверка существующего устройства
    for device in user_devices[user_id]:
        if device["device_id"] == device_id:
            device["last_seen"] = datetime.now(timezone.utc).isoformat()
            device["ip"] = ip_address
            return True, "Device updated"
    
    # Проверка лимита устройств
    if len(user_devices[user_id]) >= MAX_DEVICES_PER_USER:
        return False, f"Превышен лимит устройств ({MAX_DEVICES_PER_USER}). Удалите старое устройство в профиле."
    
    # Добавление нового устройства
    now = datetime.now(timezone.utc).isoformat()
    user_devices[user_id].append({
        "device_id": device_id,
        "ip": ip_address,
        "first_seen": now,
        "last_seen": now
    })
    
    logger.info(f"New device registered for user {user_id}: {device_id} from {ip_address}")
    return True, "Device registered"

async def fetch_user_from_blitz(username: str) -> dict:
    """Получить свежие данные пользователя из Blitz Panel напрямую"""
    if not blitz_api:
        return None
    try:
        user_data = await blitz_api.get_user(username)
        if user_data:
            return {
                "username": user_data.get("username"),
                "expiration_days": user_data.get("expiration_days", 0),
                "traffic_limit": user_data.get("traffic_limit", 0),
                "created_at": user_data.get("created_at"),
                "uri": user_data.get("uri")
            }
    except Exception as e:
        logger.warning(f"Could not fetch user {username} from Blitz: {e}")
    return None

async def handle_subscription_api(req):
    try:
        uid = int(req.rel_url.query.get("userId", 0))
        device_id = req.rel_url.query.get("deviceId", "unknown")
        ip_address = req.headers.get("X-Forwarded-For", req.remote) or "unknown"
        
        # Читаем подписку из БД
        conn = await asyncpg.connect(DB_DSN)
        try:
            sub = await conn.fetchrow(
                """
                SELECT user_id, vpn_username, vpn_uri, expiry_date, traffic_gb, is_active
                FROM subscriptions
                WHERE user_id = $1
                ORDER BY expiry_date DESC
                LIMIT 1
                """,
                uid
            )
        finally:
            await conn.close()
        
        if not sub: 
            return web.json_response({"isActive": False})
        
        # Проверка и регистрация устройства
        success, message = register_device(uid, device_id, ip_address)
        if not success:
            return web.json_response({
                "isActive": False,
                "error": message,
                "deviceLimitReached": True
            })
        
        # Получаем свежие данные из Blitz Panel
        blitz_username = sub.get("vpn_username")
        blitz_data = None
        if blitz_username:
            blitz_data = await fetch_user_from_blitz(blitz_username)
        
        # Если удалось получить из Blitz, используем свежие данные; иначе из БД
        if blitz_data:
            exp_days = blitz_data.get("expiration_days", 0)
            created_at = blitz_data.get("created_at")
            if isinstance(created_at, str):
                try:
                    created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except:
                    created_dt = datetime.now(timezone.utc)
            else:
                created_dt = datetime.now(timezone.utc)
            exp = created_dt + timedelta(days=exp_days)
            vpn_uri = blitz_data.get("uri") or sub.get("vpn_uri", "")
        else:
            # Используем данные из БД
            exp = sub.get("expiry_date")
            if isinstance(exp, str): 
                exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp.tzinfo is None: 
                exp = exp.replace(tzinfo=timezone.utc)
            vpn_uri = sub.get("vpn_uri", "")
        
        is_act = (exp - datetime.now(timezone.utc)).total_seconds() > 0
        devices_count = len(user_devices.get(uid, []))
        
        return web.json_response({
            "isActive": is_act, 
            "expiryDate": exp.strftime("%d.%m.%Y"), 
            "daysLeft": calculate_days_left(exp), 
            "vpnUri": vpn_uri, 
            "trafficGb": sub.get("traffic_gb", 0),
            "devicesCount": devices_count,
            "maxDevices": MAX_DEVICES_PER_USER
        })
    except Exception as e:
        logger.error(f"Subscription API error: {e}")
        return web.json_response({"error": "Error"}, status=500)

async def handle_user_api(req):
    try:
        uid = int(req.rel_url.query.get("userId", 0))
        
        # Читаем подписку из БД
        conn = await asyncpg.connect(DB_DSN)
        try:
            sub = await conn.fetchrow(
                """
                SELECT user_id, vpn_username, vpn_uri, expiry_date, traffic_gb, is_active
                FROM subscriptions
                WHERE user_id = $1
                ORDER BY expiry_date DESC
                LIMIT 1
                """,
                uid
            )
        finally:
            await conn.close()
        
        if not sub: 
            return web.json_response({"id": uid, "hasSubscription": False})
        
        # Получаем свежие данные из Blitz Panel
        blitz_username = sub.get("vpn_username")
        blitz_data = None
        if blitz_username:
            blitz_data = await fetch_user_from_blitz(blitz_username)
        
        # Если удалось получить из Blitz, используем свежие данные; иначе из БД
        if blitz_data:
            exp_days = blitz_data.get("expiration_days", 0)
            created_at = blitz_data.get("created_at")
            if isinstance(created_at, str):
                try:
                    created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except:
                    created_dt = datetime.now(timezone.utc)
            else:
                created_dt = datetime.now(timezone.utc)
            exp = created_dt + timedelta(days=exp_days)
        else:
            exp = sub.get("expiry_date")
            if isinstance(exp, str): 
                exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp.tzinfo is None: 
                exp = exp.replace(tzinfo=timezone.utc)
        
        is_act = (exp - datetime.now(timezone.utc)).total_seconds() > 0
        return web.json_response({
            "id": uid, 
            "hasSubscription": True, 
            "isActive": is_act, 
            "expiryDate": exp.strftime("%d.%m.%Y"), 
            "daysLeft": calculate_days_left(exp)
        })
    except Exception as e:
        logger.error(f"User API error: {e}")
        return web.json_response({"error": "Error"}, status=500)

async def handle_keys_api(req):
    """Получить VPN ключи пользователя"""
    try:
        uid = int(req.rel_url.query.get("userId", 0))
        
        # Читаем подписку из БД
        conn = await asyncpg.connect(DB_DSN)
        try:
            sub = await conn.fetchrow(
                """
                SELECT user_id, vpn_username, vpn_uri, expiry_date, is_active
                FROM subscriptions
                WHERE user_id = $1
                ORDER BY expiry_date DESC
                LIMIT 1
                """,
                uid
            )
        finally:
            await conn.close()
        
        if not sub or not sub.get("vpn_uri"):
            return web.json_response({"keys": []})
        
        # Получаем свежие данные из Blitz Panel
        blitz_username = sub.get("vpn_username")
        blitz_data = None
        vpn_uri = sub.get("vpn_uri", "")
        
        if blitz_username:
            blitz_data = await fetch_user_from_blitz(blitz_username)
            if blitz_data:
                vpn_uri = blitz_data.get("uri") or vpn_uri
                exp_days = blitz_data.get("expiration_days", 0)
                created_at = blitz_data.get("created_at")
                if isinstance(created_at, str):
                    try:
                        created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    except:
                        created_dt = datetime.now(timezone.utc)
                else:
                    created_dt = datetime.now(timezone.utc)
                expiry_date = created_dt + timedelta(days=exp_days)
            else:
                expiry_date = sub.get("expiry_date")
                if isinstance(expiry_date, str): 
                    expiry_date = datetime.fromisoformat(expiry_date.replace("Z", "+00:00"))
                if isinstance(expiry_date, datetime) and expiry_date.tzinfo is None: 
                    expiry_date = expiry_date.replace(tzinfo=timezone.utc)
        else:
            expiry_date = sub.get("expiry_date")
            if isinstance(expiry_date, str): 
                expiry_date = datetime.fromisoformat(expiry_date.replace("Z", "+00:00"))
            if isinstance(expiry_date, datetime) and expiry_date.tzinfo is None: 
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
        
        # Возвращаем список ключей
        return web.json_response({
            "keys": [{
                "id": 1,
                "uri": vpn_uri,
                "name": "Hysteria VPN Key",
                "expiryDate": expiry_date.strftime("%d.%m.%Y") if hasattr(expiry_date, 'strftime') else expiry_date,
                "isActive": True
            }]
        })
    except Exception as e:
        logger.error(f"Keys API error: {e}")
        return web.json_response({"error": str(e)}, status=500)

async def handle_subscription_text_api(req):
    """Возвращает подписку в текстовом виде (NormalSub-подобный формат: по одному URI на строку)."""
    try:
        uid = int(req.rel_url.query.get("userId", 0))
        
        # Читаем подписку из БД
        conn = await asyncpg.connect(DB_DSN)
        try:
            sub = await conn.fetchrow(
                """
                SELECT user_id, vpn_username, vpn_uri
                FROM subscriptions
                WHERE user_id = $1
                ORDER BY expiry_date DESC
                LIMIT 1
                """,
                uid
            )
        finally:
            await conn.close()
        
        if not sub or not sub.get("vpn_uri"):
            return web.Response(text="", content_type="text/plain; charset=utf-8")
        
        # Получаем свежие данные из Blitz Panel
        blitz_username = sub.get("vpn_username")
        vpn_uri = sub.get("vpn_uri", "")
        
        if blitz_username:
            blitz_data = await fetch_user_from_blitz(blitz_username)
            if blitz_data:
                vpn_uri = blitz_data.get("uri") or vpn_uri
        
        content = vpn_uri.strip() + "\n"
        return web.Response(text=content, content_type="text/plain; charset=utf-8")
    except Exception as e:
        logger.error(f"Subscription text API error: {e}")
        return web.Response(text="", content_type="text/plain; charset=utf-8")

async def handle_create_invoice_api(req):
    """Создать счёт на оплату"""
    try:
        data = await req.json()
        user_id = data.get("userId")
        payment_method = data.get("method", "cryptobot")  # cryptobot или yukassa
        asset = data.get("asset", "USDT")  # TON | USDT | BTC
        
        if not user_id:
            return web.json_response({"error": "userId required"}, status=400)
        
        if payment_method == "cryptobot":
            if not crypto_pay_api_token:
                return web.json_response({"error": "CryptoBot token not configured"}, status=500)

            # Простейшее сопоставление суммы для разных активов (примерные значения)
            asset_amounts = {"USDT": 2.0, "TON": 5.0, "BTC": 0.00004}
            amount = float(data.get("amount", asset_amounts.get(asset, 2.0)))

            payload = {
                "asset": asset,
                "amount": amount,
                "description": f"Nyxion VPN 30 дней (user {user_id})",
                "allow_comments": False,
                "allow_anonymous": True,
                "expires_in": 3600,
                # После оплаты предложить перейти в Mini App (к ключам)
                "paid_btn_name": "viewItem",
                "paid_btn_url": "https://nyxionvpnapp.vercel.app/keys"
            }

            async with ClientSession() as session:
                async with session.post(
                    "https://pay.crypt.bot/api/createInvoice",
                    json=payload,
                    headers={"Crypto-Pay-API-Token": crypto_pay_api_token},
                    timeout=15,
                ) as resp:
                    if resp.status != 200:
                        text = await resp.text()
                        logger.error(f"CryptoBot API error: {resp.status} {text}")
                        return web.json_response({"error": "Failed to create invoice"}, status=500)
                    result = await resp.json()
                    # Ожидаемый ответ: { ok: true, result: { invoice_id, pay_url, ... } }
                    if not result.get("ok"):
                        return web.json_response(result, status=500)
                    r = result.get("result", {})
                    invoice_id = r.get("invoice_id")
                    pay_url = r.get("pay_url")
                    pending_invoices[str(invoice_id)] = {"user_id": user_id, "asset": asset, "amount": amount}
                    
                    # Сохраняем pending_invoices в файл
                    try:
                        with open('pending_invoices.json', 'w') as f:
                            json.dump(pending_invoices, f, indent=2)
                        logger.info(f"💾 Saved invoice {invoice_id} to pending_invoices.json")
                    except Exception as e:
                        logger.error(f"Error saving pending_invoices: {e}")
                    
                    return web.json_response({
                        "success": True,
                        "invoiceUrl": pay_url,
                        "invoiceId": str(invoice_id),
                        "amount": amount,
                        "currency": asset
                    })
        else:
            # Заглушка для ЮКассы: возвращаем статус, позже добавим реальную интеграцию
            return web.json_response({"success": False, "error": "YooKassa not implemented yet"}, status=501)
    except Exception as e:
        logger.error(f"Create invoice error: {e}")
        return web.json_response({"error": str(e)}, status=500)

async def handle_devices_api(req):
    """Получить список устройств пользователя и управление ими"""
    try:
        if req.method == "GET":
            uid = int(req.rel_url.query.get("userId", 0))
            devices = user_devices.get(uid, [])
            return web.json_response({
                "devices": devices,
                "count": len(devices),
                "maxDevices": MAX_DEVICES_PER_USER
            })
        
        elif req.method == "DELETE":
            data = await req.json()
            uid = data.get("userId")
            device_id = data.get("deviceId")
            
            if uid in user_devices:
                user_devices[uid] = [d for d in user_devices[uid] if d["device_id"] != device_id]
                logger.info(f"Device {device_id} removed for user {uid}")
                return web.json_response({"success": True, "message": "Устройство удалено"})
            
            return web.json_response({"success": False, "error": "User not found"}, status=404)
            
    except Exception as e:
        logger.error(f"Devices API error: {e}")
        return web.json_response({"error": str(e)}, status=500)

async def handle_activate_promo_api(req):
    """Активация промокода"""
    try:
        data = await req.json()
        user_id = data.get("userId")
        promo_code = data.get("promoCode", "").strip().upper()
        
        if not user_id or not promo_code:
            return web.json_response({"success": False, "error": "Missing userId or promoCode"}, status=400)
        
        # Проверка промокода в БД
        promo = await fetch_promo_from_db(promo_code)
        if not promo or not promo.get("is_active"):
            return web.json_response({"success": False, "error": "Неверный промокод"}, status=404)

        # Ограничение: один раз на пользователя для данного кода
        if await has_user_redeemed_promo(int(user_id), promo_code):
            return web.json_response({
                "success": False,
                "error": "Этот промокод уже был активирован вашим аккаунтом"
            }, status=400)

        # Резервируем активацию (used +1 если есть лимит)
        reserved = await reserve_promo_in_db(promo_code)
        if not reserved:
            return web.json_response({"success": False, "error": "Лимит активаций исчерпан"}, status=400)

        # Активация подписки - если уже есть подписка, продлеваем, иначе создаём новую
        from datetime import timedelta
        
        vpn_uri = None
        blitz_username = None
        
        # Проверяем есть ли уже активная подписка в БД
        conn = await asyncpg.connect(DB_DSN)
        try:
            existing_sub = await conn.fetchrow(
                "SELECT user_id, vpn_username, vpn_uri, expiry_date FROM subscriptions WHERE user_id = $1",
                user_id
            )
        finally:
            await conn.close()
        
        if existing_sub:
            # Продлеваем существующую подписку (добавляем дни к текущему сроку)
            current_expiry = existing_sub["expiry_date"]
            if isinstance(current_expiry, str):
                current_expiry = datetime.fromisoformat(current_expiry)
            if current_expiry.tzinfo is None:
                current_expiry = current_expiry.replace(tzinfo=timezone.utc)
            
            expiry_date = current_expiry + timedelta(days=reserved["days"])
            vpn_uri = existing_sub["vpn_uri"]
            blitz_username = existing_sub.get("vpn_username")
            
            # Продлеваем в Blitz (сохраняет существующий ключ и URI)
            if blitz_username:
                try:
                    extend_result = await blitz_api.extend_user(blitz_username, reserved["days"])
                    if extend_result:
                        logger.info(f"Extended Blitz user {blitz_username} by {reserved['days']} days")
                    else:
                        logger.warning(f"Could not extend Blitz user {blitz_username}")
                except Exception as e:
                    logger.warning(f"Could not extend Blitz user: {e}")
            
            logger.info(f"Extending existing subscription for user {user_id} by {reserved['days']} days")
        else:
            # Создаём новую подписку
            expiry_date = datetime.now(timezone.utc) + timedelta(days=reserved["days"])
            vpn_uri = f"vless://unlimited-{user_id}@nyxion.app:443"
            # Создаём пользователя в Blitz (получаем реальный username)
            try:
                blitz_result = await blitz_api.create_user(
                    username=f"vpn_{user_id}",
                    traffic_gb=reserved["traffic_gb"],
                    expiry_days=reserved["days"]
                )
                blitz_username = blitz_result.get("username")
                vpn_uri = blitz_result.get("uri", vpn_uri)
                logger.info(f"Created Blitz user for {user_id}: {blitz_username}")
            except Exception as e:
                logger.warning(f"Could not create Blitz user: {e}")
        
        # Сохраняем в БД
        conn = await asyncpg.connect(DB_DSN)
        try:
            await conn.execute("""
                INSERT INTO subscriptions (user_id, vpn_username, vpn_uri, expiry_date, traffic_gb, promo_code, is_active, created_at, updated_at, server_id)
                VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW(), 1)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    vpn_uri = $3,
                    expiry_date = $4,
                    traffic_gb = $5,
                    promo_code = COALESCE(subscriptions.promo_code, $6),
                    is_active = true,
                    updated_at = NOW()
            """, user_id, blitz_username, vpn_uri, expiry_date, reserved["traffic_gb"], promo_code)
        finally:
            await conn.close()

        # Фиксируем факт активации промокода для пользователя (одноразовость)
        try:
            await mark_user_redeemed_promo(int(user_id), promo_code)
        except Exception as e:
            logger.warning(f"Failed to record promo redemption for user {user_id}, code {promo_code}: {e}")
        
        logger.info(f"Promo code {promo_code} activated for user {user_id}")
        
        return web.json_response({
            "success": True,
            "message": f"✅ {reserved['description']} активирована!",
            "subscription": {
                "daysLeft": reserved["days"],
                "trafficGb": reserved["traffic_gb"],
                "vpnUri": vpn_uri
            }
        })
        
    except json.JSONDecodeError:
        return web.json_response({"success": False, "error": "Invalid JSON"}, status=400)
    except Exception as e:
        logger.error(f"Error activating promo: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

async def handle_cryptobot_webhook(req):
    """Обработка webhook от CryptoBot после оплаты (продлеваем без смены URI)"""
    try:
        data = await req.json()
        logger.info(f"📩 CryptoBot webhook received: {data}")

        update_type = data.get("update_type")
        if update_type != "invoice_paid":
            logger.info(f"Ignoring webhook type: {update_type}")
            return web.Response(text="OK")

        payload = data.get("payload", {})
        invoice_id = str(payload.get("invoice_id"))
        status = payload.get("status")
        if status != "paid":
            logger.info(f"Invoice {invoice_id} status is {status}, skipping")
            return web.Response(text="OK")

        invoice_data = pending_invoices.get(invoice_id)
        if not invoice_data:
            logger.warning(f"⚠️ Invoice {invoice_id} not found in pending_invoices")
            return web.Response(text="OK")

        user_id = int(invoice_data.get("user_id"))
        logger.info(f"💰 Processing payment for user {user_id}")

        # Текущая подписка из БД (если есть)
        current_sub = None
        conn = await asyncpg.connect(DB_DSN)
        try:
            current_sub = await conn.fetchrow(
                """
                SELECT user_id, vpn_username, vpn_uri, expiry_date
                FROM subscriptions
                WHERE user_id = $1
                ORDER BY expiry_date DESC
                LIMIT 1
                """,
                user_id
            )
        finally:
            await conn.close()

        blitz_username = (current_sub.get("vpn_username") if current_sub else None) or f"vpn_{user_id}"
        existing_vpn_uri = current_sub.get("vpn_uri") if current_sub else None

        # Продление в Blitz без смены URI
        extended = False
        try:
            if blitz_api:
                extended = await blitz_api.extend_user(blitz_username, VPN_DAYS)
            else:
                logger.warning("blitz_api is not initialized; skipping Blitz extension")
        except Exception as e:
            logger.warning(f"Could not extend Blitz user {blitz_username}: {e}")

        # Если не удалось продлить через Blitz, не меняем локально URI; продолжаем апдейт БД

        # Новая дата окончания: от текущей expiry или от сейчас, что больше, + VPN_DAYS
        base_dt = datetime.now(timezone.utc)
        if current_sub and current_sub.get("expiry_date"):
            exp = current_sub.get("expiry_date")
            if isinstance(exp, str):
                try:
                    exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
                except:
                    exp = base_dt
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > base_dt:
                base_dt = exp
        new_expiry = base_dt + timedelta(days=VPN_DAYS)

        # Если URI отсутствует (новый пользователь), пробуем создать пользователя и получить URI
        new_vpn_uri = existing_vpn_uri
        if not existing_vpn_uri:
            try:
                if blitz_api:
                    created = await blitz_api.create_user(blitz_username, traffic_gb=0, expiry_days=VPN_DAYS)
                    # Попробуем получить URI
                    new_vpn_uri = created.get("uri") or new_vpn_uri or ""
            except Exception as e:
                logger.warning(f"Could not create Blitz user {blitz_username}: {e}")

        # Сохраняем в БД, не меняя URI, если он уже был
        conn = await asyncpg.connect(DB_DSN)
        try:
            await conn.execute(
                """
                INSERT INTO subscriptions (user_id, vpn_username, vpn_uri, expiry_date, traffic_gb, is_active, created_at, updated_at, server_id)
                VALUES ($1, $2, $3, $4, 0, true, NOW(), NOW(), 1)
                ON CONFLICT (user_id)
                DO UPDATE SET
                    vpn_uri = COALESCE(subscriptions.vpn_uri, EXCLUDED.vpn_uri),
                    expiry_date = EXCLUDED.expiry_date,
                    is_active = true,
                    updated_at = NOW()
                """,
                user_id, blitz_username, new_vpn_uri or existing_vpn_uri or "", new_expiry
            )
        finally:
            await conn.close()

        # Очистка pending и ответ
        del pending_invoices[invoice_id]
        save_pending_invoices()
        logger.info(f"✅ Payment processed for user {user_id}; new expiry: {new_expiry}")
        return web.Response(text="OK")

    except Exception as e:
        logger.error(f"❌ Webhook error: {e}", exc_info=True)
        return web.Response(text="ERROR", status=500)

def setup_api_routes(app):
    app.router.add_get("/api/subscription", handle_subscription_api)
    app.router.add_get("/api/user", handle_user_api)
    app.router.add_get("/api/keys", handle_keys_api)
    app.router.add_get("/api/sub.txt", handle_subscription_text_api)
    app.router.add_post("/api/create-invoice", handle_create_invoice_api)
    app.router.add_post("/api/activate-promo", handle_activate_promo_api)
    app.router.add_post("/api/cryptobot-webhook", handle_cryptobot_webhook)  # Webhook от CryptoBot
    app.router.add_route("*", "/api/devices", handle_devices_api)  # GET и DELETE
    app.middlewares.append(cors_middleware)
    logger.info("API routes configured")

@web.middleware
async def cors_middleware(req, handler):
    if req.method == "OPTIONS": return web.Response(status=200, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type"})
    r = await handler(req)
    r.headers["Access-Control-Allow-Origin"] = "*"
    r.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return r