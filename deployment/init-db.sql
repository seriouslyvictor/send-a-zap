-- ===================================================================
-- Database Initialization Script
-- ===================================================================
-- This script runs automatically when PostgreSQL container starts
-- for the first time. It creates all required databases.
--
-- Databases created:
-- 1. whatsapp_automation (default, for Next.js if needed)
-- 2. n8n (for n8n workflow engine)
-- 3. evolution (for Evolution API)
-- ===================================================================

-- Create n8n database
CREATE DATABASE n8n;
GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres;

-- Create Evolution API database
CREATE DATABASE evolution;
GRANT ALL PRIVILEGES ON DATABASE evolution TO postgres;

-- The default database 'whatsapp_automation' is created automatically
-- by the POSTGRES_DB environment variable

-- Connect to n8n database to verify creation
\c n8n;
SELECT 'n8n database created successfully!' AS status;

-- Connect to evolution database to verify creation
\c evolution;
SELECT 'Evolution API database created successfully!' AS status;

-- Switch back to default database
\c whatsapp_automation;
SELECT 'All databases initialized successfully!' AS status;
