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
{{ with secret "secret/data/user" }}
DATABASE_URL="postgresql://{{ .Data.data.db_user }}:{{ .Data.data.db_password }}@db-user:5432/{{ .Data.data.db_name }}"
SERVER_ADDR="{{ .Data.data.server_addr }}"
JWT_SECRET="{{ .Data.data.jwt_secret }}"
S3_ENDPOINT="{{ .Data.data.s3_endpoint }}"
S3_PUBLIC_URL="{{ .Data.data.s3_public_url }}"
S3_BUCKET="{{ .Data.data.s3_bucket }}"
AWS_ACCESS_KEY_ID="{{ .Data.data.aws_access_key_id }}"
AWS_SECRET_ACCESS_KEY="{{ .Data.data.aws_secret_access_key }}"
{{ end }}
EOH
  destination = "/vault/secrets/.env"
}

template {
  contents = "{{ with secret \"secret/data/user\" }}{{ .Data.data.db_user }}{{ end }}"
  destination = "/vault/secrets/POSTGRES_USER"
}

template {
  contents = "{{ with secret \"secret/data/user\" }}{{ .Data.data.db_password }}{{ end }}"
  destination = "/vault/secrets/POSTGRES_PASSWORD"
}

template {
  contents = "{{ with secret \"secret/data/user\" }}{{ .Data.data.db_name }}{{ end }}"
  destination = "/vault/secrets/POSTGRES_DB"
}

template {
  contents = "{{ with secret \"secret/data/user\" }}{{ .Data.data.minio_root_user }}{{ end }}"
  destination = "/vault/secrets/MINIO_ROOT_USER"
}

template {
  contents = "{{ with secret \"secret/data/user\" }}{{ .Data.data.minio_root_password }}{{ end }}"
  destination = "/vault/secrets/MINIO_ROOT_PASSWORD"
}
