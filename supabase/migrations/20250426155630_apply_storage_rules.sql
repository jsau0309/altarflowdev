-- Function to check if a user (by auth.uid) belongs to a specific church
CREATE OR REPLACE FUNCTION public.is_user_member_of_church(user_id uuid, church_id_to_check uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Executes with definer's privileges, allowing access to Profile table
SET search_path = public -- Explicitly set search path
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "Profile" p
    WHERE p.id = user_id -- Profile.id matches auth.users.id
      AND p."churchId" = church_id_to_check
  );
$$;

-- Enable RLS on the storage objects table if not already enabled
-- Note: This might fail if RLS is already enabled, but it's generally safe to include.
-- Consider adding "IF NOT EXISTS" logic if your Postgres version supports it for ALTER TABLE ENABLE RLS, otherwise ignore potential error.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to INSERT into their specific church/user folder
CREATE POLICY "Allow authenticated user inserts into own church/user folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  -- Path format: {churchId}/receipts/{userId}/{filename}
  (string_to_array(name, '/'))[3]::uuid = auth.uid() AND -- Check userId (3rd segment) matches authenticated user
  public.is_user_member_of_church(auth.uid(), (string_to_array(name, '/'))[1]::uuid) = true -- Check user belongs to churchId (1st segment)
);

-- Policy: Allow authenticated users to SELECT/view files from their specific church/user folder
CREATE POLICY "Allow authenticated user selects from own church/user folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  -- Path format: {churchId}/receipts/{userId}/{filename}
  (string_to_array(name, '/'))[3]::uuid = auth.uid() AND -- Check userId (3rd segment) matches authenticated user
  public.is_user_member_of_church(auth.uid(), (string_to_array(name, '/'))[1]::uuid) = true -- Check user belongs to churchId (1st segment)
);
