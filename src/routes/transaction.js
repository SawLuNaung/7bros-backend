var express = require('express');
const knex = require("../utils/knex");
const {authenticateUserToken, authenticateAdminToken, authenticateDriverToken} = require("../utils/userMiddleware");
const {
    reverseGeocode,
    getDecimalPlaces,
    calculateCommissionFee,
    calculateDriverReceivedAmount, generateTransactionNumber
} = require("../utils/helper");
var router = express.Router();
var fireBaseAdmin = require("firebase-admin");

router.post("/driver-cashin", authenticateDriverToken, async (req, res) => {
    try {
        const messaging = fireBaseAdmin.messaging();
        const user_id = req.user_id
        const {payment_method, receipt_photo_url} = req.body.input
        const createdTrax = await knex('driver_transactions').insert({
            driver_id: user_id,
            transaction_type: "cash in",
            transaction_number: generateTransactionNumber(),
        }).returning('id')
        await knex('top_ups').insert({
            driver_transaction_id: createdTrax[0].id,
            payment_method,
            receipt_photo_url
        }).returning('id')

        const driver = await knex('drivers').where('id', user_id).first()
        await messaging.send({
            notification: {
                title: "Top Up Request",
                body: `Please wait for confirmation`,
            },
            android: {
                notification: {
                    channelId: "transaction",
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'transaction.wav'
                    }
                }
            },
            data: {
                detailId: createdTrax[0].id,
            },
            token: driver.fcm_token
        })
        await knex('driver_notifications').insert({
            driver_id: user_id,
            title: "Top Up Request",
            body: `Please wait for confirmation`,
            notification_type: "transaction",
            detail_id: createdTrax[0].id,
        })

        return res.status(201).json({
            message: "cash in success",
            transaction_id: createdTrax[0].id
        })
    } catch (e) {
        console.log(e)
        return res.status(500).json(e)
    }
})

router.post("/update-driver-cashin", authenticateAdminToken, async (req, res) => {
    try {
        const user_id = req.user_id
        const messaging = fireBaseAdmin.messaging();
        const {driver_transaction_id, amount, accepted} = req.body.input
        if (driver_transaction_id && amount) {
            const updatedTrax = await knex('driver_transactions').update({
                amount,
                status: accepted ? "completed" : "failed",
            }).where("id", driver_transaction_id).where('status', 'pending').returning('driver_id')

            if (!updatedTrax || updatedTrax.length === 0) {
                return res.status(400).json({
                    message: "invalid transaction id or already processed",
                })
            }

            await knex('top_ups').update({
                approved_admin_id: user_id,
            }).where('driver_transaction_id', driver_transaction_id)


            const driver = await knex('drivers').where('id', updatedTrax[0].driver_id).first()

            accepted && await knex('drivers').update({
                balance: Number(driver.balance) + Number(amount),
            }).where("id", driver.id)

            await messaging.send({
                notification: {
                    title: `Top Up ${accepted ? "Confirmed" : "Rejected"}`,
                    body: accepted ? `amount ${amount} was added to your balance` : "Your top up request was failed",
                },
                android: {
                    notification: {
                        channelId: "transaction",
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'transaction.wav'
                        }
                    }
                },
                data: {
                    detailId: driver_transaction_id,
                },
                token: driver.fcm_token
            })
            await knex('driver_notifications').insert({
                driver_id: driver.id,
                title: `Top Up ${accepted ? "Confirmed" : "Rejected"}`,
                body: accepted ? `amount ${amount} was added to your balance` : "Your top up request was failed",
                notification_type: "transaction",
                detail_id: driver_transaction_id,
            })
            return res.status(201).json({
                message: "update driver cash in success",
                transaction_id: driver_transaction_id
            })
        } else {
            return res.status(400).json({
                message: "missing required fields",
            })
        }
    } catch (e) {
        console.log(e)
        return res.status(500).json(e)
    }
})


router.post("/admin-driver-cashin", authenticateAdminToken, async (req, res) => {
    try {
        const user_id = req.user_id
        const messaging = fireBaseAdmin.messaging();
        const {driver_id, amount, payment_method, receipt_photo_url} = req.body.input
        if (driver_id && amount && payment_method) {
            const createdTrax = await knex('driver_transactions').insert({
                driver_id,
                amount,
                transaction_type: "cash in",
                status: "completed",
                transaction_number: generateTransactionNumber()
            }).returning('id')

            await knex('top_ups').insert({
                approved_admin_id: user_id,
                driver_transaction_id: createdTrax[0].id,
                payment_method,
                receipt_photo_url
            })


            const driver = await knex('drivers').where('id', driver_id).first()

            if (!driver) {
                return res.status(404).json({ message: "driver not found" })
            }

            await knex('drivers').update({
                balance: Number(driver.balance) + Number(amount),
            }).where("id", driver.id)

            await messaging.send({
                notification: {
                    title: `Top Up Success`,
                    body: `amount ${amount} was added to your balance`,
                },
                android: {
                    notification: {
                        channelId: "transaction",
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'transaction.wav'
                        }
                    }
                },
                data: {
                    detailId: createdTrax[0].id,
                },
                token: driver.fcm_token
            })
            await knex('driver_notifications').insert({
                driver_id: driver.id,
                title: `Top Up Success`,
                body: `amount ${amount} was added to your balance`,
                notification_type: "transaction",
                detail_id: createdTrax[0].id,
            })
            return res.status(201).json({
                message: "driver cash in success",
                transaction_id: createdTrax[0].id,
            })
        } else {
            return res.status(400).json({
                message: "missing required fields",
            })
        }
    } catch (e) {
        console.log(e)
        return res.status(500).json(e)
    }
})


module.exports = router;
