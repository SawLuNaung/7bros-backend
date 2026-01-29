#!/bin/bash

# Test script for backend EndTrip endpoint using curl
# This tests the complete flow: sign in -> start trip -> end trip

set -e

# Configuration
BACKEND_URL="http://localhost:8001"
DRIVER_PHONE="0912345678"
DRIVER_PASSWORD="test12"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Backend EndTrip Test Script ==="
echo ""

# Step 1: Check if backend is running
echo "1. Checking if backend is running on port 8001..."
if curl -s -f "$BACKEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running on $BACKEND_URL${NC}"
    echo "   Please start the backend: npm start (or docker-compose up -d backend)"
    exit 1
fi

# Step 2: Sign in as driver
echo ""
echo "2. Signing in as driver (phone: $DRIVER_PHONE)..."
SIGNIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/driver/signin" \
    -H "Content-Type: application/json" \
    -d "{
        \"input\": {
            \"phone\": \"$DRIVER_PHONE\",
            \"password\": \"$DRIVER_PASSWORD\",
            \"fcm_token\": \"test_token\"
        }
    }")

echo "Response: $SIGNIN_RESPONSE"

# Extract token
DRIVER_TOKEN=$(echo $SIGNIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$DRIVER_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get driver token${NC}"
    echo "   Response: $SIGNIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Got driver token${NC}"
echo "   Token: ${DRIVER_TOKEN:0:50}..."

# Step 3: Start a trip
echo ""
echo "3. Starting a trip..."
START_TRIP_RESPONSE=$(curl -s -X POST "$BACKEND_URL/trip/start" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -d "{
        \"input\": {
            \"start_lat\": 16.8661,
            \"start_lng\": 96.1951
        }
    }")

echo "Response: $START_TRIP_RESPONSE"

# Extract trip_id
TRIP_ID=$(echo $START_TRIP_RESPONSE | grep -o '"trip_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$TRIP_ID" ]; then
    echo -e "${YELLOW}⚠️  No trip_id in response. Checking if trip already exists...${NC}"
    # Trip might already exist, continue anyway
else
    echo -e "${GREEN}✅ Trip started${NC}"
    echo "   Trip ID: $TRIP_ID"
fi

# Step 4: End the trip
echo ""
echo "4. Ending the trip..."
END_TRIP_RESPONSE=$(curl -s -X POST "$BACKEND_URL/trip/end" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -d "{
        \"input\": {
            \"end_lat\": 16.8661,
            \"end_lng\": 96.1951,
            \"extra_list\": \"[]\",
            \"location_points\": \"[]\",
            \"extra_fee\": 0,
            \"duration\": 1800,
            \"waiting_time\": 300,
            \"distance\": 5.5,
            \"gps_gaps\": 0,
            \"gps_gap_details\": \"[]\"
        }
    }")

echo "Response: $END_TRIP_RESPONSE"

# Step 5: Verify response
echo ""
echo "5. Verifying response fields..."

# Check for total_amount
if echo "$END_TRIP_RESPONSE" | grep -q '"total_amount"'; then
    TOTAL_AMOUNT=$(echo $END_TRIP_RESPONSE | grep -o '"total_amount":[0-9.]*' | cut -d':' -f2)
    if [ -z "$TOTAL_AMOUNT" ] || [ "$TOTAL_AMOUNT" = "null" ]; then
        echo -e "${RED}❌ total_amount is null or missing${NC}"
    else
        echo -e "${GREEN}✅ total_amount: $TOTAL_AMOUNT${NC}"
    fi
else
    echo -e "${RED}❌ total_amount field not found in response${NC}"
fi

# Check for all required fields
REQUIRED_FIELDS=("total_amount" "driver_received_amount" "commission_fee" "waiting_fee" "distance_fee" "extra_fee" "initial_fee" "platform_fee" "insurance_fee")

echo ""
echo "Checking all required fields:"
ALL_FIELDS_OK=true
for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$END_TRIP_RESPONSE" | grep -q "\"$field\""; then
        VALUE=$(echo $END_TRIP_RESPONSE | grep -o "\"$field\":[^,}]*" | cut -d':' -f2 | tr -d ' ')
        if [ "$VALUE" = "null" ] || [ -z "$VALUE" ]; then
            echo -e "${RED}  ❌ $field: null${NC}"
            ALL_FIELDS_OK=false
        else
            echo -e "${GREEN}  ✅ $field: $VALUE${NC}"
        fi
    else
        echo -e "${RED}  ❌ $field: missing${NC}"
        ALL_FIELDS_OK=false
    fi
done

# Final result
echo ""
if [ "$ALL_FIELDS_OK" = true ]; then
    echo -e "${GREEN}=== ✅ ALL TESTS PASSED ===${NC}"
    echo ""
    echo "The backend is working correctly!"
    echo "All fee fields are returned with non-null values."
    exit 0
else
    echo -e "${RED}=== ❌ SOME TESTS FAILED ===${NC}"
    echo ""
    echo "Some fields are missing or null. Check the response above."
    exit 1
fi
