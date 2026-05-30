#!/bin/bash

# Setup script to add generated vocabulary image caching to the database.
# Supports local, remote, or both executions depending on flags.

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

echo "Setting up word_images table..."

SQL_FILE=$(mktemp)
trap 'rm -f "${SQL_FILE}"' EXIT

cat <<'EOF' >"${SQL_FILE}"
CREATE TABLE IF NOT EXISTS word_images (
  word TEXT PRIMARY KEY,
  image_query TEXT NOT NULL,
  image_data TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_word_images_updated_at ON word_images(updated_at);
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
echo "Generated word image cache setup complete!"
