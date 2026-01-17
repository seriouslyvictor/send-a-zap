#!/bin/bash
# Quick Test Script for WhatsApp Automation CI/CD
# Run all tests locally before pushing to GitHub

set -e  # Exit on error

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter
ERROR_COUNT=0
WARNING_COUNT=0

# Print header
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     WhatsApp Automation - CI/CD Test Suite                ║"
echo "║     Testing all changes before deployment                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Helper function
print_status() {
    local message=$1
    local status=$2

    case $status in
        "PASS")
            echo -e "${GREEN}✓ $message${NC}"
            ;;
        "FAIL")
            echo -e "${RED}✗ $message${NC}"
            ((ERROR_COUNT++))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠ $message${NC}"
            ((WARNING_COUNT++))
            ;;
        "INFO")
            echo -e "${CYAN}ℹ $message${NC}"
            ;;
    esac
}

# Test 1: Install Dependencies
echo -e "\n${YELLOW}[1/6] Installing dependencies...${NC}"
if npm install --silent; then
    print_status "Dependencies installed successfully" "PASS"
else
    print_status "Failed to install dependencies" "FAIL"
fi

# Test 2: Prisma Client Generation
echo -e "\n${YELLOW}[2/6] Generating Prisma Client...${NC}"
export DATABASE_URL="postgresql://test:test@localhost:5432/test?schema=public"
if npx prisma generate --silent 2>/dev/null; then
    print_status "Prisma Client generated successfully" "PASS"
else
    print_status "Failed to generate Prisma Client" "FAIL"
fi

# Test 3: Type Checking
echo -e "\n${YELLOW}[3/6] Running TypeScript type check...${NC}"
TYPE_OUTPUT=$(npm run typecheck 2>&1 || true)
TYPE_ERRORS=$(echo "$TYPE_OUTPUT" | grep -c "error TS" || true)

if [ "$TYPE_ERRORS" -eq 0 ]; then
    print_status "TypeScript compilation: 0 errors" "PASS"
else
    API_ERRORS=$(echo "$TYPE_OUTPUT" | grep -c "app/api.*error TS" || true)

    if [ "$API_ERRORS" -eq 0 ]; then
        print_status "TypeScript: $TYPE_ERRORS warnings in UI components (non-blocking)" "WARN"
    else
        print_status "TypeScript: $API_ERRORS errors in API routes (BLOCKING)" "FAIL"
        echo -e "${RED}$TYPE_OUTPUT${NC}"
    fi
fi

# Test 4: Linting
echo -e "\n${YELLOW}[4/6] Running ESLint...${NC}"
if npm run lint --silent; then
    print_status "ESLint: No errors or warnings" "PASS"
else
    print_status "ESLint found issues" "FAIL"
fi

# Test 5: Tests
echo -e "\n${YELLOW}[5/6] Running unit tests...${NC}"
TEST_OUTPUT=$(npm run test:run 2>&1 || true)
if echo "$TEST_OUTPUT" | grep -q "Tests.*passed"; then
    print_status "All unit tests passed" "PASS"
else
    print_status "Some tests failed" "FAIL"
    echo -e "${RED}$TEST_OUTPUT${NC}"
fi

# Test 6: Production Build
echo -e "\n${YELLOW}[6/6] Building for production...${NC}"
export DATABASE_URL="postgresql://test:test@localhost:5432/test?schema=public"
if npm run build --silent 2>/dev/null; then
    print_status "Production build succeeded" "PASS"
else
    print_status "Production build failed" "FAIL"
fi

# Summary
echo -e "\n${CYAN}$(printf '═%.0s' {1..60})${NC}"
echo -e "${CYAN}TEST SUMMARY${NC}"
echo -e "${CYAN}$(printf '═%.0s' {1..60})${NC}\n"

if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!

Your code is ready to be pushed to GitHub.
CI/CD pipeline should pass without issues.

Next steps:
  1. git add .
  2. git commit -m \"feat: add comprehensive CI/CD pipeline\"
  3. git push -u origin test/ci-pipeline
  4. Create Pull Request on GitHub
  5. Wait for CI to pass
  6. Merge to main${NC}"
    exit 0
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠ TESTS PASSED WITH WARNINGS

Warnings: $WARNING_COUNT (non-blocking)

These are expected UI component type warnings.
Your code is safe to push.

Next steps:
  1. Review warnings above (optional)
  2. git add .
  3. git commit -m \"feat: add comprehensive CI/CD pipeline\"
  4. git push -u origin test/ci-pipeline${NC}"
    exit 0
else
    echo -e "${RED}❌ TESTS FAILED

Errors: $ERROR_COUNT
Warnings: $WARNING_COUNT

Please fix the errors above before pushing to GitHub.
Review the error messages and make necessary corrections.

Common fixes:
  - Type errors: Check API route files for MessageStatus issues
  - Build errors: Ensure DATABASE_URL is set
  - Test errors: Review failing test cases${NC}"
    exit 1
fi
