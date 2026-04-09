CREATE TABLE IF NOT EXISTS t_p99484439_site_clone_beboo.spark_rate_limits (
    ip TEXT NOT NULL,
    action TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ip, action)
);