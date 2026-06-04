# ATFQ

**Ask The F\*cking Question** is a collaborative learning platform for computer science. It combines a structured wiki, authenticated contributions, user profiles, role-based moderation, and production-style infrastructure.

The project was built as a full-stack product rather than a simple school exercise: frontend, API gateway, domain microservices, databases, object storage, secret management, monitoring, WAF, and Kubernetes deployment are all part of the same system.

> Public demo / proof of concept: [https://atfq.org](https://atfq.org)

## Why This Project Exists

Computer science documentation is often fragmented: articles explain concepts, courses ask questions, and communities discuss practical tradeoffs, but they rarely connect those pieces cleanly.

ATFQ is built around one idea: learning starts with asking better questions. The platform organizes knowledge into articles, sub-articles, notions, essential questions, and resources, then lets contributors propose changes through a moderated workflow.

## My Role

**Mohamed Bekheira (`mbekheir` / `moha-bekh`)**

Roles assumed on the project:

- **Product Owner**: product direction, scope definition, feature prioritization, demo readiness.
- **Technical Lead**: architecture decisions, service boundaries, API contracts, integration strategy.
- **Developer**: frontend, API gateway, auth/user/wiki integration, admin and moderation flows.
- **DevOps / Security**: Docker Compose, Kubernetes, Terraform, Vault, WAF, TLS, monitoring, GHCR image delivery.
- **Project Manager**: task breakdown, merge coordination, deployment planning, final integration.

I led the project end-to-end and implemented most of the product, infrastructure, security, deployment, design direction, and integration work.

## Design Direction

I also owned the visual direction of ATFQ: brand concept, logo, interface mood, layout principles, and the Figma prototype.

Figma prototype: [ATFQ Prototype](https://www.figma.com/design/Wcn6Z4MUuzDb3OOM34E9VM/ATFQ-Prototype?node-id=5-31&t=0D5rCeQfG52tMJiq-1)

### Logo Concept

The ATFQ logo is a minimalist geometric mark built around the letter **Q**, the visual anchor of the brand. It is designed to express more than an initial: it connects the idea of questioning with knowledge graphs, technical structure, and intellectual clarity.

The main circular outline represents the core question: open, universal, and accessible. Instead of using a classic Q tail, the mark introduces a satellite circle connected to the structure, evoking a node in a graph. This reflects how one strong question can connect multiple areas of computer science.

The large central circle creates a subtle eye-like shape, suggesting vision, focus, and the ability to see through complexity. The orbital arrangement of the circles also implies movement and discovery, reinforcing the idea that learning on ATFQ is a guided path rather than a passive accumulation of information.

Design principles:

- **Geometric clarity**: the mark is built from circles and tangent lines, making it scalable from favicon to interface branding.
- **Open-source minimalism**: the visual language stays clean, technical, and compatible with modern developer tools.
- **Functional abstraction**: the logo remains readable as a Q while also suggesting a graph node, a technical diagram, and an eye.

## Team Contributions

The repository history and feature ownership show the following split:

| Contributor | Main contribution area |
| --- | --- |
| **Mohamed Bekheira** | Product leadership, technical architecture, frontend integration, API gateway, Kubernetes, Terraform, Docker, Vault, WAF, monitoring, TLS, GHCR deployment, admin flows, demo operations. |
| **jsommet** | Wiki service and wiki domain work. |
| **sdeutsch** | Wiki service and wiki feature work. |
| **acaetano** | User service and user-management features, in collaboration with Mohamed. |
| **jamar / bitquence** | Auth service and authentication features, in collaboration with Mohamed. |

Everything outside those shared areas was primarily handled by Mohamed Bekheira.

## Product Features

- Public wiki with nested articles, notions, questions, and resources.
- Authenticated contribution workflow for creating and editing wiki content.
- Moderation and admin dashboard for reviewing pending content and role requests.
- Email/password authentication with access and refresh tokens.
- OAuth login/linking with Google and GitHub.
- Optional MFA / 2FA support.
- User profiles with avatar upload, theme preferences, roles, permissions, and account settings.
- Friend and presence-oriented user features.
- Legal pages and public demo disclaimer.
- API documentation through OpenAPI / Swagger.
- Observability through Prometheus and Grafana.
- Production-style deployment with Kubernetes, Vault, TLS, and WAF.
- Custom visual identity, logo concept, and Figma-driven interface direction.

## Architecture

ATFQ uses a microservice architecture:

```text
React app
   |
   v
API Gateway
   |
   +-- Auth service
   +-- User service
   +-- Wiki service

Supporting infrastructure:
PostgreSQL, Redis, MinIO, Vault, Nginx, ModSecurity,
Prometheus, Grafana, Kubernetes, Terraform, GHCR
```

The gateway exposes the public HTTP API consumed by the frontend. Internal services communicate through typed service contracts and keep their own persistence concerns separated.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Tailwind CSS
- Ky
- MSW for frontend mocking

### Backend

- Rust
- Axum API gateway
- Tonic gRPC services
- Go wiki service
- PostgreSQL
- Redis
- MinIO / S3-compatible storage
- SQLx
- Utoipa / Swagger UI

### Infrastructure & Security

- Docker Compose for local and demo stacks
- Kubernetes orchestration
- Terraform for cloud infrastructure
- GHCR container registry
- HashiCorp Vault for runtime secrets
- SOPS + age for encrypted local secret material
- Nginx reverse proxy
- OWASP ModSecurity Core Rule Set
- Let's Encrypt TLS
- Prometheus and Grafana
- Mailpit for local email testing

## Deployment

The project supports two deployment modes:

- **Docker Compose** for local end-to-end execution.
- **Kubernetes** for the public demo infrastructure.

The live deployment runs container images published to GHCR and pulls them from Kubernetes. Application secrets are injected through Vault-backed flows rather than committed environment files.

## Local Development

Prerequisites:

- Docker
- Task
- SOPS
- age
- jq
- yq

Run the full Docker Compose stack:

```bash
cd services
task up
```

Common commands:

```bash
cd services
docker compose up --build
docker compose logs -f
docker compose down
```

The project intentionally does not commit real runtime `.env` files.

## Repository Structure

```text
services/
  app/            React frontend
  api-gateway/    Public HTTP API gateway
  auth/           Authentication service
  user/           User/profile service
  wiki/           Wiki service
  vault/          Vault bootstrap and policies

infra/
  iac/            Terraform infrastructure
  orchestration/  Kubernetes charts, values, and deployment tasks

docs/
  db-schema/      Database schema diagrams
```

## Security Notes

The public version of this repository is intended to show architecture and engineering work, not expose runtime credentials.

Current safeguards:

- Runtime env files are ignored.
- Terraform state and tfvars are ignored.
- Kubeconfig files are ignored.
- Vault runtime data and AppRole IDs are ignored.
- Encrypted secret files are no longer tracked.

Before publishing publicly, the Git history should be cleaned of old secret-related blobs and any previously exposed credentials should be rotated.

## Data Model

ATFQ uses separate PostgreSQL databases per domain service. Each service owns its schema and exposes behavior through the API gateway instead of sharing database access across services.

| Domain | Main data owned | Purpose |
| --- | --- | --- |
| **Auth** | Users, credentials, OAuth identities, MFA material, reset tokens, refresh-token state | Handles identity, login, account security, OAuth linking, MFA, and password lifecycle. |
| **User** | Profiles, avatars, preferences, roles, permissions, friendships, presence | Handles user-facing profile data, social features, access levels, and personalization. |
| **Wiki** | Articles, hierarchy, notions, questions, resources, pending versions, moderation state | Handles the knowledge graph, contribution workflow, and content review lifecycle. |

Detailed schema diagrams are kept in [`docs/db-schema`](docs/db-schema) for deeper inspection.

## What This Project Demonstrates

- Building a real product from idea to public deployment.
- Designing service boundaries in a microservice architecture.
- Connecting frontend, gateway, internal services, and persistence layers.
- Managing auth, OAuth, MFA, roles, permissions, and moderation flows.
- Running production-style infrastructure with TLS, WAF, secrets, metrics, and Kubernetes.
- Creating the product identity, logo system, and interface direction from concept to implementation.
- Owning technical leadership and delivery across a multi-person team.

## Status

ATFQ is a demo / proof of concept. It is suitable for showcasing architecture, product thinking, infrastructure, and full-stack engineering work. Data and features may be reset or changed as the project evolves.
