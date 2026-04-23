CREATE TABLE IF NOT EXISTS user_oauth (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (provider, provider_id),
    UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_user_id ON user_oauth(user_id);
