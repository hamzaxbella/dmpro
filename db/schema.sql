-- DMPro Database Schema — 3 tables, everything else is derived

CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ig_username  TEXT    NOT NULL UNIQUE,
  full_name    TEXT,
  status       TEXT    NOT NULL DEFAULT 'contacted'
                 CHECK(status IN ('contacted','replied','interested','closed','lost')),
  notes        TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id       INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction     TEXT    NOT NULL CHECK(direction IN ('outbound','inbound')),
  body          TEXT,
  ig_message_id TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id      INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  due_at       TEXT    NOT NULL,
  note         TEXT,
  sent         INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_lead   ON events(lead_id);
CREATE INDEX IF NOT EXISTS idx_events_msg_id ON events(ig_message_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_at, sent);
