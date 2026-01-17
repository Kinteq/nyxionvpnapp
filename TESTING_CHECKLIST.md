# Testing Checklist for VPN Bot Improvements

## 1. Dark Theme System
- [ ] Toggle theme button works (System → Light → Dark → System)
- [ ] Theme persists after page reload
- [ ] All text readable in dark mode (white text contrast)
- [ ] Home page white text visible
- [ ] Profile page white text visible
- [ ] Keys page white text visible
- [ ] Buy page white text visible
- [ ] Header colors correct in both themes
- [ ] Navigation colors adjust based on theme

## 2. Promo Code System
- [ ] WELCOMETO2026 promo is active
- [ ] Promo input visible on home page
- [ ] Can activate WELCOMETO2026
- [ ] Returns 7-day subscription
- [ ] Promo code limit enforced (500 max)
- [ ] User gets correct vpn_uri on first activation
- [ ] UI shows correct days left
- [ ] Invalid promo shows error message

## 3. Key Renewal (CRITICAL)
- [ ] First WELCOMETO2026 activation creates new subscription
- [ ] vpn_uri returned to user
- [ ] User can connect with URI
- [ ] Second WELCOMETO2026 activation **returns SAME vpn_uri**
- [ ] Days extended (7 + 7 = 14 total)
- [ ] Existing devices still work after renewal
- [ ] No new key generated on renewal

## 4. Device Limiting
- [ ] Register first device (device 1)
- [ ] Register second device (device 2)
- [ ] Register third device (device 3)
- [ ] Try to register fourth device → gets deviceLimitReached error
- [ ] Delete device 1 from profile
- [ ] Can now register new device 4
- [ ] Device list shows: device_id, IP, first_seen, last_seen

## 5. Payment/CryptoBot Webhook
- [ ] Send test payment via CryptoBot
- [ ] Webhook received and processed
- [ ] New subscription created for paid user
- [ ] vpn_uri provided
- [ ] User can connect with payment-based URI
- [ ] Renewal payment extends existing subscription (same URI)

## 6. User Profile
- [ ] Profile page loads correctly
- [ ] Shows user info (Telegram name, ID)
- [ ] Device list displays with all devices
- [ ] Can delete individual devices
- [ ] Delete button removes device from limit counter
- [ ] ToS section visible and readable
- [ ] Dark mode: all text white and readable

## 7. VPN Key Display (/keys)
- [ ] Page shows active vpn_uri
- [ ] Shows days left calculated correctly
- [ ] Copy button copies URI to clipboard
- [ ] Shows expiry date
- [ ] Works after promo activation
- [ ] Works after payment
- [ ] Dark mode text readable

## 8. Buy Page
- [ ] Page displays currency options (USDT, TON, BTC, ETH, USDC)
- [ ] Can select currency
- [ ] CryptoBot button visible
- [ ] Button styling correct (soft coral-peach in light, white text in dark)
- [ ] Button takes to CryptoBot payment
- [ ] Dark mode: white text on dark background

## 9. Database Integration
- [ ] PostgreSQL promo_codes table exists
- [ ] WELCOMETO2026 has: days=7, max_activations=500, is_active=true
- [ ] Promo codes properly incremented on activation
- [ ] Subscriptions stored with expiry_date
- [ ] blitz_username stored for renewals
- [ ] Device registration stored
- [ ] Payment tracking in pending_invoices.json

## 10. Git & Deployment
- [ ] Latest commit (ac826d5 or later) on main branch
- [ ] All commits pushed to GitHub
- [ ] Vercel deployment triggered
- [ ] Build succeeds without errors
- [ ] Live site works correctly

## 11. Bot Commands (Telegram)
- [ ] /start command shows main menu
- [ ] /profile shows user stats
- [ ] /buy starts payment flow
- [ ] /help shows help menu
- [ ] /admin shows admin options (for ADMIN_ID)
- [ ] Bot receives and logs all messages

## 12. Edge Cases
- [ ] User without subscription → shows "No active subscription"
- [ ] Expired subscription → shows "Subscription expired"
- [ ] Device limit reached → UI shows error message
- [ ] Invalid promo code → shows "Неверный промокод"
- [ ] Promo activation limit reached → shows "Лимит активаций исчерпан"
- [ ] CryptoBot webhook with missing invoice → handled gracefully
- [ ] Multiple concurrent renewals → no race conditions

## 13. Performance
- [ ] Home page loads < 2s
- [ ] Theme toggle instant (< 100ms)
- [ ] Promo activation < 3s
- [ ] Device list loads < 1s
- [ ] Buy page responsive
- [ ] No console errors (F12 DevTools)

## 14. Code Quality
- [ ] No TypeScript errors
- [ ] No Python syntax errors ✅ (verified)
- [ ] All imports valid
- [ ] No missing environment variables
- [ ] Logging works in bot
- [ ] API endpoints accessible

## Test Data Setup
```
User ID: 1474669885 (admin/test user)
Promo Code: WELCOMETO2026 (7 days, 500 max)
CryptoBot Token: [configured in env]
Blitz API: [configured and accessible]
PostgreSQL: [connection verified]
```

## Success Criteria
✅ All 14 categories pass  
✅ No errors in console/logs  
✅ All features work as documented  
✅ Dark theme works perfectly  
✅ Key renewal preserves URI  
✅ Device limiting works  
✅ Promo codes functional  

## Run These Tests
```bash
# 1. Bot syntax check
python3 -m py_compile histeriabot.py api_endpoints.py

# 2. Start bot (if running locally)
python3 histeriabot.py

# 3. Check API (in another terminal)
curl http://localhost:3333/api/subscription?userId=1474669885

# 4. Test promo endpoint
curl -X POST http://localhost:3333/api/activate-promo \
  -H "Content-Type: application/json" \
  -d '{"userId": 1474669885, "promoCode": "WELCOMETO2026"}'
```

---

**Test Date:** _______________  
**Tester:** _______________  
**Overall Status:** _______________
