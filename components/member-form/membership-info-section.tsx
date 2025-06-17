"use client"

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MemberFormValues } from './member-form'

export function MembershipInfoSection() {
  const { control } = useFormContext<MemberFormValues>()
  const { t } = useTranslation(['members', 'common'])

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">{t('membershipInformation', { ns: 'members' })}</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="membershipStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('status', { ns: 'members' })}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('membershipInfo.selectStatusPlaceholder', { ns: 'members', defaultValue: 'Select Status...' })} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Visitor">{t('statuses.visitor', { ns: 'members', defaultValue: 'Visitor' })}</SelectItem>
                  <SelectItem value="Member">{t('statuses.member', { ns: 'members', defaultValue: 'Member' })}</SelectItem>
                  <SelectItem value="Inactive">{t('statuses.inactive', { ns: 'members', defaultValue: 'Inactive' })}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
