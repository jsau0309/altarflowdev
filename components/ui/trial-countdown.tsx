"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface TrialCountdownProps {
  daysRemaining: number;
  className?: string;
}

export function TrialCountdown({ daysRemaining, className }: TrialCountdownProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleClick = () => {
    router.push("/settings?tab=account");
  };

  // Determine urgency based on days remaining
  const isUrgent = daysRemaining <= 7;
  const isCritical = daysRemaining <= 3;

  return (
    <Badge
      variant={isCritical ? "destructive" : isUrgent ? "secondary" : "outline"}
      className={cn(
        "cursor-pointer gap-1.5 px-3 py-1",
        "hover:opacity-80 transition-opacity",
        className
      )}
      onClick={handleClick}
    >
      <Clock className="h-3 w-3" />
      <span className="font-medium">
        {daysRemaining === 1
          ? t("layout:trial.dayRemaining", "1 day left in trial")
          : t("layout:trial.daysRemaining", "{{days}} days left in trial", { days: daysRemaining })}
      </span>
    </Badge>
  );
}