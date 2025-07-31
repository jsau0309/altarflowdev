"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Mail, Loader2, MailX, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

/**
 * React component for managing email unsubscribe and resubscribe flows based on a token from the URL.
 *
 * Renders different UI states depending on the presence of a valid token and the current operation status, allowing users to unsubscribe from or resubscribe to church-related emails. Handles API communication, error states, and user feedback for the unsubscribe process.
 */
export function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleUnsubscribe = async () => {
    if (!token) {
      setErrorMessage("Invalid unsubscribe link");
      setStatus("error");
      return;
    }

    setStatus("loading");
    
    try {
      const response = await fetch("/api/communication/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
      } else {
        setErrorMessage(data.error || "Failed to unsubscribe");
        setStatus("error");
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
      setErrorMessage("An error occurred. Please try again.");
      setStatus("error");
    }
  };

  const handleResubscribe = async () => {
    if (!token) {
      setErrorMessage("Invalid link");
      setStatus("error");
      return;
    }

    setStatus("loading");
    
    try {
      const response = await fetch("/api/communication/resubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("idle");
      } else {
        setErrorMessage(data.error || "Failed to resubscribe");
        setStatus("error");
      }
    } catch (error) {
      console.error("Error resubscribing:", error);
      setErrorMessage("An error occurred. Please try again.");
      setStatus("error");
    }
  };

  if (!token) {
    return (
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Invalid Unsubscribe Link</CardTitle>
          <CardDescription className="text-base mt-2">
            This unsubscribe link is invalid or has expired.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">You've Been Unsubscribed</CardTitle>
          <CardDescription className="text-base mt-2">
            You have been successfully removed from our email list.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="text-center space-y-6 pt-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We're sorry to see you go. You will no longer receive:
            </p>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MailX className="h-4 w-4" />
                <span>Church announcements</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MailX className="h-4 w-4" />
                <span>Event invitations</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MailX className="h-4 w-4" />
                <span>Weekly newsletters</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium">Changed your mind?</p>
            <Button 
              onClick={handleResubscribe} 
              variant="default"
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Resubscribe to Emails
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription className="text-base mt-2">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={() => setStatus("idle")} 
            variant="outline"
            className="w-full max-w-xs"
          >
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-2xl">Unsubscribe from Emails</CardTitle>
        <CardDescription className="text-base mt-2">
          Are you sure you want to stop receiving emails from us?
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-6 pt-6">
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <AlertDescription className="text-sm">
            By unsubscribing, you will no longer receive important church communications and updates.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          <p className="text-sm font-medium text-center">You will miss out on:</p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Church Announcements</p>
                <p className="text-xs text-muted-foreground">Important updates and news from your church</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Event Invitations</p>
                <p className="text-xs text-muted-foreground">Special services, gatherings, and activities</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Weekly Newsletters</p>
                <p className="text-xs text-muted-foreground">Inspirational messages and community updates</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3 pt-2">
          <Button 
            onClick={handleUnsubscribe} 
            className="w-full"
            variant="destructive"
            size="lg"
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <MailX className="mr-2 h-4 w-4" />
                Yes, Unsubscribe Me
              </>
            )}
          </Button>
          <Button 
            onClick={() => window.history.back()} 
            variant="outline" 
            className="w-full"
            size="lg"
            disabled={status === "loading"}
          >
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
            No, Keep Me Subscribed
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}