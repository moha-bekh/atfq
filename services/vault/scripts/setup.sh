#!/bin/bash
set -e

ACTION=$1
AGE_PK=$2
AGE_KEY_PATH=$3
VAULT_ADDR="http://127.0.0.1:8200"
ENV_ENC=".env.enc"

init_vault() {
  echo "--- Waiting for Vault to be reachable ---"
  MAX_RETRIES=15
  COUNT=0
  until docker exec -e VAULT_ADDR=$VAULT_ADDR vault vault status -format=json 2>/dev/null | grep -q "initialized" || [ $COUNT -eq $MAX_RETRIES ]; do
    echo "Waiting... ($((COUNT + 1))/$MAX_RETRIES)"
    sleep 2
    COUNT=$((COUNT + 1))
  done

  if [ $COUNT -eq $MAX_RETRIES ]; then
    echo "Error: Vault is not reachable after $MAX_RETRIES attempts."
    exit 1
  fi

  IS_INIT=$(docker exec vault vault status -format=json 2>/dev/null | jq -r '.initialized')
  if [ "$IS_INIT" == "true" ]; then
    echo "Vault already initialized. Skipping."
    return 0
  fi

  echo "--- Initializing Vault (RAM Process) ---"
  JSON_INIT=$(docker exec -e VAULT_ADDR=$VAULT_ADDR vault vault operator init -format=json)

  K1=$(echo "$JSON_INIT" | jq -r '.unseal_keys_b64[0]')
  K2=$(echo "$JSON_INIT" | jq -r '.unseal_keys_b64[1]')
  K3=$(echo "$JSON_INIT" | jq -r '.unseal_keys_b64[2]')
  K4=$(echo "$JSON_INIT" | jq -r '.unseal_keys_b64[3]')
  K5=$(echo "$JSON_INIT" | jq -r '.unseal_keys_b64[4]')
  TK=$(echo "$JSON_INIT" | jq -r '.root_token')

  EXISTING=""
  if [ -f "$ENV_ENC" ]; then
    EXISTING=$(SOPS_AGE_KEY_FILE="$AGE_KEY_PATH" sops -d --input-type dotenv --output-type dotenv "$ENV_ENC" | grep -vE "^(KEY[0-9]|VAULT_TOKEN)=" || true)
  fi

  mv ../.sops.yaml ../.sops.yaml.bak 2>/dev/null || true

  FINAL_CONTENT=$(printf "%s\nKEY1=%s\nKEY2=%s\nKEY3=%s\nKEY4=%s\nKEY5=%s\nVAULT_TOKEN=%s\n" "$EXISTING" "$K1" "$K2" "$K3" "$K4" "$K5" "$TK" | grep -v '^$')

  TMP_FILE=$(mktemp)
  echo "$FINAL_CONTENT" >"$TMP_FILE"
  SOPS_AGE_KEY_FILE="$AGE_KEY_PATH" sops --encrypt --age "$AGE_PK" --input-type dotenv --output-type dotenv "$TMP_FILE" >"$ENV_ENC"
  rm "$TMP_FILE"

  mv ../.sops.yaml.bak ../.sops.yaml 2>/dev/null || true
  echo "Success: Vault keys merged into $ENV_ENC"
}

case "$ACTION" in
init)
  init_vault
  ;;
*)
  echo "Usage: $0 init <AGE_PK> <AGE_KEY_PATH>"
  exit 1
  ;;
esac
