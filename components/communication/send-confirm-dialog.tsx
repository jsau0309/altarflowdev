"use client";

import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Send } from "lucide-react";

interface SendConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientCount: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function SendConfirmDialog({
  open,
  onOpenChange,
  recipientCount,
  onConfirm,
  isLoading = false,
}: SendConfirmDialogProps) {
  const { t } = useTranslation(['communication']);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('communication:sendConfirmDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('communication:sendConfirmDialog.description')}{" "}
            <span className="font-semibold">{recipientCount}</span> {t('communication:sendConfirmDialog.recipients')}.
            {t('communication:sendConfirmDialog.cannotUndo')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('communication:sendConfirmDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('communication:sendConfirmDialog.sending')}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t('communication:sendConfirmDialog.sendNow')}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}