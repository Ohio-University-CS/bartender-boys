/**
 * Unit tests for environment utilities
 */

import { IS_PROD, API_BASE_URL, NETWORK_IP, ENV } from '@/environment';

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
   * Verifies that NETWORK_IP is defined (can be string or null)
   */
  test('should have NETWORK_IP defined', () => {
    expect(NETWORK_IP).toBeDefined();
    // NETWORK_IP can be a string or null
    expect(typeof NETWORK_IP === 'string' || NETWORK_IP === null).toBe(true);
  });

  /**
   * Test 4: Normal case - Environment config
   * Verifies that ENV object exists and has API_BASE_URL
   */
  test('should have ENV config object', () => {
    expect(ENV).toBeDefined();
    expect(typeof ENV).toBe('object');
    expect(ENV.API_BASE_URL).toBeDefined();
    expect(typeof ENV.API_BASE_URL).toBe('string');
  });

  /**
   * Test 5: Normal case - API_BASE_URL format
   * Verifies that API_BASE_URL is a valid URL format
   */
  test('should have valid API_BASE_URL format', () => {
    // Should start with http:// or https://
    expect(API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')).toBe(true);
  });

  /**
   * Test 6: Edge case - Development mode default
   * Verifies that in dev mode, API_BASE_URL points to local server
   */
  test('should use localhost in development mode', () => {
    if (!IS_PROD) {
      // In dev mode, should typically use localhost or network IP
      expect(API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1') || API_BASE_URL.includes(':8000')).toBe(true);
    }
  });
});

