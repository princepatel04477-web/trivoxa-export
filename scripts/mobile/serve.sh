#!/usr/bin/env bash
# Restart the production server on the CURRENT build. A server left running
# across a rebuild serves HTML referencing chunk hashes that no longer exist,
# every stylesheet 500s, and the audit then measures an unstyled page and
# reports nonsense. Always go through this.
set -e
PORT=${PORT:-3123}
for pid in $(netstat -ano | grep ":$PORT " | grep LISTENING | awk '{print $5}' | sort -u); do
  taskkill //F //PID "$pid" >/dev/null 2>&1 || true
done
sleep 1
(npx next start -p "$PORT" > "${TMPDIR:-/tmp}/trivoxa-next.log" 2>&1 &)
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:$PORT/" || true)
  if [ "$code" = "200" ]; then echo "server up on $PORT"; exit 0; fi
  sleep 1
done
echo "server failed to start"; tail -20 "${TMPDIR:-/tmp}/trivoxa-next.log"; exit 1
