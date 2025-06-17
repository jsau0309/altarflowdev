-- RLS for StripeConnectAccount
ALTER TABLE public."StripeConnectAccount" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow church-specific access to stripe connect accounts" ON public."StripeConnectAccount";
CREATE POLICY "Allow church-specific access to stripe connect accounts" ON public."StripeConnectAccount" FOR ALL USING ( "churchId" = (auth.jwt() ->> 'org_id') ) WITH CHECK ( "churchId" = (auth.jwt() ->> 'org_id') );
ALTER TABLE public."StripeConnectAccount" FORCE ROW LEVEL SECURITY;

-- RLS for Submission
ALTER TABLE public."Submission" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow church-specific access to submissions" ON public."Submission";
CREATE POLICY "Allow church-specific access to submissions" ON public."Submission" FOR ALL USING ( EXISTS ( SELECT 1 FROM public."Flow" f WHERE f.id = "Submission"."flowId" AND f."churchId" = ( SELECT c.id FROM public."Church" c WHERE c."clerkOrgId" = (auth.jwt() ->> 'org_id') ) ) ) WITH CHECK ( EXISTS ( SELECT 1 FROM public."Flow" f WHERE f.id = "Submission"."flowId" AND f."churchId" = ( SELECT c.id FROM public."Church" c WHERE c."clerkOrgId" = (auth.jwt() ->> 'org_id') ) ) );
ALTER TABLE public."Submission" FORCE ROW LEVEL SECURITY;
