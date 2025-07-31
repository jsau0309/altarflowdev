"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { MoreHorizontal, Send, Edit, Trash, Eye, Users, Mail, Plus, Loader2, Crown } from "lucide-react";
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
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import LoaderOne from "@/components/ui/loader-one";
import { toast } from "sonner";

interface Campaign {
  id: string;
  subject: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED";
  scheduledFor?: string;
  sentAt?: string;
  totalRecipients: number;
  sentCount: number;
  createdAt: string;
  sentBy: string;
}

interface QuotaData {
  used: number;
  limit: number;
  resetDate: string;
  isPaid?: boolean;
}

const statusColors = {
  DRAFT: "secondary",
  SCHEDULED: "default",
  SENDING: "default",
  SENT: "default",
  FAILED: "destructive",
} as const;

interface CampaignListWithHeaderProps {
  returnFrom?: string | null;
}

export function CampaignListWithHeader({ returnFrom }: CampaignListWithHeaderProps) {
  const { getToken } = useAuth();
  const { t } = useTranslation(['communication', 'common']);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"ADMIN" | "STAFF" | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  useEffect(() => {
    fetchCampaigns();
    fetchQuota();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchQuota = async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/communication/quota", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuota(data);
      }
    } catch (error) {
      console.error("Error fetching quota:", error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/communication/campaigns", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error(t('common:error'), {
        description: t('communication:campaigns.toast.failedToLoadCampaigns'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (campaign: Campaign) => {
    // Check permission first
    if (userRole !== "ADMIN") {
      toast.error(t('communication:campaigns.toast.permissionDenied'), {
        description: t('communication:campaigns.toast.permissionDeniedDescription'),
      });
      return;
    }

    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const performDelete = async () => {
    if (!campaignToDelete) return;
    
    setDeletingId(campaignToDelete.id);
    setDeleteDialogOpen(false);
    const loadingToast = toast.loading(t('communication:campaigns.toast.deletingCampaign'));

    try {
      const token = await getToken();
      const response = await fetch(`/api/communication/campaigns/${campaignToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update campaigns list immediately for better UX
        setCampaigns(prev => prev.filter(c => c.id !== campaignToDelete.id));
        
        toast.dismiss(loadingToast);
        toast.success(t('communication:campaigns.toast.campaignDeleted'), {
          description: t('communication:campaigns.toast.campaignDeletedDescription'),
        });
        
        // Refresh campaigns in background
        fetchCampaigns();
      } else {
        toast.dismiss(loadingToast);
        
        // Handle specific error cases
        if (response.status === 403) {
          toast.error(t('communication:campaigns.toast.permissionDenied'), {
            description: t('communication:campaigns.toast.adminOnlyDelete'),
          });
        } else if (response.status === 404) {
          toast.error(t('communication:campaigns.toast.campaignNotFound'), {
            description: t('communication:campaigns.toast.campaignNotFoundDescription'),
          });
          // Refresh the list since it might be out of sync
          fetchCampaigns();
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to delete campaign");
        }
        return;
      }
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.dismiss(loadingToast);
      toast.error(t('communication:campaigns.toast.failedToDelete'), {
        description: t('communication:campaigns.toast.failedToDeleteDescription'),
      });
    } finally {
      setDeletingId(null);
      setCampaignToDelete(null);
    }
  };

  const quotaPercentage = quota ? (quota.used / quota.limit) * 100 : 0;
  const isAtLimit = quota && quota.used >= quota.limit;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('communication:campaigns.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <LoaderOne />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle>{t('communication:campaigns.title')}</CardTitle>
              <CardDescription>
                {t('communication:campaigns.subtitle')}
              </CardDescription>
            </div>
            {quota && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {quota.isPaid ? (
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 font-semibold">
                        <Crown className="h-4 w-4" />
                        {t('communication:campaigns.unlimitedCampaigns')}
                      </span>
                    ) : (
                      <>{t('communication:campaigns.campaignsThisMonth', { used: quota.used, limit: quota.limit })}</>
                    )}
                  </p>
                  {!quota.isPaid && quota.used >= quota.limit && (
                    <Badge variant="destructive" className="text-xs">
                      {t('communication:campaigns.limitReached')}
                    </Badge>
                  )}
                </div>
                {!quota.isPaid && (
                  <Progress value={quotaPercentage} className="h-2 w-32" />
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('communication:campaigns.noCampaigns')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('communication:campaigns.noCampaignsDescription')}
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button asChild disabled={isAtLimit || false}>
                      <Link href="/communication/new">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('communication:campaigns.createCampaign')}
                      </Link>
                    </Button>
                  </span>
                </TooltipTrigger>
                {isAtLimit && !quota?.isPaid && (
                  <TooltipContent>
                    <p>{t('communication:campaigns.monthlyLimitReached', { resetDate: quota.resetDate })}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle>{t('communication:campaigns.title')}</CardTitle>
            <CardDescription>
              {t('communication:campaigns.manageSubtitle')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {quota && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {quota.isPaid ? (
                      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 font-semibold">
                        <Crown className="h-4 w-4" />
                        {t('communication:campaigns.unlimitedCampaigns')}
                      </span>
                    ) : (
                      <>{t('communication:campaigns.campaignsSent', { used: quota.used, limit: quota.limit })}</>
                    )}
                  </p>
                  {!quota.isPaid && quota.used >= quota.limit && (
                    <Badge variant="destructive" className="text-xs">
                      {t('communication:campaigns.limitReached')}
                    </Badge>
                  )}
                </div>
                {!quota.isPaid && (
                  <p className="text-xs text-muted-foreground">
                    {t('communication:campaigns.resetsOn', { resetDate: quota.resetDate })}
                  </p>
                )}
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button asChild disabled={isAtLimit || false}>
                      <Link href="/communication/new">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('communication:campaigns.newEmail')}
                      </Link>
                    </Button>
                  </span>
                </TooltipTrigger>
                {isAtLimit && !quota?.isPaid && (
                  <TooltipContent className="max-w-xs">
                    <p>{t('communication:campaigns.monthlyLimitReached', { resetDate: quota.resetDate })}</p>
                    <p className="mt-1 text-xs">
                      {t('communication:campaigns.upgradeForUnlimited')}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('communication:campaigns.table.subject')}</TableHead>
              <TableHead>{t('communication:campaigns.table.status')}</TableHead>
              <TableHead>{t('communication:campaigns.table.recipients')}</TableHead>
              <TableHead>{t('communication:campaigns.table.scheduledSent')}</TableHead>
              <TableHead>{t('communication:campaigns.table.created')}</TableHead>
              <TableHead className="text-right">{t('communication:campaigns.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">
                  {campaign.subject}
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[campaign.status]}>
                    {t(`communication:campaigns.status.${campaign.status.toLowerCase()}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {campaign.status === "DRAFT" 
                              ? "-"
                              : campaign.status === "SENT" 
                                ? `${campaign.sentCount}/${campaign.totalRecipients}`
                                : campaign.totalRecipients}
                          </span>
                        </div>
                      </TooltipTrigger>
                      {campaign.status === "DRAFT" && (
                        <TooltipContent>
                          <p>{t('communication:campaigns.table.recipientCountTooltip')}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  {campaign.sentAt
                    ? format(new Date(campaign.sentAt), "MMM d, yyyy h:mm a")
                    : campaign.scheduledFor
                    ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {/* Display in user's local timezone */}
                                {format(new Date(campaign.scheduledFor), "MMM d, yyyy h:mm a")}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {t('communication:campaigns.scheduledInYourTimezone')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    : "-"}
                </TableCell>
                <TableCell>
                  {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{t('communication:campaigns.actions.openMenu')}</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('communication:campaigns.actions.actionsLabel')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/communication/${campaign.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('communication:campaigns.actions.viewDetails')}
                        </Link>
                      </DropdownMenuItem>
                      {campaign.status === "DRAFT" && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href={`/communication/new/editor?campaignId=${campaign.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('communication:campaigns.actions.editDesign')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={
                              returnFrom === "review" 
                                ? `/communication/new/review?campaignId=${campaign.id}`
                                : campaign.totalRecipients > 0 
                                  ? `/communication/new/review?campaignId=${campaign.id}` 
                                  : `/communication/new/recipients?campaignId=${campaign.id}`
                            }>
                              <Send className="mr-2 h-4 w-4" />
                              {t('communication:campaigns.actions.send')}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      {(campaign.status === "DRAFT" || campaign.status === "SCHEDULED") && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(campaign)}
                          className={userRole !== "ADMIN" ? "text-muted-foreground" : "text-destructive"}
                          disabled={deletingId === campaign.id}
                        >
                          {deletingId === campaign.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('communication:campaigns.actions.deleting')}
                            </>
                          ) : (
                            <>
                              <Trash className="mr-2 h-4 w-4" />
                              {userRole !== "ADMIN" ? t('communication:campaigns.actions.deleteAdminOnly') : t('communication:campaigns.actions.delete')}
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('communication:campaigns.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('communication:campaigns.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('communication:campaigns.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={performDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('communication:campaigns.deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}