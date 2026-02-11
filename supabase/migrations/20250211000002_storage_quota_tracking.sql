-- Add storage tracking to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;

-- Comment explaining the field
COMMENT ON COLUMN tenants.storage_used_bytes IS 'Total storage used by tenant in bytes (updated by triggers on file uploads)';

-- Function to calculate storage used by a tenant
CREATE OR REPLACE FUNCTION calculate_tenant_storage(p_tenant_id UUID)
RETURNS BIGINT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(file_size) FROM files WHERE tenant_id = p_tenant_id),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update tenant storage after attachment insert
CREATE OR REPLACE FUNCTION update_tenant_storage_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NOT NULL THEN
        UPDATE tenants
        SET storage_used_bytes = storage_used_bytes + NEW.file_size
        WHERE id = NEW.tenant_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update tenant storage after attachment delete
CREATE OR REPLACE FUNCTION update_tenant_storage_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.tenant_id IS NOT NULL THEN
        UPDATE tenants
        SET storage_used_bytes = GREATEST(0, storage_used_bytes - OLD.file_size)
        WHERE id = OLD.tenant_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_file_insert_storage ON files;
CREATE TRIGGER trigger_file_insert_storage
    AFTER INSERT ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_storage_on_insert();

DROP TRIGGER IF EXISTS trigger_file_delete_storage ON files;
CREATE TRIGGER trigger_file_delete_storage
    AFTER DELETE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_storage_on_delete();

-- Initialize storage_used_bytes for existing tenants
UPDATE tenants t
SET storage_used_bytes = COALESCE(
    (SELECT SUM(file_size) FROM files WHERE tenant_id = t.id),
    0
);

-- RPC function to check if tenant has storage quota available
CREATE OR REPLACE FUNCTION check_storage_quota(p_tenant_id UUID, p_file_size_bytes BIGINT)
RETURNS JSON AS $$
DECLARE
    v_current_usage BIGINT;
    v_tier TEXT;
    v_limit_bytes BIGINT;
BEGIN
    -- Get current usage and tier
    SELECT storage_used_bytes, subscription_tier INTO v_current_usage, v_tier
    FROM tenants WHERE id = p_tenant_id;

    IF v_current_usage IS NULL THEN
        RETURN json_build_object('allowed', false, 'error', 'Tenant not found');
    END IF;

    -- Calculate limit based on tier (in bytes)
    v_limit_bytes := CASE v_tier
        WHEN 'free' THEN 1073741824      -- 1 GB
        WHEN 'pro' THEN 26843545600      -- 25 GB
        WHEN 'institution' THEN 107374182400  -- 100 GB
        WHEN 'enterprise' THEN -1        -- Unlimited
        ELSE 1073741824                  -- Default to 1 GB
    END;

    -- Check if within quota
    IF v_limit_bytes = -1 THEN
        RETURN json_build_object(
            'allowed', true,
            'current_bytes', v_current_usage,
            'limit_bytes', -1,
            'remaining_bytes', -1
        );
    ELSIF (v_current_usage + p_file_size_bytes) <= v_limit_bytes THEN
        RETURN json_build_object(
            'allowed', true,
            'current_bytes', v_current_usage,
            'limit_bytes', v_limit_bytes,
            'remaining_bytes', v_limit_bytes - v_current_usage
        );
    ELSE
        RETURN json_build_object(
            'allowed', false,
            'error', 'Storage quota exceeded',
            'current_bytes', v_current_usage,
            'limit_bytes', v_limit_bytes,
            'remaining_bytes', v_limit_bytes - v_current_usage
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get storage usage for a tenant
CREATE OR REPLACE FUNCTION get_storage_usage(p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
    v_current_usage BIGINT;
    v_tier TEXT;
    v_limit_bytes BIGINT;
BEGIN
    SELECT storage_used_bytes, subscription_tier INTO v_current_usage, v_tier
    FROM tenants WHERE id = p_tenant_id;

    IF v_current_usage IS NULL THEN
        RETURN json_build_object('error', 'Tenant not found');
    END IF;

    v_limit_bytes := CASE v_tier
        WHEN 'free' THEN 1073741824
        WHEN 'pro' THEN 26843545600
        WHEN 'institution' THEN 107374182400
        WHEN 'enterprise' THEN -1
        ELSE 1073741824
    END;

    RETURN json_build_object(
        'used_bytes', v_current_usage,
        'limit_bytes', v_limit_bytes,
        'used_percentage', CASE
            WHEN v_limit_bytes = -1 THEN 0
            ELSE ROUND((v_current_usage::NUMERIC / v_limit_bytes::NUMERIC) * 100, 2)
        END,
        'tier', v_tier
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
