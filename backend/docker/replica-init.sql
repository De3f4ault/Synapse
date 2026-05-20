-- Replica initialization script.
-- Runs automatically on first container boot via docker-entrypoint-initdb.d/
-- Creates the developer_schema so Alembic migrations have a target schema.

CREATE SCHEMA IF NOT EXISTS developer_schema;

-- Grant the replica user full access to the schema
GRANT ALL ON SCHEMA developer_schema TO synapse_replica;
ALTER DEFAULT PRIVILEGES IN SCHEMA developer_schema
    GRANT ALL ON TABLES TO synapse_replica;
ALTER DEFAULT PRIVILEGES IN SCHEMA developer_schema
    GRANT ALL ON SEQUENCES TO synapse_replica;
