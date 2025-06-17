-- Enable Row Level Security on the Donor table
ALTER TABLE public."Donor" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional, but good for idempotency)
DROP POLICY IF EXISTS "Allow church-specific access to donors" ON public."Donor";

-- Create the RLS policy
CREATE POLICY "Allow church-specific access to donors"
ON public."Donor"
FOR ALL -- Applies to SELECT, INSERT, UPDATE, DELETE
USING (
  "churchId" = (
    SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
)
WITH CHECK (
  "churchId" = (
    SELECT id FROM public."Church" WHERE "clerkOrgId" = (auth.jwt() ->> 'org_id')
  )
);

-- Force RLS for table owners as well (good practice)
ALTER TABLE public."Donor" FORCE ROW LEVEL SECURITY;
