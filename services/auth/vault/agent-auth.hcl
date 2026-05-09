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
{{ with secret "secret/data/auth" }}
DATABASE_URL="postgresql://{{ .Data.data.db_user }}:{{ .Data.data.db_password }}@db-auth:5432/{{ .Data.data.db_name }}"
SERVER_ADDR="{{ .Data.data.server_addr }}"
JWT_SECRET="{{ .Data.data.jwt_secret }}"
CHA_CHA_KEY="{{ .Data.data.cha_cha_key }}"
GOOGLE_CLIENT_ID="{{ .Data.data.google_client_id }}"
GOOGLE_CLIENT_SECRET="{{ .Data.data.google_client_secret }}"
GOOGLE_REDIRECT_URL="{{ .Data.data.google_redirect_url }}"
GITHUB_CLIENT_ID="{{ .Data.data.github_client_id }}"
GITHUB_CLIENT_SECRET="{{ .Data.data.github_client_secret }}"
GITHUB_REDIRECT_URL="{{ .Data.data.github_redirect_url }}"
SMTP_USERNAME="{{ .Data.data.smtp_username }}"
SMTP_PASSWORD="{{ .Data.data.smtp_password }}"
{{ end }}
EOH
  destination = "/vault/secrets/.env"
}

template {
  contents = "{{ with secret \"secret/data/auth\" }}{{ .Data.data.db_user }}{{ end }}"
  destination = "/vault/secrets/POSTGRES_USER"
}

template {
  contents = "{{ with secret \"secret/data/auth\" }}{{ .Data.data.db_password }}{{ end }}"
  destination = "/vault/secrets/POSTGRES_PASSWORD"
}

template {
  contents = "{{ with secret \"secret/data/auth\" }}{{ .Data.data.db_name }}{{ end }}"
  destination = "/vault/secrets/POSTGRES_DB"
}
