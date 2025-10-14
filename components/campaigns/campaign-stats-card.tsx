"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CampaignStats } from '@/types/campaigns'

export default function CampaignStatsCard({ donationTypeId, title }: { donationTypeId: string; title: string }) {
  const [stats, setStats] = useState<CampaignStats | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/donation-types/${donationTypeId}/stats`)
        if (!res.ok) return
        const json = await res.json()
        setStats(json.data as CampaignStats)
      } catch {}
    }
    fetchStats()
  }, [donationTypeId])

  const progress = stats?.progressPercent ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>${'{'}stats.totalRaised.toLocaleString(){'}'}</span>
              <span>{stats.goalAmount ? `$${'{'}stats.goalAmount.toLocaleString(){'}'}` : ''}</span>
            </div>
            {stats.goalAmount && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            )}
            {stats.daysRemaining !== null && (
              <div className="text-xs text-muted-foreground">{stats.daysRemaining} days remaining</div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Loading...</div>
        )}
      </CardContent>
    </Card>
  )
}
