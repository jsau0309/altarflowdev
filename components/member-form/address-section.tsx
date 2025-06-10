import type React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { MemberFormValues } from './member-form'; // Assuming MemberFormValues is exported from member-form.tsx

export function AddressSection() {
  const { control } = useFormContext<MemberFormValues>();
  const { t } = useTranslation(['members', 'common']);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        {t('members:address', 'Address')}
      </h3>
      <FormField
        control={control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('common:streetAddress', 'Street Address')}</FormLabel>
            <FormControl>
              <Input placeholder={t('common:placeholders.streetExample')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('members:city', 'City')}</FormLabel>
              <FormControl>
                <Input placeholder={t('common:placeholders.city')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('members:state', 'State')}</FormLabel>
              <FormControl>
                <Input placeholder={t('common:placeholders.state')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="zipCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('members:zipCode', 'Zip Code')}</FormLabel>
              <FormControl>
                <Input placeholder={t('common:placeholders.zipExample')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
