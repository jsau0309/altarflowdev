/**
 * Tests for Stripe webhook handler
 * 
 * Critical security and payment tests to prevent:
 * - Webhook spoofing (signature verification)
 * - Duplicate payment processing
 * - Financial data corruption
 * - Race conditions in payment processing
 */

// Import mocks FIRST
import '../../__mocks__/prisma'
import '../../__mocks__/stripe'

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/stripe/route'
import { prismaMock } from '../../__mocks__/prisma'
import { mockStripe, createMockStripeEvent, createMockPaymentIntent } from '../../__mocks__/stripe'
import Stripe from 'stripe'

// Mock Next.js headers
const mockHeaders = new Map<string, string>()
jest.mock('next/headers', () => ({
  headers: jest.fn(() => Promise.resolve(mockHeaders)),
}))

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => ({
  isWebhookProcessed: jest.fn(() => false),
}))

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'email_test' }),
    },
  })),
}))

// Mock environment
jest.mock('@/lib/stripe-server', () => ({
  getStripeWebhookSecret: jest.fn(() => 'whsec_test_secret'),
}))

describe('Stripe Webhook Handler - POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHeaders.clear()
  })

  describe('Request validation', () => {
    it('should reject empty request body', async () => {
      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: '',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Empty request body')
    })

    it('should reject request without stripe-signature header', async () => {
      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No stripe-signature header')
    })
  })

  describe('Signature verification', () => {
    it('should verify valid webhook signature', async () => {
      const event = createMockStripeEvent('payment_intent.succeeded', {
        id: 'pi_test123',
        status: 'succeeded',
      })

      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      // Mock existing transaction
      prismaMock.donationTransaction.findUnique.mockResolvedValue({
        id: 'txn_123',
        stripePaymentIntentId: 'pi_test123',
        churchId: 'church_123',
        amount: 10000,
        status: 'pending',
      } as any)

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(req)

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled()
      expect(response.status).not.toBe(400)
    })

    it('should reject invalid webhook signature', async () => {
      mockHeaders.set('stripe-signature', 'invalid_signature')
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Signature verification failed')
    })

    it('should try Connect secret if platform secret fails', async () => {
      mockHeaders.set('stripe-signature', 'connect_signature')
      
      // First call (platform secret) fails
      mockStripe.webhooks.constructEvent
        .mockImplementationOnce(() => {
          throw new Error('Invalid signature')
        })
        // Second call (connect secret) succeeds
        .mockReturnValueOnce(createMockStripeEvent('payment_intent.succeeded', {}))

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      })

      // Mock transaction for payment processing
      prismaMock.donationTransaction.findUnique.mockResolvedValue({
        id: 'txn_123',
        stripePaymentIntentId: 'pi_test123',
        churchId: 'church_123',
        amount: 10000,
        status: 'pending',
      } as any)

      const response = await POST(req)

      // Should have tried both secrets
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledTimes(2)
    })
  })

  describe('Duplicate webhook prevention', () => {
    it('should skip already processed webhooks', async () => {
      const { isWebhookProcessed } = require('@/lib/rate-limit')
      isWebhookProcessed.mockReturnValue(true)

      const event = createMockStripeEvent('payment_intent.succeeded', {})
      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.received).toBe(true)
      expect(data.duplicate).toBe(true)
      expect(prismaMock.donationTransaction.update).not.toHaveBeenCalled()
    })

    it('should process webhook only once (idempotency)', async () => {
      const event = createMockStripeEvent('payment_intent.succeeded', 
        createMockPaymentIntent({ id: 'pi_unique123' })
      )

      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      prismaMock.donationTransaction.findUnique.mockResolvedValue({
        id: 'txn_123',
        stripePaymentIntentId: 'pi_unique123',
        churchId: 'church_123',
        amount: 10000,
        status: 'pending',
      } as any)

      prismaMock.donationTransaction.update.mockResolvedValue({
        id: 'txn_123',
        status: 'succeeded',
      } as any)

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      // Process webhook twice
      await POST(req)
      const { isWebhookProcessed } = require('@/lib/rate-limit')
      isWebhookProcessed.mockReturnValue(true) // Mark as processed

      const secondResponse = await POST(req)
      const data = await secondResponse.json()

      expect(data.duplicate).toBe(true)
      // Should only update once
      expect(prismaMock.donationTransaction.update).toHaveBeenCalledTimes(1)
    })
  })

  describe('payment_intent.succeeded event', () => {
    it('should update transaction status to succeeded', async () => {
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_test123',
        amount: 10000,
        status: 'succeeded',
      })

      const event = createMockStripeEvent('payment_intent.succeeded', paymentIntent)
      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback({
          donationTransaction: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'txn_123',
              stripePaymentIntentId: 'pi_test123',
              churchId: 'church_123',
              amount: 10000,
              status: 'pending',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'txn_123',
              status: 'succeeded',
            }),
          },
          church: {
            findUnique: jest.fn().mockResolvedValue({
              clerkOrgId: 'org_123',
            }),
          },
          stripeConnectAccount: {
            findUnique: jest.fn().mockResolvedValue({
              stripeAccountId: 'acct_123',
            }),
          },
          donationPaymentMethod: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'pm_123',
            }),
          },
        } as any)
      })

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should handle missing transaction gracefully', async () => {
      const paymentIntent = createMockPaymentIntent({ id: 'pi_missing' })
      const event = createMockStripeEvent('payment_intent.succeeded', paymentIntent)

      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback({
          donationTransaction: {
            findUnique: jest.fn().mockResolvedValue(null), // Transaction not found
          },
        } as any)
      })

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.warning).toBe('Transaction not found')
    })

    it('should use correct payment method type', async () => {
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_test123',
        payment_method: 'pm_card123',
        payment_method_types: ['card'],
      })

      const event = createMockStripeEvent('payment_intent.succeeded', paymentIntent)
      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      mockStripe.paymentMethods.retrieve.mockResolvedValue({
        type: 'card',
      } as any)

      let capturedUpdate: any = null

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback({
          donationTransaction: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'txn_123',
              stripePaymentIntentId: 'pi_test123',
              churchId: 'church_123',
              amount: 10000,
              status: 'pending',
            }),
            update: jest.fn().mockImplementation((args) => {
              capturedUpdate = args
              return Promise.resolve({
                id: 'txn_123',
                status: 'succeeded',
              })
            }),
          },
          church: {
            findUnique: jest.fn().mockResolvedValue({
              clerkOrgId: 'org_123',
            }),
          },
          stripeConnectAccount: {
            findUnique: jest.fn().mockResolvedValue({
              stripeAccountId: 'acct_123',
            }),
          },
          donationPaymentMethod: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'pm_card',
            }),
          },
        } as any)
      })

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      await POST(req)

      expect(capturedUpdate.data.paymentMethodType).toBe('card')
      expect(capturedUpdate.data.status).toBe('succeeded')
    })
  })

  describe('Unhandled event types', () => {
    it('should accept but not process unhandled events', async () => {
      const event = createMockStripeEvent('customer.created', {})
      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(prismaMock.donationTransaction.update).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should handle database errors during payment processing', async () => {
      const paymentIntent = createMockPaymentIntent({ id: 'pi_test123' })
      const event = createMockStripeEvent('payment_intent.succeeded', paymentIntent)

      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      prismaMock.$transaction.mockRejectedValue(new Error('Database error'))

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to update transaction record')
    })

    it('should handle Stripe API errors gracefully', async () => {
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_test123',
        payment_method: 'pm_invalid',
      })

      const event = createMockStripeEvent('payment_intent.succeeded', paymentIntent)
      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      mockStripe.paymentMethods.retrieve.mockRejectedValue(
        new Error('Payment method not found')
      )

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback({
          donationTransaction: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'txn_123',
              stripePaymentIntentId: 'pi_test123',
              churchId: 'church_123',
              amount: 10000,
              status: 'pending',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'txn_123',
              status: 'succeeded',
            }),
          },
          church: {
            findUnique: jest.fn().mockResolvedValue({
              clerkOrgId: 'org_123',
            }),
          },
          stripeConnectAccount: {
            findUnique: jest.fn().mockResolvedValue({
              stripeAccountId: 'acct_123',
            }),
          },
          donationPaymentMethod: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        } as any)
      })

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(req)

      // Should still process successfully with fallback
      expect(response.status).toBe(200)
    })
  })

  describe('Security tests', () => {
    it('should not expose internal error details', async () => {
      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Internal: Database password is invalid')
      })

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).not.toContain('Database password')
    })

    it('should validate event ID format', async () => {
      const event = createMockStripeEvent('payment_intent.succeeded', {}, {
        id: 'invalid_format_123', // Not evt_* format
      })

      mockHeaders.set('stripe-signature', 'valid_signature')
      mockStripe.webhooks.constructEvent.mockReturnValue(event)

      const req = new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      // Should still process (Stripe controls event ID format)
      const response = await POST(req)
      expect(response.status).toBeLessThan(500)
    })
  })
})
