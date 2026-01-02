# Security Guidelines

This document outlines security best practices for deploying and maintaining the Meetcode application.

## Certificate Management

### Local Development

SSL certificates are required for HTTPS and secure WebSocket connections. For local development:

1. **Generate certificates** using the provided script:
   ```bash
   ./init_certs.sh
   ```

2. **Install mkcert** (recommended) for browser-trusted local certificates:
   ```bash
   # macOS
   brew install mkcert
   
   # Linux (Ubuntu/Debian)
   sudo apt install mkcert
   
   # Windows
   choco install mkcert
   ```

3. **Certificate locations**:
   - `reverse-proxy/certs/localhost.pem` - Certificate
   - `reverse-proxy/certs/localhost-key.pem` - Private key

### Production Deployment

For production, **do not use self-signed certificates**. Use one of:

- **Let's Encrypt** (free, automated via Certbot)
- **Cloudflare** (free SSL with their CDN)
- **AWS Certificate Manager** / **Google Cloud SSL** / **Azure Certificates**

### What NOT to Do

> **NEVER commit certificates or private keys to version control.**

If you accidentally commit certificates:

1. Immediately regenerate all certificates
2. Rotate any associated secrets
3. Consider the old certificates compromised
4. Use `git filter-branch` or BFG Repo-Cleaner to remove from history (advanced)

## Secrets Management

### Environment Variables

All secrets are managed via environment variables:

| Secret | Location | Purpose |
|--------|----------|---------|
| `POSTGRES_PASSWORD` | Root `.env` | Database password |
| `SECRET_KEY` | `backend/.env.runtime` | General JWT signing |
| `SECRET_KEY_ACCESS` | `backend/.env.runtime` | Access token signing |
| `SECRET_KEY_REFRESH` | `backend/.env.runtime` | Refresh token signing |
| `NEXTAUTH_SECRET` | `frontend/.env.runtime` | NextAuth encryption |

### Generating Secure Secrets

Always use cryptographically secure random generators:

```bash
# 32-byte hex string (64 characters)
openssl rand -hex 32

# 32-byte base64 string
openssl rand -base64 32

# Alternative using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### Files That Should NEVER Be Committed

The following are excluded by `.gitignore`:

```
# Environment files with secrets
**/.env.runtime
**/.env.local
**/.env.*.local

# SSL Certificates
**/certs/*.pem
**/certs/*.key
**/certs/*.crt
```

## Network Security

### CORS Configuration

CORS origins are configured via the `CORS_ORIGINS` environment variable:

```bash
# Single origin
CORS_ORIGINS=https://meetcode.example.com

# Multiple origins (comma-separated)
CORS_ORIGINS=https://meetcode.example.com,https://staging.meetcode.example.com
```

**Never use** `*` as the CORS origin in production.

### TLS Configuration

The Nginx reverse proxy handles TLS termination with modern cipher suites:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
```

### Internal Network

- Database (PostgreSQL) is **not exposed** to the host network
- Backend API is only accessible through the Nginx proxy
- WebSocket connections are proxied through Nginx

## Authentication Security

### JWT Tokens

- Access tokens expire in 15 minutes
- Refresh tokens expire in 24 hours
- Tokens are signed with separate secrets for access and refresh
- Tokens are transmitted in the `Authorization` header, not cookies

### Password Storage

- Passwords are hashed using bcrypt with automatic salt
- Plain-text passwords are never stored or logged

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email the maintainers directly (if available)
3. Provide detailed reproduction steps
4. Allow reasonable time for a fix before public disclosure

## Security Checklist

Before deploying to production:

- [ ] All certificates regenerated (not from development)
- [ ] All secrets regenerated with `openssl rand`
- [ ] `.env.runtime` files are not in version control
- [ ] `CORS_ORIGINS` set to your actual domain(s)
- [ ] Database not exposed to public network
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] TLS 1.2+ only (no TLS 1.0/1.1)
- [ ] Backend running with `--workers 1`

