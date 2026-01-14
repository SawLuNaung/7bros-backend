-- ============================================================================
-- UPDATE ADMIN ROLES - Fix Naming Conflict with Hasura
-- ============================================================================
-- 
-- ISSUE: 'admin' is a default Hasura role with full permissions
-- SOLUTION: 
--   - Change 'super_admin' → 'admin' (full access)
--   - Change 'admin' → 'staff' (limited access)
--
-- HOW TO RUN:
-- 1. Open Hasura Console: http://167.99.28.74:9000/console
-- 2. Go to: DATA → SQL
-- 3. Copy and paste this script
-- 4. Click "Run!"
--
-- ============================================================================

-- STEP 1: First, let's see current roles
SELECT id, name, phone, role, disabled FROM admins ORDER BY created_at;

-- ============================================================================
-- STEP 2: Update role column constraint to allow 'staff' instead of 'super_admin'
-- ============================================================================

-- Drop old constraint
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;

-- Add new constraint with 'admin' and 'staff'
ALTER TABLE admins 
ADD CONSTRAINT admins_role_check 
CHECK (role IN ('admin', 'staff'));

-- ============================================================================
-- STEP 3: Update existing roles
-- ============================================================================

-- Change 'super_admin' to 'admin' (full access in Hasura)
UPDATE admins 
SET role = 'admin' 
WHERE role = 'super_admin';

-- Change 'admin' to 'staff' (limited access in Hasura)
UPDATE admins 
SET role = 'staff' 
WHERE role = 'admin';

-- ============================================================================
-- STEP 4: Verify the changes
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
--   - Your original super_admin → role = 'admin'
--   - The new admin (0987654321) → role = 'staff'
--
-- NEW ROLE STRUCTURE:
--   admin  = Full access to everything (Hasura default admin role)
--   staff  = Limited access (create drivers, view trips, top-up only)
--
-- ============================================================================

-- ROLLBACK (if needed):
-- UPDATE admins SET role = 'super_admin' WHERE role = 'admin';
-- UPDATE admins SET role = 'admin' WHERE role = 'staff';
-- ALTER TABLE admins DROP CONSTRAINT admins_role_check;
-- ALTER TABLE admins ADD CONSTRAINT admins_role_check CHECK (role IN ('super_admin', 'admin'));
-- ============================================================================

