#!/bin/bash

# Setup script to add query_history table to the database
# Supports local, remote, or both executions depending on flags

set -euo pipefail

RUN_LOCAL=true
RUN_REMOTE=false

for arg in "$@"; do
  case "$arg" in
    --remote)
      RUN_REMOTE=true
      ;;
    --no-local)
      RUN_LOCAL=false
      ;;
    -h|--help)
      echo "Usage: $0 [--remote] [--no-local]"
      echo "  --remote    Apply the migration to the remote D1 database"
      echo "  --no-local  Skip applying to the local D1 database"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if ! $RUN_LOCAL && ! $RUN_REMOTE; then
  echo "Nothing to do: both local and remote executions are disabled." >&2
  exit 0
fi

echo "Setting up query_history table..."

SQL_FILE=$(mktemp)
trap 'rm -f "${SQL_FILE}"' EXIT

cat <<'EOF' >"${SQL_FILE}"
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

if $RUN_LOCAL; then
  wrangler d1 execute vocab_db --local --file="${SQL_FILE}"
  echo "✓ Local database setup complete"
fi

if $RUN_REMOTE; then
  wrangler d1 execute vocab_db --remote --file="${SQL_FILE}"
  echo "✓ Remote database setup complete"
fi

echo ""
echo "Query history table setup complete!"
echo "You can now track vocabulary query history."
