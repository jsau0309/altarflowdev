"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface EmailDesign {
  html?: string;
  // Add other expected properties
}

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailDesign: string | EmailDesign | null;
  subject: string;
  previewText: string;
  fromName: string;
  recipientCount: number;
  campaignId?: string;
}

/**
 * Displays a modal dialog that previews an email's HTML content or provides a prompt to open the email editor if no preview is available.
 *
 * Renders an iframe with the email HTML when available, or a placeholder message if the design is incomplete. If the email design object lacks HTML and a campaign ID is provided, offers a button to open the email editor for that campaign.
 *
 * @param open - Whether the dialog is visible
 * @param onOpenChange - Callback to update the dialog's open state
 * @param emailDesign - The email content as a string, an object with an `html` property, or null
 * @param subject - The email subject line
 * @param previewText - The preview text for the email (not displayed)
 * @param fromName - The sender's name
 * @param recipientCount - The number of recipients
 * @param campaignId - Optional campaign identifier for opening the editor
 */
export function EmailPreviewDialog({
  open,
  onOpenChange,
  emailDesign,
  subject,
  previewText,
  fromName,
  recipientCount,
  campaignId,
}: EmailPreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        // Check if we have actual HTML content or need to render from design
        let htmlContent = '';
        
        if (typeof emailDesign === 'string' && emailDesign.trim()) {
          // If emailDesign is already HTML
          htmlContent = emailDesign;
        } else if (typeof emailDesign === 'object' && emailDesign?.html) {
          // If emailDesign has an html property
          htmlContent = emailDesign.html;
        } else {
          // Fallback placeholder
          console.log('No HTML content available, emailDesign:', emailDesign);
          htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  background-color: #f5f5f5;
                }
                .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .email-header {
                  background-color: #f8f9fa;
                  padding: 20px;
                  border-bottom: 1px solid #e9ecef;
                }
                .email-content {
                  padding: 30px;
                  text-align: center;
                  color: #666;
                }
                .placeholder-icon {
                  width: 64px;
                  height: 64px;
                  margin: 0 auto 20px;
                  background-color: #e9ecef;
                  border-radius: 50%;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <strong>From:</strong> ${fromName}<br>
                  <strong>Subject:</strong> ${subject}
                </div>
                <div class="email-content">
                  <div class="placeholder-icon"></div>
                  <p>Email preview is being generated...</p>
                  <p style="font-size: 14px; color: #999;">Please save your design to see the preview</p>
                </div>
              </div>
            </body>
            </html>
          `;
        }
        
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
      }
    }
  }, [open, emailDesign, subject, fromName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
          <DialogDescription>
            Preview how your email will appear to recipients
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-4 mb-4">
          <Badge variant="secondary" className="gap-1">
            <Mail className="h-3 w-3" />
            {subject}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {recipientCount} recipients
          </Badge>
        </div>
        
        <div className="flex-1 border rounded-lg overflow-hidden bg-muted/30">
          {/* Show message if no HTML content */}
          {typeof emailDesign === 'object' && emailDesign && !emailDesign.html ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Preview in Email Editor</h3>
              <p className="text-muted-foreground mb-4">
                The email preview is available in the email editor where you can see 
                real-time updates as you design.
              </p>
              {campaignId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(`/communication/new/editor?campaignId=${campaignId}`);
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Editor
                </Button>
              )}
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              className="w-full h-full"
              title="Email Preview"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}