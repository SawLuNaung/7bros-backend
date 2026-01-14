-- ============================================================================
-- Complete Admin Role Migration & Staff Creation
-- ============================================================================
-- 
-- This script will:
-- 1. Update database constraint to allow 'admin' and 'staff' roles
-- 2. Change existing super_admin → admin (full access)
-- 3. Add new staff member with phone 0987654321
--
-- HOW TO RUN:
-- 1. Open Hasura Console: http://167.99.28.74:9000/console
-- 2. Go to: DATA → SQL
-- 3. Copy and paste this ENTIRE script
-- 4. Click "Run!"
--
-- ============================================================================

-- STEP 1: Show current admin(s) BEFORE changes
-- ============================================================================
SELECT 
    id,
    name, 
    phone, 
    role, 
    disabled,
    created_at 
FROM admins 
ORDER BY created_at;

-- ============================================================================
-- STEP 2: Update constraint to allow new role values
-- ============================================================================

-- Drop old constraint that only allows 'super_admin' and 'admin'
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;

-- Add new constraint that allows 'admin' (full access) and 'staff' (limited)
ALTER TABLE admins 
ADD CONSTRAINT admins_role_check 
CHECK (role IN ('admin', 'staff'));

-- ============================================================================
-- STEP 3: Change existing super_admin to admin (full access)
-- ============================================================================

UPDATE admins 
SET role = 'admin' 
WHERE role = 'super_admin';

-- If there was an old 'admin' role, change to 'staff'
UPDATE admins 
SET role = 'staff' 
WHERE role = 'admin' 
AND phone != (SELECT phone FROM admins WHERE role = 'admin' LIMIT 1);

-- ============================================================================
-- STEP 4: Add new staff member with phone 0987654321
-- ============================================================================

-- Check if this phone already exists (will show empty if doesn't exist)
SELECT id, name, phone, role FROM admins WHERE phone = '0987654321';

-- Insert new staff member (will fail if phone already exists)
INSERT INTO admins (
    name, 
    phone, 
    password, 
    role, 
    disabled, 
    created_at
) 
VALUES (
    'Staff Member',                                                    -- Name
    '0987654321',                                                      -- Phone
    '$2a$10$Ay3nZkhi407fIFrqCTcVI.sl1oa0pCc8dQU1hCcL0V8DjaXicAhmW',  -- Password: staff123
    'staff',                                                           -- Role: staff (limited)
    false,                                                             -- Not disabled
    NOW()                                                              -- Current timestamp
);

-- ============================================================================
-- STEP 5: Verify all changes
-- ============================================================================

SELECT 
    id,
    name, 
    phone, 
    role, 
    disabled,
    created_at 
FROM admins 
ORDER BY created_at;

-- ============================================================================
-- EXPECTED RESULT:
-- ============================================================================
-- You should now see:
--   1. Your original super_admin → role changed to 'admin'
--   2. New user with phone 0987654321 → role 'staff'
--
-- ROLE DEFINITIONS:
--   admin = Full access (Hasura default admin role)
--           ✅ All tables, all operations
--           ✅ All actions
--           ✅ Complete control
--
--   staff = Limited access (custom role)
--           ✅ Create/Edit/Delete drivers (CRUD)
--           ✅ View trip history (read-only)
--           ✅ Top-up operations
--           ❌ No access to customers, configs, dashboard
--
-- LOGIN CREDENTIALS for new staff:
--   Phone:    0987654321
--   Password: staff123
--
-- ============================================================================

-- IMPORTANT NEXT STEPS:
-- 1. Both users must RE-LOGIN to get new JWT tokens with updated roles
-- 2. Restart backend server (it's already updated for admin/staff roles)
-- 3. Configure Hasura permissions:
--    → Set 'admin' role permissions (full access to all tables)
--    → Set 'staff' role permissions (limited access)
--    → See: HASURA_PERMISSIONS_CHECKLIST.md
-- 4. Test both accounts to verify permissions work correctly
--
-- ============================================================================

-- ROLLBACK (if something goes wrong):
-- ALTER TABLE admins DROP CONSTRAINT admins_role_check;
-- ALTER TABLE admins ADD CONSTRAINT admins_role_check 
-- CHECK (role IN ('super_admin', 'admin'));
-- UPDATE admins SET role = 'super_admin' WHERE role = 'admin';
-- DELETE FROM admins WHERE phone = '0987654321';
-- ============================================================================

