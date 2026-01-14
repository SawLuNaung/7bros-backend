-- Check current admin roles in the database
SELECT id, name, phone, role, disabled, created_at 
FROM admins 
ORDER BY created_at;

