CREATE TABLE IF NOT EXISTS spark_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spark_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES spark_users(id),
    name TEXT NOT NULL,
    age INT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'other',
    city TEXT NOT NULL DEFAULT 'Москва',
    bio TEXT DEFAULT '',
    photos TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    job TEXT DEFAULT '',
    education TEXT DEFAULT '',
    height INT,
    search_radius INT DEFAULT 25,
    search_gender TEXT DEFAULT 'all',
    search_age_min INT DEFAULT 18,
    search_age_max INT DEFAULT 45,
    verified BOOLEAN DEFAULT FALSE,
    online_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spark_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES spark_users(id),
    to_user_id UUID NOT NULL REFERENCES spark_users(id),
    is_super BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id)
);

CREATE TABLE IF NOT EXISTS spark_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES spark_users(id),
    user2_id UUID NOT NULL REFERENCES spark_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS spark_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES spark_matches(id),
    sender_id UUID NOT NULL REFERENCES spark_users(id),
    text TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spark_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES spark_users(id),
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS idx_spark_likes_from ON spark_likes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_spark_likes_to ON spark_likes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_spark_matches_u1 ON spark_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_spark_matches_u2 ON spark_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_spark_messages_match ON spark_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_spark_sessions_token ON spark_sessions(token);
