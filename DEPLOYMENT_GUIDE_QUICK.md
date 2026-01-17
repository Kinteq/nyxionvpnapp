# Quick Start: Deploying Latest Updates

## What Was Updated

### ✅ Dark Theme System
- Light/Dark/System theme support
- All pages styled for dark mode
- White text for readability
- Theme toggle in header

### ✅ Promo Code System  
- PostgreSQL backend
- WELCOMETO2026: 7 days, 500 max activations
- Activation via home page form

### ✅ Device Limiting (3 max)
- Device registration with IP tracking
- Device management in profile
- Can delete old devices to unlock new ones

### ✅ Key Renewal FIX (CRITICAL)
- VPN URI preserved on renewal
- No key recreation
- Existing devices still work after renewal
- Users can renew unlimited times

## Deployment Steps

### 1. Pull Latest Code
```bash
cd "/Users/nevermore/Desktop/Nyxion_VPN_bot/Ver 2/ver2.2"
git pull origin main
git log --oneline -5  # Should show recent commits
```

### 2. Verify Dependencies
```bash
# Frontend dependencies (Next.js)
cd app
npm install  # If frontend folder exists
cd ..

# Backend dependencies (Python)
pip install aiogram aiohttp asyncpg qrcode
```

### 3. Configure Environment
```bash
# .env file should have:
DATABASE_URL=postgresql://nyxion_vpn@localhost/nyxion_vpn
TELEGRAM_BOT_TOKEN=8011671501:AAH9nxyd-pXbPHDqc2lyl5LUiYEz-mg875I
CRYPTO_PAY_TOKEN=513647:AAv2qN58YYe5pKqg2LFYFCE2sS6JKp6DcQT
```

### 4. Initialize PostgreSQL
```bash
# Run once to create tables
psql -U nyxion_vpn -d nyxion_vpn < schema.sql

# Or manually create promo_codes table:
CREATE TABLE IF NOT EXISTS promo_codes (
  code VARCHAR(50) PRIMARY KEY,
  description VARCHAR(255),
  days INT,
  traffic_gb INT,
  max_activations INT,
  used INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

# Insert WELCOMETO2026
INSERT INTO promo_codes VALUES (
  'WELCOMETO2026', 
  'Welcome Promo 2026', 
  7, 0, 500, 0, true, NOW(), NOW()
);
```

### 5. Start Backend
```bash
# Terminal 1: Start bot
python3 histeriabot.py

# Bot should log:
# ✅ BlitzAPI initialized
# ✅ Telegram bot started
# ✅ API routes configured
# ✅ PostgreSQL connected
```

### 6. Start Frontend
```bash
# Terminal 2: Start Next.js dev server (if running locally)
cd /path/to/nextjs/app
npm run dev
# Accessible at http://localhost:3000
```

### 7. Verify Deployment
```bash
# Check bot is running
curl http://localhost:3333/api/subscription?userId=1474669885

# Check promo system
curl -X POST http://localhost:3333/api/activate-promo \
  -H "Content-Type: application/json" \
  -d '{"userId": 1474669885, "promoCode": "WELCOMETO2026"}'

# Check Blitz API connection
# Bot logs should show: "✅ Blitz API test passed"
```

## Key Files to Know

| File | Purpose | Key Lines |
|------|---------|-----------|
| `histeriabot.py` | Telegram bot + Blitz API wrapper | 351-382 extend_user(), 171-410 BlitzAPI class |
| `api_endpoints.py` | REST API endpoints | 293-375 handle_activate_promo_api(), 385-550 handle_cryptobot_webhook() |
| `app/page.tsx` | Home page with promo input | Promo form submission |
| `app/profile/page.tsx` | Device management | Device list + delete buttons |
| `components/ThemeProvider.tsx` | Theme context | SSR-safe implementation |
| `SESSION_SUMMARY.md` | Detailed changes documentation | Complete overview |
| `KEY_RENEWAL_FIX.md` | Key renewal implementation details | Technical deep dive |

## Testing First Activation

```bash
# 1. Activate WELCOMETO2026 for new user
curl -X POST http://localhost:3333/api/activate-promo \
  -H "Content-Type: application/json" \
  -d '{"userId": 9999999, "promoCode": "WELCOMETO2026"}'

# Should return:
# {
#   "success": true,
#   "message": "✅ Welcome Promo 2026 активирована!",
#   "subscription": {
#     "daysLeft": 7,
#     "trafficGb": 0,
#     "vpnUri": "vless://unlimited-9999999@nyxion.app:443"
#   }
# }
```

## Testing Renewal

```bash
# 2. Activate WELCOMETO2026 AGAIN for same user
curl -X POST http://localhost:3333/api/activate-promo \
  -H "Content-Type: application/json" \
  -d '{"userId": 9999999, "promoCode": "WELCOMETO2026"}'

# Should return:
# {
#   "success": true,
#   "message": "✅ Welcome Promo 2026 активирована!",
#   "subscription": {
#     "daysLeft": 7,  # ← Just added days (not reset)
#     "trafficGb": 0,
#     "vpnUri": "vless://unlimited-9999999@nyxion.app:443"  # ← SAME URI!
#   }
# }
#
# Check PostgreSQL:
# SELECT used FROM promo_codes WHERE code='WELCOMETO2026';
# Should show: 2 (incremented from 1)
```

## Troubleshooting

### Bot won't start
```bash
# Check Python syntax
python3 -m py_compile histeriabot.py api_endpoints.py

# Check dependencies
python3 -c "import aiogram; import asyncpg; print('✅ Dependencies OK')"

# Check environment variables
echo $TELEGRAM_BOT_TOKEN
echo $DATABASE_URL
```

### Promo activation fails
```bash
# Check PostgreSQL connection
psql -U nyxion_vpn -d nyxion_vpn -c "SELECT * FROM promo_codes;"

# Check Blitz API connectivity
curl http://127.0.0.1:28260/d2ce3fdd4039c6d7cb2b14caa3631edd/api/v1/users/ \
  -H "Authorization: b443514c2528155c37d8fa3e7f6f8c81fca8dbbff956ead0e483e2769ddeb5ff"
```

### Theme not working
```bash
# Check localStorage in browser console
localStorage.getItem('theme')

# Should return: "light" or "dark" or "system"

# Check page HTML has correct classes
# In dark mode, <html> should have: class="dark"
```

### Device limit not enforced
```bash
# Check device registration in logs
# Should see: "Device registered" or "Device limit reached"

# Check in-memory device dict being populated
```

## Monitoring

### Check Bot Logs
```bash
tail -f bot.log
# Look for:
# - "📩 CryptoBot webhook received"
# - "Promo code WELCOMETO2026 activated"
# - "✅ User extended by X days"
```

### Check API Logs
```bash
# API logs go to stdout
# Monitor in terminal running histeriabot.py
```

### Check Database
```bash
psql -U nyxion_vpn -d nyxion_vpn

# Check subscriptions
SELECT user_id, expiry_date, vpn_uri, blitz_username FROM subscriptions;

# Check promo usage
SELECT code, used, max_activations FROM promo_codes;

# Check devices
SELECT user_id, device_id, ip, first_seen FROM user_devices;
```

## Rollback (if needed)
```bash
# Revert to previous commit
git reset --hard a8b7e2d  # Before key renewal fix

# Verify
git log --oneline -1
```

## Success Indicators
✅ Bot logs show all initializations successful  
✅ Promo activation returns vpn_uri  
✅ Second promo activation returns SAME uri  
✅ Device list shows registered devices  
✅ Dark mode toggles smoothly  
✅ No errors in browser console  
✅ No errors in bot logs  
✅ PostgreSQL has data  
✅ Vercel deployment shows green status  

---

**Deployment Completed:** _______________  
**All Systems:** ✅ Operational
