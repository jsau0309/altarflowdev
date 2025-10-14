"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CampaignStatsCard } from "./campaign-stats-card";
import { CampaignForm, CampaignFormData } from "./campaign-form";
import type { Campaign, CampaignStats } from "@/types/campaigns";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CampaignWithStats extends Campaign {
  stats: CampaignStats;
}

export function CampaignList() {
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [inactiveExpanded, setInactiveExpanded] = useState(false);
  const { toast } = useToast();

  // Separate default types and campaigns
  const defaultTypes = campaigns.filter((c) => !c.isCampaign);
  const activeCampaigns = campaigns.filter((c) => c.isCampaign && c.isActive);
  const inactiveCampaigns = campaigns.filter((c) => c.isCampaign && !c.isActive);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      
      // Fetch all donation types
      const response = await fetch("/api/donation-types");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch campaigns");
      }

      // Fetch stats for each campaign/type
      const campaignsWithStats = await Promise.all(
        data.data.map(async (campaign: Campaign) => {
          const statsResponse = await fetch(`/api/donation-types/${campaign.id}/stats`);
          const statsData = await statsResponse.json();
          
          return {
            ...campaign,
            stats: statsData.success ? statsData.data : {
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
      console.error("Error fetching campaigns:", error);
      toast({
        title: "Error",
        description: "Failed to load campaigns. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (data: CampaignFormData) => {
    try {
      const response = await fetch("/api/donation-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create campaign");
      }

      toast({
        title: "Success",
        description: "Campaign created successfully!",
      });

      fetchCampaigns();
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create campaign",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUpdateCampaign = async (data: CampaignFormData) => {
    if (!editingCampaign) return;

    try {
      const response = await fetch(`/api/donation-types/${editingCampaign.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update campaign");
      }

      toast({
        title: "Success",
        description: "Campaign updated successfully!",
      });

      setEditingCampaign(null);
      fetchCampaigns();
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update campaign",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleToggleActive = async (campaign: Campaign) => {
    try {
      const response = await fetch(`/api/donation-types/${campaign.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !campaign.isActive,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update campaign status");
      }

      toast({
        title: "Success",
        description: campaign.isActive
          ? "Campaign deactivated successfully!"
          : "Campaign activated successfully!",
      });

      fetchCampaigns();
    } catch (error) {
      console.error("Error toggling campaign status:", error);
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Donation Campaigns</h2>
          <p className="text-muted-foreground">
            Manage fundraising campaigns and track donation types
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Default Types Section */}
      {defaultTypes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Default Types</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {defaultTypes.map((type) => (
              <CampaignStatsCard
                key={type.id}
                campaign={type}
                stats={type.stats}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Campaigns Section */}
      {activeCampaigns.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Active Campaigns</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeCampaigns.map((campaign) => (
              <CampaignStatsCard
                key={campaign.id}
                campaign={campaign}
                stats={campaign.stats}
                onEdit={() => handleEdit(campaign)}
                onToggleActive={() => handleToggleActive(campaign)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No active campaigns message */}
      {activeCampaigns.length === 0 && defaultTypes.length > 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No active campaigns yet. Create your first campaign to start fundraising!
          </p>
        </div>
      )}

      {/* Inactive Campaigns Section (Collapsible) */}
      {inactiveCampaigns.length > 0 && (
        <Collapsible
          open={inactiveExpanded}
          onOpenChange={setInactiveExpanded}
        >
          <CollapsibleTrigger className="flex items-center gap-2 text-lg font-semibold hover:underline">
            {inactiveExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
            Inactive Campaigns ({inactiveCampaigns.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {inactiveCampaigns.map((campaign) => (
                <CampaignStatsCard
                  key={campaign.id}
                  campaign={campaign}
                  stats={campaign.stats}
                  onToggleActive={() => handleToggleActive(campaign)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Campaign Form Dialog */}
      <CampaignForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingCampaign(null);
          }
        }}
        onSubmit={editingCampaign ? handleUpdateCampaign : handleCreateCampaign}
        campaign={editingCampaign}
        mode={editingCampaign ? "edit" : "create"}
      />
    </div>
  );
}
