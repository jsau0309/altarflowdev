-- Drop existing RLS policies on Profile table that use the id column
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public."Profile";
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public."Profile";

-- Alter Profile.id from TEXT to UUID
ALTER TABLE public."Profile"
ALTER COLUMN id SET DATA TYPE UUID USING (id::uuid);

-- Alter Profile.churchId from TEXT to UUID
-- Note: This assumes all existing non-NULL churchId values are valid UUID strings.
-- If any are invalid, this command will fail.
ALTER TABLE public."Profile"
ALTER COLUMN "churchId" SET DATA TYPE UUID USING ("churchId"::uuid);

-- Update the foreign key constraint if it exists (adjust constraint name if necessary)
-- First drop the existing constraint if it references the old TEXT type
ALTER TABLE public."Profile" DROP CONSTRAINT IF EXISTS "Profile_churchId_fkey";

-- Then add the constraint referencing the Church.id UUID type
ALTER TABLE public."Profile"
ADD CONSTRAINT "Profile_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES public."Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Also update the foreign key constraint linking Profile.id to auth.users.id if you have one.
-- This depends on how your initial schema was set up. If Profile.id should directly reference auth.users.id:
-- ALTER TABLE public."Profile" DROP CONSTRAINT IF EXISTS "Profile_id_fkey"; -- Replace with actual constraint name if exists
-- ALTER TABLE public."Profile" ADD CONSTRAINT "Profile_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- However, managing this explicit FK to auth.users can sometimes be complex, often it's omitted and the relationship is implicit.

-- Recreate the RLS policies on Profile table
CREATE POLICY "Allow users to view their own profile" ON public."Profile" FOR SELECT USING (id = auth.uid());
CREATE POLICY "Allow users to update their own profile" ON public."Profile" FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
