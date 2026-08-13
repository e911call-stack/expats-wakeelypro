-- ============================================================
-- Promote a user to Super Admin
-- Run in Supabase SQL Editor after the user has signed in once
-- ============================================================

-- 1) Find your user (by phone)
-- SELECT id, phone, name, role FROM "User" ORDER BY "createdAt" DESC LIMIT 20;

-- 2) Promote by phone (change the phone number)
UPDATE "User"
SET role = 'ADMIN',
    "updatedAt" = NOW()
WHERE phone = '+962790000001';  -- << change to your phone

-- 3) Verify
SELECT id, phone, name, role FROM "User" WHERE role = 'ADMIN';
