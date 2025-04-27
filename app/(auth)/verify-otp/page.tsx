"use client";

import { useSearchParams } from 'next/navigation';
import { verifyOtpAction } from './actions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';

const initialState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" aria-disabled={pending}>
      {pending ? 'Verifying...' : 'Verify Email'}
    </Button>
  );
}

export default function VerifyOtpPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { toast } = useToast();

  const [state, formAction] = useFormState(verifyOtpAction, initialState);

  useEffect(() => {
    if (state?.error) {
      toast({
        title: "Verification Error",
        description: state.error,
        variant: "destructive",
      });
    }
  }, [state, toast]);

  if (!email) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
              <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md dark:bg-gray-800">
                  <h1 className="text-2xl font-bold text-center text-red-600 dark:text-red-400">Error</h1>
                  <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                      Email address not found in the URL. Please try signing up again.
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center">Verify Your Email</h1>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          We sent a verification code to{' '}
          <span className="font-medium">{email}</span>. Please enter the code below.
        </p>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <div>
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              name="otp"
              type="text"
              required
              maxLength={6}
              className="mt-1"
              placeholder="123456"
            />
          </div>
          <SubmitButton />
        </form>
         <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Didn't receive the code? Check your spam folder or request a new one (feature coming soon).
         </p>
      </div>
    </div>
  );
} 