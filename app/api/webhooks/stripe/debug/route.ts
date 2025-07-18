import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;
  
  // Get webhook secret info without exposing it
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretInfo = {
    exists: !!webhookSecret,
    length: webhookSecret?.length || 0,
    prefix: webhookSecret?.substring(0, 10) || 'not-set',
    hasWhitespace: webhookSecret?.trim() !== webhookSecret,
    startsWithWhsec: webhookSecret?.startsWith('whsec_'),
  };

  // Parse the signature header
  let signatureDetails = null;
  if (signature) {
    const elements = signature.split(',');
    signatureDetails = {
      hasTimestamp: elements.some(e => e.startsWith('t=')),
      hasV1Signature: elements.some(e => e.startsWith('v1=')),
      elementCount: elements.length,
    };
  }

  return NextResponse.json({
    debug: true,
    webhookSecret: secretInfo,
    signature: {
      present: !!signature,
      length: signature?.length || 0,
      details: signatureDetails,
    },
    body: {
      length: body?.length || 0,
      preview: body?.substring(0, 100) + '...',
    },
    headers: {
      'content-type': req.headers.get('content-type'),
      'stripe-signature': !!req.headers.get('stripe-signature'),
      'user-agent': req.headers.get('user-agent'),
    },
    timestamp: new Date().toISOString(),
  });
}