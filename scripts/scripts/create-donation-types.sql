-- Create default donation types for Altarflow Church

DO $$
DECLARE
  church_id UUID := 'a5b338b3-9851-4b53-833d-174feb29b467';
BEGIN
  -- Insert missing donation types (skip if they already exist)
  INSERT INTO "DonationType" ("id", "churchId", "name", "description", "isRecurringAllowed", "createdAt", "updatedAt")
  VALUES
    ('dt_tithe_' || substr(md5(random()::text), 1, 10), church_id, 'Tithe', 'Regular tithe offering (10% of income)', true, NOW(), NOW()),
    ('dt_offer_' || substr(md5(random()::text), 1, 10), church_id, 'Offering', 'General offering for church operations', true, NOW(), NOW()),
    ('dt_build_' || substr(md5(random()::text), 1, 10), church_id, 'Building Fund', 'Contributions for church building and facilities', true, NOW(), NOW()),
    ('dt_missi_' || substr(md5(random()::text), 1, 10), church_id, 'Missions', 'Support for missionary work and outreach', true, NOW(), NOW()),
    ('dt_youth_' || substr(md5(random()::text), 1, 10), church_id, 'Youth Ministry', 'Support for youth programs and activities', true, NOW(), NOW()),
    ('dt_benev_' || substr(md5(random()::text), 1, 10), church_id, 'Benevolence', 'Help for those in need', false, NOW(), NOW()),
    ('dt_speci_' || substr(md5(random()::text), 1, 10), church_id, 'Special Offering', 'Special collections and designated gifts', false, NOW(), NOW())
  ON CONFLICT ("churchId", "name") DO NOTHING;
    
  RAISE NOTICE 'Created donation types for Altarflow Church';
  
  -- Show created types
  RAISE NOTICE '';
  RAISE NOTICE 'Donation Types Created:';
  RAISE NOTICE '-----------------------';
  
  PERFORM "name", "description"
  FROM "DonationType"
  WHERE "churchId" = church_id
  ORDER BY "name";
  
END $$;