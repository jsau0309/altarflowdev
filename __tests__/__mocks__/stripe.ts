import Stripe from 'stripe'

// Mock Stripe client
export const mockStripe = {
  webhooks: {
    constructEvent: jest.fn(),
  },
  paymentIntents: {
    retrieve: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    confirm: jest.fn(),
  },
  paymentMethods: {
    retrieve: jest.fn(),
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  charges: {
    retrieve: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
  accounts: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  accountLinks: {
    create: jest.fn(),
  },
  transfers: {
    create: jest.fn(),
  },
} as unknown as Stripe

// Mock stripe module
jest.mock('@/lib/stripe', () => ({
  __esModule: true,
  stripe: mockStripe,
}))

// Mock the Stripe constructor
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe)
})

// Helper to create mock Stripe events
export function createMockStripeEvent(
  type: string,
  data: any,
  options: { id?: string; created?: number } = {}
): Stripe.Event {
  return {
    id: options.id || `evt_${Date.now()}`,
    object: 'event',
    api_version: '2024-11-20.acacia',
    created: options.created || Math.floor(Date.now() / 1000),
    data: {
      object: data,
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    type,
  } as Stripe.Event
}

// Helper to create mock payment intent
export function createMockPaymentIntent(
  overrides: Partial<Stripe.PaymentIntent> = {}
): Stripe.PaymentIntent {
  return {
    id: 'pi_test123',
    object: 'payment_intent',
    amount: 10000, // $100.00
    amount_capturable: 0,
    amount_received: 10000,
    application: null,
    application_fee_amount: null,
    automatic_payment_methods: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: 'automatic',
    charges: {
      object: 'list',
      data: [],
      has_more: false,
      url: '/v1/charges',
    },
    client_secret: 'pi_test123_secret',
    confirmation_method: 'automatic',
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    customer: null,
    description: null,
    invoice: null,
    last_payment_error: null,
    latest_charge: null,
    livemode: false,
    metadata: {},
    next_action: null,
    on_behalf_of: null,
    payment_method: null,
    payment_method_configuration_details: null,
    payment_method_options: null,
    payment_method_types: ['card'],
    processing: null,
    receipt_email: null,
    review: null,
    setup_future_usage: null,
    shipping: null,
    source: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status: 'succeeded',
    transfer_data: null,
    transfer_group: null,
    ...overrides,
  } as Stripe.PaymentIntent
}
