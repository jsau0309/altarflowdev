-- Demo Members for Altarflow Church
-- Creates 50 members with realistic Hispanic names and phone numbers
-- Email field left NULL for manual addition with Resend emails

DO $$
DECLARE
  church_id UUID := 'a5b338b3-9851-4b53-833d-174feb29b467';
  member_names TEXT[] := ARRAY[
    -- 50 common Hispanic names (mix of male and female)
    'Carlos Rodriguez', 'Maria Garcia', 'Juan Martinez', 'Ana Lopez', 'Miguel Hernandez',
    'Carmen Gonzalez', 'Jose Perez', 'Isabel Sanchez', 'Luis Ramirez', 'Elena Torres',
    'Francisco Rivera', 'Rosa Flores', 'Antonio Morales', 'Laura Diaz', 'Manuel Gutierrez',
    'Sofia Ruiz', 'Pedro Jimenez', 'Lucia Vargas', 'Ricardo Castro', 'Patricia Mendoza',
    'Alberto Romero', 'Gloria Herrera', 'Eduardo Medina', 'Veronica Aguilar', 'Sergio Silva',
    'Andrea Vega', 'Fernando Campos', 'Claudia Delgado', 'Alejandro Ortiz', 'Monica Guerrero',
    'Roberto Cruz', 'Diana Ramos', 'Javier Mendez', 'Carolina Guzman', 'Oscar Rojas',
    'Beatriz Moreno', 'Raul Santos', 'Adriana Castillo', 'Marcos Nunez', 'Valeria Dominguez',
    'Andres Vazquez', 'Gabriela Leon', 'Diego Paredes', 'Natalia Cordova', 'Pablo Navarro',
    'Mariana Salazar', 'Hector Rios', 'Daniela Molina', 'Victor Espinoza', 'Alicia Padilla'
  ];
  phone_prefixes TEXT[] := ARRAY['305', '786', '954', '561', '407', '321', '813', '727'];
  i INT;
  random_phone TEXT;
  member_id UUID;
BEGIN
  -- Delete existing demo members if any
  DELETE FROM "Member" 
  WHERE "churchId" = church_id 
  AND "email" IS NULL
  AND "firstName" || ' ' || "lastName" = ANY(member_names);
  
  RAISE NOTICE 'Creating 50 demo members for Altarflow Church...';
  
  -- Create 50 members
  FOR i IN 1..50 LOOP
    -- Generate random phone number with Florida area codes
    random_phone := phone_prefixes[1 + floor(random() * array_length(phone_prefixes, 1))::int] || 
                    '-' || (100 + floor(random() * 900))::text || 
                    '-' || (1000 + floor(random() * 9000))::text;
    
    member_id := gen_random_uuid();
    
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
      member_id,
      church_id,
      split_part(member_names[i], ' ', 1),  -- First name
      split_part(member_names[i], ' ', 2),  -- Last name
      NULL,  -- Email will be added manually for Resend
      random_phone,
      (100 + floor(random() * 9900))::text || ' SW ' || 
        CASE floor(random() * 10)::int
          WHEN 0 THEN '8th St'
          WHEN 1 THEN 'Flagler St'
          WHEN 2 THEN 'Calle Ocho'
          WHEN 3 THEN 'Coral Way'
          WHEN 4 THEN 'Bird Rd'
          WHEN 5 THEN 'Sunset Dr'
          WHEN 6 THEN 'Kendall Dr'
          WHEN 7 THEN 'Miller Dr'
          WHEN 8 THEN 'Tamiami Trail'
          ELSE 'Collins Ave'
        END,
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
      (33100 + floor(random() * 100))::text,
      -- Random join dates between January 2025 and August 2025
      DATE '2025-01-01' + (random() * (DATE '2025-08-31' - DATE '2025-01-01'))::int,
      false,  -- smsConsent default false
      CASE floor(random() * 2)::int
        WHEN 0 THEN 'en'
        ELSE 'es'
      END,
      'Member'::public."MembershipStatus",
      CASE floor(random() * 10)::int
        WHEN 0 THEN 'Active member, attends regularly'
        WHEN 1 THEN 'Youth group leader'
        WHEN 2 THEN 'Worship team member'
        WHEN 3 THEN 'Small group participant'
        WHEN 4 THEN 'Volunteer - children''s ministry'
        WHEN 5 THEN 'Deacon'
        WHEN 6 THEN 'New member - joined this year'
        WHEN 7 THEN 'Prayer team member'
        WHEN 8 THEN 'Usher team'
        ELSE 'Regular attendee'
      END,
      NOW(),
      NOW()
    );
    
    IF i % 10 = 0 THEN
      RAISE NOTICE 'Created % members...', i;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Successfully created 50 demo members!';
  
  -- Display summary
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '--------';
  RAISE NOTICE 'Total members created: %', 
    (SELECT COUNT(*) FROM "Member" 
     WHERE "churchId" = church_id 
     AND "email" IS NULL
     AND "createdAt" >= NOW() - INTERVAL '1 minute');
  
  RAISE NOTICE 'Cities represented: %',
    (SELECT COUNT(DISTINCT "city") FROM "Member" 
     WHERE "churchId" = church_id 
     AND "email" IS NULL
     AND "createdAt" >= NOW() - INTERVAL '1 minute');
     
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Email addresses left NULL for manual addition with Resend emails';
  
END $$;