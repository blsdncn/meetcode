# 📚 Meetcode

This app creates an Omegle-like experience where users can study LeetCode problems together! 👯‍♂️💻

---

## 📑 Table of Contents
- [Dependencies](#-dependencies)
- [Running Back End](#-running-back-end)
- [Running Front End](#-running-front-end)
- [HTTPS Configuration](#-https-configuration)

---

## 🔧 Dependencies

- 🐳 [Docker](https://www.docker.com/products/docker-desktop/)
- 📦 [Node.js & NPM](https://nodejs.org/)
- 🐍 [Python 3.13](https://www.python.org/downloads/)

---

## 🖥️ Running Back End

### 📁 Navigate to the backend directory

```bash
cd backend
```

### 🐘 Start Postgres

```bash
docker compose up -d
```

### Shutdown docker image

```bash
docker compose down -v
```

### Populate problems table from CSV
```bash
docker-compose down -v
docker-compose up
hatch run dev  # Run to initialize database (hatch run dev), then close it after running scripts
python -m src.app.scripts.load_problems # or hatch run python -m src.app.scripts.load_problems
```

### 🚀 Start FastAPI

```bash
hatch shell 
hatch run dev
```

### 🔒 Start FastAPI with HTTPS

For secure WebSocket connections (WSS), use the SSL certificates in the certs folder:

```bash
uvicorn app.main:app --ssl-keyfile=./certs/key.pem --ssl-certfile=./certs/cert.pem --host 0.0.0.0 --port 8000
# or
hatch run dev_webrtc
```

---

## 🎨 Running Front End

### 📁 Navigate to the frontend directory

```bash
cd frontend
```

### 📦 Install dependencies

```bash
npm install
```

### 🧪 Start development server

```bash
npm run dev
```

---

## 🔒 Docker Deployment with Reverse Proxy

The application now uses a Docker-only deployment with Nginx as a reverse proxy, eliminating the need for direct TLS configuration on the frontend.

### Architecture Overview

- **Nginx**: Handles TLS termination and routes requests to frontend/backend
- **Frontend**: Runs in Docker, uses relative URLs (no hardcoded ports)
- **Backend**: Runs in Docker on plain HTTP internally, no TLS needed
- **URLs**: Everything goes through `https://frontend.localhost`

### Benefits

1. **No TLS complications**: Backend runs on plain HTTP inside Docker network
2. **No hardcoded URLs**: Frontend uses relative paths that work in any environment
3. **Simplified WebSockets**: All WS/WSS connections go through Nginx proxy
4. **Production-ready**: Same setup works in development and production

⚠️ **Note**: The old `NODE_TLS_REJECT_UNAUTHORIZED=0` workaround is no longer needed with this architecture.

---
