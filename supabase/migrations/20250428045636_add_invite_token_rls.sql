-- Enable Row Level Security for InviteToken table
ALTER TABLE public."InviteToken" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view tokens for their own church
CREATE POLICY "Allow users to view invites for their church" 
ON public."InviteToken" FOR SELECT 
USING ( "churchId" = public.get_my_church_id() );

-- Allow authenticated users (specifically ADMINs, checked in API) to insert tokens for their own church
CREATE POLICY "Allow users to insert invites for their church" 
ON public."InviteToken" FOR INSERT 
WITH CHECK ( "churchId" = public.get_my_church_id() );

-- Allow authenticated users (specifically ADMINs, checked in API if needed) to delete tokens for their own church
CREATE POLICY "Allow users to delete invites for their church" 
ON public."InviteToken" FOR DELETE 
USING ( "churchId" = public.get_my_church_id() );

-- Explicitly disallow updating invite tokens via RLS
CREATE POLICY "Disallow updating invites" 
ON public."InviteToken" FOR UPDATE 
USING (false);
