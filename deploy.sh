#!/bin/bash
# ==============================================
# ASSEXP - Cloudflare Deployment Script
# ==============================================

set -e

echo "=============================================="
echo "  ASSEXP - Cloudflare Deployment"
echo "=============================================="

# Check if wrangler is installed
if ! command -v npx &> /dev/null; then
    echo "ERROR: npm/npx not found. Please install Node.js first."
    exit 1
fi

# Check if logged in
echo ""
echo "Checking Cloudflare login..."
if ! npx wrangler whoami 2>/dev/null | grep -q "You are logged in"; then
    echo ""
    echo "Please login to Cloudflare first:"
    echo "  npx wrangler login"
    echo ""
    exit 1
fi

# Deploy
echo ""
echo "Deploying to Cloudflare Pages..."

npx wrangler pages deploy . \
    --project-name assexp \
    --commit-dirty=true

echo ""
echo "=============================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=============================================="
echo ""
echo "Your app is now live at:"
echo "  https://assexp.pages.dev"
echo ""
