-- Update distance_fee_per_km to 1000 for all fee_configs
-- This script updates the distance fee per kilometer to 1000 Myanmar Kyats

UPDATE fee_configs
SET distance_fee_per_km = 1000.0
WHERE distance_fee_per_km IS NOT NULL;

-- Verify the update
SELECT id, distance_fee_per_km, initial_fee, waiting_fee_per_minute
FROM fee_configs;
