# Claude Instructions for AltarFlow Development

## Project Overview
AltarFlow is a church management application built with Next.js, Supabase, and TypeScript. It helps churches manage members, donations, funds, and generate reports.

## Key Technologies
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL), Edge Functions
- **Authentication**: Supabase Auth
- **AI Features**: OpenAI API for report summaries
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

## Project Structure
```
/app              # Next.js app directory
  /api            # API routes
  /dashboard      # Main application pages
    /members      # Member management
    /donations    # Donation tracking
    /funds        # Fund management
    /reports      # Reporting features
/components       # Reusable React components
  /ui             # shadcn/ui components
/lib              # Utilities and configurations
/supabase         # Database migrations and types
/public           # Static assets
```

## Development Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run typecheck

# Database types generation
npm run db:types
```

## Database Schema
- **members**: Church member information
- **donations**: Donation records linked to members and funds
- **funds**: Different donation funds/categories
- **donors**: Non-member donor information
- **profiles**: User profiles for authentication

## Key Features
1. **Member Management**: Add, edit, and track church members
2. **Donation Tracking**: Record donations with member/donor attribution
3. **Fund Management**: Organize donations into different funds
4. **Reporting**: Generate donation reports with AI summaries
5. **Charts**: Visualize donation data with interactive charts

## Coding Standards
- Use TypeScript for all new code
- Follow existing component patterns in the codebase
- Use shadcn/ui components for UI consistency
- Implement proper error handling and loading states
- Use Supabase RLS policies for data security
- Follow the existing file naming conventions (kebab-case)

## Testing Approach
- Manual testing in development environment
- Verify Supabase RLS policies work correctly
- Test responsive design on different screen sizes
- Ensure proper error handling for API calls

## Important Notes
- Always check for existing patterns before implementing new features
- Use the Supabase client from `@/lib/supabase/client` for database operations
- Follow the existing form validation patterns using React Hook Form and Zod
- Maintain consistency with the existing UI/UX design
- Check for proper authentication before accessing protected routes