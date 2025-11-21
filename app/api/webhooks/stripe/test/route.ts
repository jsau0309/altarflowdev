import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';

// Simple echo endpoint to test if webhooks are reaching us
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');
    
    logger.info('Webhook test received', {
      operation: 'api.webhook.test',
      bodyLength: body?.length || 0,
      bodyPreview: body?.substring(0, 200),
      hasSignature: !!signature,
      contentType: req.headers.get('content-type'),
      method: req.method
    });
    
    return NextResponse.json({
      success: true,
      received: {
        bodyLength: body?.length || 0,
        bodyEmpty: !body || body.length === 0,
        signaturePresent: !!signature,
        contentType: req.headers.get('content-type'),
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    logger.error('[Webhook Test] Error:', { operation: 'api.error' }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}