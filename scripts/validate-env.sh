#!/bin/bash

# ============================================================================
# VisaBuddy Environment Variable Validation Script
# ============================================================================
# 
# This script validates that all required environment variables are set
# and have valid values.
#
# Usage:
#   ./scripts/validate-env.sh [backend|frontend|ai-service|all]
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Function to print colored output
print_error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
    ((ERRORS++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
    ((WARNINGS++))
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Function to validate backend environment
validate_backend() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 Validating Backend Environment Variables"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd apps/backend

    # Check if .env file exists
    if [ ! -f .env ]; then
        print_error ".env file not found in apps/backend/"
        print_info "Copy .env.example to .env and fill in the values"
        cd ../..
        return 1
    fi

    # Source the .env file
    set -a
    source .env
    set +a

    # Required variables
    REQUIRED_VARS=(
        "NODE_ENV"
        "PORT"
        "DATABASE_URL"
        "JWT_SECRET"
    )

    # Check required variables
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "$var is not set (REQUIRED)"
        else
            print_success "$var is set"
            
            # Additional validation
            case $var in
                JWT_SECRET)
                    if [ ${#JWT_SECRET} -lt 32 ]; then
                        print_error "JWT_SECRET must be at least 32 characters (currently ${#JWT_SECRET})"
                    fi
                    ;;
                DATABASE_URL)
                    if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
                        print_warning "DATABASE_URL should start with 'postgresql://'"
                    fi
                    ;;
                NODE_ENV)
                    if [[ ! "$NODE_ENV" =~ ^(development|production|test)$ ]]; then
                        print_error "NODE_ENV must be 'development', 'production', or 'test'"
                    fi
                    ;;
            esac
        fi
    done

    # Check CORS in production
    if [ "$NODE_ENV" = "production" ]; then
        if [ -z "$CORS_ORIGIN" ] || [ "$CORS_ORIGIN" = "*" ]; then
            print_error "CORS_ORIGIN cannot be '*' or empty in production"
        else
            print_success "CORS_ORIGIN is configured for production"
        fi
    fi

    # Optional but recommended variables
    OPTIONAL_VARS=(
        "REDIS_URL"
        "OPENAI_API_KEY"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
    )

    echo ""
    print_info "Checking optional variables..."
    for var in "${OPTIONAL_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_warning "$var is not set (optional but recommended)"
        else
            print_success "$var is set"
        fi
    done

    cd ../..
}

# Function to validate frontend environment
validate_frontend() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 Validating Frontend Environment Variables"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd apps/frontend

    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning ".env file not found in apps/frontend/"
        print_info "Copy .env.example to .env and fill in the values"
        cd ../..
        return 0  # Frontend .env is optional in some setups
    fi

    # Source the .env file
    set -a
    source .env
    set +a

    # Required variables
    REQUIRED_VARS=(
        "EXPO_PUBLIC_API_URL"
    )

    # Check required variables
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "$var is not set (REQUIRED)"
        else
            print_success "$var is set"
        fi
    done

    # Check optional but recommended
    if [ -z "$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" ]; then
        print_warning "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set (required for Google Sign-In)"
    else
        print_success "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set"
    fi

    cd ../..
}

# Function to validate AI service environment
validate_ai_service() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 Validating AI Service Environment Variables"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd apps/ai-service

    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning ".env file not found in apps/ai-service/"
        print_info "Copy .env.example to .env and fill in the values"
        cd ../..
        return 0
    fi

    # Source the .env file
    set -a
    source .env
    set +a

    # Required variables
    if [ -z "$OPENAI_API_KEY" ]; then
        print_error "OPENAI_API_KEY is not set (REQUIRED for AI chat)"
    else
        print_success "OPENAI_API_KEY is set"
    fi

    cd ../..
}

# Main execution
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║     VisaBuddy Environment Variable Validation                    ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""

    SERVICE=${1:-all}

    case $SERVICE in
        backend)
            validate_backend
            ;;
        frontend)
            validate_frontend
            ;;
        ai-service)
            validate_ai_service
            ;;
        all)
            validate_backend
            validate_frontend
            validate_ai_service
            ;;
        *)
            echo "Usage: $0 [backend|frontend|ai-service|all]"
            exit 1
            ;;
    esac

    # Summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Validation Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        print_success "All checks passed! ✅"
        exit 0
    elif [ $ERRORS -eq 0 ]; then
        print_warning "$WARNINGS warning(s) found (non-critical)"
        exit 0
    else
        print_error "$ERRORS error(s) and $WARNINGS warning(s) found"
        echo ""
        print_info "Fix the errors above before starting the application"
        exit 1
    fi
}

# Run main function
main "$@"








