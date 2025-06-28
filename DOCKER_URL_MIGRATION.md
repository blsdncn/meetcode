# Docker URL Migration Summary

This document summarizes the changes made to migrate from hardcoded localhost URLs to a Docker-only deployment with Nginx reverse proxy.

## ✅ Changes Made

### 1. Frontend URL Updates

#### **constants.ts**
- **Before**: `export const API_HOST_BASE_URL: string = process.env.NEXT_PUBLIC_API_HOST_BASE_URL || 'https://backend:8000/';`
- **After**: `export const API_HOST_BASE_URL: string = "/";`
- **Impact**: All API calls now use relative URLs that work through the reverse proxy

#### **WebSocket URLs**
- **Before**: Hardcoded `wss://localhost:8000/ws/...`
- **After**: Dynamic URLs derived from `window.location`
```typescript
const { protocol, host } = window.location
const wsBase = protocol === "https:" ? "wss" : "ws"
const socket = new WebSocket(`${wsBase}://${host}/ws/queue`)
```

#### **Fetch Calls**
- **Before**: `fetch("http://localhost:8000/api/problem/tags")`
- **After**: `fetch("/api/problem/tags")`
- **Impact**: All HTTP requests now go through the reverse proxy

### 2. Backend CORS Configuration

#### **main.py**
- **Before**: 
  ```python
  origins = ["http://frontend.localhost:3000"]
  allow_credentials=True
  allow_headers=["*"]
  ```
- **After**:
  ```python
  origins = ["https://frontend.localhost"]
  allow_credentials=False  # JWT in Authorization header, not cookies
  allow_headers=["Authorization", "Content-Type"]
  ```

### 3. Environment Variables

#### **.env.production**
- **Before**: `NEXT_PUBLIC_API_URL=https://backend:8000`
- **After**: `NEXT_PUBLIC_API_URL=` (blank - using relative URLs)

#### **.env.runtime**
- **Before**: `NEXTAUTH_URL=http://localhost:3000`
- **After**: `NEXTAUTH_URL=https://frontend.localhost`

### 4. Nginx Configuration Fix

#### **Critical Auth Routing**
- **Issue**: NextAuth routes (`/api/auth/*`) were being sent to backend instead of staying in frontend
- **Fix**: Added specific routing for NextAuth:
  ```nginx
  # NextAuth API routes stay in frontend
  location /api/auth/ {
      proxy_pass http://frontend:3000/api/auth/;
  }
  
  # Backend API routes (everything except /api/auth/)
  location /api/ {
      proxy_pass http://backend:8000/api/;
  }
  ```

### 5. Auth Configuration

#### **auth.tsx**
- **Before**: `export const API_HOST_BASE_URL = process.env.NEXT_PUBLIC_API_HOST_BASE_URL!;`
- **After**: `import { API_HOST_BASE_URL } from '@/lib/constants';`
- **Impact**: Auth calls now use the same relative URL logic as other API calls

### 4. Documentation Updates

#### **README.md**
- **Removed**: Section about `NODE_TLS_REJECT_UNAUTHORIZED=0`
- **Added**: New section explaining Docker-only architecture with reverse proxy benefits

#### **Backend WebSocket Test Page**
- **Updated**: HTML template to use dynamic WebSocket URLs

## ✅ Files Modified

### Frontend
```
frontend/src/lib/constants.ts
frontend/src/lib/auth.tsx
frontend/features/webrtc/hooks/use-signaling.ts
frontend/src/app/matchmaking/page.tsx
frontend/.env.production
frontend/.env.runtime
```

### Backend
```
backend/src/app/main.py
backend/src/app/routes/websocket.py
```

### Infrastructure
```
reverse-proxy/nginx.conf
```

### Documentation
```
README.md
DOCKER_URL_MIGRATION.md (this file)
```

## ✅ Architecture Benefits

1. **No Hardcoded URLs**: Everything uses relative paths that work in any environment
2. **Simplified TLS**: Backend runs on plain HTTP internally, Nginx handles TLS
3. **Production Ready**: Same Docker setup works for development and production
4. **WebSocket Compatibility**: All WS/WSS connections work through reverse proxy
5. **Environment Agnostic**: Code works whether deployed locally or in cloud

## ✅ Key URL Patterns

| Component | Old Pattern | New Pattern |
|-----------|-------------|-------------|
| API Calls | `http://localhost:8000/api/*` | `/api/*` |
| WebSockets | `wss://localhost:8000/ws/*` | `${wsBase}://${host}/ws/*` |
| Frontend Access | `http://localhost:3000` | `https://frontend.localhost` |
| Backend Internal | `https://backend:8000` | `http://backend:8000` (internal) |

## ✅ Testing Checklist

- [ ] API calls work through reverse proxy
- [ ] WebSocket connections establish properly
- [ ] Authentication flows work with new URLs
- [ ] Video chat signaling works
- [ ] Match-making queue functions correctly
- [ ] All environment configurations are correct

## ✅ Migration Complete

All hardcoded `localhost:8000` URLs have been removed from the frontend codebase. The application now uses a clean Docker-only architecture with Nginx reverse proxy handling all routing and TLS termination.
