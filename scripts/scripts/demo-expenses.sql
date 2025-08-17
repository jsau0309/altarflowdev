-- Demo Expenses for Altarflow Church
-- Creates 150 expenses from January to August 2025 with incremental amounts
-- IMPORTANT: Replace 'YOUR_CHURCH_ID' with your actual church ID

-- You can find your church ID by running:
-- SELECT id, name FROM "Church" WHERE name = 'Altarflow Church';

DO $$
DECLARE
  church_id uuid := 'a5b338b3-9851-4b53-833d-174feb29b467'::uuid; -- Altarflow Church ID
  submitter_id text := 'user_31Hysdc7CssLzmudn0C1KKUVq19'; -- Replace with a valid user ID from your system
  expense_date timestamp;
  expense_amount decimal(10,2);
  vendor_name text;
  expense_category text;
  expense_description text;
  month_num integer;
  day_num integer;
  expense_counter integer := 0;
  base_amount decimal := 50.00; -- Starting at $50.00
  
  -- Arrays for variety
  vendors text[] := ARRAY[
    'City Utilities', 'Office Depot', 'Walmart', 'Amazon', 'Staples', 
    'Home Depot', 'Costco', 'Sam''s Club', 'Target', 'Best Buy',
    'Spectrum Internet', 'AT&T', 'Cleaning Services LLC', 'ABC Maintenance',
    'Johnson''s Plumbing', 'Electric Pro Services', 'HVAC Solutions',
    'Church Insurance Co', 'Worship Supply Store', 'Christian Books & More',
    'Sound System Pro', 'Video Equipment Inc', 'Zoom', 'Microsoft',
    'Google Workspace', 'QuickBooks', 'Planning Center', 'Typeform',
    'Local Food Bank', 'Mission Support International'
  ];
  
  categories text[] := ARRAY[
    'utilities', 'office_supplies', 'maintenance', 'ministry', 
    'salaries', 'rent', 'insurance', 'other'
  ];
  
  descriptions_template text[] := ARRAY[
    'Monthly %s bill', 'Office supplies and %s', 'Maintenance for %s',
    'Ministry supplies - %s', 'Equipment for %s', 'Services for %s',
    'Subscription fee - %s', 'Repair services - %s', 'Purchase of %s',
    'Payment for %s', 'Supplies for %s event', 'Materials for %s'
  ];
  
  items text[] := ARRAY[
    'electricity', 'water', 'internet', 'phone service', 'cleaning',
    'printer supplies', 'paper', 'toner', 'computers', 'software',
    'building repairs', 'HVAC maintenance', 'plumbing', 'electrical work',
    'youth ministry', 'children''s ministry', 'worship team', 'small groups',
    'bibles', 'study materials', 'communion supplies', 'baptism supplies',
    'sound equipment', 'video equipment', 'streaming services', 'website hosting'
  ];

BEGIN
  -- Loop through each month (1=January to 8=August)
  FOR month_num IN 1..8 LOOP
    -- Calculate number of expenses for this month (fewer in early months, more in later months)
    -- January: 15, February: 16, March: 17, April: 18, May: 19, June: 20, July: 21, August: 22
    -- Total = 148, we'll add 2 more to August to make 150
    DECLARE
      expenses_this_month integer;
    BEGIN
      expenses_this_month := 14 + month_num; -- This gives us 15-22 expenses per month
      IF month_num = 8 THEN
        expenses_this_month := expenses_this_month + 2; -- Add 2 more to August to reach 150
      END IF;
      
      -- Generate expenses for this month
      FOR i IN 1..expenses_this_month LOOP
        expense_counter := expense_counter + 1;
        
        -- Generate a random day within the month
        day_num := 1 + floor(random() * 28)::integer; -- Use 28 to avoid invalid dates
        expense_date := make_date(2025, month_num, day_num)::timestamp;
        
        -- Calculate incremental amount with some variation
        -- Base increases by $10-50 per expense, with some randomness
        base_amount := base_amount + (10.00 + floor(random() * 40)::decimal); -- Add $10-$50
        
        -- Add some larger expenses occasionally (every 10th expense)
        IF expense_counter % 10 = 0 THEN
          expense_amount := base_amount + (100.00 + floor(random() * 200)::decimal); -- Add extra $100-$300
        ELSE
          expense_amount := base_amount + floor(random() * 50)::decimal; -- Add $0-$50 variation
        END IF;
        
        -- Select random vendor, category
        vendor_name := vendors[1 + floor(random() * array_length(vendors, 1))::integer];
        expense_category := categories[1 + floor(random() * array_length(categories, 1))::integer];
        
        -- Generate description
        expense_description := format(
          descriptions_template[1 + floor(random() * array_length(descriptions_template, 1))::integer],
          items[1 + floor(random() * array_length(items, 1))::integer]
        );
        
        -- Insert the expense
        INSERT INTO "Expense" (
          id, 
          "churchId", 
          "submitterId",
          vendor, 
          description, 
          amount,
          currency,
          "expenseDate", 
          category, 
          status, 
          "createdAt", 
          "updatedAt"
        )
        VALUES (
          gen_random_uuid(),
          church_id,
          submitter_id,
          vendor_name,
          expense_description,
          expense_amount,
          'USD',
          expense_date,
          expense_category,
          'PENDING'::public."ExpenseStatus",  -- All expenses are pending (v2 will have approval system)
          expense_date + interval '1 hour',  -- CreatedAt slightly after the expense date
          NOW()
        );
        
      END LOOP;
    END;
  END LOOP;
  
  RAISE NOTICE 'Successfully created % expenses from January to August 2025', expense_counter;
  
  -- Show summary
  RAISE NOTICE 'Summary by month:';
  FOR month_num IN 1..8 LOOP
    RAISE NOTICE 'Month %: % expenses', month_num, 
      (SELECT COUNT(*) FROM "Expense" 
       WHERE "churchId" = church_id 
       AND EXTRACT(MONTH FROM "expenseDate") = month_num 
       AND EXTRACT(YEAR FROM "expenseDate") = 2025);
  END LOOP;
  
END $$;

-- Verify the results
SELECT 
  EXTRACT(MONTH FROM "expenseDate") as month,
  TO_CHAR("expenseDate", 'Month') as month_name,
  COUNT(*) as expense_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM "Expense" 
WHERE "churchId" = 'a5b338b3-9851-4b53-833d-174feb29b467'
  AND EXTRACT(YEAR FROM "expenseDate") = 2025
GROUP BY EXTRACT(MONTH FROM "expenseDate"), TO_CHAR("expenseDate", 'Month')
ORDER BY month;

-- Show total summary
SELECT 
  COUNT(*) as total_expenses,
  SUM(amount) as total_amount,
  AVG(amount) as average_expense,
  MIN(amount) as smallest_expense,
  MAX(amount) as largest_expense
FROM "Expense" 
WHERE "churchId" = 'a5b338b3-9851-4b53-833d-174feb29b467'
  AND "expenseDate" >= '2025-01-01' 
  AND "expenseDate" <= '2025-08-31';