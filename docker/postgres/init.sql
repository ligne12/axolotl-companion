-- =============================================================================
-- Postgres init — enable extensions needed by the app
-- =============================================================================

-- Case-insensitive text (for emails, usernames)
CREATE EXTENSION IF NOT EXISTS citext;

-- Cryptographic functions (UUIDs, hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Full-text search (pour future recherche dans historique chat)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
