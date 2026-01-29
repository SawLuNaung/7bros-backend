var express = require('express');
const knex = require("../utils/knex");
const {compare} = require("bcryptjs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {jwtKey, jwtExpTime, jwtSecretKey} = require("../utils/config");
const {createHasuraJWT, generateDriverId} = require("../utils/helper");
const {authenticateUserToken} = require("../utils/userMiddleware");
const { validatePhoneNumber } = require("../utils/validators");
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
            const existingUser = await knex('drivers').where('phone', phoneValidation.value)
            if (existingUser.length === 0) {
                return res.status(400).json({message: "အကောင့်မရှိပါ"})
            } else {
                if (existingUser[0].disabled === true) {
                    return res.status(401).json({message: "ဤအကောင့်ကို ပိတ်ထားပါသည်"});
                } else {
                    const match = await compare(password, existingUser[0].password)
                    if (!match) {
                        return res.status(401).json({message: "စကားဝှက်မှားနေသည်"});
                    } else {
			    if (fcm_token) {
  await knex('drivers')
    .where('id', existingUser[0].id)
    .update({ fcm_token });
}

//                        await knex('drivers').update({
  //                          fcm_token
    //                    }).where('id', existingUser[0].id)
                        const token = createHasuraJWT(existingUser[0].id, 'driver')
                        return res.status(200).json({
                            token,
                            disabled: existingUser[0].disabled || false
                        })
                    }
                }
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in driver endpoint:", e);
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
        const {name, phone, password} = req.body.input;
        
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
        
        if (name && phoneValidation.value && password) {
            const existingUser = await knex('drivers').where('phone', phoneValidation.value)
            if (existingUser.length !== 0) {
                return res.status(401).json({message: "အကောင့်ရှိပြီးသားပါ"})
            } else {
                const existingDriverId = await knex('drivers').orderBy('driver_id', 'desc').limit(1).select('driver_id').first()
                
                if (!existingDriverId || !existingDriverId.driver_id) {
                    return res.status(500).json({
                        message: "Unable to generate driver ID",
                        extensions: {
                            code: "INTERNAL_ERROR"
                        }
                    });
                }
                
                const hashedPassword = await bcrypt.hash(password, 10)
                await knex('drivers').insert({
                    ...req.body.input,
                    driver_id: generateDriverId(existingDriverId.driver_id),
                    password: hashedPassword,
                    password_plain: password
                }).returning('id')
                return res.status(201).json({message: "အကောင့်ဖွင့်ခြင်းအောင်မြင်သည်။\nအတည်ပြုချက်ကိုစောင့်ပါ"})
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in driver endpoint:", e);
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
        const {oldPassword, newPassword, confirmNewPassword} = req.body;
        const user_id = req.user_id

        if (oldPassword && newPassword && confirmNewPassword) {
            if (newPassword !== confirmNewPassword) {
                return res.status(401).json({message: "confirm password doesn't match"})
            } else {
                const exisingUser = await knex('drivers').where('id', user_id)
                const match = await compare(oldPassword, exisingUser[0].password)
                if (!match) {
                    return res.status(401).json({message: "invalid old password"});
                } else {
                    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
                    await knex('drivers').update({
                        password: hashedNewPassword,
                        password_plain: newPassword
                    }).where('id', user_id)
                    return res.status(200).json({message: "password updated successfully"})
                }
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in driver endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})






module.exports = router;
