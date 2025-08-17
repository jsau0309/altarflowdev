-- Fix donation amounts to be realistic compared to expenses
-- Target: $500,000 in donations (healthy church with strong giving)

DO $$
DECLARE
  church_id UUID := 'a5b338b3-9851-4b53-833d-174feb29b467';
  current_total DECIMAL;
  target_total DECIMAL := 500000;  -- Target $500,000 in donations
  scaling_factor DECIMAL;
  min_donation INT := 2500;  -- $25 minimum
  month_record RECORD;
BEGIN
  -- Get current total donations
  SELECT SUM("amount")/100.0 INTO current_total
  FROM "DonationTransaction"
  WHERE "churchId" = church_id
    AND EXTRACT(YEAR FROM "transactionDate") = 2025;
  
  RAISE NOTICE 'Current donation total: $%', TO_CHAR(current_total, 'FM999,999.00');
  RAISE NOTICE 'Target donation total: $%', TO_CHAR(target_total, 'FM999,999.00');
  
  -- Calculate scaling factor
  scaling_factor := target_total / NULLIF(current_total, 0);
  RAISE NOTICE 'Scaling factor: %', ROUND(scaling_factor, 2);
  
  -- Update all donation amounts
  UPDATE "DonationTransaction"
  SET "amount" = GREATEST(
    min_donation,  -- Ensure minimum $25
    ROUND("amount" * scaling_factor)::INT
  )
  WHERE "churchId" = church_id
    AND EXTRACT(YEAR FROM "transactionDate") = 2025;
  
  -- Verify new total
  SELECT SUM("amount")/100.0 INTO current_total
  FROM "DonationTransaction"
  WHERE "churchId" = church_id
    AND EXTRACT(YEAR FROM "transactionDate") = 2025;
  
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATED FINANCIALS:';
  RAISE NOTICE '==================';
  RAISE NOTICE 'Total Donations: $%', TO_CHAR(current_total, 'FM999,999.00');
  RAISE NOTICE 'Total Expenses:  $335,666.72';
  RAISE NOTICE 'Net Income:      $%', TO_CHAR(current_total - 335666.72, 'FM999,999.00');
  
  -- Show monthly breakdown with new amounts
  RAISE NOTICE '';
  RAISE NOTICE 'Monthly Donation Breakdown:';
  RAISE NOTICE '---------------------------';
  
  FOR month_record IN
    SELECT 
      TO_CHAR("transactionDate", 'Month') as month,
      COUNT(*) as count,
      SUM("amount")/100.0 as total
    FROM "DonationTransaction"
    WHERE "churchId" = church_id
      AND EXTRACT(YEAR FROM "transactionDate") = 2025
    GROUP BY EXTRACT(MONTH FROM "transactionDate"), TO_CHAR("transactionDate", 'Month')
    ORDER BY EXTRACT(MONTH FROM MIN("transactionDate"))
  LOOP
    RAISE NOTICE '  %: % donations = $%', 
      RPAD(month_record.month, 12),
      LPAD(month_record.count::text, 3),
      TO_CHAR(month_record.total, 'FM999,999.00');
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Church financial health: POSITIVE (donations exceed expenses)';
  
END $$;