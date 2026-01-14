-- ============================================================================
-- Add New Staff Member (Limited Access)
-- ============================================================================
-- 
-- This adds a new user with 'staff' role (limited access)
-- Phone: [ENTER PHONE NUMBER]
-- Password: staff123
--
-- Role: staff = Limited access
--   ✅ Create/Edit/Delete drivers (CRUD)
--   ✅ View trip history (read-only)
--   ✅ Top-up operations
--   ❌ Cannot access customers, dashboard, configs
--
-- HOW TO RUN:
-- 1. CHANGE THE PHONE NUMBER below (line 24)
-- 2. Open Hasura Console: http://167.99.28.74:9000/console
-- 3. Go to: DATA → SQL
-- 4. Copy and paste this script
-- 5. Click "Run!"
--
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
    'Staff Member',                                                    -- Change name if needed
    'ENTER_PHONE_NUMBER',                                              -- ⚠️ CHANGE THIS!
    '$2a$10$3FAHo/.w3POt1G0vmLJcmu5LwEy/GRu3fvlZ9hYN.6bsZaW7BKYdC',  -- Password: staff123
    'staff',                                                           -- Limited access role
    false,                                                             -- Not disabled
    NOW()                                                              -- Current timestamp
);

-- Verify
SELECT id, name, phone, role, disabled FROM admins ORDER BY created_at;

-- ============================================================================
-- EXPECTED RESULT:
-- You will see 2 users:
--   1. Original user → role: admin  (full access)
--   2. New user     → role: staff   (limited access)
--
-- LOGIN CREDENTIALS:
--   Phone:    [the phone number you entered]
--   Password: staff123
--
-- ============================================================================

