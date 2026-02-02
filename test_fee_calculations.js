/**
 * Test script to verify fee calculations for distance-based trips
 * 
 * This script tests:
 * 1. Distance fee calculation (meters to km conversion)
 * 2. Total amount (customer_total) calculation
 * 3. Driver received amount calculation
 * 4. Commission calculation
 * 
 * Run with: node test_fee_calculations.js
 */

// Mock fee configuration (from database)
const feeConfigs = {
    distance_fee_per_km: 1000,      // 1000 kyats per km
    initial_fee: 3000,               // 3000 kyats initial fee
    insurance_fee: 0,                // 0 kyats (can be changed from dashboard)
    platform_fee: 0,                 // 0 kyats (can be changed from dashboard)
    waiting_fee_per_minute: 200,     // 200 kyats per minute
    free_waiting_minute: 10,         // First 10 minutes free
    commission_rate: 100,             // 100 kyats fixed commission
    commission_rate_type: "fixed"    // "fixed" or "percentage"
};

// Helper functions (copied from helper.js)
function getDecimalPlaces(number, decimalPlaces) {
    const factor = Math.pow(10, decimalPlaces);
    return Math.floor(number * factor) / factor;
}

function calculateDistanceFee(distance, feeConfigs) {
    const baseFeePerKm = Number(feeConfigs.distance_fee_per_km);
    const extraFeePerKm = baseFeePerKm + 100;

    if (Number(distance) <= 25) {
        return Number(distance) * baseFeePerKm;
    } else {
        const baseDistance = 25;
        const extraDistance = Number(distance) - baseDistance;
        return (baseDistance * baseFeePerKm) + (extraDistance * extraFeePerKm);
    }
}

function calculateCommissionFee(totalAmount, commissionData) {
    const {commission_rate_type, commission_rate} = commissionData;

    let commissionFee;

    if (commission_rate_type === "fixed") {
        commissionFee = commission_rate;
    } else if (commission_rate_type === "percentage") {
        commissionFee = (totalAmount * commission_rate) / 100;
    } else {
        throw new Error("Invalid commission rate type. Must be 'fixed' or 'percentage'.");
    }

    return commissionFee;
}

function calculateDriverReceivedAmount(totalAmount, config) {
    const {commission_rate_type, commission_rate} = config;

    let receivedAmount;

    if (commission_rate_type === "fixed") {
        receivedAmount = totalAmount - commission_rate;
    } else if (commission_rate_type === "percentage") {
        const commissionAmount = (totalAmount * commission_rate) / 100;
        receivedAmount = totalAmount - commissionAmount;
    } else {
        throw new Error("Invalid commission rate type. Must be 'fixed' or 'percentage'.");
    }

    return receivedAmount;
}

// Test cases
const testCases = [
    {
        name: "1 km trip (1000 meters)",
        distance: 1000,        // meters
        waiting_time: 0,       // seconds
        extra_fee: 0,          // kyats
        expected_distance_fee: 1000,  // 1 km * 1000 kyats/km
        expected_customer_total: 4000, // 3000 (initial) + 1000 (distance)
        expected_driver_received: 3900  // 4000 - 100 (commission)
    },
    {
        name: "5 km trip (5000 meters)",
        distance: 5000,
        waiting_time: 0,
        extra_fee: 0,
        expected_distance_fee: 5000,  // 5 km * 1000 kyats/km
        expected_customer_total: 8000, // 3000 (initial) + 5000 (distance)
        expected_driver_received: 7900 // 8000 - 100 (commission)
    },
    {
        name: "10 km trip (10000 meters)",
        distance: 10000,
        waiting_time: 0,
        extra_fee: 0,
        expected_distance_fee: 10000, // 10 km * 1000 kyats/km
        expected_customer_total: 13000, // 3000 (initial) + 10000 (distance)
        expected_driver_received: 12900 // 13000 - 100 (commission)
    },
    {
        name: "25 km trip (25000 meters) - max base rate",
        distance: 25000,
        waiting_time: 0,
        extra_fee: 0,
        expected_distance_fee: 25000, // 25 km * 1000 kyats/km
        expected_customer_total: 28000, // 3000 (initial) + 25000 (distance)
        expected_driver_received: 27900 // 28000 - 100 (commission)
    },
    {
        name: "30 km trip (30000 meters) - with extra rate",
        distance: 30000,
        waiting_time: 0,
        extra_fee: 0,
        expected_distance_fee: 30500, // (25 * 1000) + (5 * 1100) = 25000 + 5500
        expected_customer_total: 33500, // 3000 (initial) + 30500 (distance)
        expected_driver_received: 33400 // 33500 - 100 (commission)
    },
    {
        name: "1 km trip with 5 minutes waiting (300 seconds)",
        distance: 1000,
        waiting_time: 300,     // 5 minutes = 300 seconds (within free 10 minutes)
        extra_fee: 0,
        expected_distance_fee: 1000,
        expected_customer_total: 4000, // No waiting fee (within free period)
        expected_driver_received: 3900
    },
    {
        name: "1 km trip with 15 minutes waiting (900 seconds)",
        distance: 1000,
        waiting_time: 900,     // 15 minutes = 900 seconds (5 minutes chargeable after free 10)
        extra_fee: 0,
        expected_distance_fee: 1000,
        expected_waiting_fee: 1000, // (15 - 10) * 200 = 5 * 200 = 1000
        expected_customer_total: 5000, // 3000 + 1000 + 1000
        expected_driver_received: 4900 // 5000 - 100
    },
    {
        name: "1 km trip with 500 kyats extra fee",
        distance: 1000,
        waiting_time: 0,
        extra_fee: 500,
        expected_distance_fee: 1000,
        expected_customer_total: 4500, // 3000 + 1000 + 500
        expected_driver_received: 4400 // 4500 - 100
    }
];

// Run tests
console.log("=".repeat(80));
console.log("FEE CALCULATION TEST SUITE");
console.log("=".repeat(80));
console.log("\nFee Configuration:");
console.log(`  Distance Fee Per KM: ${feeConfigs.distance_fee_per_km} kyats`);
console.log(`  Initial Fee: ${feeConfigs.initial_fee} kyats`);
console.log(`  Insurance Fee: ${feeConfigs.insurance_fee} kyats`);
console.log(`  Platform Fee: ${feeConfigs.platform_fee} kyats`);
console.log(`  Waiting Fee Per Minute: ${feeConfigs.waiting_fee_per_minute} kyats`);
console.log(`  Free Waiting Minutes: ${feeConfigs.free_waiting_minute} minutes`);
console.log(`  Commission: ${feeConfigs.commission_rate} kyats (${feeConfigs.commission_rate_type})`);
console.log("\n" + "=".repeat(80) + "\n");

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log("-".repeat(80));
    
    // Convert distance from meters to kilometers
    const distanceInKm = testCase.distance / 1000;
    console.log(`  Input Distance: ${testCase.distance} meters = ${distanceInKm} km`);
    
    // Calculate distance fee
    const distanceFee = calculateDistanceFee(distanceInKm, feeConfigs);
    console.log(`  Distance Fee: ${distanceFee} kyats`);
    
    // Calculate waiting fee
    const waiting_fee = (Math.max(0, (Math.floor(testCase.waiting_time / 60)) - feeConfigs.free_waiting_minute)) * feeConfigs.waiting_fee_per_minute;
    console.log(`  Waiting Time: ${testCase.waiting_time} seconds (${Math.floor(testCase.waiting_time / 60)} minutes)`);
    console.log(`  Waiting Fee: ${waiting_fee} kyats`);
    
    // Calculate driver total (before commission)
    const driver_total = getDecimalPlaces(distanceFee + waiting_fee + testCase.extra_fee + Number(feeConfigs.initial_fee), 0);
    console.log(`  Driver Total (before commission): ${driver_total} kyats`);
    
    // Calculate customer total
    const customer_total = Number(feeConfigs.initial_fee) + distanceFee + waiting_fee + testCase.extra_fee + Number(feeConfigs.insurance_fee) + Number(feeConfigs.platform_fee);
    console.log(`  Customer Total: ${customer_total} kyats`);
    
    // Calculate commission
    const commission_fee = getDecimalPlaces(calculateCommissionFee(driver_total, feeConfigs), 0);
    console.log(`  Commission Fee: ${commission_fee} kyats`);
    
    // Calculate driver received amount
    const driver_received_amount = getDecimalPlaces(calculateDriverReceivedAmount(driver_total, feeConfigs), 0);
    console.log(`  Driver Received Amount: ${driver_received_amount} kyats`);
    
    // Verify results
    let testPassed = true;
    const errors = [];
    
    if (testCase.expected_distance_fee !== undefined && distanceFee !== testCase.expected_distance_fee) {
        errors.push(`  ❌ Distance Fee: Expected ${testCase.expected_distance_fee}, Got ${distanceFee}`);
        testPassed = false;
    }
    
    if (testCase.expected_waiting_fee !== undefined && waiting_fee !== testCase.expected_waiting_fee) {
        errors.push(`  ❌ Waiting Fee: Expected ${testCase.expected_waiting_fee}, Got ${waiting_fee}`);
        testPassed = false;
    }
    
    if (testCase.expected_customer_total !== undefined && customer_total !== testCase.expected_customer_total) {
        errors.push(`  ❌ Customer Total: Expected ${testCase.expected_customer_total}, Got ${customer_total}`);
        testPassed = false;
    }
    
    if (testCase.expected_driver_received !== undefined && driver_received_amount !== testCase.expected_driver_received) {
        errors.push(`  ❌ Driver Received: Expected ${testCase.expected_driver_received}, Got ${driver_received_amount}`);
        testPassed = false;
    }
    
    if (testPassed) {
        console.log(`  ✅ PASSED`);
        passedTests++;
    } else {
        console.log(`  ❌ FAILED`);
        errors.forEach(err => console.log(err));
        failedTests++;
    }
    
    console.log();
});

// Summary
console.log("=".repeat(80));
console.log("TEST SUMMARY");
console.log("=".repeat(80));
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
console.log("=".repeat(80));

if (failedTests === 0) {
    console.log("\n🎉 All tests passed! Fee calculations are working correctly.");
    process.exit(0);
} else {
    console.log("\n⚠️  Some tests failed. Please review the calculations.");
    process.exit(1);
}
