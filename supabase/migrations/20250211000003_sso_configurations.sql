-- SSO Configuration Tables
-- Supports SAML, OIDC, and social providers for enterprise tenants

-- SSO provider configurations
CREATE TABLE IF NOT EXISTS sso_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('saml', 'oidc', 'google', 'microsoft', 'okta')),
    name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,

    -- SAML specific fields
    saml_entity_id TEXT,
    saml_sso_url TEXT,
    saml_slo_url TEXT,
    saml_certificate TEXT,
    saml_signature_algorithm TEXT DEFAULT 'sha256',

    -- OIDC specific fields
    oidc_issuer TEXT,
    oidc_client_id TEXT,
    oidc_client_secret TEXT,  -- Encrypted in production
    oidc_discovery_url TEXT,
    oidc_scopes TEXT[] DEFAULT ARRAY['openid', 'email', 'profile'],

    -- Common configuration
    attribute_mapping JSONB DEFAULT '{"email": "email", "firstName": "firstName", "lastName": "lastName"}'::JSONB,
    auto_provision_users BOOLEAN DEFAULT true,
    default_role TEXT DEFAULT 'student' CHECK (default_role IN ('student', 'instructor', 'admin')),
    allowed_domains TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);

-- SSO sessions for tracking active SSO logins
CREATE TABLE IF NOT EXISTS sso_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sso_config_id UUID NOT NULL REFERENCES sso_configurations(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    provider_user_id TEXT,
    attributes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    UNIQUE(session_id)
);

-- Enable RLS
ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_sso_configs_tenant ON sso_configurations(tenant_id);
CREATE INDEX idx_sso_configs_enabled ON sso_configurations(tenant_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_sso_sessions_user ON sso_sessions(user_id);
CREATE INDEX idx_sso_sessions_expires ON sso_sessions(expires_at);

-- RLS Policies for sso_configurations

-- Admins can view their tenant's SSO configurations
CREATE POLICY "Admins can view SSO configurations"
    ON sso_configurations FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- Admins can manage SSO configurations
CREATE POLICY "Admins can manage SSO configurations"
    ON sso_configurations FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- Platform admins can view all SSO configurations
CREATE POLICY "Platform admins can view all SSO configurations"
    ON sso_configurations FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    );

-- RLS Policies for sso_sessions

-- Users can view their own SSO sessions
CREATE POLICY "Users can view own SSO sessions"
    ON sso_sessions FOR SELECT
    USING (user_id = auth.uid());

-- System can manage SSO sessions (via service role)
-- Note: Session creation/deletion is done via API with service role

-- Function to ensure only one default SSO config per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_sso()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE sso_configurations
        SET is_default = false
        WHERE tenant_id = NEW.tenant_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_default_sso
    BEFORE INSERT OR UPDATE ON sso_configurations
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_sso();

-- Function to cleanup expired SSO sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sso_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sso_sessions
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger
CREATE TRIGGER update_sso_configurations_updated_at
    BEFORE UPDATE ON sso_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE sso_configurations IS 'SSO provider configurations for enterprise tenants (SAML, OIDC, social)';
COMMENT ON TABLE sso_sessions IS 'Active SSO sessions for tracking and single logout';
COMMENT ON FUNCTION cleanup_expired_sso_sessions IS 'Cleanup expired SSO sessions (run periodically via cron)';
