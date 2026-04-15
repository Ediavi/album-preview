-- scripts/migrate.sql
-- Run this once in the Vercel Postgres query console

CREATE TABLE IF NOT EXISTS album (
  id               SERIAL PRIMARY KEY,
  ep_name          TEXT NOT NULL DEFAULT '',
  artist           TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  cover_url        TEXT,
  youtube_url      TEXT,
  artist_instagram TEXT,
  artist_post_url  TEXT,
  my_instagram     TEXT,
  my_post_url      TEXT
);

CREATE TABLE IF NOT EXISTS tracks (
  id         SERIAL PRIMARY KEY,
  album_id   INT REFERENCES album(id) ON DELETE CASCADE,
  position   INT NOT NULL DEFAULT 0,
  title      TEXT NOT NULL DEFAULT '',
  audio_url  TEXT,
  canvas_url TEXT,
  cover_url  TEXT
);

-- Seed one album row if none exists
INSERT INTO album (ep_name, artist, description)
SELECT '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM album);
