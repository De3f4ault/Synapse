-- Manual webhook migration SQL
-- Run this to apply the webhooks table changes
BEGIN;
-- Create webhooks table
CREATE TABLE IF NOT EXISTS developer_schema.webhooks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES developer_schema.users(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    secret_encrypted TEXT NOT NULL,
    events TEXT [] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    total_deliveries INTEGER DEFAULT 0 NOT NULL,
    successful_deliveries INTEGER DEFAULT 0 NOT NULL,
    failed_deliveries INTEGER DEFAULT 0 NOT NULL
);
-- Create indexes
CREATE INDEX IF NOT EXISTS ix_webhooks_user_id ON developer_schema.webhooks(user_id);
CREATE INDEX IF NOT EXISTS ix_webhooks_is_active ON developer_schema.webhooks(is_active);
CREATE INDEX IF NOT EXISTS ix_webhooks_events ON developer_schema.webhooks USING gin(events);
-- Add webhook_id column to webhook_events if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'developer_schema'
        AND table_name = 'webhook_events'
        AND column_name = 'webhook_id'
) THEN
ALTER TABLE developer_schema.webhook_events
ADD COLUMN webhook_id INTEGER REFERENCES developer_schema.webhooks(id) ON DELETE
SET NULL;
CREATE INDEX ix_webhook_events_webhook_id ON developer_schema.webhook_events(webhook_id);
END IF;
END $$;
-- Mark migration as applied in alembic_version
INSERT INTO developer_schema.alembic_version (version_num)
VALUES ('webhook_subscriptions_v1') ON CONFLICT (version_num) DO NOTHING;
COMMIT;