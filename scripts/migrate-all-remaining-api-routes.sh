#!/bin/bash

# Universal API routes migration script
# Migrates all remaining console.log instances in app/api routes

cd "/Users/samuelalonso/Dev Projects/altarflowdev"

echo "=== Starting batch migration of all remaining API routes ==="
echo ""

# Find all API route files with console.log (excluding already migrated ones)
find app/api -type f \( -name "*.ts" -o -name "*.tsx" \) | while IFS= read -r file; do
  # Skip already migrated files
  if [[ "$file" == *"clerk-webhook"* ]] || [[ "$file" == *"expenses/[expenseId]"* ]]; then
    continue
  fi

  count=$(grep -c "console\." "$file" 2>/dev/null || echo "0")
  if [ "$count" != "0" ]; then
    echo "Processing: $file ($count instances)"

    # Use sed to replace console.log patterns with logger calls
    # This is a simple pattern-based replacement
    sed -i '' \
      -e "s/console\.error(\([^,]*\), \([^)]*\));/logger.error(\1, { operation: 'api.error' }, \2 instanceof Error ? \2 : new Error(String(\2)));/g" \
      -e "s/console\.error(\([^)]*\));/logger.error(\1, { operation: 'api.error' });/g" \
      -e "s/console\.warn(\([^)]*\));/logger.warn(\1, { operation: 'api.warn' });/g" \
      -e "s/console\.log(\([^)]*\));/logger.info(\1, { operation: 'api.info' });/g" \
      -e "s/console\.info(\([^)]*\));/logger.info(\1, { operation: 'api.info' });/g" \
      "$file"

    # Check if logger import exists, if not add it
    if ! grep -q "from '@/lib/logger'" "$file"; then
      # Add logger import after the first import statement
      sed -i '' "1,/^import/s/^\(import.*\)$/\1\nimport { logger } from '@\/lib\/logger';/" "$file"
    fi

    echo "  ✓ Migrated $file"
  fi
done

echo ""
echo "=== Batch migration complete! ==="
echo "Run 'npx tsc --noEmit' to check for TypeScript errors"
