var express = require('express');
const knex = require("../utils/knex");
const {compare} = require("bcryptjs");
const bcrypt = require("bcryptjs");
const {createHasuraJWT} = require("../utils/helper");
const {authenticateUserToken} = require("../utils/userMiddleware");
const {validatePhoneNumber} = require("../utils/validators");
const rateLimit = require('express-rate-limit');
var router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        message: "Too many authentication attempts, please try again later",
        extensions: {
            code: "RATE_LIMIT_EXCEEDED"
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/signin", authLimiter, async (req, res) => {
    try {
        const {phone, password, fcm_token} = req.body.input;
        
        // Validate phone number
        const phoneValidation = validatePhoneNumber(phone);
        if (!phoneValidation.valid) {
            return res.status(400).json({
                message: phoneValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        if (phoneValidation.value && password) {
            const existingUser = await knex('customers').where('phone', phoneValidation.value)
            if (existingUser.length === 0) {
                return res.status(400).json({message: "user doesn't exists"})
            } else {
                if (existingUser[0].disabled === true) {
                    return res.status(401).json({message: "account is disabled"});
                } else {
                    const match = await compare(password, existingUser[0].password)
                    if (!match) {
                        return res.status(401).json({message: "invalid password"});
                    } else {
                        fcm_token && await knex('customers').update({
                            fcm_token
                        }).where('id', existingUser[0].id)
                        const token = createHasuraJWT(existingUser[0].id, 'customer')
                        return res.status(200).json({token})
                    }
                }
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in customer endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

router.post("/signup", authLimiter, async (req, res) => {
    try {
        const {name, phone, password, profile_picture_url, fcm_token} = req.body.input;
        if (name && phone && password) {
            const existingUser = await knex('customers').where('phone', phoneValidation.value)
            if (existingUser.length !== 0) {
                return res.status(401).json({message: "customer already exists"})
            } else {
                const hashedPassword = await bcrypt.hash(password, 10)
                const createdUser = await knex('customers').insert({
                    name,
                    phone: phoneValidation.value,
                    password: hashedPassword,
                    fcm_token,
                    profile_picture_url
                }).returning('id')
                const token = createHasuraJWT(createdUser[0].id, "customer")
                return res.status(201).json({token})
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in customer endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

router.post("/update-password", authenticateUserToken, async (req, res) => {
    try {
        const {oldPassword, newPassword, confirmNewPassword} = req.body.input;
        const user_id = req.user_id

        if (oldPassword && newPassword && confirmNewPassword) {
            if (newPassword !== confirmNewPassword) {
                return res.status(401).json({message: "confirm password doesn't match"})
            } else {
                const exisingUser = await knex('customers').where('id', user_id)
                const match = await compare(oldPassword, exisingUser[0].password)
                if (!match) {
                    return res.status(401).json({message: "invalid old password"});
                } else {
                    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
                    await knex('customers').update({
                        password: hashedNewPassword,
                    }).where('id', user_id)
                    return res.status(200).json({message: "password updated successfully"})
                }
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in customer endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})


module.exports = router;
