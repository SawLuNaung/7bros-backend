const jwt = require("jsonwebtoken");
const {jwtSecretKey, jwtExpTime, graphqlApi} = require("./config");
const config = require("./config");
const axios = require("axios");
const stateManager = require("./stateManager");
const fireBaseAdmin = require("firebase-admin");

const createHasuraJWT = (userId, hasuraRole, adminRole = null) => {
    const claims = {
        "https://hasura.io/jwt/claims": {
            "x-hasura-default-role": hasuraRole,
            "x-hasura-allowed-roles": [hasuraRole],
            "x-hasura-user-id": userId,
        },
        user_id: userId,
        role: hasuraRole
    };
    
    // Add admin_role to JWT if provided (for admin users only)
    if (adminRole) {
        claims.admin_role = adminRole;
        claims["https://hasura.io/jwt/claims"]["x-hasura-admin-role"] = adminRole;
    }
    
    console.log('=== JWT CREATION ===');
    console.log('Creating JWT with:', JSON.stringify(claims, null, 2));
    console.log('===================');
    
    return jwt.sign(claims, jwtSecretKey, {expiresIn: jwtExpTime});
}


function generateDriverId(driverId) {
    // Convert the string ID to an integer
    let numericId = parseInt(driverId, 10);

    // Increment the numeric ID by one
    numericId += 1;

    // Convert the numeric ID back to a string with leading zeros
    return numericId.toString().padStart(driverId.length, '0');
}


const fetchGraphqlApi = async (query, variables) => {
    try {
        // Hasura admin secret - moved to environment variable for security
        const hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET;
        
        if (!hasuraAdminSecret) {
            console.error("ERROR: HASURA_ADMIN_SECRET environment variable is not set!");
            throw new Error("Hasura admin secret not configured");
        }
        
        const response = await fetch(graphqlApi, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "x-hasura-admin-secret": hasuraAdminSecret
            },
            body: JSON.stringify({
                query,
                variables
            }),
        })
        return await response.json()
    } catch (e) {
        console.log(e)
    }
}


const reverseGeocode = async (latitude, longitude) => {
    const res = await axios(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${config.GMapApiKey}`);
    return res.data
};

function generateTripId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

function getDecimalPlaces(number, decimalPlaces) {
    const factor = Math.pow(10, decimalPlaces);
    return Math.floor(number * factor) / factor;
}

function calculateCommissionFee(totalAmount, commissionData) {
    const {commission_rate_type, commission_rate} = commissionData;

    let commissionFee;

    if (commission_rate_type === "fixed") {
        // The commission fee is the fixed rate
        commissionFee = commission_rate;
    } else if (commission_rate_type === "percentage") {
        // Calculate the commission as a percentage of the total amount
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
        // Subtract the fixed commission rate from the total amount
        receivedAmount = totalAmount - commission_rate;
    } else if (commission_rate_type === "percentage") {
        // Calculate the commission as a percentage of the total amount
        const commissionAmount = (totalAmount * commission_rate) / 100;
        // Subtract the commission amount from the total amount
        receivedAmount = totalAmount - commissionAmount;
    } else {
        throw new Error("Invalid commission rate type. Must be 'fixed' or 'percentage'.");
    }

    return receivedAmount;
}

function generateTransactionNumber(length = 20) {
    if (length > 20) length = 20; // Ensure the length does not exceed 20
    let transactionNumber = "";
    const digits = "0123456789";
    for (let i = 0; i < length; i++) {
        transactionNumber += digits[Math.floor(Math.random() * digits.length)];
    }
    return transactionNumber;
}


const findNearestDriver = (start_lat, start_lng) => {
    const toRad = (value) => value * Math.PI / 180;

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const radius = 3; // 3 km radius
    let nearestDriver = null;
    let minDistance = Infinity;

    // Check if there are no drivers in stateManager
    if (Object.keys(stateManager.drivers).length === 0) return null;

    // Convert drivers object to an array and iterate over it
    Object.values(stateManager.drivers).forEach(item => {
        const {is_online, status} = item.driver;
        const {latitude: driverLat, longitude: driverLon} = item.gps;

        // Check if driver is online and available
        if (is_online === true && status === 'active' && driverLat != null && driverLon != null) {
            const distance = calculateDistance(start_lat, start_lng, driverLat, driverLon);

            if (distance <= radius && distance < minDistance) {
                minDistance = distance;
                nearestDriver = item;
            }
        }
    });

    return nearestDriver;
};


const sendNoti = async (title, body, type, fcm_token) => {
    try {
        const messaging = fireBaseAdmin.messaging();

        return await messaging.send({
            notification: {
                title,
                body,
            },
            android: {
                notification: {
                    channelId: type,
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: `${type}.wav`
                    }
                }
            },
            token: fcm_token
        })
    } catch (e) {
        throw new Error(e)
    }
}


const calculateDistanceFee = (distance, feeConfigs) => {
    const baseFeePerKm = Number(feeConfigs.distance_fee_per_km);
    const extraFeePerKm = baseFeePerKm + 100;

    if (Number(distance) <= 25) {
        return Number(distance) * baseFeePerKm;
    } else {
        const baseDistance = 25;
        const extraDistance = Number(distance) - baseDistance;
        return (baseDistance * baseFeePerKm) + (extraDistance * extraFeePerKm);
    }
};

module.exports = {
    createHasuraJWT,
    fetchGraphqlApi,
    calculateCommissionFee,
    generateTripId,
    generateTransactionNumber,
    sendNoti,
    calculateDistanceFee,
    generateDriverId,
    findNearestDriver,
    calculateDriverReceivedAmount,
    getDecimalPlaces,
    reverseGeocode
}
