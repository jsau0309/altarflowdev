"use client"

import React, { useState, useEffect, useRef } from 'react'; // Added React and useRef import
import { useTranslation } from 'react-i18next';

import { Wand2, Sparkles } from 'lucide-react';
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

// Interface for a single chat message
interface ChatMessage {
  id: string; // Unique ID for key prop
  type: 'summary_section' | 'question' | 'answer' | 'error' | 'info';
  sender: 'user' | 'ai' | 'system';
  content: string;
  sectionTitle?: string; // For summary sections
  questionKey?: string; // For user questions
  isStreaming?: boolean; // For AI answers being streamed
}

// Predefined questions structure
interface PredefinedQuestionDef {
  key: string;
  textKey: string; // i18n key for the question text
}

const predefinedFollowUpQuestions: PredefinedQuestionDef[] = [
  { key: 'topDonors', textKey: 'aiSummaryModal.questions.topDonorsThisMonth' },
  { key: 'mostUsedPaymentMethod', textKey: 'aiSummaryModal.questions.mostUsedPaymentMethodThisMonth' },
  { key: 'biggestDonation', textKey: 'aiSummaryModal.questions.biggestDonationThisMonth' },
  { key: 'expenseTrend', textKey: 'aiSummaryModal.questions.expenseTrendLast6Months' },
  { key: 'donationTrend', textKey: 'aiSummaryModal.questions.donationTrendLast6Months' },
  { key: 'activeMembers', textKey: 'aiSummaryModal.questions.activeMembers' },
  { key: 'visitorList', textKey: 'aiSummaryModal.questions.recentVisitors' },
];

interface AiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchId?: string; // churchId is now an optional prop
}

export function AiSummaryModal({ isOpen, onClose, churchId }: AiSummaryModalProps) {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // State for initial summary generation
  const [initialSummaryData, setInitialSummaryData] = useState<ChurchSummary | null>(null);
  const [isLoadingInitialSummary, setIsLoadingInitialSummary] = useState(false);
  const [initialSummaryError, setInitialSummaryError] = useState<string | null>(null);
  const [isTypingInitialSummary, setIsTypingInitialSummary] = useState(false);
  const [initialSummaryComplete, setInitialSummaryComplete] = useState(false);

  // State for chat interaction
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreamingFollowUp, setIsStreamingFollowUp] = useState(false);

  // Refs for typing effect state
  const sectionIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const currentSectionMessageIdRef = useRef<string | null>(null);
  const currentTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Follow-up animation refs and logic removed for stabilization

  useEffect(() => {
    if (!churchId) {
      console.warn("AiSummaryModal: churchId prop not provided. Follow-up questions may fail or be disabled.");
      // Display an error message in the UI or disable follow-up functionality if churchId is critical
      // For now, we'll allow the modal to open, but follow-ups will be disabled by checks in handleAskFollowUp
    }
  }, [churchId]);

  useEffect(() => {
    // Scroll to bottom of chat on new message or stream update
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleGenerateSummary = async () => {
    setIsLoadingInitialSummary(true);
    setInitialSummaryError(null);
    setInitialSummaryData(null);
    setChatHistory([]);
    setIsTypingInitialSummary(false);
    setInitialSummaryComplete(false);

    // Reset refs for typing effect
    sectionIndexRef.current = 0;
    charIndexRef.current = 0;
    currentSectionMessageIdRef.current = null;
    if (currentTimeoutIdRef.current) {
      clearTimeout(currentTimeoutIdRef.current);
      currentTimeoutIdRef.current = null;
    }

    try {
      const response = await fetch('/api/ai/report-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(t('aiSummaryModal.error.fetchFailed', `Failed to generate summary: ${errorText || response.statusText}`));
      }

      const data = await response.json();
      if (data.summary) {
        setInitialSummaryData(data.summary);
        setIsTypingInitialSummary(true);
      } else {
        throw new Error(t('aiSummaryModal.error.noSummaryData', 'No summary data received.'));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setInitialSummaryError(errorMsg);
      setChatHistory(prev => [...prev, { id: Date.now().toString(), type: 'error', sender: 'system', content: errorMsg }]);
    } finally {
      setIsLoadingInitialSummary(false);
    }
  };

  useEffect(() => {
    if (!initialSummaryData || !isTypingInitialSummary) return;

    const sections: { key: keyof ChurchSummary; titleKey: string }[] = [
      { key: 'overall_metrics', titleKey: 'aiSummaryModal.sections.overall' },
      { key: 'donation_summary', titleKey: 'aiSummaryModal.sections.donations' },
      { key: 'expense_summary', titleKey: 'aiSummaryModal.sections.expenses' },
      { key: 'member_activity', titleKey: 'aiSummaryModal.sections.members' },
    ];

    // Note: sectionIndexRef, charIndexRef, currentSectionMessageIdRef, currentTimeoutIdRef 
    // are reset in handleGenerateSummary

    const typeChar = () => {
      if (sectionIndexRef.current >= sections.length) {
        setIsTypingInitialSummary(false);
        setInitialSummaryComplete(true);
        return;
      }

      const currentSection = sections[sectionIndexRef.current];
      const fullTextForSection = initialSummaryData ? initialSummaryData[currentSection.key] : '';
      const sectionTitle = t(currentSection.titleKey);

      if (currentSectionMessageIdRef.current === null && charIndexRef.current === 0) {
        currentSectionMessageIdRef.current = `summary-${currentSection.key}-${Date.now()}`;
        setChatHistory(prev => [
          ...prev,
          {
            id: currentSectionMessageIdRef.current!,
            type: 'summary_section',
            sender: 'ai',
            content: '',
            sectionTitle: sectionTitle,
            isStreaming: true,
          },
        ]);
        currentTimeoutIdRef.current = setTimeout(typeChar, 5);
        return;
      }

      if (charIndexRef.current < fullTextForSection.length) {
        if (!currentSectionMessageIdRef.current) {
          console.error("AiSummaryModal: currentSectionMessageIdRef.current is null while trying to type characters.");
          setIsTypingInitialSummary(false);
          return;
        }
        setChatHistory(prev =>
          prev.map(msg =>
            msg.id === currentSectionMessageIdRef.current
              ? { ...msg, content: msg.content + fullTextForSection[charIndexRef.current] }
              : msg
          )
        );
        charIndexRef.current++;
        currentTimeoutIdRef.current = setTimeout(typeChar, 20);
      } else {
        if (currentSectionMessageIdRef.current) {
          setChatHistory(prev =>
            prev.map(msg =>
              msg.id === currentSectionMessageIdRef.current ? { ...msg, isStreaming: false } : msg
            )
          );
        }
        sectionIndexRef.current++;
        charIndexRef.current = 0;
        currentSectionMessageIdRef.current = null;

        if (sectionIndexRef.current < sections.length) {
          currentTimeoutIdRef.current = setTimeout(typeChar, 150);
        } else {
          setIsTypingInitialSummary(false);
          setInitialSummaryComplete(true);
        }
      }
    };

    // Start the typing effect
    // Ensure any previous timeout is cleared before starting a new one if the effect re-runs while typing
    if (currentTimeoutIdRef.current) {
      clearTimeout(currentTimeoutIdRef.current);
    }
    currentTimeoutIdRef.current = setTimeout(typeChar, 0);

    return () => {
      if (currentTimeoutIdRef.current) {
        clearTimeout(currentTimeoutIdRef.current);
      }
    };
  }, [initialSummaryData, isTypingInitialSummary, t, i18n.language]);

  const handleFollowUpQuestion = async (questionKey: string) => {

    if (!churchId) {
      console.error("AiSummaryModal: Cannot ask follow-up, churchId prop is missing.");
      setChatHistory(prev => [...prev, { id: Date.now().toString(), type: 'error', sender: 'system', content: t('aiSummaryModal.error.churchIdMissingFollowup'), isStreaming: false }]);
      setIsStreamingFollowUp(false);
      return;
    }
    if (isStreamingFollowUp || isLoadingInitialSummary || isTypingInitialSummary) return;

    const questionText = t(predefinedFollowUpQuestions.find(q => q.key === questionKey)?.textKey || '', { defaultValue: questionKey });
    const userMessageId = `user-q-${questionKey}-${Date.now()}`;
    const aiMessageId = `ai-a-${questionKey}-${Date.now()}`;

    setChatHistory(prev => [
      ...prev,
      { id: userMessageId, type: 'question', sender: 'user', content: questionText, questionKey },
      { id: aiMessageId, type: 'answer', sender: 'ai', content: '', isStreaming: true },
    ]);
    setIsStreamingFollowUp(true);


    try {
      const response = await fetch('/api/ai/report-summary/follow-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
        },
        body: JSON.stringify({
          churchId,
          questionKey,
          language: i18n.language, // Ensure language is passed to backend
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(t('aiSummaryModal.error.followUpFailed', `Failed to get answer: ${errorText || response.statusText}` , { statusText: errorText || response.statusText }));
      }


      if (!response.body) {
        throw new Error(t('aiSummaryModal.error.emptyResponse', 'Received an empty response from the server.'));
      }

      const contentType = response.headers.get('content-type');
      const clonedResponse = response.clone(); // Clone to inspect body without consuming original response's body

      if (contentType && contentType.startsWith('text/plain')) {
        const potentialDirectText = await clonedResponse.text();
        // Check if it's NOT the Vercel AI SDK stream format (which starts with '0:"chunk"')
        if (!potentialDirectText.startsWith('0:\"')) { 
          // This is likely a direct plain text message (e.g., noDataMessage from backend)
          setChatHistory(prevChatHistory =>
            prevChatHistory.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: potentialDirectText, isStreaming: false }
                : msg
            )
          );
          setIsStreamingFollowUp(false);
          return; // Exit after handling direct text response
        }
        // If it was text/plain but started with '0:"', it's a stream; fall through to stream parsing.
      }
      // If not text/plain, or if it was text/plain and looked like a stream, proceed with stream parsing on the original response.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';

      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) {
          break;
        }
        if (value) {
          const decodedChunk = decoder.decode(value, { stream: true });

          lineBuffer += decodedChunk;

          let lines = lineBuffer.split('\n');
          
          // If the last character of lineBuffer was not '\n', the last element in 'lines' is incomplete.
          // Otherwise, if it ended with '\n', lines.pop() will be an empty string.
          if (lineBuffer.endsWith('\n')) {
              lineBuffer = ''; // All lines were complete
          } else {
              lineBuffer = lines.pop() || ''; // Keep incomplete line in buffer, or empty if lines was empty
          }

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const jsonData = line.substring(2); // Remove "0:"
                const parsedText = JSON.parse(jsonData); // This should be the actual string content

                if (typeof parsedText === 'string' && parsedText.length > 0) {
                  setChatHistory(prev =>
                    prev.map(msg =>
                      msg.id === aiMessageId
                        ? { ...msg, content: msg.content + parsedText }
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.error('[handleFollowUpQuestion] Error parsing Vercel AI SDK stream line data:', line, e);
              }
            } else if (line.trim() === '2:"[DONE]"' || line.includes('"[DONE]"')) {
              // The stream might also send a different prefix for the [DONE] signal or other metadata.
              // For now, we primarily care about the '0:' prefixed text data.
            } else if (line.trim() !== ''){
                // console.log('[handleFollowUpQuestion] Ignoring non-data stream line:', line);
            }
          }
        }
      }
      
      // After the loop, process any remaining content in lineBuffer and from decoder's internal buffer.
      const finalFlushData = decoder.decode(); // Flush any remaining data from the decoder
      if (finalFlushData) {
          lineBuffer += finalFlushData;
      }

      if (lineBuffer.trim() !== '') {
          const finalLinesToProcess = lineBuffer.split('\n');
          for (const line of finalLinesToProcess) {
              if (line.startsWith('0:')) {
                  try {
                      const jsonData = line.substring(2);
                      const parsedText = JSON.parse(jsonData);

                      if (typeof parsedText === 'string' && parsedText.length > 0) {
                          setChatHistory(prev =>
                            prev.map(msg =>
                              msg.id === aiMessageId
                                ? { ...msg, content: msg.content + parsedText }
                                : msg
                            )
                          );
                      }
                  } catch (e) {
                      console.error('[handleFollowUpQuestion] Error parsing final buffered Vercel AI SDK stream line data:', line, e);
                  }
              } else if (line.trim() !== ''){
                  // console.log('[handleFollowUpQuestion] Ignoring final buffered non-data stream line:', line);
              }
          }
      }

      // Stream processing is complete for this message
      setChatHistory(prevChatHistory =>
        prevChatHistory.map(msg => (msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg))
      );

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setChatHistory(prevChatHistory =>
        prevChatHistory.map(msg => (msg.id === aiMessageId ? { ...msg, type: 'error', content: errorMsg, isStreaming: false } : msg))
      );
    } finally {
      setIsStreamingFollowUp(false);

      // Follow-up animation specific cleanup removed.
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setInitialSummaryData(null);
      setInitialSummaryError(null);
      setIsLoadingInitialSummary(false);
      setIsTypingInitialSummary(false);
      setInitialSummaryComplete(false);
      setChatHistory([]);
      setIsStreamingFollowUp(false);
    }, 300);
  };

  const showInitialPrompt = !isLoadingInitialSummary && !initialSummaryError && chatHistory.length === 0 && !isTypingInitialSummary;
  const showRegenerateButton = (initialSummaryData || initialSummaryError) && !isLoadingInitialSummary && !isTypingInitialSummary;
  const showGenerateButton = !initialSummaryData && !initialSummaryError && !isLoadingInitialSummary && !isTypingInitialSummary;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('aiSummaryModal.title', 'AI Report Summary')}</DialogTitle>

        </DialogHeader>

        <div ref={chatContainerRef} className="flex-grow overflow-y-auto space-y-4 p-4 border rounded-md min-h-[200px]">
          {showInitialPrompt && (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 min-h-[150px] bg-muted/50 rounded-lg">
              <Sparkles className="h-10 w-10 text-primary" />
              <p className="text-md text-foreground">
                {t('aiSummaryModal.generatePrompt', "Unlock insights into your church's performance this month. Click 'Generate Summary' to begin.")}
              </p>
            </div>
          )}
          {isLoadingInitialSummary && (
            <div className="flex flex-col items-center justify-center flex-grow py-4">
              <div className="transform scale-120">
                <LoaderOne />
              </div>
              <p className="mt-3 text-base text-muted-foreground">
                {t('aiSummaryModal.loading', 'Generating your summary...')}
              </p>
            </div>
          )}
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[75%] p-3 rounded-lg ${ 
                  msg.sender === 'user' ? 'bg-primary text-primary-foreground' :
                  msg.type === 'error' ? 'bg-destructive text-destructive-foreground' :
                  'bg-secondary text-secondary-foreground'
                }`}
              >
                {msg.type === 'summary_section' && msg.sectionTitle && (
                  <h3 className="text-md font-semibold mb-1">{msg.sectionTitle}</h3>
                )}
                <p className="text-sm whitespace-pre-wrap">
                  {msg.content}
                  {msg.isStreaming && <span className="animate-pulse">▋</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        {initialSummaryComplete && !isStreamingFollowUp && !isLoadingInitialSummary && churchId && (
          <div className="mt-4 p-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t('aiSummaryModal.questions.prompt', 'Ask a follow-up question:')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {predefinedFollowUpQuestions.map((q) => (
                <Button
                  key={q.key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFollowUpQuestion(q.key)}
                  disabled={isStreamingFollowUp || isLoadingInitialSummary || isTypingInitialSummary}
                  className="text-left justify-start h-auto whitespace-normal"
                >
                  {t(q.textKey, { defaultValue: q.key })}
                </Button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="mt-auto pt-4">
          {showGenerateButton && (
            <Button onClick={handleGenerateSummary} disabled={isLoadingInitialSummary} className="w-full sm:w-auto">
              <Wand2 className="mr-2 h-4 w-4" />
              {t('aiSummaryModal.generateButton', 'Generate Summary')}
            </Button>
          )}
          {showRegenerateButton && (
            <Button onClick={handleGenerateSummary} disabled={isLoadingInitialSummary || isTypingInitialSummary} variant="outline" className="w-full sm:w-auto">
              <Wand2 className="mr-2 h-4 w-4" />
              {t('aiSummaryModal.regenerateButton', 'Regenerate')}
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">{t('common:close', 'Close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
