-- Demo Donations for Altarflow Church
-- Creates realistic donation patterns with growth, summer peak, and August decrease
-- Respects donor creation dates (no donations before they joined)

DO $$
DECLARE
  church_id UUID := 'a5b338b3-9851-4b53-833d-174feb29b467';
  donor_record RECORD;
  month_num INT;
  donation_count INT := 0;
  donation_date DATE;
  donation_amount INT;
  transaction_id TEXT;
  
  -- Monthly donation multipliers (controls volume)
  -- Higher = more donations that month
  month_multipliers DECIMAL[] := ARRAY[
    0.6,  -- January (slow start)
    0.7,  -- February
    0.8,  -- March
    0.9,  -- April
    1.0,  -- May (normal)
    1.3,  -- June (summer peak)
    1.4,  -- July (summer peak)
    1.1   -- August (slight decrease)
  ];
  
  -- Base donation amounts in cents (for variety)
  base_amounts INT[] := ARRAY[
    2500,   -- $25
    5000,   -- $50
    7500,   -- $75
    10000,  -- $100
    15000,  -- $150
    20000,  -- $200
    25000,  -- $250
    50000,  -- $500
    100000  -- $1000
  ];
  
BEGIN
  RAISE NOTICE 'Creating demo donations for Altarflow Church...';
  RAISE NOTICE 'Pattern: Slow growth → Summer peak (Jun/Jul) → Slight decrease (Aug)';
  RAISE NOTICE '';
  
  -- Delete existing demo donations if any (for re-runs)
  DELETE FROM "DonationTransaction"
  WHERE "churchId" = church_id
    AND "source" = 'manual'
    AND "donorId" IN (
      SELECT "id" FROM "Donor" 
      WHERE "email" LIKE 'delivered+user%@resend.dev'
    );
  
  -- Process each donor
  FOR donor_record IN
    SELECT 
      d."id" as donor_id,
      d."firstName",
      d."lastName",
      d."email",
      d."createdAt",
      EXTRACT(MONTH FROM d."createdAt")::INT as join_month
    FROM "Donor" d
    WHERE d."churchId" = church_id
      AND d."email" LIKE 'delivered+user%@resend.dev'
    ORDER BY d."createdAt"
  LOOP
    -- Each donor makes donations after they joined
    FOR month_num IN donor_record.join_month..8 LOOP
      -- Determine if donor donates this month (probability based on multiplier)
      -- Not everyone donates every month
      IF random() < (month_multipliers[month_num] * 0.7) THEN
        
        -- Generate 1-3 donations per month (tithe, offering, special)
        FOR i IN 1..(1 + floor(random() * 3)::int) LOOP
          -- Random day within the month
          donation_date := DATE '2025-01-01' + 
            INTERVAL '1 month' * (month_num - 1) + 
            INTERVAL '1 day' * floor(random() * 28)::int;
          
          -- Skip if donation would be before donor joined
          IF donation_date < donor_record."createdAt" THEN
            CONTINUE;
          END IF;
          
          -- Calculate amount with summer boost
          donation_amount := base_amounts[1 + floor(random() * array_length(base_amounts, 1))::int];
          
          -- Add variance (+/- 20%)
          donation_amount := donation_amount * (0.8 + random() * 0.4);
          
          -- Summer months get higher amounts
          IF month_num IN (6, 7) THEN
            donation_amount := donation_amount * 1.2;
          END IF;
          
          -- Generate transaction ID
          transaction_id := 'demo_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
          
          -- Insert donation transaction
          INSERT INTO "DonationTransaction" (
            "id",
            "churchId",
            "donationTypeId",
            "donorId",
            "donorName",
            "donorEmail",
            "amount",
            "currency",
            "status",
            "paymentMethodType",
            "isRecurring",
            "transactionDate",
            "processedAt",
            "source",
            "createdAt",
            "processingFeeCoveredByDonor"
          ) 
          SELECT
            transaction_id,
            church_id,
            dt."id", -- Get a random donation type
            donor_record.donor_id,
            donor_record."firstName" || ' ' || donor_record."lastName",
            donor_record."email",
            donation_amount::INT,
            'usd',
            'succeeded',
            CASE floor(random() * 4)::int
              WHEN 0 THEN 'cash'
              WHEN 1 THEN 'check'
              WHEN 2 THEN 'card'
              ELSE 'bank_transfer'
            END,
            false,
            donation_date,
            donation_date + INTERVAL '1 hour',
            'manual',
            donation_date,
            0
          FROM "DonationType" dt
          WHERE dt."churchId" = church_id
          ORDER BY random()
          LIMIT 1;
          
          donation_count := donation_count + 1;
        END LOOP;
      END IF;
    END LOOP;
    
    IF donation_count % 50 = 0 THEN
      RAISE NOTICE 'Created % donations...', donation_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Successfully created % demo donations!', donation_count;
  
  -- Display summary by month
  RAISE NOTICE '';
  RAISE NOTICE 'Monthly Summary:';
  RAISE NOTICE '----------------';
  
  FOR donor_record IN
    SELECT 
      TO_CHAR("transactionDate", 'Month') as month,
      COUNT(*) as donation_count,
      SUM("amount")/100.0 as total_amount,
      ROUND(AVG("amount")/100.0, 2) as avg_donation,
      COUNT(DISTINCT "donorId") as unique_donors
    FROM "DonationTransaction"
    WHERE "churchId" = church_id
      AND "source" = 'manual'
      AND EXTRACT(YEAR FROM "transactionDate") = 2025
    GROUP BY EXTRACT(MONTH FROM "transactionDate"), TO_CHAR("transactionDate", 'Month')
    ORDER BY EXTRACT(MONTH FROM MIN("transactionDate"))
  LOOP
    RAISE NOTICE '  %: % donations, $% total, $% avg, % donors', 
      RPAD(donor_record.month, 12),
      LPAD(donor_record.donation_count::text, 3),
      TO_CHAR(donor_record.total_amount, 'FM999,999.00'),
      TO_CHAR(donor_record.avg_donation, 'FM999.00'),
      donor_record.unique_donors;
  END LOOP;
  
  -- Show payment method distribution
  RAISE NOTICE '';
  RAISE NOTICE 'Payment Methods:';
  FOR donor_record IN
    SELECT 
      "paymentMethodType",
      COUNT(*) as count,
      ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 1) as percentage
    FROM "DonationTransaction"
    WHERE "churchId" = church_id
      AND "source" = 'manual'
    GROUP BY "paymentMethodType"
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  %: % donations (% percent)', 
      RPAD(donor_record."paymentMethodType", 15),
      donor_record.count,
      donor_record.percentage;
  END LOOP;
  
  -- Show grand totals
  SELECT INTO donor_record
    COUNT(*) as total_donations,
    SUM("amount")/100.0 as total_amount,
    COUNT(DISTINCT "donorId") as total_donors
  FROM "DonationTransaction"
  WHERE "churchId" = church_id
    AND "source" = 'manual';
    
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'GRAND TOTALS:';
  RAISE NOTICE '  Total Donations: %', donor_record.total_donations;
  RAISE NOTICE '  Total Amount: $%', TO_CHAR(donor_record.total_amount, 'FM999,999.00');
  RAISE NOTICE '  Active Donors: %', donor_record.total_donors;
  RAISE NOTICE '==========================================';
  
END $$;