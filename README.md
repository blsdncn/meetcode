# Meetcode - LeetCode Study Partner

> An Omegle-like experience for studying LeetCode problems together with video chat!

Meetcode pairs programmers for collaborative coding sessions. Users join a matchmaking queue with their preferred programming languages and problem categories, get matched with a compatible partner, and collaborate via real-time video chat while solving LeetCode problems together.

## Quick Start (Demo Deployment)

### Prerequisites

- Docker & Docker Compose v2.0+
- OpenSSL (for certificate generation)
- Git

### 1. Clone & Configure Environment

```bash
# Clone the repository
git clone https://github.com/your-org/meetcode.git
cd meetcode

# Copy example environment files
cp backend/.env.example backend/.env.runtime
cp frontend/.env.example frontend/.env.runtime

# Generate secure secrets
echo "SECRET_KEY=$(openssl rand -hex 32)" >> backend/.env.runtime
echo "SECRET_KEY_ACCESS=$(openssl rand -hex 32)" >> backend/.env.runtime
echo "SECRET_KEY_REFRESH=$(openssl rand -hex 32)" >> backend/.env.runtime
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> frontend/.env.runtime

# Set a secure database password
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" >> backend/.env.runtime
```

Edit the environment files as needed:
```bash
nano backend/.env.runtime
nano frontend/.env.runtime
```

### 2. Generate SSL Certificates

> **SECURITY WARNING**: Never commit SSL certificates or private keys to version control.
> The `init_certs.sh` script generates certificates locally. These are excluded by `.gitignore`.

```bash
chmod +x init_certs.sh
./init_certs.sh
```

For trusted local certificates (recommended), install [mkcert](https://github.com/FiloSottile/mkcert) first.

### 3. Set Database Password

Export the password for Docker Compose:
```bash
export POSTGRES_PASSWORD="your-secure-password"
```

Or add it to a root `.env` file:
```bash
echo "POSTGRES_PASSWORD=your-secure-password" > .env
```

### 4. Validate Configuration (Optional)

Run the pre-deployment validation script to check for common issues:
```bash
./scripts/validate_deployment.sh
```

### 5. Launch the Stack

```bash
docker-compose up -d --build
```

### 6. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# View logs
docker-compose logs -f

# Check individual services
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
```

### Access Points

| Service | URL |
|---------|-----|
| **Frontend** | https://localhost |
| **API Docs** | https://localhost/api/docs |
| **Health Check** | https://localhost/api/health |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (443)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                          │
│  • TLS termination                                               │
│  • Route /api/auth/* → Frontend (NextAuth)                      │
│  • Route /api/* → Backend (FastAPI)                             │
│  • Route /ws/* → Backend (WebSocket)                            │
│  • Route /* → Frontend (Next.js)                                │
└────────┬────────────────────────────────────┬───────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Frontend (3000)   │            │   Backend (8000)    │
│                     │            │                     │
│  • Next.js 15       │            │  • FastAPI          │
│  • React 19         │            │  • SQLAlchemy       │
│  • NextAuth.js      │◄──────────►│  • WebSockets       │
│  • TailwindCSS      │  HTTP/WS   │  • JWT Auth         │
│  • WebRTC           │            │  • Matchmaking      │
└─────────────────────┘            └──────────┬──────────┘
                                              │
                                              ▼
                                   ┌─────────────────────┐
                                   │  PostgreSQL (5432)  │
                                   │                     │
                                   │  • Users            │
                                   │  • Matches          │
                                   │  • Problems         │
                                   │  • Reviews          │
                                   └─────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript, TailwindCSS, shadcn/ui |
| **Backend** | FastAPI, SQLAlchemy, Pydantic, Python 3.12 |
| **Database** | PostgreSQL 16 |
| **Infrastructure** | Docker, Nginx, WebSockets |
| **Authentication** | NextAuth.js (frontend), JWT (backend) |
| **Real-time** | WebSockets (signaling), WebRTC (video) |

### Data Flow

1. **Authentication**: User authenticates via NextAuth (credentials or OAuth)
2. **Matchmaking**: User joins queue via WebSocket with language/category preferences
3. **Matching**: Background loop pairs users with compatible preferences
4. **Signaling**: Matched users exchange WebRTC offers/answers via WebSocket
5. **Video Chat**: Direct peer-to-peer connection established via WebRTC
6. **Review**: Session ends with peer review submission

---

## Security Considerations

> **See [SECURITY.md](SECURITY.md) for detailed security guidelines.**

### Certificate Management

- **NEVER** commit SSL certificates (`.pem`, `.key`, `.crt`) to version control
- Certificates in `reverse-proxy/certs/` and `backend/certs/` are git-ignored
- For production: Use Let's Encrypt, Cloudflare, or your cloud provider's certificate manager
- Regenerate certificates if you suspect they've been compromised:
  ```bash
  rm -rf reverse-proxy/certs/*.pem backend/certs/*.pem
  ./init_certs.sh
  ```

### Secrets Management

- All secrets are injected via environment variables
- Never hardcode passwords, API keys, or tokens in source code
- Use strong, randomly generated secrets (the setup guide shows how)

---

## Architecture Limitations (Demo Phase)

### Single-Worker Requirement

> **CRITICAL**: The backend MUST run with exactly 1 Uvicorn worker.

The matchmaking system uses an in-memory singleton pattern. Running multiple workers would create separate, non-communicating queues where users would never match.

```bash
# CORRECT - Single worker (default)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1

# WRONG - Multiple workers will break matchmaking
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### In-Memory Matchmaking State

The current matchmaking implementation uses an **in-memory Python Singleton**:

- Queue state exists only within the single FastAPI worker process
- **Single VPS deployment only** - horizontal scaling not supported
- Server restart clears the matchmaking queue (users must rejoin)

### Why Not Redis?

For the demo phase, we opted for simplicity:
- Reduced infrastructure complexity
- Faster iteration during development
- Acceptable for single-server demo deployments

### Production Path

For production deployment with multiple instances:
1. Replace in-memory dict with Redis
2. Use Redis pub/sub for WebSocket broadcast
3. Implement sticky sessions or extract signaling service

---

## Environment Variables Reference

### Backend (`backend/.env.runtime`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `POSTGRES_USER` | Yes | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `SECRET_KEY` | Yes | General JWT signing key |
| `SECRET_KEY_ACCESS` | Yes | Access token secret |
| `SECRET_KEY_REFRESH` | Yes | Refresh token secret |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |

### Frontend (`frontend/.env.runtime`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | Full URL of the deployment |
| `NEXTAUTH_SECRET` | Yes | NextAuth encryption secret |
| `BACKEND_URL` | Yes | Internal backend URL for SSR |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth client secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |

---

## Troubleshooting

### Certificates not found

```bash
# Regenerate certificates
rm -rf reverse-proxy/certs/*.pem
./init_certs.sh
docker-compose restart nginx
```

### Database connection refused

```bash
# Check PostgreSQL is healthy
docker-compose ps db
docker-compose logs db

# Verify environment variables
docker-compose exec backend env | grep POSTGRES
```

### Users not matching

Verify both users have **overlapping** language AND category preferences. The matchmaking algorithm requires at least one common language and one common category.

### WebSocket connection failed

```bash
# Check backend logs for WebSocket errors
docker-compose logs -f backend | grep -i websocket

# Verify nginx WebSocket configuration
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf
```

### 502 Bad Gateway

```bash
# Check if backend is healthy
docker-compose ps
curl -k https://localhost/api/health

# Restart services
docker-compose restart backend nginx
```

---

## Development

### Local Development (without Docker)

#### Backend

```bash
cd backend
pip install uv
uv sync

# Set up environment
cp .env.example .env.runtime

# Run database (requires Docker)
docker-compose up -d db

# Start server
hatch run dev
```

#### Frontend

```bash
cd frontend
npm install

# Set up environment
cp .env.example .env.runtime

# Start dev server
npm run dev
```

### Running Tests

```bash
# Backend tests
cd backend
hatch run test

# Frontend tests
cd frontend
npm test
```

---

## API Documentation

Once the stack is running, interactive API documentation is available at:

- **Swagger UI**: https://localhost/api/docs
- **ReDoc**: https://localhost/api/redoc

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
