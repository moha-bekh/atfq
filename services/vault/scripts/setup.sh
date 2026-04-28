#!/bin/bash
# This script handles the automated initialization of HashiCorp Vault.
# It performs the following steps:
# 1. Waits for the Vault container to be ready.
# 2. Initializes Vault if it hasn't been done yet.
# 3. Securely extracts Unseal Keys and the Root Token.
# 4. Merges these keys into the existing SOPS-encrypted secrets file (YAML).
set -e

ACTION=$1        # The action to perform (currently only 'init')
AGE_PK=$2        # The Public Key (age1...) used for encryption
AGE_KEY_PATH=$3  # Path to the local private key file (~/.config/sops/age/...)
VAULT_ADDR="http://127.0.0.1:8200"
SECRETS_FILE="secrets.enc.yaml"

init_vault() {
  # --- Step 1: Connectivity Check ---
  # Ensure Vault is up and responding before attempting initialization.
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

  # --- Step 2: Initialization Check ---
  # Only initialize if Vault is not already set up.
  IS_INIT=$(docker exec vault vault status -format=json 2>/dev/null | jq -r '.initialized')
  if [ "$IS_INIT" == "true" ]; then
    echo "Vault already initialized. Skipping."
    return 0
  fi

  # --- Step 3: Initialization ---
  # Generate the unseal keys and root token in memory (RAM).
  echo "--- Initializing Vault (RAM Process) ---"
  JSON_INIT=$(docker exec -e VAULT_ADDR=$VAULT_ADDR vault vault operator init -format=json)

  K1=$(echo "$JSON_INIT" | jq -r '.unseal_keys_b64[0]')
  K2=$(echo "$JSON_INIT" | jq -r '.unseal_keys_b64[1]')
  K3=$(echo "$JSON_INIT" | jq -r '.unseal_keys_b64[2]')
  TK=$(echo "$JSON_INIT" | jq -r '.root_token')

  # --- Step 4: Secrets Management (SOPS) ---
  # Load existing secrets if the file exists to avoid overwriting business data.
  if [ -f "$SECRETS_FILE" ]; then
    echo "Decrypting existing $SECRETS_FILE..."
    EXISTING_YAML=$(SOPS_AGE_KEY_FILE="$AGE_KEY_PATH" sops -d "$SECRETS_FILE")
  else
    EXISTING_YAML="{}"
  fi

  echo "--- Merging Vault keys into $SECRETS_FILE ---"
  
  # Merge new Vault metadata (Unseal keys + Root Token) into the YAML structure.
  # We use 'jq' to perform the merge safely.
  FINAL_YAML=$(echo "$EXISTING_YAML" | jq --arg k1 "$K1" --arg k2 "$K2" --arg k3 "$K3" --arg tk "$TK" \
    '. + {KEY1: $k1, KEY2: $k2, KEY3: $k3, VAULT_TOKEN: $tk}')

  # --- Step 5: Secure Encryption ---
  # Write to a temporary file, encrypt it with SOPS, then replace the target file.
  # The extension .enc.yaml ensures SOPS finds the correct rules in .sops.yaml.
  TMP_FILE=$(mktemp --suffix=.enc.yaml)
  echo "$FINAL_YAML" > "$TMP_FILE"
  
  SOPS_AGE_KEY_FILE="$AGE_KEY_PATH" sops --encrypt --age "$AGE_PK" "$TMP_FILE" > "$SECRETS_FILE"
  
  rm "$TMP_FILE"
  echo "Success: Vault keys merged into $SECRETS_FILE"
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
