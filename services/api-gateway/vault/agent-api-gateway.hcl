exit_after_auth = false
pid_file = "/tmp/vault-agent-pid"

auto_auth {
  method "approle" {
    config = {
      role_id_file_path = "/etc/vault/role-id"
      secret_id_file_path = "/etc/vault/secret-id"
      remove_secret_id_file_after_reading = false
    }
  }

  sink "file" {
    config = {
      path = "/tmp/token"
    }
  }
}

template {
  contents = <<EOH
{{ with secret "secret/data/api-gateway" }}
SERVER_ADDR="{{ .Data.data.server_addr }}"
JWT_SECRET="{{ .Data.data.jwt_secret }}"
AUTH_DATABASE_URL="postgresql://{{ .Data.data.auth_db_user }}:{{ .Data.data.auth_db_password }}@db-auth:5432/{{ .Data.data.auth_db_name }}"
USER_DATABASE_URL="postgresql://{{ .Data.data.user_db_user }}:{{ .Data.data.user_db_password }}@db-user:5432/{{ .Data.data.user_db_name }}"
{{ end }}
EOH
  destination = "/vault/secrets/.env"
}
