-- offsets checkpoint (idempotency)
CREATE TABLE IF NOT EXISTS projection_offsets (
  topic        TEXT    NOT NULL,
  partition    INT     NOT NULL,
  offset       BIGINT  NOT NULL,
  PRIMARY KEY (topic, partition)
);

-- example read model: denormalized user summary
CREATE TABLE IF NOT EXISTS user_read_model (
  user_id          TEXT PRIMARY KEY,
  username         TEXT NOT NULL,
  email            TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL
);

