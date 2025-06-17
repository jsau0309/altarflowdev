-- Enable Row Level Security on the Member table
ALTER TABLE public."Member" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional, but good for idempotency)
DROP POLICY IF EXISTS "Allow church-specific access to members" ON public."Member";

-- Create the RLS policy
CREATE POLICY "Allow church-specific access to members"
ON public."Member"
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
ALTER TABLE public."Member" FORCE ROW LEVEL SECURITY;
