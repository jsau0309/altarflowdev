// Production test mode utilities
export const TEST_EMAIL_DOMAIN = '@altarflow.test';
export const DEMO_CHURCH_SLUG = 'demo-church';
export const TEST_PROMO_CODE = 'DEMO2024';

export function isTestMode(email?: string | null, churchSlug?: string): boolean {
  if (!email) return false;
  
  // Check if test mode is enabled globally
  if (process.env.ENABLE_TEST_MODE !== 'true') return false;
  
  // Check if email is a test account
  if (email.endsWith(TEST_EMAIL_DOMAIN)) return true;
  
  // Check if using demo church
  if (churchSlug === DEMO_CHURCH_SLUG) return true;
  
  return false;
}

export function getTestAmount(originalAmount: number, isTest: boolean): number {
  // Always use 50 cents for test transactions
  return isTest ? 50 : originalAmount;
}

export function sanitizeTestData(data: any, isTest: boolean): any {
  if (!isTest) return data;
  
  // Add test flag to help identify test transactions
  return {
    ...data,
    metadata: {
      ...data.metadata,
      test_mode: true,
      test_timestamp: new Date().toISOString()
    }
  };
}