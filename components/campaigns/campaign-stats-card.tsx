"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Target, Users, TrendingUp, Edit, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import type { Campaign, CampaignStats } from "@/types/campaigns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CampaignStatsCardProps {
  campaign: Campaign;
  stats: CampaignStats;
  onEdit?: () => void;
  onToggleActive?: () => void;
  onView?: () => void;
}

export function CampaignStatsCard({
  campaign,
  stats,
  onEdit,
  onToggleActive,
  onView,
}: CampaignStatsCardProps) {
  const isActive = campaign.isActive;
  const isCampaign = campaign.isCampaign;

  return (
    <Card className={!isActive ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{campaign.name}</CardTitle>
              {!isActive && <Badge variant="secondary">Inactive</Badge>}
              {stats.isGoalReached && (
                <Badge variant="default" className="bg-green-600">
                  Goal Reached
                </Badge>
              )}
            </div>
            {campaign.description && (
              <CardDescription className="mt-1">{campaign.description}</CardDescription>
            )}
          </div>
          
          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isCampaign && isActive && onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {isCampaign && onToggleActive && (
                <DropdownMenuItem onClick={onToggleActive}>
                  {isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              )}
              {!isActive && onView && (
                <DropdownMenuItem onClick={onView}>View Details</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="mr-1 h-4 w-4" />
              Raised
            </div>
            <div className="text-2xl font-bold">
              ${stats.totalRaised.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="mr-1 h-4 w-4" />
              Donors
            </div>
            <div className="text-2xl font-bold">{stats.donorCount}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              Gifts
            </div>
            <div className="text-2xl font-bold">{stats.transactionCount}</div>
          </div>
        </div>

        {/* Progress Bar (only for campaigns with goals) */}
        {stats.goalAmount && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                <Target className="inline mr-1 h-4 w-4" />
                Goal: ${stats.goalAmount.toLocaleString()}
              </span>
              <span className="font-semibold">{stats.progressPercent}%</span>
            </div>
            <Progress value={stats.progressPercent} className="h-2" />
          </div>
        )}

        {/* Date Info */}
        {campaign.endDate && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="mr-1 h-4 w-4" />
              {stats.daysRemaining !== null && stats.daysRemaining > 0 ? (
                <span>
                  Ends: {format(new Date(campaign.endDate), "MMM d, yyyy")} (
                  {stats.daysRemaining} days)
                </span>
              ) : (
                <span className="text-red-600">
                  Ended: {format(new Date(campaign.endDate), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Start Date (for upcoming campaigns) */}
        {campaign.startDate && new Date(campaign.startDate) > new Date() && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-1 h-4 w-4" />
            Starts: {format(new Date(campaign.startDate), "MMM d, yyyy")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
