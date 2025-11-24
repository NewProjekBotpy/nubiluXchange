#!/bin/bash

###############################################################################
# k6 Test Runner Script
# Runs k6 performance and load tests
#
# Usage:
#   ./scripts/run-k6-tests.sh [test-type] [options]
#
# Test types:
#   all       - Run all k6 tests
#   api       - API load tests
#   ws        - WebSocket stress tests
#   payment   - Payment flow tests
#   auth      - Authentication flow tests
#   spike     - Spike tests
#
# Options:
#   --vus NUM         - Number of virtual users (default: from test config)
#   --duration TIME   - Test duration (e.g., 30s, 1m, 5m)
#   --url URL         - Base URL (default: http://localhost:5000)
#   --ci              - Run in CI mode (stricter thresholds)
#   --report          - Generate HTML report
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="${1:-all}"
BASE_URL="${BASE_URL:-http://localhost:5000}"
WS_URL="${WS_URL:-ws://localhost:5000}"
K6_OUTPUT_DIR="test-results/k6"
REPORT_DIR="playwright-report/k6"

# Parse additional arguments
shift || true
while [[ $# -gt 0 ]]; do
  case $1 in
    --vus)
      K6_VUS="$2"
      shift 2
      ;;
    --duration)
      K6_DURATION="$2"
      shift 2
      ;;
    --url)
      BASE_URL="$2"
      shift 2
      ;;
    --ci)
      CI_MODE=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Create output directories
mkdir -p "$K6_OUTPUT_DIR"
mkdir -p "$REPORT_DIR"

# Print configuration
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     k6 Performance Test Runner              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Test Type: ${GREEN}$TEST_TYPE${NC}"
echo -e "  Base URL:  ${GREEN}$BASE_URL${NC}"
echo -e "  WS URL:    ${GREEN}$WS_URL${NC}"
echo -e "  Output:    ${GREEN}$K6_OUTPUT_DIR${NC}"
[[ -n "$K6_VUS" ]] && echo -e "  VUs:       ${GREEN}$K6_VUS${NC}"
[[ -n "$K6_DURATION" ]] && echo -e "  Duration:  ${GREEN}$K6_DURATION${NC}"
[[ "$CI_MODE" == "true" ]] && echo -e "  Mode:      ${GREEN}CI${NC}"
echo ""

# Function to run a k6 test
run_k6_test() {
  local test_name=$1
  local test_file=$2
  local output_file="${K6_OUTPUT_DIR}/${test_name}-$(date +%Y%m%d-%H%M%S).json"
  
  echo -e "${BLUE}Running: ${test_name}${NC}"
  
  # Build k6 command
  local k6_cmd="k6 run"
  
  # Add VUs if specified
  [[ -n "$K6_VUS" ]] && k6_cmd="$k6_cmd --vus $K6_VUS"
  
  # Add duration if specified
  [[ -n "$K6_DURATION" ]] && k6_cmd="$k6_cmd --duration $K6_DURATION"
  
  # Add environment variables
  k6_cmd="$k6_cmd -e BASE_URL=$BASE_URL -e WS_URL=$WS_URL"
  
  # Add output format
  k6_cmd="$k6_cmd --out json=$output_file"
  
  # Add summary export
  k6_cmd="$k6_cmd --summary-export=${K6_OUTPUT_DIR}/${test_name}-summary.json"
  
  # Run the test
  if $k6_cmd "$test_file"; then
    echo -e "${GREEN}✓ ${test_name} passed${NC}"
    return 0
  else
    echo -e "${RED}✗ ${test_name} failed${NC}"
    return 1
  fi
}

# Track results
PASSED=0
FAILED=0

# Run tests based on type
case $TEST_TYPE in
  all)
    echo -e "${YELLOW}Running all k6 tests...${NC}\n"
    
    run_k6_test "api-load" "tests/performance/k6/api-load-test.js" && ((PASSED++)) || ((FAILED++))
    echo ""
    
    run_k6_test "auth-flow" "tests/performance/k6/auth-flow-test.js" && ((PASSED++)) || ((FAILED++))
    echo ""
    
    run_k6_test "payment-flow" "tests/performance/k6/payment-flow-test.js" && ((PASSED++)) || ((FAILED++))
    echo ""
    
    run_k6_test "spike" "tests/performance/k6/spike-test.js" && ((PASSED++)) || ((FAILED++))
    echo ""
    
    # WebSocket test (may fail if WS not available)
    run_k6_test "websocket-stress" "tests/performance/k6/websocket-stress-test.js" && ((PASSED++)) || ((FAILED++))
    ;;
    
  api)
    run_k6_test "api-load" "tests/performance/k6/api-load-test.js" && ((PASSED++)) || ((FAILED++))
    ;;
    
  ws|websocket)
    run_k6_test "websocket-stress" "tests/performance/k6/websocket-stress-test.js" && ((PASSED++)) || ((FAILED++))
    ;;
    
  payment)
    run_k6_test "payment-flow" "tests/performance/k6/payment-flow-test.js" && ((PASSED++)) || ((FAILED++))
    ;;
    
  auth)
    run_k6_test "auth-flow" "tests/performance/k6/auth-flow-test.js" && ((PASSED++)) || ((FAILED++))
    ;;
    
  spike)
    run_k6_test "spike" "tests/performance/k6/spike-test.js" && ((PASSED++)) || ((FAILED++))
    ;;
    
  *)
    echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
    echo "Available types: all, api, ws, payment, auth, spike"
    exit 1
    ;;
esac

# Generate HTML report if requested
if [[ "$GENERATE_REPORT" == "true" ]]; then
  echo -e "\n${BLUE}Generating HTML report...${NC}"
  
  # Create a simple HTML report
  cat > "${REPORT_DIR}/index.html" <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>k6 Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #3b82f6; color: white; }
  </style>
</head>
<body>
  <h1>k6 Performance Test Results</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p>Tests Passed: <span class="pass">$PASSED</span></p>
    <p>Tests Failed: <span class="fail">$FAILED</span></p>
    <p>Test Date: $(date)</p>
    <p>Base URL: $BASE_URL</p>
  </div>
  <h2>Test Results</h2>
  <p>Detailed results are available in JSON format in the <code>$K6_OUTPUT_DIR</code> directory.</p>
</body>
</html>
EOF
  
  echo -e "${GREEN}Report generated: ${REPORT_DIR}/index.html${NC}"
fi

# Print summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Test Summary                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo ""

# Exit with appropriate code
if [[ $FAILED -gt 0 ]]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
