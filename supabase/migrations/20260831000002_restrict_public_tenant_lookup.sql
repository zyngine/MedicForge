-- =============================================================================
-- Migration: 20260831000002_restrict_public_tenant_lookup.sql
-- Description: Stop exposing the whole tenants row to anonymous callers.
--
-- 20250324000002_lms_audit_fixes.sql added
--     CREATE POLICY "Anyone can view tenant basics" ON tenants
--         FOR SELECT USING (true);
-- so that the middleware could resolve a subdomain before the visitor signs
-- in. Because RLS filters rows, not columns, that policy published every
-- column of every tenant to anyone holding the (public) anon key —
-- agency_code, stripe_customer_id, stripe_subscription_id, subscription
-- tier/status, trial_ends_at, settings and storage counters.
--
-- agency_code is the code /api/auth/setup-user accepts to place a brand new
-- signup into a tenant with the "instructor" role, so a readable agency_code
-- was a route into any tenant's data.
--
-- Replacement: a SECURITY DEFINER function that returns only the branding
-- fields the pre-auth shell needs, for one slug or custom domain at a time.
-- Signed-in users keep full access to their own tenant through the existing
-- "Users can view own tenant" policy.
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view tenant basics" ON tenants;

CREATE OR REPLACE FUNCTION public.get_tenant_public(
    p_slug   TEXT DEFAULT NULL,
    p_domain TEXT DEFAULT NULL
)
RETURNS TABLE (
    id             UUID,
    name           VARCHAR(255),
    slug           VARCHAR(100),
    logo_url       TEXT,
    primary_color  VARCHAR(7),
    custom_domain  VARCHAR(255),
    tenant_type    TEXT
)
AS $$
    SELECT t.id,
           t.name,
           t.slug,
           t.logo_url,
           t.primary_color,
           t.custom_domain,
           t.tenant_type
    FROM tenants t
    WHERE (p_slug IS NOT NULL AND t.slug = p_slug)
       OR (p_domain IS NOT NULL AND t.custom_domain = p_domain)
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_tenant_public(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_public(TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guard against double course purchases.
-- /api/ce/checkout/process-payment checks for an existing purchase and then
-- inserts, so two concurrent requests can both charge the card. A partial
-- unique index makes the second insert fail instead.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS ce_purchases_active_user_course_key
    ON ce_purchases (user_id, course_id)
    WHERE refunded = false;
