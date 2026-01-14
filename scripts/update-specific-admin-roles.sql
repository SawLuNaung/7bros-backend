-- ============================================================================
-- Update Specific Admin Roles
-- ============================================================================
-- 
-- Changes:
--   Phone 0912345678 → admin (full access)
--   Phone 0987654321 → staff (limited access)
--
-- HOW TO RUN:
-- 1. Open Hasura Console: http://167.99.28.74:9000/console
-- 2. Go to: DATA → SQL
-- 3. Copy and paste this script
-- 4. Click "Run!"
--
-- ============================================================================

-- STEP 1: Check current roles before update
SELECT 
    id,
    name, 
    phone, 
    role, 
    disabled, 
    created_at 
FROM admins 
WHERE phone IN ('0912345678', '0987654321')
ORDER BY phone;

-- ============================================================================
-- STEP 2: Update roles
-- ============================================================================

-- Update phone 0912345678 to admin (full access)
UPDATE admins 
SET role = 'admin' 
WHERE phone = '0912345678';

-- Update phone 0987654321 to staff (limited access)
UPDATE admins 
SET role = 'staff' 
WHERE phone = '0987654321';

-- ============================================================================
-- STEP 3: Verify the changes
-- ============================================================================

SELECT 
    id,
    name, 
    phone, 
    role, 
    disabled, 
    created_at 
FROM admins 
WHERE phone IN ('0912345678', '0987654321')
ORDER BY phone;

-- ============================================================================
-- EXPECTED RESULT:
-- ============================================================================
-- Phone: 0912345678 → role: admin  (full access)
-- Phone: 0987654321 → role: staff  (limited access)
--
-- ROLE DEFINITIONS:
--   admin = Full access to everything
--           ✅ All tables (CRUD)
--           ✅ All actions
--           ✅ View/Edit customers
--           ✅ Delete drivers
--           ✅ Dashboard & all features
--
--   staff = Limited access
--           ✅ Create/Edit/Delete drivers (CRUD)
--           ✅ View trip history (read-only)
--           ✅ Top-up operations
--           ❌ No access to customers
--           ❌ No access to configs
--           ❌ No access to dashboard
--
-- ============================================================================

-- IMPORTANT:
-- - Both users must RE-LOGIN to get new JWT with updated role
-- - Configure Hasura permissions for 'staff' role if not done yet
-- - See HASURA_PERMISSIONS_CHECKLIST.md for permission configuration
--
-- ============================================================================

-- ROLLBACK (if needed):
-- UPDATE admins SET role = 'staff' WHERE phone = '0912345678';
-- UPDATE admins SET role = 'admin' WHERE phone = '0987654321';
-- ============================================================================

