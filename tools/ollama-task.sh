#!/usr/bin/env bash
set -euo pipefail

readonly API_BASE="http://127.0.0.1:11434"
readonly API_TAGS_URL="${API_BASE}/api/tags"
readonly API_GENERATE_URL="${API_BASE}/api/generate"
readonly CONNECT_TIMEOUT_SECONDS=5
readonly REQUEST_TIMEOUT_SECONDS=300

fail() {
  printf 'Chyba: %s\n' "$*" >&2
  exit 1
}

if [[ $# -ne 2 ]]; then
  printf 'Použití: %s {granite4.2:8b|qwen3.5:9b} "prompt"\n' "$0" >&2
  exit 2
fi

model="$1"
prompt="$2"

case "$model" in
  granite4.2:8b|qwen3.5:9b) ;;
  *) fail "Model '$model' není povolen. Povolené modely: granite4.2:8b, qwen3.5:9b." ;;
esac

for command in curl jq; do
  command -v "$command" >/dev/null 2>&1 || fail "Chybí požadovaný příkaz '$command'."
done

if ! curl --fail --silent --show-error \
  --connect-timeout "$CONNECT_TIMEOUT_SECONDS" \
  --max-time 10 \
  "$API_TAGS_URL" >/dev/null; then
  fail "Lokální Ollama API na ${API_BASE} neodpovídá. Ověřte, že Ollama běží."
fi

payload="$(jq --null-input --compact-output \
  --arg model "$model" \
  --arg prompt "$prompt" \
  '{model: $model, prompt: $prompt, stream: false, think: false}')"

if ! response="$(curl --fail --silent --show-error \
  --connect-timeout "$CONNECT_TIMEOUT_SECONDS" \
  --max-time "$REQUEST_TIMEOUT_SECONDS" \
  --header 'Content-Type: application/json' \
  --data "$payload" \
  "$API_GENERATE_URL")"; then
  fail "Ollama nevrátila platnou odpověď v limitu ${REQUEST_TIMEOUT_SECONDS} sekund."
fi

if ! printf '%s' "$response" | jq --exit-status '.response | strings' >/dev/null; then
  api_error="$(printf '%s' "$response" | jq --raw-output '.error // empty' 2>/dev/null || true)"
  if [[ -n "$api_error" ]]; then
    fail "Ollama API vrátilo chybu: $api_error"
  fi
  fail "Ollama API vrátilo neočekávaný formát odpovědi."
fi

printf '%s' "$response" | jq --raw-output '.response'
