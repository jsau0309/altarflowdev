import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Success Icon with Animation */}
        <div className="relative flex justify-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            {/* Sparkle decorations */}
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-blue-400 animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-3 h-5 w-5 text-slate-400 animate-pulse delay-150" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-600 bg-clip-text text-transparent">
            You&apos;re all set!
          </h1>
          <p className="text-lg text-muted-foreground">
            Welcome to AltarFlow Premium
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center pt-4">
          <Button asChild size="lg" className="min-w-[140px]">
            <Link href="/dashboard">
              Get Started
            </Link>
          </Button>
        </div>

        {/* Optional subtle link */}
        <p className="text-sm text-muted-foreground">
          <Link 
            href="/settings?tab=account" 
            className="hover:underline hover:text-foreground transition-colors"
          >
            Manage subscription
          </Link>
        </p>
      </div>
    </div>
  );
}