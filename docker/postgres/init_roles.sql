-- =============================================================================
-- Synapse — Application Role Bootstrap
-- Runs once via docker-entrypoint-initdb.d on first container start.
-- Creates the read-only synapse_user role used by SQL analytics functions.
-- =============================================================================

-- Create the application role (idempotent: skip if it already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'synapse_user') THEN
        CREATE ROLE synapse_user WITH LOGIN PASSWORD 'synapse_dev_only'
            NOSUPERUSER NOCREATEDB NOCREATEROLE;
        RAISE NOTICE 'Created role synapse_user';
    ELSE
        RAISE NOTICE 'Role synapse_user already exists — skipping';
    END IF;
END
$$;

-- =============================================================================
-- Required PostgreSQL Extensions
-- Must be installed as superuser — synapse_user cannot do this.
-- pg_trgm: provides word_similarity() used by search_conversations_v3
-- unaccent: normalises accented characters in search
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Grant connection and schema access
GRANT CONNECT ON DATABASE synapse TO synapse_user;

-- CRITICAL FIX for SQLAlchemy / asyncpg
-- Set the default search_path for ALL connections to the database.
-- This is much more reliable than trying to set it per-connection in SQLAlchemy
-- (which gets rolled back by pool resets, DISCARD ALL, etc.)
ALTER DATABASE synapse SET search_path TO developer_schema, public;
