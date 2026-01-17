-- Ensure promo_code column exists
ALTER TABLE IF EXISTS subscriptions
  ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50);

-- Ensure unique index on user_id to support ON CONFLICT (user_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_user_id
  ON subscriptions(user_id);
