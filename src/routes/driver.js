var express = require('express');
const knex = require("../utils/knex");
const {compare} = require("bcryptjs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {jwtKey, jwtExpTime, jwtSecretKey} = require("../utils/config");
const {createHasuraJWT, generateDriverId} = require("../utils/helper");
const {authenticateUserToken} = require("../utils/userMiddleware");
var router = express.Router();

router.post("/signin", async (req, res) => {
    try {
        const {phone, password, fcm_token} = req.body.input;
        
        if (phone && password) {
            const existingUser = await knex('drivers').where('phone', phone)
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
        return res.status(500).json({message: "Internal server error"});
    }
})

router.post("/signup", async (req, res) => {
    try {
        const {name, phone, password} = req.body.input;
        
        if (name && phone && password) {
            const existingUser = await knex('drivers').where('phone', phone)
            if (existingUser.length !== 0) {
                return res.status(401).json({message: "အကောင့်ရှိပြီးသားပါ"})
            } else {
                const existingDriverId = await knex('drivers').orderBy('driver_id', 'desc').limit(1).select('driver_id').first()
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
        return res.status(500).json({message: "Internal server error"});
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
        return res.status(500).json({message: "Internal server error"});
    }
})






module.exports = router;
