#!/bin/bash
#
# Pre-deployment validation script for Meetcode
#
# This script checks for common configuration issues before deployment.
# Run it before `docker-compose up` to catch problems early.
#
# Usage: ./scripts/validate_deployment.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "=========================================="
echo "  Meetcode Pre-Deployment Validator"
echo "=========================================="
echo ""

# Helper functions
error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
    ERRORS=$((ERRORS + 1))
}

warn() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

info() {
    echo -e "ℹ️  $1"
}

# ==========================================
# 1. Check SSL Certificates
# ==========================================
echo "🔐 Checking SSL Certificates..."

if [ -f "reverse-proxy/certs/localhost.pem" ] && [ -f "reverse-proxy/certs/localhost-key.pem" ]; then
    success "SSL certificates found in reverse-proxy/certs/"
else
    error "SSL certificates missing. Run ./init_certs.sh first"
fi

# Check if certificates are tracked by git
if git ls-files --error-unmatch "reverse-proxy/certs/*.pem" 2>/dev/null; then
    error "SSL certificates are tracked by git! Add them to .gitignore"
fi

if git ls-files --error-unmatch "backend/certs/*.pem" 2>/dev/null; then
    error "Backend certificates are tracked by git! Add them to .gitignore"
fi

echo ""

# ==========================================
# 2. Check Environment Files
# ==========================================
echo "📁 Checking Environment Files..."

# Backend .env.runtime
if [ -f "backend/.env.runtime" ]; then
    success "backend/.env.runtime exists"
    
    # Check for required variables
    if grep -q "SECRET_KEY=" backend/.env.runtime; then
        if grep -q "SECRET_KEY=generate-" backend/.env.runtime || grep -q "SECRET_KEY=$" backend/.env.runtime; then
            error "SECRET_KEY not set (still has placeholder value)"
        else
            success "SECRET_KEY is set"
        fi
    else
        error "SECRET_KEY missing from backend/.env.runtime"
    fi
    
    if grep -q "POSTGRES_PASSWORD=" backend/.env.runtime; then
        success "POSTGRES_PASSWORD is set"
    else
        error "POSTGRES_PASSWORD missing from backend/.env.runtime"
    fi
    
    if grep -q "CORS_ORIGINS=" backend/.env.runtime; then
        success "CORS_ORIGINS is set"
    else
        warn "CORS_ORIGINS not set (will default to https://localhost)"
    fi
else
    error "backend/.env.runtime not found. Copy from backend/.env.example"
fi

# Frontend .env.runtime
if [ -f "frontend/.env.runtime" ]; then
    success "frontend/.env.runtime exists"
    
    if grep -q "NEXTAUTH_SECRET=" frontend/.env.runtime; then
        if grep -q "NEXTAUTH_SECRET=generate-" frontend/.env.runtime || grep -q "NEXTAUTH_SECRET=$" frontend/.env.runtime; then
            error "NEXTAUTH_SECRET not set (still has placeholder value)"
        else
            success "NEXTAUTH_SECRET is set"
        fi
    else
        error "NEXTAUTH_SECRET missing from frontend/.env.runtime"
    fi
    
    if grep -q "NEXTAUTH_URL=" frontend/.env.runtime; then
        success "NEXTAUTH_URL is set"
    else
        warn "NEXTAUTH_URL not set"
    fi
else
    error "frontend/.env.runtime not found. Copy from frontend/.env.example"
fi

# Root .env for POSTGRES_PASSWORD
if [ -f ".env" ]; then
    if grep -q "POSTGRES_PASSWORD=" .env; then
        success "POSTGRES_PASSWORD in root .env"
    fi
elif [ -z "$POSTGRES_PASSWORD" ]; then
    warn "POSTGRES_PASSWORD not exported. Set it in .env or export it"
fi

echo ""

# ==========================================
# 3. Check for Hardcoded Secrets
# ==========================================
echo "🔍 Checking for Hardcoded Secrets..."

# Check for common secret patterns in code
# Look for actual hardcoded password/secret strings, not variable names or env reads
# Pattern: password/secret directly assigned to a string value (not env var)
# Excludes: os.getenv, process.env, .env, example, placeholder, tokenUrl

SECRET_MATCHES=$(grep -riE "(password|secret|api_key)\s*[:=]\s*['\"][^'\"]{8,}['\"]" backend/src frontend/src \
   --include="*.py" --include="*.ts" --include="*.tsx" 2>/dev/null | \
   grep -viE "(\.env|example|placeholder|your-|generate-|os\.getenv|process\.env|tokenUrl|Bearer|schema|test)" || true)

if [ -n "$SECRET_MATCHES" ]; then
    echo "$SECRET_MATCHES" | head -5
    warn "Potential hardcoded secrets found - review the above lines"
else
    success "No obvious hardcoded secrets found"
fi

echo ""

# ==========================================
# 4. Check Docker Configuration
# ==========================================
echo "🐳 Checking Docker Configuration..."

if command -v docker &> /dev/null; then
    success "Docker is installed"
else
    error "Docker not found"
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    success "Docker Compose is available"
else
    error "Docker Compose not found"
fi

# Check docker-compose.yaml exists
if [ -f "docker-compose.yaml" ]; then
    success "docker-compose.yaml exists"
    
    # Check for single worker in entrypoint
    if grep -q "workers 1" backend/entrypoint-http.sh 2>/dev/null; then
        success "Backend configured for single worker"
    else
        warn "Backend may not be configured for single worker"
    fi
else
    error "docker-compose.yaml not found"
fi

echo ""

# ==========================================
# 5. Check .gitignore Rules
# ==========================================
echo "📋 Checking .gitignore Rules..."

REQUIRED_IGNORES=(
    ".env.runtime"
    "*.pem"
    "*.key"
)

for pattern in "${REQUIRED_IGNORES[@]}"; do
    if grep -q "$pattern" .gitignore 2>/dev/null; then
        success ".gitignore includes $pattern"
    else
        warn ".gitignore missing pattern: $pattern"
    fi
done

echo ""

# ==========================================
# Summary
# ==========================================
echo "=========================================="
echo "  Validation Summary"
echo "=========================================="

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ $ERRORS error(s) found${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
fi

echo ""

if [ $ERRORS -gt 0 ]; then
    echo "Fix errors before deploying."
    exit 1
fi

echo "Ready for deployment!"
exit 0

