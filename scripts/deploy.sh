#!/usr/bin/env bash
# ================================================================
# deploy.sh — expats-wakeelypro Clean Deployment Script
# ================================================================
# Single source of truth for deploying expats-wakeelypro to Vercel.
#
# Prerequisites:
#   - Vercel CLI installed: npm i -g vercel
#   - Vercel logged in: vercel login
#   - Environment variables set (see below)
#
# Usage:
#   ./scripts/deploy.sh              # Deploy to production
#   ./scripts/deploy.sh --preview    # Deploy to preview
#   ./scripts/deploy.sh --check      # Only run checks, don't deploy
# ================================================================

set -euo pipefail

# --- Configuration ---
PROJECT_NAME="expats-wakeelypro"
FRAMEWORK="nextjs"

# --- Required Environment Variables ---
#   VERCEL_TOKEN          — Your Vercel API token
#   VERCEL_ORG_ID         — Your Vercel organization/team ID
#   VERCEL_PROJECT_ID     — The Vercel project ID for expats-wakeelypro
#   DATABASE_URL          — Supabase/Neon PostgreSQL connection string
#   DIRECT_URL            — Direct connection (for migrations)
#   JWT_SECRET            — JWT signing secret

# Load from .env.deploy if it exists
if [[ -f ".env.deploy" ]]; then
  echo "  Loading environment from .env.deploy"
  set -a
  source .env.deploy
  set +a
fi

# --- Argument Parsing ---
ENVIRONMENT="production"
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --preview)
      ENVIRONMENT="preview"
      shift
      ;;
    --check)
      CHECK_ONLY=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--preview] [--check]"
      echo ""
      echo "  --preview    Deploy to preview environment"
      echo "  --check      Run pre-deploy checks only (no deployment)"
      echo "  --help       Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run with --help for usage."
      exit 1
      ;;
  esac
done

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ================================================================
# Step 1: Pre-flight Checks
# ================================================================
echo ""
echo "=========================================="
echo "  expats-wakeelypro Deployment"
echo "  Environment: ${ENVIRONMENT}"
echo "=========================================="
echo ""

log_info "Running pre-flight checks..."

# Check required vars
REQUIRED_VARS=("VERCEL_TOKEN" "VERCEL_ORG_ID" "VERCEL_PROJECT_ID" "DATABASE_URL" "JWT_SECRET")
MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!VAR:-}" ]]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  log_error "Missing required environment variables:"
  for VAR in "${MISSING_VARS[@]}"; do
    echo "     - $VAR"
  done
  echo ""
  echo "  Create a .env.deploy file or export them in your shell:"
  echo "  echo 'VERCEL_TOKEN=your_token' >> .env.deploy"
  echo "  echo 'VERCEL_ORG_ID=your_org_id' >> .env.deploy"
  echo "  echo 'VERCEL_PROJECT_ID=your_project_id' >> .env.deploy"
  exit 1
fi

log_ok "All required environment variables are set"

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
  log_error "Vercel CLI not found. Install it with:"
  echo "     npm i -g vercel"
  exit 1
fi
log_ok "Vercel CLI found ($(vercel --version 2>/dev/null | head -1))"

# Check npm
if ! command -v npm &> /dev/null; then
  log_error "npm not found."
  exit 1
fi
log_ok "npm found ($(npm --version))"

# Check git status
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
  log_warn "Uncommitted changes detected. Consider committing before deploying."
fi

if [[ "$CHECK_ONLY" == true ]]; then
  echo ""
  log_ok "Pre-flight checks passed. No deployment performed (--check mode)."
  exit 0
fi

# ================================================================
# Step 2: Install Dependencies
# ================================================================
echo ""
log_info "Installing dependencies..."
npm ci
log_ok "Dependencies installed"

# ================================================================
# Step 3: Database Migrations
# ================================================================
echo ""
log_info "Running database migrations..."
if npx prisma migrate deploy 2>/dev/null; then
  log_ok "Database migrations applied (or already up to date)"
else
  log_warn "Migration check skipped (DATABASE_URL may need DIRECT_URL for migrations)"
fi

# ================================================================
# Step 4: Pull Vercel Environment
# ================================================================
echo ""
log_info "Pulling Vercel environment configuration..."
vercel pull --yes --environment="${ENVIRONMENT}" \
  --token="${VERCEL_TOKEN}" 2>/dev/null || {
  log_error "Failed to pull Vercel environment. Check your VERCEL_TOKEN and VERCEL_PROJECT_ID."
  exit 1
}
log_ok "Vercel environment pulled"

# ================================================================
# Step 5: Build
# ================================================================
echo ""
log_info "Building with Vercel..."
vercel build --yes --token="${VERCEL_TOKEN}" || {
  log_error "Build failed. Check the build logs above."
  exit 1
}
log_ok "Build completed successfully"

# ================================================================
# Step 6: Deploy
# ================================================================
echo ""
log_info "Deploying to Vercel (${ENVIRONMENT})..."
DEPLOYMENT_OUTPUT=$(vercel deploy --prebuilt --yes --token="${VERCEL_TOKEN}" 2>&1) || {
  log_error "Deployment failed:"
  echo "$DEPLOYMENT_OUTPUT"
  exit 1
}

DEPLOYMENT_URL=$(echo "$DEPLOYMENT_OUTPUT" | grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' | head -1)

if [[ -z "$DEPLOYMENT_URL" ]]; then
  DEPLOYMENT_URL="(check Vercel dashboard for URL)"
fi

# ================================================================
# Step 7: Summary
# ================================================================
echo ""
echo "=========================================="
echo -e "  ${GREEN}Deployment Successful! :rocket:${NC}"
echo "=========================================="
echo ""
echo "  Project:      ${PROJECT_NAME}"
echo "  Environment:  ${ENVIRONMENT}"
echo "  URL:          ${DEPLOYMENT_URL}"
echo "  Commit:       $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo "  Branch:       $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "  Deployed at:  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""
