# Branch Merge Workflow

This guide outlines the process for bringing a feature branch up to date with the latest `main` branch before review and deployment.

## Table of Contents
- [Overview](#overview)
- [Quick Reference](#quick-reference)
- [Step-by-Step Workflow](#step-by-step-workflow)
- [Handling Merge Conflicts](#handling-merge-conflicts)
- [Multiple Branches Scenario](#multiple-branches-scenario)
- [Pre-Deployment Checklist](#pre-deployment-checklist)

---

## Overview

**Why This Workflow?**

When multiple team members work on different branches simultaneously, feature branches can become outdated. Before merging to `main`, you must:

1. Bring your branch up to date with the latest `main`
2. Resolve any conflicts
3. Verify the build passes
4. Review and test the combined changes

**Key Principle:** Always merge `main` INTO your feature branch first, not the other way around.

---

## Quick Reference

```bash
# 1. Fetch the feature branch
git fetch origin <branch-name>

# 2. Checkout the branch
git checkout <branch-name>

# 3. Fetch latest main
git fetch origin main

# 4. Merge main into your branch
git merge origin/main -m "Merge latest main into feature branch"

# 5. Resolve conflicts if any, then:
git add .
git commit -m "Resolve merge conflicts"

# 6. Verify build
npm run build

# 7. Push updated branch
git push

# 8. Review PR and merge to main
gh pr merge <PR-number> --merge
```

---

## Step-by-Step Workflow

### Step 1: Fetch the Feature Branch

```bash
# Fetch the remote branch
git fetch origin <branch-name>

# Example:
git fetch origin cursor/ALT-123-fix-donor-tag
```

### Step 2: Checkout the Branch

```bash
# Switch to the feature branch
git checkout <branch-name>

# Example:
git checkout cursor/ALT-123-fix-donor-tag
```

If the branch doesn't exist locally, Git will create it and set up tracking automatically.

### Step 3: Fetch Latest Main

```bash
git fetch origin main
```

This ensures you have the latest `main` without switching branches.

### Step 4: Merge Main into Your Branch

```bash
git merge origin/main -m "Merge latest main into feature branch"
```

**Important:** We merge `main` INTO the feature branch, not the feature branch into `main`. This keeps all conflict resolution on the feature branch.

### Step 5: Verify the Build

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Run the full build
npm run build
```

If the build fails, fix the issues before proceeding.

### Step 6: Push the Updated Branch

```bash
git push
```

This updates the PR with the merged changes.

### Step 7: Review and Merge PR

```bash
# View PR status
gh pr view <PR-number>

# Mark as ready for review (if draft)
gh pr ready <PR-number>

# Merge to main
gh pr merge <PR-number> --merge
```

---

## Handling Merge Conflicts

### When Conflicts Occur

If `git merge origin/main` results in conflicts:

```bash
# 1. See which files have conflicts
git status

# 2. Open conflicting files and resolve manually
# Look for conflict markers:
# <<<<<<< HEAD
# (your changes)
# =======
# (main changes)
# >>>>>>> origin/main

# 3. After resolving, stage the files
git add <resolved-file>

# 4. Complete the merge
git commit -m "Resolve merge conflicts with main"
```

### Common Conflict Scenarios

| Scenario | Resolution |
|----------|------------|
| Same file edited | Review both changes, combine logically |
| File deleted in one branch | Decide if file should exist or not |
| Package.json/lock conflicts | Usually accept both, run `npm install` |
| Prisma schema conflicts | Carefully merge, check relations |

### After Resolving Conflicts

Always verify:
```bash
# Regenerate Prisma client if schema changed
npx prisma generate

# Check TypeScript
npx tsc --noEmit

# Full build
npm run build
```

---

## Multiple Branches Scenario

When reviewing multiple feature branches before deployment:

### Option A: Sequential Merging (Recommended)

Review and merge branches one at a time:

```bash
# Branch 1
git checkout feature-branch-1
git merge origin/main
# Review, test, merge PR

# Branch 2 (now includes Branch 1 changes)
git checkout feature-branch-2
git fetch origin main  # Get Branch 1 changes
git merge origin/main
# Review, test, merge PR

# Continue for remaining branches...
```

**Pros:** Each merge is isolated, easier to track issues
**Cons:** Takes longer

### Option B: Integration Branch

Create a temporary integration branch to test all changes together:

```bash
# Create integration branch from main
git checkout main
git pull
git checkout -b integration/release-2025-01-15

# Merge all feature branches
git merge origin/feature-branch-1
git merge origin/feature-branch-2
git merge origin/feature-branch-3

# Test the combined changes
npm run build
npm run dev  # Manual testing

# If all good, merge features to main individually
# Or merge the integration branch (less common)
```

**Pros:** Test all changes together before any merge
**Cons:** More complex, integration branch is temporary

### Option C: Stacked PRs

Use GitHub's stacked PR feature or merge in dependency order:

```bash
# If Branch 2 depends on Branch 1:
# 1. Merge Branch 1 to main first
# 2. Update Branch 2 with new main
# 3. Merge Branch 2 to main
```

---

## Pre-Deployment Checklist

Before merging any branch to `main`:

### Code Quality
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] No new lint errors in changed files

### Database (if applicable)
- [ ] Migrations created properly (not `db push`)
- [ ] Migration tested locally
- [ ] No destructive changes without review

### Testing
- [ ] Manual testing of new features
- [ ] Edge cases considered
- [ ] Multi-tenant isolation verified (if applicable)

### Documentation
- [ ] Linear issue updated with completion docs
- [ ] PR description is comprehensive
- [ ] Breaking changes documented

### Final Steps
- [ ] PR approved or self-reviewed
- [ ] Branch is up to date with `main`
- [ ] Ready to merge

---

## Useful Commands Reference

```bash
# View all remote branches
git branch -r

# View local and remote branches
git branch -a

# Delete local branch after merge
git branch -d <branch-name>

# Force delete local branch
git branch -D <branch-name>

# View PR list
gh pr list

# View specific PR
gh pr view <number>

# Check PR merge status
gh pr view <number> --json state,mergedAt

# Checkout PR directly
gh pr checkout <number>
```

---

## Troubleshooting

### "Branch is behind main"

```bash
git fetch origin main
git merge origin/main
# Resolve conflicts if any
git push
```

### "PR has conflicts"

The PR can't be merged until conflicts are resolved:

```bash
git checkout <feature-branch>
git fetch origin main
git merge origin/main
# Resolve conflicts
git add .
git commit -m "Resolve merge conflicts"
git push
```

### "Build fails after merge"

```bash
# Check what changed
git diff HEAD~1

# Common fixes:
npm install          # Dependencies changed
npx prisma generate  # Schema changed
npx tsc --noEmit     # Find TypeScript errors
```

### "Need to undo a merge"

If you haven't pushed yet:
```bash
git reset --hard HEAD~1
```

If you've already pushed (use with caution):
```bash
git revert -m 1 <merge-commit-hash>
git push
```

---

## Best Practices

1. **Merge often** - Keep feature branches short-lived and merge `main` frequently
2. **Small PRs** - Easier to review and less likely to conflict
3. **Communicate** - Let team know when merging to avoid conflicts
4. **Test locally** - Always build before pushing merged changes
5. **Update Linear** - Keep issue status and documentation current
