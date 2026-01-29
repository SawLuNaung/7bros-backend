/**
 * Input Validation Utilities
 * Provides reusable validation functions for API endpoints
 */

/**
 * Validate latitude coordinate
 * @param {any} lat - Latitude value to validate
 * @returns {Object} {valid: boolean, message?: string, value?: number}
 */
function validateLatitude(lat) {
    if (lat === null || lat === undefined || lat === '') {
        return {
            valid: false,
            message: "Latitude is required"
        };
    }

    const numLat = Number(lat);
    
    if (isNaN(numLat)) {
        return {
            valid: false,
            message: "Latitude must be a valid number"
        };
    }

    if (numLat < -90 || numLat > 90) {
        return {
            valid: false,
            message: "Latitude must be between -90 and 90"
        };
    }

    return {
        valid: true,
        value: numLat
    };
}

/**
 * Validate longitude coordinate
 * @param {any} lng - Longitude value to validate
 * @returns {Object} {valid: boolean, message?: string, value?: number}
 */
function validateLongitude(lng) {
    if (lng === null || lng === undefined || lng === '') {
        return {
            valid: false,
            message: "Longitude is required"
        };
    }

    const numLng = Number(lng);
    
    if (isNaN(numLng)) {
        return {
            valid: false,
            message: "Longitude must be a valid number"
        };
    }

    if (numLng < -180 || numLng > 180) {
        return {
            valid: false,
            message: "Longitude must be between -180 and 180"
        };
    }

    return {
        valid: true,
        value: numLng
    };
}

/**
 * Validate coordinates (latitude and longitude)
 * @param {any} lat - Latitude value
 * @param {any} lng - Longitude value
 * @returns {Object} {valid: boolean, message?: string, lat?: number, lng?: number}
 */
function validateCoordinates(lat, lng) {
    const latValidation = validateLatitude(lat);
    if (!latValidation.valid) {
        return latValidation;
    }

    const lngValidation = validateLongitude(lng);
    if (!lngValidation.valid) {
        return lngValidation;
    }

    return {
        valid: true,
        lat: latValidation.value,
        lng: lngValidation.value
    };
}

/**
 * Validate amount (money value)
 * @param {any} amount - Amount to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum amount (default: 0)
 * @param {number} options.max - Maximum amount (default: 10000000)
 * @param {boolean} options.allowZero - Allow zero amount (default: false)
 * @returns {Object} {valid: boolean, message?: string, value?: number}
 */
function validateAmount(amount, options = {}) {
    const {
        min = 0,
        max = 10000000,
        allowZero = false
    } = options;

    if (amount === null || amount === undefined || amount === '') {
        return {
            valid: false,
            message: "Amount is required"
        };
    }

    const numAmount = Number(amount);
    
    if (isNaN(numAmount)) {
        return {
            valid: false,
            message: "Amount must be a valid number"
        };
    }

    if (!allowZero && numAmount === 0) {
        return {
            valid: false,
            message: "Amount must be greater than zero"
        };
    }

    if (numAmount < min) {
        return {
            valid: false,
            message: `Amount must be at least ${min}`
        };
    }

    if (numAmount > max) {
        return {
            valid: false,
            message: `Amount cannot exceed ${max}`
        };
    }

    return {
        valid: true,
        value: numAmount
    };
}

/**
 * Validate phone number
 * @param {any} phone - Phone number to validate
 * @returns {Object} {valid: boolean, message?: string, value?: string}
 */
function validatePhoneNumber(phone) {
    if (!phone || phone === null || phone === undefined || phone === '') {
        return {
            valid: false,
            message: "Phone number is required"
        };
    }

    const phoneStr = String(phone).trim();
    
    // Myanmar phone numbers: 9-11 digits
    const phoneRegex = /^[0-9]{9,11}$/;
    
    if (!phoneRegex.test(phoneStr)) {
        return {
            valid: false,
            message: "Phone number must be 9-11 digits"
        };
    }

    return {
        valid: true,
        value: phoneStr
    };
}

/**
 * Validate distance (in kilometers)
 * @param {any} distance - Distance to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum distance (default: 0)
 * @param {number} options.max - Maximum distance (default: 1000)
 * @returns {Object} {valid: boolean, message?: string, value?: number}
 */
function validateDistance(distance, options = {}) {
    const {
        min = 0,
        max = 1000
    } = options;

    if (distance === null || distance === undefined || distance === '') {
        return {
            valid: false,
            message: "Distance is required"
        };
    }

    const numDistance = Number(distance);
    
    if (isNaN(numDistance)) {
        return {
            valid: false,
            message: "Distance must be a valid number"
        };
    }

    if (numDistance < min) {
        return {
            valid: false,
            message: `Distance must be at least ${min} km`
        };
    }

    if (numDistance > max) {
        return {
            valid: false,
            message: `Distance cannot exceed ${max} km`
        };
    }

    return {
        valid: true,
        value: numDistance
    };
}

/**
 * Validate duration (in seconds)
 * @param {any} duration - Duration to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum duration (default: 0)
 * @param {number} options.max - Maximum duration (default: 86400 = 24 hours)
 * @returns {Object} {valid: boolean, message?: string, value?: number}
 */
function validateDuration(duration, options = {}) {
    const {
        min = 0,
        max = 86400 // 24 hours in seconds
    } = options;

    if (duration === null || duration === undefined || duration === '') {
        return {
            valid: false,
            message: "Duration is required"
        };
    }

    const numDuration = Number(duration);
    
    if (isNaN(numDuration)) {
        return {
            valid: false,
            message: "Duration must be a valid number"
        };
    }

    if (numDuration < min) {
        return {
            valid: false,
            message: `Duration must be at least ${min} seconds`
        };
    }

    if (numDuration > max) {
        return {
            valid: false,
            message: `Duration cannot exceed ${max} seconds (24 hours)`
        };
    }

    return {
        valid: true,
        value: numDuration
    };
}

/**
 * Validate required field
 * @param {any} value - Value to check
 * @param {string} fieldName - Name of the field (for error message)
 * @returns {Object} {valid: boolean, message?: string}
 */
function validateRequired(value, fieldName) {
    if (value === null || value === undefined || value === '') {
        return {
            valid: false,
            message: `${fieldName} is required`
        };
    }

    return {
        valid: true
    };
}

/**
 * Validate numeric field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field (for error message)
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @returns {Object} {valid: boolean, message?: string, value?: number}
 */
function validateNumeric(value, fieldName, options = {}) {
    const {
        min,
        max,
        allowZero = true
    } = options;

    if (value === null || value === undefined || value === '') {
        return {
            valid: false,
            message: `${fieldName} is required`
        };
    }

    const numValue = Number(value);
    
    if (isNaN(numValue)) {
        return {
            valid: false,
            message: `${fieldName} must be a valid number`
        };
    }

    if (!allowZero && numValue === 0) {
        return {
            valid: false,
            message: `${fieldName} must not be zero`
        };
    }

    if (min !== undefined && numValue < min) {
        return {
            valid: false,
            message: `${fieldName} must be at least ${min}`
        };
    }

    if (max !== undefined && numValue > max) {
        return {
            valid: false,
            message: `${fieldName} cannot exceed ${max}`
        };
    }

    return {
        valid: true,
        value: numValue
    };
}

module.exports = {
    validateLatitude,
    validateLongitude,
    validateCoordinates,
    validateAmount,
    validatePhoneNumber,
    validateDistance,
    validateDuration,
    validateRequired,
    validateNumeric
};
