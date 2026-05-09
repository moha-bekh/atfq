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
{{ with secret "secret/data/wiki" }}
DATABASE_URL="postgresql://{{ .Data.data.db_user }}:{{ .Data.data.db_password }}@db-wiki:5432/{{ .Data.data.db_name }}"
METRICS_ADDR="{{ .Data.data.metrics_addr }}"
{{ end }}
EOH
  destination = "/vault/secrets/.env"
}

template {
  contents = "{{ with secret \"secret/data/wiki\" }}{{ .Data.data.db_user }}{{ end }}"
  destination = "/vault/secrets/POSTGRES_USER"
}

template {
  contents = "{{ with secret \"secret/data/wiki\" }}{{ .Data.data.db_password }}{{ end }}"
  destination = "/vault/secrets/POSTGRES_PASSWORD"
}

template {
  contents = "{{ with secret \"secret/data/wiki\" }}{{ .Data.data.db_name }}{{ end }}"
  destination = "/vault/secrets/POSTGRES_DB"
}
