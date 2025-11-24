#!/bin/bash

###############################################################################
# Comprehensive Test Runner
# Runs all tests: unit, integration, E2E, performance, and k6
#
# Usage:
#   ./scripts/run-all-tests.sh [--ci] [--coverage] [--skip-e2e] [--skip-k6]
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
CI_MODE=false
COVERAGE=false
SKIP_E2E=false
SKIP_K6=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --ci)
      CI_MODE=true
      shift
      ;;
    --coverage)
      COVERAGE=true
      shift
      ;;
    --skip-e2e)
      SKIP_E2E=true
      shift
      ;;
    --skip-k6)
      SKIP_K6=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Comprehensive Testing Suite Runner        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Track results
TOTAL_PASSED=0
TOTAL_FAILED=0

# 1. Unit Tests
echo -e "${YELLOW}[1/6] Running Unit Tests...${NC}"
if npm run test:unit; then
  echo -e "${GREEN}✓ Unit tests passed${NC}\n"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗ Unit tests failed${NC}\n"
  ((TOTAL_FAILED++))
fi

# 2. Integration Tests
echo -e "${YELLOW}[2/6] Running Integration Tests...${NC}"
if npm run test:integration; then
  echo -e "${GREEN}✓ Integration tests passed${NC}\n"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗ Integration tests failed${NC}\n"
  ((TOTAL_FAILED++))
fi

# 3. E2E Tests (optional)
if [[ "$SKIP_E2E" == "false" ]]; then
  echo -e "${YELLOW}[3/6] Running E2E Tests...${NC}"
  if npm run test:e2e; then
    echo -e "${GREEN}✓ E2E tests passed${NC}\n"
    ((TOTAL_PASSED++))
  else
    echo -e "${RED}✗ E2E tests failed${NC}\n"
    ((TOTAL_FAILED++))
  fi
else
  echo -e "${YELLOW}[3/6] Skipping E2E Tests${NC}\n"
fi

# 4. Performance Tests (Vitest)
echo -e "${YELLOW}[4/6] Running Performance Tests (Vitest)...${NC}"
if npm run test:performance; then
  echo -e "${GREEN}✓ Performance tests passed${NC}\n"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗ Performance tests failed${NC}\n"
  ((TOTAL_FAILED++))
fi

# 5. k6 Load Tests (optional)
if [[ "$SKIP_K6" == "false" ]]; then
  echo -e "${YELLOW}[5/6] Running k6 Load Tests...${NC}"
  if bash scripts/run-k6-tests.sh api --duration 30s; then
    echo -e "${GREEN}✓ k6 tests passed${NC}\n"
    ((TOTAL_PASSED++))
  else
    echo -e "${RED}✗ k6 tests failed${NC}\n"
    ((TOTAL_FAILED++))
  fi
else
  echo -e "${YELLOW}[5/6] Skipping k6 Tests${NC}\n"
fi

# 6. Coverage (optional)
if [[ "$COVERAGE" == "true" ]]; then
  echo -e "${YELLOW}[6/6] Generating Coverage Report...${NC}"
  if npm run test:coverage; then
    echo -e "${GREEN}✓ Coverage report generated${NC}\n"
    
    # Check coverage threshold
    if command -v jq &> /dev/null && [ -f coverage/coverage-summary.json ]; then
      COVERAGE_PCT=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)
      echo -e "Total Coverage: ${GREEN}${COVERAGE_PCT}%${NC}"
      
      if (( $(echo "$COVERAGE_PCT < 80" | bc -l) )); then
        echo -e "${RED}Warning: Coverage below 80% threshold${NC}"
      fi
    fi
  else
    echo -e "${RED}✗ Coverage generation failed${NC}\n"
  fi
else
  echo -e "${YELLOW}[6/6] Skipping Coverage Report${NC}\n"
fi

# Print final summary
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Final Test Summary                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo -e "  ${GREEN}Test Suites Passed: $TOTAL_PASSED${NC}"
echo -e "  ${RED}Test Suites Failed: $TOTAL_FAILED${NC}"
echo ""

# Generate test results file for CI
if [[ "$CI_MODE" == "true" ]]; then
  cat > test-results/summary.txt <<EOF
Test Suite Summary
==================
Passed: $TOTAL_PASSED
Failed: $TOTAL_FAILED
Date: $(date)
EOF
fi

# Exit with appropriate code
if [[ $TOTAL_FAILED -gt 0 ]]; then
  echo -e "${RED}Some test suites failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All test suites passed!${NC}"
  exit 0
fi
