Here is the complete `README.md` content, formatted for a quick copy-paste into your project.

````markdown
# User Service: Database & Container Guide

This service handles user data, profiles, and permissions using **Fastify** and **Prisma ORM**. It connects to a **PostgreSQL** database running in a dedicated Docker container.

---

## 🛠 Prerequisites

To manage the database from your host machine (Mac/Linux/Windows), ensure you have the following installed:

1.  **Node.js (v22+)**: To run the Prisma CLI locally.
2.  **Docker & Docker Compose**: To run the microservices environment.
3.  **Local Dependencies**: Run this in the `services/user` folder:
    ```bash
    npm install
    ```

---

## 📊 Database Management with Prisma Studio

Prisma Studio is a visual editor for your database. Because the database is inside a Docker network, you must use a connection string that points to `localhost` rather than the internal Docker hostname `db-user`.

### 1. Enable Host Access
Ensure port `5432` is exposed in your `docker-compose.yaml`:
```yaml
db-user:
  ports:
    - "5432:5432" # Allows your Mac to see the DB
````

### 2\. Launch Prisma Studio

Run this command from your terminal in the `services/user` directory:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/db_user" npx prisma studio
```
-----

## 💻 Useful Commands

### Docker & Logs

| Task | Command |
| :--- | :--- |
| **Rebuild Service** | `docker compose up -d --build user` |
| **Check Logs** | `docker logs -f services-user-1` |
| **Inside DB Shell** | `docker exec -it services-db-user-1 psql -U user -d db_user` |

### Prisma (Inside Container)

Use these to sync your schema changes:

  * **Sync Schema**: `docker exec -it services-user-1 npx prisma db push`
  * **Generate Client**: `docker exec -it services-user-1 npx prisma generate`

-----

## 🔗 Relational Structure

The database follows a relational model. In Prisma Studio, you can click on relation fields to jump between connected records:

  * **User ↔ Profile**: One-to-One connection.
  * **User ↔ Contributions**: One-to-Many connection.
  * **Users ↔ Roles ↔ Permissions**: Many-to-Many via join tables.

-----

## ⚠️ Troubleshooting

  * **White Page in Studio**: Ensure `openssl` is installed in your Dockerfile and the container is running.
  * **Connection Error**: Verify the `DATABASE_URL` override uses `localhost:5432` and that the port is correctly mapped in `docker-compose.yaml`.
  * **Version Mismatch**: Ensure `prisma` and `@prisma/client` are both locked to version `6.12.0` in `package.json`.

<!-- end list -->

```

