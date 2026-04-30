-- ============================================================
-- TRANSFORMATION ENCOUNTER - DATABASE FIX SCRIPT
-- Run this file in your PostgreSQL database to fix:
-- 1. Missing worker_action_logs table (causes terminal error on delete)
-- 2. Foreign key issue that could block member deletion
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix 1: Create worker_action_logs table if it doesn't exist
-- This table records all admin/worker actions (approve, remove, role change, etc.)
CREATE TABLE IF NOT EXISTS worker_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fix 2: Fix the approved_by foreign key so deleting users doesn't fail
-- The original column has no ON DELETE rule, which blocks deletion of admins
-- who have approved other members. This changes it to SET NULL on delete.


ALTER TABLE users
    ADD CONSTRAINT users_approved_by_fkey
    FOREIGN KEY (approved_by)
    REFERENCES users(id)
    ON DELETE SET NULL;

SELECT 'Database fix applied successfully!' AS status;
