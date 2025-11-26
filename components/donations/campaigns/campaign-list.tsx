"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Shell, Plus, Infinity, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoaderOne from '@/components/ui/loader-one';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listFundraisingCampaigns, FundraisingCampaignFE, deleteFundraisingCampaign } from '@/lib/actions/fundraising-campaigns.actions';
import { safeStorage } from '@/lib/safe-storage';
import { toast } from "sonner";
import { cn } from '@/lib/utils';

interface CampaignListProps {
  onNew?: () => void;
  onEdit?: (id: string) => void;
}

export default function CampaignList({ onNew, onEdit }: CampaignListProps) {
  const { t } = useTranslation(['donations', 'common']);
  const [items, setItems] = useState<FundraisingCampaignFE[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionType, setActionType] = useState<'delete' | 'deactivate' | 'activate'>('delete');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgId = safeStorage.getItem('churchId');
      if (!orgId) throw new Error('Organization not found');
      const { campaigns } = await listFundraisingCampaigns({ clerkOrgId: orgId, page: 1, limit: 50, includeInactive: true });

      // Sort by created date (newest first)
      const sortedCampaigns = campaigns.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setItems(sortedCampaigns);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDeleteClick = (id: string) => {
    setCampaignToDelete(id);
    setConfirmDelete(true);
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;

    try {
      setIsDeleting(true);
      const orgId = safeStorage.getItem('churchId');
      if (!orgId) throw new Error('Organization not found');

      if (actionType === 'delete') {
        // Actually delete the campaign
        await deleteFundraisingCampaign(orgId, campaignToDelete);

        toast.success(
          t('donations:donationsContent.campaigns.deleteSuccess', 'Campaign deleted'),
          {
            description: t('donations:donationsContent.campaigns.deleteSuccessDescription', 'The campaign has been successfully deleted.')
          }
        );
      } else if (actionType === 'deactivate') {
        // Deactivate the campaign
        const campaign = items.find(c => c.id === campaignToDelete);
        if (!campaign) throw new Error('Campaign not found');

        const { updateFundraisingCampaign } = await import('@/lib/actions/fundraising-campaigns.actions');
        await updateFundraisingCampaign(orgId, campaignToDelete, {
          name: campaign.name,
          description: campaign.description,
          goalAmount: campaign.goalAmount ? parseFloat(campaign.goalAmount) : null,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          isActive: false,
        });

        toast.success(
          t('donations:donationsContent.campaigns.deactivateSuccess', 'Campaign deactivated'),
          {
            description: t('donations:donationsContent.campaigns.deactivateSuccessDescription', 'The campaign has been deactivated.')
          }
        );
      } else if (actionType === 'activate') {
        // Activate the campaign
        const campaign = items.find(c => c.id === campaignToDelete);
        if (!campaign) throw new Error('Campaign not found');

        const { updateFundraisingCampaign } = await import('@/lib/actions/fundraising-campaigns.actions');
        await updateFundraisingCampaign(orgId, campaignToDelete, {
          name: campaign.name,
          description: campaign.description,
          goalAmount: campaign.goalAmount ? parseFloat(campaign.goalAmount) : null,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          isActive: true,
        });

        toast.success(
          t('donations:donationsContent.campaigns.activateSuccess', 'Campaign activated'),
          {
            description: t('donations:donationsContent.campaigns.activateSuccessDescription', 'The campaign has been activated.')
          }
        );
      }

      await load();
    } catch {
      toast.error(
        t('common:errors.default', 'An error occurred'),
        {
          description: t('donations:donationsContent.campaigns.actionError', 'Failed to process action. Please try again.')
        }
      );
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
      setCampaignToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(false);
    setCampaignToDelete(null);
    toast.info(
      t('common:cancelled', 'Cancelled'),
      {
        description: t('donations:donationsContent.campaigns.deleteCancelled', 'Campaign deletion was cancelled.')
      }
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shell className="h-5 w-5" />
            {t('donations:donationsContent.campaigns.title', 'Donation Campaigns')}
          </CardTitle>
          <CardDescription>
            {t('donations:donationsContent.campaigns.description', 'Create, track, and manage fundraising campaigns')}
          </CardDescription>
        </div>
        {onNew ? (
          <Button onClick={onNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('donations:donationsContent.campaigns.new', 'New Campaign')}
          </Button>
        ) : (
          <Button asChild>
            <Link href="/donations/campaigns/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('donations:donationsContent.campaigns.new', 'New Campaign')}
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-[500px]">
            <LoaderOne />
          </div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="rounded-full bg-primary/10 p-4">
              <Shell className="h-10 w-10 text-primary" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">{t('donations:donationsContent.campaigns.empty', 'No campaigns yet')}</h3>
            <p className="mt-2 mb-6 text-sm text-muted-foreground">
              {t('donations:donationsContent.campaigns.emptyDescription', 'Create your first campaign to start tracking fundraising goals.')}
            </p>
            {onNew ? (
              <Button onClick={onNew} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('donations:donationsContent.campaigns.new', 'New Campaign')}
              </Button>
            ) : (
              <Button asChild>
                <Link href="/donations/campaigns/new" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('donations:donationsContent.campaigns.new', 'New Campaign')}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((c) => {
              const hasGoal = c.goalAmount && parseFloat(c.goalAmount) > 0;
              const raised = c.raised || 0;
              const goal = hasGoal && c.goalAmount ? parseFloat(c.goalAmount) : 0;
              const progress = hasGoal && goal > 0 ? (raised / goal) * 100 : 0;
              const isOverGoal = hasGoal && raised > goal;
              const hasRaised = raised > 0;

              // Compute display status based on end date and isActive
              // Use UTC midnight for consistent date-only comparison
              const now = new Date();
              now.setUTCHours(0, 0, 0, 0);
              const isExpired = c.endDate && new Date(c.endDate) < now;
              const displayStatus = isExpired ? 'ended' : (c.isActive ? 'active' : 'inactive');
              const isInactiveOrEnded = displayStatus === 'inactive' || displayStatus === 'ended';

              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg border p-6 transition-all hover:shadow-md",
                    isInactiveOrEnded ? "bg-gray-50 opacity-75" : "bg-card"
                  )}
                >
                  {/* Header: Name + Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{c.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('donations:donationsContent.campaigns.created', 'Created')} {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {onEdit ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(c.id)}
                          title={isExpired ? t('donations:donationsContent.campaigns.editToExtend', 'Edit to extend the end date') : undefined}
                        >
                          {t('common:edit', 'Edit')}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          title={isExpired ? t('donations:donationsContent.campaigns.editToExtend', 'Edit to extend the end date') : undefined}
                        >
                          <Link href={`/donations/campaigns/${c.id}/edit`}>
                            {t('common:edit', 'Edit')}
                          </Link>
                        </Button>
                      )}
                      {/* Action button logic based on status */}
                      {isExpired ? (
                        // Expired campaign - prompt to edit and extend
                        null // Edit button above is enough with tooltip
                      ) : hasRaised ? (
                        // Active campaign with donations - show Activate/Deactivate
                        <Button
                          variant={c.isActive ? "secondary" : "default"}
                          size="sm"
                          onClick={() => {
                            setActionType(c.isActive ? 'deactivate' : 'activate');
                            setCampaignToDelete(c.id);
                            setConfirmDelete(true);
                          }}
                        >
                          {c.isActive
                            ? t('donations:donationsContent.campaigns.deactivate', 'Deactivate')
                            : t('donations:donationsContent.campaigns.activate', 'Activate')
                          }
                        </Button>
                      ) : (
                        // Campaign has no donations - show Delete
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setActionType('delete');
                            handleDeleteClick(c.id);
                          }}
                        >
                          {t('common:delete', 'Delete')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="mb-3">
                    {/* Amount Display */}
                    <div className="flex items-center justify-between mb-2">
                      {hasGoal ? (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            ${raised.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${goal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {isOverGoal && (
                            <Badge variant="default" className="bg-amber-500 text-white hover:bg-amber-600">
                              {progress.toFixed(0)}% {t('donations:donationsContent.campaigns.overGoal', 'Over Goal')}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Infinity className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">
                            {hasRaised
                              ? `$${raised.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t('donations:donationsContent.campaigns.raised', 'raised')}`
                              : t('donations:donationsContent.campaigns.zeroRaised', '$0.00 raised')
                            }
                          </span>
                        </div>
                      )}
                      {hasGoal && !isOverGoal && (
                        <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 ease-out",
                          // No goal - Blue
                          !hasGoal && !hasRaised && "bg-gray-300",
                          !hasGoal && hasRaised && "bg-gradient-to-r from-blue-500 to-blue-600",
                          // Has goal but not over - Green
                          hasGoal && !hasRaised && "bg-gray-300",
                          hasGoal && hasRaised && !isOverGoal && "bg-gradient-to-r from-green-500 to-green-600",
                          // Over goal - Gold
                          hasGoal && isOverGoal && "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600"
                        )}
                        style={{
                          width: hasGoal ? `${Math.min(progress, 100)}%` : '100%'
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer: Status + Dates */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge
                        variant={
                          displayStatus === 'ended' ? 'destructive' :
                          displayStatus === 'active' ? 'default' :
                          'secondary'
                        }
                        className={displayStatus === 'ended' ? 'text-white' : ''}
                        title={
                          displayStatus === 'ended' ?
                            t('donations:donationsContent.campaigns.endedTooltip', 'This campaign has ended. Edit to extend the end date.') :
                            undefined
                        }
                      >
                        {displayStatus === 'ended' && t('donations:donationsContent.campaigns.status.ended', 'Ended')}
                        {displayStatus === 'active' && t('common:active', 'Active')}
                        {displayStatus === 'inactive' && t('donations:donationsContent.campaigns.status.inactive', 'Inactive')}
                      </Badge>
                      {c.endDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {t('donations:donationsContent.campaigns.ends', 'Ends')} {new Date(c.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {!c.endDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{t('donations:donationsContent.campaigns.noEndDate', 'No end date')}</span>
                        </div>
                      )}
                    </div>
                    {/* Description (if exists) */}
                    {c.description && (
                      <p className="text-sm text-muted-foreground italic border-l-2 border-gray-300 pl-3 mt-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Delete/Deactivate/Activate Confirmation Dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'delete' && t('donations:donationsContent.campaigns.deleteConfirmTitle', 'Confirm Deletion')}
              {actionType === 'deactivate' && t('donations:donationsContent.campaigns.deactivateConfirmTitle', 'Deactivate Campaign')}
              {actionType === 'activate' && t('donations:donationsContent.campaigns.activateConfirmTitle', 'Activate Campaign')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'delete' && t('donations:donationsContent.campaigns.deleteConfirmDescription', 'Are you sure you want to delete this campaign? This action cannot be undone.')}
              {actionType === 'deactivate' && t('donations:donationsContent.campaigns.deactivateConfirmDescription', 'This campaign will be hidden from the public donation form but all data will be preserved.')}
              {actionType === 'activate' && t('donations:donationsContent.campaigns.activateConfirmDescription', 'This campaign will be shown on the public donation form again.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              {t('common:cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className={actionType === 'delete' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {isDeleting
                ? t('common:processing', 'Processing...')
                : actionType === 'delete'
                ? t('common:delete', 'Delete')
                : actionType === 'deactivate'
                ? t('donations:donationsContent.campaigns.deactivate', 'Deactivate')
                : t('donations:donationsContent.campaigns.activate', 'Activate')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
