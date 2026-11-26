#!/usr/bin/env bash
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

for command in node npm curl setsid; do
    command -v "$command" >/dev/null || { echo "Falta instalar $command." >&2; exit 1; }
done

if [[ ! -x node_modules/.bin/vite || ! -f node_modules/.package-lock.json ||
      package.json -nt node_modules/.package-lock.json ||
      package-lock.json -nt node_modules/.package-lock.json ]]; then
    npm ci
fi

export CAZA_API_PROXY="${CAZA_API_PROXY:-http://127.0.0.1:18092}"
health_url="${CAZA_API_PROXY%/}/api/v1/health"
backend_pid=''
frontend_pid=''
cleanup() {
    if [[ -n "$frontend_pid" ]]; then kill -- "-$frontend_pid" 2>/dev/null || true; fi
    if [[ -n "$backend_pid" ]]; then kill -- "-$backend_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ! curl --fail --silent --max-time 2 "$health_url" >/dev/null; then
    backend_dir="${BACKEND_DIR:-../../cazaobjetos-backend-minimalista-1.2}"
    [[ -x "$backend_dir/run.sh" ]] || { echo 'No se encontró el backend. Configura BACKEND_DIR con su carpeta.' >&2; exit 1; }
    echo 'Iniciando el backend de prueba. El detalle queda en backend-local.log.'
    setsid "$backend_dir/run.sh" --no-db > backend-local.log 2>&1 &
    backend_pid=$!
    for ((attempt=0; attempt<90; attempt++)); do
        if curl --fail --silent --max-time 2 "$health_url" >/dev/null; then break; fi
        if ! kill -0 "$backend_pid" 2>/dev/null; then tail -30 backend-local.log; exit 1; fi
        sleep 1
    done
    curl --fail --silent --max-time 2 "$health_url" >/dev/null || { echo 'Revisa backend-local.log: el backend no respondió a tiempo.' >&2; exit 1; }
fi

echo "CazaObjetos: http://127.0.0.1:${FRONTEND_PORT:-4182}"
echo 'Ctrl+C para detener la app.'
setsid env VITE_API_URL=/api/v1 npm run dev -- --host 127.0.0.1 --port "${FRONTEND_PORT:-4182}" --strictPort &
frontend_pid=$!
wait "$frontend_pid"
