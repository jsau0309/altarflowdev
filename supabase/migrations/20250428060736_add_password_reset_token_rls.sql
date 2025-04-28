-- Enable Row Level Security for PasswordResetToken table
-- By default, without specific ALLOW policies, access will be denied for standard users.
-- Backend operations (create, lookup by token, delete) will use elevated privileges.
ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
