CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS urls (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    short_code  VARCHAR(12) NOT NULL UNIQUE,
    long_url    TEXT NOT NULL,
    owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);

CREATE TABLE IF NOT EXISTS clicks (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url_id       UUID NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
    clicked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    referrer     TEXT,
    device_type  VARCHAR(32),
    country_code VARCHAR(4)
);

CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks(url_id);
