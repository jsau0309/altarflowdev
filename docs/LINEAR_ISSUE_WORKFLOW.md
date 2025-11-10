# Linear Issue Documentation Workflow

This guide outlines the standardized process for creating, planning, and documenting Linear issues in AltarFlow.

## Table of Contents
- [Overview](#overview)
- [Scenario 1: Implementation Planning](#scenario-1-implementation-planning)
- [Scenario 2: Completion Documentation](#scenario-2-completion-documentation)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Overview

**Two-Phase Documentation Approach:**

1. **Planning Phase** - Create detailed implementation plan BEFORE starting work
2. **Completion Phase** - Replace plan with comprehensive documentation AFTER finishing work

**Why This Approach?**
- Provides clear roadmap before development begins
- Ensures all stakeholders understand the scope
- Creates valuable historical reference for future team members
- Documents actual implementation details for maintenance

---

## Scenario 1: Implementation Planning

**When to Use:** Before starting any feature development or significant refactoring.

### Planning Template Structure

```markdown
## 🎯 Feature Overview

[2-3 sentence description of what will be built and why]

---

## 📋 Implementation Plan

### Phase 1: [Phase Name]
**Goal:** [What this phase accomplishes]

**Tasks:**
- [ ] Task 1 description
- [ ] Task 2 description
- [ ] Task 3 description

**Files to Modify:**
- `path/to/file1.ts` - [Brief description of changes]
- `path/to/file2.tsx` - [Brief description of changes]

**Estimated Time:** [X hours/days]

### Phase 2: [Phase Name]
[Repeat structure above]

---

## 🗄️ Database Changes

**Schema Modifications:**
```prisma
// Show planned schema changes
model NewModel {
  id String @id @default(uuid())
  // fields...
}
```

**Migration Plan:**
- Migration name: `migration_name_here`
- Destructive changes: Yes/No
- Rollback strategy: [If applicable]

---

## 🔌 API Endpoints

### Planned Endpoints

**POST /api/resource**
- Purpose: [What it does]
- Request body: [Expected fields]
- Response: [What it returns]
- Validation: [Rules to enforce]

**GET /api/resource**
- Purpose: [What it does]
- Query params: [Optional filters]
- Response: [What it returns]

[Add more endpoints as needed]

---

## 🎨 UI/UX Changes

**Components to Create:**
- `ComponentName.tsx` - [Purpose and functionality]

**Components to Modify:**
- `ExistingComponent.tsx` - [What changes and why]

**User Flow:**
1. User does X
2. System responds with Y
3. User sees Z

---

## 🔐 Security Considerations

- [ ] Authentication required: Yes/No
- [ ] Multi-tenant isolation: How it's enforced
- [ ] Input validation: What fields need validation
- [ ] Authorization checks: Who can access what

---

## 🧪 Testing Plan

**Unit Tests:**
- [ ] Test scenario 1
- [ ] Test scenario 2

**Integration Tests:**
- [ ] Test API endpoint 1
- [ ] Test API endpoint 2

**Manual Testing:**
- [ ] Test user flow 1
- [ ] Test user flow 2
- [ ] Test edge case X

---

## 📦 Dependencies

**New Packages:**
- `package-name` - Why it's needed

**Environment Variables:**
- `NEW_ENV_VAR` - Purpose and where to obtain

---

## 🚨 Risks & Considerations

- **Risk 1:** [Description and mitigation strategy]
- **Risk 2:** [Description and mitigation strategy]

---

## 📚 Reference Links

- [Related Linear Issue](link)
- [Design Mockup](link)
- [Technical Specification](link)
```

### How to Create Planning Documentation

1. **Create the Linear issue** with basic title and labels
2. **Copy the planning template** above
3. **Fill in all sections** based on requirements
4. **Update issue description** in Linear with the plan
5. **Share with team** for review and approval
6. **Start development** following the plan

---

## Scenario 2: Completion Documentation

**When to Use:** After feature is fully implemented, tested, and ready for production.

### Completion Template Structure

```markdown
## 🎉 [Feature Name] - Implementation Complete

### ✅ Implementation Summary

**What Was Built:**
[2-3 sentences describing the completed feature]

**Key Features:**
- Feature 1 description
- Feature 2 description
- Feature 3 description

---

### 🗄️ Database Schema

**File:** `prisma/schema.prisma`

```prisma
// Show actual implemented schema
model ActualModel {
  id          String   @id @default(uuid()) @db.Uuid
  // all fields as implemented
}
```

**Migrations Created:**
- `TIMESTAMP_migration_name` - What it does

---

### 🔌 API Endpoints

**File:** `path/to/api/route.ts`

#### POST /api/resource
- **Purpose:** [What it does]
- **Authentication:** Required via Clerk
- **Request Body:**
  ```typescript
  {
    field1: string;  // description
    field2: number;  // description
  }
  ```
- **Response:**
  ```typescript
  {
    success: boolean;
    data: Resource;
  }
  ```
- **Validation:**
  - field1: [Validation rules]
  - field2: [Validation rules]
- **Security:** [How multi-tenant isolation is enforced]

#### GET /api/resource
[Repeat structure for each endpoint]

---

### 🎨 Frontend Components

**File:** `components/feature/component-name.tsx`

**Features Implemented:**
- Feature 1 with implementation details
- Feature 2 with implementation details
- Feature 3 with implementation details

**Key Functions:**
- `functionName()` - What it does
- `handleAction()` - What it does

**State Management:**
- State variables used and their purpose
- How data flows between components

**User Interactions:**
1. User action A triggers B
2. Component responds with C
3. Data is updated via D

---

### 🌐 Integration Points

**Landing Page Integration:**
- Where feature appears
- How it's displayed
- Conditions for visibility

**Other Integrations:**
- Integration 1 description
- Integration 2 description

---

### 📁 Files Modified

#### Database & Schema
- `prisma/schema.prisma` - Added [Model] with [fields]

#### API Routes
- `app/api/feature/route.ts` - POST (create) and GET (list) endpoints
- `app/api/feature/[id]/route.ts` - PATCH (update) and DELETE endpoints

#### Components
- `components/feature/component.tsx` - Full feature UI (NEW FILE)
- `components/existing/component.tsx` - Integration changes

#### Translations
- `locales/en/namespace.json` - English translations added
- `locales/es/namespace.json` - Spanish translations added

#### Other Files
- `path/to/file.ts` - What changed and why

---

### 🔧 Technical Implementation Details

#### [Technical Aspect 1]
[Explanation of complex implementation]

**Code Example:**
```typescript
// Show important code snippets
function keyFunction() {
  // implementation
}
```

**Why This Approach:**
[Explain technical decisions made]

#### [Technical Aspect 2]
[Repeat for other technical details]

---

### 🔐 Security Implementation

**Multi-Tenant Isolation:**
- How data is scoped to churches
- Verification process in API routes

**Authentication:**
- Clerk integration details
- Role-based access (if applicable)

**Validation:**
- Input validation rules enforced
- Error handling approach

**Authorization:**
- Who can perform what actions
- How permissions are checked

---

### ✅ Testing & Verification

**Tests Completed:**
- ✅ TypeScript compilation - No errors
- ✅ Build process - Successful
- ✅ Unit tests - [X tests passing]
- ✅ Integration tests - [X scenarios tested]
- ✅ Manual testing - [X flows verified]
- ✅ Edge cases - [X scenarios handled]
- ✅ Bilingual support - English/Spanish verified
- ✅ Responsive design - Mobile/Desktop tested
- ✅ Multi-tenant isolation - Data properly scoped

**Production Ready:** [Yes/No with explanation]

---

### 📚 Future Team Member Notes

**Working with [Feature]:**
- Key concept 1 to understand
- Key concept 2 to understand
- Common gotchas to avoid

**Code Structure:**
- How files are organized
- Where to find specific functionality
- Naming conventions used

**Extending This Feature:**
- How to add new [capability]
- Where to modify for [change]
- Dependencies to be aware of

**Maintenance Notes:**
- Potential performance considerations
- Monitoring recommendations
- Known limitations (if any)

---

### 🚀 Deployment Notes

**Environment Variables:**
- `ENV_VAR_1` - Purpose and value
- `ENV_VAR_2` - Purpose and value

**Database Migrations:**
- Run `npx prisma migrate deploy` in production
- Expected migration time: [estimate]
- Rollback procedure: [if needed]

**Post-Deployment Verification:**
- [ ] Check 1
- [ ] Check 2
- [ ] Check 3

**Monitoring:**
- Metrics to watch: [list]
- Expected behavior: [description]
```

### How to Create Completion Documentation

1. **Start from planning doc** (if available) or blank template
2. **Replace ALL planned sections** with actual implementation
3. **Include code examples** for complex parts
4. **Document all files changed** with specific details
5. **Add testing verification** showing all tests passed
6. **Include future team member notes** for maintenance
7. **Update Linear issue description** with completion doc
8. **Move issue to "Done"** status

---

## Best Practices

### During Planning

✅ **DO:**
- Be specific about files and changes
- Include estimated time for each phase
- Document security considerations upfront
- List all dependencies and risks
- Get team review before starting

❌ **DON'T:**
- Skip sections as "TBD"
- Be vague about implementation details
- Ignore security or testing plans
- Start coding before plan is approved

### During Implementation

✅ **DO:**
- Follow the plan as much as possible
- Update plan if significant changes needed
- Track deviations and document why
- Test as you build each phase

❌ **DON'T:**
- Ignore the plan completely
- Make major changes without updating plan
- Skip testing until the end

### During Documentation

✅ **DO:**
- Replace planning doc with completion doc
- Include actual code examples
- Document ALL files changed
- Add maintenance notes for future team
- Be thorough - this is historical reference

❌ **DON'T:**
- Leave planning sections in completion doc
- Skip technical implementation details
- Forget to document edge cases
- Rush through the documentation

---

## Examples

### Example: Planning Phase

**Issue:** ALT-100 - Add Email Verification System

```markdown
## 🎯 Feature Overview

Implement email verification system to ensure member emails are valid before sending campaigns. Users will receive a verification link and must confirm their email address.

## 📋 Implementation Plan

### Phase 1: Database Schema
- [ ] Add `emailVerified` boolean field to Member model
- [ ] Add `emailVerificationToken` string field
- [ ] Add `emailVerificationExpiry` datetime field
- [ ] Create migration

### Phase 2: API Endpoints
- [ ] POST /api/members/send-verification - Send verification email
- [ ] GET /api/members/verify/[token] - Verify email with token
- [ ] Add verification check to campaign sending logic

### Phase 3: UI Components
- [ ] Add verification status indicator to member list
- [ ] Add "Resend Verification" button
- [ ] Create verification success page
- [ ] Update member form to trigger verification

## 🗄️ Database Changes

**Schema:**
```prisma
model Member {
  // existing fields...
  emailVerified          Boolean?  @default(false)
  emailVerificationToken String?   @db.VarChar(255)
  emailVerificationExpiry DateTime?
}
```

**Migration:** `add_email_verification_to_members`

[Continue with full planning template...]
```

### Example: Completion Phase

**Issue:** ALT-76 - Landing Manager Events Manager

[See the actual ALT-76 issue description for a real example]

---

## Quick Reference Checklist

### Starting New Feature

- [ ] Create Linear issue with basic info
- [ ] Use Planning Template
- [ ] Fill in all sections thoroughly
- [ ] Get team review and approval
- [ ] Begin implementation following plan

### Finishing Feature

- [ ] Complete all implementation and testing
- [ ] Use Completion Template
- [ ] Replace planning doc with completion doc
- [ ] Document all files changed
- [ ] Include code examples and technical details
- [ ] Add future team member notes
- [ ] Update Linear issue description
- [ ] Move issue to Done

---

## Template Files

For quick access, save these templates:

- **Planning Template:** Use when creating new features
- **Completion Template:** Use when finishing features

Both templates are provided in full above and can be copied directly.

---

## Maintaining This Workflow

**This workflow is living documentation.** As the team discovers better practices:

1. Update this document with improvements
2. Share learnings with the team
3. Keep templates current with actual usage
4. Add more examples as needed

**Goal:** Every Linear issue should tell a complete story - from planning to implementation to maintenance.
