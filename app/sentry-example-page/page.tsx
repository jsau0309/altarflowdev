'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
// import { logger } from '@/lib/sentry';
import { instrumentButtonClick } from '@/lib/sentry-ui';

export default function SentryExamplePage() {
  const [message, setMessage] = useState('');

  // Test error handler
  const handleTestError = instrumentButtonClick(
    'Test Sentry Error',
    {
      testType: 'error',
      timestamp: new Date().toISOString()
    },
    () => {
      setMessage('Triggering test error...');
      
      // Log before error
      console.warn('About to trigger test error', {
        page: 'sentry-example',
        action: 'test-error'
      });
      
      // This will trigger an error that Sentry will capture
      throw new Error('Test error from Sentry example page');
    }
  );

  // Test undefined function (as suggested by Sentry docs)
  const handleUndefinedFunction = () => {
    setMessage('Calling undefined function...');
    
    // Add breadcrumb before error
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'About to call undefined function',
      level: 'warning'
    });
    
    // This will cause a ReferenceError
    (window as any).myUndefinedFunction();
  };

  // Test captured exception
  const handleCaptureException = instrumentButtonClick(
    'Capture Exception',
    {
      testType: 'capture',
      timestamp: new Date().toISOString()
    },
    () => {
      setMessage('Capturing exception...');
      
      try {
        // Simulate an error
        const obj: any = null;
        obj.someMethod(); // This will throw
      } catch (error) {
        // Log the error
        console.error('Caught an error in try-catch', {
          errorMessage: (error as Error).message,
          errorType: 'null-reference'
        });
        
        // Capture it in Sentry
        Sentry.captureException(error, {
          tags: {
            location: 'sentry-example-page',
            errorType: 'test'
          },
          contexts: {
            test: {
              purpose: 'Sentry integration verification',
              timestamp: new Date().toISOString()
            }
          }
        });
        
        setMessage('Exception captured and sent to Sentry!');
      }
    }
  );

  // Test logger
  const handleTestLogger = () => {
    setMessage('Testing logger...');
    
    // Test different log levels
    console.log('Debug message from test page', { testId: 1 });
    console.log('Info message from test page', { testId: 2 });
    console.warn('Warning message from test page', { testId: 3 });
    console.error('Error message from test page', { testId: 4 });
    
    // Test formatted logging
    const userId = 'test-user-123';
    const amount = 100;
    console.log(`User ${userId} made a donation of $${amount}`);
    
    setMessage('Logger messages sent!');
  };

  // Test transaction/span
  const handleTestTransaction = () => {
    setMessage('Testing transaction...');
    
    Sentry.startSpan(
      {
        op: 'test.transaction',
        name: 'Test Transaction from Example Page',
        attributes: {
          'test.type': 'manual',
          'test.page': 'sentry-example'
        }
      },
      async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create a child span
        Sentry.startSpan(
          {
            op: 'test.child',
            name: 'Child Operation',
            attributes: {
              'child.type': 'nested'
            }
          },
          async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            console.log('Child span completed');
          }
        );
        
        setMessage('Transaction completed and sent to Sentry!');
      }
    );
  };

  // Test user context
  const handleSetUserContext = () => {
    Sentry.setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser'
    });
    
    setMessage('User context set!');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sentry Integration Test Page</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          This page is for testing Sentry integration. Click the buttons below to trigger different types of events that Sentry should capture.
        </p>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Error Testing</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestError}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Trigger Test Error
            </button>
            
            <button
              onClick={handleUndefinedFunction}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Call Undefined Function
            </button>
            
            <button
              onClick={handleCaptureException}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
            >
              Capture Exception
            </button>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Logging & Context</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestLogger}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Test Logger
            </button>
            
            <button
              onClick={handleSetUserContext}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Set User Context
            </button>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Performance Monitoring</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestTransaction}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
            >
              Test Transaction/Span
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">After clicking the buttons:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Check your browser console for any immediate errors</li>
          <li>Go to your Sentry dashboard to see the captured events</li>
          <li>Verify that errors, transactions, and logs appear correctly</li>
          <li>Check that user context and custom tags are attached to events</li>
        </ol>
      </div>
    </div>
  );
}