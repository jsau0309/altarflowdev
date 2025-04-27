-- Helper function to get the current user's church_id from their profile
CREATE OR REPLACE FUNCTION public.get_my_church_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT "churchId" FROM public."Profile" WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_church_id() TO authenticated;

-- Profile Table RLS
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own profile" ON public."Profile" FOR SELECT USING (id = auth.uid());
CREATE POLICY "Allow users to update their own profile" ON public."Profile" FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Church Table RLS
ALTER TABLE public."Church" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view their own church" ON public."Church" FOR SELECT USING (id = public.get_my_church_id());

-- Campaign Table RLS
ALTER TABLE public."Campaign" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage campaigns of their church" ON public."Campaign" FOR ALL USING ( "churchId" = public.get_my_church_id() ) WITH CHECK ( "churchId" = public.get_my_church_id() );

-- Donation Table RLS
ALTER TABLE public."Donation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage donations of their church" ON public."Donation" FOR ALL USING ( "churchId" = public.get_my_church_id() ) WITH CHECK ( "churchId" = public.get_my_church_id() );

-- Expense Table RLS
ALTER TABLE public."Expense" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage expenses of their church" ON public."Expense" FOR ALL USING ( "churchId" = public.get_my_church_id() ) WITH CHECK ( "churchId" = public.get_my_church_id() );

-- Member Table RLS
ALTER TABLE public."Member" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage members of their church" ON public."Member" FOR ALL USING ( "churchId" = public.get_my_church_id() ) WITH CHECK ( "churchId" = public.get_my_church_id() );
