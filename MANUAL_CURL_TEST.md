# Manual curl Test Guide

## Prerequisites

1. **Start the backend:**
   ```bash
   cd /Users/SawLuNaung/Downloads/eaxi-master/eaxi-backend-master
   
   # Option 1: Run locally
   npm start
   # Should see: "Server is up at 8001"
   
   # Option 2: Run with Docker
   docker-compose up -d backend
   ```

2. **Verify backend is running:**
   ```bash
   curl http://localhost:8001
   # Should return something (even if it's an error, it means backend is running)
   ```

---

## Test Steps

### Step 1: Sign in as Driver

```bash
curl -X POST http://localhost:8001/driver/signin \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "phone": "0912345678",
      "password": "test12",
      "fcm_token": "test_token"
    }
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "disabled": false
}
```

**Save the token** for next steps:
```bash
# Save token to variable (replace YOUR_TOKEN with actual token)
export DRIVER_TOKEN="YOUR_TOKEN"
```

---

### Step 2: Start a Trip

```bash
curl -X POST http://localhost:8001/trip/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{
    "input": {
      "start_lat": 16.8661,
      "start_lng": 96.1951
    }
  }'
```

**Expected Response:**
```json
{
  "message": "trip started",
  "trip_id": "uuid-here"
}
```

**Note:** If you get an error saying "You already have an active trip", skip to Step 3.

---

### Step 3: End the Trip (Main Test)

```bash
curl -X POST http://localhost:8001/trip/end \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
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
  }' | jq '.'
```

**Expected Response:**
```json
{
  "message": "trip ended",
  "trip_id": "uuid-here",
  "total_amount": 5500,
  "driver_received_amount": 4500,
  "commission_fee": 500,
  "waiting_fee": 1000,
  "distance_fee": 3000,
  "extra_fee": 0,
  "initial_fee": 1000,
  "platform_fee": 500,
  "insurance_fee": 500
}
```

**✅ Verify:**
- All fields are present
- All values are **numbers** (not null, not strings)
- `total_amount` is the main field showing customer's payment

---

## Using the Automated Script

For easier testing, use the automated script:

```bash
cd /Users/SawLuNaung/Downloads/eaxi-master/eaxi-backend-master
./test_backend_curl.sh
```

This script will:
1. Check if backend is running
2. Sign in as driver
3. Start a trip
4. End the trip
5. Verify all fields are present and non-null

---

## Troubleshooting

### Backend not running
```bash
# Check if port 8001 is in use
lsof -i:8001

# Start backend
npm start
# OR
docker-compose up -d backend
```

### "You already have an active trip"
This means a trip was started but not ended. You can:
1. End the existing trip (Step 3)
2. Or wait for it to timeout

### "You have no active trip"
This means you need to start a trip first (Step 2).

### Token expired
Get a new token by running Step 1 again.

---

## Expected Values

Based on the test data:
- `distance`: 5.5 km
- `waiting_time`: 300 seconds (5 minutes)
- `duration`: 1800 seconds (30 minutes)
- `extra_fee`: 0

The calculated fees will depend on your `fee_configs` table, but you should see:
- `total_amount` > 0 (customer's total payment)
- `driver_received_amount` > 0 (driver's earnings)
- `commission_fee` >= 0
- `waiting_fee` >= 0
- `distance_fee` > 0
- All other fees >= 0

---

## Success Criteria

✅ **Test passes if:**
- All 9 fee fields are present in response
- All values are numbers (not null, not strings)
- `total_amount` is calculated correctly
- Response status is 201

❌ **Test fails if:**
- Any field is missing
- Any field is null
- Any field is a string instead of number
- Response status is not 201
