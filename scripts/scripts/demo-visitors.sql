-- Demo Visitors for Altarflow Church
-- Creates 20 visitors: 4 in June, 6 in July, 10 in August 2025
-- Visitors have membershipStatus = 'Visitor' and limited information

DO $$
DECLARE
  church_id UUID := 'a5b338b3-9851-4b53-833d-174feb29b467';
  visitor_names TEXT[] := ARRAY[
    -- 20 visitor names (mix of Hispanic and other names)
    'David Chen', 'Emily Johnson', 'Marco Antonio', 'Sarah Williams',  -- June (4)
    'Jennifer Brown', 'Robert Taylor', 'Isabella Martinez', 'Michael Davis', 'Carmen Ortega', 'James Wilson',  -- July (6)
    'Linda Anderson', 'Jose Miguel', 'Patricia Thomas', 'Christopher Lee', 'Rosa Elena', 'Matthew White', 'Ana Sofia', 'Daniel Harris', 'Maria Fernanda', 'Kevin Clark'  -- August (10)
  ];
  phone_prefixes TEXT[] := ARRAY['305', '786', '954', '561', '407', '321', '813', '727'];
  i INT;
  visitor_count INT := 0;
  random_phone TEXT;
  visitor_id UUID;
  join_date DATE;
BEGIN
  -- Delete existing demo visitors if any
  DELETE FROM "Member" 
  WHERE "churchId" = church_id 
  AND "membershipStatus" = 'Visitor'
  AND "email" IS NULL
  AND "joinDate" >= '2025-06-01'
  AND "joinDate" <= '2025-08-31';
  
  RAISE NOTICE 'Creating 20 demo visitors for Altarflow Church...';
  RAISE NOTICE '4 in June, 6 in July, 10 in August 2025';
  
  -- Create visitors
  FOR i IN 1..20 LOOP
    -- Generate random phone number with Florida area codes
    random_phone := phone_prefixes[1 + floor(random() * array_length(phone_prefixes, 1))::int] || 
                    '-' || (100 + floor(random() * 900))::text || 
                    '-' || (1000 + floor(random() * 9000))::text;
    
    visitor_id := gen_random_uuid();
    
    -- Determine join date based on visitor number
    IF i <= 4 THEN
      -- June visitors (1-4)
      join_date := DATE '2025-06-01' + (floor(random() * 30))::int;
    ELSIF i <= 10 THEN
      -- July visitors (5-10)
      join_date := DATE '2025-07-01' + (floor(random() * 31))::int;
    ELSE
      -- August visitors (11-20)
      join_date := DATE '2025-08-01' + (floor(random() * 31))::int;
    END IF;
    
    INSERT INTO "Member" (
      "id",
      "churchId",
      "firstName",
      "lastName", 
      "email",
      "phone",
      "address",
      "city",
      "state",
      "zipCode",
      "joinDate",
      "smsConsent",
      "language",
      "membershipStatus",
      "notes",
      "createdAt",
      "updatedAt"
    ) VALUES (
      visitor_id,
      church_id,
      split_part(visitor_names[i], ' ', 1),  -- First name
      split_part(visitor_names[i], ' ', 2),  -- Last name
      NULL,  -- Email will be added manually for Resend
      random_phone,
      NULL,  -- Visitors typically don't provide full address
      CASE floor(random() * 8)::int
        WHEN 0 THEN 'Miami'
        WHEN 1 THEN 'Hialeah'
        WHEN 2 THEN 'Coral Gables'
        WHEN 3 THEN 'Kendall'
        WHEN 4 THEN 'Homestead'
        WHEN 5 THEN 'Aventura'
        WHEN 6 THEN 'Doral'
        ELSE 'Miami Beach'
      END,
      'FL',
      NULL,  -- Visitors may not provide zip code
      join_date,
      false,  -- smsConsent default false
      CASE floor(random() * 2)::int
        WHEN 0 THEN 'en'
        ELSE 'es'
      END,
      'Visitor'::public."MembershipStatus",  -- Mark as Visitor
      CASE floor(random() * 8)::int
        WHEN 0 THEN 'First time visitor'
        WHEN 1 THEN 'Visiting from out of town'
        WHEN 2 THEN 'Friend invited them'
        WHEN 3 THEN 'Found church online'
        WHEN 4 THEN 'Attended special event'
        WHEN 5 THEN 'Exploring faith'
        WHEN 6 THEN 'New to the area'
        ELSE 'Interested in joining'
      END,
      NOW(),
      NOW()
    );
    
    visitor_count := visitor_count + 1;
    
    IF visitor_count = 4 THEN
      RAISE NOTICE 'Created % visitors for June', visitor_count;
    ELSIF visitor_count = 10 THEN
      RAISE NOTICE 'Created % visitors for July', visitor_count - 4;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created % visitors for August', visitor_count - 10;
  RAISE NOTICE 'Successfully created 20 demo visitors!';
  
  -- Display summary
  RAISE NOTICE '';
  RAISE NOTICE 'Summary by month:';
  RAISE NOTICE '--------';
  
  -- June visitors
  RAISE NOTICE 'June 2025: % visitors', 
    (SELECT COUNT(*) FROM "Member" 
     WHERE "churchId" = church_id 
     AND "membershipStatus" = 'Visitor'
     AND "email" IS NULL
     AND EXTRACT(MONTH FROM "joinDate") = 6
     AND EXTRACT(YEAR FROM "joinDate") = 2025);
  
  -- July visitors
  RAISE NOTICE 'July 2025: % visitors',
    (SELECT COUNT(*) FROM "Member" 
     WHERE "churchId" = church_id 
     AND "membershipStatus" = 'Visitor'
     AND "email" IS NULL
     AND EXTRACT(MONTH FROM "joinDate") = 7
     AND EXTRACT(YEAR FROM "joinDate") = 2025);
     
  -- August visitors
  RAISE NOTICE 'August 2025: % visitors',
    (SELECT COUNT(*) FROM "Member" 
     WHERE "churchId" = church_id 
     AND "membershipStatus" = 'Visitor'
     AND "email" IS NULL
     AND EXTRACT(MONTH FROM "joinDate") = 8
     AND EXTRACT(YEAR FROM "joinDate") = 2025);
  
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Email addresses left NULL for manual addition with Resend emails';
  
END $$;