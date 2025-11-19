"use client";

import { useEffect, useState } from "react";
import { Send, Users, Clock } from "lucide-react";
import confetti from "canvas-confetti";

interface CampaignSuccessAnimationProps {
  recipientCount: number;
  subject: string;
  onComplete: () => void;
}

export function CampaignSuccessAnimation({ 
  recipientCount, 
  subject,
  onComplete 
}: CampaignSuccessAnimationProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Launch from bottom corners
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12 text-center transform scale-100 animate-in fade-in duration-500">
          {/* Success Icon with Animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <Send className="w-20 h-20 text-blue-600 opacity-50" />
              </div>
              <Send className="w-20 h-20 text-blue-600 relative z-10" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Campaign Sent Successfully! 🎉
          </h1>
          
          {/* Campaign Details */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-8 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 truncate">
              &quot;{subject}&quot;
            </h2>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-white">{recipientCount}</strong> recipients
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600 dark:text-gray-300">
                  Sending now
                </span>
              </div>
            </div>
          </div>

          {/* Progress Message */}
          <div className="space-y-3 mb-8">
            <p className="text-gray-600 dark:text-gray-300">
              Your email is being delivered to all recipients.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You&apos;ll receive a confirmation once delivery is complete.
            </p>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
            <span>Redirecting to campaigns in {countdown} seconds...</span>
          </div>
        </div>
      </div>
    </div>
  );
}