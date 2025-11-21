#!/bin/bash
cd "/Users/samuelalonso/Dev Projects/altarflowdev"

echo "=== Console.log Count by File ==="
echo ""

find app/api lib/actions components -type f \( -name "*.ts" -o -name "*.tsx" \) | while IFS= read -r file; do
  count=$(grep -c "console\." "$file" 2>/dev/null || echo "0")
  if [ "$count" != "0" ]; then
    echo "$count $file"
  fi
done | sort -rn
