/**
 * Environment configuration tests
 *
 * Tests the environment configuration module that determines
 * development vs production settings and API endpoints.
 */
import { describe, test, expect } from 'vitest';
import { ENV, API_BASE_URL, IS_PROD, NETWORK_IP } from '@/environment';

describe('environment configuration', () => {
  // Normal case: ENV object is properly structured
  test('should export ENV object with API_BASE_URL', () => {
    expect(ENV).toBeDefined();
    expect(ENV).toHaveProperty('API_BASE_URL');
    expect(typeof ENV.API_BASE_URL).toBe('string');
  });

  // Edge case: API_BASE_URL matches ENV.API_BASE_URL
  test('should export API_BASE_URL that matches ENV.API_BASE_URL', () => {
    expect(API_BASE_URL).toBe(ENV.API_BASE_URL);
  });

  // Error case: API_BASE_URL should not be empty
  test('should have non-empty API_BASE_URL', () => {
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });
});

describe('IS_PROD flag', () => {
  // Normal case: IS_PROD is a boolean
  test('should export IS_PROD as a boolean value', () => {
    expect(typeof IS_PROD).toBe('boolean');
  });

  // Edge case: IS_PROD should be consistent
  test('should have consistent IS_PROD value', () => {
    // In test environment, should be false (development mode)
    expect(IS_PROD).toBe(false);
  });

  // Error case: IS_PROD should not be undefined or null
  test('should not have undefined or null IS_PROD', () => {
    expect(IS_PROD).not.toBeUndefined();
    expect(IS_PROD).not.toBeNull();
  });
});

describe('NETWORK_IP configuration', () => {
  // Normal case: NETWORK_IP is a string
  test('should export NETWORK_IP as a string', () => {
    expect(typeof NETWORK_IP).toBe('string');
  });

  // Edge case: NETWORK_IP has valid IP format (basic check)
  test('should have NETWORK_IP in valid format', () => {
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    expect(ipPattern.test(NETWORK_IP)).toBe(true);
  });

  // Error case: NETWORK_IP should not be empty
  test('should not have empty NETWORK_IP', () => {
    expect(NETWORK_IP.length).toBeGreaterThan(0);
  });
});

