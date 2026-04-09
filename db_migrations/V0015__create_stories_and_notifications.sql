CREATE TABLE IF NOT EXISTS t_p99484439_site_clone_beboo.spark_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES t_p99484439_site_clone_beboo.spark_users(id),
    image_url TEXT NOT NULL,
    text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_stories_user ON t_p99484439_site_clone_beboo.spark_stories (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS t_p99484439_site_clone_beboo.spark_story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES t_p99484439_site_clone_beboo.spark_stories(id),
    viewer_id UUID NOT NULL REFERENCES t_p99484439_site_clone_beboo.spark_users(id),
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS t_p99484439_site_clone_beboo.spark_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES t_p99484439_site_clone_beboo.spark_users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON t_p99484439_site_clone_beboo.spark_notifications (user_id, created_at DESC);