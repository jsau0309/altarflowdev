"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, Users, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import type { Campaign, CampaignStats } from "@/types/campaigns";

interface CampaignWithStats extends Campaign {
  stats: CampaignStats;
}

interface CampaignAnalyticsProps {
  organizationId: string;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
}

export function CampaignAnalytics({ organizationId, dateRange }: CampaignAnalyticsProps) {
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchCampaignData();
    }
  }, [organizationId, dateRange]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all donation types (campaigns + defaults)
      const response = await fetch("/api/donation-types");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch campaigns");
      }

      // Filter only campaigns
      const campaignTypes = data.data.filter((type: Campaign) => type.isCampaign);

      // Fetch stats for each campaign
      const campaignsWithStats = await Promise.all(
        campaignTypes.map(async (campaign: Campaign) => {
          const statsResponse = await fetch(`/api/donation-types/${campaign.id}/stats`);
          const statsData = await statsResponse.json();

          return {
            ...campaign,
            stats: statsData.success
              ? statsData.data
              : {
                  totalRaised: 0,
                  donorCount: 0,
                  transactionCount: 0,
                  goalAmount: null,
                  progressPercent: 0,
                  isGoalReached: false,
                  daysRemaining: null,
                },
          };
        })
      );

      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error("Error fetching campaign data:", error);
      setError(error instanceof Error ? error.message : "Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Fundraising campaign analytics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Fundraising campaign analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Fundraising campaign analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No campaigns found. Create your first campaign to see analytics here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate aggregate stats
  const activeCampaigns = campaigns.filter((c) => c.isActive);
  const totalRaised = campaigns.reduce((sum, c) => sum + c.stats.totalRaised, 0);
  const totalDonors = new Set(
    campaigns.flatMap((c) => Array(c.stats.donorCount).fill(c.id))
  ).size;
  const totalTransactions = campaigns.reduce((sum, c) => sum + c.stats.transactionCount, 0);
  const goalReachedCount = campaigns.filter((c) => c.stats.isGoalReached).length;

  return (
    <div className="space-y-6">
      {/* Aggregate Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Overview</CardTitle>
          <CardDescription>
            {activeCampaigns.length} active campaign{activeCampaigns.length !== 1 ? "s" : ""} ·{" "}
            {campaigns.length - activeCampaigns.length} inactive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <DollarSign className="mr-1 h-4 w-4" />
                Total Raised
              </div>
              <div className="text-2xl font-bold">${totalRaised.toLocaleString()}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-1 h-4 w-4" />
                Unique Donors
              </div>
              <div className="text-2xl font-bold">{totalDonors}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingUp className="mr-1 h-4 w-4" />
                Total Donations
              </div>
              <div className="text-2xl font-bold">{totalTransactions}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Target className="mr-1 h-4 w-4" />
                Goals Reached
              </div>
              <div className="text-2xl font-bold">{goalReachedCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Performance breakdown by campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {campaigns
            .sort((a, b) => {
              // Sort by active status first, then by total raised
              if (a.isActive !== b.isActive) {
                return a.isActive ? -1 : 1;
              }
              return b.stats.totalRaised - a.stats.totalRaised;
            })
            .map((campaign) => (
              <div key={campaign.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{campaign.name}</h4>
                      {!campaign.isActive && <Badge variant="secondary">Inactive</Badge>}
                      {campaign.stats.isGoalReached && (
                        <Badge variant="default" className="bg-green-600">
                          Goal Reached
                        </Badge>
                      )}
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Raised</div>
                    <div className="text-lg font-semibold">
                      ${campaign.stats.totalRaised.toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Donors</div>
                    <div className="text-lg font-semibold">{campaign.stats.donorCount}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Donations</div>
                    <div className="text-lg font-semibold">
                      {campaign.stats.transactionCount}
                    </div>
                  </div>
                </div>

                {campaign.stats.goalAmount && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Goal: ${campaign.stats.goalAmount.toLocaleString()}
                      </span>
                      <span className="font-semibold">{campaign.stats.progressPercent}%</span>
                    </div>
                    <Progress value={campaign.stats.progressPercent} className="h-2" />
                  </div>
                )}

                {campaign.endDate && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-1 h-4 w-4" />
                    {campaign.stats.daysRemaining !== null && campaign.stats.daysRemaining > 0 ? (
                      <span>
                        Ends {format(new Date(campaign.endDate), "MMM d, yyyy")} (
                        {campaign.stats.daysRemaining} days remaining)
                      </span>
                    ) : (
                      <span className="text-red-600">
                        Ended {format(new Date(campaign.endDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
