export type CampaignStats = {
  totalRaised: number;
  donorCount: number;
  transactionCount: number;
  goalAmount: number | null;
  progressPercent: number;
  isGoalReached: boolean;
  daysRemaining: number | null;
};

export type DonationTypeWithCampaign = {
  id: string;
  churchId: string;
  name: string;
  description: string | null;
  isRecurringAllowed: boolean;
  isCampaign: boolean;
  isActive: boolean;
  goalAmount: string | null;
  endDate: string | null;
  startDate: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};
