-- ============================================================================
-- Create New Staff User
-- ============================================================================
-- 
-- Phone: 0987654321
-- Password: staff123
-- Role: staff (limited access)
--
-- ROLE: staff (Limited Access)
--   ✅ Create/Edit/Delete drivers (Full CRUD)
--   ✅ View trip history (read-only)
--   ✅ Top-up operations
--   ❌ Cannot view/edit customers
--   ❌ Cannot access dashboard
--   ❌ Cannot modify system configs
--
-- HOW TO RUN:
-- 1. Open Hasura Console: http://167.99.28.74:9000/console
-- 2. Go to: DATA → SQL
-- 3. Copy and paste this entire script
-- 4. Click "Run!"
--
-- ============================================================================

-- Check if phone number already exists
SELECT 
    id, 
    name, 
    phone, 
    role, 
    disabled 
FROM admins 
WHERE phone = '0987654321';

-- If the above returns a row, the phone number already exists!
-- If it's empty, proceed with the INSERT below:

-- ============================================================================
-- Insert new staff user
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
    'Staff Member',                                                    -- Name (change as needed)
    '0987654321',                                                      -- Phone number
    '$2a$10$Ay3nZkhi407fIFrqCTcVI.sl1oa0pCc8dQU1hCcL0V8DjaXicAhmW',  -- Hashed password for: staff123
    'staff',                                                           -- Role: staff (limited access)
    false,                                                             -- Not disabled
    NOW()                                                              -- Creation timestamp
);

-- ============================================================================
-- Verify the new user was created
-- ============================================================================

SELECT 
    id,
    name, 
    phone, 
    role, 
    disabled, 
    created_at 
FROM admins 
WHERE phone = '0987654321';

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- id:       [auto-generated UUID]
-- name:     Staff Member
-- phone:    0987654321
-- password: [hashed]
-- role:     staff
-- disabled: false
--
-- LOGIN CREDENTIALS:
--   Phone:    0987654321
--   Password: staff123
--
-- ACCESS LEVEL (Staff - Limited):
--   ✅ Create/Edit/Delete drivers (CRUD)
--   ✅ View trip history (read-only)
--   ✅ Top-up operations
--   ❌ No access to customers
--   ❌ No access to dashboard
--   ❌ No access to system configs
--
-- ============================================================================

-- NOTES:
-- - If you get "duplicate key" error, phone number already exists
-- - To change password, generate new hash at: https://bcrypt-generator.com/
-- - To promote to admin (full access):
--     UPDATE admins SET role = 'admin' WHERE phone = '0987654321';
-- - To disable this user:
--     UPDATE admins SET disabled = true WHERE phone = '0987654321';
-- - To delete this user:
--     DELETE FROM admins WHERE phone = '0987654321';
--
-- ============================================================================

-- IMPORTANT AFTER CREATION:
-- 1. User can login with: 0987654321 / staff123
-- 2. Make sure Hasura permissions are configured for 'staff' role
--    → See: HASURA_PERMISSIONS_CHECKLIST.md
-- 3. Make sure backend is running with updated role code
-- 4. Test login and verify limited access works correctly
--
-- ============================================================================

