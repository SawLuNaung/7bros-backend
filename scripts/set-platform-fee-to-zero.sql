-- Set platform_fee to 0 for all fee_configs
-- This script sets the platform fee to zero until admin changes it from the dashboard

UPDATE fee_configs
SET platform_fee = 0.0
WHERE platform_fee IS NOT NULL;

-- Verify the update
SELECT id, platform_fee, initial_fee, insurance_fee, distance_fee_per_km
FROM fee_configs;
