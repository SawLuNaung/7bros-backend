var express = require('express');
const knex = require("../utils/knex");
const {authenticateUserToken, authenticateDriverToken} = require("../utils/userMiddleware");
const {
    reverseGeocode,
    generateTripId,
    getDecimalPlaces,
    calculateCommissionFee,
    calculateDriverReceivedAmount, generateTransactionNumber, findNearestDriver, sendNoti, calculateDistanceFee
} = require("../utils/helper");
const {
    validateCoordinates,
    validateDistance,
    validateDuration,
    validateNumeric
} = require("../utils/validators");
var router = express.Router();

// router.post("/start", authenticateDriverToken, async (req, res) => {
//     try {
//         const user_id = req.user_id
//         const {start_lat, start_lng} = req.body.input
//         const geoData = await reverseGeocode(start_lat, start_lng);
//         const createdTrip = await knex('trips').insert({
//             driver_id: user_id,
//             status: "driving",
//             start_lat,
//             start_lng,
//             start_location: geoData.results[0] ? geoData.results[0].formatted_address : null,
//             trip_id: generateTripId()
//         }).returning('id')
//         await knex('drivers').update({
//             status: "on trip"
//         }).where("id", user_id)
//         return res.status(201).json({
//             message: "trip started",
//             trip_id: createdTrip[0].id
//         })
//     } catch (e) {
//         console.log(e)
//         return res.status(500).json(e)
//     }
// })

router.post("/start", authenticateDriverToken, async (req, res) => {
    try {
        const user_id = req.user_id
        const {start_lat, start_lng} = req.body.input
        
        // Validate coordinates
        const coordValidation = validateCoordinates(start_lat, start_lng);
        if (!coordValidation.valid) {
            return res.status(400).json({
                message: coordValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        const validatedLat = coordValidation.lat;
        const validatedLng = coordValidation.lng;
        
        console.log("=== START TRIP ===");
        console.log("Driver:", user_id, "Coords:", validatedLat, validatedLng);
        
        // Load fee configurations
        const feeConfigs = await knex('fee_configs').first()
        if (!feeConfigs) {
            return res.status(500).json({message: "Fee configuration not found"})
        }
        console.log("Fee configs loaded:", feeConfigs);
        
        const geoData = await reverseGeocode(validatedLat, validatedLng);
        
        const createdTrip = await knex('trips').insert({
            driver_id: user_id,
            status: "driving",
            start_lat: validatedLat,
            start_lng: validatedLng,
            start_location: geoData.results[0] ? geoData.results[0].formatted_address : null,
            trip_id: generateTripId(),
            started_at: new Date(),
            // Set initial fee values
            initial_fee: feeConfigs.initial_fee,
            commission_rate: feeConfigs.commission_rate,
            free_waiting_minute: feeConfigs.free_waiting_minute,
            waiting_fee_per_minute: feeConfigs.waiting_fee_per_minute,
            distance_fee_per_km: feeConfigs.distance_fee_per_km,
            platform_fee: feeConfigs.platform_fee,
            insurance_fee: feeConfigs.insurance_fee,
            commission_rate_type: feeConfigs.commission_rate_type
        }).returning('*')
        
        console.log("Trip created with ID:", createdTrip[0].id, "Status: driving");
        console.log("Returned started_at from DB:", createdTrip[0].started_at);
        
        await knex('drivers').update({
            status: "on trip"
        }).where("id", user_id)
        
        return res.status(201).json({
            message: "trip started",
            trip_id: createdTrip[0].id
        })
    } catch (e) {
        console.error("Error in /start endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})


router.post("/start-booked-trip", authenticateDriverToken, async (req, res) => {
    try {
        const user_id = req.user_id
        const {start_lat, start_lng} = req.body.input
        const geoData = await reverseGeocode(start_lat, start_lng);

        const activeBooking = await knex('bookings').where('driver_id', user_id).where('status', "on trip").first()
        if (activeBooking) {
            const createdTrip = await knex('trips').insert({
                driver_id: user_id,
                status: "driving",
                start_lat: coordValidation.lat,
                start_lng: coordValidation.lng,
                start_location: geoData.results[0] ? geoData.results[0].formatted_address : null,
                trip_id: generateTripId(),
                started_at: new Date()
            }).returning('*')
            await knex('bookings').update({
                trip_id: createdTrip[0].id
            }).where("id", activeBooking.id)
            await knex('drivers').update({
                status: "on trip"
            }).where("id", user_id)
            return res.status(201).json({
                message: "trip started",
                trip_id: createdTrip[0].id
            })
        } else {
            return res.status(400).json({message: "You have no active booking"})
        }

    } catch (e) {
        console.error("Error in /start endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})


router.post("/end-booked-trip", authenticateDriverToken, async (req, res) => {
    try {
        const user_id = req.user_id
        const {
            end_lat,
            end_lng,
            extra_list,
            location_points,
            extra_fee,
            duration,
            waiting_time,
            distance,
            gps_gaps,
            gps_gap_details,
        } = req.body.input;
        
        // Validate coordinates (if provided)
        let validatedEndLat = null;
        let validatedEndLng = null;
        if (end_lat != null && end_lng != null) {
            const coordValidation = validateCoordinates(end_lat, end_lng);
            if (!coordValidation.valid) {
                return res.status(400).json({
                    message: coordValidation.message,
                    extensions: {
                        code: "VALIDATION_ERROR"
                    }
                });
            }
            validatedEndLat = coordValidation.lat;
            validatedEndLng = coordValidation.lng;
        }
        
        // Validate distance
        const distanceValidation = validateDistance(distance, { min: 0, max: 1000 });
        if (!distanceValidation.valid) {
            return res.status(400).json({
                message: distanceValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        // Validate duration
        const durationValidation = validateDuration(duration, { min: 0, max: 86400 });
        if (!durationValidation.valid) {
            return res.status(400).json({
                message: durationValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        // Validate waiting time
        const waitingTimeValidation = validateDuration(waiting_time, { min: 0, max: 3600 }); // Max 1 hour waiting
        if (!waitingTimeValidation.valid) {
            return res.status(400).json({
                message: waitingTimeValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        // Validate extra fee
        const extraFeeValidation = validateNumeric(extra_fee, "Extra fee", { min: 0, max: 100000 });
        if (!extraFeeValidation.valid) {
            return res.status(400).json({
                message: extraFeeValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        const parsed = {
            distance: distanceValidation.value,
            duration: durationValidation.value,
            waiting_time: waitingTimeValidation.value,
            extra_fee: extraFeeValidation.value,
        }
        
        const activeBooking = await knex('bookings').where('driver_id', user_id).where('status', "on trip").first()
        if (activeBooking) {
            const feeConfigs = await knex('fee_configs').first()
            if (!feeConfigs) {
                return res.status(500).json({message: "Fee configuration not found"})
            }
            const geoData = (validatedEndLat != null && validatedEndLng != null) ? await reverseGeocode(validatedEndLat, validatedEndLng) : {results: []};

            const waiting_fee = (Math.max(0, (Math.floor(parsed.waiting_time / 60)) - feeConfigs.free_waiting_minute)) * feeConfigs.waiting_fee_per_minute

            // Convert distance from meters to kilometers
            const distanceInKm = parsed.distance / 1000;
            const distanceFee = calculateDistanceFee(distanceInKm, feeConfigs)


            const driver_total = getDecimalPlaces(distanceFee + waiting_fee + parsed.extra_fee + Number(feeConfigs.initial_fee), 0)
            const customer_total = Number(feeConfigs.initial_fee) + distanceFee + waiting_fee + parsed.extra_fee + Number(feeConfigs.insurance_fee) + Number(feeConfigs.platform_fee)
            const commission_fee = getDecimalPlaces(calculateCommissionFee(driver_total, feeConfigs), 0)
            const driver_received_amount = getDecimalPlaces(calculateDriverReceivedAmount(driver_total, feeConfigs), 0)

            // Ensure started_at is preserved if it exists, otherwise set it from created_at
            const endTime = new Date();
            const existingTrip = await knex('trips').where('id', activeBooking.trip_id).first();
            const startedAtValue = existingTrip?.started_at || existingTrip?.created_at;
            console.log("Ending booked trip - started_at before update:", existingTrip?.started_at);
            console.log("Ending booked trip - setting ended_at to:", endTime);
            
            const updatedTrip = await knex('trips').update({
                end_lat: validatedEndLat,
                end_lng: validatedEndLng,
                end_location: geoData.results[0] ? geoData.results[0].formatted_address : null,
                commission_rate: feeConfigs.commission_rate,
                free_waiting_minute: feeConfigs.free_waiting_minute,
                waiting_fee_per_minute: feeConfigs.waiting_fee_per_minute,
                distance_fee_per_km: feeConfigs.distance_fee_per_km,
                initial_fee: feeConfigs.initial_fee,
                platform_fee: feeConfigs.platform_fee,
                insurance_fee: feeConfigs.insurance_fee,
                commission_rate_type: feeConfigs.commission_rate_type,
                distance_fee: distanceFee,
                commission_fee,
                driver_received_amount: driver_received_amount,
                extra_fee: parsed.extra_fee,
                waiting_fee,
                total_amount: customer_total,
                distance_km: distanceInKm,
                duration_sec: parsed.duration,
                waiting_time_sec: parsed.waiting_time,
                status: "finished",
                extra_list,
                location_points,
                gps_gaps,
                gps_gap_details,
                started_at: startedAtValue, // Preserve or set started_at
                ended_at: endTime
            }).where('id', activeBooking.trip_id).returning('*')
            
            console.log("Booked trip updated - started_at after update:", updatedTrip[0].started_at);
            console.log("Booked trip updated - ended_at after update:", updatedTrip[0].ended_at);
            await knex('bookings').update({
                status: "completed",
            }).where("id", activeBooking.id)

            //add transaction data
            const trax = await knex('driver_transactions').insert({
                driver_id: user_id,
                amount: commission_fee,
                transaction_type: "commission",
                transaction_number: generateTransactionNumber(),
                status: "completed",
            }).returning('id');
            await knex('commissions').insert({
                driver_transaction_id: trax[0].id,
                commission_rate: feeConfigs.commission_rate,
                commission_rate_type: feeConfigs.commission_rate_type,
                trip_id: activeBooking.trip_id
            })
            const driver = await knex('drivers').where('id', user_id)

            const updatedDriver = await knex('drivers').update({
                status: "active",
                balance: Number(driver[0].balance) - commission_fee,
            }).where("id", user_id).returning('fcm_token')

            const customer = await knex('customers').where('id', activeBooking.customer_id).first()
            req.io.to(activeBooking.id).emit('bookingStatus', {
                bookingId: activeBooking.id,
                status: "completed"
            });
            //add transaction data (wrap in try-catch to prevent breaking response)
            try {
                await sendNoti("Trip Ended", `Your trip is complete. You earned ${driver_received_amount} ks`, 'default', updatedDriver[0].fcm_token)
            } catch (notiError) {
                console.log("Failed to send driver notification (non-critical):", notiError.message);
            }
            try {
                await sendNoti("Ride Finished", `Your ride is finished. Thanks for riding with Go Tuk Tuk`, 'default', customer.fcm_token)
            } catch (notiError) {
                console.log("Failed to send customer notification (non-critical):", notiError.message);
            }

            await knex('driver_notifications').insert({
                driver_id: user_id,
                title: "Trip Ended",
                body: `Your trip is complete. You earned ${driver_received_amount} ks`,
                notification_type: "trip",
                detail_id: activeBooking.trip_id
            })
            console.log("EndBookedTrip calculated fees:", {
                waiting_fee,
                distanceFee,
                driver_total,
                customer_total,
                commission_fee,
                driver_received_amount
            });
            
            // Prepare response object
            const responseData = {
                message: "trip ended",
                trip_id: updatedTrip[0].id,
                total_amount: Number(customer_total),
                driver_received_amount: Number(driver_received_amount),
                commission_fee: Number(commission_fee),
                waiting_fee: Number(waiting_fee),
                distance_fee: Number(distanceFee),
                extra_fee: Number(parsed.extra_fee),
                initial_fee: Number(feeConfigs.initial_fee),
                platform_fee: Number(feeConfigs.platform_fee),
                insurance_fee: Number(feeConfigs.insurance_fee)
            };
            
            console.log("=== SENDING RESPONSE TO HASURA (EndBookedTrip) ===");
            console.log("Response JSON:", JSON.stringify(responseData, null, 2));
            console.log("Response values check:", {
                total_amount: responseData.total_amount,
                isNull: responseData.total_amount === null,
                isUndefined: responseData.total_amount === undefined,
                type: typeof responseData.total_amount
            });
            
            return res.status(201).json(responseData)
        } else {
            return res.status(400).json({message: "You have no active booking"})
        }
    } catch (e) {
        console.error("Error in trip endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})


// router.post("/end", authenticateDriverToken, async (req, res) => {
//     try {
//         const user_id = req.user_id
//         const {
//             end_lat,
//             end_lng,
//             extra_list,
//             location_points,
//             extra_fee,
//             duration,
//             waiting_time,
//             distance,
//             gps_gaps,
//             gps_gap_details,
//         } = req.body.input;
//         const parsed = {
//             distance: Number(distance),
//             duration: Number(duration),
//             waiting_time: Number(waiting_time),
//             extra_fee: Number(extra_fee),
//         }
//         if ([parsed.distance, parsed.duration, parsed.waiting_time, parsed.extra_fee].some(v => Number.isNaN(v))) {
//             return res.status(400).json({message: "invalid numeric fields"})
//         }

//         const activeTrip = await knex('trips').where("driver_id", user_id).whereIn('status', ['pending', 'driving', "waiting"]).first()
//         console.log(activeTrip);
//         if (activeTrip) {
//             const feeConfigs = await knex('fee_configs').first()
//             const geoData = (validatedEndLat != null && validatedEndLng != null) ? await reverseGeocode(validatedEndLat, validatedEndLng) : {results: []};

//             const waiting_fee = (Math.max(0, (Math.floor(parsed.waiting_time / 60)) - feeConfigs.free_waiting_minute)) * feeConfigs.waiting_fee_per_minute

//             const distanceFee = calculateDistanceFee(parsed.distance, feeConfigs)

//             const driver_total = getDecimalPlaces(distanceFee + waiting_fee + parsed.extra_fee + Number(feeConfigs.initial_fee), 0)
//             const customer_total = Number(feeConfigs.initial_fee) + distanceFee + waiting_fee + parsed.extra_fee + Number(feeConfigs.insurance_fee) + Number(feeConfigs.platform_fee)
//             const commission_fee = getDecimalPlaces(calculateCommissionFee(driver_total, feeConfigs), 0)
//             const driver_received_amount = getDecimalPlaces(calculateDriverReceivedAmount(driver_total, feeConfigs), 0)

//             const updatedTrip = await knex('trips').update({
//                 end_lat,
//                 end_lng,
//                 end_location: geoData.results[0] ? geoData.results[0].formatted_address : null,
//                 commission_rate: feeConfigs.commission_rate,
//                 free_waiting_minute: feeConfigs.free_waiting_minute,
//                 waiting_fee_per_minute: feeConfigs.waiting_fee_per_minute,
//                 distance_fee_per_km: feeConfigs.distance_fee_per_km,
//                 initial_fee: feeConfigs.initial_fee,
//                 platform_fee: feeConfigs.platform_fee,
//                 insurance_fee: feeConfigs.insurance_fee,
//                 commission_rate_type: feeConfigs.commission_rate_type,
//                 distance_fee: distanceFee,
//                 commission_fee,
//                 driver_received_amount: driver_received_amount,
//                 extra_fee: parsed.extra_fee,
//                 waiting_fee,
//                 total_amount: customer_total,
//                 distance_km: parsed.distance,
//                 duration_sec: parsed.duration,
//                 waiting_time_sec: parsed.waiting_time,
//                 status: "finished",
//                 extra_list,
//                 location_points,
//                 gps_gaps,
//                 gps_gap_details,
//                 ended_at: new Date()
//             }).where('id', activeTrip.id).returning('id')

//             //add transaction data
//             const trax = await knex('driver_transactions').insert({
//                 driver_id: user_id,
//                 amount: commission_fee,
//                 transaction_type: "commission",
//                 transaction_number: generateTransactionNumber(),
//                 status: "completed",
//             }).returning('id');
//             await knex('commissions').insert({
//                 driver_transaction_id: trax[0].id,
//                 commission_rate: feeConfigs.commission_rate,
//                 commission_rate_type: feeConfigs.commission_rate_type,
//                 trip_id: activeTrip.id
//             })
//             const driver = await knex('drivers').where('id', user_id)

//             const updatedDriver = await knex('drivers').update({
//                 status: "active",
//                 balance: Number(driver[0].balance) - commission_fee,
//             }).where("id", user_id).returning('fcm_token')

//             //add transaction data
//             await sendNoti("Trip Ended", `Your trip is complete. You earned ${driver_received_amount} ks`, 'default', updatedDriver[0].fcm_token)

//             await knex('driver_notifications').insert({
//                 driver_id: user_id,
//                 title: "Trip Ended",
//                 body: `Your trip is complete. You earned ${driver_received_amount} ks`,
//                 notification_type: "trip",
//                 detail_id: activeTrip.id
//             })
//             return res.status(201).json({
//                 message: "trip ended",
//                 trip_id: updatedTrip[0].id
//             })
//         } else {
//             return res.status(400).json({message: "You have no active booking"})
//         }
//     } catch (e) {
//         console.log(e)
//         return res.status(500).json(e.toString())
//     }
// })

router.post("/end", authenticateDriverToken, async (req, res) => {
    try {
        const user_id = req.user_id
        console.log("=== END TRIP DEBUG ===");
        console.log("Driver ID:", user_id);
        
        const {
            end_lat,
            end_lng,
            extra_list,
            location_points,
            extra_fee,
            duration,
            waiting_time,
            distance,
            gps_gaps,
            gps_gap_details,
        } = req.body.input;
        
        // Validate coordinates (if provided)
        let validatedEndLat = null;
        let validatedEndLng = null;
        if (end_lat != null && end_lng != null) {
            const coordValidation = validateCoordinates(end_lat, end_lng);
            if (!coordValidation.valid) {
                return res.status(400).json({
                    message: coordValidation.message,
                    extensions: {
                        code: "VALIDATION_ERROR"
                    }
                });
            }
            validatedEndLat = coordValidation.lat;
            validatedEndLng = coordValidation.lng;
        }
        
        // Validate distance
        const distanceValidation = validateDistance(distance, { min: 0, max: 1000 });
        if (!distanceValidation.valid) {
            return res.status(400).json({
                message: distanceValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        // Validate duration
        const durationValidation = validateDuration(duration, { min: 0, max: 86400 });
        if (!durationValidation.valid) {
            return res.status(400).json({
                message: durationValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        // Validate waiting time
        const waitingTimeValidation = validateDuration(waiting_time, { min: 0, max: 3600 }); // Max 1 hour waiting
        if (!waitingTimeValidation.valid) {
            return res.status(400).json({
                message: waitingTimeValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        // Validate extra fee
        const extraFeeValidation = validateNumeric(extra_fee, "Extra fee", { min: 0, max: 100000 });
        if (!extraFeeValidation.valid) {
            return res.status(400).json({
                message: extraFeeValidation.message,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }
        
        const parsed = {
            distance: distanceValidation.value,
            duration: durationValidation.value,
            waiting_time: waitingTimeValidation.value,
            extra_fee: extraFeeValidation.value,
        }

        // Check active trip
        const activeTrip = await knex('trips').where("driver_id", user_id).whereIn('status', ['pending', 'driving', "waiting"]).first()
        console.log("Active trip found:", activeTrip);
        
        if (activeTrip) {
            console.log("Proceeding to end trip...");
            
            const feeConfigs = await knex('fee_configs').first()
            if (!feeConfigs) {
                return res.status(500).json({message: "Fee configuration not found"})
            }
            
            const geoData = (validatedEndLat != null && validatedEndLng != null) ? await reverseGeocode(validatedEndLat, validatedEndLng) : {results: []};

            // Calculate waiting fee (only charge after free waiting minutes)
            const waiting_fee = (Math.max(0, (Math.floor(parsed.waiting_time / 60)) - feeConfigs.free_waiting_minute)) * feeConfigs.waiting_fee_per_minute

            // Calculate distance fee - convert distance from meters to kilometers
            const distanceInKm = parsed.distance / 1000;
            const distanceFee = calculateDistanceFee(distanceInKm, feeConfigs)

            // Calculate totals
            const driver_total = getDecimalPlaces(distanceFee + waiting_fee + parsed.extra_fee + Number(feeConfigs.initial_fee), 0)
            const customer_total = Number(feeConfigs.initial_fee) + distanceFee + waiting_fee + parsed.extra_fee + Number(feeConfigs.insurance_fee) + Number(feeConfigs.platform_fee)
            const commission_fee = getDecimalPlaces(calculateCommissionFee(driver_total, feeConfigs), 0)
            const driver_received_amount = getDecimalPlaces(calculateDriverReceivedAmount(driver_total, feeConfigs), 0)

            console.log("Calculated fees:", {
                waiting_fee,
                distanceFee,
                driver_total,
                customer_total,
                commission_fee,
                driver_received_amount
            });

            // Update trip with completed data
            // Ensure started_at is preserved if it exists, otherwise set it from created_at
            const endTime = new Date();
            const startedAtValue = activeTrip.started_at || activeTrip.created_at;
            console.log("Ending trip - started_at before update:", activeTrip.started_at);
            console.log("Ending trip - setting ended_at to:", endTime);
            
            const updatedTrip = await knex('trips').update({
                end_lat: validatedEndLat,
                end_lng: validatedEndLng,
                end_location: geoData.results[0] ? geoData.results[0].formatted_address : null,
                commission_rate: feeConfigs.commission_rate,
                free_waiting_minute: feeConfigs.free_waiting_minute,
                waiting_fee_per_minute: feeConfigs.waiting_fee_per_minute,
                distance_fee_per_km: feeConfigs.distance_fee_per_km,
                initial_fee: feeConfigs.initial_fee,
                platform_fee: feeConfigs.platform_fee,
                insurance_fee: feeConfigs.insurance_fee,
                commission_rate_type: feeConfigs.commission_rate_type,
                distance_fee: distanceFee,
                commission_fee,
                driver_received_amount: driver_received_amount,
                extra_fee: parsed.extra_fee,
                waiting_fee,
                total_amount: customer_total,
                distance_km: distanceInKm,
                duration_sec: parsed.duration,
                waiting_time_sec: parsed.waiting_time,
                status: "finished",
                extra_list,
                location_points,
                gps_gaps,
                gps_gap_details,
                started_at: startedAtValue, // Preserve or set started_at
                ended_at: endTime
            }).where('id', activeTrip.id).returning('*')
            
            console.log("Trip updated - started_at after update:", updatedTrip[0].started_at);
            console.log("Trip updated - ended_at after update:", updatedTrip[0].ended_at);

            // Add transaction data for commission
            const trax = await knex('driver_transactions').insert({
                driver_id: user_id,
                amount: commission_fee,
                transaction_type: "commission",
                transaction_number: generateTransactionNumber(),
                status: "completed",
            }).returning('id');
            
            await knex('commissions').insert({
                driver_transaction_id: trax[0].id,
                commission_rate: feeConfigs.commission_rate,
                commission_rate_type: feeConfigs.commission_rate_type,
                trip_id: activeTrip.id
            })

            // Update driver status and balance
            const driver = await knex('drivers').where('id', user_id).first()
            const updatedDriver = await knex('drivers').update({
                status: "active",
                balance: Number(driver.balance) - commission_fee,
            }).where("id", user_id).returning('*')

            // Send notification only if FCM token exists (wrap in try-catch to prevent breaking response)
            if (updatedDriver[0] && updatedDriver[0].fcm_token && updatedDriver[0].fcm_token.length > 5) {
                try {
                    await sendNoti("Trip Ended", `Your trip is complete. You earned ${driver_received_amount} ks`, 'default', updatedDriver[0].fcm_token)
                } catch (notiError) {
                    console.log("Failed to send notification (non-critical):", notiError.message);
                    // Don't throw - notification failure shouldn't break the response
                }
            } else {
                console.log("No valid FCM token found for driver, skipping notification");
            }

            // Add driver notification to database (wrap in try-catch to prevent breaking response)
            try {
                await knex('driver_notifications').insert({
                    driver_id: user_id,
                    title: "Trip Ended",
                    body: `Your trip is complete. You earned ${driver_received_amount} ks`,
                    notification_type: "trip",
                    detail_id: activeTrip.id
                })
            } catch (notiDbError) {
                console.log("Failed to insert driver notification (non-critical):", notiDbError.message);
                // Don't throw - notification DB insert failure shouldn't break the response
            }

            console.log("Trip ended successfully:", updatedTrip[0].id);
            
            // Prepare response object
            const responseData = {
                message: "trip ended",
                trip_id: updatedTrip[0].id,
                total_amount: Number(customer_total),
                driver_received_amount: Number(driver_received_amount),
                commission_fee: Number(commission_fee),
                waiting_fee: Number(waiting_fee),
                distance_fee: Number(distanceFee),
                extra_fee: Number(parsed.extra_fee),
                initial_fee: Number(feeConfigs.initial_fee),
                platform_fee: Number(feeConfigs.platform_fee),
                insurance_fee: Number(feeConfigs.insurance_fee)
            };
            
            console.log("=== SENDING RESPONSE TO HASURA ===");
            console.log("Response JSON:", JSON.stringify(responseData, null, 2));
            console.log("Response values check:", {
                total_amount: responseData.total_amount,
                isNull: responseData.total_amount === null,
                isUndefined: responseData.total_amount === undefined,
                type: typeof responseData.total_amount
            });
            
            return res.status(201).json(responseData)
        } else {
            console.log("No active trip found with status in ['pending', 'driving', 'waiting']");
            return res.status(400).json({message: "You have no active trip"})
        }
    } catch (e) {
        console.error("Error in end trip:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})


router.post("/book", authenticateUserToken, async (req, res) => {
    try {
        const {start_lat, start_lng, end_lat, end_lng, start_location, end_location} = req.body.input
        const user_id = req.user_id

        // Validate start coordinates
        const startCoordValidation = validateCoordinates(start_lat, start_lng);
        if (!startCoordValidation.valid) {
            return res.status(400).json({
                message: `Start location: ${startCoordValidation.message}`,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }

        // Validate end coordinates
        const endCoordValidation = validateCoordinates(end_lat, end_lng);
        if (!endCoordValidation.valid) {
            return res.status(400).json({
                message: `End location: ${endCoordValidation.message}`,
                extensions: {
                    code: "VALIDATION_ERROR"
                }
            });
        }

        if (startCoordValidation.lat && startCoordValidation.lng && endCoordValidation.lat && endCoordValidation.lng) {
            const existedTrip = await knex('bookings').where('customer_id', user_id).whereIn('status', ['pending', 'accepted', "connected", "on trip"]).first()
            if (existedTrip) {
                return res.status(400).json({message: "You already have active booking"})
            } else {
                const bookedTrip = await knex('bookings').insert({
                    customer_id: user_id,
                    start_lat: startCoordValidation.lat,
                    start_lng: startCoordValidation.lng,
                    end_lat: endCoordValidation.lat,
                    end_lng: endCoordValidation.lng,
                    start_location,
                    end_location,
                    booking_id: generateTripId()
                }).returning('id')

                return res.status(201).json({
                    message: "trip booked",
                    id: bookedTrip[0].id
                })
            }
        } else {
            return res.status(400).json({message: "missing required fields"})
        }
    } catch (e) {
        console.error("Error in /book endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})


router.post("/search-driver", authenticateUserToken, async (req, res) => {
    try {
        const user_id = req.user_id

        const existedBooking = await knex('bookings').where('customer_id', user_id).whereIn('status', ['pending']).first()
        if (existedBooking) {
            const nearbyDriver = findNearestDriver(existedBooking.start_lat, existedBooking.start_lng)

            const driver = await knex('drivers').where('id', nearbyDriver.driver.id).first()

            if (nearbyDriver && driver.status === "active" && driver.is_online === true) {
                await knex('bookings').update({
                    driver_id: nearbyDriver.driver.id,
                    status: "connected"
                }).where("id", existedBooking.id)
                await knex('drivers').update({
                    status: "busy"
                }).where('id', nearbyDriver.driver.id)

                req.io.to(driver.id).emit('bookingRequest', {
                    driverId: driver.id,
                });

                req.io.to(existedBooking.id).emit('bookingStatus', {
                    bookingId: existedBooking.id,
                    status: "connected"
                });

                // await sendNoti("Customer Booking", "You received new booking", "booking", driver.fcm_token)
                await sendNoti("ခရီးသည် App အော်ဒါ", "ခရီးသည် App မှ အော်ဒါ သစ်ရရှိပါသည်", "booking", driver.fcm_token)

                return res.status(200).json({success: true, message: "connected with driver"})
            } else {
                return res.status(200).json({success: false, message: "no nearby driver found"})
            }
        } else {
            return res.status(400).json({message: "You have no active booking"})
        }
    } catch (e) {
        console.error("Error in trip endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

router.post("/accept", authenticateDriverToken, async (req, res) => {
    try {
        const user_id = req.user_id

        const activeBooking = await knex('bookings').where('driver_id', user_id).where('status', "connected").first()
        if (activeBooking) {

            req.io.to(activeBooking.id).emit('bookingStatus', {
                bookingId: activeBooking.id,
                status: "accepted"
            });

            await knex('bookings').where({id: activeBooking.id}).update({status: 'accepted'});

            const customer = await knex('customers').where('id', activeBooking.customer_id).first()

            await sendNoti("Booking Accepted", "Driving to your location", "booking", customer.fcm_token)


            return res.status(201).json({
                message: "booking accepted",
            })
        } else {
            return res.status(400).json({message: "no active booking"})
        }
    } catch (e) {
        console.error("Error in /accept endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})


router.post("/pickup", authenticateDriverToken, async (req, res) => {
    try {
        const user_id = req.user_id

        const activeBooking = await knex('bookings').where('driver_id', user_id).where('status', "accepted").first()
        if (activeBooking) {

            await knex('bookings').where({id: activeBooking.id}).update({status: 'on trip'});


            req.io.to(activeBooking.id).emit('bookingStatus', {
                bookingId: activeBooking.id,
                status: "on trip"
            });

            const customer = await knex('customers').where('id', activeBooking.customer_id).first()

            await sendNoti("Customer Picked Up", "Driving to your destination", "booking", customer.fcm_token)


            return res.status(201).json({
                message: "customer picked up",
            })
        } else {
            return res.status(400).json({message: "no active booking"})
        }
    } catch (e) {
        console.error("Error in trip endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

router.post("/reject", authenticateDriverToken, async (req, res) => {
    try {
        const user_id = req.user_id

        const activeBooking = await knex('bookings').where('driver_id', user_id).where('status', "connected").first()
        if (activeBooking) {

            req.io.to(activeBooking.id).emit('bookingStatus', {
                bookingId: activeBooking.id,
                status: "pending"
            });

            await knex('drivers').update({
                status: "active"
            }).where('id', activeBooking.driver_id)

            await knex('bookings').update({
                driver_id: null,
                status: "pending"
            }).where("id", activeBooking.id)

            return res.status(201).json({
                message: "booking rejected",
            })
        } else {
            return res.status(400).json({message: "no active booking"})
        }
    } catch (e) {
        console.error("Error in trip endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})

router.post("/cancel", authenticateUserToken, async (req, res) => {
    try {
        const user_id = req.user_id

        const activeBooking = await knex('bookings').where('customer_id', user_id).whereIn('status', ['pending', 'connected', 'accepted']).first()
        if (activeBooking) {

            req.io.to(activeBooking.driver_id).emit('bookingRequest', {
                driverId: activeBooking.driver_id,
            });


            await knex('bookings').update({
                status: "canceled"
            }).where("id", activeBooking.id)

            // await sendNoti("Booking Canceled", "Customer canceled the booking", "booking", driver.fcm_token)

            if (activeBooking.status !== "pending") {
                const updatedDriver = await knex('drivers').update({
                    status: "active"
                }).where('id', activeBooking.driver_id).returning('fcm_token')
                updatedDriver[0].fcm_token.length > 5 && await sendNoti("ခရီးသည် App အော်ဒါ", "ခရီးသည် မှ အော်ဒါ ကိုပယ်ဖြတ်လိုက်ပါသည်", "booking", updatedDriver[0].fcm_token)
            }

            return res.status(201).json({
                message: "booking canceled by customer",
                id: activeBooking.id
            })
        } else {
            return res.status(400).json({message: "no active booking"})
        }
    } catch (e) {
        console.error("Error in /cancel endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})


router.post("/test", async (req, res) => {
    try {
        await sendNoti("ခရီးသည် App အော်ဒါ", "ခရီးသည် App မှ အော်ဒါ သစ်ရရှိပါသည်", "transaction", "e2RzbkmHSCa5PnLvlAe6oz:APA91bETABuEfVhpZJkDhHmGKtUCyi6v1uc_fvVCNkx_rXzR2VT2S7t40zlFUGzE-MyJbmenBpl_Ic2BrDNpw7JzO2s8otpghMO3BPHv11GcLMAuiD0KLX4")
        return res.json("efef")
    } catch (e) {
        console.error("Error in /test endpoint:", e);
        return res.status(500).json({
            message: "Internal server error",
            extensions: {
                code: "INTERNAL_ERROR"
            }
        });
    }
})


module.exports = router;
