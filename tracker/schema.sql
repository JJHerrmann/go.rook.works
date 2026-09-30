CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  platform TEXT NOT NULL,
  referrer_host TEXT,
  clicked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS clicks_slug_time
  ON clicks(slug, clicked_at DESC);
