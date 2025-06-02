#!/bin/bash

# Test Runner Script for Vocabulary App
# This script runs the complete test suite and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command_exists node; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    npm install --silent
    
    # Install client dependencies
    cd client
    npm install --silent
    cd ..
    
    print_success "Dependencies installed"
}

# Run backend tests
run_backend_tests() {
    print_status "Running backend tests..."
    
    if npm test; then
        print_success "Backend tests passed"
        return 0
    else
        print_error "Backend tests failed"
        return 1
    fi
}

# Run frontend tests
run_frontend_tests() {
    print_status "Running frontend tests..."
    
    cd client
    if npm test; then
        print_success "Frontend tests passed"
        cd ..
        return 0
    else
        print_error "Frontend tests failed"
        cd ..
        return 1
    fi
}

# Generate coverage reports
generate_coverage() {
    print_status "Generating coverage reports..."
    
    # Backend coverage
    print_status "Generating backend coverage..."
    npm run test:coverage --silent
    
    # Frontend coverage
    print_status "Generating frontend coverage..."
    cd client
    npm run test:coverage --silent
    cd ..
    
    print_success "Coverage reports generated"
    print_status "Backend coverage: ./coverage/index.html"
    print_status "Frontend coverage: ./client/coverage/index.html"
}

# Run linting
run_linting() {
    print_status "Running linting..."
    
    cd client
    if npm run lint; then
        print_success "Linting passed"
        cd ..
        return 0
    else
        print_warning "Linting issues found"
        cd ..
        return 1
    fi
}

# Main function
main() {
    local backend_failed=0
    local frontend_failed=0
    local linting_failed=0
    
    echo "============================================"
    echo "        Vocabulary App Test Suite          "
    echo "============================================"
    echo
    
    # Check prerequisites
    check_prerequisites
    echo
    
    # Install dependencies if requested
    if [[ "$1" == "--install" ]] || [[ "$2" == "--install" ]]; then
        install_dependencies
        echo
    fi
    
    # Run linting if not skipped
    if [[ "$1" != "--skip-lint" ]] && [[ "$2" != "--skip-lint" ]]; then
        run_linting || linting_failed=1
        echo
    fi
    
    # Run backend tests
    run_backend_tests || backend_failed=1
    echo
    
    # Run frontend tests
    run_frontend_tests || frontend_failed=1
    echo
    
    # Generate coverage if requested
    if [[ "$1" == "--coverage" ]] || [[ "$2" == "--coverage" ]]; then
        generate_coverage
        echo
    fi
    
    # Summary
    echo "============================================"
    echo "                SUMMARY                     "
    echo "============================================"
    
    if [[ $linting_failed -eq 1 ]]; then
        print_warning "Linting: FAILED"
    else
        print_success "Linting: PASSED"
    fi
    
    if [[ $backend_failed -eq 1 ]]; then
        print_error "Backend Tests: FAILED"
    else
        print_success "Backend Tests: PASSED"
    fi
    
    if [[ $frontend_failed -eq 1 ]]; then
        print_error "Frontend Tests: FAILED"
    else
        print_success "Frontend Tests: PASSED"
    fi
    
    echo
    
    # Exit with error if any tests failed
    if [[ $backend_failed -eq 1 ]] || [[ $frontend_failed -eq 1 ]]; then
        print_error "Some tests failed!"
        exit 1
    else
        print_success "All tests passed!"
        exit 0
    fi
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --install      Install dependencies before running tests"
    echo "  --coverage     Generate coverage reports after tests"
    echo "  --skip-lint    Skip linting step"
    echo "  --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Run all tests"
    echo "  $0 --coverage              # Run tests and generate coverage"
    echo "  $0 --install --coverage    # Install deps, run tests, generate coverage"
    echo "  $0 --skip-lint             # Run tests without linting"
}

# Handle command line arguments
case "$1" in
    --help)
        show_usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
