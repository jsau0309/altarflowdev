"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/types/campaigns";

interface CampaignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CampaignFormData) => Promise<void>;
  campaign?: Campaign | null;
  mode: "create" | "edit";
}

export interface CampaignFormData {
  name: string;
  description: string;
  endCondition: "date" | "goal" | "both" | "none";
  goalAmount: number | null;
  endDate: Date | null;
  startDate: Date;
  displayOrder: number;
}

export function CampaignForm({
  open,
  onOpenChange,
  onSubmit,
  campaign,
  mode,
}: CampaignFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: campaign?.name || "",
    description: campaign?.description || "",
    endCondition: campaign?.endDate && campaign?.goalAmount
      ? "both"
      : campaign?.endDate
      ? "date"
      : campaign?.goalAmount
      ? "goal"
      : "none",
    goalAmount: campaign?.goalAmount ? Number(campaign.goalAmount) : null,
    endDate: campaign?.endDate ? new Date(campaign.endDate) : null,
    startDate: campaign?.startDate ? new Date(campaign.startDate) : new Date(),
    displayOrder: campaign?.displayOrder || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clear fields based on end condition
      const submitData = { ...formData };
      
      if (formData.endCondition === "date") {
        submitData.goalAmount = null;
      } else if (formData.endCondition === "goal") {
        submitData.endDate = null;
      } else if (formData.endCondition === "none") {
        submitData.goalAmount = null;
        submitData.endDate = null;
      }

      await onSubmit(submitData);
      onOpenChange(false);
      
      // Reset form if creating
      if (mode === "create") {
        setFormData({
          name: "",
          description: "",
          endCondition: "none",
          goalAmount: null,
          endDate: null,
          startDate: new Date(),
          displayOrder: 0,
        });
      }
    } catch (error) {
      console.error("Error submitting campaign:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Campaign" : "Edit Campaign"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new fundraising campaign for your church."
              : "Update the campaign details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Campaign Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Campaign Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Building Fund, Mission Trip"
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose of this campaign..."
                rows={3}
              />
            </div>

            {/* Start Date */}
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? (
                      format(formData.startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) =>
                      setFormData({ ...formData, startDate: date || new Date() })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Condition */}
            <div className="grid gap-2">
              <Label>End Condition</Label>
              <RadioGroup
                value={formData.endCondition}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    endCondition: value as "date" | "goal" | "both" | "none",
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="date" />
                  <Label htmlFor="date" className="font-normal cursor-pointer">
                    End by Date
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="goal" id="goal" />
                  <Label htmlFor="goal" className="font-normal cursor-pointer">
                    End by Goal Amount
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="font-normal cursor-pointer">
                    Both (ends when first condition is met)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="font-normal cursor-pointer">
                    No End Date (ongoing)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* End Date (conditional) */}
            {(formData.endCondition === "date" ||
              formData.endCondition === "both") && (
              <div className="grid gap-2">
                <Label htmlFor="endDate">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? (
                        format(formData.endDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate || undefined}
                      onSelect={(date) =>
                        setFormData({ ...formData, endDate: date || null })
                      }
                      disabled={(date) => date < formData.startDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Goal Amount (conditional) */}
            {(formData.endCondition === "goal" ||
              formData.endCondition === "both") && (
              <div className="grid gap-2">
                <Label htmlFor="goalAmount">
                  Goal Amount ($) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="goalAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.goalAmount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      goalAmount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="10000.00"
                  required
                />
              </div>
            )}

            {/* Display Order */}
            <div className="grid gap-2">
              <Label htmlFor="displayOrder">Display Order (Optional)</Label>
              <Input
                id="displayOrder"
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first. Default types always appear before campaigns.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : mode === "create" ? "Create Campaign" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
