CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0,
  custom_instructions TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vocab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  word TEXT NOT NULL,
  add_date TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index on user_id to improve join performance with users table
CREATE INDEX IF NOT EXISTS idx_vocab_user_id ON vocab(user_id);

-- Compound index on (user_id, word) for faster user-specific word lookups
CREATE INDEX IF NOT EXISTS idx_vocab_user_word ON vocab(user_id, word);

-- Index on word column for search functionality
CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocab(word);

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    word TEXT NOT NULL,
    note TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_notes_user_word ON notes(user_id, word);
