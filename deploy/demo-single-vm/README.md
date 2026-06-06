# ATFQ demo single VM

Minimal deployment for a public recruiter demo. This intentionally avoids the full
Kubernetes/Vault/monitoring stack and runs the app on one VM with Docker Compose.

## What runs

- Caddy reverse proxy with automatic HTTPS
- React frontend
- API gateway
- Auth, user, and wiki services
- One PostgreSQL container with three databases
- Redis for auth sessions/cache
- MinIO for local profile-picture object storage
- Mailpit for non-production email capture

## Expected AWS cost

Use one small EC2 instance instead of the three-node Kubernetes cluster.

- `t3.small`: roughly 22-25 USD/month including one public IPv4 and root EBS.
- `t3.micro`: cheaper, but may be tight during image builds and Rust services.

For a recruiter demo, `t3.small` is the conservative default.

## First deploy

1. Point DNS to the VM public IP.

   Example:

   ```bash
   demo.atfq.org A <vm-public-ip>
   ```

2. Install Docker on the VM.

   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker "$USER"
   ```

3. Copy the repo to the VM and enter this folder.

   ```bash
   cd deploy/demo-single-vm
   cp .env.example .env
   ```

4. Edit `.env`.

   Required values:

   - `DEMO_DOMAIN`
   - `ACME_EMAIL`
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `CHA_CHA_KEY`
   - `MINIO_ROOT_PASSWORD`

5. Start the demo.

   ```bash
   docker compose pull
   docker compose up -d
   ```

6. Check status.

   ```bash
   docker compose ps
   docker compose logs -f caddy api-gateway auth user wiki
   ```

## Updating the demo

From the repo root on the VM:

```bash
git pull
cd deploy/demo-single-vm
docker compose pull
docker compose up -d
```

## Local smoke test

For local testing, set this in `.env`:

```dotenv
DEMO_DOMAIN=localhost
APP_PUBLIC_URL=https://localhost
S3_PUBLIC_URL=https://localhost/profiles
```

Then run:

```bash
docker compose up -d
curl -k https://localhost/ping
```

## Building images manually

The VM should usually pull images from GHCR. If you explicitly want to build
locally, use the build override:

```bash
docker compose -f docker-compose.yaml -f docker-compose.build.yaml build
docker compose -f docker-compose.yaml -f docker-compose.build.yaml up -d
```

## Notes

- This deployment is not meant to replace the full infra. It is a low-cost public demo.
- Mailpit captures emails inside the stack; real password-reset emails will not be sent unless SMTP is configured.
- MinIO data and PostgreSQL data are stored in Docker volumes on the VM.
- The `.env` file is intentionally ignored by git.
