# Meetcode Development Guide

## Quick Start: Automatic Environment Strategy

This setup allows you to switch between **Full Docker** and **Local Frontend Development** without changing your configuration files.

### 1. Initial Setup
```bash
# Generate Dev Certificates (Self-signed)
./init_certs.sh

# Copy Root Environment (For Docker & Infrastructure)
cp .env.backend.example .env.backend
cp .env.frontend.example .env.frontend

# Create Local Override (For npm run dev)
# This file tells your local machine to talk to Nginx on port 443
echo "BACKEND_URL=https://localhost" > frontend/.env.local
echo "NEXTAUTH_URL=http://localhost:3000" >> frontend/.env.local
echo "NODE_TLS_REJECT_UNAUTHORIZED=0" >> frontend/.env.local
```

### 2. Launch Services
Start **ALL** services in Docker. Even if you plan to code the frontend locally, the Dockerized frontend must run in the background so that Nginx can find the hostname.

```bash
docker compose up -d --build
```
*Access at: [https://localhost](https://localhost) (Accept cert warning)*

---

## Workflow: Local Frontend Development
If you want **Hot-Reload** while coding the frontend:

1.  **Keep Docker Running**: Keep the infrastructure from Step 2 active.
2.  **Start Local Node**:
    ```bash
    cd frontend && npm run dev
    ```
3.  **Access App**: [http://localhost:3000](http://localhost:3000)
    *   Your local code will automatically use `frontend/.env.local` to talk to the Backend via Nginx (`https://localhost`).

---

## Environment Strategy Summary

We use **Root** files for Docker and **Nested** files for host-machine development.

| Context | Active File | Backend URL | Why? |
|---------|-------------|-------------|------|
| **Inside Docker** | `.env.frontend` | `http://backend:8000` | Uses internal container networking. |
| **On Your Host** | `frontend/.env.local` | `https://localhost` | Goes through Nginx (Local Node can't see 'backend'). |

## Seed Users (Required for Solo Mode)

Before running the application, you must seed the required users:

```bash
# Run the seed script in the backend container
docker compose exec backend python seed_users.py
```

This creates:
- **MeetCodeBot**: The bot user for solo practice mode
- **Guest**: The anonymous user for guest solo practice

The script is safe to run multiple times and will skip users that already exist.

## Troubleshooting
*   **401 Unauthorized**: Stale cookies. Clear cookies for `localhost` in browser DevTools.
*   **502 Bad Gateway**: Nginx can't reach the service. Ensure `docker compose up` is active and healthy.
*   **Cert Warnings**: This is expected with self-signed certs. Click "Advanced" -> "Proceed".
*   **Solo Mode 500 Error**: Run the seed users script to ensure MeetCodeBot exists.
