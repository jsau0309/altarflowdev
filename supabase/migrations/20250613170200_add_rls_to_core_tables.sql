-- RLS for DonationType
ALTER TABLE public."DonationType" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow church-specific access to donation types" ON public."DonationType";
CREATE POLICY "Allow church-specific access to donation types" ON public."DonationType" FOR ALL USING ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) ) WITH CHECK ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) );
ALTER TABLE public."DonationType" FORCE ROW LEVEL SECURITY;

-- RLS for DonationTransaction
ALTER TABLE public."DonationTransaction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow church-specific access to donation transactions" ON public."DonationTransaction";
CREATE POLICY "Allow church-specific access to donation transactions" ON public."DonationTransaction" FOR ALL USING ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) ) WITH CHECK ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) );
ALTER TABLE public."DonationTransaction" FORCE ROW LEVEL SECURITY;

-- RLS for Campaign
ALTER TABLE public."Campaign" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow church-specific access to campaigns" ON public."Campaign";
CREATE POLICY "Allow church-specific access to campaigns" ON public."Campaign" FOR ALL USING ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) ) WITH CHECK ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) );
ALTER TABLE public."Campaign" FORCE ROW LEVEL SECURITY;

-- RLS for Donation
ALTER TABLE public."Donation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow church-specific access to donations" ON public."Donation";
CREATE POLICY "Allow church-specific access to donations" ON public."Donation" FOR ALL USING ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) ) WITH CHECK ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) );
ALTER TABLE public."Donation" FORCE ROW LEVEL SECURITY;

-- RLS for Expense
ALTER TABLE public."Expense" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow church-specific access to expenses" ON public."Expense";
CREATE POLICY "Allow church-specific access to expenses" ON public."Expense" FOR ALL USING ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) ) WITH CHECK ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) );
ALTER TABLE public."Expense" FORCE ROW LEVEL SECURITY;

-- RLS for Flow
ALTER TABLE public."Flow" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow church-specific access to flows" ON public."Flow";
CREATE POLICY "Allow church-specific access to flows" ON public."Flow" FOR ALL USING ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) ) WITH CHECK ( "churchId" = ( SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id') ) );
ALTER TABLE public."Flow" FORCE ROW LEVEL SECURITY;
