#!/usr/bin/env bash
set -euo pipefail

REPO_DIR=${REPO_DIR:-"/root/Nyxion_VPN_bot/Ver 2/ver2.2"}
PY=${PY:-python3}
SERVICE_NAME=${SERVICE_NAME:-nyxion-bot}

if [[ ! -d "$REPO_DIR" ]]; then
  echo "❌ Repo dir not found: $REPO_DIR" >&2
  exit 1
fi

cd "$REPO_DIR"

# Pull latest changes (backend files)
if [[ -d .git ]]; then
  git pull --rebase || true
fi

# Normalize env for asyncpg DSN
if ! grep -q ^DATABASE_URL .env; then
  echo "DATABASE_URL is missing in .env" >&2
fi

# Python venv
if [[ ! -d .venv ]]; then
  $PY -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Apply DB schema fix (unique index on subscriptions.user_id)
chmod +x update_db_schema.sh || true
./update_db_schema.sh || true

# Restart via systemd if service exists; else run in tmux
if systemctl list-units | grep -q "$SERVICE_NAME"; then
  sudo systemctl restart "$SERVICE_NAME"
  sudo systemctl status --no-pager -l "$SERVICE_NAME" || true
else
  # Fallback: tmux session
  if ! command -v tmux >/dev/null 2>&1; then
    apt-get update && apt-get install -y tmux || true
  fi
  tmux kill-session -t nyxion 2>/dev/null || true
  tmux new-session -d -s nyxion "source .venv/bin/activate && $PY histeriabot.py"
  tmux ls || true
fi

echo "✅ Deploy finished"