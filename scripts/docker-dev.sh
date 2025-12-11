#!/bin/bash

# FontMinify Docker Development Environment
# Simplified commands for Docker-based development

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[FontMinify Dev]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Quick development commands
case "${1:-help}" in
    "start")
        print_info "Starting development environment..."
        docker-compose up -d fontminify-dev
        print_success "Development container started"
        print_info "Container: fontminify-dev"
        print_info "VNC: localhost:5900 (for GUI access)"
        ;;
    "stop")
        print_info "Stopping development environment..."
        docker-compose down
        print_success "Development container stopped"
        ;;
    "restart")
        print_info "Restarting development environment..."
        docker-compose restart fontminify-dev
        print_success "Development container restarted"
        ;;
    "logs")
        print_info "Showing container logs..."
        docker-compose logs -f fontminify-dev
        ;;
    "shell"|"bash")
        print_info "Opening shell in development container..."
        docker-compose exec fontminify-dev /bin/bash
        ;;
    "install")
        print_info "Installing dependencies in container..."
        docker-compose exec fontminify-dev npm install
        print_success "Dependencies installed"
        ;;
    "build-app")
        print_info "Building application in container..."
        docker-compose exec fontminify-dev npm run build
        print_success "Application built"
        ;;
    "test-unit")
        print_info "Running unit tests in container..."
        docker-compose exec fontminify-dev npm test
        ;;
    "test-e2e")
        print_info "Running E2E tests in container..."
        docker-compose exec fontminify-dev npm run test:e2e
        ;;
    "lint")
        print_info "Running linter in container..."
        docker-compose exec fontminify-dev npm run lint
        ;;
    "typecheck")
        print_info "Running type check in container..."
        docker-compose exec fontminify-dev npm run typecheck
        ;;
    "clean")
        print_info "Cleaning up development environment..."
        docker-compose down --volumes --remove-orphans
        docker system prune -f
        print_success "Environment cleaned"
        ;;
    "rebuild")
        print_info "Rebuilding development environment..."
        docker-compose down --volumes
        docker-compose build --no-cache fontminify-dev
        docker-compose up -d fontminify-dev
        print_success "Environment rebuilt"
        ;;
    "status")
        print_info "Checking container status..."
        docker-compose ps
        ;;
    "help")
        echo "FontMinify Docker Development Commands"
        echo ""
        echo "Usage: $0 [COMMAND]"
        echo ""
        echo "Container Management:"
        echo "  start       Start development container"
        echo "  stop        Stop development container"
        echo "  restart     Restart development container"
        echo "  status      Show container status"
        echo "  logs        Show container logs"
        echo "  shell       Open shell in container"
        echo ""
        echo "Development:"
        echo "  install     Install dependencies"
        echo "  build-app   Build the application"
        echo "  lint        Run linter"
        echo "  typecheck   Run type checker"
        echo ""
        echo "Testing:"
        echo "  test-unit   Run unit tests"
        echo "  test-e2e    Run E2E tests"
        echo ""
        echo "Maintenance:"
        echo "  clean       Clean up environment"
        echo "  rebuild     Rebuild from scratch"
        echo "  help        Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 start            # Start development container"
        echo "  $0 shell            # Open shell in container"
        echo "  $0 test-unit        # Run unit tests"
        echo "  $0 clean            # Clean up everything"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac