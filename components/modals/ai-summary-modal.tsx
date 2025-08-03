"use client"

import React, { useState, useEffect, useRef } from 'react'; // Added React and useRef import
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

import { Sparkles, MessageSquare, ChevronRight, Bot } from 'lucide-react';
import LoaderOne from '@/components/ui/loader-one';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [followUpBuffer, setFollowUpBuffer] = useState<string>('');
  const [currentFollowUpMessageId, setCurrentFollowUpMessageId] = useState<string | null>(null);

  // Refs for typing effect state
  const sectionIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const currentSectionMessageIdRef = useRef<string | null>(null);
  const currentTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for follow-up typing effect
  const followUpCharIndexRef = useRef(0);
  const followUpTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [chatHistory, initialSummaryComplete]);

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
        // Log metadata for debugging (optional)
        if (data.metadata) {
          console.log('[AI Summary Metadata]', data.metadata);
        }
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

  // Effect for typing follow-up responses
  useEffect(() => {
    if (!followUpBuffer || !currentFollowUpMessageId) return;

    const typeFollowUpChar = () => {
      if (followUpCharIndexRef.current < followUpBuffer.length) {
        setChatHistory(prev =>
          prev.map(msg =>
            msg.id === currentFollowUpMessageId
              ? { ...msg, content: followUpBuffer.substring(0, followUpCharIndexRef.current + 1) }
              : msg
          )
        );
        followUpCharIndexRef.current++;
        followUpTimeoutRef.current = setTimeout(typeFollowUpChar, 15);
      } else {
        // Typing complete
        setChatHistory(prev =>
          prev.map(msg =>
            msg.id === currentFollowUpMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
        setIsStreamingFollowUp(false);
        setFollowUpBuffer('');
        setCurrentFollowUpMessageId(null);
        followUpCharIndexRef.current = 0;
      }
    };

    if (followUpTimeoutRef.current) {
      clearTimeout(followUpTimeoutRef.current);
    }
    followUpTimeoutRef.current = setTimeout(typeFollowUpChar, 0);

    return () => {
      if (followUpTimeoutRef.current) {
        clearTimeout(followUpTimeoutRef.current);
      }
    };
  }, [followUpBuffer, currentFollowUpMessageId]);

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
          // Direct text response - use typing effect
          setFollowUpBuffer(potentialDirectText);
          setCurrentFollowUpMessageId(aiMessageId);
          followUpCharIndexRef.current = 0;
          return; // Exit after handling direct text response
        }
        // If it was text/plain but started with '0:"', it's a stream; fall through to stream parsing.
      }
      // If not text/plain, or if it was text/plain and looked like a stream, proceed with stream parsing on the original response.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';
      let fullResponseText = '';

      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) {
          break;
        }
        if (value) {
          const decodedChunk = decoder.decode(value, { stream: true });

          lineBuffer += decodedChunk;

          let lines = lineBuffer.split('\n');
          
          if (lineBuffer.endsWith('\n')) {
              lineBuffer = '';
          } else {
              lineBuffer = lines.pop() || '';
          }

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const jsonData = line.substring(2);
                const parsedText = JSON.parse(jsonData);

                if (typeof parsedText === 'string' && parsedText.length > 0) {
                  fullResponseText += parsedText;
                }
              } catch (e) {
                console.error('[handleFollowUpQuestion] Error parsing Vercel AI SDK stream line data:', line, e);
              }
            }
          }
        }
      }
      
      const finalFlushData = decoder.decode();
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
                          fullResponseText += parsedText;
                      }
                  } catch (e) {
                      console.error('[handleFollowUpQuestion] Error parsing final buffered Vercel AI SDK stream line data:', line, e);
                  }
              }
          }
      }

      // Start typing effect with the full response
      setFollowUpBuffer(fullResponseText);
      setCurrentFollowUpMessageId(aiMessageId);
      followUpCharIndexRef.current = 0;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setChatHistory(prevChatHistory =>
        prevChatHistory.map(msg => (msg.id === aiMessageId ? { ...msg, type: 'error', content: errorMsg, isStreaming: false } : msg))
      );
      setIsStreamingFollowUp(false);
    } finally {
      // Don't set streaming to false here, let the typing effect handle it
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
      setFollowUpBuffer('');
      setCurrentFollowUpMessageId(null);
      followUpCharIndexRef.current = 0;
      if (followUpTimeoutRef.current) {
        clearTimeout(followUpTimeoutRef.current);
        followUpTimeoutRef.current = null;
      }
    }, 300);
  };

  const showInitialPrompt = !isLoadingInitialSummary && !initialSummaryError && chatHistory.length === 0 && !isTypingInitialSummary;
  const showRegenerateButton = (initialSummaryData || initialSummaryError) && !isLoadingInitialSummary && !isTypingInitialSummary;
  const showGenerateButton = !initialSummaryData && !initialSummaryError && !isLoadingInitialSummary && !isTypingInitialSummary;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col border-0 p-0 overflow-hidden bg-gradient-to-b from-background via-background to-background/95">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/5 pointer-events-none" />
        <DialogHeader className="relative z-10 p-6 pb-4 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {t('aiSummaryModal.title', 'AI Report Summary')}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                {t('aiSummaryModal.description', 'Explore your church\'s key metrics with AI-powered insights')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div ref={chatContainerRef} className="flex-grow overflow-y-auto min-h-[400px] relative">
          <AnimatePresence mode="wait">
          {showInitialPrompt && (
            <motion.div 
              key="initial-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex h-full items-center justify-center p-8"
            >
              <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-md mt-20">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4, type: "spring" }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full blur-3xl opacity-20 animate-pulse" />
                  <div className="relative p-6 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-blue-900/30 rounded-full border border-blue-200/50 dark:border-blue-800/50 shadow-xl">
                    <Sparkles className="h-16 w-16 text-transparent bg-gradient-to-br from-blue-600 to-sky-600 bg-clip-text stroke-current stroke-[2.5]" />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="space-y-3"
                >
                  <h3 className="text-xl font-semibold text-foreground">
                    {t('aiSummaryModal.welcomeTitle', 'Ready to explore your data?')}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t('aiSummaryModal.generatePrompt', "Unlock insights into your church's performance this month. Click 'Generate Summary' to begin.")}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
          {isLoadingInitialSummary && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full items-center justify-center p-8"
            >
              <div className="flex flex-col items-center justify-center space-y-6 mt-20">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4, type: "spring" }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full blur-3xl opacity-25 animate-pulse scale-150" />
                  <div className="relative">
                    <LoaderOne />
                  </div>
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-base text-muted-foreground font-medium"
                >
                  {t('aiSummaryModal.loading', 'Analyzing your church data...')}
                </motion.p>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
          <div className="space-y-4 p-6">
          <AnimatePresence>
          {chatHistory.map((msg, index) => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <motion.div
                whileHover={{ scale: 1.01 }}
                className={cn(
                  "max-w-[85%] rounded-2xl shadow-sm transition-all",
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 shadow-blue-600/20' 
                    : msg.type === 'error' 
                    ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 border border-red-200 dark:border-red-800' 
                    : 'bg-white dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-gray-100 p-4 border border-gray-200/50 dark:border-gray-700/50'
                )}
              >
                {msg.type === 'summary_section' && msg.sectionTitle && (
                  <h3 className="text-sm font-semibold mb-3">
                    {msg.sectionTitle}
                  </h3>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                  {msg.isStreaming && (
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="inline-block w-2 h-4 bg-current ml-1 rounded-full"
                    />
                  )}
                </p>
              </motion.div>
            </motion.div>
          ))}
          </AnimatePresence>
          
            {initialSummaryComplete && !isStreamingFollowUp && !isLoadingInitialSummary && churchId && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 p-6 bg-gradient-to-br from-blue-50/50 to-sky-50/30 dark:from-gray-900/50 dark:to-gray-800/30 rounded-2xl border border-blue-200/30 dark:border-gray-700/50 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('aiSummaryModal.questions.prompt', 'Ask a follow-up question:')}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {predefinedFollowUpQuestions.map((q, index) => (
                  <motion.div
                    key={q.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFollowUpQuestion(q.key)}
                      disabled={isStreamingFollowUp || isLoadingInitialSummary || isTypingInitialSummary}
                      className="w-full text-left justify-between h-auto py-3 px-4 whitespace-normal bg-white/80 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700/50 border-gray-200/50 dark:border-gray-700/50 transition-all text-sm font-normal text-gray-700 dark:text-gray-300 group backdrop-blur-sm"
                    >
                      <span className="line-clamp-2 flex-1">{t(q.textKey, { defaultValue: q.key })}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all group-hover:translate-x-0.5 flex-shrink-0 ml-2" />
                    </Button>
                  </motion.div>
              ))}
            </div>
          </motion.div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-background/80 backdrop-blur-sm px-6 py-4">
          <div className="flex gap-3 w-full sm:w-auto">
            {showGenerateButton && (
              <Button 
                onClick={handleGenerateSummary} 
                disabled={isLoadingInitialSummary} 
                className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t('aiSummaryModal.generateButton', 'Generate Summary')}
              </Button>
            )}
            {showRegenerateButton && (
              <Button 
                onClick={handleGenerateSummary} 
                disabled={isLoadingInitialSummary || isTypingInitialSummary} 
                variant="outline" 
                className="flex-1 sm:flex-initial border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t('aiSummaryModal.regenerateButton', 'Regenerate')}
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose} className="flex-1 sm:flex-initial">{t('common:close', 'Close')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
