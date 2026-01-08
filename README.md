# Meetcode - LeetCode Study Partner

> An Omegle-like experience for studying LeetCode problems together with video chat!

Meetcode pairs programmers for collaborative coding sessions. Users join a matchmaking queue with their preferred programming languages and problem categories, get matched with a compatible partner, and collaborate via real-time video chat while solving LeetCode problems together.

## ✨ Features

- **Instant Matchmaking**: Get paired with programmers who share your language and problem preferences
- **Real-time Collaboration**: Collaborative code editor powered by Monaco and Yjs for synchronized editing
- **Video Chat**: WebRTC-powered peer-to-peer video communication
- **Solo Practice Mode**: Practice alone with MeetCodeBot when no partners are available
- **Guest Access**: Try solo practice without creating an account
- **Kanagawa Theme**: Beautiful light (Lotus) and dark (Dragon) themes inspired by the popular Neovim colorscheme
- **User Reviews**: Rate and review your coding partners after sessions
- **Match History**: Track your sessions and review past problems

---

## Quick Start

### Prerequisites

- Docker & Docker Compose v2.0+
- Git

### 1. Clone & Configure Environment

```bash
# Clone the repository
git clone https://github.com/blsdncn/meetcode.git
cd meetcode

# Copy example environment files
cp .env.backend.example .env.backend
cp .env.frontend.example .env.frontend
```

### 2. Generate SSL Certificates

Generate self-signed certificates for local development using OpenSSL:

```bash
mkdir -p reverse-proxy/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout reverse-proxy/certs/localhost-key.pem \
  -out reverse-proxy/certs/localhost.pem \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

### 3. Launch the Stack

```bash
docker compose up -d --build
```

### 4. Seed Required Users

Solo practice mode requires special users to be seeded:

```bash
docker compose exec backend python seed_users.py
```

### 5. Access the Application

| Service | URL |
|---------|-----|
| **Frontend** | https://localhost |
| **API Docs** | https://localhost/api/docs |
| **Health Check** | https://localhost/api/health |

> **Note**: Accept the browser warning for self-signed certificates in development.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (443)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                          │
│  • TLS termination                                              │
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
│  • Monaco + Yjs     │            │  • Matchmaking      │
│  • WebRTC           │            │                     │
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
| **Code Editor** | Monaco Editor, Yjs (CRDT), y-monaco binding |
| **Backend** | FastAPI, SQLAlchemy, Pydantic, Python 3.12 |
| **Database** | PostgreSQL 16 |
| **Infrastructure** | Docker, Nginx, WebSockets, WebRTC |
| **Authentication** | NextAuth.js (frontend), JWT (backend) |
| **Real-time** | WebSockets (signaling), WebRTC (video/data) |

---

## Key Endpoints

### Match Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/match/create` | Create a new match |
| `POST` | `/api/match/solo` | Start solo practice (authenticated) |
| `POST` | `/api/match/solo/guest` | Start solo practice (guest access) |
| `PUT` | `/api/match/start/{id}` | Start a match |
| `PUT` | `/api/match/end/{id}` | End a match |
| `GET` | `/api/match/details/{id}` | Get match details |
| `GET` | `/api/match/history/{user_id}` | Get user's match history |

### WebSocket Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/ws/queue` | Matchmaking queue WebSocket |
| `/api/ws/match/{match_id}` | WebRTC signaling for matched users |

---

## Data Flow

1. **Authentication**: User authenticates via NextAuth (credentials or OAuth)
2. **Matchmaking**: User joins queue via WebSocket with language/category preferences
3. **Matching**: Background loop pairs users with compatible preferences
4. **Signaling**: Matched users exchange WebRTC offers/answers via WebSocket
5. **Video Chat**: Direct peer-to-peer connection established via WebRTC
6. **Code Sync**: Yjs CRDT synchronizes code via WebRTC data channel
7. **Review**: Session ends with peer review submission

---

## Solo Practice Mode

MeetCode supports solo practice for when you want to code alone:

- **Authenticated Users**: Start solo practice from the dashboard to track your sessions
- **Guest Access**: Click "Practice Solo as Guest" on the login page—no account required

Solo mode pairs you with **MeetCodeBot**, a placeholder partner that allows you to use the full editor experience without waiting for a match.

---

## Theme

MeetCode uses the **Kanagawa** color palette:

- **Light Mode**: Kanagawa Lotus—warm, paper-like tones
- **Dark Mode**: Kanagawa Dragon—comfortable dark theme with careful contrast

Toggle between themes using the theme switcher in the navigation bar.


### Quick Local Frontend Development

```bash
# Start all services
docker compose up -d --build

# Local frontend with hot reload
cd frontend && npm run dev
```

Access at http://localhost:3000 (talks to Nginx at https://localhost for API).

---

## Architecture Considerations

### Single-Worker Requirement (Demo Phase)

> **Note**: The backend runs with 1 Uvicorn worker. The matchmaking system uses an in-memory singleton for queue state.

For production with horizontal scaling:
1. Replace in-memory dict with Redis
2. Use Redis pub/sub for WebSocket broadcast
3. Implement sticky sessions or extract signaling service

---

## Environment Variables

### Backend (`.env.backend`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | General JWT signing key |
| `SECRET_KEY_ACCESS` | Yes | Access token secret |
| `SECRET_KEY_REFRESH` | Yes | Refresh token secret |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |

### Frontend (`.env.frontend`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | Full URL of the deployment |
| `NEXTAUTH_SECRET` | Yes | NextAuth encryption secret |
| `BACKEND_URL` | Yes | Internal backend URL for SSR |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Solo mode 500 error** | Run `docker compose exec backend python seed_users.py` |
| **401 Unauthorized** | Clear cookies for localhost in browser DevTools |
| **502 Bad Gateway** | Ensure Docker services are running: `docker compose ps` |
| **Users not matching** | Both users need overlapping language AND category preferences |
| **WebSocket fails** | Check `docker compose logs backend | grep websocket` |
| **Certificate warnings** | Expected with self-signed certs; click "Advanced" → "Proceed" |

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

### Third-Party Attributions

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party license information, including the Kanagawa color palette.
