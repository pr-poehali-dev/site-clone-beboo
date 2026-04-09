CREATE TABLE IF NOT EXISTS t_p99484439_site_clone_beboo.spark_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES t_p99484439_site_clone_beboo.spark_users(id),
    blocked_id UUID NOT NULL REFERENCES t_p99484439_site_clone_beboo.spark_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);