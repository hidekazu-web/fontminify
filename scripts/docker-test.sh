#!/bin/bash

# FontMinify Docker Test Runner
# Safe testing environment using Docker containers

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[FontMinify Docker]${NC} $1"
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

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Create test directories
setup_test_dirs() {
    print_status "Setting up test directories..."
    mkdir -p tests/fixtures/fonts test-output
    print_success "Test directories created"
}

# Build Docker image
build_image() {
    print_status "Building FontMinify Docker image..."
    docker-compose -f docker/docker-compose.yml build fontminify-dev
    print_success "Docker image built successfully"
}

# Run unit tests
run_unit_tests() {
    print_status "Running unit tests in Docker container..."
    docker-compose -f docker/docker-compose.yml run --rm fontminify-test
    local status=$?
    if [ $status -eq 0 ]; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed with exit code $status"
        return $status
    fi
}

# Run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests in Docker container..."
    docker-compose -f docker/docker-compose.yml run --rm fontminify-e2e
    local status=$?
    if [ $status -eq 0 ]; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed with exit code $status"
        return $status
    fi
}

# Start development environment
start_dev() {
    print_status "Starting development environment..."
    print_warning "GUI applications will run in headless mode"
    print_warning "Use VNC viewer on localhost:5900 to see the GUI (no password)"
    docker-compose -f docker/docker-compose.yml up fontminify-dev
}

# Clean up Docker resources
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker-compose -f docker/docker-compose.yml down --volumes --remove-orphans
    print_success "Cleanup completed"
}

# Show usage information
show_usage() {
    echo "FontMinify Docker Test Runner"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build     Build the Docker image"
    echo "  test      Run unit tests"
    echo "  e2e       Run E2E tests"
    echo "  all       Run all tests"
    echo "  dev       Start development environment"
    echo "  clean     Clean up Docker resources"
    echo "  shell     Open interactive shell in container"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build         # Build Docker image"
    echo "  $0 test          # Run unit tests"
    echo "  $0 all           # Run all tests"
    echo "  $0 dev           # Start development environment"
}

# Open interactive shell
open_shell() {
    print_status "Opening interactive shell in Docker container..."
    docker-compose -f docker/docker-compose.yml run --rm fontminify-dev /bin/bash
}

# Main execution
main() {
    case "${1:-help}" in
        "build")
            check_docker
            setup_test_dirs
            build_image
            ;;
        "test")
            check_docker
            setup_test_dirs
            run_unit_tests
            ;;
        "e2e")
            check_docker
            setup_test_dirs
            run_e2e_tests
            ;;
        "all")
            check_docker
            setup_test_dirs
            build_image
            run_unit_tests
            run_e2e_tests
            print_success "All tests completed successfully!"
            ;;
        "dev")
            check_docker
            setup_test_dirs
            start_dev
            ;;
        "shell")
            check_docker
            setup_test_dirs
            open_shell
            ;;
        "clean")
            check_docker
            cleanup
            ;;
        "help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"