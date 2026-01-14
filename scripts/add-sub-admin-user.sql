-- ============================================================================
-- Add 'sub_admin' Role Support + Create User
-- ============================================================================
-- 
-- This script:
-- 1. Updates constraint to allow 'sub_admin' role
-- 2. Adds a new user with 'sub_admin' role
--
-- ROLES WILL BE:
--   admin     = Full access (everything)
--   sub_admin = Medium access (you define in Hasura)
--   staff     = Limited access (drivers, trips, top-up only)
--
-- HOW TO RUN:
-- 1. CHANGE THE PHONE NUMBER below (line 42)
-- 2. Open Hasura Console: http://167.99.28.74:9000/console
-- 3. Go to: DATA → SQL
-- 4. Copy and paste this script
-- 5. Click "Run!"
--
-- ============================================================================

-- STEP 1: Update constraint to allow 'sub_admin'
-- ============================================================================

ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;

ALTER TABLE admins 
ADD CONSTRAINT admins_role_check 
CHECK (role IN ('admin', 'sub_admin', 'staff'));

-- ============================================================================
-- STEP 2: Add new sub_admin user
-- ============================================================================

INSERT INTO admins (
    name, 
    phone, 
    password, 
    role, 
    disabled, 
    created_at
) 
VALUES (
    'Sub Admin',                                                       -- Change name if needed
    'ENTER_PHONE_NUMBER',                                              -- ⚠️ CHANGE THIS!
    '$2a$10$3FAHo/.w3POt1G0vmLJcmu5LwEy/GRu3fvlZ9hYN.6bsZaW7BKYdC',  -- Password: staff123
    'sub_admin',                                                       -- New sub_admin role
    false,                                                             -- Not disabled
    NOW()                                                              -- Current timestamp
);

-- ============================================================================
-- STEP 3: Verify
-- ============================================================================

SELECT id, name, phone, role, disabled FROM admins ORDER BY created_at;

-- ============================================================================
-- IMPORTANT NEXT STEPS:
-- ============================================================================
--
-- 1. UPDATE BACKEND CODE:
--    The backend needs to handle 'sub_admin' role in:
--    - src/routes/admin.js (signin logic)
--    - src/utils/userMiddleware.js (if needed)
--
-- 2. CONFIGURE HASURA PERMISSIONS:
--    Create permissions for 'sub_admin' role in Hasura
--    (between admin and staff access levels)
--
-- 3. RESTART BACKEND:
--    After updating backend code
--
-- 4. TEST LOGIN:
--    Login with new sub_admin account
--    Verify permissions work as expected
--
-- ============================================================================

-- LOGIN CREDENTIALS:
--   Phone:    [the phone number you entered]
--   Password: staff123
--
-- ============================================================================

