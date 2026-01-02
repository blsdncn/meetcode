#!/bin/bash
# Meetcode SSL Certificate Generation Script
# Generates self-signed certificates for local development/demo
set -e

CERT_DIR="./reverse-proxy/certs"
DOMAIN="${DOMAIN:-localhost}"

echo "🔐 Meetcode Certificate Generator"
echo "=================================="
echo "Domain: $DOMAIN"
echo "Cert Directory: $CERT_DIR"
echo ""

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$CERT_DIR/$DOMAIN.pem" ] && [ -f "$CERT_DIR/$DOMAIN-key.pem" ]; then
    echo "✅ Certificates already exist for $DOMAIN"
    echo "   - Certificate: $CERT_DIR/$DOMAIN.pem"
    echo "   - Private Key: $CERT_DIR/$DOMAIN-key.pem"
    echo ""
    echo "To regenerate, delete the existing certificates and run again."
    exit 0
fi

echo "🔐 Generating self-signed certificates for $DOMAIN..."

# Check if mkcert is available (preferred for local dev - trusted by browsers)
if command -v mkcert &> /dev/null; then
    echo "Using mkcert for trusted local certificates..."
    mkcert -install 2>/dev/null || true
    mkcert -key-file "$CERT_DIR/$DOMAIN-key.pem" \
           -cert-file "$CERT_DIR/$DOMAIN.pem" \
           "$DOMAIN" "localhost" "127.0.0.1" "::1"
else
    echo "Using OpenSSL for self-signed certificates..."
    echo "(Install mkcert for browser-trusted local certificates)"
    echo ""
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERT_DIR/$DOMAIN-key.pem" \
        -out "$CERT_DIR/$DOMAIN.pem" \
        -subj "/C=US/ST=California/L=SanDiego/O=Meetcode/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1"
fi

# Set secure permissions
chmod 600 "$CERT_DIR"/*.pem

echo ""
echo "✅ Certificates generated successfully!"
echo "   - Certificate: $CERT_DIR/$DOMAIN.pem"
echo "   - Private Key: $CERT_DIR/$DOMAIN-key.pem"
echo ""
echo "⚠️  Note: Self-signed certificates will show security warnings in browsers."
echo "    For trusted local certs, install mkcert: https://github.com/FiloSottile/mkcert"

