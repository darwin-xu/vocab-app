#!/bin/bash

# Setup script to add query_history table to the database
# This should be run after initial setup to add the new query history feature

echo "Setting up query_history table..."

# For local development database
wrangler d1 execute vocab_db --local --file=- <<'EOF'
CREATE TABLE IF NOT EXISTS query_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  word TEXT NOT NULL,
  query_type TEXT NOT NULL,
  query_time TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_query_history_user_id ON query_history(user_id);
CREATE INDEX IF NOT EXISTS idx_query_history_user_word ON query_history(user_id, word);
CREATE INDEX IF NOT EXISTS idx_query_history_query_time ON query_history(query_time);
EOF

echo "✓ Local database setup complete"

# Uncomment the following to also update the remote database
# echo "Setting up remote database..."
# wrangler d1 execute vocab_db --file=- <<'EOF'
# CREATE TABLE IF NOT EXISTS query_history (
#   id INTEGER PRIMARY KEY AUTOINCREMENT,
#   user_id INTEGER NOT NULL,
#   word TEXT NOT NULL,
#   query_type TEXT NOT NULL,
#   query_time TEXT NOT NULL DEFAULT (datetime('now')),
#   FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
# );
# 
# CREATE INDEX IF NOT EXISTS idx_query_history_user_id ON query_history(user_id);
# CREATE INDEX IF NOT EXISTS idx_query_history_user_word ON query_history(user_id, word);
# CREATE INDEX IF NOT EXISTS idx_query_history_query_time ON query_history(query_time);
# EOF
# echo "✓ Remote database setup complete"

echo ""
echo "Query history table setup complete!"
echo "You can now track vocabulary query history."
