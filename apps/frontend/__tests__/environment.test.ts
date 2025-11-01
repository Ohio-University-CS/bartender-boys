/**
 * Unit tests for environment utilities
 */

import { IS_PROD, API_BASE_URL, NETWORK_IP } from '@/environment';

describe('Environment', () => {
  /**
   * Test 1: Normal case - Production flag
   * Verifies that IS_PROD is a boolean
   */
  test('should have IS_PROD as boolean', () => {
    expect(typeof IS_PROD).toBe('boolean');
  });

  /**
   * Test 2: Normal case - API base URL
   * Verifies that API_BASE_URL is a string
   */
  test('should have API_BASE_URL as string', () => {
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  /**
   * Test 3: Edge case - Network IP
   * Verifies that NETWORK_IP is defined
   */
  test('should have NETWORK_IP defined', () => {
    expect(NETWORK_IP).toBeDefined();
    expect(typeof NETWORK_IP).toBe('string');
  });
});

