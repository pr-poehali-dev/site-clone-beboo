-- Платежи
CREATE TABLE IF NOT EXISTS spark_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES spark_users(id),
    provider TEXT NOT NULL, -- yukassa | robokassa
    external_id TEXT,       -- id платежа в провайдере
    plan TEXT NOT NULL,     -- 1m | 3m | 12m
    amount INTEGER NOT NULL, -- в рублях
    status TEXT DEFAULT 'pending', -- pending | paid | failed | cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON spark_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_external ON spark_payments(external_id);
