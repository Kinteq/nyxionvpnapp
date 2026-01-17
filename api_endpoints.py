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

DB_DSN = os.getenv("DATABASE_URL", "postgresql://nyxion_vpn@localhost/nyxion_vpn")

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

async def handle_subscription_api(req):
    try:
        uid = int(req.rel_url.query.get("userId", 0))
        device_id = req.rel_url.query.get("deviceId", "unknown")
        ip_address = req.headers.get("X-Forwarded-For", req.remote) or "unknown"
        
        sub = active_subscriptions.get(uid)
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
        
        exp = sub.get("expiry_date")
        if isinstance(exp, str): exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        is_act = (exp - datetime.now(timezone.utc)).total_seconds() > 0
        
        devices_count = len(user_devices.get(uid, []))
        
        return web.json_response({
            "isActive": is_act, 
            "expiryDate": exp.strftime("%d.%m.%Y"), 
            "daysLeft": calculate_days_left(exp), 
            "vpnUri": sub.get("vpn_uri", ""), 
            "trafficGb": sub.get("traffic_gb", 0),
            "devicesCount": devices_count,
            "maxDevices": MAX_DEVICES_PER_USER
        })
    except: 
        return web.json_response({"error": "Error"}, status=500)

async def handle_user_api(req):
    try:
        uid = int(req.rel_url.query.get("userId", 0))
        sub = active_subscriptions.get(uid)
        if not sub: return web.json_response({"id": uid, "hasSubscription": False})
        exp = sub.get("expiry_date")
        if isinstance(exp, str): exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        is_act = (exp - datetime.now(timezone.utc)).total_seconds() > 0
        return web.json_response({"id": uid, "hasSubscription": True, "isActive": is_act, "expiryDate": exp.strftime("%d.%m.%Y"), "daysLeft": calculate_days_left(exp)})
    except: return web.json_response({"error": "Error"}, status=500)

async def handle_keys_api(req):
    """Получить VPN ключи пользователя"""
    try:
        uid = int(req.rel_url.query.get("userId", 0))
        sub = active_subscriptions.get(uid)
        if not sub or not sub.get("vpn_uri"):
            return web.json_response({"keys": []})
        
        # Возвращаем список ключей
        return web.json_response({
            "keys": [{
                "id": 1,
                "uri": sub.get("vpn_uri", ""),
                "name": "Hysteria VPN Key",
                "expiryDate": sub.get("expiry_date").strftime("%d.%m.%Y") if hasattr(sub.get("expiry_date"), 'strftime') else sub.get("expiry_date"),
                "isActive": True
            }]
        })
    except Exception as e:
        logger.error(f"Keys API error: {e}")
        return web.json_response({"error": str(e)}, status=500)

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
        
        # Проверяем есть ли уже активная подписка
        if user_id in active_subscriptions:
            existing_sub = active_subscriptions[user_id]
            # Продлеваем существующую подписку (добавляем дни к текущему сроку)
            current_expiry = datetime.fromisoformat(existing_sub["expiry_date"])
            expiry_date = current_expiry + timedelta(days=reserved["days"])
            vpn_uri = existing_sub["vpn_uri"]
            blitz_username = existing_sub.get("blitz_username")
            
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
                    username=f"user_{user_id}",
                    traffic_gb=reserved["traffic_gb"],
                    expiry_days=reserved["days"]
                )
                blitz_username = blitz_result.get("username")
                vpn_uri = blitz_result.get("uri", vpn_uri)
                logger.info(f"Created Blitz user for {user_id}: {blitz_username}")
            except Exception as e:
                logger.warning(f"Could not create Blitz user: {e}")
        
        active_subscriptions[user_id] = {
            "expiry_date": expiry_date.isoformat(),
            "vpn_uri": vpn_uri,
            "traffic_gb": reserved["traffic_gb"],
            "promo_code": promo_code,
            "blitz_username": blitz_username
        }

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
                "vpnUri": active_subscriptions[user_id]["vpn_uri"]
            }
        })
        
    except json.JSONDecodeError:
        return web.json_response({"success": False, "error": "Invalid JSON"}, status=400)
    except Exception as e:
        logger.error(f"Error activating promo: {e}")
        return web.json_response({"success": False, "error": str(e)}, status=500)

async def handle_cryptobot_webhook(req):
    """Обработка webhook от CryptoBot после оплаты"""
    try:
        data = await req.json()
        logger.info(f"📩 CryptoBot webhook received: {data}")
        
        # CryptoBot webhook format: 
        # {
        #   "update_id": 12345,
        #   "update_type": "invoice_paid",
        #   "request_date": "2024-01-01T12:00:00Z",
        #   "payload": {
        #     "invoice_id": "42216129",
        #     "status": "paid",
        #     "asset": "USDT",
        #     "amount": "0.5",
        #     ...
        #   }
        # }
        
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
        
        # Находим данные о платеже
        invoice_data = pending_invoices.get(invoice_id)
        if not invoice_data:
            logger.warning(f"⚠️ Invoice {invoice_id} not found in pending_invoices")
            return web.Response(text="OK")
        
        user_id = invoice_data.get("user_id")
        asset = invoice_data.get("asset", "USDT")
        amount = invoice_data.get("amount", 0)
        
        logger.info(f"💰 Processing payment for user {user_id}: {amount} {asset}")
        
        username = f"vpn_{user_id}"
        
        # Проверяем существует ли пользователь в Blitz Panel
        user_exists = False
        current_expiry_days = 0
        
        async with ClientSession() as session:
            try:
                # Проверяем существующего пользователя
                headers = {"Authorization": BLITZ_API_TOKEN}
                async with session.get(f"{BLITZ_PANEL_URL}/api/v1/users/{username}", headers=headers) as resp:
                    if resp.status == 200:
                        user_data = await resp.json()
                        user_exists = True
                        current_expiry_days = user_data.get('expiration_days', 0)
                        logger.info(f"📊 User {username} exists with {current_expiry_days} days")
            except Exception as e:
                logger.warning(f"⚠️ Error checking user: {e}")
        
        # Генерируем новый пароль
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + '_-'
        password = ''.join(secrets.choice(alphabet) for _ in range(32))
        
        # Расчет новой даты окончания подписки
        if user_exists:
            # При продлении добавляем +30 дней к текущему сроку
            new_expiry_days = current_expiry_days + VPN_DAYS
            logger.info(f"🔄 Extending subscription: {current_expiry_days} + {VPN_DAYS} = {new_expiry_days} days")
        else:
            # Новый пользователь
            new_expiry_days = VPN_DAYS
            logger.info(f"🆕 New user: {new_expiry_days} days")
        
        # Создаем или обновляем пользователя через Blitz Panel API
        vpn_uri = ""
        async with ClientSession() as session:
            try:
                if user_exists:
                    # Обновляем существующего пользователя (новый пароль + продление)
                    update_data = {
                        "new_password": password,
                        "new_expiration_days": new_expiry_days,
                        "new_traffic_limit": 0,
                        "blocked": False,
                        "unlimited_ip": False,
                        "renew_password": False,
                        "renew_creation_date": False
                    }
                    
                    headers = {"Authorization": BLITZ_API_TOKEN}
                    async with session.patch(
                        f"{BLITZ_PANEL_URL}/api/v1/users/{username}",
                        json=update_data,
                        headers=headers
                    ) as resp:
                        if resp.status == 200:
                            vpn_uri = (
                                f"hysteria2://{username}:{password}@{HYSTERIA_SERVER}:{HYSTERIA_PORT}/"
                                f"?sni={HYSTERIA_SNI}&insecure=1#Nyxion%20VPN"
                            )
                            logger.info(f"✅ Updated user {username} via Blitz API")
                        else:
                            error_text = await resp.text()
                            logger.error(f"❌ Failed to update user {username}: {resp.status} - {error_text}")
                            vpn_uri = "Error creating VPN key"
                else:
                    # Создаем нового пользователя
                    create_data = {
                        "username": username,
                        "password": password,
                        "traffic_limit": 0,
                        "expiration_days": new_expiry_days,
                        "unlimited": True,
                        "blocked": False,
                        "note": None
                    }
                    
                    headers = {"Authorization": BLITZ_API_TOKEN}
                    async with session.post(
                        f"{BLITZ_PANEL_URL}/api/v1/users/",
                        json=create_data,
                        headers=headers
                    ) as resp:
                        if resp.status in [200, 201]:
                            vpn_uri = (
                                f"hysteria2://{username}:{password}@{HYSTERIA_SERVER}:{HYSTERIA_PORT}/"
                                f"?sni={HYSTERIA_SNI}&insecure=1#Nyxion%20VPN"
                            )
                            logger.info(f"✅ Created user {username} via Blitz API")
                        else:
                            error_text = await resp.text()
                            logger.error(f"❌ Failed to create user {username}: {resp.status} - {error_text}")
                            vpn_uri = "Error creating VPN key"
            except Exception as e:
                logger.error(f"💥 Exception working with Blitz API: {e}")
                import traceback
                logger.error(traceback.format_exc())
                vpn_uri = "Error creating VPN key"
        
        # Сохраняем подписку
        if vpn_uri and vpn_uri != "Error creating VPN key":
            # Рассчитываем дату окончания
            from datetime import datetime, timedelta, timezone
            creation_date = datetime.now(timezone.utc)
            expiry_date = creation_date + timedelta(days=new_expiry_days)
            
            active_subscriptions[user_id] = {
                "username": username,
                "password": password,
                "expiry_date": expiry_date.isoformat(),
                "traffic_gb": 0,  # Безлимит
                "vpn_uri": vpn_uri,
                "created_at": creation_date.isoformat(),
                "blitz_username": username
            }
            
            logger.info(f"✅ Subscription {'extended' if user_exists else 'created'} for user {user_id} until {expiry_date}")
        else:
            logger.error(f"❌ Failed to create VPN key for user {user_id}")
        
        # Удаляем из pending
        del pending_invoices[invoice_id]
        save_pending_invoices()
        
        # Сохраняем подписки в subscriptions.json
        try:
            with open('subscriptions.json', 'w') as f:
                # Сериализуем даты в ISO формат
                subs_to_save = {}
                for uid, sub in active_subscriptions.items():
                    sub_copy = sub.copy()
                    if isinstance(sub_copy.get('expiry_date'), datetime):
                        sub_copy['expiry_date'] = sub_copy['expiry_date'].isoformat()
                    subs_to_save[uid] = sub_copy
                json.dump(subs_to_save, f, indent=2)
                logger.info("💾 Subscriptions saved")
        except Exception as e:
            logger.error(f"Error saving subscriptions: {e}")
        
        return web.Response(text="OK")
        
    except Exception as e:
        logger.error(f"❌ Webhook error: {e}", exc_info=True)
        return web.Response(text="ERROR", status=500)

def setup_api_routes(app):
    app.router.add_get("/api/subscription", handle_subscription_api)
    app.router.add_get("/api/user", handle_user_api)
    app.router.add_get("/api/keys", handle_keys_api)
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