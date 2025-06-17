"use client"

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import LoaderOne from '@/components/ui/loader-one'; // Added Loader2, removed LoaderOne implicitly if not used elsewhere

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Moved ChurchSummary interface to module scope
interface ChurchSummary {
  overall_metrics: string;
  donation_summary: string;
  expense_summary: string;
  member_activity: string;
}

interface AiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiSummaryModal({ isOpen, onClose }: AiSummaryModalProps) {
  const { t, i18n } = useTranslation('dashboard');

  const [summary, setSummary] = useState<ChurchSummary | null>(null); // Stores the full summary from API
  const [displayedSummary, setDisplayedSummary] = useState<ChurchSummary | null>(null); // Stores the summary being typed out
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false); // Controls the typing animation

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    setDisplayedSummary(null); // Reset displayed summary
    setIsTyping(false); // Reset typing state

    try {
      const response = await fetch('/api/ai/report-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
        }
      });

      if (!response.ok) {
        throw new Error(t('aiSummaryModal.error.fetchFailed', 'Failed to generate summary.'));
      }

      const data = await response.json();
      if (data.summary) {
        setSummary(data.summary); // Set the full summary
        // Initialize displayedSummary with empty strings for typing effect
        setDisplayedSummary({
          overall_metrics: '',
          donation_summary: '',
          expense_summary: '',
          member_activity: '',
        });
        setIsTyping(true); // Start typing animation
      } else {
        throw new Error(t('aiSummaryModal.error.noSummaryData', 'No summary data received.'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state when closing
    setTimeout(() => {
        setSummary(null);
        setDisplayedSummary(null);
        setError(null);
        setIsLoading(false);
        setIsTyping(false);
    }, 300);
  }

  useEffect(() => {
    if (!summary || !isTyping || !displayedSummary) return;

    let currentTimeoutId: NodeJS.Timeout;
    const sections: (keyof ChurchSummary)[] = ['overall_metrics', 'donation_summary', 'expense_summary', 'member_activity'];
    let sectionIndex = 0;
    let charIndex = 0;

    const typeChar = () => {
      if (sectionIndex >= sections.length) {
        setIsTyping(false); // All sections typed
        return;
      }

      const currentSectionKey = sections[sectionIndex];
      const fullTextForSection = summary[currentSectionKey];

      if (charIndex < fullTextForSection.length) {
        setDisplayedSummary(prev => ({
          ...prev!,
          [currentSectionKey]: prev![currentSectionKey] + fullTextForSection[charIndex]
        }));
        charIndex++;
        currentTimeoutId = setTimeout(typeChar, 30); // Adjust typing speed here (milliseconds)
      } else {
        // Move to next section
        sectionIndex++;
        charIndex = 0;
        if (sectionIndex < sections.length) {
          // Add a small delay before starting the next section for better readability
          currentTimeoutId = setTimeout(typeChar, 200);
        } else {
          setIsTyping(false); // Finished all sections
        }
      }
    };

    currentTimeoutId = setTimeout(typeChar, 0); // Start typing the first character of the first section

    return () => clearTimeout(currentTimeoutId); // Cleanup on unmount or if dependencies change

  }, [summary, isTyping]); // Rerun effect if summary or isTyping changes

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('aiSummaryModal.title', 'AI Report Summary')}</DialogTitle>
          <DialogDescription>
            {t('aiSummaryModal.description', 'Get an AI-powered summary of your church\'s key metrics for the current month.')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <LoaderOne />
              <p className="ml-2 text-sm text-muted-foreground">
                {t('aiSummaryModal.loading', 'Generating your summary...')}
              </p>
            </div>
          )}
          {!isLoading && error && (
            <p className="py-4 text-sm text-red-500">{error}</p>
          )}
          {!isLoading && !error && displayedSummary && ( // Render displayedSummary
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-md font-semibold text-foreground/90">
                  {t('aiSummaryModal.sections.overall', '📊 Overall Summary')}
                </h3>
                <p className="mt-1 rounded-md bg-secondary/50 p-3 text-sm leading-relaxed text-foreground/90">
                  {displayedSummary.overall_metrics}
                </p>
              </div>
              <div>
                <h3 className="text-md font-semibold text-foreground/90">
                  {t('aiSummaryModal.sections.donations', '💰 Donation Summary')}
                </h3>
                <p className="mt-1 rounded-md bg-secondary/50 p-3 text-sm leading-relaxed text-foreground/90">
                  {displayedSummary.donation_summary}
                </p>
              </div>
              <div>
                <h3 className="text-md font-semibold text-foreground/90">
                  {t('aiSummaryModal.sections.expenses', '📉 Expense Summary')}
                </h3>
                <p className="mt-1 rounded-md bg-secondary/50 p-3 text-sm leading-relaxed text-foreground/90">
                  {displayedSummary.expense_summary}
                </p>
              </div>
              <div>
                <h3 className="text-md font-semibold text-foreground/90">
                  {t('aiSummaryModal.sections.members', '👥 Member Activity')}
                </h3>
                <p className="mt-1 rounded-md bg-secondary/50 p-3 text-sm leading-relaxed text-foreground/90">
                  {displayedSummary.member_activity}
                </p>
              </div>
            </div>
          )}
          {!isLoading && !error && !summary && !isTyping && (
            <div className="text-center text-muted-foreground h-36 flex items-center justify-center">
              <p>{t('aiSummaryModal.initialPrompt', 'Click the button below to generate your report summary.')}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          {!summary && !isLoading && (
            <Button onClick={handleGenerateSummary} disabled={isLoading} className="w-full">
              <Wand2 className="mr-2 h-4 w-4" />
              {t('aiSummaryModal.generateButton', 'Generate Summary')}
            </Button>
          )}
           {(summary || error) && !isLoading && (
            <Button onClick={handleGenerateSummary} disabled={isLoading} variant="outline">
                <Wand2 className="mr-2 h-4 w-4" />
                {t('aiSummaryModal.regenerateButton', 'Regenerate')}
            </Button>
           )}
          <Button variant="outline" onClick={handleClose}>{t('common:close', 'Close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
