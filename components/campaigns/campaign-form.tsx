"use client"

import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from 'react-i18next'
import { DonationType } from '@prisma/client'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  endCondition: z.enum(['none', 'date', 'goal', 'both']).default('none'),
  goalAmount: z.number().positive().optional(),
  endDate: z.string().optional(),
  startDate: z.string().optional(),
  displayOrder: z.number().int().optional(),
})

type Props = { initial?: DonationType; onClose: () => void }

export default function CampaignForm({ initial, onClose }: Props) {
  const { t } = useTranslation(['donations', 'common'])
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    endCondition: initial?.goalAmount && initial?.endDate ? 'both' : initial?.goalAmount ? 'goal' : initial?.endDate ? 'date' : 'none',
    goalAmount: initial?.goalAmount ? parseFloat(initial.goalAmount.toString()) : undefined,
    endDate: initial?.endDate ? new Date(initial.endDate).toISOString().slice(0, 10) : '',
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    displayOrder: initial?.displayOrder || 0,
  })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const parsed = schema.safeParse(form)
    if (!parsed.success) return

    setSaving(true)
    try {
      const payload: any = {
        name: form.name,
        description: form.description || null,
        isCampaign: true,
        isActive: true,
        startDate: new Date(form.startDate).toISOString(),
        displayOrder: form.displayOrder,
      }
      if (form.endCondition === 'date' || form.endCondition === 'both') payload.endDate = new Date(form.endDate!).toISOString()
      if (form.endCondition === 'goal' || form.endCondition === 'both') payload.goalAmount = form.goalAmount

      const res = await fetch(initial ? `/api/donation-types/${initial.id}` : '/api/donation-types', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save campaign')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label>{t('donations:campaigns.name', 'Campaign Name')}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>{t('donations:campaigns.description', 'Description')}</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{t('donations:campaigns.startDate', 'Start Date')}</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <Label>{t('donations:campaigns.displayOrder', 'Display Order')}</Label>
            <Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label>{t('donations:campaigns.endCondition', 'End Condition')}</Label>
          <div className="flex gap-4 mt-2">
            {['none', 'date', 'goal', 'both'].map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input type="radio" name="endCondition" checked={form.endCondition === opt} onChange={() => setForm({ ...form, endCondition: opt as any })} />
                {opt}
              </label>
            ))}
          </div>
        </div>
        {(form.endCondition === 'date' || form.endCondition === 'both') && (
          <div>
            <Label>{t('donations:campaigns.endDate', 'End Date')}</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        )}
        {(form.endCondition === 'goal' || form.endCondition === 'both') && (
          <div>
            <Label>{t('donations:campaigns.goalAmount', 'Goal Amount')}</Label>
            <Input type="number" step="0.01" value={form.goalAmount ?? ''} onChange={(e) => setForm({ ...form, goalAmount: Number(e.target.value) })} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('common:cancel', 'Cancel')}</Button>
          <Button onClick={submit} disabled={saving}>{saving ? t('common:saving', 'Saving...') : t('common:save', 'Save')}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
