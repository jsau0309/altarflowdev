'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentSucessRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the correct URL (with two 'c's)
    router.replace('/payment-success');
  }, [router]);
  
  return null;
}