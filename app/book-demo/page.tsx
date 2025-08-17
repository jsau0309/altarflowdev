'use client';

import { useEffect } from 'react';

export default function BookDemoPage() {

  useEffect(() => {
    // Redirect to Calendly with the specified month
    window.location.href = 'https://calendly.com/altarflow/altarflow-demo?month=2025-08';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to booking page...</p>
      </div>
    </div>
  );
}