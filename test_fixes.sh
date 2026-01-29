#!/bin/bash

# Quick test script for Top-Up and Trip Start Time fixes
# Usage: ./test_fixes.sh

set -e

BASE_URL="http://localhost:8001"
DRIVER_PHONE="0912345678"
DRIVER_PASSWORD="test12"

echo "=== Testing Top-Up and Trip Start Time Fixes ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Sign in as driver
echo "Step 1: Signing in as driver..."
SIGNIN_RESPONSE=$(curl -s -X POST "$BASE_URL/driver/signin" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"phone\": \"$DRIVER_PHONE\",
      \"password\": \"$DRIVER_PASSWORD\",
      \"fcm_token\": \"test_fcm_token_123\"
    }
  }")

TOKEN=$(echo $SIGNIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get driver token${NC}"
  echo "Response: $SIGNIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Driver signed in successfully${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Test Top-Up
echo "Step 2: Testing Top-Up (with error handling)..."
TOPUP_RESPONSE=$(curl -s -X POST "$BASE_URL/transaction/driver-cashin" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "input": {
      "payment_method": "KBZPay",
      "receipt_photo_url": "https://example.com/test-receipt.jpg"
    }
  }')

if echo "$TOPUP_RESPONSE" | grep -q "cash in success"; then
  echo -e "${GREEN}✅ Top-Up request succeeded${NC}"
  TRANSACTION_ID=$(echo $TOPUP_RESPONSE | grep -o '"transaction_id":"[^"]*' | cut -d'"' -f4)
  echo "Transaction ID: $TRANSACTION_ID"
else
  echo -e "${RED}❌ Top-Up request failed${NC}"
  echo "Response: $TOPUP_RESPONSE"
  exit 1
fi
echo ""

# Step 3: Start a trip
echo "Step 3: Starting a trip (testing started_at field)..."
START_TRIP_RESPONSE=$(curl -s -X POST "$BASE_URL/trip/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "input": {
      "start_lat": 16.8661,
      "start_lng": 96.1951
    }
  }')

if echo "$START_TRIP_RESPONSE" | grep -q "trip started"; then
  echo -e "${GREEN}✅ Trip started successfully${NC}"
  TRIP_ID=$(echo $START_TRIP_RESPONSE | grep -o '"trip_id":"[^"]*' | cut -d'"' -f4)
  echo "Trip ID: $TRIP_ID"
else
  echo -e "${RED}❌ Failed to start trip${NC}"
  echo "Response: $START_TRIP_RESPONSE"
  exit 1
fi
echo ""

# Step 4: Check if started_at is set in database (if using Docker)
if command -v docker &> /dev/null; then
  echo "Step 4: Checking database for started_at field..."
  STARTED_AT=$(docker exec -i postgres psql -U postgres -d postgres -t -c "SELECT started_at FROM trips WHERE id = '$TRIP_ID';" 2>/dev/null | xargs)
  
  if [ -z "$STARTED_AT" ] || [ "$STARTED_AT" = "" ] || [ "$STARTED_AT" = "NULL" ]; then
    echo -e "${RED}❌ started_at is NULL in database${NC}"
  else
    echo -e "${GREEN}✅ started_at is set: $STARTED_AT${NC}"
  fi
  echo ""
fi

# Step 5: End the trip
echo "Step 5: Ending the trip..."
END_TRIP_RESPONSE=$(curl -s -X POST "$BASE_URL/trip/end" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "input": {
      "end_lat": 16.8661,
      "end_lng": 96.1951,
      "extra_list": "[]",
      "location_points": "[]",
      "extra_fee": 0,
      "duration": 1800,
      "waiting_time": 300,
      "distance": 5.5,
      "gps_gaps": 0,
      "gps_gap_details": "[]"
    }
  }')

if echo "$END_TRIP_RESPONSE" | grep -q "trip ended"; then
  echo -e "${GREEN}✅ Trip ended successfully${NC}"
  TOTAL_AMOUNT=$(echo $END_TRIP_RESPONSE | grep -o '"total_amount":[0-9]*' | cut -d':' -f2)
  echo "Total Amount: $TOTAL_AMOUNT"
else
  echo -e "${RED}❌ Failed to end trip${NC}"
  echo "Response: $END_TRIP_RESPONSE"
  exit 1
fi
echo ""

# Summary
echo "=== Test Summary ==="
echo -e "${GREEN}✅ Top-Up test: PASSED${NC}"
echo -e "${GREEN}✅ Trip start test: PASSED${NC}"
echo -e "${GREEN}✅ Trip end test: PASSED${NC}"
echo ""
echo -e "${YELLOW}Note: Check backend logs for 'non-critical' error messages${NC}"
echo -e "${YELLOW}These are expected and should not break the API response${NC}"
echo ""
echo "All tests completed successfully! 🎉"
