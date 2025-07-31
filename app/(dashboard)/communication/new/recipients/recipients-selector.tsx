"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { 
  Search, 
  Users, 
  Mail, 
  Filter, 
  ArrowRight, 
  Save,
  AlertCircle,
  MailX
} from "lucide-react";
import LoaderOne from "@/components/ui/loader-one";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  membershipStatus: string;
  isSubscribed: boolean;
  tags?: string[];
}

interface Campaign {
  id: string;
  subject: string;
  recipientType: string;
  recipientFilters: any;
  recipientIds: string[];
}

/**
 * Displays a user interface for selecting recipients for a communication campaign.
 *
 * Fetches campaign and member data, allows filtering and searching members, and supports three recipient selection modes: all members, selected members, or filtered members. Handles saving recipient selections to the campaign and provides navigation and feedback for the user.
 */
export function RecipientsSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { t } = useTranslation(['communication']);
  const campaignId = searchParams.get("campaignId");
  const returnTo = searchParams.get("returnTo");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Selection state
  const [recipientType, setRecipientType] = useState<"all" | "selected" | "filtered">("all");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Load campaign and members
  useEffect(() => {
    if (!campaignId) {
      toast.error(t('communication:recipientsSelection.toast.noCampaignId'));
      router.push("/communication/new/details");
      return;
    }

    const loadData = async () => {
      try {
        const token = await getToken();
        
        // Load campaign
        const campaignResponse = await fetch(`/api/communication/campaigns/${campaignId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!campaignResponse.ok) {
          throw new Error(t('communication:recipientsSelection.toast.failedToLoadCampaign'));
        }

        const campaignData = await campaignResponse.json();
        setCampaign(campaignData);
        
        // Set existing recipient configuration
        if (campaignData.recipientIds && campaignData.recipientIds.length > 0) {
          // If we have recipient IDs, determine the type based on the data
          if (campaignData.recipientType) {
            setRecipientType(campaignData.recipientType);
          } else {
            // Default to "selected" if we have specific recipient IDs
            setRecipientType("selected");
          }
          setSelectedMembers(new Set(campaignData.recipientIds));
        } else if (campaignData.recipientType) {
          setRecipientType(campaignData.recipientType);
        }

        // Load members with email preferences
        const membersResponse = await fetch("/api/members/with-email-preferences", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!membersResponse.ok) {
          throw new Error(t('communication:recipientsSelection.toast.failedToLoadMembers'));
        }

        const membersData = await membersResponse.json();
        setMembers(membersData.members);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error(t('communication:recipientsSelection.toast.failedToLoadData'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [campaignId, getToken, router]);

  // Filter members based on search and status
  const filteredMembers = (members || []).filter((member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
                         (member.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    const matchesStatus = filterStatus === "all" || member.membershipStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Get recipient count
  const getRecipientCount = () => {
    switch (recipientType) {
      case "all":
        return members?.length || 0;
      case "selected":
        return selectedMembers.size;
      case "filtered":
        return filteredMembers?.length || 0;
      default:
        return 0;
    }
  };

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    const loadingToast = toast.loading(t('communication:recipientsSelection.toast.savingRecipients'));
    
    try {
      const token = await getToken();
      
      let recipientIds: string[] = [];
      
      switch (recipientType) {
        case "all":
          recipientIds = members.map(m => m.id);
          break;
        case "selected":
          recipientIds = Array.from(selectedMembers);
          break;
        case "filtered":
          recipientIds = filteredMembers.map(m => m.id);
          break;
      }

      const response = await fetch(`/api/communication/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientType,
          recipientIds,
          recipientFilters: {
            status: filterStatus,
            searchQuery,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save recipients:', errorData);
        throw new Error(errorData.error || t('communication:recipientsSelection.toast.failedToSaveRecipients'));
      }

      toast.success(t('communication:recipientsSelection.toast.recipientsSaved'), { id: loadingToast });
      
      // If returnTo is set, go back to review page
      if (returnTo === "review") {
        router.push(`/communication/new/review?campaignId=${campaignId}`);
      } else {
        router.push(`/communication/new/review?campaignId=${campaignId}`);
      }
    } catch (error) {
      console.error("Error saving recipients:", error);
      toast.error(t('communication:recipientsSelection.toast.failedToSaveRecipients'), { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    await handleSaveAndContinue();
    router.push("/communication");
  };

  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const selectAll = () => {
    setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
  };

  const deselectAll = () => {
    setSelectedMembers(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoaderOne />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('communication:recipientsSelection.title')}</CardTitle>
          <CardDescription>
            {t('communication:recipientsSelection.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={recipientType} onValueChange={(value: any) => setRecipientType(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                <Users className="h-4 w-4" />
                {t('communication:recipientsSelection.recipientTypes.all')} ({members?.length || 0})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="selected" id="selected" />
              <Label htmlFor="selected" className="flex items-center gap-2 cursor-pointer">
                <Mail className="h-4 w-4" />
                {t('communication:recipientsSelection.recipientTypes.selected')} ({selectedMembers.size})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="filtered" id="filtered" />
              <Label htmlFor="filtered" className="flex items-center gap-2 cursor-pointer">
                <Filter className="h-4 w-4" />
                {t('communication:recipientsSelection.recipientTypes.filtered')} ({filteredMembers?.length || 0})
              </Label>
            </div>
          </RadioGroup>

          {recipientType !== "all" && (
            <>
              <div className="space-y-4 pt-4 border-t">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder={t('communication:recipientsSelection.search.placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">{t('communication:recipientsSelection.filters.all')}</option>
                    <option value="Member">{t('communication:recipientsSelection.filters.member')}</option>
                    <option value="Visitor">{t('communication:recipientsSelection.filters.visitor')}</option>
                  </select>
                </div>

                {recipientType === "selected" && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      {t('communication:recipientsSelection.search.selectAllVisible')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      {t('communication:recipientsSelection.search.deselectAll')}
                    </Button>
                  </div>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                {filteredMembers?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {t('communication:recipientsSelection.noMembersFound')}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-4 hover:bg-muted/50"
                      >
                        {recipientType === "selected" && (
                          <Checkbox
                            checked={selectedMembers.has(member.id)}
                            onCheckedChange={() => toggleMemberSelection(member.id)}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.firstName} {member.lastName}</p>
                            {!member.isSubscribed && (
                              <div className="flex items-center gap-1 text-destructive">
                                <MailX className="h-3 w-3" />
                                <span className="text-xs font-medium">{t('communication:recipientsSelection.unsubscribed')}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant={member.membershipStatus === "Member" ? "default" : "secondary"}>
                          {member.membershipStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('communication:recipientsSelection.recipientSummary', { count: getRecipientCount() })}
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          {t('communication:recipientsSelection.actions.saveDraftAndExit')}
        </Button>
        
        <Button
          onClick={handleSaveAndContinue}
          disabled={isSaving || getRecipientCount() === 0}
        >
          {returnTo === "review" ? t('communication:recipientsSelection.actions.saveAndReturn') : t('communication:recipientsSelection.actions.nextReviewSend')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}