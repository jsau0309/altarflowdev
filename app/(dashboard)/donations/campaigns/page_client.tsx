"use client"

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { DonationType } from '@prisma/client'
import CampaignForm from '@/components/campaigns/campaign-form'
import CampaignList from '@/components/campaigns/campaign-list'

export default function CampaignsClient({ churchName, donationTypes }: { churchName: string; donationTypes: DonationType[] }) {
  const { t } = useTranslation(['donations', 'common'])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DonationType | null>(null)

  const defaults = useMemo(() => donationTypes.filter(dt => !dt.isCampaign), [donationTypes])
  const activeCampaigns = useMemo(() => donationTypes.filter(dt => dt.isCampaign && dt.isActive), [donationTypes])
  const inactiveCampaigns = useMemo(() => donationTypes.filter(dt => dt.isCampaign && !dt.isActive), [donationTypes])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('donations:campaigns.title', 'Donation Campaigns')}</h1>
          <p className="text-muted-foreground">{churchName}</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true) }}>{t('common:create', 'Create')}</Button>
      </div>

      {showForm && (
        <CampaignForm initial={editing ?? undefined} onClose={() => setShowForm(false)} />
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('donations:campaigns.defaults', 'Default Types')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignList items={defaults} readonly onEdit={(c) => {}} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('donations:campaigns.active', 'Active Campaigns')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignList items={activeCampaigns} onEdit={(c) => { setEditing(c); setShowForm(true) }} />
          </CardContent>
        </Card>

        {inactiveCampaigns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('donations:campaigns.inactive', 'Inactive Campaigns')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignList items={inactiveCampaigns} collapsed onEdit={(c) => { setEditing(c); setShowForm(true) }} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
