exit_after_auth = false
pid_file = "/tmp/vault-agent-pid"

auto_auth {
  method "approle" {
    config = {
      role_id_file_path = "/etc/vault/agent_ids/role-id"
      secret_id_file_path = "/etc/vault/agent_ids/secret-id"
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
{{- with secret "secret/data/net-gateway" -}}
{{ .Data.data.ssl_crt | replaceAll "\"" "" | replaceAll "\\n" "\n" }}
{{- end }}
EOH
  destination = "/app/secrets/ssl.crt"
  perms = "0644"
}

template {
  contents = <<EOH
{{- with secret "secret/data/net-gateway" -}}
{{ .Data.data.ssl_key | replaceAll "\"" "" | replaceAll "\\n" "\n" }}
{{- end }}
EOH
  destination = "/app/secrets/ssl.key"
  perms = "0644"
}
