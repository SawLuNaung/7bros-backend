#!/bin/bash

# Quick script to rebuild backend and test if null values are fixed

# Don't exit on error - we want to show helpful messages
set +e

echo "=== Rebuilding Backend Container ==="
cd "$(dirname "$0")"

echo "1. Stopping backend..."
docker-compose stop backend

echo "2. Rebuilding backend (this may take a minute)..."
docker-compose build backend

echo "3. Starting backend..."
docker-compose up -d backend

echo "4. Waiting for backend to start (15 seconds)..."
sleep 15

echo "5. Checking if backend is running..."
if docker ps | grep -q backend; then
  echo "✅ Backend is running"
else
  echo "❌ Backend failed to start. Check logs: docker logs backend"
  exit 1
fi

echo ""
echo "6. Checking backend logs (last 10 lines)..."
docker logs --tail 10 backend

echo ""
echo "=== Testing Backend Directly ==="
echo "7. Checking for existing drivers..."

# Try to find an existing driver from database
EXISTING_DRIVER=$(docker exec -i postgres psql -U postgres -d postgres -t -c "SELECT phone FROM drivers WHERE disabled = false LIMIT 1;" 2>/dev/null | xargs)

# Use the provided test driver credentials
DRIVER_PHONE="0912345678"
DRIVER_PASSWORD="test12"

if [ -z "$EXISTING_DRIVER" ] || [ "$EXISTING_DRIVER" = "" ]; then
  echo "⚠️  No drivers found in database query."
  echo "   Using provided test driver: $DRIVER_PHONE"
else
  echo "✅ Found existing driver: $EXISTING_DRIVER"
  echo "   Using provided test driver: $DRIVER_PHONE"
fi

echo ""
echo "8. Signing in as driver (phone: $DRIVER_PHONE)..."

TOKEN=$(curl -s -X POST http://localhost:8001/driver/signin \
  -H "Content-Type: application/json" \
  -d "{\"input\": {\"phone\": \"$DRIVER_PHONE\", \"password\": \"$DRIVER_PASSWORD\"}}" \
  | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ] || [ "$TOKEN" = "" ]; then
  echo "❌ Failed to get driver token."
  echo ""
  echo "   Possible reasons:"
  echo "   1. Driver doesn't exist with phone: $DRIVER_PHONE"
  echo "   2. Password is incorrect (tried: $DRIVER_PASSWORD)"
  echo "   3. Driver account is disabled"
  echo ""
  echo "   To check existing drivers, run:"
  echo "   docker exec -it postgres psql -U postgres -d postgres -c \"SELECT phone, name, disabled FROM drivers LIMIT 5;\""
  echo ""
  echo "   To create a driver manually:"
  echo "   curl -X POST http://localhost:8001/driver/signup \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"input\": {\"name\": \"Test Driver\", \"phone\": \"0978787878\", \"password\": \"123456\"}}'"
  echo ""
  echo "   ⚠️  Skipping trip test. Backend is running, but you need a valid driver to test."
  exit 0
fi

echo "✅ Got driver token"

echo ""
echo "9. Starting trip..."
TRIP_START=$(curl -s -X POST http://localhost:8001/trip/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": {"start_lat": 16.8661, "start_lng": 96.1951}}')

echo "$TRIP_START" | jq '.'

echo ""
echo "10. Ending trip..."
TRIP_END=$(curl -s -X POST http://localhost:8001/trip/end \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
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

echo "$TRIP_END" | jq '.'

TOTAL_AMOUNT=$(echo "$TRIP_END" | jq -r '.total_amount')

echo ""
if [ "$TOTAL_AMOUNT" != "null" ] && [ -n "$TOTAL_AMOUNT" ] && [ "$TOTAL_AMOUNT" != "0" ]; then
  echo "✅ SUCCESS! total_amount = $TOTAL_AMOUNT"
  echo ""
  echo "The backend is working correctly."
  echo "If Hasura still shows null, check:"
  echo "  1. Hasura metadata is reloaded"
  echo "  2. EndTripResponse type has all fields"
  echo "  3. Test Hasura mutation with driver token"
else
  echo "❌ FAILED! total_amount is still null or 0"
  echo ""
  echo "Check backend logs:"
  echo "  docker logs -f backend"
  echo ""
  echo "Look for:"
  echo "  - '=== END TRIP DEBUG ==='"
  echo "  - 'Calculated fees: {...}'"
  echo "  - 'Response data: {...}'"
fi
