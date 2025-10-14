export interface Campaign {
  id: string;
  churchId: string;
  name: string;
  description?: string | null;
  isRecurringAllowed: boolean;
  isCampaign: boolean;
  isActive: boolean;
  goalAmount?: number | null;
  endDate?: string | null;
  startDate?: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  totalRaised: number;
  donorCount: number;
  transactionCount: number;
  goalAmount: number | null;
  progressPercent: number;
  isGoalReached: boolean;
  daysRemaining: number | null;
}

export interface CampaignWithStats extends Campaign {
  stats: CampaignStats;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  goalAmount?: number | null;
  endDate?: Date | null;
  startDate?: Date;
  displayOrder?: number;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  goalAmount?: number | null;
  endDate?: Date | null;
  startDate?: Date;
  displayOrder?: number;
  isActive?: boolean;
}
