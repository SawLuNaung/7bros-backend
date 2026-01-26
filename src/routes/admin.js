var express = require('express');
const knex = require("../utils/knex");
const {compare} = require("bcryptjs");
const bcrypt = require("bcryptjs");
const {createHasuraJWT} = require("../utils/helper");
const {authenticateUserToken, authenticateAdminToken, authenticateSuperAdminToken} = require("../utils/userMiddleware");
var router = express.Router();
const {databaseConnectionString} = require("../utils/config");

router.post("/signin",  async (req, res) => {
    console.log("databaseConnectionString", databaseConnectionString);
    
    try {
        const {phone, password} = req.body.input;
        if (phone && password) {
            const existingUser = await knex('admins').where('phone', phone)
            if (existingUser.length === 0) {
                return res.status(400).json({message: "account doesn't exists"})
            } else {
                if (existingUser[0].disabled === true) {
                    return res.status(401).json({message: "account is disabled"});
                } else {
                    const match = await compare(password, existingUser[0].password)
                    if (!match) {
                        return res.status(401).json({message: "invalid password"});
                    } else {
                    // Get admin role from database
                    // Roles: 'admin' (full access) or 'staff' (limited access)
                    const adminRole = existingUser[0].role || 'staff';
                    
                    console.log('=== SIGNIN DEBUG ===');
                    console.log('Phone:', phone);
                    console.log('Database role:', existingUser[0].role);
                    console.log('Admin role:', adminRole);
                    
                    // Map database role to Hasura role
                    // 'admin' DB role → 'super_admin' Hasura role (full access)
                    // 'staff' DB role → 'staff' Hasura role (limited access)
                    // Note: We use 'super_admin' instead of 'admin' because Hasura's built-in
                    // 'admin' role bypasses all permissions and requires admin secret
                    const hasuraRole = adminRole === 'admin' ? 'super_admin' : 'staff';
                    
                    console.log('Hasura role:', hasuraRole);
                    console.log('===================');
                    
                    // Create JWT with both hasura role and admin role
                    const token = createHasuraJWT(existingUser[0].id, hasuraRole, adminRole)
                        return res.status(200).json({token})
                    }
                }
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in admin endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

router.post("/signup", async (req, res) => {
    try {
        const {name, phone, password} = req.body.input;
        if (name && phone && password) {
            const existingUser = await knex('admins').where('phone', phone)
            if (existingUser.length !== 0) {
                return res.status(401).json({message: "account already exists"})
            } else {
                const hashedPassword = await bcrypt.hash(password, 10)
                const createdUser = await knex('admins').insert({
                    name,
                    phone,
                    password: hashedPassword,
                    role: 'staff', // New admins default to 'staff' role (limited access)
                }).returning('id')
                
                // New staff members get 'staff' hasura role (limited access)
                const token = createHasuraJWT(createdUser[0].id, 'staff', 'staff')
                return res.status(201).json({token})
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in admin endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

router.post("/update-password", authenticateAdminToken, async (req, res) => {
    try {
        const {oldPassword, newPassword, confirmNewPassword} = req.body.input;
        const user_id = req.user_id

        if (oldPassword && newPassword && confirmNewPassword) {
            if (newPassword !== confirmNewPassword) {
                return res.status(401).json({message: "confirm password doesn't match"})
            } else {
                const exisingUser = await knex('admins').where('id', user_id)
                const match = await compare(oldPassword, exisingUser[0].password)
                if (!match) {
                    return res.status(401).json({message: "invalid old password"});
                } else {
                    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
                    await knex('admins').update({
                        password: hashedNewPassword,
                    }).where('id', user_id)
                    return res.status(200).json({message: "password updated successfully"})
                }
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in admin endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

router.post("/update-user-password", authenticateSuperAdminToken, async (req, res) => {
    try {
        const {user_id, newPassword, confirmNewPassword} = req.body.input;

        if (user_id && newPassword && confirmNewPassword) {
            if (newPassword !== confirmNewPassword) {
                return res.status(401).json({message: "confirm password doesn't match"})
            } else {
                const hashedNewPassword = await bcrypt.hash(newPassword, 10)
                await knex('customers').update({
                    password: hashedNewPassword,
                }).where('id', user_id)
                return res.status(200).json({message: "password updated successfully"})
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in admin endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

// Helper function to validate driver ID format
function validateDriverId(driverId) {
    // Format: 7B followed by 3 digits (001-999)
    const regex = /^7B\d{3}$/;
    
    if (!regex.test(driverId)) {
        return {
            valid: false,
            message: "Driver ID must be in format 7BXXX (e.g., 7B001, 7B100)"
        };
    }

    // Extract number and validate range (001-199 for Tier 1 & 2)
    const number = parseInt(driverId.substring(2), 10);
    
    if (number < 1 || number > 999) {
        return {
            valid: false,
            message: "Driver ID must be between 7B001 and 7B999"
        };
    }

    return { valid: true };
}

router.post("/create-driver", authenticateAdminToken, async (req, res) => {
    try {
        const {
            driver_id,
            name,
            phone,
            vehicle_number,
            password,
            driving_license_number,
            vehicle_model,
            address_street,
            address_city,
        } = req.body.input;

        // 1. Validate required fields (driver_id is now required)
        if (!driver_id || !name || !phone || !vehicle_number || !password) {
            return res.status(400).json({
                message: "Missing required fields (driver_id, name, phone, vehicle_number, password)",
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }

        // 2. Validate driver_id format
        const driverIdValidation = validateDriverId(driver_id);
        if (!driverIdValidation.valid) {
            return res.status(400).json({
                message: driverIdValidation.message,
                extensions: {
                    code: "INVALID_DRIVER_ID"
                }
            });
        }

        // 3. Check if driver_id already exists
        const existingDriverById = await knex("drivers")
            .where("driver_id", driver_id)
            .first();

        if (existingDriverById) {
            return res.status(400).json({
                message: `Driver ID ${driver_id} is already in use`,
                extensions: {
                    code: "DUPLICATE_DRIVER_ID"
                }
            });
        }

        // 4. Validate password length (exactly 6 characters)
        if (password.length !== 6) {
            return res.status(400).json({
                message: "Password must be exactly 6 characters",
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }

        // 5. Validate phone number (9-11 digits)
        const phoneRegex = /^[0-9]{9,11}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                message: "Phone number must be 9-11 digits",
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }

        // 6. Check if driver with phone already exists
        const existingDriverByPhone = await knex("drivers")
            .where("phone", phone)
            .first();

        if (existingDriverByPhone) {
            return res.status(400).json({
                message: "Driver with this phone number already exists",
                extensions: {
                    code: "DUPLICATE_PHONE"
                }
            });
        }

        // 7. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 8. Determine if driver should be verified
        // Driver is verified ONLY if ALL 4 optional fields are provided:
        // 1. Driving License Number
        // 2. Vehicle Model
        // 3. Address Street
        // 4. Address City
        const hasAllOptionalInfo = driving_license_number && vehicle_model && address_street && address_city;
        const isVerified = hasAllOptionalInfo ? true : false;

        // 9. Combine address fields for storage
        let address = null;
        if (address_street || address_city) {
            const addressParts = [];
            if (address_street) addressParts.push(address_street);
            if (address_city) addressParts.push(address_city);
            address = addressParts.join(", ");
        }

        // 10. Insert driver record (driver_id from user input)
        const [createdDriver] = await knex("drivers")
            .insert({
                driver_id,
                name,
                phone,
                password: hashedPassword,
                password_plain: password, // Store plain text password as per existing pattern
                vehicle_number,
                driving_license_number,
                vehicle_model,
                address,
                balance: 50000,
                disabled: false,
                status: "active",
                verified: isVerified, // Verified only if optional info provided
                is_online: false,
                created_at: new Date(),
                updated_at: new Date(),
            })
            .returning(["id", "driver_id", "name", "phone", "created_at"]);

        // 11. Return success response (HTTP 200 for Hasura actions)
        return res.status(200).json({
            id: createdDriver.id,
            driver_id: createdDriver.driver_id,
            name: createdDriver.name,
            phone: createdDriver.phone,
            message: "Account created successfully",
        });
    } catch (error) {
        console.error("Error creating driver:", error);

        // Handle database constraint violations
        if (error.code === "23505") {
            return res.status(400).json({
                message: "Driver ID or phone number already exists",
                extensions: {
                    code: "DUPLICATE_ERROR"
                }
            });
        }

        return res.status(500).json({
            message: "Internal server error: " + error.message,
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
});


module.exports = router;
