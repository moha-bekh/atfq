#!/bin/sh
set -eu

: "${KUBECONFIG:?KUBECONFIG is required}"

DATA_NAMESPACE="${DATA_NAMESPACE:-atfq-data}"
APPS_NAMESPACE="${APPS_NAMESPACE:-atfq-apps}"
VAULT_POD="${VAULT_POD:-vault-0}"
ROOT_SECRET="${ROOT_SECRET:-vault-k8s-root}"

kubectl_cmd() {
  kubectl --kubeconfig "$KUBECONFIG" "$@"
}

vault_cmd() {
  kubectl_cmd -n "$DATA_NAMESPACE" exec "$VAULT_POD" -- env VAULT_TOKEN="$VAULT_TOKEN" vault "$@"
}

wait_for_vault() {
  i=0
  until kubectl_cmd -n "$DATA_NAMESPACE" exec "$VAULT_POD" -- sh -c 'vault status -format=json >/tmp/vault-status.json || true; cat /tmp/vault-status.json' >/tmp/atfq-vault-status.json 2>/dev/null; do
    i=$((i + 1))
    if [ "$i" -gt 60 ]; then
      echo "Vault pod is not responding to vault status."
      exit 1
    fi
    sleep 2
  done
}

ensure_root_secret() {
  initialized="$(jq -r '.initialized' /tmp/atfq-vault-status.json)"
  if [ "$initialized" = "true" ]; then
    kubectl_cmd -n "$DATA_NAMESPACE" get secret "$ROOT_SECRET" >/dev/null
    return
  fi

  init_json="$(kubectl_cmd -n "$DATA_NAMESPACE" exec "$VAULT_POD" -- vault operator init -format=json)"
  kubectl_cmd -n "$DATA_NAMESPACE" create secret generic "$ROOT_SECRET" \
    --from-literal=root-token="$(printf '%s' "$init_json" | jq -r '.root_token')" \
    --from-literal=key1="$(printf '%s' "$init_json" | jq -r '.unseal_keys_b64[0]')" \
    --from-literal=key2="$(printf '%s' "$init_json" | jq -r '.unseal_keys_b64[1]')" \
    --from-literal=key3="$(printf '%s' "$init_json" | jq -r '.unseal_keys_b64[2]')" \
    --from-literal=key4="$(printf '%s' "$init_json" | jq -r '.unseal_keys_b64[3]')" \
    --from-literal=key5="$(printf '%s' "$init_json" | jq -r '.unseal_keys_b64[4]')" \
    --dry-run=client -o yaml | kubectl_cmd apply -f -
}

secret_field() {
  kubectl_cmd -n "$DATA_NAMESPACE" get secret "$ROOT_SECRET" -o "jsonpath={.data.$1}" | base64 -d
}

unseal_vault() {
  sealed="$(kubectl_cmd -n "$DATA_NAMESPACE" exec "$VAULT_POD" -- vault status -format=json | jq -r '.sealed')"
  if [ "$sealed" = "false" ]; then
    return
  fi

  kubectl_cmd -n "$DATA_NAMESPACE" exec "$VAULT_POD" -- vault operator unseal "$(secret_field key1)" >/dev/null
  kubectl_cmd -n "$DATA_NAMESPACE" exec "$VAULT_POD" -- vault operator unseal "$(secret_field key2)" >/dev/null
  kubectl_cmd -n "$DATA_NAMESPACE" exec "$VAULT_POD" -- vault operator unseal "$(secret_field key3)" >/dev/null
}

write_policy() {
  name="$1"
  path="$2"
  printf 'path "%s" {\n  capabilities = ["read"]\n}\n' "$path" \
    | kubectl_cmd -n "$DATA_NAMESPACE" exec -i "$VAULT_POD" -- env VAULT_TOKEN="$VAULT_TOKEN" vault policy write "$name" -
}

write_role() {
  role="$1"
  policy="$2"
  printf '{"token_policies":["%s"],"token_ttl":"1h","token_max_ttl":"4h"}\n' "$policy" \
    | kubectl_cmd -n "$DATA_NAMESPACE" exec -i "$VAULT_POD" -- env VAULT_TOKEN="$VAULT_TOKEN" vault write "auth/approle/role/$role" -
}

create_approle_secret() {
  role="$1"
  secret_name="$2"
  namespace="$3"
  role_id="$(vault_cmd read -field=role_id "auth/approle/role/$role/role-id")"
  secret_id="$(vault_cmd write -f -field=secret_id "auth/approle/role/$role/secret-id")"
  kubectl_cmd -n "$namespace" create secret generic "$secret_name" \
    --from-literal=role-id="$role_id" \
    --from-literal=secret-id="$secret_id" \
    --dry-run=client -o yaml | kubectl_cmd apply -f -
}

create_secret() {
  namespace="$1"
  name="$2"
  shift 2
  kubectl_cmd -n "$namespace" create secret generic "$name" "$@" --dry-run=client -o yaml | kubectl_cmd apply -f -
}

wait_for_vault
ensure_root_secret
unseal_vault

VAULT_TOKEN="$(secret_field root-token)"
export VAULT_TOKEN

vault_cmd secrets enable -path=secret kv-v2 >/dev/null 2>&1 || true
vault_cmd auth enable approle >/dev/null 2>&1 || true

write_policy auth-service "secret/data/auth"
write_policy user-service "secret/data/user"
write_policy wiki-service "secret/data/wiki"
write_policy api-gateway-service "secret/data/api-gateway"

write_role auth-service auth-service
write_role user-service user-service
write_role wiki-service wiki-service
write_role api-gateway-service api-gateway-service

vault_cmd kv put secret/auth \
  db_url="$AUTH_DB_URL" \
  db_name="$AUTH_DB_NAME" \
  db_user="$AUTH_DB_USER" \
  db_password="$AUTH_DB_PASSWORD" \
  server_addr="$AUTH_SERVER_ADDR" \
  jwt_secret="$AUTH_JWT" \
  cha_cha_key="$AUTH_CHA_CHA_KEY" \
  google_client_id="$AUTH_GOOGLE_CLIENT_ID" \
  google_client_secret="$AUTH_GOOGLE_CLIENT_SECRET" \
  google_redirect_url="$AUTH_GOOGLE_REDIRECT_URL" \
  github_client_id="$AUTH_GITHUB_CLIENT_ID" \
  github_client_secret="$AUTH_GITHUB_CLIENT_SECRET" \
  github_redirect_url="$AUTH_GITHUB_REDIRECT_URL" \
  smtp_username="$AUTH_SMTP_USERNAME" \
  smtp_password="$AUTH_SMTP_PASSWORD" >/dev/null

vault_cmd kv put secret/user \
  db_name="$USER_DB_NAME" \
  db_user="$USER_DB_USER" \
  db_password="$USER_DB_PASSWORD" \
  server_addr="$USER_SERVER_ADDR" \
  jwt_secret="$USER_JWT" \
  s3_endpoint="$USER_S3_ENDPOINT" \
  s3_public_url="$USER_S3_PUBLIC_URL" \
  s3_bucket="$USER_S3_BUCKET" \
  aws_access_key_id="$USER_AWS_ACCESS_KEY_ID" \
  aws_secret_access_key="$USER_AWS_SECRET_ACCESS_KEY" \
  minio_root_user="$USER_MINIO_ROOT_USER" \
  minio_root_password="$USER_MINIO_ROOT_PASSWORD" >/dev/null

vault_cmd kv put secret/wiki \
  db_name="$WIKI_DB_NAME" \
  db_user="$WIKI_DB_USER" \
  db_password="$WIKI_DB_PASSWORD" \
  metrics_addr="$WIKI_METRICS_ADDR" >/dev/null

vault_cmd kv put secret/api-gateway \
  server_addr="$API_GATEWAY_SERVER_ADDR" \
  jwt_secret="$API_GATEWAY_JWT" \
  auth_db_name="$API_GATEWAY_AUTH_DB_NAME" \
  auth_db_user="$API_GATEWAY_AUTH_DB_USER" \
  auth_db_password="$API_GATEWAY_AUTH_DB_PASSWORD" \
  user_db_name="$API_GATEWAY_USER_DB_NAME" \
  user_db_user="$API_GATEWAY_USER_DB_USER" \
  user_db_password="$API_GATEWAY_USER_DB_PASSWORD" >/dev/null

create_secret "$APPS_NAMESPACE" auth-runtime-env \
  --from-literal=DATABASE_URL="postgresql://$AUTH_DB_USER:$AUTH_DB_PASSWORD@db-auth.atfq-data.svc.cluster.local:5432/$AUTH_DB_NAME" \
  --from-literal=SERVER_ADDR="$AUTH_SERVER_ADDR" \
  --from-literal=JWT_SECRET="$AUTH_JWT" \
  --from-literal=CHA_CHA_KEY="$AUTH_CHA_CHA_KEY" \
  --from-literal=GOOGLE_CLIENT_ID="$AUTH_GOOGLE_CLIENT_ID" \
  --from-literal=GOOGLE_CLIENT_SECRET="$AUTH_GOOGLE_CLIENT_SECRET" \
  --from-literal=GOOGLE_REDIRECT_URL="$AUTH_GOOGLE_REDIRECT_URL" \
  --from-literal=GITHUB_CLIENT_ID="$AUTH_GITHUB_CLIENT_ID" \
  --from-literal=GITHUB_CLIENT_SECRET="$AUTH_GITHUB_CLIENT_SECRET" \
  --from-literal=GITHUB_REDIRECT_URL="$AUTH_GITHUB_REDIRECT_URL" \
  --from-literal=SMTP_USERNAME="$AUTH_SMTP_USERNAME" \
  --from-literal=SMTP_PASSWORD="$AUTH_SMTP_PASSWORD"

create_secret "$APPS_NAMESPACE" user-runtime-env \
  --from-literal=DATABASE_URL="postgresql://$USER_DB_USER:$USER_DB_PASSWORD@db-user.atfq-data.svc.cluster.local:5432/$USER_DB_NAME" \
  --from-literal=SERVER_ADDR="$USER_SERVER_ADDR" \
  --from-literal=JWT_SECRET="$USER_JWT" \
  --from-literal=S3_ENDPOINT="$USER_S3_ENDPOINT" \
  --from-literal=S3_PUBLIC_URL="$USER_S3_PUBLIC_URL" \
  --from-literal=S3_BUCKET="$USER_S3_BUCKET" \
  --from-literal=AWS_ACCESS_KEY_ID="$USER_AWS_ACCESS_KEY_ID" \
  --from-literal=AWS_SECRET_ACCESS_KEY="$USER_AWS_SECRET_ACCESS_KEY"

create_secret "$APPS_NAMESPACE" wiki-runtime-env \
  --from-literal=DATABASE_URL="postgresql://$WIKI_DB_USER:$WIKI_DB_PASSWORD@db-wiki.atfq-data.svc.cluster.local:5432/$WIKI_DB_NAME" \
  --from-literal=METRICS_ADDR="$WIKI_METRICS_ADDR"

create_secret "$APPS_NAMESPACE" api-gateway-runtime-env \
  --from-literal=SERVER_ADDR="$API_GATEWAY_SERVER_ADDR" \
  --from-literal=JWT_SECRET="$API_GATEWAY_JWT" \
  --from-literal=AUTH_DATABASE_URL="postgresql://$API_GATEWAY_AUTH_DB_USER:$API_GATEWAY_AUTH_DB_PASSWORD@db-auth.atfq-data.svc.cluster.local:5432/$API_GATEWAY_AUTH_DB_NAME" \
  --from-literal=USER_DATABASE_URL="postgresql://$API_GATEWAY_USER_DB_USER:$API_GATEWAY_USER_DB_PASSWORD@db-user.atfq-data.svc.cluster.local:5432/$API_GATEWAY_USER_DB_NAME"

create_approle_secret auth-service vault-agent-auth-approle "$APPS_NAMESPACE"
create_approle_secret user-service vault-agent-user-approle "$APPS_NAMESPACE"
create_approle_secret wiki-service vault-agent-wiki-approle "$APPS_NAMESPACE"
create_approle_secret api-gateway-service vault-agent-api-gateway-approle "$APPS_NAMESPACE"
create_approle_secret auth-service vault-agent-auth-approle "$DATA_NAMESPACE"
create_approle_secret user-service vault-agent-user-approle "$DATA_NAMESPACE"
create_approle_secret wiki-service vault-agent-wiki-approle "$DATA_NAMESPACE"
create_approle_secret api-gateway-service vault-agent-api-gateway-approle "$DATA_NAMESPACE"

kubectl_cmd -n "$DATA_NAMESPACE" delete pod db-auth-0 db-user-0 db-wiki-0 minio-0 --ignore-not-found
kubectl_cmd -n "$APPS_NAMESPACE" delete pod \
  -l 'app.kubernetes.io/name in (auth,user,wiki,api-gateway,app-nginx)' \
  --ignore-not-found --wait=false
kubectl_cmd -n "$DATA_NAMESPACE" delete job create-buckets --ignore-not-found

echo "Vault Kubernetes bootstrap complete."
