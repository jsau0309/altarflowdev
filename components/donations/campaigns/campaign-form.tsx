"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shell, Save, X, Target, Calendar as CalendarIcon, Loader2, Lock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import LoaderOne from '@/components/ui/loader-one';
import { createFundraisingCampaign, updateFundraisingCampaign, getFundraisingCampaignById, FundraisingCampaignFE } from '@/lib/actions/fundraising-campaigns.actions';
import { safeStorage } from '@/lib/safe-storage';
import { useTranslation } from 'react-i18next';
import { NumericFormat } from 'react-number-format';
import { toast } from 'sonner';

type Props = {
  mode: 'create' | 'edit';
  campaignId?: string;
  onSuccess?: () => void; // Callback to notify parent of successful save
};

export default function CampaignForm({ mode, campaignId, onSuccess }: Props) {
  const router = useRouter();
  const { t } = useTranslation(['donations', 'common', 'members']);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(mode === 'edit');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; goalAmount?: string; startDate?: string; endDate?: string }>({});

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState<string>('');
  const [noGoalCheckbox, setNoGoalCheckbox] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [raised, setRaised] = useState<number>(0);

  // Compute whether campaign has donations (locks name and start date)
  const hasRaisedMoney = mode === 'edit' && raised > 0;

  useEffect(() => {
    async function load() {
      if (mode !== 'edit' || !campaignId) return;
      try {
        setInitialLoading(true);
        const orgId = safeStorage.getItem('churchId');
        if (!orgId) throw new Error(t('common:errors.churchId_not_found', 'Church ID not found. Please ensure you are properly logged in and associated with a church.'));
        const data = await getFundraisingCampaignById(orgId, campaignId);
        if (!data) throw new Error(t('donations:donationsContent.campaigns.errors.notFound', 'Campaign not found'));
        setName(data.name);
        setDescription(data.description || '');
        setGoalAmount(data.goalAmount || '');
        setNoGoalCheckbox(!data.goalAmount); // Set checkbox if no goal amount

        // Parse dates as local calendar dates (ignore timezone)
        // Server returns "YYYY-MM-DD" format, parse as local date
        if (data.startDate) {
          const [year, month, day] = data.startDate.split('-').map(Number);
          setStartDate(new Date(year, month - 1, day)); // month is 0-indexed
        } else {
          setStartDate(undefined);
        }

        if (data.endDate) {
          const [year, month, day] = data.endDate.split('-').map(Number);
          setEndDate(new Date(year, month - 1, day)); // month is 0-indexed
        } else {
          setEndDate(undefined);
        }

        setRaised(data.raised || 0);
      } catch (e: any) {
        setError(e.message || t('common:errors.fetchFailed', 'Failed to load data. Please try again.'));
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, [mode, campaignId]);

  const validate = () => {
    const errs: typeof fieldErrors = {};
    const n = name.trim();
    if (!n) errs.name = t('donations:donationsContent.campaigns.errors.nameRequired', 'Name is required');

    // Goal amount is required UNLESS the no-goal checkbox is checked
    if (!noGoalCheckbox) {
      if (!goalAmount) {
        errs.goalAmount = t('donations:donationsContent.campaigns.errors.goalRequired', 'Goal amount is required (or check the box below)');
      } else {
        const num = Number(goalAmount);
        if (!(Number.isFinite(num) && num > 0)) {
          errs.goalAmount = t('donations:donationsContent.campaigns.errors.invalidGoal', 'Enter a valid goal amount (> 0, max 2 decimals)');
        } else {
          const two = Number(num.toFixed(2));
          if (num !== two) {
            errs.goalAmount = t('donations:donationsContent.campaigns.errors.invalidGoal', 'Enter a valid goal amount (> 0, max 2 decimals)');
          }

          // If campaign has raised money, new goal must be >= raised amount
          if (hasRaisedMoney && num < raised) {
            errs.goalAmount = t('donations:donationsContent.campaigns.errors.goalBelowRaised',
              `Goal cannot be less than amount already raised ($${raised.toFixed(2)}). You can increase the goal or set it to "no goal".`);
          }
        }
      }
    }

    // Date validations
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Strip time for date-only comparison

    // Start date is REQUIRED for all campaigns
    if (!startDate) {
      errs.startDate = t('donations:donationsContent.campaigns.errors.startDateRequired', 'Start date is required');
    } else if (!hasRaisedMoney) {
      // Only validate start date for create mode or edit mode without donations
      // When campaign has donations, start date is locked and shouldn't be validated
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (start < today) {
        errs.startDate = t('donations:donationsContent.campaigns.errors.startDatePast', 'Start date cannot be in the past');
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      if (end < today) {
        errs.endDate = t('donations:donationsContent.campaigns.errors.endDatePast', 'End date cannot be in the past');
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (start.getTime() > end.getTime()) {
        errs.endDate = t('donations:donationsContent.campaigns.errors.startAfterEnd', 'End date must be on or after start date');
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const isValid = useMemo(() => {
    const n = name.trim().length > 0;

    // Goal is valid if either: (1) noGoalCheckbox is true OR (2) goalAmount is valid
    let g = true;
    if (!noGoalCheckbox) {
      // If checkbox is not checked, goal amount is required
      if (!goalAmount) {
        g = false;
      } else {
        const num = Number(goalAmount);
        const validNumber = Number.isFinite(num) && num > 0 && num === Number(num.toFixed(2));

        // If campaign has raised money, ensure new goal >= raised amount
        if (hasRaisedMoney && num < raised) {
          g = false;
        } else {
          g = validNumber;
        }
      }
    }

    // Date validations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let d = true;

    // Check if start date is not in the past
    // Skip validation if campaign has donations (start date is locked and can't be changed)
    if (startDate && !hasRaisedMoney) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (start < today) d = false;
    }

    // Check if end date is not in the past
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      if (end < today) d = false;
    }

    // Check if start date is before or equal to end date
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (start.getTime() > end.getTime()) d = false;
    }

    return n && g && d;
  }, [name, goalAmount, noGoalCheckbox, startDate, endDate, hasRaisedMoney, raised]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions - set loading immediately
    if (loading) return;

    setError(null);
    setFieldErrors({});
    if (!validate()) return;

    setLoading(true);

    try {
      const orgId = safeStorage.getItem('churchId');
      if (!orgId) throw new Error(t('common:errors.churchId_not_found', 'Church ID not found. Please ensure you are properly logged in and associated with a church.'));

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        goalAmount: goalAmount ? Number(parseFloat(goalAmount).toFixed(2)) : null,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      };

      if (mode === 'create') {
        const res = await createFundraisingCampaign({ clerkOrgId: orgId, ...payload });
        if ('success' in res && res.success === false) {
          setFieldErrors(res.fieldErrors || {});
          throw new Error(t('common:errors.default', 'An unexpected error occurred. Please try again.'));
        }

        // Show success toast for create
        toast.success(
          t('donations:donationsContent.campaigns.createSuccess', 'Campaign created'),
          {
            description: t('donations:donationsContent.campaigns.createSuccessDescription', 'Your campaign has been created successfully.')
          }
        );
      } else {
        if (!campaignId) throw new Error('Missing campaign id');
        const res = await updateFundraisingCampaign(orgId, campaignId, payload);
        if (!res.success && (res as any).fieldErrors) {
          setFieldErrors((res as any).fieldErrors || {});
          throw new Error(t('common:errors.default', 'An unexpected error occurred. Please try again.'));
        }

        // Show success toast for update
        toast.success(
          t('donations:donationsContent.campaigns.updateSuccess', 'Campaign updated'),
          {
            description: t('donations:donationsContent.campaigns.updateSuccessDescription', 'Your campaign has been updated successfully.')
          }
        );
      }

      // Call onSuccess callback to notify parent component
      if (onSuccess) {
        onSuccess();
      } else {
        // Fallback to router navigation if no callback provided
        router.push('/donations?tab=campaigns');
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message || t('common:errors.default', 'An unexpected error occurred. Please try again.'));
      setLoading(false); // Only reset loading on error
    }
    // Note: Don't reset loading on success - let the navigation handle it
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <LoaderOne />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {mode === 'create'
            ? (name.trim() || t('donations:donationsContent.campaigns.form.titleNew', 'New Campaign'))
            : (name.trim() || t('donations:donationsContent.campaigns.form.titleEdit', 'Edit Campaign'))
          }
        </h2>
        <p className="text-muted-foreground mt-1">
          {mode === 'create'
            ? t('donations:donationsContent.campaigns.form.descriptionNew', 'Create a new fundraising campaign to track donations and progress toward your goal.')
            : t('donations:donationsContent.campaigns.form.descriptionEdit', 'Update campaign details and track progress toward your fundraising goal.')}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('donations:donationsContent.campaigns.form.sectionBasicInfo', 'Basic Information')}</CardTitle>
            <CardDescription>{t('donations:donationsContent.campaigns.form.sectionBasicInfoDesc', 'Provide a name and description for your campaign.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                {t('donations:donationsContent.campaigns.form.campaignName', 'Campaign Name')} *
                {hasRaisedMoney && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined })); }}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                placeholder={t('donations:donationsContent.campaigns.form.namePlaceholder', 'e.g., Community Center Renovation 2025')}
                disabled={hasRaisedMoney}
                className={cn(hasRaisedMoney && "bg-muted/50 cursor-not-allowed")}
              />
              {hasRaisedMoney && (
                <p className="text-xs text-muted-foreground italic">
                  {t('donations:donationsContent.campaigns.form.nameLockedHelper', 'Campaign name cannot be changed after receiving donations.')}
                </p>
              )}
              {fieldErrors.name && (<p id="name-error" className="text-sm text-red-600" role="alert">{t(fieldErrors.name as any, fieldErrors.name)}</p>)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('donations:donationsContent.campaigns.form.description', 'Internal Description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('donations:donationsContent.campaigns.form.descriptionPlaceholder', 'Add internal notes about this campaign (purpose, target audience, strategy, etc.)')}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">{t('donations:donationsContent.campaigns.form.descriptionHelper', 'Optional: Internal notes for your team. Not visible to donors.')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Goal & Duration Cards - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Goal Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{t('donations:donationsContent.campaigns.form.sectionGoal', 'Financial Goal')}</CardTitle>
              </div>
              <CardDescription>{t('donations:donationsContent.campaigns.form.sectionGoalDesc', 'Set a fundraising target for this campaign.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal">{t('donations:donationsContent.campaigns.form.goal', 'Goal Amount (USD)')} *</Label>
                <NumericFormat
                  id="goal"
                  customInput={Input as any}
                  value={goalAmount}
                  disabled={noGoalCheckbox}
                  thousandSeparator=","
                  decimalSeparator="."
                  decimalScale={2}
                  allowNegative={false}
                  inputMode="decimal"
                  placeholder="e.g., 5,000"
                  prefix="$"
                  onValueChange={(values) => {
                    setGoalAmount(values.value || "");
                    if (fieldErrors.goalAmount) setFieldErrors(prev => ({ ...prev, goalAmount: undefined }));
                  }}
                  isAllowed={(vals) => {
                    if (vals.floatValue == null) return true; // allow empty
                    if (vals.floatValue <= 0) return false;   // strictly > 0
                    if (vals.floatValue > 1_000_000_000) return false;
                    return true;
                  }}
                  aria-invalid={!!fieldErrors.goalAmount}
                  aria-describedby={fieldErrors.goalAmount ? 'goal-error' : undefined}
                  className={cn(noGoalCheckbox && "bg-muted/50 cursor-not-allowed")}
                />
                {hasRaisedMoney && raised > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('donations:donationsContent.campaigns.form.goalEditHelper',
                      `Already raised: $${raised.toFixed(2)}. You can increase the goal or set it to "no goal".`)}
                  </p>
                )}
                {fieldErrors.goalAmount && (<p id="goal-error" className="text-sm text-red-600" role="alert">{t(fieldErrors.goalAmount as any, fieldErrors.goalAmount)}</p>)}

                {/* Checkbox for campaigns without specific goal */}
                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="noGoal"
                    checked={noGoalCheckbox}
                    onCheckedChange={(checked) => {
                      setNoGoalCheckbox(checked === true);
                      if (checked) {
                        setGoalAmount(''); // Clear goal when checkbox is checked
                        setFieldErrors(prev => ({ ...prev, goalAmount: undefined }));
                      }
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="noGoal"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {t('donations:donationsContent.campaigns.form.noGoalCheckbox', 'This campaign does not have a specific fundraising goal')}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {noGoalCheckbox
                        ? t('donations:donationsContent.campaigns.form.noGoalCheckedHelper', 'Donations will still be tracked, but no progress percentage will be shown.')
                        : t('donations:donationsContent.campaigns.form.goalRequiredHelper', 'Enter a goal amount above, or check this box for campaigns without a specific target.')
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Duration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{t('donations:donationsContent.campaigns.form.sectionDuration', 'Campaign Duration')}</CardTitle>
              </div>
              <CardDescription>{t('donations:donationsContent.campaigns.form.sectionDurationDesc', 'Set the start and end dates for your campaign.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  {t('donations:startDate', 'Start Date')}
                  {hasRaisedMoney && <Lock className="h-3 w-3 text-muted-foreground" />}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={hasRaisedMoney}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                        fieldErrors.startDate && "border-red-500 focus:ring-red-500",
                        hasRaisedMoney && "bg-muted/50 cursor-not-allowed"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : <span>{t('members:pickDate', 'Pick a date')}</span>}
                    </Button>
                  </PopoverTrigger>
                  {!hasRaisedMoney && (
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          // Validate immediately after selecting date
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (date) {
                            const selected = new Date(date);
                            selected.setHours(0, 0, 0, 0);
                            if (selected < today) {
                              setFieldErrors(prev => ({ ...prev, startDate: t('donations:donationsContent.campaigns.errors.startDatePast', 'Start date cannot be in the past') }));
                            } else {
                              setFieldErrors(prev => ({ ...prev, startDate: undefined }));
                            }
                          } else {
                            setFieldErrors(prev => ({ ...prev, startDate: undefined }));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  )}
                </Popover>
                {hasRaisedMoney && (
                  <p className="text-xs text-muted-foreground italic">
                    {t('donations:donationsContent.campaigns.form.startDateLockedHelper', 'Start date cannot be changed after receiving donations.')}
                  </p>
                )}
                {fieldErrors.startDate && (<p id="startDate-error" className="text-sm text-red-600" role="alert">{t(fieldErrors.startDate as any, fieldErrors.startDate)}</p>)}
              </div>
              <div className="space-y-2">
                <Label>{t('donations:endDate', 'End Date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground",
                        fieldErrors.endDate && "border-red-500 focus:ring-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : <span>{t('members:pickDate', 'Pick a date')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        // Validate immediately after selecting date
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date) {
                          const selected = new Date(date);
                          selected.setHours(0, 0, 0, 0);
                          if (selected < today) {
                            setFieldErrors(prev => ({ ...prev, endDate: t('donations:donationsContent.campaigns.errors.endDatePast', 'End date cannot be in the past') }));
                          } else if (startDate) {
                            // Also check if end date is before start date
                            const start = new Date(startDate);
                            start.setHours(0, 0, 0, 0);
                            if (selected.getTime() < start.getTime()) {
                              setFieldErrors(prev => ({ ...prev, endDate: t('donations:donationsContent.campaigns.errors.startAfterEnd', 'End date must be on or after start date') }));
                            } else {
                              setFieldErrors(prev => ({ ...prev, endDate: undefined }));
                            }
                          } else {
                            setFieldErrors(prev => ({ ...prev, endDate: undefined }));
                          }
                        } else {
                          setFieldErrors(prev => ({ ...prev, endDate: undefined }));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {fieldErrors.endDate && (<p id="endDate-error" className="text-sm text-red-600" role="alert">{t(fieldErrors.endDate as any, fieldErrors.endDate)}</p>)}
              </div>
              <p className="text-sm text-muted-foreground">{t('donations:donationsContent.campaigns.form.durationHelper', 'Optional: Leave blank for ongoing campaigns.')}</p>
            </CardContent>
          </Card>
        </div>
        {mode === 'edit' && goalAmount && Number(goalAmount) > 0 && Number(goalAmount) < raised && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 text-yellow-900 p-3 text-sm">
            {t('donations:donationsContent.campaigns.errors.goalLessThanRaisedWarning', 'Goal amount is less than the amount already raised for this campaign. This will not block saving, but please confirm this is intended.')}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Footer with buttons */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            * {t('common:requiredFields', 'Required fields')}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onSuccess?.()} disabled={loading}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading || !isValid}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common:saving', 'Saving...')}
                </>
              ) : (
                mode === 'create' ? t('donations:donationsContent.campaigns.form.createButton', 'Create Campaign') : t('common:saveChanges', 'Save Changes')
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
