# VPN Key Renewal Fix

## Problem Identified
When a user renewed their subscription (via promo or payment), the system was:
1. Creating a **new** VPN username/password
2. Generating a **new** connection URI
3. **Invalidating the old key** (user lost VPN access)

This broke continuity - users couldn't use their existing devices/connections.

## Solution Implemented

### 1. Modified `extend_user()` in `histeriabot.py`
**Before:** Deleted old user + recreated with extra days (new URI generated)
**After:** Uses `edit_user()` to extend expiry without deletion (preserves URI)

```python
async def extend_user(self, username: str, days_to_add: int) -> bool:
    """Продлить подписку пользователя на указанное количество дней БЕЗ пересоздания"""
    # Get current expiry
    # Calculate new expiry = current + days_to_add
    # Call edit_user() instead of delete+recreate
    # Result: Same username, same URI, just extended expiry date
```

### 2. Updated `handle_activate_promo_api()` in `api_endpoints.py`
Now checks if user already has active subscription:
- **If exists:** Extends in Blitz (calls `extend_user()` with +days)
- **If new:** Creates new Blitz user (calls `create_user()`)

Also stores `blitz_username` in subscription for future renewal.

### 3. Updated `handle_cryptobot_webhook()` in `api_endpoints.py`
Fixed duplicate code and added `blitz_username` tracking.

## Data Flow

### First Promo Activation (New User)
```
activate-promo request
  └─> Check if user_id in active_subscriptions (NO)
    └─> Create new Blitz user (create_user)
      └─> Get URI from Blitz API
    └─> Store: {expiry_date, vpn_uri, blitz_username, ...}
    └─> Return URI to frontend
```

### Second Promo Activation (Renewal)
```
activate-promo request
  └─> Check if user_id in active_subscriptions (YES)
    └─> Extend existing Blitz user (extend_user)
      └─> Current expiry + new days
      └─> Same username preserved
      └─> Same URI preserved (no new key)
    └─> Update: {expiry_date += new_days, vpn_uri (same), ...}
    └─> Return SAME URI to frontend
```

## Key Changes by File

### `histeriabot.py`
- Line 351-382: Rewrote `extend_user()` to use `edit_user()` instead of delete+recreate

### `api_endpoints.py`
- Line 293-375: Updated `handle_activate_promo_api()`:
  - Check for existing subscription
  - If exists: call `blitz_api.extend_user(blitz_username, days)`
  - If new: call `blitz_api.create_user()` with username format `user_{user_id}`
  - Store `blitz_username` in subscription dict
  
- Line 527: Added `"blitz_username": username` to subscription storage in webhook handler

## Testing
1. Create test user with WELCOMETO2026 promo (7 days)
2. Activate second time
3. Verify:
   - VPN URI remains **same** (not regenerated)
   - Days extended (7 + 7 = 14)
   - Old device connections still work

## Benefits
✅ Users can renew without losing VPN access  
✅ Existing device connections remain active  
✅ Same connection URI across renewals  
✅ Cleaner Blitz panel (no user recreation)  
✅ Better user experience (no setup needed after renewal)
