"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Send, AlertCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface TestEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (email: string) => void;
  isLoading?: boolean;
}

/**
 * Displays a modal dialog for sending a test email to a specified address.
 *
 * The dialog allows users to enter an email address (defaulting to the current user's primary email), validates the input, and triggers a callback to send the test email. It provides feedback for invalid input and disables actions while a send operation is in progress. The dialog resets its state each time it is opened.
 *
 * @param open - Whether the dialog is visible
 * @param onOpenChange - Callback invoked when the dialog's open state changes
 * @param onSend - Callback invoked with the email address when sending the test email
 * @param isLoading - Optional; whether the send operation is in progress
 */
export function TestEmailDialog({
  open,
  onOpenChange,
  onSend,
  isLoading = false,
}: TestEmailDialogProps) {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";
  const [email, setEmail] = useState(userEmail);
  const [error, setError] = useState("");

  const handleSend = () => {
    setError("");
    
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    onSend(email);
  };

  // Reset email to user's email when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEmail(userEmail);
      setError("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Test Email
          </DialogTitle>
          <DialogDescription>
            Send a test version of your email to preview how it will look in recipients' inboxes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Email Address</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleSend();
                }
              }}
              disabled={isLoading}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The test email will have "[TEST]" added to the subject line and won't affect your monthly quota.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Mail className="mr-2 h-4 w-4 animate-pulse" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}