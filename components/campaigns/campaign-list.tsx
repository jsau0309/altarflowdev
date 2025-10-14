"use client"

import { useEffect, useState } from 'react'
import { DonationType } from '@prisma/client'
import { CampaignStats } from '@/types/campaigns'
import { Button } from '@/components/ui/button'

export default function CampaignList({ items, readonly, collapsed, onEdit }: { items: DonationType[]; readonly?: boolean; collapsed?: boolean; onEdit?: (c: DonationType) => void }) {
  const [statsMap, setStatsMap] = useState<Record<string, CampaignStats | null>>({})
  const [isCollapsed, setIsCollapsed] = useState(!!collapsed)

  useEffect(() => {
    async function fetchStats() {
      const entries = await Promise.all(items.map(async (c) => {
        try {
          const res = await fetch(`/api/donation-types/${c.id}/stats`)
          if (!res.ok) return [c.id, null] as const
          const json = await res.json()
          return [c.id, json.data as CampaignStats] as const
        } catch {
          return [c.id, null] as const
        }
      }))
      setStatsMap(Object.fromEntries(entries))
    }
    if (!readonly) fetchStats()
  }, [items, readonly])

  if (isCollapsed) {
    return (
      <div className="space-y-2">
        <Button variant="outline" onClick={() => setIsCollapsed(false)}>Show</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((c) => {
        const stats = statsMap[c.id]
        const progress = stats?.progressPercent ?? 0
        return (
          <div key={c.id} className="border rounded-md p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name}</div>
              {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
              {c.isCampaign && stats && (
                <div className="text-sm mt-1">
                  ${'{'}stats.totalRaised.toLocaleString(){'}'}
                  {stats.goalAmount ? ` / $${'{'}stats.goalAmount.toLocaleString(){'}'} (${progress}%)` : ''}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!readonly && (
                <Button variant="outline" onClick={() => onEdit?.(c)}>Edit</Button>
              )}
              {c.isCampaign && (
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
