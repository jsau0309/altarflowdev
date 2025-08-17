-- Fix donation types to only have Tithe and Offering
-- And reassign existing donations to these two types

DO $$
DECLARE
  church_id UUID := 'a5b338b3-9851-4b53-833d-174feb29b467';
  tithe_id TEXT;
  offering_id TEXT;
BEGIN
  -- Get or create Tithe type
  SELECT "id" INTO tithe_id 
  FROM "DonationType" 
  WHERE "churchId" = church_id AND "name" = 'Tithe'
  LIMIT 1;
  
  IF tithe_id IS NULL THEN
    tithe_id := 'dt_tithe_' || substr(md5(random()::text), 1, 10);
    INSERT INTO "DonationType" ("id", "churchId", "name", "description", "isRecurringAllowed")
    VALUES (tithe_id, church_id, 'Tithe', 'Regular tithe offering', true);
  END IF;
  
  -- Get or create Offering type
  SELECT "id" INTO offering_id 
  FROM "DonationType" 
  WHERE "churchId" = church_id AND "name" = 'Offering'
  LIMIT 1;
  
  IF offering_id IS NULL THEN
    offering_id := 'dt_offer_' || substr(md5(random()::text), 1, 10);
    INSERT INTO "DonationType" ("id", "churchId", "name", "description", "isRecurringAllowed")
    VALUES (offering_id, church_id, 'Offering', 'General offering', true);
  END IF;
  
  RAISE NOTICE 'Using Tithe ID: % and Offering ID: %', tithe_id, offering_id;
  
  -- Update all donations to use only these two types
  -- Randomly assign 60% as Tithe, 40% as Offering
  UPDATE "DonationTransaction"
  SET "donationTypeId" = 
    CASE 
      WHEN random() < 0.6 THEN tithe_id
      ELSE offering_id
    END
  WHERE "churchId" = church_id
    AND "donationTypeId" NOT IN (tithe_id, offering_id);
  
  -- Delete unused donation types (except Tithe and Offering)
  DELETE FROM "DonationType"
  WHERE "churchId" = church_id
    AND "name" NOT IN ('Tithe', 'Offering')
    AND "id" NOT IN (
      SELECT DISTINCT "donationTypeId" 
      FROM "DonationTransaction" 
      WHERE "churchId" = church_id
    );
  
  RAISE NOTICE 'Fixed donation types - now only Tithe and Offering exist';
  
  -- Show summary
  SELECT COUNT(*) INTO tithe_id
  FROM "DonationTransaction" dt
  JOIN "DonationType" dtype ON dt."donationTypeId" = dtype."id"
  WHERE dt."churchId" = church_id AND dtype."name" = 'Tithe';
  
  SELECT COUNT(*) INTO offering_id
  FROM "DonationTransaction" dt
  JOIN "DonationType" dtype ON dt."donationTypeId" = dtype."id"
  WHERE dt."churchId" = church_id AND dtype."name" = 'Offering';
  
  RAISE NOTICE 'Donation distribution: % Tithes, % Offerings', tithe_id, offering_id;
  
END $$;