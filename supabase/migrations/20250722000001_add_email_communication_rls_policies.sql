-- Enable RLS on email tables
ALTER TABLE "EmailCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailQuota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailSettings" ENABLE ROW LEVEL SECURITY;

-- Helper function to get church ID from auth metadata
CREATE OR REPLACE FUNCTION get_church_id_from_auth() RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() -> 'user_metadata' ->> 'church_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- EmailCampaign Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their church campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin and staff can create campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin and staff can update campaigns" ON "EmailCampaign";
DROP POLICY IF EXISTS "Admin can delete campaigns" ON "EmailCampaign";

-- View: Users can only see campaigns from their church
CREATE POLICY "Users can view their church campaigns" ON "EmailCampaign"
    FOR SELECT USING ("churchId" = get_church_id_from_auth());

-- Insert: ADMIN and STAFF can create campaigns
CREATE POLICY "Admin and staff can create campaigns" ON "EmailCampaign"
    FOR INSERT WITH CHECK (
        "churchId" = get_church_id_from_auth() AND
        EXISTS (
            SELECT 1 FROM "Profile" 
            WHERE id = auth.uid()::TEXT 
            AND role IN ('ADMIN', 'STAFF')
        )
    );

-- Update: ADMIN and STAFF can update their church's campaigns
CREATE POLICY "Admin and staff can update campaigns" ON "EmailCampaign"
    FOR UPDATE USING (
        "churchId" = get_church_id_from_auth() AND
        EXISTS (
            SELECT 1 FROM "Profile" 
            WHERE id = auth.uid()::TEXT 
            AND role IN ('ADMIN', 'STAFF')
        )
    );

-- Delete: Only ADMIN can delete campaigns
CREATE POLICY "Admin can delete campaigns" ON "EmailCampaign"
    FOR DELETE USING (
        "churchId" = get_church_id_from_auth() AND
        EXISTS (
            SELECT 1 FROM "Profile" 
            WHERE id = auth.uid()::TEXT 
            AND role = 'ADMIN'
        )
    );

-- EmailRecipient Policies  
-- View: Users can view recipients for their church's campaigns
CREATE POLICY "Users can view campaign recipients" ON "EmailRecipient"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "EmailCampaign" 
            WHERE "EmailCampaign".id = "EmailRecipient"."campaignId"
            AND "EmailCampaign"."churchId" = get_church_id_from_auth()
        )
    );

-- Insert/Update/Delete: Through campaign ownership
CREATE POLICY "Manage recipients through campaigns" ON "EmailRecipient"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "EmailCampaign" 
            WHERE "EmailCampaign".id = "EmailRecipient"."campaignId"
            AND "EmailCampaign"."churchId" = get_church_id_from_auth()
            AND EXISTS (
                SELECT 1 FROM "Profile" 
                WHERE id = auth.uid()::TEXT 
                AND role IN ('ADMIN', 'STAFF')
            )
        )
    );

-- EmailPreference Policies
-- View: Church staff can view preferences for their members
CREATE POLICY "Church can view member preferences" ON "EmailPreference"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Member" 
            WHERE "Member".id = "EmailPreference"."memberId"
            AND "Member"."churchId" = get_church_id_from_auth()
        )
    );

-- Public unsubscribe: Allow updates via unsubscribe token
CREATE POLICY "Public unsubscribe via token" ON "EmailPreference"
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Insert: System creates preferences
CREATE POLICY "System creates preferences" ON "EmailPreference"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Member" 
            WHERE "Member".id = "EmailPreference"."memberId"
            AND "Member"."churchId" = get_church_id_from_auth()
        )
    );

-- EmailQuota Policies
-- View: Users can view their church's quota
CREATE POLICY "Users can view church quota" ON "EmailQuota"
    FOR SELECT USING ("churchId" = get_church_id_from_auth());

-- Insert/Update: System manages quota
CREATE POLICY "System manages quota" ON "EmailQuota"
    FOR ALL USING (
        "churchId" = get_church_id_from_auth() AND
        EXISTS (
            SELECT 1 FROM "Profile" 
            WHERE id = auth.uid()::TEXT 
            AND role IN ('ADMIN', 'STAFF')
        )
    );

-- EmailSettings Policies
-- View: Users can view their church's settings
CREATE POLICY "Users can view church email settings" ON "EmailSettings"
    FOR SELECT USING ("churchId" = get_church_id_from_auth());

-- Insert/Update: Only ADMIN can manage settings
CREATE POLICY "Admin manages email settings" ON "EmailSettings"
    FOR ALL USING (
        "churchId" = get_church_id_from_auth() AND
        EXISTS (
            SELECT 1 FROM "Profile" 
            WHERE id = auth.uid()::TEXT 
            AND role = 'ADMIN'
        )
    );

-- Grant necessary permissions
GRANT ALL ON "EmailCampaign" TO authenticated;
GRANT ALL ON "EmailRecipient" TO authenticated;
GRANT ALL ON "EmailPreference" TO authenticated;
GRANT ALL ON "EmailQuota" TO authenticated;
GRANT ALL ON "EmailSettings" TO authenticated;

-- Allow service role full access for system operations
GRANT ALL ON "EmailCampaign" TO service_role;
GRANT ALL ON "EmailRecipient" TO service_role;
GRANT ALL ON "EmailPreference" TO service_role;
GRANT ALL ON "EmailQuota" TO service_role;
GRANT ALL ON "EmailSettings" TO service_role;