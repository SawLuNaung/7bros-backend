-- ============================================================================
-- Create New Admin User (Staff Role - Limited Access)
-- ============================================================================
-- 
-- Phone: 0987654321
-- Password: admin123
-- Role: staff (limited access)
--
-- ROLE STRUCTURE:
--   admin = Full access to everything (Hasura default admin role)
--   staff = Limited access (create drivers, view trips, top-up only)
--
-- HOW TO RUN:
-- 1. Open Hasura Console: http://167.99.28.74:9000/console
-- 2. Go to: DATA → SQL
-- 3. Copy and paste this entire script
-- 4. Click "Run!"
--
-- ============================================================================

-- The bcrypt hash below is for password: admin123
-- Generated with salt rounds: 10
-- You can generate new hashes at: https://bcrypt-generator.com/

INSERT INTO admins (
    name, 
    phone, 
    password, 
    role, 
    disabled, 
    created_at
) 
VALUES (
    'Staff User',                                                      -- Name (you can change this)
    '0987654321',                                                      -- Phone number
    '$2a$10$JpjKf2RmCnOVid2IbNDjnuQAB8CMjCNsrivUEVevs6ENQaom87iWC',  -- Hashed password for: admin123
    'staff',                                                           -- Role: 'staff' (limited) or 'admin' (full)
    false,                                                             -- Not disabled
    NOW()                                                              -- Creation timestamp
);

-- ============================================================================
-- Verify the admin was created successfully
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
-- You should see:
--   - Name: Staff User
--   - Phone: 0987654321
--   - Role: staff
--   - Disabled: false
--
-- LOGIN CREDENTIALS:
--   Phone: 0987654321
--   Password: admin123
--
-- ACCESS LEVEL (Staff - Limited):
--   ✅ Create Driver Accounts (Full CRUD)
--   ✅ View Trip History (read-only)
--   ✅ Top-up Operations
--   ❌ View/Edit Customers
--   ❌ Delete Drivers
--   ❌ Dashboard & Other Features
--
-- ============================================================================

-- NOTES:
-- - If you get "duplicate key" error, the phone number already exists
-- - To change role to full admin, run:
--     UPDATE admins SET role = 'admin' WHERE phone = '0987654321';
-- - To disable this user, run:
--     UPDATE admins SET disabled = true WHERE phone = '0987654321';
-- ============================================================================

