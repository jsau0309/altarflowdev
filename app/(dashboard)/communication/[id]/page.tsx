"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Calendar,
  Mail,
  Users,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoaderOne from "@/components/ui/loader-one";
import { toast } from "sonner";

interface Recipient {
  email: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  sentAt?: string;
  deliveredAt?: string;
  bouncedAt?: string;
  unsubscribedAt?: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "BOUNCED" | "UNSUBSCRIBED" | "FAILED";
}

interface Campaign {
  id: string;
  subject: string;
  previewText?: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED";
  htmlContent: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  sentBy?: string;
  recipients?: Recipient[];
}

const getStatusConfig = (t: any) => ({
  DRAFT: { variant: "secondary" as const, label: t('communication:viewDetails.status.draft') },
  SCHEDULED: { variant: "default" as const, label: t('communication:viewDetails.status.scheduled') },
  SENDING: { variant: "default" as const, label: t('communication:viewDetails.status.sending') },
  SENT: { variant: "default" as const, label: t('communication:viewDetails.status.sent') },
  FAILED: { variant: "destructive" as const, label: t('communication:viewDetails.status.failed') },
});

const getRecipientStatusConfig = (t: any) => ({
  PENDING: { variant: "secondary" as const, label: t('communication:viewDetails.recipientStatus.pending', 'Pending') },
  SENT: { variant: "default" as const, label: t('communication:viewDetails.recipientStatus.sent', 'Sent') },
  DELIVERED: { variant: "default" as const, label: t('communication:viewDetails.recipientStatus.delivered', 'Delivered') },
  BOUNCED: { variant: "destructive" as const, label: t('communication:viewDetails.recipientStatus.bounced', 'Bounced') },
  UNSUBSCRIBED: { variant: "secondary" as const, label: t('communication:viewDetails.recipientStatus.unsubscribed', 'Unsubscribed') },
  FAILED: { variant: "destructive" as const, label: t('communication:viewDetails.recipientStatus.failed', 'Failed') },
});

/**
 * Displays detailed information about a specific email campaign, including metadata, metrics, email content preview, and recipient statuses.
 *
 * Fetches campaign data by ID, manages loading and error states, and renders localized UI components for campaign details and recipient information. Redirects to the campaign list page if the campaign cannot be loaded.
 */
export default function CampaignDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { getToken } = useAuth();
  const { t } = useTranslation(['communication', 'common']);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaignDetails();
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/communication/campaigns/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch campaign details");
      }

      const data = await response.json();
      setCampaign(data);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error(t('communication:viewDetails.failedToLoad'));
      router.push("/communication");
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <LoaderOne />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/communication")}
            title={t('communication:viewDetails.backButton')}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{t('communication:viewDetails.backButton')}</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.subject}</h1>
            {campaign.previewText && (
              <p className="text-muted-foreground">{campaign.previewText}</p>
            )}
          </div>
        </div>
        <Badge variant={getStatusConfig(t)[campaign.status].variant}>
          {getStatusConfig(t)[campaign.status].label}
        </Badge>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('communication:viewDetails.metrics.status')}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getStatusConfig(t)[campaign.status].label}
            </div>
            {campaign.sentAt && (
              <p className="text-xs text-muted-foreground">
                {t('communication:viewDetails.metrics.sentOn', { date: format(new Date(campaign.sentAt), "MMM d, h:mm a") })}
              </p>
            )}
            {campaign.scheduledFor && campaign.status === "SCHEDULED" && (
              <p className="text-xs text-muted-foreground">
                {t('communication:viewDetails.metrics.scheduledFor', { date: format(new Date(campaign.scheduledFor), "MMM d, h:mm a") })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('communication:viewDetails.metrics.recipients')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.totalRecipients}</div>
            <p className="text-xs text-muted-foreground">{t('communication:viewDetails.metrics.totalRecipients')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('communication:viewDetails.metrics.sent')}</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.status === "SENT" ? (campaign.deliveredCount || campaign.sentCount) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">{t('communication:viewDetails.metrics.emailsDelivered')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('communication:viewDetails.metrics.created')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(campaign.createdAt), "MMM d")}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(campaign.createdAt), "yyyy")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('communication:viewDetails.emailContent.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-muted/50 overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto p-4">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: campaign.htmlContent }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipients List (only for sent campaigns) */}
      {campaign.recipients && campaign.recipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('communication:viewDetails.recipientsList.title')}</CardTitle>
            <CardDescription>
              {t('communication:viewDetails.recipientsList.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('communication:viewDetails.recipientsList.name')}</TableHead>
                  <TableHead>{t('communication:viewDetails.recipientsList.email')}</TableHead>
                  <TableHead>{t('communication:viewDetails.recipientsList.status')}</TableHead>
                  <TableHead>{t('communication:viewDetails.recipientsList.timestamp', 'Timestamp')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.recipients.map((recipient) => (
                  <TableRow key={recipient.member.id}>
                    <TableCell className="font-medium">
                      {recipient.member.firstName} {recipient.member.lastName}
                    </TableCell>
                    <TableCell>{recipient.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRecipientStatusConfig(t)[recipient.status]?.variant || "default"}>
                        {getRecipientStatusConfig(t)[recipient.status]?.label || recipient.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {recipient.deliveredAt && format(new Date(recipient.deliveredAt), "MMM d, h:mm a")}
                      {recipient.bouncedAt && format(new Date(recipient.bouncedAt), "MMM d, h:mm a")}
                      {recipient.unsubscribedAt && format(new Date(recipient.unsubscribedAt), "MMM d, h:mm a")}
                      {recipient.sentAt && !recipient.deliveredAt && !recipient.bouncedAt && !recipient.unsubscribedAt && format(new Date(recipient.sentAt), "MMM d, h:mm a")}
                      {!recipient.sentAt && !recipient.deliveredAt && !recipient.bouncedAt && !recipient.unsubscribedAt && "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}