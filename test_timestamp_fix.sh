#!/bin/bash
# Test Timestamp Preservation Fix

BASE_URL="http://localhost:8001"
DRIVER_PHONE="0912345678"
DRIVER_PASSWORD="test12"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Testing Timestamp Preservation Fix ==="
echo ""

# Step 1: Sign in
echo "1. Signing in as driver..."
SIGNIN_RESPONSE=$(curl -s -X POST "$BASE_URL/driver/signin" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {
      \"phone\": \"$DRIVER_PHONE\",
      \"password\": \"$DRIVER_PASSWORD\",
      \"fcm_token\": \"test_token\"
    }
  }")

TOKEN=$(echo $SIGNIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Signed in${NC}"
echo ""

# Step 2: Start trip
echo "2. Starting trip..."
START_RESPONSE=$(curl -s -X POST "$BASE_URL/trip/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "input": {
      "start_lat": 16.8661,
      "start_lng": 96.1951
    }
  }')

TRIP_ID=$(echo $START_RESPONSE | grep -o '"trip_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$TRIP_ID" ]; then
  echo -e "${RED}❌ Failed to start trip${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Trip started: $TRIP_ID${NC}"
echo -e "${YELLOW}   Check backend logs for: 'Returned started_at from DB:'${NC}"
echo "Waiting 2 seconds before ending..."
sleep 2
echo ""

# Step 3: End trip
echo "3. Ending trip..."
END_RESPONSE=$(curl -s -X POST "$BASE_URL/trip/end" \
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

if echo "$END_RESPONSE" | grep -q "trip ended"; then
  echo -e "${GREEN}✅ Trip ended successfully${NC}"
else
  echo -e "${RED}❌ Failed to end trip${NC}"
  echo "Response: $END_RESPONSE"
  exit 1
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo -e "${YELLOW}📋 Verification Steps:${NC}"
echo "1. Check backend logs for these messages:"
echo "   - 'Ending trip - started_at before update:'"
echo "   - 'Ending trip - setting ended_at to:'"
echo "   - 'Trip updated - started_at after update:'"
echo "   - 'Trip updated - ended_at after update:'"
echo ""
echo "2. Verify in database (if using Docker):"
echo "   docker exec -i postgres psql -U postgres -d postgres -c \"SELECT started_at, ended_at FROM trips WHERE id = '$TRIP_ID';\""
echo ""
echo -e "${GREEN}✅ Both started_at and ended_at should NOT be NULL${NC}"
