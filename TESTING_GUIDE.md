# Fee Calculation Testing Guide

This guide explains how to test if the total amount and driver's received amount are calculated correctly by distance (km).

## Method 1: Automated Test Script (Recommended)

Run the automated test script that tests multiple scenarios:

```bash
cd eaxi-backend-master
node test_fee_calculations.js
```

This script will:
- Test various distance scenarios (1km, 5km, 10km, 25km, 30km)
- Test with waiting time
- Test with extra fees
- Verify distance fee calculation (meters to km conversion)
- Verify customer total amount
- Verify driver received amount
- Verify commission calculation

### Expected Output

The script will show:
- ✅ PASSED for each correct calculation
- ❌ FAILED with details if any calculation is wrong
- Summary of all tests

## Method 2: Manual API Testing

### Prerequisites

1. **Get Database Fee Configuration**
   - Check current `distance_fee_per_km` value (should be 1000)
   - Check `initial_fee`, `insurance_fee`, `platform_fee`
   - Check `commission_rate` and `commission_rate_type`

2. **Get Driver Token**
   - Login as a driver to get authentication token

### Test Steps

#### Step 1: Start a Trip

```bash
curl -X POST http://localhost:8001/trip/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -d '{
    "input": {
      "start_lat": 16.8661,
      "start_lng": 96.1951
    }
  }'
```

Save the `trip_id` from the response.

#### Step 2: End the Trip with Test Distance

Test with **1 km (1000 meters)**:

```bash
curl -X POST http://localhost:8001/trip/end \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -d '{
    "input": {
      "end_lat": 16.8661,
      "end_lng": 96.1951,
      "distance": 1000,
      "duration": 300,
      "waiting_time": 0,
      "extra_fee": 0,
      "extra_list": [],
      "location_points": [],
      "gps_gaps": 0,
      "gps_gap_details": []
    }
  }'
```

### Expected Results for 1 km Trip

**Given:**
- Distance: 1000 meters = 1 km
- `distance_fee_per_km`: 1000 kyats
- `initial_fee`: 3000 kyats (example)
- `insurance_fee`: 0 kyats
- `platform_fee`: 0 kyats
- `commission_rate`: 100 kyats (fixed)

**Expected Calculations:**

1. **Distance Conversion:**
   ```
   distanceInKm = 1000 / 1000 = 1.0 km
   ```

2. **Distance Fee:**
   ```
   distanceFee = 1.0 * 1000 = 1000 kyats
   ```

3. **Driver Total (before commission):**
   ```
   driver_total = 1000 + 0 + 0 + 3000 = 4000 kyats
   ```

4. **Customer Total:**
   ```
   customer_total = 3000 + 1000 + 0 + 0 + 0 + 0 = 4000 kyats
   ```

5. **Commission:**
   ```
   commission_fee = 100 kyats (fixed)
   ```

6. **Driver Received:**
   ```
   driver_received_amount = 4000 - 100 = 3900 kyats
   ```

### Test Cases to Verify

#### Test Case 1: 1 km Trip
- **Input:** `distance: 1000` (meters)
- **Expected:** `distance_fee: 1000`, `total_amount: 4000` (if initial_fee = 3000)

#### Test Case 2: 5 km Trip
- **Input:** `distance: 5000` (meters)
- **Expected:** `distance_fee: 5000`, `total_amount: 8000` (if initial_fee = 3000)

#### Test Case 3: 10 km Trip
- **Input:** `distance: 10000` (meters)
- **Expected:** `distance_fee: 10000`, `total_amount: 13000` (if initial_fee = 3000)

#### Test Case 4: 30 km Trip (with extra rate)
- **Input:** `distance: 30000` (meters)
- **Expected:** 
  - `distance_fee: 30500` (25km * 1000 + 5km * 1100)
  - `total_amount: 33500` (if initial_fee = 3000)

#### Test Case 5: 1 km with Waiting Time
- **Input:** `distance: 1000`, `waiting_time: 900` (15 minutes)
- **Expected:** 
  - `waiting_fee: 1000` ((15-10) * 200)
  - `total_amount: 5000` (3000 + 1000 + 1000)

### Response Format

The API will return:

```json
{
  "message": "trip ended",
  "trip_id": "...",
  "total_amount": 4000,
  "driver_received_amount": 3900,
  "commission_fee": 100,
  "waiting_fee": 0,
  "distance_fee": 1000,
  "extra_fee": 0,
  "initial_fee": 3000,
  "platform_fee": 0,
  "insurance_fee": 0
}
```

### Verification Checklist

- [ ] `distance_fee` = `distance_in_meters / 1000 * distance_fee_per_km`
- [ ] `total_amount` = `initial_fee + distance_fee + waiting_fee + extra_fee + insurance_fee + platform_fee`
- [ ] `driver_received_amount` = `driver_total - commission_fee`
- [ ] For distances > 25km, extra rate (1100 kyats/km) is applied correctly

## Method 3: Database Verification

Check the stored trip data:

```sql
SELECT 
    distance_km,
    distance_fee,
    total_amount,
    driver_received_amount,
    commission_fee,
    initial_fee,
    distance_fee_per_km
FROM trips
WHERE id = 'YOUR_TRIP_ID';
```

Verify:
- `distance_km` is in kilometers (should be meters/1000)
- `distance_fee` matches calculation
- `total_amount` matches customer_total calculation
- `driver_received_amount` matches calculation

## Troubleshooting

### If distance_fee is wrong:
- Check if distance is being converted from meters to km
- Verify `distance_fee_per_km` in database is 1000
- Check calculation logic in `calculateDistanceFee()`

### If total_amount is wrong:
- Verify all fees are included: initial_fee + distance_fee + waiting_fee + extra_fee + insurance_fee + platform_fee
- Check if insurance_fee and platform_fee are being added correctly

### If driver_received_amount is wrong:
- Verify commission calculation (fixed vs percentage)
- Check if commission is subtracted from driver_total correctly

## Quick Test Formula

For a simple 1 km trip:
```
distance_fee = 1 km × 1000 kyats/km = 1000 kyats
total_amount = initial_fee + 1000
driver_received = total_amount - commission
```

If `initial_fee = 3000` and `commission = 100`:
- `total_amount = 4000 kyats`
- `driver_received = 3900 kyats`
